"""AssemblyAI client wrapper (pre-recorded mode, official SDK).

Single entry point: `transcribe_file(path)` runs upload + submit + poll
and returns a normalized dict with transcript, utterances, language and
duration. Caller is responsible for persisting and updating status.
"""
from __future__ import annotations

import os
import time
from typing import Any

from dotenv import load_dotenv

load_dotenv()

# Import lazily so tests / imports don't fail if the SDK isn't installed yet.
def _aai():
    import assemblyai as aai  # type: ignore
    return aai


def get_api_key() -> str:
    key = os.getenv("ASSEMBLYAI_API_KEY")
    if not key:
        raise RuntimeError("ASSEMBLYAI_API_KEY environment variable is required")
    return key


MAX_RETRIES = int(os.getenv("ASSEMBLYAI_MAX_RETRIES", "2"))
RETRY_BACKOFF = float(os.getenv("ASSEMBLYAI_RETRY_BACKOFF_SECONDS", "5"))


def transcribe_file(path: str) -> dict[str, Any]:
    """Upload + transcribe a local audio file synchronously.

    Retries on transient errors (network/upload). Returns a dict ready
    to merge into the meetings row.
    """
    last_err: Exception | None = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            return _transcribe_once(path)
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_BACKOFF * (attempt + 1))
                continue
            break
    return {
        "transcription_id": None,
        "transcription_status": "error",
        "transcription_error": f"AssemblyAI failed after {MAX_RETRIES + 1} attempts: {last_err}",
        "transcript": None,
        "utterances": None,
        "language_detected": None,
        "audio_duration_seconds": None,
    }


def _transcribe_once(path: str) -> dict[str, Any]:
    aai = _aai()
    aai.settings.api_key = get_api_key()

    config = aai.TranscriptionConfig(
        speech_models=["universal"],
        speaker_labels=True,
        language_detection=True,  # auto-detect es/en/mixed
        punctuate=True,
        format_text=True,
    )

    transcriber = aai.Transcriber(config=config)
    transcript = transcriber.transcribe(path)

    if transcript.status == aai.TranscriptStatus.error:
        return {
            "transcription_id": getattr(transcript, "id", None),
            "transcription_status": "error",
            "transcription_error": str(transcript.error),
            "transcript": None,
            "utterances": None,
            "language_detected": None,
            "audio_duration_seconds": None,
        }

    utterances: list[dict[str, Any]] = []
    if transcript.utterances:
        for u in transcript.utterances:
            utterances.append({
                "speaker": u.speaker,
                "text": u.text,
                "start": u.start,
                "end": u.end,
                "confidence": getattr(u, "confidence", None),
            })

    audio_seconds = None
    raw = getattr(transcript, "audio_duration", None)
    if raw is not None:
        # SDK returns seconds (float) for pre-recorded
        audio_seconds = int(raw)

    return {
        "transcription_id": transcript.id,
        "transcription_status": "completed",
        "transcription_error": None,
        "transcript": transcript.text or "",
        "utterances": utterances,
        "language_detected": getattr(transcript, "language_code", None),
        "audio_duration_seconds": audio_seconds,
    }
