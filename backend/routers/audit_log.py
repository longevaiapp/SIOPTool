"""Audit Log viewer router — read-only.

audit_log is insert-only by project rule. This router exposes filterable
list + summary endpoints for compliance / inspection.
"""
from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from lib.auth import Principal, get_current_principal
from lib.db import get_db


router = APIRouter(prefix="/api/audit-log", tags=["audit-log"])


def _row_to_dict(row: Any) -> dict[str, Any]:
    payload = row.payload_delta
    if isinstance(payload, str):
        try:
            payload = json.loads(payload)
        except Exception:
            pass
    return {
        "id": row.id,
        "created_at": row.created_at.isoformat() if isinstance(row.created_at, datetime) else row.created_at,
        "timestamp": row.timestamp.isoformat() if isinstance(row.timestamp, datetime) else row.timestamp,
        "workspace_id": row.workspace_id,
        "user_id": row.user_id,
        "action": row.action,
        "module": row.module,
        "record_id": row.record_id,
        "payload_delta": payload,
    }


@router.get("")
def list_audit(
    module: str | None = Query(None),
    action: str | None = Query(None),
    user_id: str | None = Query(None),
    record_id: str | None = Query(None),
    q: str | None = Query(None, description="Free-text search on action/module/record_id"),
    limit: int = Query(200, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    where = ["workspace_id = :ws"]
    params: dict[str, Any] = {"ws": principal.workspace_id}
    if module:
        where.append("module = :module")
        params["module"] = module
    if action:
        where.append("action = :action")
        params["action"] = action
    if user_id:
        where.append("user_id = :uid")
        params["uid"] = user_id
    if record_id:
        where.append("record_id = :rid")
        params["rid"] = record_id
    if q:
        where.append("(action LIKE :q OR module LIKE :q OR record_id LIKE :q)")
        params["q"] = f"%{q}%"

    where_sql = " AND ".join(where)
    count_sql = text(f"SELECT COUNT(*) AS c FROM audit_log WHERE {where_sql}")
    total = db.execute(count_sql, params).scalar() or 0

    list_sql = text(
        f"""
        SELECT id, created_at, `timestamp`, workspace_id, user_id,
               action, module, record_id, payload_delta
        FROM audit_log
        WHERE {where_sql}
        ORDER BY `timestamp` DESC
        LIMIT :limit OFFSET :offset
        """
    )
    params_with_paging = {**params, "limit": limit, "offset": offset}
    rows = db.execute(list_sql, params_with_paging).all()
    return {
        "total": int(total),
        "limit": limit,
        "offset": offset,
        "items": [_row_to_dict(r) for r in rows],
    }


@router.get("/summary")
def summary(
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    ws = {"ws": principal.workspace_id}
    total = db.execute(
        text("SELECT COUNT(*) AS c FROM audit_log WHERE workspace_id = :ws"),
        ws,
    ).scalar() or 0
    by_module = db.execute(
        text(
            """
            SELECT module, COUNT(*) AS c
            FROM audit_log
            WHERE workspace_id = :ws
            GROUP BY module
            ORDER BY c DESC
            """
        ),
        ws,
    ).all()
    by_action = db.execute(
        text(
            """
            SELECT action, COUNT(*) AS c
            FROM audit_log
            WHERE workspace_id = :ws
            GROUP BY action
            ORDER BY c DESC
            LIMIT 20
            """
        ),
        ws,
    ).all()
    last24 = db.execute(
        text(
            """
            SELECT COUNT(*) AS c
            FROM audit_log
            WHERE workspace_id = :ws
              AND `timestamp` >= (NOW() - INTERVAL 1 DAY)
            """
        ),
        ws,
    ).scalar() or 0
    return {
        "total": int(total),
        "last_24h": int(last24),
        "by_module": [{"module": r.module, "count": int(r.c)} for r in by_module],
        "by_action": [{"action": r.action, "count": int(r.c)} for r in by_action],
    }


@router.get("/{audit_id}")
def get_audit(
    audit_id: str,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> dict[str, Any] | None:
    row = db.execute(
        text(
            """
            SELECT id, created_at, `timestamp`, workspace_id, user_id,
                   action, module, record_id, payload_delta
            FROM audit_log
            WHERE workspace_id = :ws AND id = :id
            """
        ),
        {"ws": principal.workspace_id, "id": audit_id},
    ).first()
    if not row:
        return None
    return _row_to_dict(row)
