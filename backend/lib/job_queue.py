"""DB-backed job queue.

Lightweight enqueue + claim API on top of MariaDB. The standalone
`backend/worker.py` process polls and executes jobs. No Redis needed.

Atomicity: claim() uses a single UPDATE…WHERE status='queued' guarded by
@@ROW_COUNT, so two workers can't grab the same job.
"""
from __future__ import annotations

import json
import os
import socket
import uuid
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from lib.db import SessionLocal


# How long a "running" job can be locked before the watchdog steals it back.
STUCK_AFTER = timedelta(minutes=int(os.getenv("JOB_STUCK_AFTER_MINUTES", "15")))

# Worker identity — used as locked_by so we can tell which process owns a job
WORKER_ID = f"{socket.gethostname()}:{os.getpid()}"


def enqueue(
    *,
    workspace_id: str,
    job_type: str,
    payload: dict[str, Any] | None = None,
    max_attempts: int = 3,
    db: Session | None = None,
) -> str:
    """Insert a new queued job and return its id."""
    job_id = str(uuid.uuid4())
    sql = text(
        "INSERT INTO job_queue (id, workspace_id, job_type, payload, status, max_attempts) "
        "VALUES (:id, :ws, :type, :payload, 'queued', :max_attempts)"
    )
    params = {
        "id": job_id,
        "ws": workspace_id,
        "type": job_type,
        "payload": json.dumps(payload or {}),
        "max_attempts": max_attempts,
    }
    if db is not None:
        db.execute(sql, params)
        db.commit()
    else:
        with SessionLocal() as own:
            own.execute(sql, params)
            own.commit()
    return job_id


def claim_one(job_types: list[str]) -> dict[str, Any] | None:
    """Atomically claim the oldest queued job whose type is in `job_types`.
    Returns the claimed row or None if nothing to do.
    """
    if not job_types:
        return None
    placeholders = ",".join(f":t{i}" for i in range(len(job_types)))
    type_params = {f"t{i}": v for i, v in enumerate(job_types)}

    with SessionLocal() as db:
        # Pick the oldest queued job id of these types
        row = db.execute(
            text(
                f"SELECT id FROM job_queue WHERE status='queued' AND job_type IN ({placeholders}) "
                "ORDER BY created_at ASC LIMIT 1"
            ),
            type_params,
        ).fetchone()
        if not row:
            return None
        job_id = row[0]

        # Try to lock it — only one worker wins
        result = db.execute(
            text(
                "UPDATE job_queue SET status='running', locked_by=:wid, locked_at=:now, "
                "started_at=:now, attempts=attempts+1, updated_at=:now "
                "WHERE id=:id AND status='queued'"
            ),
            {"wid": WORKER_ID, "now": datetime.utcnow(), "id": job_id},
        )
        db.commit()
        if result.rowcount != 1:
            return None  # someone else got it

        full = db.execute(
            text("SELECT id, workspace_id, job_type, payload, attempts, max_attempts FROM job_queue WHERE id=:id"),
            {"id": job_id},
        ).fetchone()
        if not full:
            return None
        out = dict(full._mapping)
        if isinstance(out.get("payload"), (str, bytes, bytearray)):
            try:
                out["payload"] = json.loads(out["payload"])
            except (ValueError, TypeError):
                out["payload"] = {}
        return out


def mark_done(job_id: str) -> None:
    with SessionLocal() as db:
        db.execute(
            text(
                "UPDATE job_queue SET status='done', finished_at=:now, locked_by=NULL, "
                "locked_at=NULL, last_error=NULL, updated_at=:now WHERE id=:id"
            ),
            {"id": job_id, "now": datetime.utcnow()},
        )
        db.commit()


def mark_failed(job_id: str, error: str, attempts: int, max_attempts: int) -> None:
    """If we still have retries left → re-queue; else → terminal failed."""
    new_status = "queued" if attempts < max_attempts else "failed"
    with SessionLocal() as db:
        db.execute(
            text(
                "UPDATE job_queue SET status=:st, last_error=:err, locked_by=NULL, "
                "locked_at=NULL, finished_at=CASE WHEN :st='failed' THEN :now ELSE NULL END, "
                "updated_at=:now WHERE id=:id"
            ),
            {"st": new_status, "err": error[:1000], "id": job_id, "now": datetime.utcnow()},
        )
        db.commit()


def reap_stuck() -> int:
    """Re-queue any 'running' jobs whose lock is older than STUCK_AFTER.
    Called once at worker boot to recover from crashed/restarted workers.
    Returns count rescued.
    """
    cutoff = datetime.utcnow() - STUCK_AFTER
    with SessionLocal() as db:
        result = db.execute(
            text(
                "UPDATE job_queue SET status='queued', locked_by=NULL, locked_at=NULL, "
                "last_error=CONCAT(COALESCE(last_error,''), ' [reaped:', :now, ']'), "
                "updated_at=:now "
                "WHERE status='running' AND locked_at IS NOT NULL AND locked_at < :cutoff"
            ),
            {"cutoff": cutoff, "now": datetime.utcnow()},
        )
        db.commit()
        return result.rowcount or 0


def get_job(job_id: str) -> dict[str, Any] | None:
    with SessionLocal() as db:
        row = db.execute(
            text("SELECT * FROM job_queue WHERE id=:id"), {"id": job_id}
        ).fetchone()
        return dict(row._mapping) if row else None
