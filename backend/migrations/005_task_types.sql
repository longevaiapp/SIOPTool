-- Extend task_type ENUM to support delivery-cycle analyzers
-- (daily standup, sprint planning, UAT, incident postmortem, change request)

ALTER TABLE tasks
  MODIFY COLUMN task_type
    ENUM(
      'FEATURE','INTEGRATION','COMPLIANCE','SECURITY','CLINICAL',
      'BUG','BLOCKER','RESEARCH','CHORE'
    ) NOT NULL DEFAULT 'FEATURE';

-- Sprint goal (free-text) — needed by sprint_planning analyzer
ALTER TABLE sprints
  ADD COLUMN IF NOT EXISTS goal VARCHAR(500) DEFAULT NULL;
