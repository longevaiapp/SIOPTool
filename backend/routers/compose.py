"""Compose / classify router.

Powers the global Compose omnibox: the user dictates / pastes / records,
and we route the snippet to the right analyzer + pre-fill links to
existing client / deal / project rows.

POST /api/compose/classify
  Body: {"snippet": "...the speech-to-text or pasted notes..."}
  Returns: ClassifyResult — see services/compose_service.py
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from lib.auth import Principal, get_current_principal
from services import compose_service


router = APIRouter(prefix="/api/compose", tags=["compose"])


class ClassifyRequest(BaseModel):
    snippet: str = Field(min_length=1, max_length=20_000)


@router.post("/classify")
def classify(
    payload: ClassifyRequest,
    principal: Principal = Depends(get_current_principal),
):
    try:
        return compose_service.classify_snippet(
            workspace_id=principal.workspace_id,
            snippet=payload.snippet,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"classify failed: {exc}")
