"""Pydantic models for messages (client portal threads)."""
from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

SenderRole = Literal["INTERNAL", "CLIENT", "SYSTEM"]


class MessageBase(BaseModel):
    project_id: Optional[str] = Field(default=None, max_length=36)
    client_id: Optional[str] = Field(default=None, max_length=36)
    sender_id: Optional[str] = Field(default=None, max_length=36)
    sender_name: str = Field(min_length=1, max_length=255)
    sender_role: SenderRole = "INTERNAL"
    body: str = Field(min_length=1)
    read_at: Optional[datetime] = None


class MessageCreate(MessageBase):
    pass


class MessageUpdate(BaseModel):
    project_id: Optional[str] = None
    client_id: Optional[str] = None
    sender_id: Optional[str] = None
    sender_name: Optional[str] = None
    sender_role: Optional[SenderRole] = None
    body: Optional[str] = None
    read_at: Optional[datetime] = None


class MessageOut(MessageBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    workspace_id: str
    created_at: datetime
    updated_at: datetime
