-- 008_time_entries.sql — Day 18 Timesheet
-- Tracks hours per user/role/project per week. Aggregated by
-- POST /api/timesheets/rollup into role_capacity.committed_fte.

SET foreign_key_checks = 0;

CREATE TABLE IF NOT EXISTS time_entries (
  id            VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id  VARCHAR(36)   NOT NULL,
  is_deleted    BOOLEAN       NOT NULL DEFAULT FALSE,
  deleted_at    DATETIME               DEFAULT NULL,

  user_id       VARCHAR(36)            DEFAULT NULL,
  user_name     VARCHAR(255)           DEFAULT NULL,
  role          VARCHAR(100)  NOT NULL,
  project_id    VARCHAR(36)            DEFAULT NULL,
  week_start    DATE          NOT NULL,
  hours         DECIMAL(6,2)  NOT NULL DEFAULT 0,
  notes         TEXT                   DEFAULT NULL,

  PRIMARY KEY (id),
  KEY idx_time_entries_workspace (workspace_id),
  KEY idx_time_entries_week (week_start),
  KEY idx_time_entries_role (role),
  KEY idx_time_entries_project (project_id),
  CONSTRAINT fk_time_entries_project FOREIGN KEY (project_id) REFERENCES projects (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET foreign_key_checks = 1;
