"""Pydantic models for quotes (cotizaciones)."""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

QuoteStatus = Literal["draft", "sent", "accepted", "rejected", "expired", "void"]


class QuoteItemBase(BaseModel):
    position: int = 1
    description: str = Field(min_length=1, max_length=500)
    qty: Decimal = Decimal("1")
    unit: Optional[str] = "unit"
    unit_price: Decimal = Decimal("0")
    amount: Decimal = Decimal("0")
    role_id: Optional[str] = None
    notes: Optional[str] = None


class QuoteItemCreate(QuoteItemBase):
    pass


class QuoteItemOut(QuoteItemBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    quote_id: str
    workspace_id: str
    created_at: datetime
    updated_at: datetime


class QuoteBase(BaseModel):
    deal_id: Optional[str] = None
    client_id: Optional[str] = None
    rfq_session_id: Optional[str] = None
    status: QuoteStatus = "draft"
    currency: str = Field(default="MXN", max_length=3)
    subtotal: Decimal = Decimal("0")
    tax_rate: Decimal = Decimal("16.00")
    tax: Decimal = Decimal("0")
    total: Decimal = Decimal("0")
    valid_until: Optional[date] = None
    terms: Optional[str] = None
    notes: Optional[str] = None


class QuoteCreate(QuoteBase):
    folio: Optional[str] = None
    items: Optional[list[QuoteItemCreate]] = None


class QuoteUpdate(BaseModel):
    deal_id: Optional[str] = None
    client_id: Optional[str] = None
    rfq_session_id: Optional[str] = None
    status: Optional[QuoteStatus] = None
    currency: Optional[str] = None
    subtotal: Optional[Decimal] = None
    tax_rate: Optional[Decimal] = None
    tax: Optional[Decimal] = None
    total: Optional[Decimal] = None
    valid_until: Optional[date] = None
    terms: Optional[str] = None
    notes: Optional[str] = None
    sent_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None


class QuoteOut(QuoteBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    workspace_id: str
    folio: str
    sent_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
