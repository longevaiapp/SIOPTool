# 📝 Changelog

> Track all changes to the SIOP Tool

---

## [Unreleased]

### 2026-05-02 17:45 (UTC-06:00)
- **Migration 006** applied to production (`siop_demo` on 187.77.3.106): adds `deals.expected_close`, `deals.next_action`, `deals.notes`
- Backend + frontend redeployed to VPS (pm2 `siop-backend` :8007, `siop-frontend` :3007)
- All 12 main API endpoints verified `200 OK`
- Documented MVP diagnosis and 3-week plan in [MVP_DIAGNOSIS_AND_PLAN.md](MVP_DIAGNOSIS_AND_PLAN.md)
- Identified foundation gap: missing tables `documents`, `quotes`, `quote_items`, `proposals`, `change_orders`, `document_sequences`
- Decision: build foundation tables (Migration 007) BEFORE PDF generation engine

### Added
- Documentation folder (`/docs`) with full project specification
- 10 AI analyzer definitions for Juntify internal module
- 18 new table schemas for Migration 002
- Complete API endpoint specification (~160 endpoints)
- Architecture documentation

### Status
- Frontend: 13 module pages with complete UI (HARDCODED DATA)
- Backend: Health check only - services/routers empty
- Database: Migration 001 exists (13 tables)

---

## [0.1.0] - 2025-05-01

### Added
- Initial project structure
- Next.js 15 frontend with App Router
- FastAPI backend scaffold
- 13 module pages:
  - Overview (dashboard)
  - CRM
  - RFQ
  - Contracts
  - PM (Projects)
  - PMO
  - Customer Health
  - Client Portal
  - Suppliers
  - SIOP Engine
  - Analytics
  - AI Insights
  - Command
- Shared component library:
  - StatCard
  - ScoreRing
  - ProgressBar
  - PriorityBadge
  - ModuleHeader
  - DataTable
  - LoadingSkeleton
  - DepartmentBadge
  - TagBadge
- Design tokens and module colors
- Migration 001 with 13 base tables
- SQLAlchemy database connection
- OpenAI client wrapper (backend)
- SWR data hook template (frontend)

### Technical
- Tailwind CSS + shadcn/ui configured
- TypeScript strict mode
- Python 3.11+ with type hints
- pnpm workspace with monorepo structure

---

## Future Versions

### [0.2.0] - Target: Sprint 2
- [ ] Authentication system (JWT)
- [ ] Migration 002 (18 new tables)
- [ ] CRM service + endpoints
- [ ] RFQ service + endpoints
- [ ] Remove hardcoded data from frontend

### [0.3.0] - Target: Sprint 4
- [ ] Projects service + endpoints
- [ ] SIOP Engine service
- [ ] Juntify internal module (meetings)
- [ ] First 3 analyzers working

### [0.4.0] - Target: Sprint 6
- [ ] PMO service
- [ ] Compliance service
- [ ] Finance service
- [ ] All 10 analyzers working

### [0.5.0] - Target: Sprint 8
- [ ] Customer Health service
- [ ] Client Portal (external API)
- [ ] Analytics service
- [ ] AI Insights aggregation

### [1.0.0] - Target: Sprint 10
- [ ] Production deployment
- [ ] Performance optimization
- [ ] Full test coverage
- [ ] Documentation complete

---

## Version Numbering

- **MAJOR.MINOR.PATCH**
- MAJOR: Breaking changes
- MINOR: New features
- PATCH: Bug fixes

---

## Contributing

When making changes:
1. Update this changelog under `[Unreleased]`
2. Use present tense ("Add feature" not "Added feature")
3. Group changes by type: Added, Changed, Fixed, Removed
4. Reference GitHub issues when applicable
