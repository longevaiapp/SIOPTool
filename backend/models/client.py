"""Pydantic models for the clients module."""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

ClientSegment = Literal["STRATEGIC", "GROWTH", "LONG_TAIL"]
ClientStatus = Literal["PROSPECT", "ACTIVE", "CHURNED", "DORMANT"]


class ClientBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    industry: Optional[str] = Field(default=None, max_length=100)
    segment: ClientSegment = "GROWTH"
    status: ClientStatus = "PROSPECT"
    health_score: Optional[int] = Field(default=None, ge=0, le=100)
    arr: Optional[Decimal] = None
    mrr: Optional[Decimal] = None
    contract_value: Optional[Decimal] = None
    csat: Optional[Decimal] = Field(default=None, ge=0, le=5)
    nps: Optional[int] = Field(default=None, ge=-100, le=100)
    primary_contact_name: Optional[str] = Field(default=None, max_length=255)
    primary_contact_email: Optional[str] = Field(default=None, max_length=255)
    primary_contact_role: Optional[str] = Field(default=None, max_length=100)
    account_manager_id: Optional[str] = Field(default=None, max_length=36)
    notes: Optional[str] = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    industry: Optional[str] = Field(default=None, max_length=100)
    segment: Optional[ClientSegment] = None
    status: Optional[ClientStatus] = None
    health_score: Optional[int] = Field(default=None, ge=0, le=100)
    arr: Optional[Decimal] = None
    mrr: Optional[Decimal] = None
    contract_value: Optional[Decimal] = None
    csat: Optional[Decimal] = Field(default=None, ge=0, le=5)
    nps: Optional[int] = Field(default=None, ge=-100, le=100)
    primary_contact_name: Optional[str] = Field(default=None, max_length=255)
    primary_contact_email: Optional[str] = Field(default=None, max_length=255)
    primary_contact_role: Optional[str] = Field(default=None, max_length=100)
    account_manager_id: Optional[str] = Field(default=None, max_length=36)
    notes: Optional[str] = None


class ClientOut(ClientBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    created_at: datetime
    updated_at: datetime
