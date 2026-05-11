"""Job handlers — pure functions that take a payload dict and run.

Register here; the worker (worker.py) dispatches by job_type.
"""
from __future__ import annotations

from typing import Any, Callable

from services import transcription_service


def handle_meeting_transcribe(payload: dict[str, Any]) -> None:
    """Run AssemblyAI transcription + auto-pipeline for one meeting."""
    transcription_service.process_meeting_audio(
        meeting_id=payload["meeting_id"],
        workspace_id=payload["workspace_id"],
        audio_path=payload["audio_path"],
    )


HANDLERS: dict[str, Callable[[dict[str, Any]], None]] = {
    "meeting.transcribe": handle_meeting_transcribe,
}


def supported_types() -> list[str]:
    return list(HANDLERS.keys())
