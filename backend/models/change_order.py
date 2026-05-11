"""Pydantic models for change orders (CR / change requests)."""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

ChangeOrderStatus = Literal["proposed", "approved", "rejected", "applied", "void"]


class ChangeOrderBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    project_id: Optional[str] = None
    contract_id: Optional[str] = None
    client_id: Optional[str] = None
    meeting_id: Optional[str] = None
    reason: Optional[str] = None
    description: Optional[str] = None
    status: ChangeOrderStatus = "proposed"
    scope_impact: Optional[str] = None
    timeline_impact_days: Optional[int] = None
    budget_impact: Optional[Decimal] = None
    currency: Optional[str] = "MXN"
    requested_by: Optional[str] = None


class ChangeOrderCreate(ChangeOrderBase):
    folio: Optional[str] = None


class ChangeOrderUpdate(BaseModel):
    title: Optional[str] = None
    project_id: Optional[str] = None
    contract_id: Optional[str] = None
    client_id: Optional[str] = None
    meeting_id: Optional[str] = None
    reason: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ChangeOrderStatus] = None
    scope_impact: Optional[str] = None
    timeline_impact_days: Optional[int] = None
    budget_impact: Optional[Decimal] = None
    currency: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    applied_at: Optional[datetime] = None


class ChangeOrderOut(ChangeOrderBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    workspace_id: str
    folio: str
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    applied_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
