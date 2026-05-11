"""Pydantic models for sprints (M04 PM)."""
from __future__ import annotations

from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

SprintStatus = Literal["PLANNED", "ACTIVE", "COMPLETED"]


class SprintBase(BaseModel):
    project_id: str = Field(min_length=1, max_length=36)
    name: str = Field(min_length=1, max_length=255)
    status: SprintStatus = "PLANNED"
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    story_points_planned: int = 0
    story_points_completed: int = 0


class SprintCreate(SprintBase):
    pass


class SprintUpdate(BaseModel):
    project_id: Optional[str] = None
    name: Optional[str] = None
    status: Optional[SprintStatus] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    story_points_planned: Optional[int] = None
    story_points_completed: Optional[int] = None


class SprintOut(SprintBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    workspace_id: str
    created_at: datetime
    updated_at: datetime
