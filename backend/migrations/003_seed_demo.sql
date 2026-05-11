-- =============================================================
-- 003_seed_demo.sql
-- Minimal bootstrap: one org + one workspace + one demo user.
-- All other data must be created through the application API
-- so that audit_log entries exist.
-- =============================================================

INSERT INTO organizations (id, name, slug, plan)
VALUES ('org-demo', 'LongevAI Demo', 'longevai-demo', 'pro')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO workspaces (id, org_id, name)
VALUES ('ws-demo', 'org-demo', 'Default Workspace')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO users (id, workspace_id, email, full_name, role)
VALUES ('usr-demo', 'ws-demo', 'demo@longevai.com', 'Demo User', 'CEO')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name);
