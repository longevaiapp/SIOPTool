"""Pydantic models for siop_scenarios (M09)."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class ScenarioBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    horizon_weeks: int = 12
    assumptions: Optional[dict[str, Any]] = None
    results: Optional[dict[str, Any]] = None
    is_baseline: bool = False
    created_by: Optional[str] = Field(default=None, max_length=36)


class ScenarioCreate(ScenarioBase):
    pass


class ScenarioUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    horizon_weeks: Optional[int] = None
    assumptions: Optional[dict[str, Any]] = None
    results: Optional[dict[str, Any]] = None
    is_baseline: Optional[bool] = None
    created_by: Optional[str] = None


class ScenarioOut(ScenarioBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    workspace_id: str
    created_at: datetime
    updated_at: datetime
