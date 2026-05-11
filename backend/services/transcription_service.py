"""Transcription service — orchestrates audio file -> AssemblyAI -> meetings row.

Synchronous API: caller flips `transcription_status` to `processing`, then
runs `process_meeting_audio` (which blocks until AssemblyAI returns), then
updates the meetings row with the result. Designed to be called from a
FastAPI BackgroundTasks worker so the HTTP request returns immediately.
"""
from __future__ import annotations

import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

from sqlalchemy import text

from lib.assemblyai_client import transcribe_file
from lib.audit import record_audit
from lib.db import SessionLocal


AUDIO_STORAGE_DIR = Path(os.getenv("AUDIO_STORAGE_DIR", "/var/www/sioptool/storage/audio"))


def ensure_storage_dir() -> Path:
    AUDIO_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    return AUDIO_STORAGE_DIR


def save_uploaded_audio(meeting_id: str, file_bytes: bytes, original_filename: str) -> Path:
    """Persist uploaded bytes to disk and return absolute path."""
    ensure_storage_dir()
    suffix = Path(original_filename).suffix.lower() or ".bin"
    if len(suffix) > 8 or not suffix.startswith("."):
        suffix = ".bin"
    safe_name = f"{meeting_id}_{uuid.uuid4().hex[:8]}{suffix}"
    target = AUDIO_STORAGE_DIR / safe_name
    target.write_bytes(file_bytes)
    return target


def mark_processing(meeting_id: str, workspace_id: str, audio_path: Path) -> None:
    """Flip the meeting row to `processing` immediately after upload."""
    with SessionLocal() as db:
        db.execute(
            text(
                "UPDATE meetings SET "
                "  transcription_status = 'processing', "
                "  transcription_error = NULL, "
                "  audio_file_path = :path, "
                "  audio_url = :url, "
                "  status = 'PROCESSING', "
                "  updated_at = :now "
                "WHERE id = :id AND workspace_id = :ws AND is_deleted = FALSE"
            ),
            {
                "path": str(audio_path),
                "url": f"/storage/audio/{audio_path.name}",
                "now": datetime.utcnow(),
                "id": meeting_id,
                "ws": workspace_id,
            },
        )
        db.commit()


def process_meeting_audio(meeting_id: str, workspace_id: str, audio_path: str) -> None:
    """Blocking call: transcribe the file at `audio_path` and persist the
    result onto the meeting row. Designed for BackgroundTasks."""
    try:
        result = transcribe_file(audio_path)
    except Exception as exc:  # noqa: BLE001
        result = {
            "transcription_id": None,
            "transcription_status": "error",
            "transcription_error": f"{type(exc).__name__}: {exc}",
            "transcript": None,
            "utterances": None,
            "language_detected": None,
            "audio_duration_seconds": None,
        }

    new_status = "ANALYZED" if result["transcription_status"] == "completed" else "FAILED"

    with SessionLocal() as db:
        db.execute(
            text(
                "UPDATE meetings SET "
                "  transcription_id = :tid, "
                "  transcription_status = :tstatus, "
                "  transcription_error = :terr, "
                "  transcript = :transcript, "
                "  utterances = :utterances, "
                "  language_detected = :lang, "
                "  audio_duration_seconds = :dur, "
                "  status = :status, "
                "  updated_at = :now "
                "WHERE id = :id AND workspace_id = :ws AND is_deleted = FALSE"
            ),
            {
                "tid": result["transcription_id"],
                "tstatus": result["transcription_status"],
                "terr": result["transcription_error"],
                "transcript": result["transcript"],
                "utterances": json.dumps(result["utterances"]) if result["utterances"] is not None else None,
                "lang": result["language_detected"],
                "dur": result["audio_duration_seconds"],
                "status": new_status,
                "now": datetime.utcnow(),
                "id": meeting_id,
                "ws": workspace_id,
            },
        )
        record_audit(
            db,
            workspace_id=workspace_id,
            user_id="system",
            module="meetings",
            action="transcribe",
            record_id=meeting_id,
            payload_delta={
                "transcription_status": result["transcription_status"],
                "transcription_id": result["transcription_id"],
                "language_detected": result["language_detected"],
                "audio_duration_seconds": result["audio_duration_seconds"],
                "error": result["transcription_error"],
            },
        )
        db.commit()

    # ── Post-transcription auto pipeline ──────────────────────────────────
    if result["transcription_status"] != "completed":
        return

    # Lazy imports to avoid circular dependency
    from services import analyzer_service

    # Reload the full meeting row (includes transcript + utterances we just wrote)
    meeting = get_meeting(meeting_id, workspace_id)
    if not meeting:
        return

    # 1) Universal metadata extraction → auto-fills meetings.participants/notes/duration
    try:
        meta = analyzer_service.run_meeting_metadata(meeting)
        analyzer_service.auto_fill_meeting_from_metadata(
            meeting_id=meeting_id,
            workspace_id=workspace_id,
            user_id="system",
            meta=meta,
            audio_duration_seconds=result["audio_duration_seconds"],
            declared_meeting_type=meeting.get("meeting_type"),
        )
        # refresh meeting after auto-fill so the next analyzer sees the right type
        meeting = get_meeting(meeting_id, workspace_id) or meeting
    except Exception:  # noqa: BLE001
        # auto-fill is best-effort; transcription itself succeeded
        pass

    # 2) Specialized analyzer for the (now possibly updated) meeting_type
    try:
        analyzer_type = analyzer_service.analyzer_for_meeting_type(
            meeting.get("meeting_type")
        )
        analyzer_service.run_analysis(
            meeting=meeting,
            analyzer_type=analyzer_type,
            workspace_id=workspace_id,
            user_id="system",
        )
    except Exception:  # noqa: BLE001
        pass


def get_meeting(meeting_id: str, workspace_id: str) -> dict[str, Any] | None:
    with SessionLocal() as db:
        row = db.execute(
            text(
                "SELECT id, workspace_id, title, status, meeting_type, scheduled_at, "
                "       duration_minutes, participants, notes, "
                "       transcription_status, transcription_id, "
                "       transcription_error, transcript, utterances, language_detected, "
                "       audio_duration_seconds, audio_url, audio_file_path, "
                "       project_id, client_id, deal_id "
                "FROM meetings WHERE id = :id AND workspace_id = :ws AND is_deleted = FALSE"
            ),
            {"id": meeting_id, "ws": workspace_id},
        ).fetchone()
        if not row:
            return None
        out = dict(row._mapping)
        if isinstance(out.get("utterances"), (str, bytes, bytearray)):
            try:
                out["utterances"] = json.loads(out["utterances"])
            except (ValueError, TypeError):
                out["utterances"] = None
        if isinstance(out.get("participants"), (str, bytes, bytearray)):
            try:
                out["participants"] = json.loads(out["participants"])
            except (ValueError, TypeError):
                out["participants"] = None
        return out
