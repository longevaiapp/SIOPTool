"""Pydantic models for programs (M05 PMO)."""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

StrategicPriority = Literal["P0", "P1", "P2"]
ProgramStatus = Literal["ON_TRACK", "AT_RISK", "DELAYED"]
RiskLevel = Literal["LOW", "MEDIUM", "HIGH"]


class ProgramBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    lead_id: Optional[str] = Field(default=None, max_length=36)
    strategic_priority: StrategicPriority = "P1"
    status: ProgramStatus = "ON_TRACK"
    risk: RiskLevel = "LOW"
    progress: int = 0
    portfolio_value: Decimal = Decimal("0")


class ProgramCreate(ProgramBase):
    pass


class ProgramUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    lead_id: Optional[str] = None
    strategic_priority: Optional[StrategicPriority] = None
    status: Optional[ProgramStatus] = None
    risk: Optional[RiskLevel] = None
    progress: Optional[int] = None
    portfolio_value: Optional[Decimal] = None


class ProgramOut(ProgramBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    workspace_id: str
    created_at: datetime
    updated_at: datetime


class ProgramProjectLink(BaseModel):
    program_id: str
    project_id: str


class ProgramProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    program_id: str
    project_id: str
    workspace_id: str
    created_at: datetime
