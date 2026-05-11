-- Day 20: generic DB-backed job queue.
-- Used by the standalone worker (backend/worker.py) to run long jobs
-- (AssemblyAI transcription, future: PDF generation, exports, etc.) outside
-- the FastAPI request lifecycle. No Redis dependency.

CREATE TABLE IF NOT EXISTS job_queue (
    id              VARCHAR(36)   NOT NULL PRIMARY KEY,
    workspace_id    VARCHAR(36)   NOT NULL,
    job_type        VARCHAR(64)   NOT NULL,
    payload         JSON          NULL,
    status          VARCHAR(16)   NOT NULL DEFAULT 'queued',
        -- queued | running | done | failed | cancelled
    attempts        INT           NOT NULL DEFAULT 0,
    max_attempts    INT           NOT NULL DEFAULT 3,
    locked_by       VARCHAR(64)   NULL,
    locked_at       DATETIME      NULL,
    last_error      TEXT          NULL,
    started_at      DATETIME      NULL,
    finished_at     DATETIME      NULL,
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_jq_status_type (status, job_type),
    INDEX idx_jq_locked (locked_by, locked_at),
    INDEX idx_jq_workspace (workspace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
