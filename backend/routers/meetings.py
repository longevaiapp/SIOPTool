from __future__ import annotations

from typing import Any

from fastapi import (
    Depends, File, HTTPException, UploadFile, status,
)
from pydantic import BaseModel

from lib import job_queue
from lib.auth import Principal, get_current_principal
from lib.router_factory import make_router
from models.meeting import MeetingCreate, MeetingOut, MeetingUpdate
from services.meeting_service import resource
from services import analyzer_service, transcription_service


router = make_router(
    prefix="/api/meetings",
    tag="meetings",
    resource=resource,
    create_model=MeetingCreate,
    update_model=MeetingUpdate,
    out_model=MeetingOut,
)


# ── AssemblyAI / analyzer extension endpoints ─────────────────────────────

class TranscriptionState(BaseModel):
    meeting_id: str
    transcription_status: str
    transcription_id: str | None = None
    transcription_error: str | None = None
    transcript: str | None = None
    utterances: list[dict[str, Any]] | None = None
    language_detected: str | None = None
    audio_duration_seconds: int | None = None
    audio_url: str | None = None


@router.post("/{meeting_id}/upload-audio", status_code=status.HTTP_202_ACCEPTED)
async def upload_audio(
    meeting_id: str,
    file: UploadFile = File(...),
    principal: Principal = Depends(get_current_principal),
):
    """Accept an audio file, persist it, and enqueue an AssemblyAI
    transcription job in the persistent job_queue. The standalone worker
    process picks it up. Returns 202 immediately with the job id."""
    meeting = transcription_service.get_meeting(meeting_id, principal.workspace_id)
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")

    # Hard upload cap (default 500MB)
    max_mb = int(__import__("os").getenv("MAX_AUDIO_UPLOAD_MB", "500"))
    if len(raw) > max_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"Audio exceeds {max_mb}MB limit")

    audio_path = transcription_service.save_uploaded_audio(
        meeting_id, raw, file.filename or "audio.bin",
    )
    transcription_service.mark_processing(meeting_id, principal.workspace_id, audio_path)
    job_id = job_queue.enqueue(
        workspace_id=principal.workspace_id,
        job_type="meeting.transcribe",
        payload={
            "meeting_id": meeting_id,
            "workspace_id": principal.workspace_id,
            "audio_path": str(audio_path),
        },
    )
    return {
        "meeting_id": meeting_id,
        "transcription_status": "queued",
        "audio_url": f"/storage/audio/{audio_path.name}",
        "size_bytes": len(raw),
        "job_id": job_id,
    }


@router.get("/{meeting_id}/transcription", response_model=TranscriptionState)
def get_transcription(
    meeting_id: str,
    principal: Principal = Depends(get_current_principal),
):
    meeting = transcription_service.get_meeting(meeting_id, principal.workspace_id)
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return TranscriptionState(
        meeting_id=meeting_id,
        transcription_status=meeting.get("transcription_status") or "idle",
        transcription_id=meeting.get("transcription_id"),
        transcription_error=meeting.get("transcription_error"),
        transcript=meeting.get("transcript"),
        utterances=meeting.get("utterances"),
        language_detected=meeting.get("language_detected"),
        audio_duration_seconds=meeting.get("audio_duration_seconds"),
        audio_url=meeting.get("audio_url"),
    )


class AnalyzeRequest(BaseModel):
    analyzer_type: str | None = None  # default: pick by meeting_type


@router.post("/{meeting_id}/analyze")
def analyze_meeting(
    meeting_id: str,
    payload: AnalyzeRequest | None = None,
    principal: Principal = Depends(get_current_principal),
):
    meeting = transcription_service.get_meeting(meeting_id, principal.workspace_id)
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if meeting.get("transcription_status") != "completed":
        raise HTTPException(status_code=400, detail="Transcription not completed yet")

    requested = payload.analyzer_type if payload and payload.analyzer_type else None
    analyzer_type = requested or analyzer_service.analyzer_for_meeting_type(
        meeting.get("meeting_type")
    )
    try:
        return analyzer_service.run_analysis(
            meeting=meeting,
            analyzer_type=analyzer_type,
            workspace_id=principal.workspace_id,
            user_id=principal.user_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Analyzer failed: {exc}")


@router.get("/{meeting_id}/analyses")
def list_meeting_analyses(
    meeting_id: str,
    principal: Principal = Depends(get_current_principal),
):
    meeting = transcription_service.get_meeting(meeting_id, principal.workspace_id)
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return analyzer_service.list_analyses(meeting_id, principal.workspace_id)


class ApproveRequest(BaseModel):
    # Legacy: list of action_item indices (still supported for backwards compat)
    indices: list[int] | None = None
    # New: structured selection map (see analyzer_service.apply_recommendations)
    selections: dict[str, Any] | None = None


@router.post("/{meeting_id}/analyses/{analysis_id}/approve")
def approve_analysis_actions(
    meeting_id: str,
    analysis_id: str,
    payload: ApproveRequest,
    principal: Principal = Depends(get_current_principal),
):
    meeting = transcription_service.get_meeting(meeting_id, principal.workspace_id)
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
    selections = payload.selections or {}
    if payload.indices is not None and "action_items" not in selections:
        selections = {**selections, "action_items": payload.indices}
    try:
        created = analyzer_service.apply_recommendations(
            analysis_id=analysis_id,
            selections=selections,
            workspace_id=principal.workspace_id,
            user_id=principal.user_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {"created": created, "count": len(created)}
