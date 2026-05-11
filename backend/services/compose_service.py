"""Compose / classify service.

Given a free-form text snippet (or transcript chunk), pick the most likely
meeting_type from the registered analyzers and try to find any existing
client / deal / project that the text refers to.

This powers the global "Compose" omnibox: the user dictates / pastes /
records, and we route the snippet to the right analyzer + pre-fill links.
"""
from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field
from sqlalchemy import text

from lib.db import SessionLocal
from lib.openai_client import call_openai
from services.analyzer_service import ANALYZERS


# ── Output schema ─────────────────────────────────────────────────────────
class ClassifySuggestion(BaseModel):
    meeting_type: str = Field(
        description="One of the registered analyzer keys, or 'status_update'."
    )
    confidence: Literal["low", "medium", "high"] = "medium"
    rationale: str = Field(
        default="", description="One short sentence explaining the choice."
    )
    title_suggestion: Optional[str] = None
    client_hint: Optional[str] = Field(
        default=None,
        description="Client / company name mentioned in the text, if any.",
    )
    deal_hint: Optional[str] = Field(
        default=None,
        description="Deal title / opportunity mentioned in the text, if any.",
    )
    project_hint: Optional[str] = Field(
        default=None,
        description="Project name mentioned in the text, if any.",
    )


class ClassifyResult(BaseModel):
    suggestion: ClassifySuggestion
    matched_client_id: Optional[str] = None
    matched_deal_id: Optional[str] = None
    matched_project_id: Optional[str] = None
    matched_client_name: Optional[str] = None
    matched_deal_title: Optional[str] = None
    matched_project_name: Optional[str] = None
    available_types: list[str]


# ── Prompt builder ────────────────────────────────────────────────────────
def _classifier_prompt(snippet: str, type_catalog: list[tuple[str, str]]) -> str:
    catalog_block = "\n".join(f"- {key}: {desc}" for key, desc in type_catalog)
    snippet_clip = snippet[:2400]
    return (
        "You are the meeting-type classifier for the SIOP healthtech delivery "
        "platform. Given a short snippet of speech-to-text or pasted notes, "
        "pick the SINGLE best meeting_type from the catalog below.\n\n"
        f"## Catalog\n{catalog_block}\n\n"
        "## Rules\n"
        "1. Always return a meeting_type that is in the catalog. If unsure, "
        "use 'status_update'.\n"
        "2. Set confidence='high' only when the snippet clearly fits one type.\n"
        "3. Extract client / deal / project NAMES if explicitly mentioned. "
        "Do NOT invent. Leave null if not present.\n"
        "4. title_suggestion: 6-10 words summarising the meeting.\n\n"
        "## Snippet\n"
        f"```\n{snippet_clip}\n```\n\n"
        "Respond ONLY with a JSON object matching this schema:\n"
        "{\n"
        '  "meeting_type": str,\n'
        '  "confidence": "low"|"medium"|"high",\n'
        '  "rationale": str,\n'
        '  "title_suggestion": str|null,\n'
        '  "client_hint": str|null,\n'
        '  "deal_hint": str|null,\n'
        '  "project_hint": str|null\n'
        "}"
    )


# Short human descriptions for each registered analyzer key.
# Keep these concise — they are the catalog the model picks from.
_TYPE_DESCRIPTIONS: dict[str, str] = {
    "status_update":            "generic project status update",
    "lead_qualification":       "early sales call qualifying a new lead",
    "discovery_rfq":            "discovery / scoping call with a prospective client",
    "sales_followup":           "follow-up sales call to advance a deal",
    "project_kickoff":          "kickoff meeting starting a new project",
    "sprint_review":            "end-of-sprint review and demo",
    "client_qbr":               "quarterly business review with a client",
    "siop_weekly":              "executive SIOP portfolio review",
    "pmo_review":               "PMO review across multiple projects",
    "compliance_audit":         "compliance / regulatory audit session",
    "supplier_negotiation":     "negotiation call with a supplier or vendor",
    "daily_standup":            "team daily standup",
    "sprint_planning":          "sprint planning / backlog commitment",
    "client_weekly_status":     "weekly status update with a client",
    "internal_kickoff":         "internal team kickoff before a project",
    "sprint_retro":             "sprint retrospective",
    "uat_session":              "user acceptance testing session",
    "incident_postmortem":      "incident or outage post-mortem",
    "change_request":           "change order / scope change discussion",
    "proposal_review":          "review of a commercial proposal",
    "contract_review":          "contract / legal review",
    "cs_checkin":               "customer success check-in",
    "supplier_review":          "supplier performance review",
    "one_on_one":               "manager one-on-one with a team member",
    "backlog_refinement":       "backlog refinement / story estimation",
    "architecture_review":      "architecture decision record review",
    "bug_triage":               "QA bug triage session",
    "steering_committee":       "steering committee / stage-gate decision",
    "capacity_planning":        "capacity / staffing planning",
    "onboarding_call":          "client onboarding kickoff",
    "renewal_call":             "renewal discussion with a client",
    "win_loss_review":          "deal win/loss retrospective",
    "hiring_panel":             "hiring panel / candidate debrief",
    "performance_review":       "employee performance review",
}


# ── Entity matching ───────────────────────────────────────────────────────
def _find_client(db, workspace_id: str, hint: str) -> tuple[str | None, str | None]:
    if not hint:
        return None, None
    row = db.execute(
        text(
            "SELECT id, name FROM clients "
            "WHERE workspace_id = :ws AND is_deleted = FALSE "
            "  AND LOWER(name) LIKE :pat "
            "ORDER BY updated_at DESC LIMIT 1"
        ),
        {"ws": workspace_id, "pat": f"%{hint.lower().strip()}%"},
    ).first()
    return (row[0], row[1]) if row else (None, None)


def _find_deal(
    db, workspace_id: str, hint: str, client_name: str | None,
) -> tuple[str | None, str | None]:
    """Find a deal by free-form hint.

    The `deals` table is denormalized with `client_name` (no client_id FK), and
    has no `title` column — the closest thing to a title is the client_name +
    deal_type combo.  We match on either the hint or the linked client_name.
    """
    if not hint and not client_name:
        return None, None
    params: dict[str, str] = {"ws": workspace_id}
    where = ["workspace_id = :ws", "is_deleted = FALSE"]
    if hint:
        params["pat"] = f"%{hint.lower().strip()}%"
        where.append("(LOWER(client_name) LIKE :pat OR LOWER(COALESCE(deal_type,'')) LIKE :pat)")
    elif client_name:
        params["cn"] = f"%{client_name.lower().strip()}%"
        where.append("LOWER(client_name) LIKE :cn")
    sql = (
        "SELECT id, client_name, deal_type FROM deals "
        f"WHERE {' AND '.join(where)} "
        "ORDER BY updated_at DESC LIMIT 1"
    )
    row = db.execute(text(sql), params).first()
    if not row:
        return None, None
    label = row[1] if not row[2] else f"{row[1]} — {row[2]}"
    return (row[0], label)


def _find_project(
    db, workspace_id: str, hint: str, client_name: str | None,
) -> tuple[str | None, str | None]:
    """Find a project by free-form hint.

    The `projects` table is denormalized with `client_name` (no client_id FK).
    """
    if not hint and not client_name:
        return None, None
    params: dict[str, str] = {"ws": workspace_id}
    where = ["workspace_id = :ws", "is_deleted = FALSE"]
    if hint:
        params["pat"] = f"%{hint.lower().strip()}%"
        where.append("(LOWER(name) LIKE :pat OR LOWER(client_name) LIKE :pat)")
    elif client_name:
        params["cn"] = f"%{client_name.lower().strip()}%"
        where.append("LOWER(client_name) LIKE :cn")
    sql = (
        "SELECT id, name FROM projects "
        f"WHERE {' AND '.join(where)} "
        "ORDER BY updated_at DESC LIMIT 1"
    )
    row = db.execute(text(sql), params).first()
    return (row[0], row[1]) if row else (None, None)


# ── Public entrypoint ─────────────────────────────────────────────────────
def classify_snippet(
    *,
    workspace_id: str,
    snippet: str,
) -> dict[str, Any]:
    if not snippet or not snippet.strip():
        raise ValueError("snippet must not be empty")

    # 1. Build catalog from actually-registered analyzers
    catalog = [
        (key, _TYPE_DESCRIPTIONS.get(key, key.replace("_", " ")))
        for key in ANALYZERS.keys()
    ]

    # 2. Ask the model
    suggestion = call_openai(
        _classifier_prompt(snippet, catalog),
        ClassifySuggestion,
        model="gpt-4o-mini",   # cheap classifier
        temperature=0.0,
    )

    # 3. Defensive: clamp to known analyzer keys
    if suggestion.meeting_type not in ANALYZERS:
        suggestion = suggestion.model_copy(update={
            "meeting_type": "status_update",
            "confidence": "low",
        })

    # 4. Try to resolve hints to real DB rows
    matched_client_id = matched_client_name = None
    matched_deal_id = matched_deal_title = None
    matched_project_id = matched_project_name = None
    with SessionLocal() as db:
        if suggestion.client_hint:
            matched_client_id, matched_client_name = _find_client(
                db, workspace_id, suggestion.client_hint,
            )
        if suggestion.deal_hint or matched_client_name:
            matched_deal_id, matched_deal_title = _find_deal(
                db, workspace_id, suggestion.deal_hint or "", matched_client_name,
            )
        if suggestion.project_hint or matched_client_name:
            matched_project_id, matched_project_name = _find_project(
                db, workspace_id, suggestion.project_hint or "", matched_client_name,
            )

    return ClassifyResult(
        suggestion=suggestion,
        matched_client_id=matched_client_id,
        matched_client_name=matched_client_name,
        matched_deal_id=matched_deal_id,
        matched_deal_title=matched_deal_title,
        matched_project_id=matched_project_id,
        matched_project_name=matched_project_name,
        available_types=list(ANALYZERS.keys()),
    ).model_dump()
