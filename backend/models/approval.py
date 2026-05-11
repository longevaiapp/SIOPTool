"""Pydantic models for approvals."""
from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

ApprovalType = Literal["DELIVERABLE", "MILESTONE", "SCOPE_CHANGE", "PAYMENT", "OTHER"]
ApprovalStatus = Literal["PENDING", "APPROVED", "REJECTED"]


class ApprovalBase(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    description: Optional[str] = None
    approval_type: ApprovalType = "DELIVERABLE"
    client_id: Optional[str] = Field(default=None, max_length=36)
    project_id: Optional[str] = Field(default=None, max_length=36)
    requested_by: Optional[str] = Field(default=None, max_length=36)
    approver_id: Optional[str] = Field(default=None, max_length=36)
    status: ApprovalStatus = "PENDING"
    decided_at: Optional[datetime] = None
    decision_note: Optional[str] = None


class ApprovalCreate(ApprovalBase):
    pass


class ApprovalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    approval_type: Optional[ApprovalType] = None
    client_id: Optional[str] = None
    project_id: Optional[str] = None
    requested_by: Optional[str] = None
    approver_id: Optional[str] = None
    status: Optional[ApprovalStatus] = None
    decided_at: Optional[datetime] = None
    decision_note: Optional[str] = None


class ApprovalOut(ApprovalBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    workspace_id: str
    created_at: datetime
    updated_at: datetime
