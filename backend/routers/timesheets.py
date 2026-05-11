"""Timesheet router.

CRUD via make_router + a rollup endpoint that aggregates hours by role
into role_capacity.committed_fte (1 FTE = 40 hours/week).
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta
from typing import Any, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from lib.audit import record_audit
from lib.auth import Principal, get_current_principal
from lib.db import get_db
from lib.router_factory import make_router
from models.timesheet import TimeEntryCreate, TimeEntryOut, TimeEntryUpdate
from services.timesheet_service import resource


# CRUD router
crud_router = make_router(
    prefix="/api/timesheets",
    tag="timesheet",
    resource=resource,
    create_model=TimeEntryCreate,
    update_model=TimeEntryUpdate,
    out_model=TimeEntryOut,
)

# Extra ops router
ops_router = APIRouter(prefix="/api/timesheets", tags=["timesheet"])


HOURS_PER_FTE_WEEK = 40.0


def _week_start_for(d: date) -> date:
    return d - timedelta(days=d.weekday())  # Monday


class RollupRequest(BaseModel):
    week_start: Optional[date] = None  # defaults to current week (Mon)


class RollupRow(BaseModel):
    role: str
    week_start: date
    hours: float
    fte: float
    role_capacity_id: str
    updated: bool


class RollupResponse(BaseModel):
    week_start: date
    rows: list[RollupRow]


@ops_router.post("/rollup", response_model=RollupResponse)
def rollup_to_capacity(
    body: RollupRequest = RollupRequest(),
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> RollupResponse:
    ws = principal.workspace_id
    uid = principal.user_id
    week = body.week_start or _week_start_for(date.today())

    # Aggregate hours per role for the week
    agg = db.execute(
        text(
            "SELECT role, COALESCE(SUM(hours),0) AS total_hours "
            "FROM time_entries "
            "WHERE workspace_id=:ws AND is_deleted=FALSE AND week_start=:wk "
            "GROUP BY role"
        ),
        {"ws": ws, "wk": week},
    ).fetchall()

    rows: list[RollupRow] = []
    now = datetime.utcnow()
    for r in agg:
        role = r.role
        hours = float(r.total_hours or 0)
        fte = round(hours / HOURS_PER_FTE_WEEK, 2)

        # Find existing role_capacity row for this role+week (or any week)
        existing = db.execute(
            text(
                "SELECT id, committed_fte FROM role_capacity "
                "WHERE workspace_id=:ws AND is_deleted=FALSE AND role=:role "
                "ORDER BY (week_start = :wk) DESC, "
                "         (week_start IS NULL) DESC, "
                "         updated_at DESC LIMIT 1"
            ),
            {"ws": ws, "role": role, "wk": week},
        ).fetchone()

        if existing is not None:
            rc_id = existing.id
            db.execute(
                text(
                    "UPDATE role_capacity "
                    "SET committed_fte=:fte, week_start=:wk, updated_at=:now "
                    "WHERE id=:id"
                ),
                {"fte": fte, "wk": week, "now": now, "id": rc_id},
            )
            updated = True
        else:
            rc_id = str(uuid.uuid4())
            db.execute(
                text(
                    "INSERT INTO role_capacity "
                    "(id, created_at, updated_at, workspace_id, is_deleted, "
                    " role, available_fte, committed_fte, forecast_demand, week_start) "
                    "VALUES (:id, :now, :now, :ws, FALSE, "
                    " :role, 0, :fte, 0, :wk)"
                ),
                {"id": rc_id, "now": now, "ws": ws, "role": role, "fte": fte, "wk": week},
            )
            updated = False

        record_audit(
            db,
            workspace_id=ws,
            user_id=uid,
            module="siop.role_capacity",
            action="rollup.committed_fte" if updated else "rollup.created",
            record_id=rc_id,
            payload_delta={
                "role": role,
                "week_start": week.isoformat(),
                "hours": hours,
                "committed_fte": fte,
            },
        )
        rows.append(RollupRow(
            role=role, week_start=week, hours=hours, fte=fte,
            role_capacity_id=rc_id, updated=updated,
        ))

    record_audit(
        db,
        workspace_id=ws,
        user_id=uid,
        module="siop.timesheet",
        action="rollup",
        record_id=None,
        payload_delta={"week_start": week.isoformat(), "roles_updated": len(rows)},
    )
    db.commit()
    return RollupResponse(week_start=week, rows=rows)


@ops_router.get("/summary")
def summary(
    week_start: Optional[date] = Query(None),
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    ws = principal.workspace_id
    week = week_start or _week_start_for(date.today())
    rows = db.execute(
        text(
            "SELECT role, COALESCE(SUM(hours),0) AS hours, COUNT(*) AS entries "
            "FROM time_entries "
            "WHERE workspace_id=:ws AND is_deleted=FALSE AND week_start=:wk "
            "GROUP BY role ORDER BY hours DESC"
        ),
        {"ws": ws, "wk": week},
    ).fetchall()
    total = float(sum(float(r.hours or 0) for r in rows))
    return {
        "week_start": week.isoformat(),
        "total_hours": total,
        "total_fte": round(total / HOURS_PER_FTE_WEEK, 2),
        "by_role": [
            {
                "role": r.role,
                "hours": float(r.hours or 0),
                "fte": round(float(r.hours or 0) / HOURS_PER_FTE_WEEK, 2),
                "entries": int(r.entries or 0),
            }
            for r in rows
        ],
    }
