"""Pydantic models for support_tickets."""
from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

Priority = Literal["LOW", "MEDIUM", "HIGH", "URGENT"]
TicketStatus = Literal["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]


class TicketBase(BaseModel):
    number: Optional[str] = Field(default=None, max_length=50)
    title: str = Field(min_length=1, max_length=500)
    description: Optional[str] = None
    priority: Priority = "MEDIUM"
    status: TicketStatus = "OPEN"
    client_id: Optional[str] = Field(default=None, max_length=36)
    project_id: Optional[str] = Field(default=None, max_length=36)
    reporter_id: Optional[str] = Field(default=None, max_length=36)
    assignee_id: Optional[str] = Field(default=None, max_length=36)
    resolved_at: Optional[datetime] = None


class TicketCreate(TicketBase):
    pass


class TicketUpdate(BaseModel):
    number: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[Priority] = None
    status: Optional[TicketStatus] = None
    client_id: Optional[str] = None
    project_id: Optional[str] = None
    reporter_id: Optional[str] = None
    assignee_id: Optional[str] = None
    resolved_at: Optional[datetime] = None


class TicketOut(TicketBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    workspace_id: str
    created_at: datetime
    updated_at: datetime
