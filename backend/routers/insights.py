"""Insights router — CRUD + apply/dismiss decision endpoints.

Project rule: AI recommends only — no AI output auto-mutates critical
records. The `apply` endpoint therefore creates a PENDING Approval that
a human must approve before any downstream mutation happens.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from lib.auth import Principal, get_current_principal
from lib.db import get_db
from lib.router_factory import make_router
from models.insight import InsightCreate, InsightOut, InsightUpdate
from services.insight_service import resource
from services.approval_service import resource as approvals_resource

router: APIRouter = make_router(
    prefix="/api/insights",
    tag="insights",
    resource=resource,
    create_model=InsightCreate,
    update_model=InsightUpdate,
    out_model=InsightOut,
)


class ApplyBody(BaseModel):
    note: Optional[str] = None
    project_id: Optional[str] = None
    client_id: Optional[str] = None


class ApplyResponse(BaseModel):
    insight: InsightOut
    approval_id: str


class DismissBody(BaseModel):
    reason: Optional[str] = None


_TYPE_MAP = {
    "scope": "SCOPE_CHANGE",
    "scope_change": "SCOPE_CHANGE",
    "milestone": "MILESTONE",
    "deliverable": "DELIVERABLE",
    "payment": "PAYMENT",
    "invoice": "PAYMENT",
}


def _approval_type_for(insight: dict) -> str:
    itype = (insight.get("insight_type") or "").lower()
    for key, val in _TYPE_MAP.items():
        if key in itype:
            return val
    if (insight.get("related_entity_type") or "").lower() == "project":
        return "DELIVERABLE"
    return "OTHER"


@router.post("/{insight_id}/apply", response_model=ApplyResponse)
def apply_insight(
    insight_id: str,
    body: ApplyBody = ApplyBody(),
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    insight = resource.get(db, principal.workspace_id, insight_id)
    if insight.get("acknowledged"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Insight already acted on",
        )

    related_type = (insight.get("related_entity_type") or "").lower()
    project_id = body.project_id or (insight.get("related_entity_id") if related_type == "project" else None)
    client_id = body.client_id or (insight.get("related_entity_id") if related_type == "client" else None)

    title = f"AI: {insight.get('title') or 'recommendation'}"
    description_parts = [
        insight.get("description") or "",
        f"Module: {insight.get('module')}",
        f"Severity: {insight.get('severity')}",
        f"Source insight: {insight_id}",
    ]
    if body.note:
        description_parts.append(f"Operator note: {body.note}")
    description = "\n".join([p for p in description_parts if p])

    approval = approvals_resource.create(
        db,
        workspace_id=principal.workspace_id,
        user_id=principal.user_id,
        data={
            "title": title[:500],
            "description": description,
            "approval_type": _approval_type_for(insight),
            "project_id": project_id,
            "client_id": client_id,
            "requested_by": principal.user_id,
            "status": "PENDING",
        },
    )

    updated = resource.update(
        db,
        workspace_id=principal.workspace_id,
        user_id=principal.user_id,
        record_id=insight_id,
        data={
            "acknowledged": True,
            "acknowledged_at": datetime.utcnow(),
            "payload": {
                **(insight.get("payload") or {}),
                "applied_at": datetime.utcnow().isoformat(),
                "approval_id": approval["id"],
                "applied_by": principal.user_id,
            },
        },
    )
    return {"insight": updated, "approval_id": approval["id"]}


@router.post("/{insight_id}/dismiss", response_model=InsightOut)
def dismiss_insight(
    insight_id: str,
    body: DismissBody = DismissBody(),
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    insight = resource.get(db, principal.workspace_id, insight_id)
    if insight.get("acknowledged"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Insight already acted on",
        )
    return resource.update(
        db,
        workspace_id=principal.workspace_id,
        user_id=principal.user_id,
        record_id=insight_id,
        data={
            "acknowledged": True,
            "acknowledged_at": datetime.utcnow(),
            "payload": {
                **(insight.get("payload") or {}),
                "dismissed_at": datetime.utcnow().isoformat(),
                "dismissed_by": principal.user_id,
                "dismiss_reason": body.reason,
            },
        },
    )
