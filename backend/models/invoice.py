"""Pydantic models for invoices."""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

InvoiceStatus = Literal["DRAFT", "SENT", "PAID", "OVERDUE", "VOID"]


class InvoiceBase(BaseModel):
    number: Optional[str] = Field(default=None, max_length=50)
    client_id: str = Field(min_length=1, max_length=36)
    project_id: Optional[str] = Field(default=None, max_length=36)
    contract_id: Optional[str] = Field(default=None, max_length=36)
    amount: Decimal = Decimal("0")
    currency: str = Field(default="USD", max_length=8)
    status: InvoiceStatus = "DRAFT"
    issue_date: Optional[date] = None
    due_date: Optional[date] = None
    paid_date: Optional[date] = None
    notes: Optional[str] = None


class InvoiceCreate(InvoiceBase):
    pass


class InvoiceUpdate(BaseModel):
    number: Optional[str] = None
    client_id: Optional[str] = None
    project_id: Optional[str] = None
    contract_id: Optional[str] = None
    amount: Optional[Decimal] = None
    currency: Optional[str] = None
    status: Optional[InvoiceStatus] = None
    issue_date: Optional[date] = None
    due_date: Optional[date] = None
    paid_date: Optional[date] = None
    notes: Optional[str] = None


class InvoiceOut(InvoiceBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    workspace_id: str
    folio: Optional[str] = None
    created_at: datetime
    updated_at: datetime
