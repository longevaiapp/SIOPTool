"""Copilot router — SSE streaming chat with workspace context."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from lib.auth import Principal, get_current_principal
from services.copilot_service import stream_chat


router = APIRouter(prefix="/api/copilot", tags=["copilot"])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    entity_type: str | None = None
    entity_id: str | None = None
    route: str | None = None


@router.post("/chat")
def chat(
    body: ChatRequest,
    principal: Principal = Depends(get_current_principal),
):
    return StreamingResponse(
        stream_chat(
            workspace_id=principal.workspace_id,
            messages=[m.model_dump() for m in body.messages],
            entity_type=body.entity_type,
            entity_id=body.entity_id,
            route=body.route,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
