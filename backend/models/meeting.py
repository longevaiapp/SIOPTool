"""Pydantic models for meetings."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

MeetingStatus = Literal[
    "SCHEDULED", "RECORDING", "PROCESSING", "ANALYZED", "FAILED", "COMPLETED"
]


class MeetingBase(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    meeting_type: str = Field(default="discovery_rfq", max_length=50)
    status: MeetingStatus = "SCHEDULED"
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    client_id: Optional[str] = Field(default=None, max_length=36)
    deal_id: Optional[str] = Field(default=None, max_length=36)
    project_id: Optional[str] = Field(default=None, max_length=36)
    participants: Optional[list[Any]] = None
    transcript: Optional[str] = None
    audio_url: Optional[str] = None
    notes: Optional[str] = None
    ai_outputs: Optional[dict[str, Any]] = None


class MeetingCreate(MeetingBase):
    pass


class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    meeting_type: Optional[str] = None
    status: Optional[MeetingStatus] = None
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    client_id: Optional[str] = None
    deal_id: Optional[str] = None
    project_id: Optional[str] = None
    participants: Optional[list[Any]] = None
    transcript: Optional[str] = None
    audio_url: Optional[str] = None
    notes: Optional[str] = None
    ai_outputs: Optional[dict[str, Any]] = None


class MeetingOut(MeetingBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    workspace_id: str
    created_at: datetime
    updated_at: datetime
