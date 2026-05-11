"""Pydantic models for contracts (M03)."""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

ContractType = Literal["MSA", "SOW", "BAA", "NDA", "AMENDMENT"]
ContractStatus = Literal["DRAFT", "REVIEW", "SIGNED", "EXPIRED", "TERMINATED"]


class ContractBase(BaseModel):
    contract_type: ContractType = "SOW"
    title: str = Field(min_length=1, max_length=500)
    client_id: str = Field(min_length=1, max_length=36)
    project_id: Optional[str] = Field(default=None, max_length=36)
    deal_id: Optional[str] = Field(default=None, max_length=36)
    status: ContractStatus = "DRAFT"
    value: Optional[Decimal] = 0
    signed_date: Optional[date] = None
    expiry_date: Optional[date] = None
    signers: Optional[list[Any]] = None
    compliance_controls: Optional[list[Any]] = None
    document_url: Optional[str] = None
    hipaa_required: bool = False
    baa_signed: bool = False
    notes: Optional[str] = None


class ContractCreate(ContractBase):
    pass


class ContractUpdate(BaseModel):
    contract_type: Optional[ContractType] = None
    title: Optional[str] = None
    client_id: Optional[str] = None
    project_id: Optional[str] = None
    deal_id: Optional[str] = None
    status: Optional[ContractStatus] = None
    value: Optional[Decimal] = None
    signed_date: Optional[date] = None
    expiry_date: Optional[date] = None
    signers: Optional[list[Any]] = None
    compliance_controls: Optional[list[Any]] = None
    document_url: Optional[str] = None
    hipaa_required: Optional[bool] = None
    baa_signed: Optional[bool] = None
    notes: Optional[str] = None


class ContractOut(ContractBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    workspace_id: str
    created_at: datetime
    updated_at: datetime
