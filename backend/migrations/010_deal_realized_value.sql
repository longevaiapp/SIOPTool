-- =============================================================
-- 010_deal_realized_value.sql
-- Track invoice-realized revenue per deal and last activity
-- timestamp so the CRM pipeline can light up active deals.
-- =============================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS realized_value DECIMAL(14,2) DEFAULT 0 AFTER value,
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP NULL DEFAULT NULL AFTER updated_at,
  ADD KEY idx_deals_last_activity (last_activity_at);
