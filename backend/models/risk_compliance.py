"""Pydantic models for risk_items + compliance_controls (M04/M03)."""
from __future__ import annotations

from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

ComplianceStatus = Literal["OK", "PARTIAL", "CRITICAL"]


class RiskBase(BaseModel):
    project_id: str = Field(min_length=1, max_length=36)
    title: str = Field(min_length=1, max_length=500)
    category: Optional[str] = Field(default=None, max_length=100)
    probability: Optional[int] = None
    impact: Optional[int] = None
    score: Optional[int] = None
    status: str = Field(default="open", max_length=50)
    response_strategy: Optional[str] = None
    owner_id: Optional[str] = Field(default=None, max_length=36)
    trend: Optional[str] = Field(default=None, max_length=20)


class RiskCreate(RiskBase):
    pass


class RiskUpdate(BaseModel):
    project_id: Optional[str] = None
    title: Optional[str] = None
    category: Optional[str] = None
    probability: Optional[int] = None
    impact: Optional[int] = None
    score: Optional[int] = None
    status: Optional[str] = None
    response_strategy: Optional[str] = None
    owner_id: Optional[str] = None
    trend: Optional[str] = None


class RiskOut(RiskBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    workspace_id: str
    created_at: datetime
    updated_at: datetime


class ComplianceBase(BaseModel):
    project_id: str = Field(min_length=1, max_length=36)
    framework: str = Field(min_length=1, max_length=100)
    control_name: str = Field(min_length=1, max_length=500)
    status: ComplianceStatus = "PARTIAL"
    score: Optional[int] = None
    evidence_url: Optional[str] = None
    deadline: Optional[date] = None
    owner_id: Optional[str] = Field(default=None, max_length=36)


class ComplianceCreate(ComplianceBase):
    pass


class ComplianceUpdate(BaseModel):
    project_id: Optional[str] = None
    framework: Optional[str] = None
    control_name: Optional[str] = None
    status: Optional[ComplianceStatus] = None
    score: Optional[int] = None
    evidence_url: Optional[str] = None
    deadline: Optional[date] = None
    owner_id: Optional[str] = None


class ComplianceOut(ComplianceBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    workspace_id: str
    created_at: datetime
    updated_at: datetime
