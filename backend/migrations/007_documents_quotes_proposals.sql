-- =============================================================
-- 007_documents_quotes_proposals.sql
-- LongevAI SIOP Tool — Foundation for documents, quotes,
-- proposals, change orders, and atomic folio sequences.
--
-- Conventions:
--   - VARCHAR(36) UUID primary keys
--   - created_at / updated_at / workspace_id / is_deleted / deleted_at
--   - InnoDB / utf8mb4_unicode_ci
--   - Service layer must insert audit_log on every write
--   - Folio format: {KIND}-{YEAR}-{NNNN}  e.g. PRO-2026-0001
-- =============================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;


-- -------------------------------------------------------------
-- document_sequences
-- Atomic folio counter per (workspace_id, kind, year).
-- Service layer increments via:
--   INSERT INTO document_sequences (workspace_id, kind, year, last_number)
--     VALUES (?, ?, ?, 1)
--   ON DUPLICATE KEY UPDATE last_number = last_number + 1;
--   SELECT last_number FROM document_sequences
--     WHERE workspace_id=? AND kind=? AND year=?;
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS document_sequences (
  workspace_id   VARCHAR(36)   NOT NULL,
  kind           VARCHAR(40)   NOT NULL,
  year           SMALLINT      NOT NULL,
  last_number    INT           NOT NULL DEFAULT 0,
  updated_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (workspace_id, kind, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- documents
-- Universal repository of generated documents (PDFs).
-- Each row = one rendered version of a document tied to a
-- source resource (meeting, deal, project, sprint, etc.).
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
  id              VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id    VARCHAR(36)   NOT NULL,
  is_deleted      BOOLEAN       NOT NULL DEFAULT FALSE,
  deleted_at      DATETIME               DEFAULT NULL,

  folio           VARCHAR(40)   NOT NULL,
  kind            ENUM(
                    'minute','quote','proposal','sow','contract',
                    'kickoff','sprint_report','sprint_plan','sprint_retro',
                    'status_weekly','qbr','postmortem','change_order',
                    'invoice','nda','msa','uat_report','discovery_report',
                    'pmo_review','risk_register','renewal_proposal',
                    'compliance_audit','supplier_evaluation','case_study',
                    'health_card','bug_report','acceptance','onepager',
                    'tech_brief','wbs_estimate','capacity_plan','timesheet',
                    'po','supplier_quote','statement','onboarding_pack',
                    'internal_kickoff','daily_standup','baa','siop_weekly'
                  ) NOT NULL,
  source_table    VARCHAR(64)            DEFAULT NULL,
  source_id       VARCHAR(36)            DEFAULT NULL,
  client_id       VARCHAR(36)            DEFAULT NULL,
  project_id      VARCHAR(36)            DEFAULT NULL,
  deal_id         VARCHAR(36)            DEFAULT NULL,

  version         INT           NOT NULL DEFAULT 1,
  status          ENUM('draft','sent','signed','accepted','rejected','void')
                                NOT NULL DEFAULT 'draft',
  title           VARCHAR(255)  NOT NULL,
  storage_path    VARCHAR(500)           DEFAULT NULL,
  pdf_size_bytes  BIGINT                 DEFAULT NULL,
  metadata_json   JSON                   DEFAULT NULL,

  generated_by    VARCHAR(36)            DEFAULT NULL,
  sent_at         DATETIME               DEFAULT NULL,
  signed_at       DATETIME               DEFAULT NULL,
  accepted_at     DATETIME               DEFAULT NULL,
  rejected_at     DATETIME               DEFAULT NULL,
  voided_at       DATETIME               DEFAULT NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_documents_folio (workspace_id, folio),
  KEY idx_documents_workspace (workspace_id),
  KEY idx_documents_kind (kind),
  KEY idx_documents_status (status),
  KEY idx_documents_source (source_table, source_id),
  KEY idx_documents_client (client_id),
  KEY idx_documents_project (project_id),
  KEY idx_documents_deal (deal_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- quotes
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quotes (
  id              VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id    VARCHAR(36)   NOT NULL,
  is_deleted      BOOLEAN       NOT NULL DEFAULT FALSE,
  deleted_at      DATETIME               DEFAULT NULL,

  folio           VARCHAR(40)   NOT NULL,
  deal_id         VARCHAR(36)            DEFAULT NULL,
  client_id       VARCHAR(36)            DEFAULT NULL,
  rfq_session_id  VARCHAR(36)            DEFAULT NULL,

  status          ENUM('draft','sent','accepted','rejected','expired','void')
                                NOT NULL DEFAULT 'draft',
  currency        VARCHAR(3)    NOT NULL DEFAULT 'MXN',
  subtotal        DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_rate        DECIMAL(5,2)  NOT NULL DEFAULT 16.00,
  tax             DECIMAL(15,2) NOT NULL DEFAULT 0,
  total           DECIMAL(15,2) NOT NULL DEFAULT 0,

  valid_until     DATE                   DEFAULT NULL,
  terms           TEXT                   DEFAULT NULL,
  notes           TEXT                   DEFAULT NULL,
  sent_at         DATETIME               DEFAULT NULL,
  accepted_at     DATETIME               DEFAULT NULL,
  rejected_at     DATETIME               DEFAULT NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_quotes_folio (workspace_id, folio),
  KEY idx_quotes_workspace (workspace_id),
  KEY idx_quotes_deal (deal_id),
  KEY idx_quotes_client (client_id),
  KEY idx_quotes_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- quote_items
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quote_items (
  id              VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id    VARCHAR(36)   NOT NULL,
  is_deleted      BOOLEAN       NOT NULL DEFAULT FALSE,
  deleted_at      DATETIME               DEFAULT NULL,

  quote_id        VARCHAR(36)   NOT NULL,
  position        INT           NOT NULL DEFAULT 1,
  description     VARCHAR(500)  NOT NULL,
  qty             DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit            VARCHAR(40)            DEFAULT 'unit',
  unit_price      DECIMAL(15,2) NOT NULL DEFAULT 0,
  amount          DECIMAL(15,2) NOT NULL DEFAULT 0,
  role_id         VARCHAR(36)            DEFAULT NULL,
  notes           VARCHAR(255)           DEFAULT NULL,

  PRIMARY KEY (id),
  KEY idx_quote_items_quote (quote_id),
  KEY idx_quote_items_workspace (workspace_id),
  CONSTRAINT fk_quote_items_quote FOREIGN KEY (quote_id) REFERENCES quotes (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- proposals
-- Commercial proposal — may reference a quote and an RFQ.
-- Sections stored as markdown so the PDF renderer can format
-- them consistently.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proposals (
  id              VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id    VARCHAR(36)   NOT NULL,
  is_deleted      BOOLEAN       NOT NULL DEFAULT FALSE,
  deleted_at      DATETIME               DEFAULT NULL,

  folio           VARCHAR(40)   NOT NULL,
  deal_id         VARCHAR(36)            DEFAULT NULL,
  client_id       VARCHAR(36)            DEFAULT NULL,
  rfq_session_id  VARCHAR(36)            DEFAULT NULL,
  quote_id        VARCHAR(36)            DEFAULT NULL,

  title           VARCHAR(255)  NOT NULL,
  version         INT           NOT NULL DEFAULT 1,
  status          ENUM('draft','sent','accepted','rejected','withdrawn','expired')
                                NOT NULL DEFAULT 'draft',
  commercial_model ENUM('FIXED_PRICE','TM','RETAINER','VALUE_BASED')
                                NOT NULL DEFAULT 'FIXED_PRICE',

  executive_summary TEXT                 DEFAULT NULL,
  scope_md         MEDIUMTEXT            DEFAULT NULL,
  approach_md      MEDIUMTEXT            DEFAULT NULL,
  timeline_md      MEDIUMTEXT            DEFAULT NULL,
  team_md          MEDIUMTEXT            DEFAULT NULL,
  assumptions_md   MEDIUMTEXT            DEFAULT NULL,
  terms_md         MEDIUMTEXT            DEFAULT NULL,

  valid_until     DATE                   DEFAULT NULL,
  sent_at         DATETIME               DEFAULT NULL,
  accepted_at     DATETIME               DEFAULT NULL,
  rejected_at     DATETIME               DEFAULT NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_proposals_folio (workspace_id, folio),
  KEY idx_proposals_workspace (workspace_id),
  KEY idx_proposals_deal (deal_id),
  KEY idx_proposals_client (client_id),
  KEY idx_proposals_rfq (rfq_session_id),
  KEY idx_proposals_quote (quote_id),
  KEY idx_proposals_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- change_orders
-- Destination for the `change_request` analyzer.
-- Tracks scope/timeline/budget impact and approval lifecycle.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS change_orders (
  id              VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id    VARCHAR(36)   NOT NULL,
  is_deleted      BOOLEAN       NOT NULL DEFAULT FALSE,
  deleted_at      DATETIME               DEFAULT NULL,

  folio           VARCHAR(40)   NOT NULL,
  project_id      VARCHAR(36)            DEFAULT NULL,
  contract_id     VARCHAR(36)            DEFAULT NULL,
  client_id       VARCHAR(36)            DEFAULT NULL,
  meeting_id      VARCHAR(36)            DEFAULT NULL,

  title           VARCHAR(255)  NOT NULL,
  reason          TEXT                   DEFAULT NULL,
  description     TEXT                   DEFAULT NULL,

  status          ENUM('proposed','approved','rejected','applied','void')
                                NOT NULL DEFAULT 'proposed',
  scope_impact          TEXT             DEFAULT NULL,
  timeline_impact_days  INT              DEFAULT NULL,
  budget_impact         DECIMAL(15,2)    DEFAULT NULL,
  currency              VARCHAR(3)       DEFAULT 'MXN',

  requested_by    VARCHAR(36)            DEFAULT NULL,
  approved_by     VARCHAR(36)            DEFAULT NULL,
  approved_at     DATETIME               DEFAULT NULL,
  rejected_at     DATETIME               DEFAULT NULL,
  applied_at      DATETIME               DEFAULT NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_change_orders_folio (workspace_id, folio),
  KEY idx_change_orders_workspace (workspace_id),
  KEY idx_change_orders_project (project_id),
  KEY idx_change_orders_contract (contract_id),
  KEY idx_change_orders_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- invoices — patch existing table (idempotent).
-- Adds folio + status if missing so the universal documents/folio
-- machinery can apply uniformly.
-- -------------------------------------------------------------
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS folio VARCHAR(40) DEFAULT NULL AFTER deleted_at,
  ADD COLUMN IF NOT EXISTS status ENUM('draft','sent','paid','overdue','void')
                                  NOT NULL DEFAULT 'draft' AFTER folio,
  ADD COLUMN IF NOT EXISTS client_id VARCHAR(36) DEFAULT NULL,
  ADD KEY IF NOT EXISTS idx_invoices_folio (workspace_id, folio),
  ADD KEY IF NOT EXISTS idx_invoices_client (client_id),
  ADD KEY IF NOT EXISTS idx_invoices_status (status);


SET foreign_key_checks = 1;
