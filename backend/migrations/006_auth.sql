-- =============================================================
-- 006_auth.sql
-- LongevAI SIOP Tool — JWT auth layer
--
-- Extends `users` with the columns needed for password-based login
-- and broadens the role ENUM to cover all 10 modules + portal/viewer.
--
-- Safe to run on a DB that already has `users` populated:
--  - new columns are NULLable / have defaults
--  - existing role values (CEO, COO, PM, SALES_LEAD, CLIENT) are
--    preserved by adding them to the new ENUM list.
-- =============================================================

SET NAMES utf8mb4;

-- ---- 1. Add auth columns ------------------------------------------------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash   VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS last_login_at   DATETIME     DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS failed_attempts INT          NOT NULL DEFAULT 0;

-- ---- 2. Expand role ENUM ------------------------------------------------
-- MariaDB compares ENUM members case-insensitively, so we cannot keep both
-- legacy 'CLIENT' and new 'client'. Map legacy CLIENT rows to lowercase
-- 'client' first (none today, but be safe), then drop CLIENT from the list.
UPDATE users SET role = 'client' WHERE role = 'CLIENT';

ALTER TABLE users
  MODIFY COLUMN role ENUM(
    -- legacy values (kept for backwards compatibility, sans 'CLIENT')
    'CEO','COO','PM','SALES_LEAD',
    -- module-aligned roles
    'admin','sales','delivery_pm','tech_lead','customer_success',
    'procurement','finance','compliance','client','viewer'
  ) NOT NULL DEFAULT 'viewer';

-- ---- 3. Refresh-token store (rotated server-side) -----------------------
CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
  id            VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id  VARCHAR(36)  NOT NULL,
  is_deleted    BOOLEAN      NOT NULL DEFAULT FALSE,
  deleted_at    DATETIME              DEFAULT NULL,

  user_id       VARCHAR(36)  NOT NULL,
  token_hash    VARCHAR(128) NOT NULL,
  expires_at    DATETIME     NOT NULL,
  revoked_at    DATETIME              DEFAULT NULL,
  user_agent    VARCHAR(255)          DEFAULT NULL,
  ip_address    VARCHAR(64)           DEFAULT NULL,

  PRIMARY KEY (id),
  UNIQUE  KEY uq_refresh_token_hash (token_hash),
  KEY     idx_refresh_user (user_id),
  KEY     idx_refresh_workspace (workspace_id, is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
