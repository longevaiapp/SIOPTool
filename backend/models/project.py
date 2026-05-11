"""Pydantic models for projects (M04 PM)."""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ProjectBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    client_name: str = Field(min_length=1, max_length=255)
    client_id: Optional[str] = Field(default=None, max_length=36)
    deal_id: Optional[str] = Field(default=None, max_length=36)
    contract_id: Optional[str] = Field(default=None, max_length=36)
    pm_id: Optional[str] = Field(default=None, max_length=36)
    status: str = Field(default="draft", max_length=50)
    phi_involved: bool = False
    baa_confirmed: bool = False
    methodology: Optional[str] = Field(default=None, max_length=50)
    health_score: Optional[Decimal] = None
    budget: Optional[Decimal] = None
    phase: Optional[str] = Field(default=None, max_length=100)


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    client_name: Optional[str] = None
    client_id: Optional[str] = None
    deal_id: Optional[str] = None
    contract_id: Optional[str] = None
    pm_id: Optional[str] = None
    status: Optional[str] = None
    phi_involved: Optional[bool] = None
    baa_confirmed: Optional[bool] = None
    methodology: Optional[str] = None
    health_score: Optional[Decimal] = None
    budget: Optional[Decimal] = None
    phase: Optional[str] = None


class ProjectOut(ProjectBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    workspace_id: str
    created_at: datetime
    updated_at: datetime
