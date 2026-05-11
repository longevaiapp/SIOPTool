"""Pydantic models for commercial proposals."""
from __future__ import annotations

from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

ProposalStatus = Literal["draft", "sent", "accepted", "rejected", "withdrawn", "expired"]
CommercialModel = Literal["FIXED_PRICE", "TM", "RETAINER", "VALUE_BASED"]


class ProposalBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    deal_id: Optional[str] = None
    client_id: Optional[str] = None
    rfq_session_id: Optional[str] = None
    quote_id: Optional[str] = None
    version: int = 1
    status: ProposalStatus = "draft"
    commercial_model: CommercialModel = "FIXED_PRICE"
    executive_summary: Optional[str] = None
    scope_md: Optional[str] = None
    approach_md: Optional[str] = None
    timeline_md: Optional[str] = None
    team_md: Optional[str] = None
    assumptions_md: Optional[str] = None
    terms_md: Optional[str] = None
    valid_until: Optional[date] = None


class ProposalCreate(ProposalBase):
    folio: Optional[str] = None


class ProposalUpdate(BaseModel):
    title: Optional[str] = None
    deal_id: Optional[str] = None
    client_id: Optional[str] = None
    rfq_session_id: Optional[str] = None
    quote_id: Optional[str] = None
    version: Optional[int] = None
    status: Optional[ProposalStatus] = None
    commercial_model: Optional[CommercialModel] = None
    executive_summary: Optional[str] = None
    scope_md: Optional[str] = None
    approach_md: Optional[str] = None
    timeline_md: Optional[str] = None
    team_md: Optional[str] = None
    assumptions_md: Optional[str] = None
    terms_md: Optional[str] = None
    valid_until: Optional[date] = None
    sent_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None


class ProposalOut(ProposalBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    workspace_id: str
    folio: str
    sent_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
