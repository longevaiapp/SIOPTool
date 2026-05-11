"""Atomic folio sequence helper.

Generates folios like ``PRO-2026-0001`` per (workspace_id, kind, year)
using a single-row counter table so concurrent inserts never collide.

Usage in a service:

    from lib.folio import next_folio
    folio = next_folio(db, workspace_id, kind="proposal")  # commits internally? NO

The helper executes the increment inside the active SQLAlchemy session
but does NOT commit; callers commit as part of their normal flow.
"""
from __future__ import annotations

from datetime import datetime
from sqlalchemy import text
from sqlalchemy.orm import Session


# Short prefix per document kind. Falls back to UPPER(kind[:3]).
_PREFIXES: dict[str, str] = {
    "minute": "MIN",
    "quote": "QUO",
    "proposal": "PRO",
    "sow": "SOW",
    "contract": "CON",
    "kickoff": "KIK",
    "sprint_report": "SPR",
    "sprint_plan": "SPL",
    "sprint_retro": "RET",
    "status_weekly": "STW",
    "qbr": "QBR",
    "postmortem": "PMT",
    "change_order": "CO",
    "invoice": "INV",
    "nda": "NDA",
    "msa": "MSA",
    "uat_report": "UAT",
    "discovery_report": "DIS",
    "pmo_review": "PMO",
    "risk_register": "RSK",
    "renewal_proposal": "RNW",
    "compliance_audit": "AUD",
    "supplier_evaluation": "SUP",
    "case_study": "CST",
    "health_card": "HLT",
    "bug_report": "BUG",
    "acceptance": "ACC",
    "onepager": "ONE",
    "tech_brief": "TBR",
    "wbs_estimate": "WBS",
    "capacity_plan": "CAP",
    "timesheet": "TMS",
    "po": "PO",
    "supplier_quote": "SQU",
    "statement": "STM",
    "onboarding_pack": "ONB",
    "internal_kickoff": "IKO",
    "daily_standup": "DST",
    "baa": "BAA",
    "siop_weekly": "SIO",
}


def prefix_for(kind: str) -> str:
    return _PREFIXES.get(kind, kind[:3].upper())


def next_folio(
    db: Session,
    workspace_id: str,
    kind: str,
    *,
    year: int | None = None,
) -> str:
    """Atomically reserve the next folio for (workspace, kind, year).

    Uses ``INSERT ... ON DUPLICATE KEY UPDATE`` so it works even when
    no row exists yet for the (workspace, kind, year) tuple.
    """
    yr = year or datetime.utcnow().year

    db.execute(
        text(
            "INSERT INTO document_sequences (workspace_id, kind, year, last_number) "
            "VALUES (:ws, :kind, :yr, 1) "
            "ON DUPLICATE KEY UPDATE last_number = last_number + 1"
        ),
        {"ws": workspace_id, "kind": kind, "yr": yr},
    )
    row = db.execute(
        text(
            "SELECT last_number FROM document_sequences "
            "WHERE workspace_id = :ws AND kind = :kind AND year = :yr"
        ),
        {"ws": workspace_id, "kind": kind, "yr": yr},
    ).fetchone()
    number = int(row[0]) if row else 1
    return f"{prefix_for(kind)}-{yr}-{number:04d}"
