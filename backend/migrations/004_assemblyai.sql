-- =============================================================
-- 004_assemblyai.sql
-- AssemblyAI transcription pipeline + analyzer outputs
-- =============================================================

-- Extend meetings with transcription metadata
ALTER TABLE meetings
  ADD COLUMN transcription_id        VARCHAR(64)  DEFAULT NULL AFTER audio_url,
  ADD COLUMN transcription_status    ENUM('idle','queued','processing','completed','error') NOT NULL DEFAULT 'idle' AFTER transcription_id,
  ADD COLUMN transcription_error     TEXT         DEFAULT NULL AFTER transcription_status,
  ADD COLUMN utterances              JSON         DEFAULT NULL AFTER transcript,
  ADD COLUMN language_detected       VARCHAR(16)  DEFAULT NULL AFTER utterances,
  ADD COLUMN audio_duration_seconds  INT          DEFAULT NULL AFTER language_detected,
  ADD COLUMN audio_file_path         VARCHAR(500) DEFAULT NULL AFTER audio_duration_seconds;

-- Persist analyzer outputs (one row per analyzer per meeting; allows re-run history)
CREATE TABLE IF NOT EXISTS meeting_analyses (
  id              VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id    VARCHAR(36)  NOT NULL,
  is_deleted      BOOLEAN      NOT NULL DEFAULT FALSE,
  deleted_at      DATETIME              DEFAULT NULL,

  meeting_id      VARCHAR(36)  NOT NULL,
  analyzer_type   VARCHAR(64)  NOT NULL,
  status          ENUM('pending','running','completed','error') NOT NULL DEFAULT 'pending',
  output          JSON                  DEFAULT NULL,
  error_message   TEXT                  DEFAULT NULL,
  model           VARCHAR(64)           DEFAULT NULL,
  approved_at     DATETIME              DEFAULT NULL,
  approved_by     VARCHAR(36)           DEFAULT NULL,

  PRIMARY KEY (id),
  KEY idx_ma_meeting_id (meeting_id),
  KEY idx_ma_workspace_id (workspace_id),
  KEY idx_ma_analyzer (analyzer_type),
  CONSTRAINT fk_ma_meeting FOREIGN KEY (meeting_id) REFERENCES meetings (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
