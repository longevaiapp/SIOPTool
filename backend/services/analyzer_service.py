"""Analyzer service — meeting transcription -> structured data per module.

Two-stage pipeline:
  1. UNIVERSAL `meeting_metadata` analyzer runs automatically once the
     AssemblyAI transcription is complete. It auto-fills the meetings row:
       - participants[] (extracted from utterances + names mentioned)
       - notes (short summary)
       - duration_minutes (from audio length)
       - suggested meeting_type (only set when meetings.meeting_type is empty)
     This stage is allowed to mutate the meeting row directly because the
     fields are purely descriptive metadata about the meeting itself.

  2. SPECIALIZED analyzers (one per meeting_type) extract structured
     RECOMMENDATIONS for the target module (CRM, RFQ, Projects, etc).
     These NEVER auto-mutate downstream tables — output is stored on
     meeting_analyses.output and the user must explicitly approve.

Models:
  - gpt-4o-mini for everything (cheap, JSON-mode capable, ~$0.15/MTok in)

The analyzer registry maps analyzer_type -> (run_fn, apply_fn). The router
can request any analyzer by name; transcription_service auto-selects the
analyzer matching the meeting's meeting_type.
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Any, Callable

from pydantic import BaseModel, Field
from sqlalchemy import text

from lib.audit import record_audit
from lib.db import SessionLocal
from lib.openai_client import call_openai


CHEAP_MODEL = "gpt-4o-mini"

# ════════════════════════════════════════════════════════════════════════
# Output schemas
# ════════════════════════════════════════════════════════════════════════

class ActionItem(BaseModel):
    text: str
    assignee: str | None = None
    priority: str = Field(default="medium")
    points: int = 3
    due_date: str | None = None


class RiskItem(BaseModel):
    title: str
    severity: str = Field(default="warning")
    detail: str = ""
    category: str | None = None
    probability: int | None = None  # 1-5
    impact: int | None = None       # 1-5


class ExtractedParticipant(BaseModel):
    name: str
    email: str | None = None
    role: str = Field(default="external")  # internal | external
    title: str | None = None
    speaker_label: str | None = None


class MeetingMetadataOutput(BaseModel):
    summary: str = ""
    participants: list[ExtractedParticipant] = []
    meeting_type_suggested: str | None = None
    language: str | None = None
    key_topics: list[str] = []


class GenericAnalysisOutput(BaseModel):
    summary: str = ""
    key_decisions: list[str] = []
    action_items: list[ActionItem] = []
    risks: list[RiskItem] = []
    next_steps: list[str] = []
    extracted: dict[str, Any] = Field(default_factory=dict)


# ════════════════════════════════════════════════════════════════════════
# Helpers
# ════════════════════════════════════════════════════════════════════════

def _format_utterances(meeting: dict[str, Any]) -> str:
    # Build speaker_label -> name map from saved meeting.participants (if any)
    name_map: dict[str, str] = {}
    raw_parts = meeting.get("participants")
    if isinstance(raw_parts, str):
        try:
            raw_parts = json.loads(raw_parts)
        except Exception:
            raw_parts = None
    if isinstance(raw_parts, list):
        for p in raw_parts:
            if isinstance(p, dict):
                lbl = p.get("speaker_label")
                nm = p.get("name")
                if lbl and nm:
                    name_map[str(lbl)] = str(nm)

    utterances = meeting.get("utterances")
    if utterances:
        lines = []
        for u in utterances:
            speaker = u.get("speaker") or "?"
            txt = (u.get("text") or "").strip()
            if not txt:
                continue
            label = name_map.get(str(speaker)) or f"Speaker {speaker}"
            lines.append(f"{label}: {txt}")
        if lines:
            return "\n".join(lines)
    return meeting.get("transcript") or ""


def _meeting_context(meeting: dict[str, Any]) -> str:
    parts = [
        f"Title: {meeting.get('title') or 'Untitled'}",
        f"Meeting type (declared): {meeting.get('meeting_type') or 'unknown'}",
    ]
    if meeting.get("scheduled_at"):
        parts.append(f"Scheduled at: {meeting['scheduled_at']}")
    if meeting.get("audio_duration_seconds"):
        parts.append(f"Duration: {meeting['audio_duration_seconds']} seconds")
    if meeting.get("language_detected"):
        parts.append(f"Language detected: {meeting['language_detected']}")
    return "\n".join(parts)


# ════════════════════════════════════════════════════════════════════════
# UNIVERSAL: meeting_metadata
# ════════════════════════════════════════════════════════════════════════

def _meeting_metadata_prompt(ctx: str, transcript: str) -> str:
    return f"""You are a meeting metadata extractor. Analyze the transcript and return
ONLY a JSON object with this exact shape:

{{
  "summary": "2-3 sentence neutral summary of what was discussed",
  "participants": [
    {{
      "name": "Best-guess full name (or 'Speaker A' if unknown)",
      "email": "email@domain.com or null",
      "role": "internal" or "external",
      "title": "job title if mentioned, else null",
      "speaker_label": "A" or "B" or null
    }}
  ],
  "meeting_type_suggested": one of: lead_qualification, discovery_rfq,
       sales_followup, siop_weekly, project_kickoff, sprint_review,
       client_qbr, pmo_review, compliance_audit, supplier_negotiation,
       daily_standup, sprint_planning, client_weekly_status, internal_kickoff,
       sprint_retro, uat_session, incident_postmortem, change_request,
       proposal_review, contract_review, cs_checkin, supplier_review,
       one_on_one, backlog_refinement, architecture_review, bug_triage,
       steering_committee, capacity_planning, onboarding_call, renewal_call,
       win_loss_review, hiring_panel, performance_review, or null,
  "language": "en" / "es" / "pt" / etc,
  "key_topics": ["max 5 short topic tags"]
}}

Rules:
- Participants: one entry per distinct speaker. If a name is mentioned in
  the conversation tied to a speaker, use it. Never invent emails.
- role: "internal" if the speaker appears to work for the AI/services
  vendor running the meeting (LongevAI / SIOP / Juntify / sales / pm /
  consultant); "external" if they are the client or supplier.
- Detect language from transcript content.
- Output valid JSON only, no markdown, no commentary.

{ctx}

Transcript:
{transcript}
"""


def run_meeting_metadata(meeting: dict[str, Any]) -> MeetingMetadataOutput:
    transcript = _format_utterances(meeting)
    if not transcript.strip():
        raise ValueError("Meeting has no transcript to analyze")
    prompt = _meeting_metadata_prompt(_meeting_context(meeting), transcript)
    return call_openai(prompt, MeetingMetadataOutput, model=CHEAP_MODEL, temperature=0.2)


def auto_fill_meeting_from_metadata(
    meeting_id: str,
    workspace_id: str,
    user_id: str,
    meta: MeetingMetadataOutput,
    audio_duration_seconds: int | None,
    declared_meeting_type: str | None,
) -> None:
    """Write extracted metadata back to the meetings row (auto-mutation
    allowed for descriptive metadata only)."""
    duration_minutes = None
    if audio_duration_seconds:
        duration_minutes = max(1, round(audio_duration_seconds / 60))

    # Only set meeting_type if the user hasn't already declared one (other than default)
    new_type: str | None = None
    if meta.meeting_type_suggested and (not declared_meeting_type or declared_meeting_type == "discovery_rfq"):
        new_type = meta.meeting_type_suggested

    sets = [
        "participants = :participants",
        "notes = COALESCE(NULLIF(notes, ''), :notes)",
        "updated_at = :now",
    ]
    params: dict[str, Any] = {
        "participants": json.dumps([p.model_dump() for p in meta.participants]),
        "notes": meta.summary,
        "now": datetime.utcnow(),
        "id": meeting_id,
        "ws": workspace_id,
    }
    if duration_minutes is not None:
        sets.append("duration_minutes = COALESCE(duration_minutes, :dur)")
        params["dur"] = duration_minutes
    if new_type:
        sets.append("meeting_type = :mtype")
        params["mtype"] = new_type

    with SessionLocal() as db:
        db.execute(
            text(f"UPDATE meetings SET {', '.join(sets)} "
                 "WHERE id = :id AND workspace_id = :ws AND is_deleted = FALSE"),
            params,
        )
        record_audit(
            db,
            workspace_id=workspace_id,
            user_id=user_id,
            module="meetings",
            action="auto_fill_metadata",
            record_id=meeting_id,
            payload_delta={
                "participants_count": len(meta.participants),
                "language": meta.language,
                "meeting_type_suggested": meta.meeting_type_suggested,
                "applied_type": new_type,
            },
        )
        db.commit()


# ════════════════════════════════════════════════════════════════════════
# SPECIALIZED ANALYZERS
# Each builds its own prompt and returns GenericAnalysisOutput
# ════════════════════════════════════════════════════════════════════════

def _meeting_seed(meeting: dict[str, Any]) -> int:
    """Hash determinístico del transcript+título para que la misma junta
    produzca el mismo seed → misma respuesta del LLM (con temperature=0)."""
    import hashlib
    transcript = _format_utterances(meeting) or ""
    title = str(meeting.get("title") or "")
    h = hashlib.sha256((title + "::" + transcript).encode("utf-8")).hexdigest()
    # OpenAI seed es int32; tomamos los primeros 8 hex (32 bits) como uint
    return int(h[:8], 16)


def _build_prompt(role_brief: str, schema_block: str, meeting: dict[str, Any]) -> str:
    transcript = _format_utterances(meeting)
    if not transcript.strip():
        raise ValueError("Meeting has no transcript to analyze")
    return f"""{role_brief}

Return ONLY a JSON object with this EXACT shape:

{schema_block}

Common rules:
- Detect language; respond in the dominant language of the transcript.
- Be conservative — only include items that were actually discussed.
- Use speaker labels (Speaker A, Speaker B) when assigning, or names if mentioned.
- All numbers must be integers when the schema says int.
- Output valid JSON only.

{_meeting_context(meeting)}

Transcript:
{transcript}
"""


# ─── 1. status_update (legacy / generic fallback) ──────────────────────────

_STATUS_SCHEMA = """{
  "summary": "2-3 sentence summary",
  "key_decisions": ["..."],
  "action_items": [{"text", "assignee", "priority": "low|medium|high", "points": 1-13, "due_date": null}],
  "risks": [{"title", "severity": "warning|critical", "detail"}],
  "next_steps": ["..."],
  "extracted": {}
}"""


def run_status_update(meeting: dict[str, Any]) -> GenericAnalysisOutput:
    return call_openai(
        _build_prompt(
            "You are a senior PM analyst. Extract decisions, action items, risks and next steps from this meeting.",
            _STATUS_SCHEMA,
            meeting,
        ),
        GenericAnalysisOutput, model=CHEAP_MODEL, temperature=0.2,
    )


# ─── 2. lead_qualification → CRM (clients + deals) ─────────────────────────

_LEADQUAL_SCHEMA = """{
  "summary": "...",
  "key_decisions": [],
  "action_items": [{"text", "assignee", "priority", "points", "due_date"}],
  "risks": [],
  "next_steps": [],
  "extracted": {
    "client": {
      "name": "company name",
      "industry": "healthcare|biotech|pharma|medtech|other or null",
      "segment": "STRATEGIC|GROWTH|LONG_TAIL",
      "primary_contact_name": "...",
      "primary_contact_email": "... or null",
      "primary_contact_role": "...",
      "notes": "1-2 line client context"
    },
    "deal": {
      "client_name": "...",
      "deal_type": "platform|integration|consulting|other or null",
      "stage": "prospect|qualified_lead|discovery",
      "value": null,
      "probability": 0-100,
      "commercial_model": "FIXED_PRICE|TM|RETAINER|VALUE_BASED",
      "expected_close": "YYYY-MM-DD or null",
      "next_action": "concrete next step from the call",
      "notes": "key discussion points, concerns, requirements mentioned"
    },
    "lead_source": "referral|website|conference|linkedin|cold_outreach|other or null",
    "pain_points": ["..."],
    "decision_maker_present": true|false,
    "ai_score": 0-100,
    "ai_score_reasoning": "brief explanation of score based on ICP fit, budget, timeline, authority"
  }
}"""


def run_lead_qualification(meeting: dict[str, Any]) -> GenericAnalysisOutput:
    return call_openai(
        _build_prompt(
            "You are a senior CRM analyst. Extract a NEW LEAD record (client + deal) from this first-call qualification meeting.",
            _LEADQUAL_SCHEMA,
            meeting,
        ),
        GenericAnalysisOutput, model=CHEAP_MODEL, temperature=0.2,
    )


# ─── 3. discovery_rfq → RFQ session responses ──────────────────────────────

_DISCOVERY_SCHEMA = """{
  "summary": "...",
  "key_decisions": [],
  "action_items": [{"text", "assignee", "priority", "points", "due_date"}],
  "risks": [{"title", "severity", "detail"}],
  "next_steps": [],
  "extracted": {
    "rfq": {
      "scope_summary": "what they want built",
      "tech_requirements": "stack, models, infra requirements",
      "integrations": ["EHR", "FHIR", "..."],
      "compliance": ["HIPAA", "SOC2", "GDPR", "..."],
      "timeline": "e.g., Q3 2026",
      "budget_estimate": null,
      "completion_pct": 0-100
    }
  }
}"""


def run_discovery_rfq(meeting: dict[str, Any]) -> GenericAnalysisOutput:
    return call_openai(
        _build_prompt(
            "You are an RFQ discovery analyst. Extract project scope, tech requirements, integrations, compliance needs, timeline and budget signals.",
            _DISCOVERY_SCHEMA,
            meeting,
        ),
        GenericAnalysisOutput, model=CHEAP_MODEL, temperature=0.2,
    )


# ─── 4. sales_followup → deal stage update + action items ──────────────────

_FOLLOWUP_SCHEMA = """{
  "summary": "...",
  "key_decisions": [],
  "action_items": [{"text", "assignee", "priority", "points", "due_date"}],
  "risks": [{"title", "severity", "detail"}],
  "next_steps": [],
  "extracted": {
    "deal_update": {
      "stage": "prospect|discovery|proposal|negotiation|closed_won|closed_lost",
      "probability": 0-100,
      "value": null,
      "expected_close": "YYYY-MM-DD or null",
      "next_action": "concrete next sales action",
      "notes": "key discussion points from this call",
      "blockers": ["..."]
    }
  }
}"""


def run_sales_followup(meeting: dict[str, Any]) -> GenericAnalysisOutput:
    return call_openai(
        _build_prompt(
            "You are a CRM sales analyst. From this follow-up call, infer the new deal stage, win probability and immediate blockers.",
            _FOLLOWUP_SCHEMA,
            meeting,
        ),
        GenericAnalysisOutput, model=CHEAP_MODEL, temperature=0.2,
    )


# ─── 5. project_kickoff → projects + initial tasks/risks ───────────────────

_KICKOFF_SCHEMA = """{
  "summary": "...",
  "key_decisions": [],
  "action_items": [{"text", "assignee", "priority", "points", "due_date"}],
  "risks": [{"title", "severity", "detail", "category", "probability": 1-5, "impact": 1-5}],
  "next_steps": [],
  "extracted": {
    "project_update": {
      "phase": "kickoff|discovery|build|test|launch",
      "methodology": "agile|waterfall|hybrid",
      "phi_involved": true|false,
      "baa_confirmed": true|false,
      "team_roles": ["pm", "tech_lead", "data_engineer", "..."]
    },
    "initial_tasks": [{"text", "assignee", "priority", "points", "due_date", "task_type": "FEATURE|INTEGRATION|COMPLIANCE|SECURITY|CLINICAL"}]
  }
}"""


def run_project_kickoff(meeting: dict[str, Any]) -> GenericAnalysisOutput:
    return call_openai(
        _build_prompt(
            "You are a senior project manager. From this kickoff meeting, define project setup, initial backlog and early risks.",
            _KICKOFF_SCHEMA,
            meeting,
        ),
        GenericAnalysisOutput, model=CHEAP_MODEL, temperature=0.2,
    )


# ─── 6. sprint_review → sprint update + next-sprint backlog ────────────────

_SPRINT_SCHEMA = """{
  "summary": "demo highlights and sprint outcomes",
  "key_decisions": [],
  "action_items": [{"text", "assignee", "priority", "points", "due_date"}],
  "risks": [],
  "next_steps": [],
  "extracted": {
    "sprint_update": {
      "story_points_completed": 0,
      "demos_shown": ["..."],
      "client_feedback": "..."
    },
    "next_sprint_tasks": [{"text", "assignee", "priority", "points", "due_date", "task_type": "FEATURE|INTEGRATION|COMPLIANCE|SECURITY|CLINICAL"}]
  }
}"""


def run_sprint_review(meeting: dict[str, Any]) -> GenericAnalysisOutput:
    return call_openai(
        _build_prompt(
            "You are an Agile coach. Summarize the sprint demo and propose the next-sprint backlog.",
            _SPRINT_SCHEMA,
            meeting,
        ),
        GenericAnalysisOutput, model=CHEAP_MODEL, temperature=0.2,
    )


# ─── 7. client_qbr → client health + expansion signals ─────────────────────

_QBR_SCHEMA = """{
  "summary": "...",
  "key_decisions": [],
  "action_items": [{"text", "assignee", "priority", "points", "due_date"}],
  "risks": [{"title", "severity", "detail"}],
  "next_steps": [],
  "extracted": {
    "client_update": {
      "health_score": 0-100,
      "csat": 0.0-5.0,
      "nps": -100 to 100,
      "renewal_signal": "renew|expand|risk|churn",
      "notes": "qualitative summary of the relationship"
    },
    "expansion_signals": ["concrete upsell or cross-sell opportunities"]
  }
}"""


def run_client_qbr(meeting: dict[str, Any]) -> GenericAnalysisOutput:
    return call_openai(
        _build_prompt(
            "You are a Customer Success analyst. Score this client's health and surface expansion signals from the QBR.",
            _QBR_SCHEMA,
            meeting,
        ),
        GenericAnalysisOutput, model=CHEAP_MODEL, temperature=0.2,
    )


# ─── 8. siop_weekly → S&OP insights ────────────────────────────────────────

_SIOP_SCHEMA = """{
  "summary": "...",
  "key_decisions": [],
  "action_items": [{"text", "assignee", "priority", "points", "due_date"}],
  "risks": [],
  "next_steps": [],
  "extracted": {
    "insights": [
      {
        "module": "SIOP",
        "insight_type": "capacity|demand|supply|risk|opportunity",
        "title": "...",
        "description": "...",
        "severity": "INFO|LOW|MEDIUM|HIGH|CRITICAL"
      }
    ]
  }
}"""


def run_siop_weekly(meeting: dict[str, Any]) -> GenericAnalysisOutput:
    return call_openai(
        _build_prompt(
            "You are a S&OP analyst. Extract demand/capacity/supply insights from this weekly meeting.",
            _SIOP_SCHEMA,
            meeting,
        ),
        GenericAnalysisOutput, model=CHEAP_MODEL, temperature=0.2,
    )


# ─── 9. pmo_review → portfolio insights + cross-project risks ─────────────

_PMO_SCHEMA = """{
  "summary": "...",
  "key_decisions": [],
  "action_items": [{"text", "assignee", "priority", "points", "due_date"}],
  "risks": [{"title", "severity", "detail", "category": "schedule|budget|scope|resources|tech|compliance"}],
  "next_steps": [],
  "extracted": {
    "insights": [{"module": "PMO", "insight_type": "...", "title", "description", "severity"}],
    "cross_project_risks": [{"title", "category", "probability": 1-5, "impact": 1-5, "response_strategy"}]
  }
}"""


def run_pmo_review(meeting: dict[str, Any]) -> GenericAnalysisOutput:
    return call_openai(
        _build_prompt(
            "You are a PMO director. Extract portfolio-level insights and cross-project risks.",
            _PMO_SCHEMA,
            meeting,
        ),
        GenericAnalysisOutput, model=CHEAP_MODEL, temperature=0.2,
    )


# ─── 10. compliance_audit → compliance risks + tasks ──────────────────────

_COMPLIANCE_SCHEMA = """{
  "summary": "...",
  "key_decisions": [],
  "action_items": [{"text", "assignee", "priority", "points", "due_date"}],
  "risks": [{"title", "severity", "detail", "category": "HIPAA|SOC2|GDPR|other", "probability": 1-5, "impact": 1-5}],
  "next_steps": [],
  "extracted": {
    "compliance_findings": [
      {"control": "control id or name", "status": "pass|fail|partial", "gap": "what's missing"}
    ],
    "compliance_tasks": [{"text", "assignee", "priority", "points", "due_date", "task_type": "COMPLIANCE"}]
  }
}"""


def run_compliance_audit(meeting: dict[str, Any]) -> GenericAnalysisOutput:
    return call_openai(
        _build_prompt(
            "You are a compliance auditor (HIPAA/SOC2/GDPR). Extract findings, gaps and remediation tasks.",
            _COMPLIANCE_SCHEMA,
            meeting,
        ),
        GenericAnalysisOutput, model=CHEAP_MODEL, temperature=0.2,
    )


# ─── 11. supplier_negotiation → supplier update ───────────────────────────

_SUPPLIER_SCHEMA = """{
  "summary": "...",
  "key_decisions": [],
  "action_items": [{"text", "assignee", "priority", "points", "due_date"}],
  "risks": [{"title", "severity", "detail"}],
  "next_steps": [],
  "extracted": {
    "supplier_update": {
      "name": "supplier company",
      "category": "INFRASTRUCTURE|ML_OPS|CONSULTING|DATA|SECURITY|OTHER",
      "contact_name": "...",
      "contact_email": "... or null",
      "contract_value": null,
      "performance_score": 0-100,
      "risk_level": "LOW|MEDIUM|HIGH",
      "notes": "outcome of negotiation"
    }
  }
}"""


def run_supplier_negotiation(meeting: dict[str, Any]) -> GenericAnalysisOutput:
    return call_openai(
        _build_prompt(
            "You are a procurement analyst. Capture supplier negotiation outcomes and risk signals.",
            _SUPPLIER_SCHEMA,
            meeting,
        ),
        GenericAnalysisOutput, model=CHEAP_MODEL, temperature=0.2,
    )


# ─── Helper: load current project context for delivery-cycle analyzers ───

def _load_project_backlog(project_id: str | None, workspace_id: str) -> list[dict[str, Any]]:
    """Loads up to 50 open/in-progress tasks for the project. Used as
    context so analyzers can update existing tasks instead of duplicating."""
    if not project_id:
        return []
    with SessionLocal() as db:
        rows = db.execute(
            text(
                "SELECT id, title, status, task_type, story_points, assignee_id "
                "FROM tasks WHERE project_id = :pid AND workspace_id = :ws "
                "AND is_deleted = FALSE AND status NOT IN ('done','cancelled') "
                "ORDER BY updated_at DESC LIMIT 50"
            ),
            {"pid": project_id, "ws": workspace_id},
        ).fetchall()
        return [dict(r._mapping) for r in rows]


def _load_active_sprint(project_id: str | None, workspace_id: str) -> dict[str, Any] | None:
    if not project_id:
        return None
    with SessionLocal() as db:
        row = db.execute(
            text(
                "SELECT id, name, status, story_points_planned, story_points_completed, goal "
                "FROM sprints WHERE project_id = :pid AND workspace_id = :ws "
                "AND is_deleted = FALSE AND status IN ('ACTIVE','PLANNED') "
                "ORDER BY status DESC, created_at DESC LIMIT 1"
            ),
            {"pid": project_id, "ws": workspace_id},
        ).fetchone()
        return dict(row._mapping) if row else None


def _backlog_block(meeting: dict[str, Any]) -> str:
    """Render backlog tasks as compact context for the prompt."""
    pid = meeting.get("project_id")
    ws = meeting.get("workspace_id")
    if not pid:
        return "Current backlog: (no linked project — task references will be created as new)"
    rows = _load_project_backlog(pid, ws) if ws else []
    if not rows:
        return "Current backlog: empty"
    lines = ["Current backlog (use task_id for status/assignment updates):"]
    for r in rows[:25]:
        lines.append(f"- {r['id'][:8]} | {r['status']} | {r['task_type']} | {r['title'][:80]}")
    return "\n".join(lines)


# ─── 12. daily_standup → task status updates + blockers ────────────────────

_STANDUP_SCHEMA = """{
  "summary": "what was accomplished yesterday and the plan for today",
  "key_decisions": [],
  "action_items": [{"text", "assignee", "priority", "points", "due_date"}],
  "risks": [{"title", "severity", "detail", "category": "blocker|dependency|technical"}],
  "next_steps": [],
  "extracted": {
    "task_status_updates": [
      {
        "task_id": "first 8 chars of an existing task id from the backlog above, or null if new",
        "title_match": "if no task_id, the title hint to fuzzy-match against the backlog",
        "new_status": "in_progress|review|blocked|done",
        "progress_note": "brief 1-line update",
        "blocker_reason": "if status=blocked — required, else null"
      }
    ],
    "new_tasks": [
      {"text", "assignee", "priority", "points", "task_type": "FEATURE|BUG|BLOCKER|CHORE|RESEARCH"}
    ],
    "blockers_summary": "1-2 sentence summary of cross-team blockers raised today"
  }
}"""


def run_daily_standup(meeting: dict[str, Any]) -> GenericAnalysisOutput:
    backlog = _backlog_block(meeting)
    role = (
        "You are an Agile coach analyzing a daily standup. For each developer's update, "
        "match their work to existing backlog tasks (use the task_id prefix) and infer "
        "the new task status. Capture blockers as risks AND as task status='blocked'. "
        "Only create new_tasks for items genuinely not on the backlog.\n\n" + backlog
    )
    return call_openai(
        _build_prompt(role, _STANDUP_SCHEMA, meeting),
        GenericAnalysisOutput, model=CHEAP_MODEL, temperature=0.2,
    )


# ─── 13. sprint_planning → sprint config + assignments + new backlog ───────

_PLANNING_SCHEMA = """{
  "summary": "sprint goal and overall plan",
  "key_decisions": [],
  "action_items": [],
  "risks": [{"title", "severity", "detail"}],
  "next_steps": [],
  "extracted": {
    "sprint_plan": {
      "name": "Sprint NN — short theme",
      "goal": "1-sentence sprint goal",
      "start_date": "YYYY-MM-DD or null",
      "end_date": "YYYY-MM-DD or null",
      "story_points_planned": 0
    },
    "task_assignments": [
      {
        "task_id": "first 8 chars of an existing backlog task id",
        "assignee": "developer name as said in meeting",
        "story_points": 1,
        "title_match": "title hint if no task_id"
      }
    ],
    "new_tasks": [
      {"text", "assignee", "priority", "points", "task_type": "FEATURE|BUG|RESEARCH|CHORE"}
    ]
  }
}"""


def run_sprint_planning(meeting: dict[str, Any]) -> GenericAnalysisOutput:
    backlog = _backlog_block(meeting)
    role = (
        "You are a Scrum Master facilitating sprint planning. Define sprint goal, "
        "dates, capacity, distribute backlog items to developers, and identify any "
        "new tasks discovered. ALWAYS prefer assigning existing backlog items by "
        "task_id over creating new ones.\n\n" + backlog
    )
    return call_openai(
        _build_prompt(role, _PLANNING_SCHEMA, meeting),
        GenericAnalysisOutput, model=CHEAP_MODEL, temperature=0.2,
    )


# ─── 14. client_weekly_status → cliente ↔ delivery sync ──────────────────

_WEEKLY_SCHEMA = """{
  "summary": "what the team showed/told the client this week",
  "key_decisions": [],
  "action_items": [{"text", "assignee", "priority", "points", "due_date"}],
  "risks": [{"title", "severity", "detail", "category": "schedule|scope|quality|relationship"}],
  "next_steps": [],
  "extracted": {
    "client_pulse": {
      "sentiment": "positive|neutral|concerned|frustrated",
      "satisfaction_signal": -2 to 2,
      "client_concerns": ["..."],
      "client_requests": ["..."]
    },
    "scope_changes_hinted": ["any scope expansion or descope hints"],
    "insights": [{"module": "PMO", "insight_type": "client_signal", "title", "description", "severity"}]
  }
}"""


def run_client_weekly_status(meeting: dict[str, Any]) -> GenericAnalysisOutput:
    return call_openai(
        _build_prompt(
            "You are a Delivery Lead analyzing the recurring weekly client status meeting. "
            "Capture client sentiment, concerns, scope hints, and produce action items "
            "and insights for the project team.",
            _WEEKLY_SCHEMA,
            meeting,
        ),
        GenericAnalysisOutput, model=CHEAP_MODEL, temperature=0.2,
    )


# ─── 15. internal_kickoff → equipo de desarrollo recibe el proyecto ─────

_INT_KICKOFF_SCHEMA = """{
  "summary": "what was communicated to the dev team",
  "key_decisions": [],
  "action_items": [],
  "risks": [{"title", "severity", "detail"}],
  "next_steps": [],
  "extracted": {
    "team_assignments": [
      {"name": "developer name", "role": "tech_lead|backend|frontend|qa|devops|data|ml|other", "responsibilities": "..."}
    ],
    "tech_stack": {
      "frontend": "...",
      "backend": "...",
      "database": "...",
      "cloud": "...",
      "ml_ai": "..."
    },
    "initial_tasks": [
      {"text", "assignee", "priority", "points", "task_type": "FEATURE|RESEARCH|CHORE|INTEGRATION"}
    ],
    "first_sprint": {
      "name": "Sprint 1 — bootstrap",
      "goal": "...",
      "story_points_planned": 0
    }
  }
}"""


def run_internal_kickoff(meeting: dict[str, Any]) -> GenericAnalysisOutput:
    return call_openai(
        _build_prompt(
            "You are a Tech Lead running the INTERNAL kickoff with the dev team "
            "(post client kickoff). Distribute responsibilities, lock the tech stack, "
            "create the bootstrap backlog and define Sprint 1.",
            _INT_KICKOFF_SCHEMA,
            meeting,
        ),
        GenericAnalysisOutput, model=CHEAP_MODEL, temperature=0.2,
    )


# ─── 16. sprint_retro → mejora continua ─────────────────────────────────

_RETRO_SCHEMA = """{
  "summary": "team mood and big takeaways",
  "key_decisions": [],
  "action_items": [{"text", "assignee", "priority", "points", "due_date"}],
  "risks": [],
  "next_steps": [],
  "extracted": {
    "retro": {
      "what_went_well": ["..."],
      "what_went_wrong": ["..."],
      "team_sentiment": "high|medium|low",
      "velocity_actual": 0,
      "velocity_planned": 0
    },
    "improvement_actions": [
      {"text", "assignee", "priority", "points", "task_type": "CHORE|RESEARCH"}
    ],
    "insights": [{"module": "PMO", "insight_type": "retro", "title", "description", "severity"}]
  }
}"""


def run_sprint_retro(meeting: dict[str, Any]) -> GenericAnalysisOutput:
    return call_openai(
        _build_prompt(
            "You are an Agile coach running a sprint retrospective. Surface what "
            "went well, what didn't, team sentiment and concrete improvement actions.",
            _RETRO_SCHEMA,
            meeting,
        ),
        GenericAnalysisOutput, model=CHEAP_MODEL, temperature=0.2,
    )


# ─── 17. uat_session → bugs found + sign-off status ─────────────────────

_UAT_SCHEMA = """{
  "summary": "UAT outcome",
  "key_decisions": [],
  "action_items": [],
  "risks": [{"title", "severity", "detail"}],
  "next_steps": [],
  "extracted": {
    "uat_result": {
      "passed": true|false,
      "sign_off": true|false,
      "client_signer": "name or null",
      "blocking_bug_count": 0,
      "minor_bug_count": 0,
      "next_phase": "uat_passed|fix_iteration|launch_ready"
    },
    "bugs_found": [
      {"text", "assignee", "priority": "low|medium|high|critical", "points", "task_type": "BUG"}
    ],
    "project_phase_update": "uat|uat_passed|launch_ready|launched"
  }
}"""


def run_uat_session(meeting: dict[str, Any]) -> GenericAnalysisOutput:
    return call_openai(
        _build_prompt(
            "You are a QA lead analyzing a User Acceptance Testing session with the client. "
            "Detect bugs raised, severity, sign-off status and the resulting project phase.",
            _UAT_SCHEMA,
            meeting,
        ),
        GenericAnalysisOutput, model=CHEAP_MODEL, temperature=0.2,
    )


# ─── 18. incident_postmortem → 5-whys + preventive actions ─────────────

_POSTMORTEM_SCHEMA = """{
  "summary": "incident summary, blast radius and recovery",
  "key_decisions": [],
  "action_items": [],
  "risks": [{"title", "severity", "detail", "category": "reliability|security|process|technical", "probability": 1-5, "impact": 1-5}],
  "next_steps": [],
  "extracted": {
    "incident": {
      "title": "...",
      "severity": "SEV1|SEV2|SEV3",
      "detected_at": "ISO timestamp or null",
      "resolved_at": "ISO timestamp or null",
      "root_cause": "single-sentence root cause",
      "five_whys": ["why 1", "why 2", "why 3", "why 4", "why 5"],
      "blast_radius": "affected systems / users"
    },
    "preventive_actions": [
      {"text", "assignee", "priority", "points", "task_type": "CHORE|SECURITY|RESEARCH"}
    ],
    "insights": [{"module": "PMO", "insight_type": "postmortem", "title", "description", "severity"}]
  }
}"""


def run_incident_postmortem(meeting: dict[str, Any]) -> GenericAnalysisOutput:
    return call_openai(
        _build_prompt(
            "You are an SRE running a blameless post-mortem. Extract root cause, "
            "five-whys chain, preventive actions and risk register entries.",
            _POSTMORTEM_SCHEMA,
            meeting,
        ),
        GenericAnalysisOutput, model=CHEAP_MODEL, temperature=0.2,
    )


# ─── 19. change_request → scope/timeline/value impact ───────────────────

_CHANGE_SCHEMA = """{
  "summary": "the change requested and impact",
  "key_decisions": [],
  "action_items": [{"text", "assignee", "priority", "points", "due_date"}],
  "risks": [{"title", "severity", "detail"}],
  "next_steps": [],
  "extracted": {
    "change_request": {
      "summary": "...",
      "type": "scope_add|scope_remove|timeline_change|budget_change|tech_change",
      "delta_value": null,
      "delta_days": null,
      "client_approved": true|false,
      "internal_approved": true|false
    },
    "deal_update": {
      "value": null,
      "probability": null,
      "next_action": "..."
    },
    "project_update": {
      "phase": null,
      "methodology": null
    },
    "new_tasks": [
      {"text", "assignee", "priority", "points", "task_type": "FEATURE|CHORE|RESEARCH"}
    ]
  }
}"""


def run_change_request(meeting: dict[str, Any]) -> GenericAnalysisOutput:
    return call_openai(
        _build_prompt(
            "You are a Delivery Lead analyzing a change request meeting. Quantify the "
            "scope/timeline/value impact and produce updates for the deal and project.",
            _CHANGE_SCHEMA,
            meeting,
        ),
        GenericAnalysisOutput, model=CHEAP_MODEL, temperature=0.2,
    )


# ─── 20. proposal_review → pre-sales proposal walkthrough ───────────────

_PROPOSAL_SCHEMA = """{
  "summary": "what was proposed and how the client reacted",
  "key_decisions": [],
  "action_items": [{"text", "assignee", "priority", "points", "due_date"}],
  "risks": [{"title", "severity", "detail"}],
  "next_steps": [],
  "extracted": {
    "proposal": {
      "scope_summary": "what we are proposing",
      "value_proposed": null,
      "commercial_model": "FIXED_PRICE|TM|RETAINER|VALUE_BASED",
      "timeline_proposed": "e.g., 6 months starting Q3 2026",
      "client_reaction": "positive|neutral|concerns|negative",
      "pushback_points": ["specific objections from the client"],
      "competitor_mentioned": "name or null"
    },
    "deal_update": {
      "stage": "proposal|negotiation|closed_won|closed_lost",
      "probability": 0-100,
      "value": null,
      "next_action": "..."
    }
  }
}"""


def run_proposal_review(meeting: dict[str, Any]) -> GenericAnalysisOutput:
    return call_openai(
        _build_prompt(
            "You are a pre-sales lead walking the prospect through a formal proposal. "
            "Capture client reaction, pushback, competitor mentions, and update the deal.",
            _PROPOSAL_SCHEMA,
            meeting,
        ),
        GenericAnalysisOutput, model=CHEAP_MODEL, temperature=0.2,
    )


# ─── 21. contract_review → contract negotiation outcomes ────────────────

_CONTRACT_SCHEMA = """{
  "summary": "what changed and where we stand",
  "key_decisions": [],
  "action_items": [{"text", "assignee", "priority", "points", "due_date"}],
  "risks": [{"title", "severity", "detail", "category": "legal|financial|compliance|delivery"}],
  "next_steps": [],
  "extracted": {
    "contract_update": {
      "contract_type": "MSA|SOW|NDA|DPA|BAA|amendment|other",
      "status": "draft|under_review|redlines|signed|terminated",
      "value": null,
      "term_months": null,
      "phi_involved": true|false,
      "baa_required": true|false,
      "baa_signed": true|false,
      "open_redlines": ["clauses still being negotiated"],
      "signer_client": "name or null",
      "signer_internal": "name or null",
      "expected_signature_date": "YYYY-MM-DD or null"
    },
    "compliance_flags": ["HIPAA", "SOC2", "GDPR", "..."]
  }
}"""


def run_contract_review(meeting: dict[str, Any]) -> GenericAnalysisOutput:
    return call_openai(
        _build_prompt(
            "You are a contracts/legal analyst. Capture contract type, status, open redlines, "
            "BAA/PHI implications and signature path. Flag compliance categories triggered.",
            _CONTRACT_SCHEMA,
            meeting,
        ),
        GenericAnalysisOutput, model=CHEAP_MODEL, temperature=0.2,
    )


# ─── 22. cs_checkin → light Customer Success touchpoint ─────────────────

_CSCHECKIN_SCHEMA = """{
  "summary": "client mood and any signals to act on",
  "key_decisions": [],
  "action_items": [{"text", "assignee", "priority", "points", "due_date"}],
  "risks": [{"title", "severity", "detail", "category": "churn|adoption|relationship|delivery"}],
  "next_steps": [],
  "extracted": {
    "cs_pulse": {
      "sentiment": "positive|neutral|concerned|frustrated",
      "satisfaction_signal": -2 to 2,
      "adoption_signal": "high|medium|low",
      "renewal_signal": "renew|expand|risk|churn|too_early",
      "feature_requests": ["..."],
      "complaints": ["..."],
      "champions": ["names of internal champions at the client"]
    },
    "expansion_signals": ["upsell/cross-sell hints"]
  }
}"""


def run_cs_checkin(meeting: dict[str, Any]) -> GenericAnalysisOutput:
    return call_openai(
        _build_prompt(
            "You are a Customer Success Manager doing a light recurring check-in (not a QBR). "
            "Read the temperature: sentiment, adoption, churn risk, expansion signals.",
            _CSCHECKIN_SCHEMA,
            meeting,
        ),
        GenericAnalysisOutput, model=CHEAP_MODEL, temperature=0.2,
    )


# ─── 23. supplier_review → ongoing vendor performance review ────────────

_SUPPLIER_REVIEW_SCHEMA = """{
  "summary": "supplier performance summary",
  "key_decisions": [],
  "action_items": [{"text", "assignee", "priority", "points", "due_date"}],
  "risks": [{"title", "severity", "detail", "category": "delivery|quality|cost|compliance|continuity"}],
  "next_steps": [],
  "extracted": {
    "supplier_review": {
      "name": "supplier company",
      "period": "e.g., Q1 2026",
      "performance_score": 0-100,
      "sla_compliance_pct": 0-100,
      "quality_score": 0-100,
      "delivery_score": 0-100,
      "cost_score": 0-100,
      "risk_level": "LOW|MEDIUM|HIGH",
      "renewal_recommendation": "renew|renegotiate|replace|terminate",
      "notes": "qualitative summary"
    }
  }
}"""


def run_supplier_review(meeting: dict[str, Any]) -> GenericAnalysisOutput:
    return call_openai(
        _build_prompt(
            "You are a Procurement / Vendor Manager running a periodic supplier review. "
            "Score performance across SLA, quality, delivery, cost; recommend renewal action.",
            _SUPPLIER_REVIEW_SCHEMA,
            meeting,
        ),
        GenericAnalysisOutput, model=CHEAP_MODEL, temperature=0.2,
    )


# ─── 24. one_on_one → manager ↔ direct report 1:1 ───────────────────────

_ONEONONE_SCHEMA = """{
  "summary": "what the report is feeling and working on",
  "key_decisions": [],
  "action_items": [{"text", "assignee", "priority", "points", "due_date"}],
  "risks": [{"title", "severity", "detail", "category": "retention|burnout|growth|performance"}],
  "next_steps": [],
  "extracted": {
    "one_on_one": {
      "report_name": "person being managed",
      "manager_name": "manager",
      "morale": "high|medium|low",
      "burnout_risk": "low|medium|high",
      "blockers": ["..."],
      "growth_topics": ["career, skills, mentorship items"],
      "feedback_to_manager": ["upward feedback if any"],
      "follow_ups": ["concrete commitments from manager"]
    }
  }
}"""


def run_one_on_one(meeting: dict[str, Any]) -> GenericAnalysisOutput:
    return call_openai(
        _build_prompt(
            "You are an HR/People Ops analyst processing a 1:1 between a manager and "
            "a direct report. Capture morale, burnout signals, growth topics, blockers and "
            "manager follow-ups. Be discreet — do NOT include sensitive personal info.",
            _ONEONONE_SCHEMA,
            meeting,
        ),
        GenericAnalysisOutput, model=CHEAP_MODEL, temperature=0.2,
    )


# ─── 25. cost_estimation → audio → cotización automática (MXN) ──────────
#
# Pricebook de LongevAI — costos reales internos (MXN por persona-semana).
# Modelo de equipo: practicantes + recién egresados a $15,000 MXN/mes (~$3,750/sem)
# liderados por un senior/tech lead. Las tarifas COMERCIALES (lo que se cobra al
# cliente) llevan markup ~3.5x sobre el costo interno para cubrir overhead, IVA,
# riesgo y margen sano.
#
PRICEBOOK_MXN_PER_WEEK: dict[str, int] = {
    # Roles core de LongevAI (practicantes + lead)
    "junior_engineer":  13000,   # practicante / recién egresado: costo interno ~$3.7k/sem
    "mid_engineer":     18000,   # 1-3 años: costo interno ~$5.5k/sem
    "senior_backend":   24000,   # senior con criterio: costo interno ~$7-8k/sem
    "senior_frontend":  22000,
    "tech_lead":        28000,   # lead que coordina al squad de practicantes
    "qa_engineer":      12000,   # QA junior / part-time
    "project_manager":  16000,
    # Especialistas (rara vez se cotizan; tarifa premium si se necesitan)
    "ml_engineer":      26000,
    "data_engineer":    24000,
    "devops":           20000,
    "ux_designer":      16000,
    "solutions_arch":   30000,
}

COMPLEXITY_BUFFERS = {
    "LOW":       0.10,  # 10% colchón
    "MEDIUM":    0.15,
    "HIGH":      0.22,
    "VERY_HIGH": 0.30,
}


def _pricebook_block() -> str:
    rows = "\n".join(
        f"  - {role}: ${rate:,} MXN/semana"
        for role, rate in PRICEBOOK_MXN_PER_WEEK.items()
    )
    return (
        "Catálogo de tarifas COMERCIALES de LongevAI (MXN por persona-semana, ya con markup):\n"
        f"{rows}\n\n"
        "Estructura real del equipo de LongevAI:\n"
        "  • Squad core = 4 practicantes/recién egresados ($15k MXN/mes c/u, costo interno) "
        "coordinados por 1 senior o tech lead.\n"
        "  • PREFIERE roles `junior_engineer` y `mid_engineer` para el grueso del trabajo.\n"
        "  • Solo añade `senior_*` o `tech_lead` cuando el alcance lo justifique "
        "(arquitectura, decisiones críticas, integraciones complejas).\n"
        "  • La tarifa del catálogo YA INCLUYE el costo de practicantes + supervisión + margen. "
        "Úsala tal cual; NO la subas. Solo bájala (-10%) si el alcance es muy simple.\n"
    )


_COST_ESTIMATION_SCHEMA_LEGACY_UNUSED = """{
  "summary": "qué se cotiza, complejidad detectada y nivel de confianza",
  "key_decisions": [],
  "action_items": [{"text", "assignee", "priority", "points", "due_date"}],
  "risks": [{"title", "severity", "detail", "category": "scope|tech|integration|compliance|delivery"}],
  "next_steps": [],
  "extracted": {
    "estimate": {
      "scope_summary": "resumen ejecutivo del alcance escuchado",
      "deliverables": ["lista de entregables concretos mencionados o claramente implícitos"],
      "feature_breakdown": [
        {
          "feature": "Nombre del feature (ej. 'Caja / POS')",
          "complexity": "S|M|L|XL",
          "person_weeks": 2.0,
          "primary_role": "senior_backend|senior_frontend|...",
          "rationale": "por qué ese tamaño y rol"
        }
      ],
      "total_person_weeks": 0,
      "complexity_level": "LOW|MEDIUM|HIGH|VERY_HIGH",
      "complexity_reasoning": "por qué ese nivel: integraciones, datos, compliance, modelos, etc.",
      "estimated_dev_weeks": 12,
      "size_tier": "MICRO|SMALL|MEDIUM|LARGE|ENTERPRISE",
      "deadline_pressure": "NONE|TIGHT|UNREALISTIC",
      "deadline_reasoning": "si el cliente puso plazo, evalúa si es realista vs total_person_weeks",
      "confidence": "low|medium|high",
      "confidence_reasoning": "qué información falta para subir la confianza",
      "team": [
        {
          "role": "tech_lead|senior_backend|senior_frontend|ml_engineer|data_engineer|mid_engineer|junior_engineer|qa_engineer|devops|project_manager|ux_designer|solutions_arch",
          "role_label": "Etiqueta legible",
          "count": 1,
          "weeks": 12,
          "allocation_pct": 100,
          "weekly_rate_mxn": 40000,
          "subtotal_mxn": 480000,
          "notes": "responsabilidades clave"
        }
      ],
      "infrastructure": [
        {"name": "OpenAI API gpt-4o", "monthly_cost_mxn": 8000, "months": 6, "subtotal_mxn": 48000}
      ],
      "third_party_costs": [
        {"name": "Auditoría HIPAA", "amount_mxn": 35000, "notes": "una vez"}
      ],
      "risk_buffer_pct": 15,
      "subtotal_mxn": 0,
      "currency": "MXN",
      "tax_rate_pct": 16,
      "valid_days": 30,
      "assumptions": ["supuestos clave"],
      "exclusions": ["lo que NO está incluido"],
      "commercial_model": "FIXED_PRICE|TM|RETAINER|VALUE_BASED",
      "pricing_rationale": "explicación 1-2 frases de por qué este precio es razonable para ESTE cliente y ESTE alcance",
      "alternative_options": [
        {"name": "MVP recortado", "scope": "qué se quita", "weeks": 6, "total_mxn": 250000}
      ]
    },
    "prospective_client": {
      "name": "nombre de la empresa o persona si se menciona, o null",
      "industry": "industria/giro si se menciona (ej. 'Restaurantes', 'Healthcare')",
      "contact_name": "nombre de quien habla por el cliente, o null",
      "contact_email": "email si se menciona, o null",
      "contact_phone": "teléfono si se menciona, o null",
      "location": "ciudad/país si se menciona, o null",
      "size_hint": "MICRO|SMALL|MEDIUM|LARGE si se infiere por descripción"
    },
    "deal_update": {
      "stage": "qualified_lead|discovery|proposal",
      "value": 0,
      "probability": 0-100,
      "next_action": "siguiente paso comercial concreto",
      "deal_title": "título corto del deal (ej. 'POS Restaurante La Casa')",
      "deal_type": "platform|integration|consulting|maintenance"
    }
  }
}"""


# ─── Schema NUEVO: el LLM solo CLASIFICA, Python calcula precio. ───
_COST_CLASSIFICATION_SCHEMA = """{
  "summary": "qué se cotiza, qué tipo de proyecto es y por qué",
  "key_decisions": [],
  "action_items": [{"text", "assignee", "priority", "points", "due_date"}],
  "risks": [{"title", "severity", "detail", "category": "scope|tech|integration|compliance|delivery"}],
  "next_steps": [],
  "extracted": {
    "classification": {
      "project_type": "slug exacto del catálogo A (uno solo)",
      "addons": ["slugs del catálogo B; solo si se mencionaron explícita o implícitamente"],
      "integrations": ["slugs del catálogo C; solo si nombraron el sistema externo"],
      "multipliers": ["slugs del catálogo D; solo con evidencia clara en la junta"],
      "support_tier": "basico|estandar|premium|enterprise|null",
      "support_months": 12,
      "infra": ["slugs del catálogo G; vacío si el cliente provee su propia infra"],
      "infra_months": 12,
      "pro_services": [{"slug": "discovery_workshop|consultoria_hora|capacitacion_sesion|auditoria_seguridad|performance_audit|ux_research", "qty": 1}],
      "scope_summary": "1-2 frases del alcance escuchado",
      "deliverables": ["entregables concretos mencionados"],
      "assumptions": ["supuestos clave"],
      "exclusions": ["lo que NO está incluido"],
      "complexity_level": "LOW|MEDIUM|HIGH|VERY_HIGH",
      "deadline_pressure": "NONE|TIGHT|UNREALISTIC",
      "deadline_reasoning": "si dieron plazo, ¿es realista?",
      "confidence": "low|medium|high",
      "confidence_reasoning": "qué información falta",
      "commercial_model": "FIXED_PRICE|TM|RETAINER|VALUE_BASED"
    },
    "prospective_client": {
      "name": "nombre de la empresa o persona si se menciona, o null",
      "industry": "industria/giro si se menciona",
      "contact_name": "nombre de quien habla por el cliente, o null",
      "contact_email": "email si se menciona, o null",
      "contact_phone": "teléfono si se menciona, o null",
      "location": "ciudad/país si se menciona, o null",
      "size_hint": "MICRO|SMALL|MEDIUM|LARGE si se infiere"
    },
    "deal_update": {
      "stage": "qualified_lead|discovery|proposal",
      "value": 0,
      "probability": 0,
      "next_action": "siguiente paso comercial concreto",
      "deal_title": "título corto del deal",
      "deal_type": "platform|integration|consulting|maintenance"
    }
  }
}"""


def run_cost_estimation(meeting: dict[str, Any]) -> GenericAnalysisOutput:
    """Voz → cotización determinística desde catálogo LongevAI.

    El LLM SOLO clasifica (project_type, addons, integrations, multipliers,
    support_tier). El precio se calcula 100% en Python desde
    `services.pricing_catalog`. Mismo input → mismo precio, siempre.
    """
    from services.pricing_catalog import (
        catalog_block_for_prompt, compute_estimate,
        PROJECT_TYPES, ADDONS, INTEGRATIONS, MULTIPLIERS, SUPPORT_TIERS, INFRA,
    )

    role_brief = (
        "Eres un Solution Architect de LongevAI. Tu ÚNICO trabajo es CLASIFICAR "
        "lo que escuchaste contra el catálogo fijo de productos de LongevAI. "
        "NO inventas precios, NO estimas semanas, NO armas equipo: solo escoges "
        "slugs del catálogo. Python calcula el precio determinísticamente.\n\n"

        "REGLAS DE CLASIFICACIÓN:\n"
        "1. `project_type`: escoge UN slug de A. Si dudas entre dos, escoge el más "
        "cercano al alcance descrito; si no hay coincidencia clara, usa el más simple "
        "que cubra lo mencionado (ej. 'web_app_basica' por defecto).\n"
        "2. `addons`: incluye SOLO funcionalidad mencionada explícitamente o claramente "
        "implícita (ej. 'cobrar tarjeta' → pasarela_pagos). NO añadas addons 'por si acaso'.\n"
        "3. `integrations`: solo si nombran el sistema externo (SAP, HubSpot, etc.).\n"
        "4. `multipliers`: aplícalos solo con evidencia clara:\n"
        "   - industria_salud: si mencionan datos de pacientes / HIPAA / COFEPRIS.\n"
        "   - industria_finanzas: bancos / pagos / PCI / CNBV.\n"
        "   - urgencia: si pidieron entregar en <6 semanas.\n"
        "   - migracion_legacy: si mencionan migrar datos de un sistema viejo.\n"
        "   - ux_a_la_medida: si pidieron diseño nuevo / branding (no template).\n"
        "   - sla_24_7: si pidieron soporte 24/7 explícito.\n"
        "   - multi_region_ha: si pidieron alta disponibilidad multi-zona.\n"
        "   - iso27001_soc2: si pidieron certificación ISO/SOC.\n"
        "5. `support_tier`: solo si negociaron mantenimiento explícito (basico/estandar/premium/enterprise).\n"
        "6. `support_months`: meses de soporte (default 12 si support_tier set).\n"
        "7. `infra`: VPS/CDN si lo cubre LongevAI. `infra_months` default 12.\n"
        "8. `pro_services`: solo si los pidieron específicamente (workshop, capacitación...).\n"
        "9. `deadline_pressure`: NONE si no dieron plazo, TIGHT si justo, UNREALISTIC si imposible.\n"
        "10. `confidence`: low si la junta fue corta/vaga, medium normal, high si alcance crístalino.\n"
        "11. `commercial_model`: FIXED_PRICE si confidence=high; TM si vago.\n\n"

        "Si NO escuchaste suficiente para decidir, deja arrays vacíos y confidence=low. "
        "Es mejor cotizar el mínimo correcto que inventar add-ons.\n\n"
        + catalog_block_for_prompt()
    )

    raw = call_openai(
        _build_prompt(role_brief, _COST_CLASSIFICATION_SCHEMA, meeting),
        GenericAnalysisOutput, model="gpt-4o", temperature=0.0,
        seed=_meeting_seed(meeting),
    )

    # ── Capa determinística: el catálogo construye el `estimate` final ──
    try:
        extracted = getattr(raw, "extracted", None) or {}
        if not isinstance(extracted, dict):
            extracted = {}
        classification = extracted.get("classification") or {}

        # Validar slugs (filtrar los que no existen en catálogo)
        if classification.get("project_type") not in PROJECT_TYPES:
            classification["project_type"] = None
        classification["addons"] = [s for s in (classification.get("addons") or []) if s in ADDONS]
        classification["integrations"] = [s for s in (classification.get("integrations") or []) if s in INTEGRATIONS]
        classification["multipliers"] = [s for s in (classification.get("multipliers") or []) if s in MULTIPLIERS]
        if classification.get("support_tier") not in SUPPORT_TIERS:
            classification["support_tier"] = None
        classification["infra"] = [s for s in (classification.get("infra") or []) if s in INFRA]

        estimate = compute_estimate(classification)
        extracted["estimate"] = estimate
        # mantén también la clasificación cruda (auditoría)
        extracted["classification"] = classification
        # Pydantic v2: re-asignar dict
        try:
            raw.extracted = extracted   # type: ignore[attr-defined]
        except Exception:
            pass
    except Exception:
        # Si algo falla, devolvemos lo que el LLM dio para no romper UX
        return raw

    return raw


# Caps duros por tier (count efectivo de personas full-time-equivalent).
# LongevAI usa squads de practicantes/recién egresados, así que los caps
# son ALTOS en cantidad de personas pero el costo agregado se mantiene bajo
# porque la mayoría son junior/mid (tarifa baja).
_TIER_MAX_FTE = {
    "MICRO": 1.0,
    "SMALL": 3.0,
    "MEDIUM": 5.0,
    "LARGE": 7.5,
    "ENTERPRISE": 12.0,
}
# Roles de overhead que se eliminan primero si excedemos el cap del tier.
# Los junior/mid se preservan al máximo (es el modelo de LongevAI).
_OVERHEAD_ROLES_PRIORITY = [
    "solutions_arch", "ux_designer", "devops",
    "ml_engineer", "data_engineer",
    "project_manager", "tech_lead",
    "senior_backend", "senior_frontend",
    "qa_engineer",
]


def _clamp_cost_estimate(raw) -> None:
    """Recorta el equipo si excede el cap del tier. Mutación in-place del
    objeto Pydantic. La idea es proteger al cliente de la tendencia del LLM
    a inflar el equipo 'por costumbre'."""
    try:
        extracted = getattr(raw, "extracted", None) or {}
        if not isinstance(extracted, dict):
            return
        est = extracted.get("estimate")
        if not isinstance(est, dict):
            return
        team = est.get("team")
        if not isinstance(team, list) or not team:
            return

        tier = (est.get("size_tier") or "").upper()
        # Si el LLM no llenó tier, derívalo de total_person_weeks
        if tier not in _TIER_MAX_FTE:
            tpw = float(est.get("total_person_weeks") or 0)
            if tpw <= 4:        tier = "MICRO"
            elif tpw <= 15:     tier = "SMALL"
            elif tpw <= 40:     tier = "MEDIUM"
            elif tpw <= 100:    tier = "LARGE"
            else:               tier = "ENTERPRISE"
            est["size_tier"] = tier
        cap_fte = _TIER_MAX_FTE.get(tier, 3.5)

        def _fte(member: dict) -> float:
            try:
                return (float(member.get("count") or 1)
                        * float(member.get("allocation_pct") or 100) / 100.0)
            except (TypeError, ValueError):
                return 1.0

        notes_log = []
        # 1) Si un miembro pasa de allocation_pct=100 y tier MICRO/SMALL en QA/PM, baja a 25-50%
        for m in team:
            role = (m.get("role") or "").lower()
            alloc = float(m.get("allocation_pct") or 100)
            if tier in {"MICRO", "SMALL"} and role in {"project_manager", "qa_engineer"} and alloc > 50:
                m["allocation_pct"] = 25 if tier == "MICRO" else 50
                notes_log.append(f"Allocation de {role} bajada a {m['allocation_pct']}% (tier {tier}).")

        # 2) Elimina roles fantasma en tiers chicos
        forbidden_by_tier = {
            "MICRO":  {"tech_lead", "project_manager", "ml_engineer", "ux_designer", "devops", "solutions_arch", "data_engineer"},
            "SMALL":  {"ml_engineer", "ux_designer", "devops", "solutions_arch", "data_engineer"},
            "MEDIUM": {"solutions_arch"},
        }.get(tier, set())
        if forbidden_by_tier:
            kept = []
            for m in team:
                role = (m.get("role") or "").lower()
                if role in forbidden_by_tier:
                    notes_log.append(f"Rol {role} removido (no aplica a tier {tier}).")
                    continue
                kept.append(m)
            if kept:
                team = kept
                est["team"] = team

        # 3) Aplica cap de FTE total recortando overhead primero
        def _total_fte() -> float:
            return sum(_fte(m) for m in team)

        guard = 0
        while _total_fte() > cap_fte and team and guard < 20:
            guard += 1
            # busca rol overhead a remover
            removed = False
            for role_pri in _OVERHEAD_ROLES_PRIORITY:
                idx = next((i for i, m in enumerate(team)
                            if (m.get("role") or "").lower() == role_pri), None)
                if idx is not None:
                    notes_log.append(f"Rol {role_pri} removido por exceder cap de tier {tier} ({cap_fte} FTE).")
                    team.pop(idx)
                    removed = True
                    break
            if not removed:
                # baja allocation del último senior antes de quitarlo
                last = team[-1]
                cur_alloc = float(last.get("allocation_pct") or 100)
                if cur_alloc > 50:
                    last["allocation_pct"] = 50
                    notes_log.append(f"Allocation de {last.get('role')} bajada a 50% para respetar cap.")
                else:
                    team.pop()
                    notes_log.append("Último miembro removido para respetar cap.")
        est["team"] = team

        # 4) Recalcula subtotal_mxn por miembro respetando allocation
        for m in team:
            try:
                count = float(m.get("count") or 1)
                weeks = float(m.get("weeks") or 0)
                rate = float(m.get("weekly_rate_mxn") or 0)
                alloc = float(m.get("allocation_pct") or 100) / 100.0
                m["subtotal_mxn"] = round(count * weeks * rate * alloc)
            except (TypeError, ValueError):
                continue

        if notes_log:
            existing = est.get("assumptions") or []
            est["assumptions"] = list(existing) + ["[Auto-clamp] " + n for n in notes_log]
    except Exception:
        # No bloquees el análisis si el clamp falla
        return


# ════════════════════════════════════════════════════════════════════════
# Registry + dispatch
# ════════════════════════════════════════════════════════════════════════

# ─── Day 24 — coverage expansion (10 new analyzers) ────────────────────

_BACKLOG_REFINEMENT_SCHEMA = """{
  "summary": "what was groomed and how the team feels about readiness",
  "key_decisions": [],
  "action_items": [{"text", "assignee", "priority", "points", "due_date"}],
  "risks": [],
  "next_steps": [],
  "extracted": {
    "task_estimates": [
      {"task_id": "8-char id from backlog above or null",
       "title_match": "title hint if no task_id",
       "story_points": 1,
       "ready_for_sprint": true,
       "acceptance_criteria_clarified": true}
    ],
    "task_splits": [
      {"original_task_id": "8-char id", "subtasks": [{"text", "points": 1}]}
    ],
    "new_tasks": [
      {"text", "assignee", "priority", "points", "task_type": "FEATURE|BUG|RESEARCH|CHORE"}
    ]
  }
}"""


def run_backlog_refinement(meeting: dict[str, Any]) -> GenericAnalysisOutput:
    backlog = _backlog_block(meeting)
    role = (
        "You are a Scrum Master facilitating backlog refinement (grooming). "
        "Re-estimate items, mark which are READY for the next sprint, identify "
        "stories that need to be split, and surface anything missing.\n\n" + backlog
    )
    return call_openai(
        _build_prompt(role, _BACKLOG_REFINEMENT_SCHEMA, meeting),
        GenericAnalysisOutput, model=CHEAP_MODEL, temperature=0.2,
    )


_ARCHITECTURE_REVIEW_SCHEMA = """{
  "summary": "the architectural problem and the chosen direction",
  "key_decisions": [],
  "action_items": [{"text", "assignee", "priority", "points", "due_date"}],
  "risks": [{"title", "severity", "detail", "category": "technical|security|cost|scalability"}],
  "next_steps": [],
  "extracted": {
    "adr": {
      "title": "Decision name (e.g., 'Use Postgres over MySQL for tenant DB')",
      "context": "What problem is being solved",
      "decision": "What was decided",
      "alternatives_considered": ["..."],
      "rejected_reasons": ["why each alt was rejected"],
      "consequences": ["positive and negative implications"],
      "owner": "person accountable",
      "status": "proposed|accepted|deprecated"
    },
    "follow_up_tasks": [
      {"text", "assignee", "priority", "points", "task_type": "RESEARCH|CHORE|FEATURE"}
    ]
  }
}"""


def run_architecture_review(meeting: dict[str, Any]) -> GenericAnalysisOutput:
    return call_openai(
        _build_prompt(
            "You are a principal engineer documenting an architectural decision record (ADR). "
            "Capture the context, the decision, alternatives considered and consequences. "
            "Output rigorous, neutral language suitable for a long-lived technical record.",
            _ARCHITECTURE_REVIEW_SCHEMA,
            meeting,
        ),
        GenericAnalysisOutput, model=CHEAP_MODEL, temperature=0.2,
    )


_BUG_TRIAGE_SCHEMA = """{
  "summary": "triage outcome and overall bug load",
  "key_decisions": [],
  "action_items": [],
  "risks": [],
  "next_steps": [],
  "extracted": {
    "triaged_bugs": [
      {
        "task_id": "8-char id of an existing task or null",
        "title_match": "title hint",
        "new_priority": "low|medium|high|critical",
        "new_status": "in_progress|review|blocked|done",
        "assignee": "name or null",
        "decision_note": "fix-now|defer|wont-fix|needs-info"
      }
    ],
    "new_tasks": [
      {"text", "assignee", "priority": "low|medium|high|critical",
       "points", "task_type": "BUG"}
    ],
    "queue_health": {
      "open_count": 0,
      "critical_open": 0,
      "high_open": 0,
      "stale_count": 0
    }
  }
}"""


def run_bug_triage(meeting: dict[str, Any]) -> GenericAnalysisOutput:
    backlog = _backlog_block(meeting)
    role = (
        "You are a QA lead running bug triage. For each bug discussed, decide priority, "
        "assignment and disposition. Map to existing tasks via task_id when possible; only "
        "create new_tasks for newly-reported bugs.\n\n" + backlog
    )
    return call_openai(
        _build_prompt(role, _BUG_TRIAGE_SCHEMA, meeting),
        GenericAnalysisOutput, model=CHEAP_MODEL, temperature=0.2,
    )


_STEERING_SCHEMA = """{
  "summary": "executive-level summary of project status",
  "key_decisions": [],
  "action_items": [{"text", "assignee", "priority", "points", "due_date"}],
  "risks": [{"title", "severity", "detail", "category": "schedule|budget|scope|relationship|compliance"}],
  "next_steps": [],
  "extracted": {
    "stage_gate": {
      "current_phase": "discovery|build|test|launch|hypercare",
      "decision": "go|conditional_go|hold|kill",
      "conditions": ["if conditional_go, what must happen"],
      "next_review_date": "YYYY-MM-DD or null"
    },
    "escalations": [
      {"title", "owner", "severity": "high|critical", "decision_required": "..."}
    ],
    "insights": [
      {"module": "PMO", "insight_type": "executive_signal", "title", "description", "severity"}
    ]
  }
}"""


def run_steering_committee(meeting: dict[str, Any]) -> GenericAnalysisOutput:
    return call_openai(
        _build_prompt(
            "You are a PMO director clerking an executive Steering Committee. "
            "Capture the stage-gate decision, escalations requiring sponsor action, "
            "and the next review checkpoint. Be concise; use C-suite language.",
            _STEERING_SCHEMA,
            meeting,
        ),
        GenericAnalysisOutput, model=CHEAP_MODEL, temperature=0.2,
    )


_CAPACITY_PLANNING_SCHEMA = """{
  "summary": "current vs needed capacity across roles",
  "key_decisions": [],
  "action_items": [{"text", "assignee", "priority", "points", "due_date"}],
  "risks": [{"title", "severity", "detail", "category": "capacity|hiring|burnout"}],
  "next_steps": [],
  "extracted": {
    "capacity_signals": [
      {"role": "backend|frontend|ml|data|qa|devops|pm|design|other",
       "current_fte": 0.0,
       "needed_fte": 0.0,
       "gap_severity": "low|medium|high",
       "action": "hire|reallocate|backfill|defer_work"}
    ],
    "hiring_requests": [
      {"role": "...", "level": "junior|mid|senior|staff",
       "headcount": 1, "urgency": "Q1|Q2|Q3|Q4|asap"}
    ],
    "insights": [
      {"module": "PMO", "insight_type": "capacity", "title", "description", "severity"}
    ]
  }
}"""


def run_capacity_planning(meeting: dict[str, Any]) -> GenericAnalysisOutput:
    return call_openai(
        _build_prompt(
            "You are a PMO / Resource Manager running capacity planning across the portfolio. "
            "Surface role-by-role gaps, hiring requests and reallocations needed.",
            _CAPACITY_PLANNING_SCHEMA,
            meeting,
        ),
        GenericAnalysisOutput, model=CHEAP_MODEL, temperature=0.2,
    )


_ONBOARDING_SCHEMA = """{
  "summary": "what the client needs to do to start the engagement",
  "key_decisions": [],
  "action_items": [{"text", "assignee", "priority", "points", "due_date"}],
  "risks": [{"title", "severity", "detail", "category": "access|legal|technical|adoption"}],
  "next_steps": [],
  "extracted": {
    "onboarding_checklist": [
      {"text", "assignee", "priority", "points", "task_type": "CHORE|INTEGRATION|COMPLIANCE"}
    ],
    "access_requests": [
      {"system": "EHR|VPN|GitHub|cloud|other", "needed_for": "...", "owner_client": "..."}
    ],
    "key_contacts": [
      {"name", "role", "email": null, "side": "client|internal"}
    ]
  }
}"""


def run_onboarding_call(meeting: dict[str, Any]) -> GenericAnalysisOutput:
    return call_openai(
        _build_prompt(
            "You are a Customer Success / Implementation lead running the post-signature "
            "onboarding call. Build the checklist of tasks, access requests and key contacts "
            "needed before the actual project kickoff.",
            _ONBOARDING_SCHEMA,
            meeting,
        ),
        GenericAnalysisOutput, model=CHEAP_MODEL, temperature=0.2,
    )


_RENEWAL_SCHEMA = """{
  "summary": "renewal posture and key terms discussed",
  "key_decisions": [],
  "action_items": [{"text", "assignee", "priority", "points", "due_date"}],
  "risks": [{"title", "severity", "detail", "category": "churn|pricing|relationship"}],
  "next_steps": [],
  "extracted": {
    "renewal": {
      "current_term_end": "YYYY-MM-DD or null",
      "decision": "renew|expand|downgrade|churn|undecided",
      "new_term_months": null,
      "new_value": null,
      "uplift_pct": null,
      "blockers": ["..."],
      "champion": "internal champion at the client"
    },
    "deal_update": {
      "stage": "negotiation|closed_won|closed_lost",
      "probability": 0-100,
      "value": null,
      "expected_close": "YYYY-MM-DD or null",
      "next_action": "..."
    }
  }
}"""


def run_renewal_call(meeting: dict[str, Any]) -> GenericAnalysisOutput:
    return call_openai(
        _build_prompt(
            "You are an Account Manager handling a renewal conversation. Capture the renewal "
            "decision, uplift, blockers and the resulting deal update.",
            _RENEWAL_SCHEMA,
            meeting,
        ),
        GenericAnalysisOutput, model=CHEAP_MODEL, temperature=0.2,
    )


_WINLOSS_SCHEMA = """{
  "summary": "outcome and the dominant reasons",
  "key_decisions": [],
  "action_items": [{"text", "assignee", "priority", "points", "due_date"}],
  "risks": [],
  "next_steps": [],
  "extracted": {
    "win_loss": {
      "outcome": "won|lost",
      "dominant_reasons": ["price", "fit", "timing", "competitor", "trust", "other"],
      "competitor": "name or null",
      "lessons_learned": ["..."],
      "would_do_differently": ["..."]
    },
    "insights": [
      {"module": "CRM", "insight_type": "win_loss", "title", "description", "severity": "INFO|MEDIUM|HIGH"}
    ]
  }
}"""


def run_win_loss_review(meeting: dict[str, Any]) -> GenericAnalysisOutput:
    return call_openai(
        _build_prompt(
            "You are a Sales Ops analyst running a win/loss review on a closed deal. Be honest "
            "about reasons, especially when it's a loss. Surface lessons learned that the team "
            "can apply to the next deal.",
            _WINLOSS_SCHEMA,
            meeting,
        ),
        GenericAnalysisOutput, model=CHEAP_MODEL, temperature=0.2,
    )


_HIRING_PANEL_SCHEMA = """{
  "summary": "panel decision and rationale",
  "key_decisions": [],
  "action_items": [{"text", "assignee", "priority", "points", "due_date"}],
  "risks": [],
  "next_steps": [],
  "extracted": {
    "panel": {
      "candidate_alias": "first name or initials only — no PII",
      "role": "backend|frontend|ml|data|qa|devops|pm|design|other",
      "level_assessed": "junior|mid|senior|staff",
      "decision": "hire|no_hire|extend_loop|hold",
      "scorecard": {
        "technical": 1-5,
        "system_design": 1-5,
        "communication": 1-5,
        "culture": 1-5
      },
      "strengths": ["..."],
      "concerns": ["..."]
    }
  }
}"""


def run_hiring_panel(meeting: dict[str, Any]) -> GenericAnalysisOutput:
    return call_openai(
        _build_prompt(
            "You are an interview panel chair documenting the hire/no-hire decision. "
            "Use ONLY first names or initials for the candidate — never full PII. "
            "Provide an honest, calibrated scorecard.",
            _HIRING_PANEL_SCHEMA,
            meeting,
        ),
        GenericAnalysisOutput, model=CHEAP_MODEL, temperature=0.2,
    )


_PERF_REVIEW_SCHEMA = """{
  "summary": "performance summary and growth direction",
  "key_decisions": [],
  "action_items": [{"text", "assignee", "priority", "points", "due_date"}],
  "risks": [{"title", "severity", "detail", "category": "retention|performance|growth"}],
  "next_steps": [],
  "extracted": {
    "performance_review": {
      "report_name": "person being reviewed",
      "manager_name": "manager",
      "rating": "exceeds|meets|developing|below",
      "promotion_signal": "ready_now|next_cycle|not_yet|n/a",
      "comp_action_signal": "increase|hold|adjust|n/a",
      "strengths": ["..."],
      "growth_areas": ["..."],
      "goals_next_cycle": ["..."]
    }
  }
}"""


def run_performance_review(meeting: dict[str, Any]) -> GenericAnalysisOutput:
    return call_openai(
        _build_prompt(
            "You are an HR Business Partner documenting a formal performance review (NOT a 1:1). "
            "Output structured rating, promotion/comp signals and growth goals. "
            "Be discreet — no sensitive personal details beyond what's required.",
            _PERF_REVIEW_SCHEMA,
            meeting,
        ),
        GenericAnalysisOutput, model=CHEAP_MODEL, temperature=0.2,
    )


# ════════════════════════════════════════════════════════════════════════
# Registry + dispatch (continued)
# ════════════════════════════════════════════════════════════════════════

ANALYZERS: dict[str, Callable[[dict[str, Any]], BaseModel]] = {
    "status_update": run_status_update,
    "lead_qualification": run_lead_qualification,
    "discovery_rfq": run_discovery_rfq,
    "sales_followup": run_sales_followup,
    "project_kickoff": run_project_kickoff,
    "sprint_review": run_sprint_review,
    "client_qbr": run_client_qbr,
    "siop_weekly": run_siop_weekly,
    "pmo_review": run_pmo_review,
    "compliance_audit": run_compliance_audit,
    "supplier_negotiation": run_supplier_negotiation,
    # Delivery cycle (P0+P1)
    "daily_standup": run_daily_standup,
    "sprint_planning": run_sprint_planning,
    "client_weekly_status": run_client_weekly_status,
    "internal_kickoff": run_internal_kickoff,
    "sprint_retro": run_sprint_retro,
    "uat_session": run_uat_session,
    "incident_postmortem": run_incident_postmortem,
    "change_request": run_change_request,
    # Module-coverage expansion (Day 23)
    "proposal_review": run_proposal_review,
    "contract_review": run_contract_review,
    "cs_checkin": run_cs_checkin,
    "supplier_review": run_supplier_review,
    "one_on_one": run_one_on_one,
    # Voz → cotización automática (MXN) → contrato
    "cost_estimation": run_cost_estimation,
    # Coverage expansion (Day 24) — fill role-specific gaps
    "backlog_refinement": run_backlog_refinement,
    "architecture_review": run_architecture_review,
    "bug_triage": run_bug_triage,
    "steering_committee": run_steering_committee,
    "capacity_planning": run_capacity_planning,
    "onboarding_call": run_onboarding_call,
    "renewal_call": run_renewal_call,
    "win_loss_review": run_win_loss_review,
    "hiring_panel": run_hiring_panel,
    "performance_review": run_performance_review,
}


def analyzer_for_meeting_type(mt: str | None) -> str:
    """Returns the registered analyzer key for a given meeting_type, or
    'status_update' as a safe default."""
    if mt and mt in ANALYZERS:
        return mt
    return "status_update"


# ════════════════════════════════════════════════════════════════════════
# Persistence
# ════════════════════════════════════════════════════════════════════════

def list_analyses(meeting_id: str, workspace_id: str) -> list[dict[str, Any]]:
    with SessionLocal() as db:
        rows = db.execute(
            text(
                "SELECT id, created_at, updated_at, meeting_id, analyzer_type, "
                "       status, output, error_message, model, approved_at, approved_by "
                "FROM meeting_analyses "
                "WHERE meeting_id = :mid AND workspace_id = :ws AND is_deleted = FALSE "
                "ORDER BY created_at DESC"
            ),
            {"mid": meeting_id, "ws": workspace_id},
        ).fetchall()
        out = []
        for r in rows:
            row = dict(r._mapping)
            if isinstance(row.get("output"), (str, bytes, bytearray)):
                try:
                    row["output"] = json.loads(row["output"])
                except (ValueError, TypeError):
                    row["output"] = None
            out.append(row)
        return out


def get_analysis(analysis_id: str, workspace_id: str) -> dict[str, Any] | None:
    with SessionLocal() as db:
        row = db.execute(
            text(
                "SELECT id, created_at, updated_at, meeting_id, analyzer_type, "
                "       status, output, error_message, model, approved_at, approved_by "
                "FROM meeting_analyses "
                "WHERE id = :id AND workspace_id = :ws AND is_deleted = FALSE"
            ),
            {"id": analysis_id, "ws": workspace_id},
        ).fetchone()
        if not row:
            return None
        rec = dict(row._mapping)
        if isinstance(rec.get("output"), (str, bytes, bytearray)):
            try:
                rec["output"] = json.loads(rec["output"])
            except (ValueError, TypeError):
                rec["output"] = None
        return rec


def run_analysis(
    *,
    meeting: dict[str, Any],
    analyzer_type: str,
    workspace_id: str,
    user_id: str,
) -> dict[str, Any]:
    fn = ANALYZERS.get(analyzer_type)
    if fn is None:
        raise ValueError(f"Unknown analyzer_type: {analyzer_type}")

    new_id = str(uuid.uuid4())
    now = datetime.utcnow()

    with SessionLocal() as db:
        db.execute(
            text(
                "INSERT INTO meeting_analyses "
                "(id, created_at, updated_at, workspace_id, is_deleted, "
                " meeting_id, analyzer_type, status, model) "
                "VALUES (:id, :now, :now, :ws, FALSE, :mid, :atype, 'running', :model)"
            ),
            {"id": new_id, "now": now, "ws": workspace_id,
             "mid": meeting["id"], "atype": analyzer_type, "model": CHEAP_MODEL},
        )
        db.commit()

    try:
        result = fn(meeting)
        output_json = result.model_dump()
        with SessionLocal() as db:
            db.execute(
                text(
                    "UPDATE meeting_analyses SET "
                    "  status = 'completed', output = :out, updated_at = :now "
                    "WHERE id = :id AND workspace_id = :ws"
                ),
                {"out": json.dumps(output_json), "now": datetime.utcnow(),
                 "id": new_id, "ws": workspace_id},
            )
            record_audit(
                db,
                workspace_id=workspace_id,
                user_id=user_id,
                module="meetings.analyzer",
                action=f"run.{analyzer_type}",
                record_id=meeting["id"],
                payload_delta={"analysis_id": new_id, "status": "completed"},
            )
            db.commit()
    except Exception as exc:  # noqa: BLE001
        with SessionLocal() as db:
            db.execute(
                text(
                    "UPDATE meeting_analyses SET "
                    "  status = 'error', error_message = :err, updated_at = :now "
                    "WHERE id = :id AND workspace_id = :ws"
                ),
                {"err": f"{type(exc).__name__}: {exc}", "now": datetime.utcnow(),
                 "id": new_id, "ws": workspace_id},
            )
            db.commit()
        raise

    return get_analysis(new_id, workspace_id) or {}


# ════════════════════════════════════════════════════════════════════════
# Approval handlers — write structured recommendations to target tables
# ════════════════════════════════════════════════════════════════════════

def _now() -> datetime:
    return datetime.utcnow()


def _insert_action_items_as_tasks(
    db, workspace_id: str, user_id: str, meeting: dict[str, Any],
    items: list[dict[str, Any]], analysis_id: str,
) -> list[dict[str, Any]]:
    project_id = meeting.get("project_id")
    if not project_id:
        return []
    created = []
    now = _now()
    for it in items:
        new_id = str(uuid.uuid4())
        ttype = (it.get("task_type") or "FEATURE").upper()
        if ttype not in {"FEATURE", "INTEGRATION", "COMPLIANCE", "SECURITY", "CLINICAL",
                         "BUG", "BLOCKER", "RESEARCH", "CHORE"}:
            ttype = "FEATURE"
        db.execute(
            text(
                "INSERT INTO tasks "
                "(id, created_at, updated_at, workspace_id, is_deleted, "
                " project_id, title, description, status, task_type, story_points) "
                "VALUES (:id, :now, :now, :ws, FALSE, :pid, :title, :desc, 'todo', :ttype, :pts)"
            ),
            {
                "id": new_id, "now": now, "ws": workspace_id, "pid": project_id,
                "title": (it.get("text") or "Untitled task")[:500],
                "desc": f"From meeting: {meeting.get('title')}\nAssignee: {it.get('assignee') or '—'}\nPriority: {it.get('priority') or 'medium'}\nDue: {it.get('due_date') or '—'}",
                "ttype": ttype,
                "pts": int(it.get("points") or 3),
            },
        )
        record_audit(db, workspace_id=workspace_id, user_id=user_id,
                     module="pm.tasks", action="create.from_meeting",
                     record_id=new_id,
                     payload_delta={"analysis_id": analysis_id, "source": "meeting_analyzer"})
        created.append({"id": new_id, "title": it.get("text"), "type": "task"})
    return created


def _insert_risk_items(
    db, workspace_id: str, user_id: str, meeting: dict[str, Any],
    risks: list[dict[str, Any]], analysis_id: str,
) -> list[dict[str, Any]]:
    project_id = meeting.get("project_id")
    if not project_id:
        return []
    created = []
    now = _now()
    for r in risks:
        new_id = str(uuid.uuid4())
        prob = int(r.get("probability") or 3)
        imp = int(r.get("impact") or 3)
        db.execute(
            text(
                "INSERT INTO risk_items "
                "(id, created_at, updated_at, workspace_id, is_deleted, "
                " project_id, title, category, probability, impact, score, status, response_strategy, trend) "
                "VALUES (:id, :now, :now, :ws, FALSE, :pid, :title, :cat, :prob, :imp, :score, 'open', :strat, 'flat')"
            ),
            {
                "id": new_id, "now": now, "ws": workspace_id, "pid": project_id,
                "title": (r.get("title") or "Untitled risk")[:500],
                "cat": (r.get("category") or "general")[:100],
                "prob": prob, "imp": imp, "score": prob * imp,
                "strat": r.get("response_strategy") or r.get("detail") or "",
            },
        )
        record_audit(db, workspace_id=workspace_id, user_id=user_id,
                     module="pm.risks", action="create.from_meeting",
                     record_id=new_id,
                     payload_delta={"analysis_id": analysis_id})
        created.append({"id": new_id, "title": r.get("title"), "type": "risk"})
    return created


def _insert_insights(
    db, workspace_id: str, user_id: str, meeting: dict[str, Any],
    insights: list[dict[str, Any]], analysis_id: str,
) -> list[dict[str, Any]]:
    created = []
    now = _now()
    for ins in insights:
        new_id = str(uuid.uuid4())
        sev = (ins.get("severity") or "INFO").upper()
        if sev not in {"INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"}:
            sev = "INFO"
        db.execute(
            text(
                "INSERT INTO insights "
                "(id, created_at, updated_at, workspace_id, is_deleted, "
                " module, insight_type, title, description, severity, "
                " related_entity_type, related_entity_id, payload, acknowledged) "
                "VALUES (:id, :now, :now, :ws, FALSE, :mod, :itype, :title, :desc, :sev, "
                "        'meeting', :mid, :payload, FALSE)"
            ),
            {
                "id": new_id, "now": now, "ws": workspace_id,
                "mod": (ins.get("module") or "PMO")[:50],
                "itype": (ins.get("insight_type") or "summary")[:100],
                "title": (ins.get("title") or "Untitled insight")[:500],
                "desc": ins.get("description") or "",
                "sev": sev,
                "mid": meeting["id"],
                "payload": json.dumps({"analysis_id": analysis_id, **ins}),
            },
        )
        record_audit(db, workspace_id=workspace_id, user_id=user_id,
                     module="ai.insights", action="create.from_meeting",
                     record_id=new_id, payload_delta={"analysis_id": analysis_id})
        created.append({"id": new_id, "title": ins.get("title"), "type": "insight"})
    return created


def _upsert_client_and_deal(
    db, workspace_id: str, user_id: str, meeting: dict[str, Any],
    client_data: dict[str, Any] | None, deal_data: dict[str, Any] | None,
    analysis_id: str,
) -> list[dict[str, Any]]:
    created: list[dict[str, Any]] = []
    now = _now()
    client_id: str | None = meeting.get("client_id")

    if client_data and client_data.get("name"):
        if not client_id:
            client_id = str(uuid.uuid4())
            seg = (client_data.get("segment") or "GROWTH").upper()
            if seg not in {"STRATEGIC", "GROWTH", "LONG_TAIL"}:
                seg = "GROWTH"
            db.execute(
                text(
                    "INSERT INTO clients "
                    "(id, created_at, updated_at, workspace_id, is_deleted, "
                    " name, industry, segment, status, "
                    " primary_contact_name, primary_contact_email, primary_contact_role, notes) "
                    "VALUES (:id, :now, :now, :ws, FALSE, :name, :ind, :seg, 'PROSPECT', "
                    "        :pcn, :pce, :pcr, :notes)"
                ),
                {
                    "id": client_id, "now": now, "ws": workspace_id,
                    "name": client_data["name"][:255],
                    "ind": (client_data.get("industry") or "other")[:100],
                    "seg": seg,
                    "pcn": (client_data.get("primary_contact_name") or "")[:255] or None,
                    "pce": (client_data.get("primary_contact_email") or "")[:255] or None,
                    "pcr": (client_data.get("primary_contact_role") or "")[:100] or None,
                    "notes": client_data.get("notes") or "",
                },
            )
            record_audit(db, workspace_id=workspace_id, user_id=user_id,
                         module="crm.clients", action="create.from_meeting",
                         record_id=client_id,
                         payload_delta={"analysis_id": analysis_id})
            created.append({"id": client_id, "name": client_data["name"], "type": "client"})
            # link the meeting to the new client
            db.execute(
                text("UPDATE meetings SET client_id = :cid, updated_at = :now "
                     "WHERE id = :mid AND workspace_id = :ws"),
                {"cid": client_id, "now": now, "mid": meeting["id"], "ws": workspace_id},
            )

    # Also get ai_score from extracted root if present
    extracted_root = meeting.get("_extracted_root", {})
    ai_score = extracted_root.get("ai_score")

    if deal_data and (deal_data.get("client_name") or client_data and client_data.get("name")):
        deal_id = str(uuid.uuid4())
        cm = (deal_data.get("commercial_model") or "FIXED_PRICE").upper()
        if cm not in {"FIXED_PRICE", "TM", "RETAINER", "VALUE_BASED"}:
            cm = "FIXED_PRICE"
        # Parse expected_close date if present
        exp_close = None
        if deal_data.get("expected_close"):
            try:
                from datetime import datetime as dt
                exp_close = dt.strptime(deal_data["expected_close"], "%Y-%m-%d").date()
            except (ValueError, TypeError):
                exp_close = None
        db.execute(
            text(
                "INSERT INTO deals "
                "(id, created_at, updated_at, workspace_id, is_deleted, "
                " client_name, deal_type, stage, value, probability, commercial_model, client_id, "
                " ai_score, expected_close, next_action, notes) "
                "VALUES (:id, :now, :now, :ws, FALSE, :cn, :dt, :stage, :val, :prob, :cm, :cid, "
                "        :ai_score, :exp_close, :next_action, :notes)"
            ),
            {
                "id": deal_id, "now": now, "ws": workspace_id,
                "cn": (deal_data.get("client_name") or (client_data or {}).get("name") or "Unknown")[:255],
                "dt": (deal_data.get("deal_type") or "platform")[:100],
                "stage": (deal_data.get("stage") or "prospect")[:100],
                "val": deal_data.get("value"),
                "prob": deal_data.get("probability"),
                "cm": cm,
                "cid": client_id,
                "ai_score": ai_score,
                "exp_close": exp_close,
                "next_action": (deal_data.get("next_action") or "")[:500] or None,
                "notes": deal_data.get("notes") or None,
            },
        )
        record_audit(db, workspace_id=workspace_id, user_id=user_id,
                     module="crm.deals", action="create.from_meeting",
                     record_id=deal_id, payload_delta={"analysis_id": analysis_id})
        created.append({"id": deal_id, "name": deal_data.get("client_name"), "type": "deal"})
        # link meeting to deal
        db.execute(
            text("UPDATE meetings SET deal_id = :did, updated_at = :now "
                 "WHERE id = :mid AND workspace_id = :ws"),
            {"did": deal_id, "now": now, "mid": meeting["id"], "ws": workspace_id},
        )
    return created


def _create_change_order(db, workspace_id, user_id, meeting, change, analysis_id):
    """Create a change_orders row from change_request analyzer output."""
    if not change:
        return []
    from lib.folio import next_folio  # local import to avoid cycles
    project_id = meeting.get("project_id")
    client_id = meeting.get("client_id")
    deal_id = meeting.get("deal_id")
    contract_id = None
    if deal_id:
        row = db.execute(
            text("SELECT id FROM contracts WHERE deal_id = :did AND workspace_id = :ws "
                 "  AND is_deleted = FALSE ORDER BY created_at DESC LIMIT 1"),
            {"did": deal_id, "ws": workspace_id},
        ).fetchone()
        if row:
            contract_id = row[0]

    now = _now()
    new_id = str(uuid.uuid4())
    folio = next_folio(db, workspace_id, "change_order")
    summary = (change.get("summary") or "Change request from meeting")[:255]
    ch_type = change.get("type")
    delta_value = change.get("delta_value")
    delta_days = change.get("delta_days")
    client_approved = bool(change.get("client_approved"))
    internal_approved = bool(change.get("internal_approved"))
    status = "approved" if (client_approved and internal_approved) else "proposed"

    db.execute(
        text(
            "INSERT INTO change_orders "
            "(id, created_at, updated_at, workspace_id, is_deleted, "
            " folio, project_id, contract_id, client_id, title, reason, description, "
            " scope_impact, timeline_impact_days, budget_impact, currency, status, "
            " source_meeting_id, source_analysis_id, approved_at) "
            "VALUES (:id, :now, :now, :ws, FALSE, "
            " :folio, :pid, :ctid, :cid, :title, :reason, :desc, "
            " :scope, :days, :budget, 'MXN', :status, "
            " :mid, :aid, :approved_at)"
        ),
        {
            "id": new_id, "now": now, "ws": workspace_id, "folio": folio,
            "pid": project_id, "ctid": contract_id, "cid": client_id,
            "title": summary, "reason": ch_type,
            "desc": summary,
            "scope": ch_type if ch_type and "scope" in ch_type else None,
            "days": delta_days, "budget": delta_value,
            "status": status,
            "mid": meeting.get("id"), "aid": analysis_id,
            "approved_at": now if status == "approved" else None,
        },
    )
    record_audit(db, workspace_id=workspace_id, user_id=user_id,
                 module="change_orders", action="create.from_meeting",
                 record_id=new_id,
                 payload_delta={"analysis_id": analysis_id, "folio": folio,
                                "type": ch_type, "delta_value": delta_value,
                                "delta_days": delta_days, "status": status})
    return [{"id": new_id, "type": "change_order", "folio": folio}]


def _update_deal(db, workspace_id, user_id, meeting, update, analysis_id):
    deal_id = meeting.get("deal_id")
    if not deal_id or not update:
        return []
    now = _now()
    # Parse expected_close date if present
    exp_close = None
    if update.get("expected_close"):
        try:
            from datetime import datetime as dt
            exp_close = dt.strptime(update["expected_close"], "%Y-%m-%d").date()
        except (ValueError, TypeError):
            exp_close = None
    db.execute(
        text(
            "UPDATE deals SET stage = COALESCE(:stage, stage), "
            "  probability = COALESCE(:prob, probability), "
            "  value = COALESCE(:val, value), "
            "  expected_close = COALESCE(:exp_close, expected_close), "
            "  next_action = COALESCE(:next_action, next_action), "
            "  notes = COALESCE(:notes, notes), "
            "  last_activity_at = :now, updated_at = :now "
            "WHERE id = :id AND workspace_id = :ws AND is_deleted = FALSE"
        ),
        {
            "stage": update.get("stage"),
            "prob": update.get("probability"),
            "val": update.get("value"),
            "exp_close": exp_close,
            "next_action": (update.get("next_action") or "")[:500] or None,
            "notes": update.get("notes"),
            "now": now, "id": deal_id, "ws": workspace_id
        },
    )
    record_audit(db, workspace_id=workspace_id, user_id=user_id,
                 module="crm.deals", action="update.from_meeting",
                 record_id=deal_id, payload_delta={"analysis_id": analysis_id, **update})
    return [{"id": deal_id, "type": "deal_update"}]


def _upsert_rfq(db, workspace_id, user_id, meeting, rfq_data, analysis_id):
    if not rfq_data:
        return []
    deal_id = meeting.get("deal_id")
    client_id = meeting.get("client_id")
    now = _now()
    new_id = str(uuid.uuid4())
    db.execute(
        text(
            "INSERT INTO rfq_sessions "
            "(id, created_at, updated_at, workspace_id, is_deleted, "
            " deal_id, client_id, responses, completion_pct, status) "
            "VALUES (:id, :now, :now, :ws, FALSE, :did, :cid, :resp, :pct, 'in_progress')"
        ),
        {
            "id": new_id, "now": now, "ws": workspace_id,
            "did": deal_id, "cid": client_id,
            "resp": json.dumps(rfq_data),
            "pct": int(rfq_data.get("completion_pct") or 50),
        },
    )
    record_audit(db, workspace_id=workspace_id, user_id=user_id,
                 module="rfq", action="create.from_meeting",
                 record_id=new_id, payload_delta={"analysis_id": analysis_id})
    return [{"id": new_id, "type": "rfq_session"}]


def _update_project(db, workspace_id, user_id, meeting, upd, analysis_id):
    project_id = meeting.get("project_id")
    if not project_id or not upd:
        return []
    now = _now()
    db.execute(
        text(
            "UPDATE projects SET phase = COALESCE(:phase, phase), "
            "  methodology = COALESCE(:meth, methodology), "
            "  phi_involved = COALESCE(:phi, phi_involved), "
            "  baa_confirmed = COALESCE(:baa, baa_confirmed), "
            "  updated_at = :now "
            "WHERE id = :id AND workspace_id = :ws AND is_deleted = FALSE"
        ),
        {"phase": upd.get("phase"), "meth": upd.get("methodology"),
         "phi": int(bool(upd.get("phi_involved"))) if upd.get("phi_involved") is not None else None,
         "baa": int(bool(upd.get("baa_confirmed"))) if upd.get("baa_confirmed") is not None else None,
         "now": now, "id": project_id, "ws": workspace_id},
    )
    record_audit(db, workspace_id=workspace_id, user_id=user_id,
                 module="pm.projects", action="update.from_meeting",
                 record_id=project_id, payload_delta={"analysis_id": analysis_id, **upd})
    return [{"id": project_id, "type": "project_update"}]


def _update_client(db, workspace_id, user_id, meeting, upd, analysis_id):
    client_id = meeting.get("client_id")
    if not client_id or not upd:
        return []
    now = _now()
    db.execute(
        text(
            "UPDATE clients SET health_score = COALESCE(:hs, health_score), "
            "  csat = COALESCE(:csat, csat), nps = COALESCE(:nps, nps), "
            "  notes = COALESCE(NULLIF(:notes, ''), notes), updated_at = :now "
            "WHERE id = :id AND workspace_id = :ws AND is_deleted = FALSE"
        ),
        {"hs": upd.get("health_score"), "csat": upd.get("csat"),
         "nps": upd.get("nps"), "notes": upd.get("notes"),
         "now": now, "id": client_id, "ws": workspace_id},
    )
    record_audit(db, workspace_id=workspace_id, user_id=user_id,
                 module="crm.clients", action="update.from_meeting",
                 record_id=client_id, payload_delta={"analysis_id": analysis_id, **upd})
    return [{"id": client_id, "type": "client_update"}]


def _update_sprint(db, workspace_id, user_id, meeting, upd, analysis_id):
    project_id = meeting.get("project_id")
    if not project_id or not upd:
        return []
    now = _now()
    # find latest active sprint
    row = db.execute(
        text("SELECT id FROM sprints WHERE project_id = :pid AND workspace_id = :ws "
             "AND is_deleted = FALSE AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT 1"),
        {"pid": project_id, "ws": workspace_id},
    ).fetchone()
    if not row:
        return []
    sprint_id = row._mapping["id"]
    db.execute(
        text(
            "UPDATE sprints SET story_points_completed = COALESCE(:pts, story_points_completed), "
            "  updated_at = :now "
            "WHERE id = :id AND workspace_id = :ws"
        ),
        {"pts": upd.get("story_points_completed"), "now": now,
         "id": sprint_id, "ws": workspace_id},
    )
    record_audit(db, workspace_id=workspace_id, user_id=user_id,
                 module="pm.sprints", action="update.from_meeting",
                 record_id=sprint_id, payload_delta={"analysis_id": analysis_id, **upd})
    return [{"id": sprint_id, "type": "sprint_update"}]


def _upsert_supplier(db, workspace_id, user_id, meeting, sup, analysis_id):
    if not sup or not sup.get("name"):
        return []
    now = _now()
    new_id = str(uuid.uuid4())
    cat = (sup.get("category") or "OTHER").upper()
    if cat not in {"INFRASTRUCTURE", "ML_OPS", "CONSULTING", "DATA", "SECURITY", "OTHER"}:
        cat = "OTHER"
    rl = (sup.get("risk_level") or "MEDIUM").upper()
    if rl not in {"LOW", "MEDIUM", "HIGH"}:
        rl = "MEDIUM"
    db.execute(
        text(
            "INSERT INTO suppliers "
            "(id, created_at, updated_at, workspace_id, is_deleted, "
            " name, category, status, contact_name, contact_email, "
            " contract_value, performance_score, risk_level, notes) "
            "VALUES (:id, :now, :now, :ws, FALSE, :name, :cat, 'PENDING', "
            "        :cn, :ce, :cv, :ps, :rl, :notes)"
        ),
        {
            "id": new_id, "now": now, "ws": workspace_id,
            "name": sup["name"][:255], "cat": cat,
            "cn": (sup.get("contact_name") or "")[:255] or None,
            "ce": (sup.get("contact_email") or "")[:255] or None,
            "cv": sup.get("contract_value"),
            "ps": sup.get("performance_score"),
            "rl": rl,
            "notes": sup.get("notes") or "",
        },
    )
    record_audit(db, workspace_id=workspace_id, user_id=user_id,
                 module="suppliers", action="create.from_meeting",
                 record_id=new_id, payload_delta={"analysis_id": analysis_id})
    return [{"id": new_id, "name": sup["name"], "type": "supplier"}]


# ─── Day 23 writers: contracts, proposals, cs_pulse, supplier_review, 1:1 ──

def _upsert_contract(db, workspace_id, user_id, meeting, contract, analysis_id):
    """contract_review: insert/update a contract row."""
    if not contract:
        return []
    client_id = meeting.get("client_id")
    if not client_id:
        # Contracts table requires client_id (FK NOT NULL). Skip cleanly.
        return []
    now = _now()
    new_id = str(uuid.uuid4())

    ct = (contract.get("contract_type") or "SOW").upper()
    if ct not in {"MSA", "SOW", "BAA", "NDA", "AMENDMENT"}:
        ct = "SOW"

    raw_status = (contract.get("status") or "draft").lower()
    status_map = {
        "draft": "DRAFT", "under_review": "REVIEW", "redlines": "REVIEW",
        "signed": "SIGNED", "terminated": "TERMINATED",
    }
    db_status = status_map.get(raw_status, "DRAFT")

    title = (contract.get("title")
             or f"{ct} — {meeting.get('title') or 'meeting'}")[:500]

    signers = []
    if contract.get("signer_client"):
        signers.append({"side": "client", "name": contract["signer_client"]})
    if contract.get("signer_internal"):
        signers.append({"side": "internal", "name": contract["signer_internal"]})

    db.execute(
        text(
            "INSERT INTO contracts "
            "(id, created_at, updated_at, workspace_id, is_deleted, "
            " contract_type, title, client_id, project_id, deal_id, "
            " status, value, signers, hipaa_required, baa_signed, notes) "
            "VALUES (:id, :now, :now, :ws, FALSE, "
            " :ct, :title, :cid, :pid, :did, :status, :val, :signers, "
            " :hipaa, :baa, :notes)"
        ),
        {
            "id": new_id, "now": now, "ws": workspace_id,
            "ct": ct, "title": title, "cid": client_id,
            "pid": meeting.get("project_id"), "did": meeting.get("deal_id"),
            "status": db_status,
            "val": contract.get("value") or 0,
            "signers": json.dumps(signers) if signers else None,
            "hipaa": bool(contract.get("phi_involved") or contract.get("baa_required")),
            "baa": bool(contract.get("baa_signed")),
            "notes": (contract.get("notes")
                      or "; ".join(contract.get("open_redlines") or [])
                      or "")[:65000],
        },
    )
    record_audit(db, workspace_id=workspace_id, user_id=user_id,
                 module="contracts", action="create.from_meeting",
                 record_id=new_id, payload_delta={"analysis_id": analysis_id})
    return [{"id": new_id, "title": title, "type": "contract"}]


def _create_proposal(db, workspace_id, user_id, meeting, proposal, analysis_id):
    """proposal_review: stub a proposals row from the walkthrough.

    Writes minimal columns (folio, title, deal_id, scope_md, commercial_model)
    so that the user can finish editing in the Proposals UI.
    """
    if not proposal:
        return []
    from lib.folio import next_folio
    deal_id = meeting.get("deal_id")
    client_id = meeting.get("client_id")
    if not deal_id and not client_id:
        return []
    now = _now()
    new_id = str(uuid.uuid4())
    folio = next_folio(db, workspace_id, "proposal")
    cm = (proposal.get("commercial_model") or "FIXED_PRICE").upper()
    if cm not in {"FIXED_PRICE", "TM", "RETAINER", "VALUE_BASED"}:
        cm = "FIXED_PRICE"
    title = (f"Proposal — {meeting.get('title') or 'meeting'}")[:255]
    scope_md = proposal.get("scope_summary") or ""
    timeline_md = proposal.get("timeline_proposed") or ""
    db.execute(
        text(
            "INSERT INTO proposals "
            "(id, created_at, updated_at, workspace_id, is_deleted, "
            " folio, deal_id, client_id, title, version, status, "
            " commercial_model, scope_md, timeline_md) "
            "VALUES (:id, :now, :now, :ws, FALSE, "
            " :folio, :did, :cid, :title, 1, 'draft', "
            " :cm, :scope, :tl)"
        ),
        {
            "id": new_id, "now": now, "ws": workspace_id, "folio": folio,
            "did": deal_id, "cid": client_id, "title": title,
            "cm": cm, "scope": scope_md, "tl": timeline_md,
        },
    )
    record_audit(db, workspace_id=workspace_id, user_id=user_id,
                 module="proposals", action="create.from_meeting",
                 record_id=new_id, payload_delta={"analysis_id": analysis_id})
    return [{"id": new_id, "folio": folio, "type": "proposal"}]


def _create_quote_from_estimate(db, workspace_id, user_id, meeting, estimate, analysis_id):
    """cost_estimation: crea una cotización real (en MXN) con line items
    derivados del equipo, infraestructura y costos de terceros que extrajo
    el analyzer desde el audio.

    Línea por línea:
      - 1 line item por miembro del equipo: "Tech Lead Senior — 12 sem"
      - 1 line item por servicio de infraestructura: "OpenAI API gpt-4o — 6 m"
      - 1 line item por costo de terceros: "Auditoría HIPAA"
      - 1 line item del buffer de riesgo (porcentaje sobre subtotal)

    Calcula subtotal, IVA y total. La quote queda en `draft` para revisión.
    """
    if not estimate:
        return []
    from lib.folio import next_folio
    from decimal import Decimal, ROUND_HALF_UP

    deal_id = meeting.get("deal_id")
    client_id = meeting.get("client_id")
    if not deal_id and not client_id:
        # Sin deal ni cliente vinculado a la junta no podemos amarrar la quote.
        return []

    now = _now()
    quote_id = str(uuid.uuid4())
    folio = next_folio(db, workspace_id, "quote")

    items: list[dict[str, Any]] = []
    pos = 0

    # ── Equipo ────────────────────────────────────────────────────────
    for m in (estimate.get("team") or []):
        try:
            count = int(m.get("count") or 1)
            weeks = int(m.get("weeks") or 0)
            rate = Decimal(str(m.get("weekly_rate_mxn") or 0))
            alloc = Decimal(str(m.get("allocation_pct") or 100))
        except (TypeError, ValueError, ArithmeticError):
            continue
        if count <= 0 or weeks <= 0 or rate <= 0:
            continue
        alloc = max(Decimal("1"), min(Decimal("100"), alloc))
        effective_pw = (Decimal(count) * Decimal(weeks) * alloc / Decimal("100")).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP)
        amount = (rate * effective_pw).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        label = (m.get("role_label") or m.get("role") or "Recurso").strip()
        alloc_suffix = f" @ {int(alloc)}%" if alloc < 100 else ""
        pos += 1
        items.append({
            "position": pos,
            "description": f"{label} — {weeks} sem ({count} pax){alloc_suffix}"[:500],
            "qty": effective_pw,
            "unit": "persona-semana",
            "unit_price": rate.quantize(Decimal("0.01")),
            "amount": amount,
            "notes": (m.get("notes") or "")[:255] or None,
        })

    # ── Infraestructura ──────────────────────────────────────────────
    for inf in (estimate.get("infrastructure") or []):
        try:
            monthly = Decimal(str(inf.get("monthly_cost_mxn") or 0))
            months = int(inf.get("months") or 0)
        except (TypeError, ValueError, ArithmeticError):
            continue
        if monthly <= 0 or months <= 0:
            continue
        amount = (monthly * months).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        name = (inf.get("name") or "Infraestructura").strip()
        pos += 1
        items.append({
            "position": pos,
            "description": f"{name} — {months} m"[:500],
            "qty": Decimal(str(months)),
            "unit": "mes",
            "unit_price": monthly.quantize(Decimal("0.01")),
            "amount": amount,
            "notes": None,
        })

    # ── Costos de terceros (one-time) ─────────────────────────────────
    for tp in (estimate.get("third_party_costs") or []):
        try:
            amt = Decimal(str(tp.get("amount_mxn") or 0))
        except (TypeError, ValueError, ArithmeticError):
            continue
        if amt <= 0:
            continue
        name = (tp.get("name") or "Costo de terceros").strip()
        pos += 1
        items.append({
            "position": pos,
            "description": name[:500],
            "qty": Decimal("1"),
            "unit": "unit",
            "unit_price": amt.quantize(Decimal("0.01")),
            "amount": amt.quantize(Decimal("0.01")),
            "notes": (tp.get("notes") or "")[:255] or None,
        })

    if not items:
        return []

    base_subtotal = sum((it["amount"] for it in items), Decimal("0"))

    # ── Buffer de riesgo (línea aparte para que sea explícita) ───────
    try:
        buffer_pct = Decimal(str(estimate.get("risk_buffer_pct") or 0))
    except (TypeError, ValueError, ArithmeticError):
        buffer_pct = Decimal("0")
    buffer_pct = max(Decimal("0"), min(Decimal("50"), buffer_pct))
    buffer_amount = Decimal("0")
    if buffer_pct > 0:
        buffer_amount = (base_subtotal * buffer_pct / Decimal("100")).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP)
        pos += 1
        items.append({
            "position": pos,
            "description": f"Buffer de riesgo ({buffer_pct}%)"[:500],
            "qty": Decimal("1"),
            "unit": "unit",
            "unit_price": buffer_amount,
            "amount": buffer_amount,
            "notes": (estimate.get("complexity_reasoning") or "")[:255] or None,
        })

    subtotal = (base_subtotal + buffer_amount).quantize(Decimal("0.01"))
    try:
        tax_rate = Decimal(str(estimate.get("tax_rate_pct") or 16))
    except (TypeError, ValueError, ArithmeticError):
        tax_rate = Decimal("16")
    tax = (subtotal * tax_rate / Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    total = (subtotal + tax).quantize(Decimal("0.01"))

    valid_days = int(estimate.get("valid_days") or 30)
    from datetime import timedelta
    valid_until = (datetime.utcnow() + timedelta(days=valid_days)).date()

    assumptions = "\n".join(f"- {a}" for a in (estimate.get("assumptions") or []))
    exclusions = "\n".join(f"- {a}" for a in (estimate.get("exclusions") or []))
    deliverables_md = "\n".join(f"- {d}" for d in (estimate.get("deliverables") or []))
    notes_blob = ""
    parts = []
    if estimate.get("scope_summary"):
        parts.append(f"## Alcance\n\n{estimate['scope_summary']}")
    if deliverables_md:
        parts.append(f"## Entregables\n\n{deliverables_md}")
    meta_bits = []
    if estimate.get("complexity_level"):
        meta_bits.append(f"**Complejidad:** {estimate['complexity_level']}")
    if estimate.get("estimated_dev_weeks"):
        meta_bits.append(f"**Duración estimada:** {estimate['estimated_dev_weeks']} semanas")
    if estimate.get("commercial_model"):
        meta_bits.append(f"**Modelo comercial:** {estimate['commercial_model']}")
    if meta_bits:
        parts.append("## Resumen ejecutivo\n\n" + "  \n".join(meta_bits))
    if assumptions:
        parts.append(f"## Supuestos\n\n{assumptions}")
    if exclusions:
        parts.append(f"## Exclusiones\n\n{exclusions}")
    if estimate.get("pricing_rationale"):
        parts.append(f"## Justificación\n\n{estimate['pricing_rationale']}")
    notes_blob = "\n\n".join(parts)[:65000]

    terms = (
        f"Cotización generada por análisis de IA (cost_estimation). "
        f"Vigencia: {valid_days} días. IVA {tax_rate}% incluido en el total. "
        f"Modelo comercial: {estimate.get('commercial_model') or 'FIXED_PRICE'}."
    )[:65000]

    db.execute(
        text(
            "INSERT INTO quotes "
            "(id, created_at, updated_at, workspace_id, is_deleted, "
            " folio, deal_id, client_id, status, currency, "
            " subtotal, tax_rate, tax, total, valid_until, terms, notes) "
            "VALUES (:id, :now, :now, :ws, FALSE, "
            " :folio, :did, :cid, 'draft', 'MXN', "
            " :sub, :tr, :tax, :tot, :vu, :terms, :notes)"
        ),
        {
            "id": quote_id, "now": now, "ws": workspace_id, "folio": folio,
            "did": deal_id, "cid": client_id,
            "sub": subtotal, "tr": tax_rate, "tax": tax, "tot": total,
            "vu": valid_until, "terms": terms, "notes": notes_blob,
        },
    )
    for it in items:
        db.execute(
            text(
                "INSERT INTO quote_items "
                "(id, created_at, updated_at, workspace_id, is_deleted, "
                " quote_id, position, description, qty, unit, unit_price, amount, notes) "
                "VALUES (:id, :now, :now, :ws, FALSE, "
                " :qid, :pos, :desc, :qty, :unit, :up, :amt, :notes)"
            ),
            {
                "id": str(uuid.uuid4()), "now": now, "ws": workspace_id,
                "qid": quote_id, "pos": it["position"], "desc": it["description"],
                "qty": it["qty"], "unit": it["unit"],
                "up": it["unit_price"], "amt": it["amount"],
                "notes": it.get("notes"),
            },
        )

    record_audit(db, workspace_id=workspace_id, user_id=user_id,
                 module="quotes", action="create.from_estimate",
                 record_id=quote_id,
                 payload_delta={
                     "analysis_id": analysis_id,
                     "complexity": estimate.get("complexity_level"),
                     "weeks": estimate.get("estimated_dev_weeks"),
                     "subtotal_mxn": str(subtotal),
                     "total_mxn": str(total),
                     "items": len(items),
                 })
    return [{
        "id": quote_id, "folio": folio, "type": "quote",
        "subtotal_mxn": str(subtotal), "total_mxn": str(total),
        "items_count": len(items),
        "complexity": estimate.get("complexity_level"),
        "weeks": estimate.get("estimated_dev_weeks"),
    }]


def _apply_cs_pulse(db, workspace_id, user_id, meeting, pulse, analysis_id):
    """cs_checkin: nudge client.health_score from sentiment + log a People-style insight."""
    client_id = meeting.get("client_id")
    if not pulse or not client_id:
        return []
    now = _now()
    sig = pulse.get("satisfaction_signal")
    delta = None
    if isinstance(sig, (int, float)):
        # -2..+2 maps to roughly -10..+10 on health_score
        delta = max(-10, min(10, int(sig) * 5))
    if delta is not None:
        db.execute(
            text(
                "UPDATE clients SET "
                "  health_score = LEAST(100, GREATEST(0, COALESCE(health_score, 70) + :d)), "
                "  updated_at = :now "
                "WHERE id = :id AND workspace_id = :ws AND is_deleted = FALSE"
            ),
            {"d": delta, "now": now, "id": client_id, "ws": workspace_id},
        )
    record_audit(db, workspace_id=workspace_id, user_id=user_id,
                 module="crm.clients", action="cs_pulse.from_meeting",
                 record_id=client_id,
                 payload_delta={"analysis_id": analysis_id, "delta": delta, **pulse})
    return [{"id": client_id, "type": "cs_pulse", "delta": delta}]


def _apply_supplier_review(db, workspace_id, user_id, meeting, review, analysis_id):
    """supplier_review: update an existing supplier (match by name) with the latest scorecard."""
    if not review or not review.get("name"):
        return []
    now = _now()
    name = review["name"][:255]
    rl = (review.get("risk_level") or "MEDIUM").upper()
    if rl not in {"LOW", "MEDIUM", "HIGH"}:
        rl = "MEDIUM"
    perf = review.get("performance_score")

    # Find existing supplier by name within workspace
    row = db.execute(
        text("SELECT id FROM suppliers WHERE workspace_id = :ws AND is_deleted = FALSE "
             "  AND name = :n LIMIT 1"),
        {"ws": workspace_id, "n": name},
    ).fetchone()
    if row:
        supplier_id = row._mapping["id"]
        db.execute(
            text(
                "UPDATE suppliers SET "
                "  performance_score = COALESCE(:ps, performance_score), "
                "  risk_level = :rl, "
                "  notes = COALESCE(NULLIF(:notes, ''), notes), "
                "  updated_at = :now "
                "WHERE id = :id AND workspace_id = :ws"
            ),
            {"ps": perf, "rl": rl,
             "notes": (review.get("notes") or "")[:65000],
             "now": now, "id": supplier_id, "ws": workspace_id},
        )
        action = "review_update"
    else:
        # Create on the fly so the review has a target to attach to
        supplier_id = str(uuid.uuid4())
        db.execute(
            text(
                "INSERT INTO suppliers "
                "(id, created_at, updated_at, workspace_id, is_deleted, "
                " name, category, status, performance_score, risk_level, notes) "
                "VALUES (:id, :now, :now, :ws, FALSE, :n, 'OTHER', 'PENDING', "
                "        :ps, :rl, :notes)"
            ),
            {"id": supplier_id, "now": now, "ws": workspace_id, "n": name,
             "ps": perf, "rl": rl,
             "notes": (review.get("notes") or "")[:65000]},
        )
        action = "create_from_review"
    record_audit(db, workspace_id=workspace_id, user_id=user_id,
                 module="suppliers", action=f"{action}.from_meeting",
                 record_id=supplier_id,
                 payload_delta={"analysis_id": analysis_id, **review})
    return [{"id": supplier_id, "name": name, "type": "supplier_review",
             "action": action}]


def _apply_one_on_one(db, workspace_id, user_id, meeting, payload, analysis_id):
    """one_on_one: log as a People insight (no dedicated HR table yet).

    Sensitive — store only structured signals, not full transcript.
    """
    if not payload:
        return []
    sev_map = {"high": "HIGH", "medium": "MEDIUM", "low": "LOW"}
    burnout = (payload.get("burnout_risk") or "low").lower()
    severity = sev_map.get(burnout, "INFO")
    morale = payload.get("morale") or "—"
    title = (f"1:1 — {payload.get('report_name') or 'team member'}: "
             f"morale={morale} burnout={burnout}")[:500]
    desc_lines = []
    if payload.get("blockers"):
        desc_lines.append("Blockers: " + "; ".join(payload["blockers"]))
    if payload.get("growth_topics"):
        desc_lines.append("Growth: " + "; ".join(payload["growth_topics"]))
    if payload.get("follow_ups"):
        desc_lines.append("Follow-ups: " + "; ".join(payload["follow_ups"]))
    return _insert_insights(
        db, workspace_id, user_id, meeting,
        [{
            "module": "People", "insight_type": "one_on_one",
            "title": title, "description": "\n".join(desc_lines),
            "severity": severity,
            "report_name": payload.get("report_name"),
            "manager_name": payload.get("manager_name"),
        }],
        analysis_id,
    )


# ─── Day 24 writers (insight-backed for analyzers without dedicated tables) ──

def _log_structured_insight(
    db, workspace_id, user_id, meeting, *,
    module: str, insight_type: str, title: str,
    description: str, severity: str, payload: dict[str, Any], analysis_id: str,
):
    sev = severity.upper()
    if sev not in {"INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"}:
        sev = "INFO"
    return _insert_insights(
        db, workspace_id, user_id, meeting,
        [{"module": module, "insight_type": insight_type,
          "title": title[:500], "description": description,
          "severity": sev, **payload}],
        analysis_id,
    )


def _apply_adr(db, workspace_id, user_id, meeting, adr, analysis_id):
    if not adr:
        return []
    parts = []
    for k in ("context", "decision"):
        if adr.get(k):
            parts.append(f"{k.title()}: {adr[k]}")
    if adr.get("alternatives_considered"):
        parts.append("Alternatives: " + "; ".join(adr["alternatives_considered"]))
    if adr.get("consequences"):
        parts.append("Consequences: " + "; ".join(adr["consequences"]))
    return _log_structured_insight(
        db, workspace_id, user_id, meeting,
        module="Architecture", insight_type="adr",
        title=f"ADR — {adr.get('title') or 'Untitled decision'}",
        description="\n".join(parts),
        severity="MEDIUM" if (adr.get("status") or "proposed") == "proposed" else "INFO",
        payload={"adr": adr}, analysis_id=analysis_id,
    )


def _apply_stage_gate(db, workspace_id, user_id, meeting, gate, analysis_id):
    if not gate:
        return []
    out: list[dict[str, Any]] = []
    if gate.get("current_phase"):
        out += _update_project_phase(db, workspace_id, user_id, meeting,
                                     gate["current_phase"], analysis_id)
    decision = (gate.get("decision") or "go").lower()
    sev_map = {"go": "INFO", "conditional_go": "MEDIUM", "hold": "HIGH", "kill": "CRITICAL"}
    out += _log_structured_insight(
        db, workspace_id, user_id, meeting,
        module="PMO", insight_type="stage_gate",
        title=f"Stage-gate: {decision.upper()} ({gate.get('current_phase') or 'phase n/a'})",
        description="; ".join(gate.get("conditions") or []) or "(no conditions)",
        severity=sev_map.get(decision, "INFO"),
        payload={"stage_gate": gate}, analysis_id=analysis_id,
    )
    return out


def _apply_capacity_signals(db, workspace_id, user_id, meeting, signals, analysis_id):
    if not signals:
        return []
    out: list[dict[str, Any]] = []
    sev_map = {"low": "LOW", "medium": "MEDIUM", "high": "HIGH"}
    for s in signals:
        sev = sev_map.get((s.get("gap_severity") or "low").lower(), "INFO")
        out += _log_structured_insight(
            db, workspace_id, user_id, meeting,
            module="PMO", insight_type="capacity",
            title=f"Capacity gap — {s.get('role')}: {s.get('current_fte')}→{s.get('needed_fte')} FTE",
            description=f"Recommended action: {s.get('action') or 'n/a'}",
            severity=sev, payload={"capacity_signal": s}, analysis_id=analysis_id,
        )
    return out


def _apply_renewal(db, workspace_id, user_id, meeting, renewal, analysis_id):
    if not renewal:
        return []
    out: list[dict[str, Any]] = []
    decision = (renewal.get("decision") or "undecided").lower()
    sev_map = {"renew": "INFO", "expand": "INFO", "downgrade": "MEDIUM",
               "churn": "HIGH", "undecided": "LOW"}
    out += _log_structured_insight(
        db, workspace_id, user_id, meeting,
        module="CRM", insight_type="renewal",
        title=f"Renewal: {decision.upper()} (uplift {renewal.get('uplift_pct') or 0}%)",
        description="; ".join(renewal.get("blockers") or []) or "(no blockers)",
        severity=sev_map.get(decision, "INFO"),
        payload={"renewal": renewal}, analysis_id=analysis_id,
    )
    client_id = meeting.get("client_id")
    if client_id and decision == "churn":
        db.execute(
            text("UPDATE clients SET health_score = LEAST(100, GREATEST(0, "
                 "  COALESCE(health_score, 70) - 20)), updated_at = :now "
                 "WHERE id = :id AND workspace_id = :ws AND is_deleted = FALSE"),
            {"now": _now(), "id": client_id, "ws": workspace_id},
        )
        record_audit(db, workspace_id=workspace_id, user_id=user_id,
                     module="crm.clients", action="health_drop.renewal_churn",
                     record_id=client_id,
                     payload_delta={"analysis_id": analysis_id, "delta": -20})
        out.append({"id": client_id, "type": "client_health_drop"})
    return out


def _apply_win_loss(db, workspace_id, user_id, meeting, wl, analysis_id):
    if not wl:
        return []
    outcome = (wl.get("outcome") or "lost").lower()
    parts = []
    if wl.get("dominant_reasons"):
        parts.append("Reasons: " + ", ".join(wl["dominant_reasons"]))
    if wl.get("competitor"):
        parts.append(f"Competitor: {wl['competitor']}")
    if wl.get("lessons_learned"):
        parts.append("Lessons: " + "; ".join(wl["lessons_learned"]))
    return _log_structured_insight(
        db, workspace_id, user_id, meeting,
        module="CRM", insight_type="win_loss",
        title=f"{outcome.upper()} — {meeting.get('title') or 'deal review'}",
        description="\n".join(parts),
        severity="INFO" if outcome == "won" else "MEDIUM",
        payload={"win_loss": wl}, analysis_id=analysis_id,
    )


def _apply_hiring_panel(db, workspace_id, user_id, meeting, panel, analysis_id):
    if not panel:
        return []
    decision = (panel.get("decision") or "hold").lower()
    sev_map = {"hire": "INFO", "no_hire": "MEDIUM", "extend_loop": "LOW", "hold": "LOW"}
    sc = panel.get("scorecard") or {}
    parts = [
        f"Decision: {decision} | Role: {panel.get('role')} | Level: {panel.get('level_assessed')}",
        f"Scorecard: tech={sc.get('technical')} sysd={sc.get('system_design')} "
        f"comm={sc.get('communication')} culture={sc.get('culture')}",
    ]
    if panel.get("strengths"):
        parts.append("Strengths: " + "; ".join(panel["strengths"]))
    if panel.get("concerns"):
        parts.append("Concerns: " + "; ".join(panel["concerns"]))
    return _log_structured_insight(
        db, workspace_id, user_id, meeting,
        module="People", insight_type="hiring_panel",
        title=f"Panel — {panel.get('candidate_alias')} → {decision.upper()}",
        description="\n".join(parts),
        severity=sev_map.get(decision, "INFO"),
        payload={"panel": panel}, analysis_id=analysis_id,
    )


def _apply_performance_review(db, workspace_id, user_id, meeting, pr, analysis_id):
    if not pr:
        return []
    rating = (pr.get("rating") or "meets").lower()
    sev_map = {"exceeds": "INFO", "meets": "INFO", "developing": "LOW", "below": "MEDIUM"}
    parts = [f"Rating: {rating} | Promotion: {pr.get('promotion_signal')} | Comp: {pr.get('comp_action_signal')}"]
    for k in ("strengths", "growth_areas", "goals_next_cycle"):
        if pr.get(k):
            parts.append(f"{k.replace('_', ' ').title()}: " + "; ".join(pr[k]))
    return _log_structured_insight(
        db, workspace_id, user_id, meeting,
        module="People", insight_type="performance_review",
        title=f"Perf review — {pr.get('report_name')}: {rating.upper()}",
        description="\n".join(parts),
        severity=sev_map.get(rating, "INFO"),
        payload={"performance_review": pr}, analysis_id=analysis_id,
    )


def _apply_bug_triage(db, workspace_id, user_id, meeting, triaged, analysis_id):
    """bug_triage.triaged_bugs → reuse _update_task_statuses by remapping fields."""
    if not triaged:
        return []
    remapped = []
    for b in triaged:
        remapped.append({
            "task_id": b.get("task_id"),
            "title_match": b.get("title_match"),
            "new_status": b.get("new_status") or "in_progress",
            "progress_note": (f"Triage: {b.get('decision_note') or 'reviewed'} "
                              f"| priority={b.get('new_priority')} "
                              f"| assignee={b.get('assignee') or '—'}"),
            "blocker_reason": None,
        })
    return _update_task_statuses(db, workspace_id, user_id, meeting, remapped, analysis_id)


def _apply_task_estimates(db, workspace_id, user_id, meeting, estimates, analysis_id):
    """backlog_refinement.task_estimates → update tasks.points + status note."""
    if not estimates:
        return []
    pid = meeting.get("project_id")
    if not pid:
        return []
    out: list[dict[str, Any]] = []
    now = _now()
    for e in estimates:
        task_id = _resolve_task_id(db, workspace_id, pid,
                                   e.get("task_id"), e.get("title_match"))
        if not task_id:
            continue
        db.execute(
            text("UPDATE tasks SET points = COALESCE(:pts, points), updated_at = :now "
                 "WHERE id = :id AND workspace_id = :ws AND is_deleted = FALSE"),
            {"pts": int(e.get("story_points") or 0) or None,
             "now": now, "id": task_id, "ws": workspace_id},
        )
        record_audit(db, workspace_id=workspace_id, user_id=user_id,
                     module="pm.tasks", action="estimate.from_meeting",
                     record_id=task_id,
                     payload_delta={"analysis_id": analysis_id, **e})
        out.append({"id": task_id, "type": "task_estimate"})
    return out


def _resolve_task_id(db, workspace_id: str, project_id: str | None,
                    task_id_prefix: str | None, title_match: str | None) -> str | None:
    """Resolve an 8-char task_id prefix or a fuzzy title match to a full task UUID."""
    if not project_id:
        return None
    if task_id_prefix:
        row = db.execute(
            text("SELECT id FROM tasks WHERE workspace_id = :ws AND project_id = :pid "
                 "AND is_deleted = FALSE AND id LIKE :prefix LIMIT 1"),
            {"ws": workspace_id, "pid": project_id, "prefix": f"{task_id_prefix}%"},
        ).fetchone()
        if row:
            return row._mapping["id"]
    if title_match:
        row = db.execute(
            text("SELECT id FROM tasks WHERE workspace_id = :ws AND project_id = :pid "
                 "AND is_deleted = FALSE AND title LIKE :pat "
                 "ORDER BY updated_at DESC LIMIT 1"),
            {"ws": workspace_id, "pid": project_id, "pat": f"%{title_match[:80]}%"},
        ).fetchone()
        if row:
            return row._mapping["id"]
    return None


def _update_task_statuses(db, workspace_id, user_id, meeting, updates, analysis_id):
    """daily_standup: bulk-update task.status by task_id_prefix or title match."""
    pid = meeting.get("project_id")
    if not pid or not updates:
        return []
    valid = {"backlog", "todo", "in_progress", "review", "blocked", "done"}
    out: list[dict[str, Any]] = []
    now = _now()
    for upd in updates:
        new_status = (upd.get("new_status") or "").lower()
        if new_status not in valid:
            continue
        task_id = _resolve_task_id(db, workspace_id, pid,
                                   upd.get("task_id"), upd.get("title_match"))
        if not task_id:
            continue
        db.execute(
            text("UPDATE tasks SET status = :s, updated_at = :now "
                 "WHERE id = :id AND workspace_id = :ws AND is_deleted = FALSE"),
            {"s": new_status, "now": now, "id": task_id, "ws": workspace_id},
        )
        record_audit(db, workspace_id=workspace_id, user_id=user_id,
                     module="pm.tasks", action=f"status.{new_status}",
                     record_id=task_id,
                     payload_delta={"analysis_id": analysis_id,
                                    "progress_note": upd.get("progress_note"),
                                    "blocker_reason": upd.get("blocker_reason")})
        out.append({"id": task_id, "type": "task_status", "new_status": new_status})
    return out


def _plan_sprint(db, workspace_id, user_id, meeting, plan, analysis_id):
    """sprint_planning / internal_kickoff: create a new sprint or update PLANNED one."""
    pid = meeting.get("project_id")
    if not pid or not plan or not plan.get("name"):
        return []
    now = _now()
    # Reuse latest PLANNED sprint if any
    row = db.execute(
        text("SELECT id FROM sprints WHERE project_id = :pid AND workspace_id = :ws "
             "AND is_deleted = FALSE AND status = 'PLANNED' ORDER BY created_at DESC LIMIT 1"),
        {"pid": pid, "ws": workspace_id},
    ).fetchone()
    if row:
        sprint_id = row._mapping["id"]
        db.execute(
            text("UPDATE sprints SET name = :n, goal = :g, "
                 "  story_points_planned = COALESCE(:p, story_points_planned), "
                 "  start_date = COALESCE(:sd, start_date), end_date = COALESCE(:ed, end_date), "
                 "  updated_at = :now WHERE id = :id AND workspace_id = :ws"),
            {"n": plan["name"][:255], "g": (plan.get("goal") or "")[:500],
             "p": plan.get("story_points_planned"),
             "sd": plan.get("start_date"), "ed": plan.get("end_date"),
             "now": now, "id": sprint_id, "ws": workspace_id},
        )
        action = "update"
    else:
        sprint_id = str(uuid.uuid4())
        db.execute(
            text("INSERT INTO sprints "
                 "(id, created_at, updated_at, workspace_id, is_deleted, "
                 " project_id, name, status, story_points_planned, "
                 " start_date, end_date, goal) "
                 "VALUES (:id, :now, :now, :ws, FALSE, :pid, :n, 'PLANNED', "
                 "        :p, :sd, :ed, :g)"),
            {"id": sprint_id, "now": now, "ws": workspace_id, "pid": pid,
             "n": plan["name"][:255], "p": int(plan.get("story_points_planned") or 0),
             "sd": plan.get("start_date"), "ed": plan.get("end_date"),
             "g": (plan.get("goal") or "")[:500]},
        )
        action = "create"
    record_audit(db, workspace_id=workspace_id, user_id=user_id,
                 module="pm.sprints", action=f"{action}.from_meeting",
                 record_id=sprint_id, payload_delta={"analysis_id": analysis_id, **plan})
    return [{"id": sprint_id, "type": "sprint_plan", "action": action}]


def _assign_tasks_to_sprint(db, workspace_id, user_id, meeting,
                             assignments, analysis_id, *, sprint_plan=None):
    """sprint_planning: link existing backlog tasks to the latest PLANNED/ACTIVE sprint.

    Self-healing behaviour:
      - If no sprint exists, auto-create one from `sprint_plan` (or a default).
      - If `task_id`/`title_match` resolves to no real task, create the task on-the-fly
        in the backlog and assign it to the sprint.
    """
    pid = meeting.get("project_id")
    if not pid or not assignments:
        return []
    row = db.execute(
        text("SELECT id FROM sprints WHERE project_id = :pid AND workspace_id = :ws "
             "AND is_deleted = FALSE AND status IN ('PLANNED','ACTIVE') "
             "ORDER BY status DESC, created_at DESC LIMIT 1"),
        {"pid": pid, "ws": workspace_id},
    ).fetchone()
    out: list[dict[str, Any]] = []
    now = _now()
    if row:
        sprint_id = row._mapping["id"]
    else:
        # Auto-create a sprint from the provided plan (or a sensible default)
        plan = dict(sprint_plan or {})
        if not plan.get("name"):
            plan["name"] = f"Sprint from {meeting.get('title') or 'meeting'}"[:255]
        plan.setdefault("goal", "")
        created_sprint = _plan_sprint(db, workspace_id, user_id, meeting, plan, analysis_id)
        if not created_sprint:
            return []
        sprint_id = created_sprint[0]["id"]
        out += created_sprint
    for a in assignments:
        task_id = _resolve_task_id(db, workspace_id, pid,
                                   a.get("task_id"), a.get("title_match"))
        if not task_id:
            # Create the task in the backlog so we can assign it
            title = (a.get("title_match") or a.get("title")
                     or f"Task from {meeting.get('title') or 'meeting'}")
            task_id = str(uuid.uuid4())
            db.execute(
                text("INSERT INTO tasks "
                     "(id, created_at, updated_at, workspace_id, is_deleted, "
                     " project_id, title, status, task_type, priority, points) "
                     "VALUES (:id, :now, :now, :ws, FALSE, :pid, :t, 'todo', "
                     "        'FEATURE', 'medium', :pts)"),
                {"id": task_id, "now": now, "ws": workspace_id, "pid": pid,
                 "t": str(title)[:255], "pts": int(a.get("story_points") or 0)},
            )
            record_audit(db, workspace_id=workspace_id, user_id=user_id,
                         module="pm.tasks", action="create.from_meeting",
                         record_id=task_id,
                         payload_delta={"analysis_id": analysis_id, "title": title})
        db.execute(
            text("UPDATE tasks SET sprint_id = :sid, "
                 "  points = COALESCE(NULLIF(:pts, 0), points), "
                 "  description = CONCAT(COALESCE(description, ''), '\\nAssigned to: ', :assignee), "
                 "  updated_at = :now "
                 "WHERE id = :id AND workspace_id = :ws AND is_deleted = FALSE"),
            {"sid": sprint_id, "pts": int(a.get("story_points") or 0),
             "assignee": (a.get("assignee") or "—")[:80],
             "now": now, "id": task_id, "ws": workspace_id},
        )
        record_audit(db, workspace_id=workspace_id, user_id=user_id,
                     module="pm.tasks", action="assign.sprint",
                     record_id=task_id,
                     payload_delta={"analysis_id": analysis_id, "sprint_id": sprint_id,
                                    "assignee": a.get("assignee")})
        out.append({"id": task_id, "type": "task_assignment", "sprint_id": sprint_id})
    return out


def _update_project_phase(db, workspace_id, user_id, meeting, new_phase, analysis_id):
    pid = meeting.get("project_id")
    if not pid or not new_phase:
        return []
    now = _now()
    db.execute(
        text("UPDATE projects SET phase = :ph, updated_at = :now "
             "WHERE id = :id AND workspace_id = :ws AND is_deleted = FALSE"),
        {"ph": str(new_phase)[:100], "now": now, "id": pid, "ws": workspace_id},
    )
    record_audit(db, workspace_id=workspace_id, user_id=user_id,
                 module="pm.projects", action="phase_update.from_meeting",
                 record_id=pid,
                 payload_delta={"analysis_id": analysis_id, "phase": new_phase})
    return [{"id": pid, "type": "project_phase", "phase": new_phase}]


# ──────────────────────────────────────────────────────────────────────────
# Universal apply: routes selections to the right writer based on analyzer
# ──────────────────────────────────────────────────────────────────────────

def apply_recommendations(
    *,
    analysis_id: str,
    selections: dict[str, Any],
    workspace_id: str,
    user_id: str,
) -> list[dict[str, Any]]:
    """Apply selected recommendations from a completed analysis to the
    appropriate target tables.

    `selections` is an object describing which recommendations to apply.
    Recognized keys:
      action_items: [int]   indices of generic action_items to convert to tasks
      risks: [int]          indices of risks (project_kickoff/pmo/compliance)
      initial_tasks: [int]  indices of extracted.initial_tasks (kickoff)
      next_sprint_tasks: [int]
      compliance_tasks: [int]
      insights: [int]
      create_client: bool   create extracted.client (lead_qualification)
      create_deal: bool     create extracted.deal
      update_deal: bool     update existing deal (sales_followup)
      create_rfq: bool
      update_project: bool
      update_client: bool
      update_sprint: bool
      create_supplier: bool

    Returns a list of created/updated records: [{type, id, ...}]
    """
    analysis = get_analysis(analysis_id, workspace_id)
    if analysis is None:
        raise ValueError("Analysis not found")
    if analysis.get("status") != "completed":
        raise ValueError("Analysis is not completed")

    output = analysis.get("output") or {}
    extracted: dict[str, Any] = output.get("extracted") or {}
    meeting_id = analysis["meeting_id"]

    # full meeting row (needs project_id/client_id/deal_id)
    with SessionLocal() as db:
        row = db.execute(
            text("SELECT id, title, project_id, client_id, deal_id "
                 "FROM meetings WHERE id = :id AND workspace_id = :ws AND is_deleted = FALSE"),
            {"id": meeting_id, "ws": workspace_id},
        ).fetchone()
        if not row:
            raise ValueError("Linked meeting not found")
        meeting = dict(row._mapping)

    created: list[dict[str, Any]] = []
    # ── Idempotence: track applied selections in output["applied_selections"]
    # Format: { "<key>": [indices] | true } depending on whether the selection
    # is index-based (action_items, new_tasks, …) or a boolean flag (create_deal,
    # update_project, plan_sprint, …).
    prev_applied: dict[str, Any] = dict(output.get("applied_selections") or {})

    INDEXED_KEYS = (
        "action_items", "risks", "initial_tasks", "next_sprint_tasks",
        "compliance_tasks", "insights", "cross_project_risks",
        "task_status_updates", "task_assignments", "new_tasks",
        "bugs_found", "improvement_actions", "preventive_actions",
        # Day 24 — additional list-based extractions
        "onboarding_checklist", "follow_up_tasks",
    )
    FLAG_KEYS = (
        "create_client", "create_deal", "update_deal", "create_rfq",
        "update_project", "update_client", "update_sprint", "create_supplier",
        "plan_sprint", "create_first_sprint", "update_project_phase",
        "apply_change_deal_update", "apply_change_project_update",
        "create_change_order",
        # Day 23 — module-coverage expansion
        "create_contract", "create_proposal", "apply_proposal_deal_update",
        "apply_cs_pulse", "apply_supplier_review", "apply_one_on_one",
        # Voz → cotización automática (MXN)
        "create_quote_from_estimate",
        # Day 24 — role-coverage expansion
        "apply_adr", "apply_stage_gate", "apply_capacity_signals",
        "apply_renewal", "apply_renewal_deal_update",
        "apply_win_loss", "apply_hiring_panel", "apply_performance_review",
        "apply_bug_triage", "apply_task_estimates",
    )

    # Filter out indices that were already applied
    new_applied: dict[str, Any] = {}
    for k in INDEXED_KEYS:
        idxs = selections.get(k) or []
        if not idxs:
            continue
        prev = set(prev_applied.get(k, []) if isinstance(prev_applied.get(k), list) else [])
        fresh = [i for i in idxs if i not in prev]
        selections[k] = fresh
        if fresh:
            new_applied[k] = fresh

    for k in FLAG_KEYS:
        if selections.get(k) and prev_applied.get(k) is True:
            selections[k] = False  # already applied — skip
        elif selections.get(k):
            new_applied[k] = True

    # Short-circuit: nothing new to apply
    if not any(selections.get(k) for k in INDEXED_KEYS) and not any(
            selections.get(k) for k in FLAG_KEYS):
        return []

    with SessionLocal() as db:
        # ── action_items → tasks
        ai_indices = selections.get("action_items") or []
        if ai_indices:
            items = [output.get("action_items", [])[i] for i in ai_indices
                     if 0 <= i < len(output.get("action_items") or [])]
            created += _insert_action_items_as_tasks(db, workspace_id, user_id, meeting, items, analysis_id)

        # ── risks → risk_items
        risk_indices = selections.get("risks") or []
        if risk_indices:
            risks = [output.get("risks", [])[i] for i in risk_indices
                     if 0 <= i < len(output.get("risks") or [])]
            created += _insert_risk_items(db, workspace_id, user_id, meeting, risks, analysis_id)

        # ── initial_tasks (kickoff) → tasks
        for key in ("initial_tasks", "next_sprint_tasks", "compliance_tasks"):
            idxs = selections.get(key) or []
            arr = extracted.get(key) or []
            if idxs:
                items = [arr[i] for i in idxs if 0 <= i < len(arr)]
                created += _insert_action_items_as_tasks(db, workspace_id, user_id, meeting, items, analysis_id)

        # ── new_tasks / bugs_found / improvement_actions / preventive_actions
        # (delivery-cycle analyzers all funnel into the tasks table)
        for key in ("new_tasks", "bugs_found", "improvement_actions",
                    "preventive_actions", "onboarding_checklist", "follow_up_tasks"):
            idxs = selections.get(key) or []
            arr = extracted.get(key) or []
            if idxs:
                items = [arr[i] for i in idxs if 0 <= i < len(arr)]
                created += _insert_action_items_as_tasks(db, workspace_id, user_id, meeting, items, analysis_id)

        # ── daily_standup: bulk task status updates
        tsu_idxs = selections.get("task_status_updates") or []
        tsu_arr = extracted.get("task_status_updates") or []
        if tsu_idxs:
            updates = [tsu_arr[i] for i in tsu_idxs if 0 <= i < len(tsu_arr)]
            created += _update_task_statuses(db, workspace_id, user_id, meeting, updates, analysis_id)

        # ── sprint_planning: create/update sprint + assign tasks
        if selections.get("plan_sprint") and extracted.get("sprint_plan"):
            created += _plan_sprint(db, workspace_id, user_id, meeting,
                                    extracted["sprint_plan"], analysis_id)
        ta_idxs = selections.get("task_assignments") or []
        ta_arr = extracted.get("task_assignments") or []
        if ta_idxs:
            asg = [ta_arr[i] for i in ta_idxs if 0 <= i < len(ta_arr)]
            created += _assign_tasks_to_sprint(db, workspace_id, user_id, meeting,
                                               asg, analysis_id,
                                               sprint_plan=extracted.get("sprint_plan"))

        # ── internal_kickoff: first sprint shortcut
        if selections.get("create_first_sprint") and extracted.get("first_sprint"):
            created += _plan_sprint(db, workspace_id, user_id, meeting,
                                    extracted["first_sprint"], analysis_id)

        # ── uat_session: project phase update
        if selections.get("update_project_phase"):
            phase = (extracted.get("uat_result") or {}).get("next_phase") \
                or extracted.get("project_phase_update")
            if phase:
                created += _update_project_phase(db, workspace_id, user_id, meeting,
                                                 phase, analysis_id)

        # ── change_request: deal + project updates piggy-back on existing writers
        if selections.get("apply_change_deal_update") and extracted.get("deal_update"):
            created += _update_deal(db, workspace_id, user_id, meeting,
                                    extracted["deal_update"], analysis_id)
        if selections.get("apply_change_project_update") and extracted.get("project_update"):
            created += _update_project(db, workspace_id, user_id, meeting,
                                       extracted["project_update"], analysis_id)
        if selections.get("create_change_order") and extracted.get("change_request"):
            created += _create_change_order(db, workspace_id, user_id, meeting,
                                            extracted["change_request"], analysis_id)

        # ── insights
        ins_indices = selections.get("insights") or []
        ins_arr = extracted.get("insights") or []
        if ins_indices:
            insights = [ins_arr[i] for i in ins_indices if 0 <= i < len(ins_arr)]
            created += _insert_insights(db, workspace_id, user_id, meeting, insights, analysis_id)

        # ── cross_project_risks (pmo)
        cpr_indices = selections.get("cross_project_risks") or []
        cpr_arr = extracted.get("cross_project_risks") or []
        if cpr_indices:
            risks = [cpr_arr[i] for i in cpr_indices if 0 <= i < len(cpr_arr)]
            created += _insert_risk_items(db, workspace_id, user_id, meeting, risks, analysis_id)

        # ── lead_qualification: client + deal
        if selections.get("create_client") or selections.get("create_deal"):
            # Pass extracted root so _upsert_client_and_deal can access ai_score
            meeting_with_extracted = {**meeting, "_extracted_root": extracted}
            created += _upsert_client_and_deal(
                db, workspace_id, user_id, meeting_with_extracted,
                extracted.get("client") if selections.get("create_client") else None,
                extracted.get("deal") if selections.get("create_deal") else None,
                analysis_id,
            )

        # ── sales_followup
        if selections.get("update_deal") and extracted.get("deal_update"):
            created += _update_deal(db, workspace_id, user_id, meeting,
                                    extracted["deal_update"], analysis_id)

        # ── discovery_rfq
        if selections.get("create_rfq") and extracted.get("rfq"):
            created += _upsert_rfq(db, workspace_id, user_id, meeting,
                                   extracted["rfq"], analysis_id)

        # ── project_kickoff
        if selections.get("update_project") and extracted.get("project_update"):
            created += _update_project(db, workspace_id, user_id, meeting,
                                       extracted["project_update"], analysis_id)

        # ── client_qbr
        if selections.get("update_client") and extracted.get("client_update"):
            created += _update_client(db, workspace_id, user_id, meeting,
                                      extracted["client_update"], analysis_id)

        # ── sprint_review
        if selections.get("update_sprint") and extracted.get("sprint_update"):
            created += _update_sprint(db, workspace_id, user_id, meeting,
                                      extracted["sprint_update"], analysis_id)

        # ── supplier_negotiation
        if selections.get("create_supplier") and extracted.get("supplier_update"):
            created += _upsert_supplier(db, workspace_id, user_id, meeting,
                                        extracted["supplier_update"], analysis_id)

        # ── Day 23 — module-coverage expansion ──────────────────────────
        # contract_review
        if selections.get("create_contract") and extracted.get("contract_update"):
            created += _upsert_contract(db, workspace_id, user_id, meeting,
                                        extracted["contract_update"], analysis_id)

        # proposal_review (creates a draft proposal + optionally bumps the deal)
        if selections.get("create_proposal") and extracted.get("proposal"):
            created += _create_proposal(db, workspace_id, user_id, meeting,
                                        extracted["proposal"], analysis_id)
        if selections.get("apply_proposal_deal_update") and extracted.get("deal_update"):
            created += _update_deal(db, workspace_id, user_id, meeting,
                                    extracted["deal_update"], analysis_id)

        # cost_estimation → quote real en MXN con line items por equipo/infra
        if selections.get("create_quote_from_estimate") and extracted.get("estimate"):
            created += _create_quote_from_estimate(db, workspace_id, user_id, meeting,
                                                   extracted["estimate"], analysis_id)

        # cs_checkin
        if selections.get("apply_cs_pulse") and extracted.get("cs_pulse"):
            created += _apply_cs_pulse(db, workspace_id, user_id, meeting,
                                       extracted["cs_pulse"], analysis_id)

        # supplier_review
        if selections.get("apply_supplier_review") and extracted.get("supplier_review"):
            created += _apply_supplier_review(db, workspace_id, user_id, meeting,
                                              extracted["supplier_review"], analysis_id)

        # one_on_one
        if selections.get("apply_one_on_one") and extracted.get("one_on_one"):
            created += _apply_one_on_one(db, workspace_id, user_id, meeting,
                                         extracted["one_on_one"], analysis_id)

        # ── Day 24 — role-coverage expansion ──────────────────────────
        # architecture_review
        if selections.get("apply_adr") and extracted.get("adr"):
            created += _apply_adr(db, workspace_id, user_id, meeting,
                                  extracted["adr"], analysis_id)

        # steering_committee (project phase + insight)
        if selections.get("apply_stage_gate") and extracted.get("stage_gate"):
            created += _apply_stage_gate(db, workspace_id, user_id, meeting,
                                         extracted["stage_gate"], analysis_id)

        # capacity_planning
        if selections.get("apply_capacity_signals") and extracted.get("capacity_signals"):
            created += _apply_capacity_signals(db, workspace_id, user_id, meeting,
                                               extracted["capacity_signals"], analysis_id)

        # renewal_call (renewal insight + optional client health drop)
        if selections.get("apply_renewal") and extracted.get("renewal"):
            created += _apply_renewal(db, workspace_id, user_id, meeting,
                                      extracted["renewal"], analysis_id)
        if selections.get("apply_renewal_deal_update") and extracted.get("deal_update"):
            created += _update_deal(db, workspace_id, user_id, meeting,
                                    extracted["deal_update"], analysis_id)

        # win_loss_review
        if selections.get("apply_win_loss") and extracted.get("win_loss"):
            created += _apply_win_loss(db, workspace_id, user_id, meeting,
                                       extracted["win_loss"], analysis_id)

        # hiring_panel
        if selections.get("apply_hiring_panel") and extracted.get("panel"):
            created += _apply_hiring_panel(db, workspace_id, user_id, meeting,
                                           extracted["panel"], analysis_id)

        # performance_review
        if selections.get("apply_performance_review") and extracted.get("performance_review"):
            created += _apply_performance_review(db, workspace_id, user_id, meeting,
                                                 extracted["performance_review"], analysis_id)

        # bug_triage (remap triaged_bugs → task_status_updates)
        if selections.get("apply_bug_triage") and extracted.get("triaged_bugs"):
            created += _apply_bug_triage(db, workspace_id, user_id, meeting,
                                         extracted["triaged_bugs"], analysis_id)

        # backlog_refinement: re-estimates → tasks.points
        if selections.get("apply_task_estimates") and extracted.get("task_estimates"):
            created += _apply_task_estimates(db, workspace_id, user_id, meeting,
                                             extracted["task_estimates"], analysis_id)

        # mark analysis approved + persist applied_selections for idempotence
        merged_applied: dict[str, Any] = dict(prev_applied)
        for k, v in new_applied.items():
            if isinstance(v, list):
                merged_applied[k] = sorted(set(merged_applied.get(k, []) or []) | set(v))
            else:
                merged_applied[k] = v
        output_with_applied = dict(output)
        output_with_applied["applied_selections"] = merged_applied
        db.execute(
            text("UPDATE meeting_analyses SET approved_at = :now, approved_by = :uid, "
                 "  output = :out, updated_at = :now "
                 "WHERE id = :id AND workspace_id = :ws"),
            {
                "now": _now(),
                "uid": user_id,
                "out": json.dumps(output_with_applied),
                "id": analysis_id,
                "ws": workspace_id,
            },
        )
        db.commit()

    return created


# Backwards-compat: original `approve_action_items(indices=...)` still works
def approve_action_items(
    *,
    analysis_id: str,
    indices: list[int],
    workspace_id: str,
    user_id: str,
) -> list[dict[str, Any]]:
    return apply_recommendations(
        analysis_id=analysis_id,
        selections={"action_items": indices},
        workspace_id=workspace_id,
        user_id=user_id,
    )
