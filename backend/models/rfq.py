"""Pydantic models for rfq_sessions (M02)."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class RfqBase(BaseModel):
    deal_id: Optional[str] = Field(default=None, max_length=36)
    client_id: Optional[str] = Field(default=None, max_length=36)
    responses: Optional[dict[str, Any]] = None
    completion_pct: int = 0
    status: str = Field(default="draft", max_length=50)


class RfqCreate(RfqBase):
    pass


class RfqUpdate(BaseModel):
    deal_id: Optional[str] = None
    client_id: Optional[str] = None
    responses: Optional[dict[str, Any]] = None
    completion_pct: Optional[int] = None
    status: Optional[str] = None


class RfqOut(RfqBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    workspace_id: str
    created_at: datetime
    updated_at: datetime
