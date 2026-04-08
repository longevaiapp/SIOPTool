-- =============================================================
-- 001_base_schema.sql
-- LongevAI SIOP Tool — Base Schema
-- MySQL 8.0.13+ (Hostinger)
--
-- Run:
--   mysql -u <user> -p <dbname> < backend/migrations/001_base_schema.sql
--
-- Base columns applied to every table (except audit_log):
--   id           VARCHAR(36) PRIMARY KEY DEFAULT (UUID())
--   created_at   DATETIME    DEFAULT CURRENT_TIMESTAMP
--   updated_at   DATETIME    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
--   workspace_id VARCHAR(36)
--   is_deleted   BOOLEAN     DEFAULT FALSE
--   deleted_at   DATETIME    DEFAULT NULL
--
-- audit_log is INSERT-ONLY — no UPDATE, no DELETE, no is_deleted/deleted_at
-- =============================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;


-- -------------------------------------------------------------
-- organizations
-- Top-level tenant container. workspace_id is intentionally
-- nullable here — orgs exist above the workspace level.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
  id            VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id  VARCHAR(36)            DEFAULT NULL,
  is_deleted    BOOLEAN       NOT NULL DEFAULT FALSE,
  deleted_at    DATETIME               DEFAULT NULL,

  name          VARCHAR(255)  NOT NULL,
  slug          VARCHAR(100)  NOT NULL,
  plan          VARCHAR(50)   NOT NULL DEFAULT 'free',

  PRIMARY KEY (id),
  UNIQUE  KEY uq_organizations_slug (slug),
  KEY     idx_organizations_workspace_id (workspace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- workspaces
-- workspace_id on this table is nullable (self-referential
-- tenant key doesn't apply to the workspace root record).
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workspaces (
  id            VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id  VARCHAR(36)           DEFAULT NULL,
  is_deleted    BOOLEAN      NOT NULL DEFAULT FALSE,
  deleted_at    DATETIME              DEFAULT NULL,

  org_id        VARCHAR(36)  NOT NULL,
  name          VARCHAR(255) NOT NULL,

  PRIMARY KEY (id),
  KEY     idx_workspaces_org_id (org_id),
  CONSTRAINT fk_workspaces_org FOREIGN KEY (org_id) REFERENCES organizations (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- users
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id  VARCHAR(36)  NOT NULL,
  is_deleted    BOOLEAN      NOT NULL DEFAULT FALSE,
  deleted_at    DATETIME              DEFAULT NULL,

  email         VARCHAR(255) NOT NULL,
  full_name     VARCHAR(255) NOT NULL,
  avatar_url    TEXT                  DEFAULT NULL,
  role          ENUM('CEO','COO','PM','SALES_LEAD','CLIENT') NOT NULL DEFAULT 'PM',

  PRIMARY KEY (id),
  UNIQUE  KEY uq_users_workspace_email (workspace_id, email),
  KEY     idx_users_workspace_id (workspace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- projects
-- baa_confirmed must be TRUE before status can be set to active
-- when phi_involved is TRUE (enforced in service layer).
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id              VARCHAR(36)    NOT NULL DEFAULT (UUID()),
  created_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id    VARCHAR(36)    NOT NULL,
  is_deleted      BOOLEAN        NOT NULL DEFAULT FALSE,
  deleted_at      DATETIME                DEFAULT NULL,

  name            VARCHAR(255)   NOT NULL,
  client_name     VARCHAR(255)   NOT NULL,
  pm_id           VARCHAR(36)             DEFAULT NULL,
  status          VARCHAR(50)    NOT NULL DEFAULT 'draft',
  phi_involved    BOOLEAN        NOT NULL DEFAULT FALSE,
  baa_confirmed   BOOLEAN        NOT NULL DEFAULT FALSE,
  methodology     VARCHAR(50)             DEFAULT NULL,
  health_score    DECIMAL(5,2)            DEFAULT NULL,
  budget          DECIMAL(15,2)           DEFAULT NULL,
  phase           VARCHAR(100)            DEFAULT NULL,

  PRIMARY KEY (id),
  KEY idx_projects_workspace_id (workspace_id),
  KEY idx_projects_pm_id (pm_id),
  CONSTRAINT fk_projects_pm FOREIGN KEY (pm_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- sprints
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sprints (
  id                      VARCHAR(36) NOT NULL DEFAULT (UUID()),
  created_at              DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id            VARCHAR(36) NOT NULL,
  is_deleted              BOOLEAN     NOT NULL DEFAULT FALSE,
  deleted_at              DATETIME             DEFAULT NULL,

  project_id              VARCHAR(36) NOT NULL,
  name                    VARCHAR(255) NOT NULL,
  status                  ENUM('PLANNED','ACTIVE','COMPLETED') NOT NULL DEFAULT 'PLANNED',
  start_date              DATE                 DEFAULT NULL,
  end_date                DATE                 DEFAULT NULL,
  story_points_planned    INT                  DEFAULT 0,
  story_points_completed  INT                  DEFAULT 0,

  PRIMARY KEY (id),
  KEY idx_sprints_project_id (project_id),
  KEY idx_sprints_workspace_id (workspace_id),
  CONSTRAINT fk_sprints_project FOREIGN KEY (project_id) REFERENCES projects (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- tasks
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id                       VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  created_at               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id             VARCHAR(36)  NOT NULL,
  is_deleted               BOOLEAN      NOT NULL DEFAULT FALSE,
  deleted_at               DATETIME              DEFAULT NULL,

  sprint_id                VARCHAR(36)           DEFAULT NULL,
  project_id               VARCHAR(36)  NOT NULL,
  title                    VARCHAR(500) NOT NULL,
  description              TEXT                  DEFAULT NULL,
  status                   VARCHAR(50)  NOT NULL DEFAULT 'backlog',
  task_type                ENUM('FEATURE','INTEGRATION','COMPLIANCE','SECURITY','CLINICAL') NOT NULL DEFAULT 'FEATURE',
  assignee_id              VARCHAR(36)           DEFAULT NULL,
  story_points             INT                   DEFAULT NULL,
  wip_column               VARCHAR(50)           DEFAULT NULL,
  is_clinical_safety       BOOLEAN      NOT NULL DEFAULT FALSE,
  clinical_lead_approval   BOOLEAN      NOT NULL DEFAULT FALSE,

  PRIMARY KEY (id),
  KEY idx_tasks_sprint_id (sprint_id),
  KEY idx_tasks_project_id (project_id),
  KEY idx_tasks_assignee_id (assignee_id),
  KEY idx_tasks_workspace_id (workspace_id),
  CONSTRAINT fk_tasks_sprint   FOREIGN KEY (sprint_id)   REFERENCES sprints (id),
  CONSTRAINT fk_tasks_project  FOREIGN KEY (project_id)  REFERENCES projects (id),
  CONSTRAINT fk_tasks_assignee FOREIGN KEY (assignee_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- deals
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deals (
  id                 VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id       VARCHAR(36)  NOT NULL,
  is_deleted         BOOLEAN      NOT NULL DEFAULT FALSE,
  deleted_at         DATETIME              DEFAULT NULL,

  client_name        VARCHAR(255) NOT NULL,
  deal_type          VARCHAR(100)          DEFAULT NULL,
  stage              VARCHAR(100) NOT NULL DEFAULT 'prospect',
  value              DECIMAL(15,2)         DEFAULT NULL,
  probability        DECIMAL(5,2)          DEFAULT NULL,
  owner_id           VARCHAR(36)           DEFAULT NULL,
  ai_score           INT                   DEFAULT NULL,
  commercial_model   ENUM('FIXED_PRICE','TM','RETAINER','VALUE_BASED') NOT NULL DEFAULT 'FIXED_PRICE',
  last_activity_at   DATETIME              DEFAULT NULL,
  anomaly_flag       BOOLEAN      NOT NULL DEFAULT FALSE,

  PRIMARY KEY (id),
  KEY idx_deals_workspace_id (workspace_id),
  KEY idx_deals_owner_id (owner_id),
  CONSTRAINT fk_deals_owner FOREIGN KEY (owner_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- rfq_sessions
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rfq_sessions (
  id               VARCHAR(36) NOT NULL DEFAULT (UUID()),
  created_at       DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id     VARCHAR(36) NOT NULL,
  is_deleted       BOOLEAN     NOT NULL DEFAULT FALSE,
  deleted_at       DATETIME             DEFAULT NULL,

  deal_id          VARCHAR(36)          DEFAULT NULL,
  responses        JSON                 DEFAULT NULL,
  completion_pct   INT         NOT NULL DEFAULT 0,
  status           VARCHAR(50) NOT NULL DEFAULT 'draft',

  PRIMARY KEY (id),
  KEY idx_rfq_sessions_workspace_id (workspace_id),
  KEY idx_rfq_sessions_deal_id (deal_id),
  CONSTRAINT fk_rfq_sessions_deal FOREIGN KEY (deal_id) REFERENCES deals (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- risk_items
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS risk_items (
  id                 VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id       VARCHAR(36)  NOT NULL,
  is_deleted         BOOLEAN      NOT NULL DEFAULT FALSE,
  deleted_at         DATETIME              DEFAULT NULL,

  project_id         VARCHAR(36)  NOT NULL,
  title              VARCHAR(500) NOT NULL,
  category           VARCHAR(100)          DEFAULT NULL,
  probability        INT                   DEFAULT NULL,
  impact             INT                   DEFAULT NULL,
  score              INT                   DEFAULT NULL,
  status             VARCHAR(50)  NOT NULL DEFAULT 'open',
  response_strategy  TEXT                  DEFAULT NULL,
  owner_id           VARCHAR(36)           DEFAULT NULL,
  trend              VARCHAR(20)           DEFAULT NULL,

  PRIMARY KEY (id),
  KEY idx_risk_items_project_id (project_id),
  KEY idx_risk_items_owner_id (owner_id),
  KEY idx_risk_items_workspace_id (workspace_id),
  CONSTRAINT fk_risk_items_project FOREIGN KEY (project_id) REFERENCES projects (id),
  CONSTRAINT fk_risk_items_owner   FOREIGN KEY (owner_id)   REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- compliance_controls
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS compliance_controls (
  id            VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id  VARCHAR(36)  NOT NULL,
  is_deleted    BOOLEAN      NOT NULL DEFAULT FALSE,
  deleted_at    DATETIME              DEFAULT NULL,

  project_id    VARCHAR(36)  NOT NULL,
  framework     VARCHAR(100) NOT NULL,
  control_name  VARCHAR(500) NOT NULL,
  status        ENUM('OK','PARTIAL','CRITICAL') NOT NULL DEFAULT 'PARTIAL',
  score         INT                   DEFAULT NULL,
  evidence_url  TEXT                  DEFAULT NULL,
  deadline      DATE                  DEFAULT NULL,
  owner_id      VARCHAR(36)           DEFAULT NULL,

  PRIMARY KEY (id),
  KEY idx_compliance_controls_project_id (project_id),
  KEY idx_compliance_controls_owner_id (owner_id),
  KEY idx_compliance_controls_workspace_id (workspace_id),
  CONSTRAINT fk_compliance_controls_project FOREIGN KEY (project_id) REFERENCES projects (id),
  CONSTRAINT fk_compliance_controls_owner   FOREIGN KEY (owner_id)   REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- ju_files  (Juntify meeting / scoping files)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ju_files (
  id                VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id      VARCHAR(36)  NOT NULL,
  is_deleted        BOOLEAN      NOT NULL DEFAULT FALSE,
  deleted_at        DATETIME              DEFAULT NULL,

  meeting_id        VARCHAR(36)           DEFAULT NULL,
  meeting_stage     ENUM('pre-contract','post-contract') NOT NULL DEFAULT 'pre-contract',
  deal_id           VARCHAR(36)           DEFAULT NULL,
  project_id        VARCHAR(36)           DEFAULT NULL,
  transcript        LONGTEXT              DEFAULT NULL,
  participants      JSON                  DEFAULT NULL,
  ai_scope_outputs  JSON                  DEFAULT NULL,
  status            ENUM('RECEIVED','PROCESSED','FAILED') NOT NULL DEFAULT 'RECEIVED',

  PRIMARY KEY (id),
  KEY idx_ju_files_workspace_id (workspace_id),
  KEY idx_ju_files_meeting_id (meeting_id),
  KEY idx_ju_files_deal_id (deal_id),
  KEY idx_ju_files_project_id (project_id),
  CONSTRAINT fk_ju_files_deal    FOREIGN KEY (deal_id)    REFERENCES deals (id),
  CONSTRAINT fk_ju_files_project FOREIGN KEY (project_id) REFERENCES projects (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- ai_outputs
-- Stores validated JSON from every OpenAI call.
-- AI recommends only — outputs must never auto-mutate records.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_outputs (
  id             VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id   VARCHAR(36)  NOT NULL,
  is_deleted     BOOLEAN      NOT NULL DEFAULT FALSE,
  deleted_at     DATETIME              DEFAULT NULL,

  job_type       VARCHAR(50)  NOT NULL,
  status         ENUM('PENDING','RUNNING','DONE','FAILED') NOT NULL DEFAULT 'PENDING',
  input_hash     VARCHAR(64)           DEFAULT NULL,
  output_json    JSON                  DEFAULT NULL,
  tokens_used    INT                   DEFAULT NULL,
  error_message  TEXT                  DEFAULT NULL,

  PRIMARY KEY (id),
  KEY idx_ai_outputs_workspace_id (workspace_id),
  KEY idx_ai_outputs_input_hash (input_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- audit_log
-- INSERT-ONLY — never UPDATE or DELETE rows in this table.
-- No is_deleted / deleted_at / updated_at columns by design.
-- Every service-layer DB write must produce one row here.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id             VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- intentionally no updated_at, is_deleted, deleted_at

  workspace_id   VARCHAR(36)   NOT NULL,
  user_id        VARCHAR(36)            DEFAULT NULL,
  action         VARCHAR(100)  NOT NULL,
  module         VARCHAR(50)   NOT NULL,
  record_id      VARCHAR(36)            DEFAULT NULL,
  payload_delta  JSON                   DEFAULT NULL,
  `timestamp`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_audit_log_workspace_id (workspace_id),
  KEY idx_audit_log_user_id (user_id),
  KEY idx_audit_log_record_id (record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


SET foreign_key_checks = 1;
