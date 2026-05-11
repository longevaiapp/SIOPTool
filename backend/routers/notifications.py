"""Notifications aggregator — read-only.

Combines pending approvals, unacknowledged critical/high insights, and
unread messages into a single inbox feed for the topbar bell.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from lib.auth import Principal, get_current_principal
from lib.db import get_db


router = APIRouter(prefix="/api/notifications", tags=["notifications"])


def _iso(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


@router.get("")
def list_notifications(
    limit: int = Query(50, ge=1, le=200),
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    ws = principal.workspace_id

    approvals = db.execute(
        text(
            """
            SELECT id, title, approval_type, project_id, client_id,
                   created_at, updated_at
            FROM approvals
            WHERE workspace_id = :ws AND is_deleted = FALSE
              AND status = 'PENDING'
            ORDER BY created_at DESC
            LIMIT :limit
            """
        ),
        {"ws": ws, "limit": limit},
    ).all()

    insights = db.execute(
        text(
            """
            SELECT id, title, severity, module, related_entity_type,
                   related_entity_id, created_at
            FROM insights
            WHERE workspace_id = :ws AND is_deleted = FALSE
              AND acknowledged = FALSE
              AND severity IN ('CRITICAL', 'HIGH')
            ORDER BY FIELD(severity, 'CRITICAL', 'HIGH'), created_at DESC
            LIMIT :limit
            """
        ),
        {"ws": ws, "limit": limit},
    ).all()

    messages = db.execute(
        text(
            """
            SELECT id, body, sender_name, sender_role, project_id,
                   client_id, created_at
            FROM messages
            WHERE workspace_id = :ws AND is_deleted = FALSE
              AND read_at IS NULL
            ORDER BY created_at DESC
            LIMIT :limit
            """
        ),
        {"ws": ws, "limit": limit},
    ).all()

    items: list[dict[str, Any]] = []

    for r in approvals:
        items.append({
            "kind": "approval",
            "id": r.id,
            "title": r.title,
            "subtitle": f"Pending {(r.approval_type or 'approval').lower().replace('_', ' ')}",
            "severity": "warning",
            "href": "/approvals",
            "project_id": r.project_id,
            "client_id": r.client_id,
            "created_at": _iso(r.created_at),
        })

    for r in insights:
        items.append({
            "kind": "insight",
            "id": r.id,
            "title": r.title,
            "subtitle": f"{(r.module or 'AI')} · {(r.severity or '').lower()}",
            "severity": "critical" if (r.severity or "").upper() == "CRITICAL" else "warning",
            "href": "/ai-insights",
            "project_id": r.related_entity_id if (r.related_entity_type or "").lower() == "project" else None,
            "client_id": r.related_entity_id if (r.related_entity_type or "").lower() == "client" else None,
            "created_at": _iso(r.created_at),
        })

    for r in messages:
        body = r.body or ""
        preview = body if len(body) <= 140 else body[:140] + "…"
        items.append({
            "kind": "message",
            "id": r.id,
            "title": f"{r.sender_name or 'Client'} · {r.sender_role or ''}".strip(" ·"),
            "subtitle": preview,
            "severity": "info",
            "href": r.project_id and f"/pm-tab/{r.project_id}" or (r.client_id and f"/customer-health/{r.client_id}") or "/messages",
            "project_id": r.project_id,
            "client_id": r.client_id,
            "created_at": _iso(r.created_at),
        })

    items.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    items = items[:limit]

    return {
        "total": len(items),
        "counts": {
            "approvals": len(approvals),
            "insights": len(insights),
            "messages": len(messages),
        },
        "items": items,
    }
