"""Customer Portal — client-scoped read aggregator + reply endpoint.

The portal lets an external client view their own approvals, messages,
documents, projects and invoices in one place. Auth is intentionally
left at the workspace-DEMO level for now — a real session-bound client
auth replaces this in a later milestone.

Endpoints:
  GET  /api/portal/{client_id}/dashboard
  POST /api/portal/{client_id}/messages   {body, sender_name?}
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from lib.audit import record_audit
from lib.auth import Principal, get_current_principal
from lib.db import get_db


router = APIRouter(prefix="/api/portal", tags=["portal"])


def _row(db: Session, sql: str, params: dict[str, Any]) -> Any:
    return db.execute(text(sql), params).fetchone()


def _rows(db: Session, sql: str, params: dict[str, Any]) -> list[dict[str, Any]]:
    return [dict(r._mapping) for r in db.execute(text(sql), params)]


def _ensure_client(db: Session, ws: str, client_id: str) -> dict[str, Any]:
    row = _row(
        db,
        "SELECT id, name, status, segment, health_score, arr, primary_contact_name, "
        "       primary_contact_email, primary_contact_role "
        "FROM clients WHERE workspace_id=:ws AND is_deleted=FALSE AND id=:cid",
        {"ws": ws, "cid": client_id},
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Client not found")
    return dict(row._mapping)


@router.get("/{client_id}/dashboard")
def dashboard(
    client_id: str,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    ws = principal.workspace_id
    p = {"ws": ws, "cid": client_id}
    client = _ensure_client(db, ws, client_id)

    projects = _rows(
        db,
        "SELECT id, name, status, phase, health_score, budget, methodology, "
        "       phi_involved, baa_confirmed, created_at, updated_at "
        "FROM projects WHERE workspace_id=:ws AND is_deleted=FALSE AND client_id=:cid "
        "ORDER BY updated_at DESC",
        p,
    )

    approvals = _rows(
        db,
        "SELECT id, title, description, approval_type, status, decided_at, "
        "       decision_note, project_id, created_at, updated_at "
        "FROM approvals WHERE workspace_id=:ws AND is_deleted=FALSE AND client_id=:cid "
        "ORDER BY (status='PENDING') DESC, updated_at DESC LIMIT 50",
        p,
    )

    messages = _rows(
        db,
        "SELECT id, sender_name, sender_role, body, read_at, project_id, "
        "       client_id, created_at "
        "FROM messages WHERE workspace_id=:ws AND is_deleted=FALSE AND client_id=:cid "
        "ORDER BY created_at DESC LIMIT 50",
        p,
    )

    documents = _rows(
        db,
        "SELECT id, folio, kind, title, status, version, project_id, "
        "       sent_at, signed_at, accepted_at, created_at "
        "FROM documents WHERE workspace_id=:ws AND is_deleted=FALSE AND client_id=:cid "
        "  AND status IN ('sent','signed','accepted','rejected') "
        "ORDER BY created_at DESC LIMIT 50",
        p,
    )

    invoices = _rows(
        db,
        "SELECT id, number, amount, currency, status, issue_date, due_date, "
        "       paid_date, project_id, created_at "
        "FROM invoices WHERE workspace_id=:ws AND is_deleted=FALSE AND client_id=:cid "
        "ORDER BY issue_date DESC, created_at DESC LIMIT 50",
        p,
    )

    inv_totals = _row(
        db,
        "SELECT "
        "  COALESCE(SUM(CASE WHEN LOWER(status)='paid' THEN amount ELSE 0 END),0) AS paid, "
        "  COALESCE(SUM(CASE WHEN LOWER(status) IN ('sent','overdue') THEN amount ELSE 0 END),0) AS outstanding, "
        "  COALESCE(SUM(CASE WHEN LOWER(status)='overdue' THEN amount ELSE 0 END),0) AS overdue "
        "FROM invoices WHERE workspace_id=:ws AND is_deleted=FALSE AND client_id=:cid",
        p,
    )

    counts = {
        "pending_approvals": sum(1 for a in approvals if (a["status"] or "").upper() == "PENDING"),
        "unread_messages": sum(1 for m in messages if m.get("read_at") is None and (m.get("sender_role") or "").upper() != "CLIENT"),
        "active_projects": sum(1 for pr in projects if (pr["status"] or "").lower() == "active"),
        "open_invoices": sum(1 for i in invoices if (i["status"] or "").lower() in ("sent", "overdue")),
        "documents": len(documents),
    }

    return {
        "client": client,
        "counts": counts,
        "invoice_totals": dict(inv_totals._mapping) if inv_totals else {},
        "projects": projects,
        "approvals": approvals,
        "messages": messages,
        "documents": documents,
        "invoices": invoices,
    }


class PortalReply(BaseModel):
    body: str = Field(min_length=1, max_length=5000)
    sender_name: str = Field(default="Client", max_length=255)
    project_id: str | None = None


@router.post("/{client_id}/messages")
def post_message(
    client_id: str,
    payload: PortalReply,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    ws = principal.workspace_id
    _ensure_client(db, ws, client_id)

    mid = str(uuid.uuid4())
    now = datetime.utcnow()
    db.execute(
        text(
            "INSERT INTO messages "
            "(id, created_at, updated_at, workspace_id, is_deleted, "
            " project_id, client_id, sender_id, sender_name, sender_role, body, read_at) "
            "VALUES (:id, :now, :now, :ws, FALSE, "
            " :pid, :cid, NULL, :name, 'CLIENT', :body, NULL)"
        ),
        {
            "id": mid, "now": now, "ws": ws,
            "pid": payload.project_id, "cid": client_id,
            "name": payload.sender_name, "body": payload.body,
        },
    )
    record_audit(
        db,
        workspace_id=ws,
        user_id=principal.user_id,
        module="portal.messages",
        action="create",
        record_id=mid,
        payload_delta={
            "client_id": client_id,
            "project_id": payload.project_id,
            "sender_name": payload.sender_name,
            "length": len(payload.body),
        },
    )
    db.commit()

    return {
        "id": mid,
        "client_id": client_id,
        "project_id": payload.project_id,
        "sender_name": payload.sender_name,
        "sender_role": "CLIENT",
        "body": payload.body,
        "created_at": now.isoformat(),
    }
