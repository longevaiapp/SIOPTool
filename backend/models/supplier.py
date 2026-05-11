"""Pydantic models for suppliers (M08)."""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

SupplierCategory = Literal[
    "INFRASTRUCTURE", "ML_OPS", "CONSULTING", "DATA", "SECURITY", "OTHER"
]
SupplierStatus = Literal["ACTIVE", "INACTIVE", "PENDING", "BLOCKED"]
RiskLevel = Literal["LOW", "MEDIUM", "HIGH"]


class SupplierBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    category: SupplierCategory = "OTHER"
    status: SupplierStatus = "ACTIVE"
    contact_name: Optional[str] = Field(default=None, max_length=255)
    contact_email: Optional[str] = Field(default=None, max_length=255)
    spend_ytd: Optional[Decimal] = 0
    contract_value: Optional[Decimal] = 0
    performance_score: Optional[int] = None
    risk_level: RiskLevel = "LOW"
    compliance_certs: Optional[list[Any]] = None
    notes: Optional[str] = None


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[SupplierCategory] = None
    status: Optional[SupplierStatus] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    spend_ytd: Optional[Decimal] = None
    contract_value: Optional[Decimal] = None
    performance_score: Optional[int] = None
    risk_level: Optional[RiskLevel] = None
    compliance_certs: Optional[list[Any]] = None
    notes: Optional[str] = None


class SupplierOut(SupplierBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    workspace_id: str
    created_at: datetime
    updated_at: datetime
