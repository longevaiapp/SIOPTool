"""Deal lifecycle propagation.

Single source of truth for moving a deal forward as related artifacts
(quotes, contracts, projects) are created or updated. Keeps the CRM
pipeline in sync with the rest of the platform.

Stage progression (canonical, lower-case):
    lead → qualified → proposal → contract → won → (lost)

Visual kickoff/delivery/renewal stages in the pipeline timeline are
derived from the existence of a project, sprint, or renewal meeting —
they are NOT stored on the deal stage column.
"""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Iterable

from sqlalchemy import text
from sqlalchemy.orm import Session

from .audit import record_audit


# Ordered list — higher index = more advanced.
_STAGE_RANK: dict[str, int] = {
    "":           0,
    "prospect":   0,
    "lead":       1,
    "qualified":  2,
    "discovery":  2,
    "proposal":   3,
    "negotiation": 3,
    "contract":   4,
    "won":        5,
    "lost":       5,
}


def _rank(stage: str | None) -> int:
    return _STAGE_RANK.get((stage or "").lower(), 0)


def _advance_deal(
    db: Session,
    *,
    workspace_id: str,
    user_id: str,
    deal_id: str,
    target_stage: str,
    value: Decimal | float | int | None = None,
    reason: str = "",
    extra_audit: dict | None = None,
) -> None:
    """Move a deal forward, but never backward. Bumps value if higher.

    Always touches `last_activity_at` so the deal lights up in dashboards.
    Inserts an audit_log row.
    """
    if not deal_id:
        return

    row = db.execute(
        text("SELECT stage, value FROM deals "
             "WHERE id = :did AND workspace_id = :ws AND is_deleted = FALSE"),
        {"did": deal_id, "ws": workspace_id},
    ).mappings().first()
    if not row:
        return

    current_stage = (row["stage"] or "").lower()
    new_stage = current_stage if _rank(current_stage) >= _rank(target_stage) else target_stage.lower()

    # Value: only bump if the new value is higher (avoid downgrading a deal
    # because of a smaller change order).
    new_value = row["value"]
    if value is not None:
        try:
            v_dec = Decimal(str(value))
            cur = Decimal(str(row["value"] or 0))
            if v_dec > cur:
                new_value = v_dec
        except Exception:
            pass

    now = datetime.utcnow()
    db.execute(
        text("UPDATE deals SET "
             "  stage = :stage, "
             "  value = :val, "
             "  last_activity_at = :now, "
             "  updated_at = :now "
             "WHERE id = :did AND workspace_id = :ws AND is_deleted = FALSE"),
        {
            "did": deal_id, "ws": workspace_id, "now": now,
            "stage": new_stage, "val": new_value,
        },
    )

    if new_stage != current_stage or (value is not None and new_value != row["value"]):
        delta = {
            "from_stage": current_stage,
            "to_stage": new_stage,
            "reason": reason,
        }
        if value is not None:
            delta["value"] = str(new_value)
        if extra_audit:
            delta.update(extra_audit)
        record_audit(
            db,
            workspace_id=workspace_id,
            user_id=user_id,
            module="crm.deals",
            action="lifecycle.advance",
            record_id=deal_id,
            payload_delta=delta,
        )


# ─────────────────────────── Public entry points ───────────────────────────

def on_quote_changed(
    db: Session, *,
    workspace_id: str,
    user_id: str,
    quote_row: dict,
) -> None:
    """Call after creating or updating a quote.

    - Always (when there is a deal_id): bumps deal to `proposal` and value.
    - If quote.status moved to 'rejected' we leave the deal alone (caller
      can manually mark lost).
    """
    deal_id = quote_row.get("deal_id")
    if not deal_id:
        return

    status = (quote_row.get("status") or "").lower()
    if status == "rejected":
        return

    _advance_deal(
        db,
        workspace_id=workspace_id,
        user_id=user_id,
        deal_id=deal_id,
        target_stage="proposal",
        value=quote_row.get("total"),
        reason=f"quote.{status or 'created'}:{quote_row.get('folio') or quote_row.get('id')}",
        extra_audit={"quote_id": quote_row.get("id"), "quote_folio": quote_row.get("folio")},
    )


def on_contract_changed(
    db: Session, *,
    workspace_id: str,
    user_id: str,
    contract_row: dict,
) -> None:
    """Call after creating or updating a contract.

    Status mapping → deal stage:
      DRAFT / PENDING / IN_REVIEW → 'contract'
      ACTIVE / SIGNED / EXECUTED  → 'won'
      CANCELLED / TERMINATED      → no automatic regression
    """
    deal_id = contract_row.get("deal_id")
    if not deal_id:
        return

    status = (contract_row.get("status") or "").upper()
    if status in ("ACTIVE", "SIGNED", "EXECUTED"):
        target = "won"
    elif status in ("CANCELLED", "TERMINATED"):
        return
    else:
        target = "contract"

    _advance_deal(
        db,
        workspace_id=workspace_id,
        user_id=user_id,
        deal_id=deal_id,
        target_stage=target,
        value=contract_row.get("value"),
        reason=f"contract.{status.lower() or 'created'}:{contract_row.get('id')}",
        extra_audit={"contract_id": contract_row.get("id"),
                     "contract_status": status},
    )


def on_project_changed(
    db: Session, *,
    workspace_id: str,
    user_id: str,
    project_row: dict,
) -> None:
    """Call after creating a project. If linked to a deal, ensure deal is at
    least 'won' (project means we're delivering)."""
    deal_id = project_row.get("deal_id")
    if not deal_id:
        return
    _advance_deal(
        db,
        workspace_id=workspace_id,
        user_id=user_id,
        deal_id=deal_id,
        target_stage="won",
        reason=f"project.created:{project_row.get('id')}",
        extra_audit={"project_id": project_row.get("id")},
    )


def recalc_project_health(
    db: Session, *,
    workspace_id: str,
    user_id: str,
    project_id: str,
) -> int | None:
    """Recompute project.health_score = % tasks done. Returns the new score
    or None if there are no tasks. Inserts an audit row on change."""
    if not project_id:
        return None
    counts = db.execute(
        text("SELECT "
             "  SUM(CASE WHEN LOWER(status) IN ('done','completed','closed') THEN 1 ELSE 0 END) AS done, "
             "  COUNT(*) AS total "
             "FROM tasks "
             "WHERE project_id = :pid AND workspace_id = :ws AND is_deleted = FALSE"),
        {"pid": project_id, "ws": workspace_id},
    ).mappings().first()
    if not counts or not counts["total"]:
        return None
    pct = int(round((float(counts["done"] or 0) / float(counts["total"])) * 100))

    cur = db.execute(
        text("SELECT health_score FROM projects "
             "WHERE id = :pid AND workspace_id = :ws AND is_deleted = FALSE"),
        {"pid": project_id, "ws": workspace_id},
    ).scalar()
    if cur == pct:
        return pct

    now = datetime.utcnow()
    db.execute(
        text("UPDATE projects SET health_score = :pct, updated_at = :now "
             "WHERE id = :pid AND workspace_id = :ws AND is_deleted = FALSE"),
        {"pct": pct, "pid": project_id, "ws": workspace_id, "now": now},
    )
    record_audit(
        db,
        workspace_id=workspace_id,
        user_id=user_id,
        module="pm.projects",
        action="lifecycle.health_recalc",
        record_id=project_id,
        payload_delta={"from": cur, "to": pct, "tasks_done": int(counts["done"] or 0),
                       "tasks_total": int(counts["total"])},
    )
    return pct


def on_task_changed(
    db: Session, *,
    workspace_id: str,
    user_id: str,
    task_row: dict,
) -> None:
    """Call after task create/update. Recalcs project health when status
    or completeness changes."""
    pid = task_row.get("project_id")
    if not pid:
        return
    try:
        recalc_project_health(
            db, workspace_id=workspace_id, user_id=user_id, project_id=pid,
        )
    except Exception:
        pass


def on_invoice_changed(
    db: Session, *,
    workspace_id: str,
    user_id: str,
    invoice_row: dict,
) -> None:
    """Call after invoice create/update. When invoice is paid, sum all paid
    invoices for the related project and bump deal.realized_value."""
    status_str = (invoice_row.get("status") or "").lower()
    if status_str not in ("paid", "pagada", "cobrada", "settled"):
        return

    project_id = invoice_row.get("project_id")
    if not project_id:
        return

    # Find deal_id via project
    proj = db.execute(
        text("SELECT deal_id FROM projects "
             "WHERE id = :pid AND workspace_id = :ws AND is_deleted = FALSE"),
        {"pid": project_id, "ws": workspace_id},
    ).mappings().first()
    if not proj or not proj.get("deal_id"):
        return
    deal_id = proj["deal_id"]

    total_paid = db.execute(
        text("SELECT COALESCE(SUM(amount), 0) FROM invoices "
             "WHERE project_id = :pid AND workspace_id = :ws "
             "  AND LOWER(status) IN ('paid','pagada','cobrada','settled') "
             "  AND is_deleted = FALSE"),
        {"pid": project_id, "ws": workspace_id},
    ).scalar() or 0

    # Check if deals table has realized_value column; if not, skip silently
    try:
        existing = db.execute(
            text("SELECT realized_value FROM deals "
                 "WHERE id = :did AND workspace_id = :ws AND is_deleted = FALSE"),
            {"did": deal_id, "ws": workspace_id},
        ).scalar()
    except Exception:
        return  # column doesn't exist yet — nothing to do

    if existing == total_paid:
        return

    now = datetime.utcnow()
    db.execute(
        text("UPDATE deals SET realized_value = :val, last_activity_at = :now, updated_at = :now "
             "WHERE id = :did AND workspace_id = :ws AND is_deleted = FALSE"),
        {"val": total_paid, "did": deal_id, "ws": workspace_id, "now": now},
    )
    record_audit(
        db,
        workspace_id=workspace_id,
        user_id=user_id,
        module="crm.deals",
        action="lifecycle.realized",
        record_id=deal_id,
        payload_delta={"from": str(existing or 0), "to": str(total_paid),
                       "invoice_id": invoice_row.get("id"),
                       "invoice_folio": invoice_row.get("folio")},
    )


__all__: Iterable[str] = (
    "on_quote_changed",
    "on_contract_changed",
    "on_project_changed",
    "on_task_changed",
    "on_invoice_changed",
    "recalc_project_health",
)
