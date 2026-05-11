"""Pydantic models for time_entries (Day 18 Timesheet)."""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class TimeEntryBase(BaseModel):
    user_id: Optional[str] = Field(default=None, max_length=36)
    user_name: Optional[str] = Field(default=None, max_length=255)
    role: str = Field(min_length=1, max_length=100)
    project_id: Optional[str] = Field(default=None, max_length=36)
    week_start: date
    hours: Decimal = Decimal("0")
    notes: Optional[str] = None


class TimeEntryCreate(TimeEntryBase):
    pass


class TimeEntryUpdate(BaseModel):
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    role: Optional[str] = None
    project_id: Optional[str] = None
    week_start: Optional[date] = None
    hours: Optional[Decimal] = None
    notes: Optional[str] = None


class TimeEntryOut(TimeEntryBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    workspace_id: str
    created_at: datetime
    updated_at: datetime
