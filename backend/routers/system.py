"""Job inspection + system health endpoints."""
from __future__ import annotations

import os
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text

from lib import job_queue
from lib.auth import Principal, get_current_principal
from lib.db import SessionLocal


router = APIRouter()


@router.get("/api/jobs/{job_id}", tags=["system"])
def get_job(
    job_id: str,
    principal: Principal = Depends(get_current_principal),
):
    job = job_queue.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["workspace_id"] != principal.workspace_id:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "id": job["id"],
        "job_type": job["job_type"],
        "status": job["status"],
        "attempts": job["attempts"],
        "max_attempts": job["max_attempts"],
        "last_error": job.get("last_error"),
        "started_at": job.get("started_at"),
        "finished_at": job.get("finished_at"),
        "created_at": job["created_at"],
    }


@router.get("/api/jobs", tags=["system"])
def list_jobs(
    status_filter: str | None = None,
    limit: int = 50,
    principal: Principal = Depends(get_current_principal),
):
    sql = "SELECT id, job_type, status, attempts, last_error, created_at, finished_at FROM job_queue WHERE workspace_id=:ws"
    params: dict = {"ws": principal.workspace_id}
    if status_filter:
        sql += " AND status=:st"
        params["st"] = status_filter
    sql += " ORDER BY created_at DESC LIMIT :lim"
    params["lim"] = max(1, min(int(limit), 200))
    with SessionLocal() as db:
        rows = db.execute(text(sql), params).fetchall()
    return {"items": [dict(r._mapping) for r in rows]}


@router.get("/api/health", tags=["system"])
def health():
    """Liveness + dependency check. Returns 200 with degraded flags;
    never 5xx so monitors don't false-alarm on optional deps."""
    out: dict = {"status": "ok", "checked_at": datetime.utcnow().isoformat()}
    # DB
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1")).fetchone()
        out["db"] = "ok"
    except Exception as exc:  # noqa: BLE001
        out["db"] = f"error: {exc}"
        out["status"] = "degraded"
    # Worker queue stats
    try:
        with SessionLocal() as db:
            stats = db.execute(
                text("SELECT status, COUNT(*) AS n FROM job_queue GROUP BY status")
            ).fetchall()
        out["jobs"] = {r[0]: int(r[1]) for r in stats}
    except Exception:  # noqa: BLE001
        out["jobs"] = {}
    # Optional API keys
    out["openai_key"] = "set" if os.getenv("OPENAI_API_KEY") else "missing"
    out["assemblyai_key"] = "set" if os.getenv("ASSEMBLYAI_API_KEY") else "missing"
    return out
