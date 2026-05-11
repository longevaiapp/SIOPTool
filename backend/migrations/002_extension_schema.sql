-- =============================================================
-- 002_extension_schema.sql
-- LongevAI SIOP Tool — Tables introduced after the base schema
-- to cover all 10 modules (CRM, RFQ, Contracts, PM, PMO, Customer
-- Health, Client Portal, Suppliers, SIOP Engine, Analytics).
--
-- Conventions match 001_base_schema.sql:
--   - VARCHAR(36) UUID primary keys
--   - created_at / updated_at / workspace_id / is_deleted / deleted_at
--   - InnoDB / utf8mb4_unicode_ci
--   - Service layer must insert audit_log on every write
-- =============================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;


-- -------------------------------------------------------------
-- clients
-- First-class entity (not just deals.client_name).
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clients (
  id              VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id    VARCHAR(36)   NOT NULL,
  is_deleted      BOOLEAN       NOT NULL DEFAULT FALSE,
  deleted_at      DATETIME               DEFAULT NULL,

  name            VARCHAR(255)  NOT NULL,
  industry        VARCHAR(100)           DEFAULT NULL,
  segment         ENUM('STRATEGIC','GROWTH','LONG_TAIL') NOT NULL DEFAULT 'GROWTH',
  status          ENUM('PROSPECT','ACTIVE','CHURNED','DORMANT') NOT NULL DEFAULT 'PROSPECT',
  health_score    INT                    DEFAULT NULL,
  arr             DECIMAL(15,2)          DEFAULT NULL,
  mrr             DECIMAL(15,2)          DEFAULT NULL,
  contract_value  DECIMAL(15,2)          DEFAULT NULL,
  csat            DECIMAL(3,2)           DEFAULT NULL,
  nps             INT                    DEFAULT NULL,
  primary_contact_name   VARCHAR(255)    DEFAULT NULL,
  primary_contact_email  VARCHAR(255)    DEFAULT NULL,
  primary_contact_role   VARCHAR(100)    DEFAULT NULL,
  account_manager_id     VARCHAR(36)     DEFAULT NULL,
  notes           TEXT                   DEFAULT NULL,

  PRIMARY KEY (id),
  KEY idx_clients_workspace_id (workspace_id),
  KEY idx_clients_status (status),
  KEY idx_clients_segment (segment),
  KEY idx_clients_account_manager (account_manager_id),
  CONSTRAINT fk_clients_account_manager FOREIGN KEY (account_manager_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- Add client_id to deals / projects / rfq_sessions (nullable for
-- backwards-compatibility with existing data; service layer
-- enforces the relation going forward).
-- -------------------------------------------------------------
ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS client_id VARCHAR(36) DEFAULT NULL,
  ADD KEY idx_deals_client_id (client_id),
  ADD CONSTRAINT fk_deals_client FOREIGN KEY (client_id) REFERENCES clients (id);

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS client_id VARCHAR(36) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deal_id   VARCHAR(36) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS contract_id VARCHAR(36) DEFAULT NULL,
  ADD KEY idx_projects_client_id (client_id),
  ADD KEY idx_projects_deal_id (deal_id),
  ADD CONSTRAINT fk_projects_client FOREIGN KEY (client_id) REFERENCES clients (id),
  ADD CONSTRAINT fk_projects_deal   FOREIGN KEY (deal_id)   REFERENCES deals (id);

ALTER TABLE rfq_sessions
  ADD COLUMN IF NOT EXISTS client_id VARCHAR(36) DEFAULT NULL,
  ADD KEY idx_rfq_sessions_client_id (client_id),
  ADD CONSTRAINT fk_rfq_sessions_client FOREIGN KEY (client_id) REFERENCES clients (id);


-- -------------------------------------------------------------
-- contracts
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contracts (
  id              VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id    VARCHAR(36)   NOT NULL,
  is_deleted      BOOLEAN       NOT NULL DEFAULT FALSE,
  deleted_at      DATETIME               DEFAULT NULL,

  contract_type   ENUM('MSA','SOW','BAA','NDA','AMENDMENT') NOT NULL DEFAULT 'SOW',
  title           VARCHAR(500)  NOT NULL,
  client_id       VARCHAR(36)   NOT NULL,
  project_id      VARCHAR(36)            DEFAULT NULL,
  deal_id         VARCHAR(36)            DEFAULT NULL,
  status          ENUM('DRAFT','REVIEW','SIGNED','EXPIRED','TERMINATED') NOT NULL DEFAULT 'DRAFT',
  value           DECIMAL(15,2)          DEFAULT 0,
  signed_date     DATE                   DEFAULT NULL,
  expiry_date     DATE                   DEFAULT NULL,
  signers         JSON                   DEFAULT NULL,
  compliance_controls JSON               DEFAULT NULL,
  document_url    TEXT                   DEFAULT NULL,
  hipaa_required  BOOLEAN       NOT NULL DEFAULT FALSE,
  baa_signed      BOOLEAN       NOT NULL DEFAULT FALSE,
  notes           TEXT                   DEFAULT NULL,

  PRIMARY KEY (id),
  KEY idx_contracts_workspace_id (workspace_id),
  KEY idx_contracts_client_id (client_id),
  KEY idx_contracts_project_id (project_id),
  KEY idx_contracts_deal_id (deal_id),
  CONSTRAINT fk_contracts_client  FOREIGN KEY (client_id)  REFERENCES clients (id),
  CONSTRAINT fk_contracts_project FOREIGN KEY (project_id) REFERENCES projects (id),
  CONSTRAINT fk_contracts_deal    FOREIGN KEY (deal_id)    REFERENCES deals (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- meetings
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meetings (
  id                VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id      VARCHAR(36)   NOT NULL,
  is_deleted        BOOLEAN       NOT NULL DEFAULT FALSE,
  deleted_at        DATETIME               DEFAULT NULL,

  title             VARCHAR(500)  NOT NULL,
  meeting_type      VARCHAR(50)   NOT NULL DEFAULT 'discovery_rfq',
  status            ENUM('SCHEDULED','RECORDING','PROCESSING','ANALYZED','FAILED','COMPLETED') NOT NULL DEFAULT 'SCHEDULED',
  scheduled_at      DATETIME               DEFAULT NULL,
  duration_minutes  INT                    DEFAULT NULL,
  client_id         VARCHAR(36)            DEFAULT NULL,
  deal_id           VARCHAR(36)            DEFAULT NULL,
  project_id        VARCHAR(36)            DEFAULT NULL,
  participants      JSON                   DEFAULT NULL,
  transcript        LONGTEXT               DEFAULT NULL,
  audio_url         TEXT                   DEFAULT NULL,
  notes             TEXT                   DEFAULT NULL,
  ai_outputs        JSON                   DEFAULT NULL,

  PRIMARY KEY (id),
  KEY idx_meetings_workspace_id (workspace_id),
  KEY idx_meetings_client_id (client_id),
  KEY idx_meetings_deal_id (deal_id),
  KEY idx_meetings_project_id (project_id),
  CONSTRAINT fk_meetings_client  FOREIGN KEY (client_id)  REFERENCES clients (id),
  CONSTRAINT fk_meetings_deal    FOREIGN KEY (deal_id)    REFERENCES deals (id),
  CONSTRAINT fk_meetings_project FOREIGN KEY (project_id) REFERENCES projects (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- action_items (extracted from meetings)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS action_items (
  id            VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id  VARCHAR(36)   NOT NULL,
  is_deleted    BOOLEAN       NOT NULL DEFAULT FALSE,
  deleted_at    DATETIME               DEFAULT NULL,

  meeting_id    VARCHAR(36)            DEFAULT NULL,
  text          VARCHAR(1000) NOT NULL,
  assignee_id   VARCHAR(36)            DEFAULT NULL,
  assignee_name VARCHAR(255)           DEFAULT NULL,
  due_date      DATE                   DEFAULT NULL,
  priority      ENUM('LOW','MEDIUM','HIGH','URGENT') NOT NULL DEFAULT 'MEDIUM',
  module_target VARCHAR(50)            DEFAULT NULL,
  accepted      BOOLEAN       NOT NULL DEFAULT FALSE,

  PRIMARY KEY (id),
  KEY idx_action_items_meeting_id (meeting_id),
  KEY idx_action_items_workspace_id (workspace_id),
  CONSTRAINT fk_action_items_meeting FOREIGN KEY (meeting_id) REFERENCES meetings (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- programs (PMO)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS programs (
  id                  VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id        VARCHAR(36)   NOT NULL,
  is_deleted          BOOLEAN       NOT NULL DEFAULT FALSE,
  deleted_at          DATETIME               DEFAULT NULL,

  name                VARCHAR(255)  NOT NULL,
  description         TEXT                   DEFAULT NULL,
  lead_id             VARCHAR(36)            DEFAULT NULL,
  strategic_priority  ENUM('P0','P1','P2')   NOT NULL DEFAULT 'P1',
  status              ENUM('ON_TRACK','AT_RISK','DELAYED') NOT NULL DEFAULT 'ON_TRACK',
  risk                ENUM('LOW','MEDIUM','HIGH') NOT NULL DEFAULT 'LOW',
  progress            INT                    NOT NULL DEFAULT 0,
  portfolio_value     DECIMAL(15,2)          NOT NULL DEFAULT 0,

  PRIMARY KEY (id),
  KEY idx_programs_workspace_id (workspace_id),
  KEY idx_programs_lead_id (lead_id),
  CONSTRAINT fk_programs_lead FOREIGN KEY (lead_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- program_projects (M:N program ↔ project)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS program_projects (
  id            VARCHAR(36) NOT NULL DEFAULT (UUID()),
  created_at    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id  VARCHAR(36) NOT NULL,
  is_deleted    BOOLEAN     NOT NULL DEFAULT FALSE,
  deleted_at    DATETIME             DEFAULT NULL,

  program_id    VARCHAR(36) NOT NULL,
  project_id    VARCHAR(36) NOT NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_program_project (program_id, project_id),
  KEY idx_program_projects_workspace_id (workspace_id),
  CONSTRAINT fk_program_projects_program FOREIGN KEY (program_id) REFERENCES programs (id),
  CONSTRAINT fk_program_projects_project FOREIGN KEY (project_id) REFERENCES projects (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- suppliers
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
  id              VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id    VARCHAR(36)   NOT NULL,
  is_deleted      BOOLEAN       NOT NULL DEFAULT FALSE,
  deleted_at      DATETIME               DEFAULT NULL,

  name            VARCHAR(255)  NOT NULL,
  category        ENUM('INFRASTRUCTURE','ML_OPS','CONSULTING','DATA','SECURITY','OTHER') NOT NULL DEFAULT 'OTHER',
  status          ENUM('ACTIVE','INACTIVE','PENDING','BLOCKED') NOT NULL DEFAULT 'ACTIVE',
  contact_name    VARCHAR(255)           DEFAULT NULL,
  contact_email   VARCHAR(255)           DEFAULT NULL,
  spend_ytd       DECIMAL(15,2)          DEFAULT 0,
  contract_value  DECIMAL(15,2)          DEFAULT 0,
  performance_score INT                  DEFAULT NULL,
  risk_level      ENUM('LOW','MEDIUM','HIGH') NOT NULL DEFAULT 'LOW',
  compliance_certs JSON                  DEFAULT NULL,
  notes           TEXT                   DEFAULT NULL,

  PRIMARY KEY (id),
  KEY idx_suppliers_workspace_id (workspace_id),
  KEY idx_suppliers_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- invoices
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id            VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id  VARCHAR(36)   NOT NULL,
  is_deleted    BOOLEAN       NOT NULL DEFAULT FALSE,
  deleted_at    DATETIME               DEFAULT NULL,

  number        VARCHAR(50)   NOT NULL,
  client_id     VARCHAR(36)   NOT NULL,
  project_id    VARCHAR(36)            DEFAULT NULL,
  contract_id   VARCHAR(36)            DEFAULT NULL,
  amount        DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency      VARCHAR(8)    NOT NULL DEFAULT 'USD',
  status        ENUM('DRAFT','SENT','PAID','OVERDUE','VOID') NOT NULL DEFAULT 'DRAFT',
  issue_date    DATE                   DEFAULT NULL,
  due_date      DATE                   DEFAULT NULL,
  paid_date     DATE                   DEFAULT NULL,
  notes         TEXT                   DEFAULT NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_invoices_workspace_number (workspace_id, number),
  KEY idx_invoices_workspace_id (workspace_id),
  KEY idx_invoices_client_id (client_id),
  KEY idx_invoices_project_id (project_id),
  CONSTRAINT fk_invoices_client   FOREIGN KEY (client_id)   REFERENCES clients (id),
  CONSTRAINT fk_invoices_project  FOREIGN KEY (project_id)  REFERENCES projects (id),
  CONSTRAINT fk_invoices_contract FOREIGN KEY (contract_id) REFERENCES contracts (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- approvals (workspace / client portal)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS approvals (
  id            VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id  VARCHAR(36)   NOT NULL,
  is_deleted    BOOLEAN       NOT NULL DEFAULT FALSE,
  deleted_at    DATETIME               DEFAULT NULL,

  title         VARCHAR(500)  NOT NULL,
  description   TEXT                   DEFAULT NULL,
  approval_type ENUM('DELIVERABLE','MILESTONE','SCOPE_CHANGE','PAYMENT','OTHER') NOT NULL DEFAULT 'DELIVERABLE',
  client_id     VARCHAR(36)            DEFAULT NULL,
  project_id    VARCHAR(36)            DEFAULT NULL,
  requested_by  VARCHAR(36)            DEFAULT NULL,
  approver_id   VARCHAR(36)            DEFAULT NULL,
  status        ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  decided_at    DATETIME               DEFAULT NULL,
  decision_note TEXT                   DEFAULT NULL,

  PRIMARY KEY (id),
  KEY idx_approvals_workspace_id (workspace_id),
  KEY idx_approvals_project_id (project_id),
  KEY idx_approvals_status (status),
  CONSTRAINT fk_approvals_client   FOREIGN KEY (client_id)   REFERENCES clients (id),
  CONSTRAINT fk_approvals_project  FOREIGN KEY (project_id)  REFERENCES projects (id),
  CONSTRAINT fk_approvals_request  FOREIGN KEY (requested_by) REFERENCES users (id),
  CONSTRAINT fk_approvals_approver FOREIGN KEY (approver_id)  REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- messages (client portal threads)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id            VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id  VARCHAR(36)   NOT NULL,
  is_deleted    BOOLEAN       NOT NULL DEFAULT FALSE,
  deleted_at    DATETIME               DEFAULT NULL,

  project_id    VARCHAR(36)            DEFAULT NULL,
  client_id     VARCHAR(36)            DEFAULT NULL,
  sender_id     VARCHAR(36)            DEFAULT NULL,
  sender_name   VARCHAR(255)  NOT NULL,
  sender_role   ENUM('INTERNAL','CLIENT','SYSTEM') NOT NULL DEFAULT 'INTERNAL',
  body          TEXT          NOT NULL,
  read_at       DATETIME               DEFAULT NULL,

  PRIMARY KEY (id),
  KEY idx_messages_workspace_id (workspace_id),
  KEY idx_messages_project_id (project_id),
  KEY idx_messages_client_id (client_id),
  CONSTRAINT fk_messages_project FOREIGN KEY (project_id) REFERENCES projects (id),
  CONSTRAINT fk_messages_client  FOREIGN KEY (client_id)  REFERENCES clients (id),
  CONSTRAINT fk_messages_sender  FOREIGN KEY (sender_id)  REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- support_tickets
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS support_tickets (
  id            VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id  VARCHAR(36)   NOT NULL,
  is_deleted    BOOLEAN       NOT NULL DEFAULT FALSE,
  deleted_at    DATETIME               DEFAULT NULL,

  number        VARCHAR(50)            DEFAULT NULL,
  title         VARCHAR(500)  NOT NULL,
  description   TEXT                   DEFAULT NULL,
  priority      ENUM('LOW','MEDIUM','HIGH','URGENT') NOT NULL DEFAULT 'MEDIUM',
  status        ENUM('OPEN','IN_PROGRESS','RESOLVED','CLOSED') NOT NULL DEFAULT 'OPEN',
  client_id     VARCHAR(36)            DEFAULT NULL,
  project_id    VARCHAR(36)            DEFAULT NULL,
  reporter_id   VARCHAR(36)            DEFAULT NULL,
  assignee_id   VARCHAR(36)            DEFAULT NULL,
  resolved_at   DATETIME               DEFAULT NULL,

  PRIMARY KEY (id),
  KEY idx_tickets_workspace_id (workspace_id),
  KEY idx_tickets_project_id (project_id),
  KEY idx_tickets_status (status),
  CONSTRAINT fk_tickets_client   FOREIGN KEY (client_id)   REFERENCES clients (id),
  CONSTRAINT fk_tickets_project  FOREIGN KEY (project_id)  REFERENCES projects (id),
  CONSTRAINT fk_tickets_reporter FOREIGN KEY (reporter_id) REFERENCES users (id),
  CONSTRAINT fk_tickets_assignee FOREIGN KEY (assignee_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- insights (AI-generated module insights)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS insights (
  id            VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id  VARCHAR(36)   NOT NULL,
  is_deleted    BOOLEAN       NOT NULL DEFAULT FALSE,
  deleted_at    DATETIME               DEFAULT NULL,

  module        VARCHAR(50)   NOT NULL,
  insight_type  VARCHAR(100)           DEFAULT NULL,
  title         VARCHAR(500)  NOT NULL,
  description   TEXT                   DEFAULT NULL,
  severity      ENUM('INFO','LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'INFO',
  related_entity_type VARCHAR(50)      DEFAULT NULL,
  related_entity_id   VARCHAR(36)      DEFAULT NULL,
  payload       JSON                   DEFAULT NULL,
  acknowledged  BOOLEAN       NOT NULL DEFAULT FALSE,
  acknowledged_at DATETIME             DEFAULT NULL,

  PRIMARY KEY (id),
  KEY idx_insights_workspace_id (workspace_id),
  KEY idx_insights_module (module)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- siop_scenarios
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS siop_scenarios (
  id            VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id  VARCHAR(36)   NOT NULL,
  is_deleted    BOOLEAN       NOT NULL DEFAULT FALSE,
  deleted_at    DATETIME               DEFAULT NULL,

  name          VARCHAR(255)  NOT NULL,
  description   TEXT                   DEFAULT NULL,
  horizon_weeks INT           NOT NULL DEFAULT 12,
  assumptions   JSON                   DEFAULT NULL,
  results       JSON                   DEFAULT NULL,
  is_baseline   BOOLEAN       NOT NULL DEFAULT FALSE,
  created_by    VARCHAR(36)            DEFAULT NULL,

  PRIMARY KEY (id),
  KEY idx_siop_scenarios_workspace_id (workspace_id),
  CONSTRAINT fk_siop_scenarios_creator FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- role_capacity (FTE planning per role)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS role_capacity (
  id              VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id    VARCHAR(36)   NOT NULL,
  is_deleted      BOOLEAN       NOT NULL DEFAULT FALSE,
  deleted_at      DATETIME               DEFAULT NULL,

  role            VARCHAR(100)  NOT NULL,
  available_fte   DECIMAL(6,2)  NOT NULL DEFAULT 0,
  committed_fte   DECIMAL(6,2)  NOT NULL DEFAULT 0,
  forecast_demand DECIMAL(6,2)  NOT NULL DEFAULT 0,
  week_start      DATE                   DEFAULT NULL,

  PRIMARY KEY (id),
  KEY idx_role_capacity_workspace_id (workspace_id),
  KEY idx_role_capacity_week (week_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- demand_forecast (weekly demand per project)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS demand_forecast (
  id            VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id  VARCHAR(36)   NOT NULL,
  is_deleted    BOOLEAN       NOT NULL DEFAULT FALSE,
  deleted_at    DATETIME               DEFAULT NULL,

  week_start    DATE          NOT NULL,
  project_id    VARCHAR(36)            DEFAULT NULL,
  role          VARCHAR(100)           DEFAULT NULL,
  demand_fte    DECIMAL(6,2)  NOT NULL DEFAULT 0,

  PRIMARY KEY (id),
  KEY idx_demand_forecast_workspace_id (workspace_id),
  KEY idx_demand_forecast_week (week_start),
  KEY idx_demand_forecast_project (project_id),
  CONSTRAINT fk_demand_forecast_project FOREIGN KEY (project_id) REFERENCES projects (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


SET foreign_key_checks = 1;
