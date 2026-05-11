"""Approvals router — CRUD plus approve/reject decision endpoints."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from lib.auth import Principal, get_current_principal
from lib.db import get_db
from lib.router_factory import make_router
from models.approval import ApprovalCreate, ApprovalOut, ApprovalUpdate
from services.approval_service import resource

router: APIRouter = make_router(
    prefix="/api/approvals",
    tag="approvals",
    resource=resource,
    create_model=ApprovalCreate,
    update_model=ApprovalUpdate,
    out_model=ApprovalOut,
)


class DecisionBody(BaseModel):
    note: Optional[str] = None
    approver_id: Optional[str] = None


def _set_decision(
    db: Session,
    *,
    workspace_id: str,
    user_id: str,
    approval_id: str,
    decision: str,
    note: Optional[str],
    approver_id: Optional[str],
) -> dict:
    current = resource.get(db, workspace_id, approval_id)
    if current.get("status") != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Approval already {str(current.get('status', '')).lower()}",
        )
    data: dict = {
        "status": decision,
        "decided_at": datetime.utcnow(),
        "decision_note": note,
    }
    if approver_id:
        data["approver_id"] = approver_id
    elif user_id:
        data["approver_id"] = user_id
    return resource.update(
        db,
        workspace_id=workspace_id,
        user_id=user_id,
        record_id=approval_id,
        data=data,
    )


@router.post("/{approval_id}/approve", response_model=ApprovalOut)
def approve(
    approval_id: str,
    body: DecisionBody = DecisionBody(),
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    return _set_decision(
        db,
        workspace_id=principal.workspace_id,
        user_id=principal.user_id,
        approval_id=approval_id,
        decision="APPROVED",
        note=body.note,
        approver_id=body.approver_id,
    )


@router.post("/{approval_id}/reject", response_model=ApprovalOut)
def reject(
    approval_id: str,
    body: DecisionBody = DecisionBody(),
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    return _set_decision(
        db,
        workspace_id=principal.workspace_id,
        user_id=principal.user_id,
        approval_id=approval_id,
        decision="REJECTED",
        note=body.note,
        approver_id=body.approver_id,
    )
