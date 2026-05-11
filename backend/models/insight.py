"""Pydantic models for insights (AI recommendations)."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

Severity = Literal["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"]


class InsightBase(BaseModel):
    module: str = Field(min_length=1, max_length=50)
    insight_type: Optional[str] = Field(default=None, max_length=100)
    title: str = Field(min_length=1, max_length=500)
    description: Optional[str] = None
    severity: Severity = "INFO"
    related_entity_type: Optional[str] = Field(default=None, max_length=50)
    related_entity_id: Optional[str] = Field(default=None, max_length=36)
    payload: Optional[dict[str, Any]] = None
    acknowledged: bool = False
    acknowledged_at: Optional[datetime] = None


class InsightCreate(InsightBase):
    pass


class InsightUpdate(BaseModel):
    module: Optional[str] = None
    insight_type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[Severity] = None
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[str] = None
    payload: Optional[dict[str, Any]] = None
    acknowledged: Optional[bool] = None
    acknowledged_at: Optional[datetime] = None


class InsightOut(InsightBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    workspace_id: str
    created_at: datetime
    updated_at: datetime
