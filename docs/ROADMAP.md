# 🗺️ Roadmap to Production

> Target: MVP in Production by Sprint 10 (~10 weeks)

---

## 📅 Sprint Plan

### Phase 1: Foundation (Sprint 1-2)

#### Sprint 1: Auth + Core Infrastructure
**Goal**: Users can login and we have audit trail

| Task | Owner | Priority | Status |
|------|-------|----------|--------|
| Run migration 001 on MySQL | Dev 1 | P0 | ⬜ |
| Create migration 002 (missing tables) | Dev 1 | P0 | ⬜ |
| Implement `auth_service.py` | Dev 1 | P0 | ⬜ |
| Implement `user_service.py` | Dev 1 | P0 | ⬜ |
| Implement `audit_service.py` | Dev 1 | P0 | ⬜ |
| Create `/api/auth/*` endpoints | Dev 1 | P0 | ⬜ |
| Create `/api/users/*` endpoints | Dev 1 | P0 | ⬜ |
| Frontend: Auth context + hooks | Dev 2 | P0 | ⬜ |
| Frontend: Protect routes middleware | Dev 2 | P0 | ⬜ |
| Frontend: Connect login/register | Dev 2 | P0 | ⬜ |

**Deliverable**: Working login, protected routes, audit logging

---

#### Sprint 2: Workspace + Base Services
**Goal**: Multi-tenant foundation ready

| Task | Owner | Priority | Status |
|------|-------|----------|--------|
| Implement `workspace_service.py` | Dev 1 | P0 | ⬜ |
| JWT middleware for all routes | Dev 1 | P0 | ⬜ |
| Workspace context in frontend | Dev 2 | P0 | ⬜ |
| Base Pydantic models (shared) | Dev 1 | P0 | ⬜ |
| SQLAlchemy ORM models | Dev 1 | P0 | ⬜ |
| OpenAI client implementation | Dev 3 | P1 | ⬜ |
| `.env` configuration | Dev 1 | P0 | ⬜ |

**Deliverable**: Multi-tenant ready, ORM models, OpenAI configured

---

### Phase 2: Core Modules CRM + RFQ (Sprint 3-4)

#### Sprint 3: CRM Module
**Goal**: Sales pipeline functional

| Task | Owner | Priority | Status |
|------|-------|----------|--------|
| Implement `crm_service.py` | Dev 1 | P0 | ⬜ |
| Create deals CRUD endpoints | Dev 1 | P0 | ⬜ |
| Create contacts CRUD endpoints | Dev 1 | P0 | ⬜ |
| Pipeline summary endpoint | Dev 1 | P0 | ⬜ |
| Forecast endpoint | Dev 1 | P0 | ⬜ |
| Frontend: Connect CRM page to API | Dev 2 | P0 | ⬜ |
| Frontend: useDeals, useContacts hooks | Dev 2 | P0 | ⬜ |
| Analyzer: `lead_qualification` | Dev 3 | P1 | ⬜ |
| Analyzer: `sales_followup` | Dev 3 | P1 | ⬜ |

**Deliverable**: Working CRM with real data

---

#### Sprint 4: RFQ Module + Juntify Foundation
**Goal**: RFQ intake and meeting analysis foundation

| Task | Owner | Priority | Status |
|------|-------|----------|--------|
| Implement `rfq_service.py` | Dev 1 | P0 | ⬜ |
| RFQ sessions CRUD endpoints | Dev 1 | P0 | ⬜ |
| Implement `meeting_service.py` | Dev 1 | P0 | ⬜ |
| Implement `transcription_service.py` | Dev 1 | P0 | ⬜ |
| Implement `analysis_service.py` | Dev 3 | P0 | ⬜ |
| Create siop_analyzers table seed | Dev 3 | P0 | ⬜ |
| Analyzer: `discovery_rfq` | Dev 3 | P0 | ⬜ |
| Frontend: Connect RFQ page to API | Dev 2 | P0 | ⬜ |
| Frontend: Meeting upload component | Dev 2 | P1 | ⬜ |

**Deliverable**: RFQ working, meeting analysis foundation

---

### Phase 3: Projects + SIOP Core (Sprint 5-6)

#### Sprint 5: Projects Module
**Goal**: Project management functional

| Task | Owner | Priority | Status |
|------|-------|----------|--------|
| Implement `project_service.py` | Dev 1 | P0 | ⬜ |
| Implement `sprint_service.py` | Dev 1 | P0 | ⬜ |
| Implement `task_service.py` | Dev 1 | P0 | ⬜ |
| Implement `risk_service.py` | Dev 1 | P0 | ⬜ |
| Projects CRUD endpoints | Dev 1 | P0 | ⬜ |
| Sprints CRUD endpoints | Dev 1 | P0 | ⬜ |
| Tasks CRUD endpoints | Dev 1 | P0 | ⬜ |
| Frontend: Connect Projects page | Dev 2 | P0 | ⬜ |
| Analyzer: `project_kickoff` | Dev 3 | P1 | ⬜ |
| Analyzer: `sprint_review` | Dev 3 | P1 | ⬜ |

**Deliverable**: Project management with sprints and tasks

---

#### Sprint 6: SIOP Engine + Capacity
**Goal**: Core SIOP functionality

| Task | Owner | Priority | Status |
|------|-------|----------|--------|
| Implement `siop_service.py` | Dev 1 | P0 | ⬜ |
| Implement `capacity_service.py` | Dev 1 | P0 | ⬜ |
| SIOP summary endpoint | Dev 1 | P0 | ⬜ |
| Gap analysis endpoint | Dev 1 | P0 | ⬜ |
| Scenarios generation (AI) | Dev 3 | P0 | ⬜ |
| Team members CRUD | Dev 1 | P0 | ⬜ |
| Assignments CRUD | Dev 1 | P0 | ⬜ |
| Frontend: Connect SIOP page | Dev 2 | P0 | ⬜ |
| Analyzer: `siop_weekly` | Dev 3 | P0 | ⬜ |

**Deliverable**: SIOP Engine calculating gaps and scenarios

---

### Phase 4: Supporting Modules (Sprint 7-8)

#### Sprint 7: PMO + Compliance + Finance
**Goal**: Portfolio and financial visibility

| Task | Owner | Priority | Status |
|------|-------|----------|--------|
| Implement `pmo_service.py` | Dev 1 | P0 | ⬜ |
| Implement `compliance_service.py` | Dev 1 | P0 | ⬜ |
| Implement `finance_service.py` | Dev 1 | P0 | ⬜ |
| Portfolio health endpoint | Dev 1 | P0 | ⬜ |
| Compliance controls CRUD | Dev 1 | P0 | ⬜ |
| P&L per project endpoint | Dev 1 | P0 | ⬜ |
| Frontend: Connect PMO, Compliance, Analytics | Dev 2 | P0 | ⬜ |
| Analyzer: `pmo_review` | Dev 3 | P1 | ⬜ |
| Analyzer: `compliance_audit` | Dev 3 | P1 | ⬜ |

**Deliverable**: PMO, Compliance, Finance functional

---

#### Sprint 8: Customer Health + Suppliers
**Goal**: Client and supplier management

| Task | Owner | Priority | Status |
|------|-------|----------|--------|
| Implement `health_service.py` | Dev 1 | P0 | ⬜ |
| Implement `supplier_service.py` | Dev 1 | P0 | ⬜ |
| Clients CRUD endpoints | Dev 1 | P0 | ⬜ |
| NPS tracking endpoints | Dev 1 | P0 | ⬜ |
| Suppliers CRUD endpoints | Dev 1 | P0 | ⬜ |
| Supplier scoring (AI) | Dev 3 | P1 | ⬜ |
| Frontend: Connect Health, Suppliers | Dev 2 | P0 | ⬜ |
| Analyzer: `client_qbr` | Dev 3 | P1 | ⬜ |
| Analyzer: `supplier_negotiation` | Dev 3 | P2 | ⬜ |

**Deliverable**: Customer and supplier modules functional

---

### Phase 5: Intelligence + Polish (Sprint 9-10)

#### Sprint 9: AI Insights + Alerts + Command Center
**Goal**: Cross-module intelligence layer

| Task | Owner | Priority | Status |
|------|-------|----------|--------|
| Implement `insight_service.py` | Dev 3 | P0 | ⬜ |
| Implement `alert_service.py` | Dev 1 | P0 | ⬜ |
| AI insights generation job | Dev 3 | P0 | ⬜ |
| Alert routing system | Dev 1 | P0 | ⬜ |
| Command Center aggregation | Dev 1 | P0 | ⬜ |
| Frontend: Connect AI Insights | Dev 2 | P0 | ⬜ |
| Frontend: Connect Command Center | Dev 2 | P0 | ⬜ |
| Real-time updates (WebSocket) | Dev 1 | P1 | ⬜ |

**Deliverable**: Intelligence layer and executive dashboard

---

#### Sprint 10: Client Portal + Reports + Deploy
**Goal**: Production ready MVP

| Task | Owner | Priority | Status |
|------|-------|----------|--------|
| Implement `portal_service.py` | Dev 1 | P1 | ⬜ |
| Implement `report_service.py` | Dev 1 | P1 | ⬜ |
| Client external access | Dev 1 | P1 | ⬜ |
| PDF report generation | Dev 1 | P1 | ⬜ |
| Frontend: Client Portal view | Dev 2 | P1 | ⬜ |
| CI/CD pipeline (GitHub Actions) | Dev 1 | P0 | ⬜ |
| Production deploy to Hostinger | Dev 1 | P0 | ⬜ |
| Environment configuration | Dev 1 | P0 | ⬜ |
| Smoke tests | All | P0 | ⬜ |
| Documentation update | All | P0 | ⬜ |

**Deliverable**: MVP in production 🚀

---

## 📊 Sprint Summary

| Sprint | Focus | Key Deliverable |
|--------|-------|-----------------|
| 1 | Auth + Infrastructure | Login working |
| 2 | Workspace + Base | Multi-tenant ready |
| 3 | CRM | Sales pipeline functional |
| 4 | RFQ + Juntify | Meeting analysis working |
| 5 | Projects | Project management functional |
| 6 | SIOP + Capacity | SIOP calculations working |
| 7 | PMO + Compliance + Finance | Portfolio + Financial visibility |
| 8 | Health + Suppliers | Client/Supplier management |
| 9 | AI + Alerts | Intelligence layer |
| 10 | Portal + Reports + Deploy | **MVP IN PRODUCTION** |

---

## 🎯 Success Criteria for MVP

- [ ] Users can login and access their workspace
- [ ] CRM: Create deals, track pipeline, see forecast
- [ ] RFQ: Complete 60-question intake, generate scope
- [ ] Projects: Manage sprints, tasks, risks
- [ ] SIOP: See demand-capacity gap, scenarios
- [ ] Meetings: Upload transcript, analyze with AI
- [ ] AI: Receive insights and alerts
- [ ] Command Center: Executive overview
- [ ] Deploy: Running on Hostinger

---

## 📈 Velocity Assumptions

- **Team size**: 3 developers
- **Sprint length**: 1 week
- **Capacity per sprint**: ~15 story points per dev
- **Total capacity**: ~45 story points per sprint

---

## 🚧 Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| OpenAI API changes | High | Pin version, abstract client |
| Hostinger limits | Medium | Test early, have backup plan |
| Scope creep | High | Strict MVP definition |
| Integration complexity | Medium | Incremental connections |
| Performance issues | Medium | Optimize queries, cache |

---

## 📝 Notes

- Each sprint assumes 1-week duration
- MVP = Minimum Viable Product (not all features)
- Post-MVP: Testing, optimization, additional features
- All dates are estimates based on 2026-04-30 start
