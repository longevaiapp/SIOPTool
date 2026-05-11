"""Cross-module operations analytics — read-only aggregator.

Exposes server-side rollups powered by Days 12–15 work:
  audit_log, approvals, insights, plus base modules (deals, projects,
  invoices, clients) so the Analytics page can show a single
  authoritative snapshot without re-aggregating client-side.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from lib.auth import Principal, get_current_principal
from lib.db import get_db


router = APIRouter(prefix="/api/analytics", tags=["analytics"])


_PERIOD_DAYS = {"30d": 30, "90d": 90, "12m": 365}


def _period_days(period: str) -> int:
    if period == "ytd":
        now = datetime.utcnow()
        return max(1, (now - datetime(now.year, 1, 1)).days + 1)
    return _PERIOD_DAYS.get(period, 90)


def _scalar(db: Session, sql: str, params: dict[str, Any]) -> Any:
    return db.execute(text(sql), params).scalar()


def _rows(db: Session, sql: str, params: dict[str, Any]) -> list[dict[str, Any]]:
    return [dict(r._mapping) for r in db.execute(text(sql), params)]


@router.get("/dashboard")
def dashboard(
    period: str = Query("90d", regex="^(30d|90d|ytd|12m)$"),
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Single-call analytics rollup for the executive dashboard."""
    ws = principal.workspace_id
    days = _period_days(period)
    since = datetime.utcnow() - timedelta(days=days)
    p = {"ws": ws, "since": since}

    # ── KPIs ────────────────────────────────────────────────────────────
    kpis: dict[str, Any] = {}

    kpis["clients_total"] = _scalar(
        db,
        "SELECT COUNT(*) FROM clients WHERE workspace_id=:ws AND is_deleted=FALSE",
        p,
    ) or 0
    kpis["arr_total"] = float(_scalar(
        db,
        "SELECT COALESCE(SUM(arr),0) FROM clients WHERE workspace_id=:ws AND is_deleted=FALSE",
        p,
    ) or 0)
    kpis["avg_health"] = float(_scalar(
        db,
        "SELECT COALESCE(AVG(health_score),0) FROM clients "
        "WHERE workspace_id=:ws AND is_deleted=FALSE AND health_score IS NOT NULL",
        p,
    ) or 0)
    kpis["avg_nps"] = float(_scalar(
        db,
        "SELECT COALESCE(AVG(nps),0) FROM clients "
        "WHERE workspace_id=:ws AND is_deleted=FALSE AND nps IS NOT NULL",
        p,
    ) or 0)

    kpis["projects_active"] = _scalar(
        db,
        "SELECT COUNT(*) FROM projects WHERE workspace_id=:ws AND is_deleted=FALSE "
        "AND LOWER(status)='active'",
        p,
    ) or 0
    kpis["projects_total"] = _scalar(
        db,
        "SELECT COUNT(*) FROM projects WHERE workspace_id=:ws AND is_deleted=FALSE",
        p,
    ) or 0

    deals_row = db.execute(text(
        "SELECT "
        "  COUNT(*) AS total, "
        "  SUM(CASE WHEN LOWER(stage)='won' THEN 1 ELSE 0 END) AS won, "
        "  SUM(CASE WHEN LOWER(stage)='lost' THEN 1 ELSE 0 END) AS lost, "
        "  COALESCE(SUM(CASE WHEN LOWER(stage) NOT IN ('won','lost') THEN value ELSE 0 END),0) AS pipeline_value, "
        "  COALESCE(SUM(CASE WHEN LOWER(stage)='won' THEN value ELSE 0 END),0) AS won_value "
        "FROM deals WHERE workspace_id=:ws AND is_deleted=FALSE"
    ), p).fetchone()
    won = int(deals_row.won or 0)
    lost = int(deals_row.lost or 0)
    kpis["deals_total"] = int(deals_row.total or 0)
    kpis["deals_won"] = won
    kpis["pipeline_value"] = float(deals_row.pipeline_value or 0)
    kpis["win_rate"] = (won / (won + lost) * 100) if (won + lost) > 0 else 0.0
    kpis["avg_deal_size"] = (float(deals_row.won_value) / won) if won > 0 else 0.0

    inv_row = db.execute(text(
        "SELECT "
        "  COALESCE(SUM(CASE WHEN LOWER(status)='paid' THEN amount ELSE 0 END),0) AS paid, "
        "  COALESCE(SUM(CASE WHEN LOWER(status) IN ('sent','overdue') THEN amount ELSE 0 END),0) AS outstanding, "
        "  COALESCE(SUM(CASE WHEN LOWER(status)='overdue' THEN amount ELSE 0 END),0) AS overdue "
        "FROM invoices WHERE workspace_id=:ws AND is_deleted=FALSE"
    ), p).fetchone()
    kpis["revenue_paid"] = float(inv_row.paid or 0)
    kpis["revenue_outstanding"] = float(inv_row.outstanding or 0)
    kpis["revenue_overdue"] = float(inv_row.overdue or 0)

    # ── Operations Activity (Days 12–15) ────────────────────────────────
    approvals_by_status = _rows(
        db,
        "SELECT status, COUNT(*) AS n FROM approvals "
        "WHERE workspace_id=:ws AND is_deleted=FALSE GROUP BY status",
        p,
    )
    insights_by_severity = _rows(
        db,
        "SELECT severity, "
        "  SUM(CASE WHEN acknowledged=FALSE THEN 1 ELSE 0 END) AS open_count, "
        "  COUNT(*) AS total "
        "FROM insights WHERE workspace_id=:ws AND is_deleted=FALSE "
        "GROUP BY severity",
        p,
    )

    audit_total = _scalar(
        db,
        "SELECT COUNT(*) FROM audit_log WHERE workspace_id=:ws",
        p,
    ) or 0
    audit_window = _scalar(
        db,
        "SELECT COUNT(*) FROM audit_log WHERE workspace_id=:ws AND `timestamp` >= :since",
        p,
    ) or 0
    audit_by_module = _rows(
        db,
        "SELECT module, COUNT(*) AS n FROM audit_log "
        "WHERE workspace_id=:ws AND `timestamp` >= :since "
        "GROUP BY module ORDER BY n DESC LIMIT 8",
        p,
    )
    audit_by_day = _rows(
        db,
        "SELECT DATE(`timestamp`) AS day, COUNT(*) AS n FROM audit_log "
        "WHERE workspace_id=:ws AND `timestamp` >= :since "
        "GROUP BY DATE(`timestamp`) ORDER BY day ASC",
        p,
    )

    # ── Margin (top active projects: budget vs paid invoices) ──────────
    margin_rows = _rows(
        db,
        "SELECT p.id, p.name, p.budget, "
        "  COALESCE(("
        "    SELECT SUM(i.amount) FROM invoices i "
        "    WHERE i.project_id=p.id AND i.workspace_id=:ws "
        "      AND i.is_deleted=FALSE AND LOWER(i.status)='paid'"
        "  ),0) AS spent "
        "FROM projects p "
        "WHERE p.workspace_id=:ws AND p.is_deleted=FALSE "
        "  AND LOWER(p.status)='active' AND p.budget > 0 "
        "ORDER BY p.budget DESC LIMIT 8",
        p,
    )
    margin = []
    target = 35
    for r in margin_rows:
        b = float(r["budget"] or 0)
        sp = float(r["spent"] or 0)
        actual = max(0, round(((b - sp) / b) * 100)) if b > 0 else 0
        margin.append({
            "project_id": r["id"],
            "name": r["name"],
            "budget": b,
            "spent": sp,
            "margin_actual_pct": actual,
            "margin_target_pct": target,
            "on_target": actual >= target,
        })

    return {
        "period": period,
        "since": since.isoformat(),
        "kpis": kpis,
        "operations": {
            "approvals_by_status": [
                {"status": r["status"], "count": int(r["n"])} for r in approvals_by_status
            ],
            "insights_by_severity": [
                {
                    "severity": r["severity"],
                    "open": int(r["open_count"] or 0),
                    "total": int(r["total"] or 0),
                }
                for r in insights_by_severity
            ],
            "audit_total": int(audit_total),
            "audit_in_period": int(audit_window),
            "audit_by_module": [
                {"module": r["module"], "count": int(r["n"])} for r in audit_by_module
            ],
            "audit_by_day": [
                {
                    "day": r["day"].isoformat() if hasattr(r["day"], "isoformat") else str(r["day"]),
                    "count": int(r["n"]),
                }
                for r in audit_by_day
            ],
        },
        "margin": margin,
    }
