-- =============================================================
-- 006_deal_extra_fields.sql
-- Add expected_close, next_action, notes to deals table
-- for richer CRM tracking from AI extractions.
-- =============================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- Add fields for better lead qualification tracking
ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS expected_close DATE DEFAULT NULL AFTER ai_score,
  ADD COLUMN IF NOT EXISTS next_action VARCHAR(500) DEFAULT NULL AFTER expected_close,
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL AFTER next_action,
  ADD KEY idx_deals_expected_close (expected_close);
