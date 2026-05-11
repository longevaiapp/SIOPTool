"""Pydantic models for action_items."""
from __future__ import annotations

from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

Priority = Literal["LOW", "MEDIUM", "HIGH", "URGENT"]


class ActionItemBase(BaseModel):
    meeting_id: Optional[str] = Field(default=None, max_length=36)
    text: str = Field(min_length=1, max_length=1000)
    assignee_id: Optional[str] = Field(default=None, max_length=36)
    assignee_name: Optional[str] = Field(default=None, max_length=255)
    due_date: Optional[date] = None
    priority: Priority = "MEDIUM"
    module_target: Optional[str] = Field(default=None, max_length=50)
    accepted: bool = False


class ActionItemCreate(ActionItemBase):
    pass


class ActionItemUpdate(BaseModel):
    meeting_id: Optional[str] = None
    text: Optional[str] = None
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None
    due_date: Optional[date] = None
    priority: Optional[Priority] = None
    module_target: Optional[str] = None
    accepted: Optional[bool] = None


class ActionItemOut(ActionItemBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    workspace_id: str
    created_at: datetime
    updated_at: datetime
