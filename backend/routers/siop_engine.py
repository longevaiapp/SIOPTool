"""SIOP Engine — deterministic scenario generator.

POST /api/siop-engine/run
  Reads role_capacity, demand_forecast, deals, projects, invoices and
  produces 4 canonical scenarios (Baseline, Hire to Cover Gap,
  Contractor Augmentation, Accelerate Pipeline). Persists each to
  siop_scenarios with computed `results` JSON. Soft-deletes prior
  generated scenarios from this engine (tagged via results.generated=True)
  so the table doesn't grow unbounded across runs. Baseline scenarios
  marked is_baseline=TRUE are preserved if they were not engine-generated.

GET /api/siop-engine/snapshot
  Returns the current capacity/demand/revenue snapshot used by the
  engine — useful for the UI to display pre-run numbers.
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from lib.audit import record_audit
from lib.auth import Principal, get_current_principal
from lib.db import get_db


router = APIRouter(prefix="/api/siop-engine", tags=["siop"])


# ── Snapshot helpers ──────────────────────────────────────────────────────


def _scalar(db: Session, sql: str, params: dict[str, Any]) -> Any:
    return db.execute(text(sql), params).scalar()


def _snapshot(db: Session, ws: str) -> dict[str, Any]:
    p = {"ws": ws}

    cap = db.execute(text(
        "SELECT "
        "  COALESCE(SUM(available_fte),0) AS avail, "
        "  COALESCE(SUM(committed_fte),0) AS committed, "
        "  COALESCE(SUM(forecast_demand),0) AS demand, "
        "  COUNT(DISTINCT role) AS roles "
        "FROM role_capacity WHERE workspace_id=:ws AND is_deleted=FALSE"
    ), p).fetchone()
    avail = float(cap.avail or 0)
    committed = float(cap.committed or 0)
    demand = float(cap.demand or 0)

    revenue = db.execute(text(
        "SELECT "
        "  COALESCE(SUM(CASE WHEN LOWER(status)='paid' THEN amount ELSE 0 END),0) AS paid, "
        "  COALESCE(SUM(CASE WHEN LOWER(status) IN ('sent','overdue') THEN amount ELSE 0 END),0) AS outstanding "
        "FROM invoices WHERE workspace_id=:ws AND is_deleted=FALSE"
    ), p).fetchone()

    pipeline_row = db.execute(text(
        "SELECT "
        "  COALESCE(SUM(CASE WHEN LOWER(stage) NOT IN ('won','lost') THEN value ELSE 0 END),0) AS pipeline, "
        "  COALESCE(SUM(CASE WHEN LOWER(stage) NOT IN ('won','lost') THEN value*COALESCE(probability,50)/100 ELSE 0 END),0) AS weighted "
        "FROM deals WHERE workspace_id=:ws AND is_deleted=FALSE"
    ), p).fetchone()

    active_projects = int(_scalar(
        db,
        "SELECT COUNT(*) FROM projects WHERE workspace_id=:ws AND is_deleted=FALSE "
        "AND LOWER(status)='active'",
        p,
    ) or 0)

    margin_row = db.execute(text(
        "SELECT COALESCE(AVG( "
        "  CASE WHEN p.budget > 0 THEN GREATEST(0, ((p.budget - COALESCE(("
        "    SELECT SUM(i.amount) FROM invoices i "
        "    WHERE i.project_id=p.id AND i.workspace_id=:ws "
        "      AND i.is_deleted=FALSE AND LOWER(i.status)='paid'"
        "  ),0)) / p.budget) * 100) ELSE NULL END "
        "), 0) AS avg_margin "
        "FROM projects p WHERE p.workspace_id=:ws AND p.is_deleted=FALSE "
        "AND LOWER(p.status)='active' AND p.budget > 0"
    ), p).fetchone()

    utilization = (committed / avail * 100) if avail > 0 else 0.0
    gap = demand - avail  # positive => shortfall

    return {
        "capacity": {
            "available_fte": avail,
            "committed_fte": committed,
            "forecast_demand_fte": demand,
            "utilization_pct": round(utilization, 1),
            "gap_fte": round(gap, 2),
            "roles": int(cap.roles or 0),
        },
        "revenue": {
            "paid": float(revenue.paid or 0),
            "outstanding": float(revenue.outstanding or 0),
            "pipeline_total": float(pipeline_row.pipeline or 0),
            "pipeline_weighted": float(pipeline_row.weighted or 0),
        },
        "active_projects": active_projects,
        "avg_margin_pct": round(float(margin_row.avg_margin or 0), 1),
    }


# ── Scenario generator ────────────────────────────────────────────────────


CONTRACTOR_COST_PER_FTE = 18000  # monthly, premium over employee
EMPLOYEE_COST_PER_FTE = 12000    # monthly fully loaded
REVENUE_PER_FTE = 22000          # monthly billable target


def _build_scenarios(snap: dict[str, Any]) -> list[dict[str, Any]]:
    cap = snap["capacity"]
    rev = snap["revenue"]
    gap = float(cap["gap_fte"])
    util = float(cap["utilization_pct"])
    pipeline_w = float(rev["pipeline_weighted"])
    margin = float(snap["avg_margin_pct"])

    scenarios: list[dict[str, Any]] = []

    # 1. Baseline — current trajectory
    scenarios.append({
        "name": "Baseline — Current Trajectory",
        "description": (
            f"Hold current capacity. Utilization {util:.0f}%, "
            f"capacity {'shortfall of ' + f'{gap:.1f} FTE' if gap > 0 else f'surplus of {abs(gap):.1f} FTE'}."
        ),
        "is_baseline": True,
        "results": {
            "type": "baseline",
            "status": "active",
            "demand_delta_pct": 0,
            "supply_gap": round(gap, 2),
            "revenue_impact": 0,
            "margin_impact": 0,
            "confidence": 95,
            "actions": [
                "Monitor weekly utilization vs 85% target",
                "Continue current hiring plan" if gap > 0 else "No capacity action required",
            ],
            "generated": True,
        },
    })

    # 2. Hire to cover gap (only if gap > 0)
    if gap > 0:
        hires_needed = max(1, round(gap))
        added_capacity = hires_needed
        revenue_uplift = added_capacity * REVENUE_PER_FTE * 3  # 3-month horizon
        cost = hires_needed * EMPLOYEE_COST_PER_FTE * 3
        margin_impact_pct = ((revenue_uplift - cost) / max(revenue_uplift, 1)) * 100
        scenarios.append({
            "name": f"Hire {hires_needed} FTE to Close Gap",
            "description": f"Add {hires_needed} permanent FTE to absorb forecast demand and protect quality.",
            "is_baseline": False,
            "results": {
                "type": "hiring",
                "status": "draft",
                "demand_delta_pct": 0,
                "supply_gap": round(gap - added_capacity, 2),
                "revenue_impact": round(revenue_uplift, 2),
                "margin_impact": round(margin_impact_pct, 1),
                "confidence": 78,
                "actions": [
                    f"Open {hires_needed} req(s) within 2 weeks",
                    "8–12 week ramp-up period; bridge with contractors",
                    f"Budget: ~{format(cost, ',.0f')} over 3 months",
                ],
                "generated": True,
            },
        })

    # 3. Contractor augmentation — fast but lower margin
    if gap > 0:
        contractors = max(1, round(gap))
        revenue_uplift = contractors * REVENUE_PER_FTE * 2  # 2-month engagement
        cost = contractors * CONTRACTOR_COST_PER_FTE * 2
        margin_impact_pct = ((revenue_uplift - cost) / max(revenue_uplift, 1)) * 100
        scenarios.append({
            "name": f"Contractor Augmentation ({contractors} FTE)",
            "description": f"Bring on {contractors} contractor(s) to cover near-term gap with minimal lead time.",
            "is_baseline": False,
            "results": {
                "type": "contractors",
                "status": "draft",
                "demand_delta_pct": 0,
                "supply_gap": round(gap - contractors, 2),
                "revenue_impact": round(revenue_uplift, 2),
                "margin_impact": round(margin_impact_pct, 1),
                "confidence": 88,
                "actions": [
                    f"Engage {contractors} contractor(s) via preferred vendor list",
                    "Onboard within 2 weeks",
                    f"Higher cost (~{int((CONTRACTOR_COST_PER_FTE/EMPLOYEE_COST_PER_FTE - 1) * 100)}% premium) but no ramp-up",
                ],
                "generated": True,
            },
        })

    # 4. Accelerate pipeline — pull weighted pipeline forward
    if pipeline_w > 0:
        accel_pct = 15
        revenue_uplift = pipeline_w * (accel_pct / 100)
        # Each $REVENUE_PER_FTE/mo of new work consumes 1 FTE-month
        added_demand = revenue_uplift / REVENUE_PER_FTE
        new_gap = gap + added_demand
        confidence = 70 if util < 90 else 55
        scenarios.append({
            "name": f"Accelerate Pipeline +{accel_pct}%",
            "description": (
                f"Pull {accel_pct}% of weighted pipeline forward via targeted close plans. "
                f"Adds ~{added_demand:.1f} FTE of demand."
            ),
            "is_baseline": False,
            "results": {
                "type": "pipeline_acceleration",
                "status": "draft",
                "demand_delta_pct": accel_pct,
                "supply_gap": round(new_gap, 2),
                "revenue_impact": round(revenue_uplift, 2),
                "margin_impact": round(margin * 0.8, 1),  # slight margin pressure from rush
                "confidence": confidence,
                "actions": [
                    "Identify top-3 weighted deals for accelerated close",
                    "Align Sales + Delivery on expedited onboarding",
                    "Confirm capacity plan before commitment" if new_gap > 0 else "Capacity adequate",
                ],
                "generated": True,
            },
        })

    return scenarios


# ── Endpoints ─────────────────────────────────────────────────────────────


@router.get("/snapshot")
def snapshot(
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    return _snapshot(db, principal.workspace_id)


class RunRequest(BaseModel):
    horizon_weeks: int = 12


class RunResponse(BaseModel):
    snapshot: dict[str, Any]
    scenarios_created: int
    scenario_ids: list[str]
    ran_at: datetime


@router.post("/run", response_model=RunResponse)
def run_cycle(
    body: RunRequest = RunRequest(),
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> RunResponse:
    ws = principal.workspace_id
    uid = principal.user_id
    snap = _snapshot(db, ws)
    scenarios = _build_scenarios(snap)

    # Soft-delete previously engine-generated scenarios so the engine
    # output stays fresh. Hand-authored scenarios are preserved.
    now = datetime.utcnow()
    db.execute(
        text(
            "UPDATE siop_scenarios "
            "SET is_deleted=TRUE, deleted_at=:now "
            "WHERE workspace_id=:ws AND is_deleted=FALSE "
            "AND JSON_EXTRACT(results,'$.generated')=TRUE"
        ),
        {"ws": ws, "now": now},
    )

    created_ids: list[str] = []
    for s in scenarios:
        sid = str(uuid.uuid4())
        db.execute(
            text(
                "INSERT INTO siop_scenarios "
                "(id, created_at, updated_at, workspace_id, is_deleted, "
                " name, description, horizon_weeks, assumptions, results, "
                " is_baseline, created_by) "
                "VALUES (:id, :now, :now, :ws, FALSE, "
                " :name, :desc, :hz, :assumptions, :results, "
                " :base, :uid)"
            ),
            {
                "id": sid,
                "now": now,
                "ws": ws,
                "name": s["name"],
                "desc": s["description"],
                "hz": body.horizon_weeks,
                "assumptions": json.dumps({"snapshot": snap}),
                "results": json.dumps(s["results"]),
                "base": s["is_baseline"],
                "uid": uid,
            },
        )
        record_audit(
            db,
            workspace_id=ws,
            user_id=uid,
            module="siop.engine",
            action="run_cycle.scenario_created",
            record_id=sid,
            payload_delta={"name": s["name"], "type": s["results"]["type"]},
        )
        created_ids.append(sid)

    record_audit(
        db,
        workspace_id=ws,
        user_id=uid,
        module="siop.engine",
        action="run_cycle",
        record_id=None,
        payload_delta={
            "horizon_weeks": body.horizon_weeks,
            "scenarios_created": len(created_ids),
            "snapshot": snap,
        },
    )
    db.commit()

    return RunResponse(
        snapshot=snap,
        scenarios_created=len(created_ids),
        scenario_ids=created_ids,
        ran_at=now,
    )
