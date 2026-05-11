"""Pydantic models for deals (M01 CRM)."""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

CommercialModel = Literal["FIXED_PRICE", "TM", "RETAINER", "VALUE_BASED"]


class DealBase(BaseModel):
    client_id: Optional[str] = Field(default=None, max_length=36)
    client_name: str = Field(min_length=1, max_length=255)
    deal_type: Optional[str] = Field(default=None, max_length=100)
    stage: str = Field(default="prospect", max_length=100)
    value: Optional[Decimal] = None
    probability: Optional[Decimal] = Field(default=None, ge=0, le=100)
    owner_id: Optional[str] = Field(default=None, max_length=36)
    ai_score: Optional[int] = Field(default=None, ge=0, le=100)
    expected_close: Optional[date] = None
    next_action: Optional[str] = Field(default=None, max_length=500)
    notes: Optional[str] = None
    commercial_model: CommercialModel = "FIXED_PRICE"
    last_activity_at: Optional[datetime] = None
    anomaly_flag: bool = False


class DealCreate(DealBase):
    pass


class DealUpdate(BaseModel):
    client_id: Optional[str] = None
    client_name: Optional[str] = None
    deal_type: Optional[str] = None
    stage: Optional[str] = None
    value: Optional[Decimal] = None
    probability: Optional[Decimal] = None
    owner_id: Optional[str] = None
    ai_score: Optional[int] = None
    expected_close: Optional[date] = None
    next_action: Optional[str] = None
    notes: Optional[str] = None
    commercial_model: Optional[CommercialModel] = None
    last_activity_at: Optional[datetime] = None
    anomaly_flag: Optional[bool] = None


class DealOut(DealBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    workspace_id: str
    created_at: datetime
    updated_at: datetime
