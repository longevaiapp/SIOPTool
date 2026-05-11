"""Standalone worker process. Run under PM2 alongside the API.

Loop:
  1. Reap stuck jobs (only on first iteration).
  2. Claim one queued job from job_queue.
  3. Dispatch by job_type via tasks.handlers.HANDLERS.
  4. mark_done / mark_failed (with retry).
  5. Sleep poll_interval if no job; else loop immediately.

Stop with SIGTERM/SIGINT (PM2 restart). Currently-running job will
finish naturally because we don't interrupt mid-handler.
"""
from __future__ import annotations

import logging
import os
import signal
import sys
import time
import traceback

# Ensure we can `import lib.*` / `services.*` / `tasks.*`
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from lib import job_queue  # noqa: E402
from tasks.handlers import HANDLERS, supported_types  # noqa: E402


LOG = logging.getLogger("siop.worker")
logging.basicConfig(
    level=os.getenv("WORKER_LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)-7s %(name)s %(message)s",
)

POLL_INTERVAL = float(os.getenv("WORKER_POLL_SECONDS", "3"))

_stop = False


def _on_signal(signum, _frame):  # noqa: ANN001
    global _stop
    LOG.info("signal %s received → stopping after current job", signum)
    _stop = True


signal.signal(signal.SIGTERM, _on_signal)
signal.signal(signal.SIGINT, _on_signal)


def run_one() -> bool:
    """Try to claim and run one job. Returns True if a job was processed."""
    job = job_queue.claim_one(supported_types())
    if not job:
        return False

    job_id = job["id"]
    job_type = job["job_type"]
    payload = job.get("payload") or {}
    attempts = int(job.get("attempts") or 1)
    max_attempts = int(job.get("max_attempts") or 3)

    LOG.info("running job=%s type=%s attempt=%d/%d", job_id[:8], job_type, attempts, max_attempts)
    handler = HANDLERS.get(job_type)
    if not handler:
        job_queue.mark_failed(job_id, f"no handler for {job_type}", attempts, attempts)  # terminal
        return True

    try:
        handler(payload)
        job_queue.mark_done(job_id)
        LOG.info("done job=%s type=%s", job_id[:8], job_type)
    except Exception as exc:  # noqa: BLE001
        err = f"{type(exc).__name__}: {exc}\n{traceback.format_exc()}"
        LOG.error("failed job=%s err=%s", job_id[:8], exc)
        job_queue.mark_failed(job_id, err, attempts, max_attempts)
    return True


def main() -> None:
    LOG.info("worker starting id=%s types=%s", job_queue.WORKER_ID, supported_types())
    rescued = job_queue.reap_stuck()
    if rescued:
        LOG.warning("reaped %d stuck job(s) at boot", rescued)

    while not _stop:
        try:
            did = run_one()
        except Exception as exc:  # noqa: BLE001
            LOG.exception("worker loop error: %s", exc)
            did = False
        if not did:
            time.sleep(POLL_INTERVAL)

    LOG.info("worker stopped cleanly")


if __name__ == "__main__":
    main()
