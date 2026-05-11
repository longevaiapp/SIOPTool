"""Pydantic models for the universal documents repository."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

DocumentKind = Literal[
    "minute", "quote", "proposal", "sow", "contract",
    "kickoff", "sprint_report", "sprint_plan", "sprint_retro",
    "status_weekly", "qbr", "postmortem", "change_order",
    "invoice", "nda", "msa", "uat_report", "discovery_report",
    "pmo_review", "risk_register", "renewal_proposal",
    "compliance_audit", "supplier_evaluation", "case_study",
    "health_card", "bug_report", "acceptance", "onepager",
    "tech_brief", "wbs_estimate", "capacity_plan", "timesheet",
    "po", "supplier_quote", "statement", "onboarding_pack",
    "internal_kickoff", "daily_standup", "baa", "siop_weekly",
]
DocumentStatus = Literal["draft", "sent", "signed", "accepted", "rejected", "void"]


class DocumentBase(BaseModel):
    kind: DocumentKind
    title: str = Field(min_length=1, max_length=255)
    source_table: Optional[str] = Field(default=None, max_length=64)
    source_id: Optional[str] = Field(default=None, max_length=36)
    client_id: Optional[str] = Field(default=None, max_length=36)
    project_id: Optional[str] = Field(default=None, max_length=36)
    deal_id: Optional[str] = Field(default=None, max_length=36)
    version: int = 1
    status: DocumentStatus = "draft"
    storage_path: Optional[str] = Field(default=None, max_length=500)
    pdf_size_bytes: Optional[int] = None
    metadata_json: Optional[dict[str, Any]] = None


class DocumentCreate(DocumentBase):
    folio: Optional[str] = None  # auto-generated if omitted


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[DocumentStatus] = None
    storage_path: Optional[str] = None
    pdf_size_bytes: Optional[int] = None
    metadata_json: Optional[dict[str, Any]] = None
    sent_at: Optional[datetime] = None
    signed_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    voided_at: Optional[datetime] = None


class DocumentOut(DocumentBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    workspace_id: str
    folio: str
    generated_by: Optional[str] = None
    sent_at: Optional[datetime] = None
    signed_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    voided_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
