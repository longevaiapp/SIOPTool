# LongevAI SIOP Tool — Juntify Platform
# Shared team context — all three devs use this

## What We're Building
AIaaS HealthTech Factory OS on the Juntify platform.
10 modules: CRM, RFQ, Contracts, Juntify PM, PMO, Customer Health,
Client Portal, Suppliers, SIOP Engine, Analytics + Infrastructure.
Anyone on the team can pick up any PBI at any time.

## Stack
- Frontend  → Next.js 15 App Router, TypeScript, Tailwind CSS, shadcn/ui
- Backend   → FastAPI Python 3.11+, Pydantic v2, async/await, SQLAlchemy
- Database  → MySQL hosted on Hostinger, accessed via SQLAlchemy ORM
- AI        → OpenAI API gpt-4o, JSON mode, streaming for Copilot
- Deploy    → Hostinger

## Folder Structure
/frontend
  /app/(auth)/                          ← login, register
  /app/(app)/layout.tsx                 ← sidebar shell
  /app/(app)/[module]/page.tsx          ← one folder per module
  /components/shared/                   ← shared components only
  /components/[module]/                 ← module-specific components
  /lib/ai/openai.ts                     ← ALL OpenAI calls go here
  /lib/hooks/use-[resource].ts          ← SWR data hooks
  /lib/types/[module].ts                ← TypeScript interfaces

/backend
  /routers/[module].py                  ← FastAPI routes (thin)
  /services/[module]_service.py         ← ALL business logic here
  /models/[module].py                   ← Pydantic models
  /tasks/[module]_tasks.py              ← Celery async tasks
  /migrations/                          ← numbered SQL migration files
  /lib/openai_client.py                 ← OpenAI API wrapper
  /lib/db.py                            ← MySQL connection (SQLAlchemy)

## Database Rules
- All tables use VARCHAR(36) UUID primary keys
- Every table has: created_at, updated_at, workspace_id, is_deleted, deleted_at
- audit_log is insert-only — never update or delete
- Soft deletes only — set is_deleted=TRUE and deleted_at=NOW()
- Never hard delete any record
- All queries must filter by workspace_id for tenant isolation

## Non-Negotiable Rules
1. Business logic in service layer only — never in route handlers
2. Every DB write must also insert to audit_log
3. PHI projects: baa_confirmed must be TRUE before status = active
4. All OpenAI calls: validate output with Zod (frontend) or Pydantic (backend) before returning
5. AI recommends only — no AI output auto-mutates critical records
6. Loading skeletons on every fetch — never spinners
7. No hardcoded data anywhere — everything from API
8. Soft deletes only — never hard delete

## Shared Components (build once, used everywhere)
StatCard, ScoreRing, ProgressBar, PriorityBadge,
ModuleHeader, StoryCard, DataTable, LoadingSkeleton

## Module Colors
M01 CRM: #2563eb    M02 RFQ: #16a34a    M03 Contracts: #7c3aed
M04 PM:  #ea580c    M05 PMO: #0d9488    M06 Health: #e11d48
M07 Portal: #d97706  M08 Suppliers: #4f46e5  M09 SIOP: #0891b2
M10 Analytics: #475569   Infrastructure: #64748b