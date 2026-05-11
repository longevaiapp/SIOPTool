# 🗄️ Database Schema

> MySQL 8.0+ on Hostinger

---

## Current State

### Migration 001 (Existing)

| Table | Status | Description |
|-------|--------|-------------|
| `organizations` | ✅ | Top-level tenant |
| `workspaces` | ✅ | Workspace per org |
| `users` | ✅ | System users |
| `projects` | ✅ | HealthTech projects |
| `sprints` | ✅ | Project sprints |
| `tasks` | ✅ | Sprint tasks |
| `deals` | ✅ | CRM deals |
| `rfq_sessions` | ✅ | RFQ questionnaires |
| `risk_items` | ✅ | Project risks |
| `compliance_controls` | ✅ | Regulatory controls |
| `ju_files` | ✅ | Meeting transcriptions |
| `ai_outputs` | ✅ | AI analysis results |
| `audit_log` | ✅ | INSERT-only audit trail |

---

## Migration 002 (Needed)

### New Tables

#### `clients`
Customer entity (separate from deals)

```sql
CREATE TABLE clients (
  id              VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id    VARCHAR(36) NOT NULL,
  is_deleted      BOOLEAN DEFAULT FALSE,
  deleted_at      DATETIME DEFAULT NULL,

  name            VARCHAR(255) NOT NULL,
  industry        VARCHAR(100),
  tier            ENUM('enterprise','mid-market','growth','internal') DEFAULT 'growth',
  health_score    INT,
  nps_score       INT,
  arr             DECIMAL(15,2),
  renewal_date    DATE,
  primary_contact_id VARCHAR(36),
  
  KEY idx_clients_workspace (workspace_id)
);
```

#### `contacts`
Contacts per client/deal

```sql
CREATE TABLE contacts (
  id              VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id    VARCHAR(36) NOT NULL,
  is_deleted      BOOLEAN DEFAULT FALSE,
  deleted_at      DATETIME DEFAULT NULL,

  client_id       VARCHAR(36),
  deal_id         VARCHAR(36),
  full_name       VARCHAR(255) NOT NULL,
  email           VARCHAR(255),
  phone           VARCHAR(50),
  title           VARCHAR(100),
  is_decision_maker BOOLEAN DEFAULT FALSE,
  
  KEY idx_contacts_client (client_id),
  KEY idx_contacts_deal (deal_id)
);
```

#### `team_members`
Internal team resources (FTEs)

```sql
CREATE TABLE team_members (
  id              VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id    VARCHAR(36) NOT NULL,
  is_deleted      BOOLEAN DEFAULT FALSE,
  deleted_at      DATETIME DEFAULT NULL,

  user_id         VARCHAR(36),
  role_title      VARCHAR(100) NOT NULL,
  department      VARCHAR(50),
  hourly_cost     DECIMAL(10,2),
  weekly_capacity_hours INT DEFAULT 40,
  utilization_target INT DEFAULT 80,
  skills          JSON,
  
  KEY idx_team_members_user (user_id)
);
```

#### `team_assignments`
Resource assignments to projects

```sql
CREATE TABLE team_assignments (
  id              VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id    VARCHAR(36) NOT NULL,
  is_deleted      BOOLEAN DEFAULT FALSE,
  deleted_at      DATETIME DEFAULT NULL,

  team_member_id  VARCHAR(36) NOT NULL,
  project_id      VARCHAR(36) NOT NULL,
  role_in_project VARCHAR(100),
  allocation_pct  INT DEFAULT 100,
  start_date      DATE,
  end_date        DATE,
  
  KEY idx_assignments_member (team_member_id),
  KEY idx_assignments_project (project_id)
);
```

#### `suppliers`
External vendors and partners

```sql
CREATE TABLE suppliers (
  id              VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id    VARCHAR(36) NOT NULL,
  is_deleted      BOOLEAN DEFAULT FALSE,
  deleted_at      DATETIME DEFAULT NULL,

  name            VARCHAR(255) NOT NULL,
  category        VARCHAR(100),
  ai_score        INT,
  sla_compliance  DECIMAL(5,2),
  monthly_cost    DECIMAL(15,2),
  status          ENUM('active','trial','review','inactive') DEFAULT 'review',
  tags            JSON,
  
  KEY idx_suppliers_workspace (workspace_id)
);
```

#### `supplier_contracts`
Contracts with suppliers

```sql
CREATE TABLE supplier_contracts (
  id              VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id    VARCHAR(36) NOT NULL,
  is_deleted      BOOLEAN DEFAULT FALSE,
  deleted_at      DATETIME DEFAULT NULL,

  supplier_id     VARCHAR(36) NOT NULL,
  contract_type   VARCHAR(100),
  start_date      DATE,
  end_date        DATE,
  value           DECIMAL(15,2),
  terms           TEXT,
  auto_renew      BOOLEAN DEFAULT FALSE,
  
  KEY idx_contracts_supplier (supplier_id)
);
```

#### `invoices`
Project invoicing

```sql
CREATE TABLE invoices (
  id              VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id    VARCHAR(36) NOT NULL,
  is_deleted      BOOLEAN DEFAULT FALSE,
  deleted_at      DATETIME DEFAULT NULL,

  project_id      VARCHAR(36) NOT NULL,
  client_id       VARCHAR(36),
  invoice_number  VARCHAR(50),
  amount          DECIMAL(15,2) NOT NULL,
  status          ENUM('draft','sent','paid','overdue') DEFAULT 'draft',
  due_date        DATE,
  paid_date       DATE,
  
  KEY idx_invoices_project (project_id)
);
```

#### `expenses`
Project expenses

```sql
CREATE TABLE expenses (
  id              VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id    VARCHAR(36) NOT NULL,
  is_deleted      BOOLEAN DEFAULT FALSE,
  deleted_at      DATETIME DEFAULT NULL,

  project_id      VARCHAR(36) NOT NULL,
  category        VARCHAR(100),
  description     VARCHAR(500),
  amount          DECIMAL(15,2) NOT NULL,
  expense_date    DATE,
  approved_by     VARCHAR(36),
  
  KEY idx_expenses_project (project_id)
);
```

#### `siop_snapshots`
Historical SIOP state

```sql
CREATE TABLE siop_snapshots (
  id              VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  workspace_id    VARCHAR(36) NOT NULL,

  snapshot_date   DATE NOT NULL,
  demand_data     JSON,
  capacity_data   JSON,
  operations_data JSON,
  gap_analysis    JSON,
  siop_score      INT,
  
  KEY idx_snapshots_date (snapshot_date)
);
```

#### `siop_scenarios`
AI-generated scenarios

```sql
CREATE TABLE siop_scenarios (
  id              VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id    VARCHAR(36) NOT NULL,
  is_deleted      BOOLEAN DEFAULT FALSE,
  deleted_at      DATETIME DEFAULT NULL,

  snapshot_id     VARCHAR(36),
  scenario_type   ENUM('optimistic','base','pessimistic') NOT NULL,
  probability     INT,
  metrics         JSON,
  requirements    JSON,
  ai_output_id    VARCHAR(36),
  
  KEY idx_scenarios_snapshot (snapshot_id)
);
```

#### `siop_decisions`
Decisions made in SIOP cycle

```sql
CREATE TABLE siop_decisions (
  id              VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id    VARCHAR(36) NOT NULL,
  is_deleted      BOOLEAN DEFAULT FALSE,
  deleted_at      DATETIME DEFAULT NULL,

  snapshot_id     VARCHAR(36),
  title           VARCHAR(500) NOT NULL,
  description     TEXT,
  owner_id        VARCHAR(36),
  due_date        DATE,
  priority        ENUM('critical','high','medium','low') DEFAULT 'medium',
  status          ENUM('pending','in_progress','completed','cancelled') DEFAULT 'pending',
  
  KEY idx_decisions_snapshot (snapshot_id)
);
```

#### `nps_surveys`
NPS tracking

```sql
CREATE TABLE nps_surveys (
  id              VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  workspace_id    VARCHAR(36) NOT NULL,

  client_id       VARCHAR(36) NOT NULL,
  project_id      VARCHAR(36),
  score           INT NOT NULL,
  feedback        TEXT,
  survey_type     VARCHAR(50),
  contact_id      VARCHAR(36),
  
  KEY idx_nps_client (client_id)
);
```

#### `ai_insights`
Cross-module AI insights

```sql
CREATE TABLE ai_insights (
  id              VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id    VARCHAR(36) NOT NULL,
  is_deleted      BOOLEAN DEFAULT FALSE,
  deleted_at      DATETIME DEFAULT NULL,

  priority        ENUM('critical','high','medium','opportunity') NOT NULL,
  module          VARCHAR(50) NOT NULL,
  title           VARCHAR(500) NOT NULL,
  body            TEXT,
  action_recommended TEXT,
  confidence      INT,
  related_record_type VARCHAR(50),
  related_record_id VARCHAR(36),
  status          ENUM('active','acknowledged','resolved','dismissed') DEFAULT 'active',
  
  KEY idx_insights_priority (priority),
  KEY idx_insights_module (module)
);
```

#### `alerts`
System alerts

```sql
CREATE TABLE alerts (
  id              VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  workspace_id    VARCHAR(36) NOT NULL,

  severity        ENUM('critical','warning','info') NOT NULL,
  source_module   VARCHAR(50) NOT NULL,
  title           VARCHAR(500) NOT NULL,
  message         TEXT,
  related_record_type VARCHAR(50),
  related_record_id VARCHAR(36),
  acknowledged_at DATETIME,
  acknowledged_by VARCHAR(36),
  
  KEY idx_alerts_severity (severity)
);
```

#### `client_portal_access`
External client access

```sql
CREATE TABLE client_portal_access (
  id              VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id    VARCHAR(36) NOT NULL,
  is_deleted      BOOLEAN DEFAULT FALSE,
  deleted_at      DATETIME DEFAULT NULL,

  client_id       VARCHAR(36) NOT NULL,
  contact_id      VARCHAR(36) NOT NULL,
  project_id      VARCHAR(36),
  access_token    VARCHAR(255),
  expires_at      DATETIME,
  permissions     JSON,
  last_access_at  DATETIME,
  
  KEY idx_portal_client (client_id)
);
```

#### `approvals`
Pending approvals

```sql
CREATE TABLE approvals (
  id              VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  workspace_id    VARCHAR(36) NOT NULL,
  is_deleted      BOOLEAN DEFAULT FALSE,
  deleted_at      DATETIME DEFAULT NULL,

  project_id      VARCHAR(36) NOT NULL,
  approval_type   VARCHAR(100) NOT NULL,
  title           VARCHAR(500) NOT NULL,
  description     TEXT,
  requested_by    VARCHAR(36),
  requested_from  VARCHAR(36),
  due_date        DATE,
  status          ENUM('pending','approved','rejected') DEFAULT 'pending',
  responded_at    DATETIME,
  
  KEY idx_approvals_project (project_id)
);
```

#### `reports`
Generated reports

```sql
CREATE TABLE reports (
  id              VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  workspace_id    VARCHAR(36) NOT NULL,

  report_type     VARCHAR(100) NOT NULL,
  title           VARCHAR(255) NOT NULL,
  parameters      JSON,
  output_url      TEXT,
  generated_by    VARCHAR(36),
  
  KEY idx_reports_type (report_type)
);
```

#### `siop_analyzers`
Juntify internal - AI analyzers

```sql
CREATE TABLE siop_analyzers (
  id              VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted      BOOLEAN DEFAULT FALSE,
  deleted_at      DATETIME DEFAULT NULL,

  name            VARCHAR(100) NOT NULL,
  display_name    VARCHAR(200),
  description     TEXT,
  system_prompt   TEXT NOT NULL,
  user_prompt     TEXT NOT NULL,
  output_schema   JSON,
  target_module   VARCHAR(50),
  temperature     DECIMAL(3,2) DEFAULT 0.30,
  is_active       BOOLEAN DEFAULT TRUE,
  sort_order      INT DEFAULT 0,
  
  UNIQUE KEY uq_analyzers_name (name)
);
```

---

## Schema Modifications (Migration 002)

### Add to `deals`

```sql
ALTER TABLE deals ADD COLUMN contact_id VARCHAR(36);
ALTER TABLE deals ADD COLUMN client_id VARCHAR(36);
ALTER TABLE deals ADD COLUMN expected_close_date DATE;
ALTER TABLE deals ADD COLUMN lost_reason VARCHAR(255);
ALTER TABLE deals ADD COLUMN competitor VARCHAR(255);
ALTER TABLE deals ADD COLUMN icp_match_score INT;
ALTER TABLE deals ADD COLUMN source VARCHAR(100);
```

### Add to `projects`

```sql
ALTER TABLE projects ADD COLUMN deal_id VARCHAR(36);
ALTER TABLE projects ADD COLUMN client_id VARCHAR(36);
ALTER TABLE projects ADD COLUMN start_date DATE;
ALTER TABLE projects ADD COLUMN target_end_date DATE;
ALTER TABLE projects ADD COLUMN actual_end_date DATE;
ALTER TABLE projects ADD COLUMN total_revenue DECIMAL(15,2);
ALTER TABLE projects ADD COLUMN total_cost DECIMAL(15,2);
ALTER TABLE projects ADD COLUMN margin_pct DECIMAL(5,2);
ALTER TABLE projects ADD COLUMN nps_score INT;
```

### Add to `tasks`

```sql
ALTER TABLE tasks ADD COLUMN source_meeting_id VARCHAR(36);
ALTER TABLE tasks ADD COLUMN priority ENUM('low','medium','high','critical') DEFAULT 'medium';
ALTER TABLE tasks ADD COLUMN due_date DATE;
ALTER TABLE tasks ADD COLUMN due_time TIME;
ALTER TABLE tasks ADD COLUMN assigned_by_id VARCHAR(36);
ALTER TABLE tasks ADD COLUMN progress INT DEFAULT 0;
```

### Add to `ju_files`

```sql
ALTER TABLE ju_files ADD COLUMN analyzer_id VARCHAR(36);
ALTER TABLE ju_files ADD COLUMN meeting_type VARCHAR(50);
ALTER TABLE ju_files ADD COLUMN meeting_name VARCHAR(255);
ALTER TABLE ju_files ADD COLUMN duration_minutes INT;
ALTER TABLE ju_files ADD COLUMN speakers JSON;
ALTER TABLE ju_files ADD COLUMN follow_up_of VARCHAR(36);
ALTER TABLE ju_files ADD COLUMN user_id VARCHAR(36);
```

### Add to `users`

```sql
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN last_login_at DATETIME;
ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
```

---

## Table Count Summary

| Category | Count |
|----------|-------|
| Existing (001) | 13 |
| New tables (002) | 18 |
| **Total** | **31** |

---

## Foreign Key Relationships

```
organizations
    └── workspaces
            └── users
            └── clients
                  └── contacts
                  └── nps_surveys
                  └── client_portal_access
            └── deals
                  └── contacts
                  └── rfq_sessions
            └── projects
                  └── sprints
                        └── tasks
                  └── risk_items
                  └── compliance_controls
                  └── invoices
                  └── expenses
                  └── approvals
            └── team_members
                  └── team_assignments
            └── suppliers
                  └── supplier_contracts
            └── siop_snapshots
                  └── siop_scenarios
                  └── siop_decisions
            └── ai_insights
            └── alerts
            └── reports
            └── ju_files (meetings)
            └── ai_outputs
            └── audit_log
```
