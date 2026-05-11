"""Pydantic models for tasks (M04 PM)."""
from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

TaskType = Literal["FEATURE", "INTEGRATION", "COMPLIANCE", "SECURITY", "CLINICAL"]


class TaskBase(BaseModel):
    project_id: str = Field(min_length=1, max_length=36)
    sprint_id: Optional[str] = Field(default=None, max_length=36)
    title: str = Field(min_length=1, max_length=500)
    description: Optional[str] = None
    status: str = Field(default="backlog", max_length=50)
    task_type: TaskType = "FEATURE"
    assignee_id: Optional[str] = Field(default=None, max_length=36)
    story_points: Optional[int] = None
    wip_column: Optional[str] = Field(default=None, max_length=50)
    is_clinical_safety: bool = False
    clinical_lead_approval: bool = False


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    project_id: Optional[str] = None
    sprint_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    task_type: Optional[TaskType] = None
    assignee_id: Optional[str] = None
    story_points: Optional[int] = None
    wip_column: Optional[str] = None
    is_clinical_safety: Optional[bool] = None
    clinical_lead_approval: Optional[bool] = None


class TaskOut(TaskBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    workspace_id: str
    created_at: datetime
    updated_at: datetime
