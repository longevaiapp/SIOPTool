"""Copilot service — workspace-aware AI assistant with streaming.

Pulls light context from DB based on the page the user is viewing,
then streams a chat completion back to the client (SSE).
"""
from __future__ import annotations

import json
import os
from typing import Any, Generator

from sqlalchemy import text

from lib.db import SessionLocal
from lib.openai_client import get_openai_client


COPILOT_MODEL = os.getenv("COPILOT_MODEL", "gpt-4o-mini")

SYSTEM_PROMPT = """Eres el Copilot de SIOP, un asistente experto en operaciones,
ventas y entrega de proyectos para una factoría AIaaS HealthTech.

Tu trabajo:
- Responder con datos concretos del workspace cuando estén en el contexto.
- Sugerir próximos pasos accionables (no decisiones automáticas).
- Identificar riesgos, márgenes apretados, cumplimiento HIPAA/BAA, capacidad.
- Sé breve, directo y profesional. Usa markdown sólo cuando aporte (listas, **negritas**).
- Responde en el idioma del usuario (español por defecto).
- Si no hay datos en el contexto, dilo y sugiere a qué módulo ir.
"""


def _fetch_context(workspace_id: str, entity_type: str | None, entity_id: str | None) -> dict[str, Any]:
    """Pull a small, focused context bundle from DB."""
    ctx: dict[str, Any] = {"workspace_id": workspace_id}
    db = SessionLocal()
    try:
        # Always include workspace-level KPIs
        kpis = db.execute(text("""
            SELECT
              (SELECT COUNT(*) FROM clients     WHERE workspace_id=:w AND is_deleted=FALSE) AS clients,
              (SELECT COUNT(*) FROM projects    WHERE workspace_id=:w AND is_deleted=FALSE) AS projects,
              (SELECT COUNT(*) FROM deals       WHERE workspace_id=:w AND is_deleted=FALSE) AS deals,
              (SELECT COUNT(*) FROM contracts   WHERE workspace_id=:w AND is_deleted=FALSE) AS contracts,
              (SELECT COUNT(*) FROM invoices    WHERE workspace_id=:w AND is_deleted=FALSE) AS invoices,
              (SELECT COUNT(*) FROM meetings    WHERE workspace_id=:w AND is_deleted=FALSE) AS meetings
        """), {"w": workspace_id}).mappings().first()
        ctx["workspace_kpis"] = dict(kpis) if kpis else {}

        if not entity_type or not entity_id:
            return ctx

        if entity_type == "client":
            row = db.execute(text("""
                SELECT id, name, industry, tier, health_score, nps, csat, arr, status
                FROM clients WHERE id=:id AND workspace_id=:w AND is_deleted=FALSE
            """), {"id": entity_id, "w": workspace_id}).mappings().first()
            if row:
                ctx["client"] = dict(row)
                deals = db.execute(text("""
                    SELECT name, stage, value, probability FROM deals
                    WHERE client_id=:id AND workspace_id=:w AND is_deleted=FALSE
                    ORDER BY updated_at DESC LIMIT 8
                """), {"id": entity_id, "w": workspace_id}).mappings().all()
                ctx["deals"] = [dict(d) for d in deals]
                projects = db.execute(text("""
                    SELECT id, name, status, health_score, progress, end_date
                    FROM projects WHERE client_id=:id AND workspace_id=:w AND is_deleted=FALSE
                    ORDER BY updated_at DESC LIMIT 8
                """), {"id": entity_id, "w": workspace_id}).mappings().all()
                ctx["projects"] = [dict(p) for p in projects]

        elif entity_type == "project":
            row = db.execute(text("""
                SELECT p.*, c.name AS client_name FROM projects p
                LEFT JOIN clients c ON c.id=p.client_id
                WHERE p.id=:id AND p.workspace_id=:w AND p.is_deleted=FALSE
            """), {"id": entity_id, "w": workspace_id}).mappings().first()
            if row:
                ctx["project"] = {k: v for k, v in dict(row).items() if v is not None}
                risks = db.execute(text("""
                    SELECT title, severity, status, probability, impact
                    FROM risks WHERE project_id=:id AND workspace_id=:w AND is_deleted=FALSE
                    ORDER BY (COALESCE(probability,0)*COALESCE(impact,0)) DESC LIMIT 8
                """), {"id": entity_id, "w": workspace_id}).mappings().all()
                ctx["risks"] = [dict(r) for r in risks]
                tasks = db.execute(text("""
                    SELECT title, status, assignee, points
                    FROM tasks WHERE project_id=:id AND workspace_id=:w AND is_deleted=FALSE
                    ORDER BY updated_at DESC LIMIT 12
                """), {"id": entity_id, "w": workspace_id}).mappings().all()
                ctx["tasks"] = [dict(t) for t in tasks]

        elif entity_type == "deal":
            row = db.execute(text("""
                SELECT d.*, c.name AS client_name FROM deals d
                LEFT JOIN clients c ON c.id=d.client_id
                WHERE d.id=:id AND d.workspace_id=:w AND d.is_deleted=FALSE
            """), {"id": entity_id, "w": workspace_id}).mappings().first()
            if row:
                ctx["deal"] = {k: v for k, v in dict(row).items() if v is not None}

        elif entity_type == "meeting":
            row = db.execute(text("""
                SELECT m.id, m.title, m.meeting_type, m.notes, m.date, c.name AS client_name
                FROM meetings m LEFT JOIN clients c ON c.id=m.client_id
                WHERE m.id=:id AND m.workspace_id=:w AND m.is_deleted=FALSE
            """), {"id": entity_id, "w": workspace_id}).mappings().first()
            if row:
                ctx["meeting"] = dict(row)
                actions = db.execute(text("""
                    SELECT text, assignee, accepted FROM action_items
                    WHERE meeting_id=:id AND workspace_id=:w AND is_deleted=FALSE LIMIT 12
                """), {"id": entity_id, "w": workspace_id}).mappings().all()
                ctx["action_items"] = [dict(a) for a in actions]

        elif entity_type == "supplier":
            row = db.execute(text("""
                SELECT id, name, category, status, rating, risk_level, spend_ytd
                FROM suppliers WHERE id=:id AND workspace_id=:w AND is_deleted=FALSE
            """), {"id": entity_id, "w": workspace_id}).mappings().first()
            if row:
                ctx["supplier"] = dict(row)

        elif entity_type == "program":
            row = db.execute(text("""
                SELECT id, name, description, lead, progress, portfolio_value, strategic_priority
                FROM programs WHERE id=:id AND workspace_id=:w AND is_deleted=FALSE
            """), {"id": entity_id, "w": workspace_id}).mappings().first()
            if row:
                ctx["program"] = dict(row)
    finally:
        db.close()
    return ctx


def _serialize_ctx(ctx: dict[str, Any]) -> str:
    """Stringify context for the system prompt, dropping nones and trimming."""
    def _clean(v: Any) -> Any:
        if isinstance(v, dict):
            return {k: _clean(x) for k, x in v.items() if x is not None and x != ""}
        if isinstance(v, list):
            return [_clean(x) for x in v]
        return v
    return json.dumps(_clean(ctx), default=str, ensure_ascii=False)


def stream_chat(
    workspace_id: str,
    messages: list[dict[str, str]],
    entity_type: str | None,
    entity_id: str | None,
    route: str | None,
) -> Generator[str, None, None]:
    """Yield SSE-formatted chunks: 'data: {json}\\n\\n'."""
    ctx = _fetch_context(workspace_id, entity_type, entity_id)
    ctx_str = _serialize_ctx(ctx)

    sys = (
        SYSTEM_PROMPT
        + f"\n\nRuta actual: {route or 'desconocida'}"
        + f"\n\nContexto (JSON):\n{ctx_str}"
    )
    chat_messages = [{"role": "system", "content": sys}, *messages]

    client = get_openai_client()
    try:
        stream = client.chat.completions.create(
            model=COPILOT_MODEL,
            messages=chat_messages,  # type: ignore[arg-type]
            temperature=0.4,
            stream=True,
        )

        # Notify start with context summary
        yield f"data: {json.dumps({'type': 'start', 'context_keys': list(ctx.keys())})}\n\n"

        for chunk in stream:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta
            if delta and delta.content:
                yield f"data: {json.dumps({'type': 'delta', 'text': delta.content})}\n\n"

        yield f"data: {json.dumps({'type': 'done'})}\n\n"
    except Exception as e:  # noqa: BLE001
        yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
