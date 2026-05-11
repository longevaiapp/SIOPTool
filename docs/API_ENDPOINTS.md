# 📡 API Endpoints

> Complete REST API specification

---

## Base URL

- **Development**: `http://localhost:8000`
- **Production**: `https://api.sioptool.longevai.com`

## Authentication

All endpoints (except auth) require:
```
Authorization: Bearer <jwt_token>
```

---

## Module: Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login, get JWT |
| POST | `/auth/logout` | Invalidate token |
| POST | `/auth/refresh` | Refresh JWT |
| GET | `/auth/me` | Get current user |
| PUT | `/auth/me` | Update profile |
| POST | `/auth/password/change` | Change password |
| POST | `/auth/password/forgot` | Request reset |
| POST | `/auth/password/reset` | Reset password |

---

## Module: CRM

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/crm/deals` | List deals |
| POST | `/crm/deals` | Create deal |
| GET | `/crm/deals/{id}` | Get deal |
| PUT | `/crm/deals/{id}` | Update deal |
| DELETE | `/crm/deals/{id}` | Soft delete deal |
| GET | `/crm/deals/stats` | Pipeline stats |
| POST | `/crm/deals/{id}/stage` | Change stage |
| GET | `/crm/clients` | List clients |
| POST | `/crm/clients` | Create client |
| GET | `/crm/clients/{id}` | Get client |
| PUT | `/crm/clients/{id}` | Update client |
| GET | `/crm/contacts` | List contacts |
| POST | `/crm/contacts` | Create contact |
| GET | `/crm/contacts/{id}` | Get contact |
| PUT | `/crm/contacts/{id}` | Update contact |

---

## Module: RFQ

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/rfq/sessions` | List RFQ sessions |
| POST | `/rfq/sessions` | Create session |
| GET | `/rfq/sessions/{id}` | Get session |
| PUT | `/rfq/sessions/{id}` | Update session |
| DELETE | `/rfq/sessions/{id}` | Soft delete |
| POST | `/rfq/sessions/{id}/submit` | Submit for analysis |
| GET | `/rfq/sessions/{id}/analysis` | Get AI analysis |
| GET | `/rfq/templates` | List templates |
| POST | `/rfq/templates` | Create template |

---

## Module: Contracts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/contracts` | List contracts |
| POST | `/contracts` | Create contract |
| GET | `/contracts/{id}` | Get contract |
| PUT | `/contracts/{id}` | Update contract |
| DELETE | `/contracts/{id}` | Soft delete |
| POST | `/contracts/{id}/sign` | Record signature |
| GET | `/contracts/expiring` | Expiring soon |

---

## Module: Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects` | List projects |
| POST | `/projects` | Create project |
| GET | `/projects/{id}` | Get project |
| PUT | `/projects/{id}` | Update project |
| DELETE | `/projects/{id}` | Soft delete |
| GET | `/projects/{id}/sprints` | List sprints |
| POST | `/projects/{id}/sprints` | Create sprint |
| GET | `/projects/{id}/sprints/{sid}` | Get sprint |
| PUT | `/projects/{id}/sprints/{sid}` | Update sprint |
| GET | `/projects/{id}/tasks` | List tasks |
| POST | `/projects/{id}/tasks` | Create task |
| PUT | `/projects/{id}/tasks/{tid}` | Update task |
| DELETE | `/projects/{id}/tasks/{tid}` | Soft delete |
| GET | `/projects/{id}/risks` | List risks |
| POST | `/projects/{id}/risks` | Create risk |
| PUT | `/projects/{id}/risks/{rid}` | Update risk |
| GET | `/projects/{id}/team` | Get team assignments |
| POST | `/projects/{id}/team` | Add team member |

---

## Module: PMO

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/pmo/portfolio` | Portfolio overview |
| GET | `/pmo/portfolio/health` | Health metrics |
| GET | `/pmo/resources` | Resource allocation |
| GET | `/pmo/resources/conflicts` | Resource conflicts |
| GET | `/pmo/timeline` | Cross-project timeline |
| GET | `/pmo/approvals` | Pending approvals |
| POST | `/pmo/approvals/{id}/approve` | Approve |
| POST | `/pmo/approvals/{id}/reject` | Reject |

---

## Module: Customer Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health/clients` | All clients health |
| GET | `/health/clients/{id}` | Client health detail |
| GET | `/health/nps` | NPS overview |
| POST | `/health/nps` | Record NPS survey |
| GET | `/health/at-risk` | At-risk clients |
| GET | `/health/trends` | Health trends |

---

## Module: Client Portal

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/portal/access` | List portal access |
| POST | `/portal/access` | Grant access |
| DELETE | `/portal/access/{id}` | Revoke access |
| POST | `/portal/access/{id}/refresh` | Refresh token |

### Client Portal (External API)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/portal/client/projects` | Client's projects |
| GET | `/portal/client/projects/{id}` | Project detail |
| GET | `/portal/client/milestones` | Milestones |
| GET | `/portal/client/invoices` | Invoices |
| POST | `/portal/client/approvals/{id}` | Submit approval |

---

## Module: Suppliers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/suppliers` | List suppliers |
| POST | `/suppliers` | Create supplier |
| GET | `/suppliers/{id}` | Get supplier |
| PUT | `/suppliers/{id}` | Update supplier |
| DELETE | `/suppliers/{id}` | Soft delete |
| GET | `/suppliers/{id}/contracts` | Supplier contracts |
| POST | `/suppliers/{id}/contracts` | Create contract |
| PUT | `/suppliers/{id}/contracts/{cid}` | Update contract |
| GET | `/suppliers/performance` | Performance metrics |

---

## Module: SIOP Engine

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/siop/current` | Current state |
| GET | `/siop/demand` | Demand metrics |
| GET | `/siop/capacity` | Capacity metrics |
| GET | `/siop/operations` | Operations metrics |
| GET | `/siop/gaps` | Gap analysis |
| GET | `/siop/score` | SIOP score |
| POST | `/siop/snapshot` | Create snapshot |
| GET | `/siop/snapshots` | List snapshots |
| GET | `/siop/snapshots/{id}` | Get snapshot |
| GET | `/siop/scenarios` | List scenarios |
| POST | `/siop/scenarios/generate` | Generate AI scenarios |
| GET | `/siop/decisions` | Pending decisions |
| POST | `/siop/decisions` | Create decision |
| PUT | `/siop/decisions/{id}` | Update decision |

---

## Module: Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/analytics/revenue` | Revenue metrics |
| GET | `/analytics/margin` | Margin metrics |
| GET | `/analytics/utilization` | Utilization |
| GET | `/analytics/conversion` | Conversion rates |
| GET | `/analytics/forecast` | Revenue forecast |
| GET | `/analytics/trends` | Key trends |
| POST | `/analytics/reports` | Generate report |
| GET | `/analytics/reports` | List reports |
| GET | `/analytics/reports/{id}` | Get report |

---

## Module: AI Insights

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/insights` | List insights |
| GET | `/insights/critical` | Critical only |
| GET | `/insights/module/{module}` | By module |
| PUT | `/insights/{id}/acknowledge` | Acknowledge |
| PUT | `/insights/{id}/resolve` | Resolve |
| PUT | `/insights/{id}/dismiss` | Dismiss |
| GET | `/alerts` | List alerts |
| PUT | `/alerts/{id}/acknowledge` | Acknowledge alert |

---

## Module: Juntify (Meetings)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/juntify/meetings` | List meetings |
| POST | `/juntify/meetings` | Create meeting |
| GET | `/juntify/meetings/{id}` | Get meeting |
| PUT | `/juntify/meetings/{id}` | Update meeting |
| DELETE | `/juntify/meetings/{id}` | Soft delete |
| POST | `/juntify/meetings/{id}/upload` | Upload audio |
| POST | `/juntify/meetings/{id}/transcribe` | Start transcription |
| GET | `/juntify/meetings/{id}/transcript` | Get transcript |
| POST | `/juntify/meetings/{id}/analyze` | Run analysis |
| GET | `/juntify/meetings/{id}/analysis` | Get analysis |
| GET | `/juntify/meetings/{id}/tasks` | Extracted tasks |
| GET | `/juntify/analyzers` | List analyzers |
| GET | `/juntify/analyzers/{name}` | Get analyzer |

---

## Module: Compliance

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/compliance/controls` | List controls |
| POST | `/compliance/controls` | Create control |
| GET | `/compliance/controls/{id}` | Get control |
| PUT | `/compliance/controls/{id}` | Update control |
| GET | `/compliance/status` | Compliance status |
| GET | `/compliance/expiring` | Expiring controls |
| GET | `/compliance/frameworks` | Available frameworks |

---

## Module: Team

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/team/members` | List team members |
| POST | `/team/members` | Create member |
| GET | `/team/members/{id}` | Get member |
| PUT | `/team/members/{id}` | Update member |
| DELETE | `/team/members/{id}` | Soft delete |
| GET | `/team/members/{id}/assignments` | Member assignments |
| GET | `/team/utilization` | Team utilization |

---

## Module: Finance

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/finance/invoices` | List invoices |
| POST | `/finance/invoices` | Create invoice |
| GET | `/finance/invoices/{id}` | Get invoice |
| PUT | `/finance/invoices/{id}` | Update invoice |
| POST | `/finance/invoices/{id}/send` | Send invoice |
| POST | `/finance/invoices/{id}/paid` | Mark paid |
| GET | `/finance/expenses` | List expenses |
| POST | `/finance/expenses` | Create expense |
| PUT | `/finance/expenses/{id}` | Update expense |
| GET | `/finance/summary` | Financial summary |

---

## Module: Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/users` | List users |
| POST | `/admin/users` | Create user |
| PUT | `/admin/users/{id}` | Update user |
| PUT | `/admin/users/{id}/role` | Change role |
| DELETE | `/admin/users/{id}` | Deactivate |
| GET | `/admin/audit` | Audit log |
| GET | `/admin/workspaces` | List workspaces |
| POST | `/admin/workspaces` | Create workspace |
| PUT | `/admin/workspaces/{id}` | Update workspace |

---

## Common Response Formats

### Success (single item)

```json
{
  "success": true,
  "data": { ... }
}
```

### Success (list)

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "total": 100,
    "page": 1,
    "per_page": 20
  }
}
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": { ... }
  }
}
```

---

## Endpoint Count Summary

| Module | Endpoints |
|--------|-----------|
| Auth | 9 |
| CRM | 15 |
| RFQ | 9 |
| Contracts | 7 |
| Projects | 17 |
| PMO | 8 |
| Customer Health | 6 |
| Client Portal | 9 |
| Suppliers | 10 |
| SIOP Engine | 13 |
| Analytics | 9 |
| AI Insights | 9 |
| Juntify | 13 |
| Compliance | 7 |
| Team | 7 |
| Finance | 11 |
| Admin | 10 |
| **Total** | **~160** |
