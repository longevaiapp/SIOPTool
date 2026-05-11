"""Pydantic models for the auth router."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)
    workspace_id: Optional[str] = Field(
        default=None,
        description="Optional. If omitted, the email must be unique across workspaces.",
    )


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    access_expires_at: datetime
    refresh_expires_at: datetime


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=10, max_length=512)


class MeResponse(BaseModel):
    user_id: str
    workspace_id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    last_login_at: Optional[datetime] = None
