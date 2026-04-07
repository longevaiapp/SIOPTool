# LongevAI SIOP Tool — Juntify Platform
# Shared team context — all three devs use this

## What We're Building
AIaaS HealthTech Factory OS on the Juntify platform.
10 modules: CRM, RFQ, Contracts, Juntify PM, PMO, Customer Health,
Client Portal, Suppliers, SIOP Engine, Analytics + Infrastructure.
Anyone on the team can pick up any PBI at any time.

## Stack
Frontend:  Next.js 15 App Router, TypeScript, Tailwind CSS, shadcn/ui
Backend:   FastAPI Python 3.11+, Pydantic v2, async/await
Database:  Supabase PostgreSQL, Row Level Security, Supabase Auth
AI:        Claude API claude-sonnet-4-6, JSON mode, streaming for Copilot
Queue:     Celery + Redis for background AI jobs
Deploy:    Vercel (frontend), Railway (backend)

## Folder Structure
/frontend
  /app/(auth)/                          ← login, register
  /app/(app)/layout.tsx                 ← sidebar shell
  /app/(app)/[module]/page.tsx          ← one folder per module
  /components/shared/                   ← shared components only
  /components/[module]/                 ← module-specific components
  /lib/ai/claude.ts                     ← ALL Claude calls go here
  /lib/hooks/use-[resource].ts          ← SWR data hooks
  /lib/types/[module].ts                ← TypeScript interfaces

/backend
  /routers/[module].py                  ← FastAPI routes (thin)
  /services/[module]_service.py         ← ALL business logic here
  /models/[module].py                   ← Pydantic models
  /tasks/[module]_tasks.py              ← Celery async tasks
  /lib/claude_client.py                 ← Claude API wrapper

/supabase
  /migrations/                          ← numbered SQL migrations
  /policies/                            ← RLS policy files
  /seed.sql

## Non-Negotiable Rules
1. Business logic in service layer only — never in route handlers
2. Every DB write inserts to audit_log (append-only, never delete/update)
3. PHI projects: baa_confirmed=true required before status→active
4. All Claude calls: validate output with Zod (frontend) or Pydantic (backend)
5. AI recommends only — no Claude output auto-mutates critical records
6. Every table: id uuid, created_at, updated_at, workspace_id
7. Soft deletes only: deleted_at, is_deleted — never hard delete
8. RLS on every table — workspace_id isolation mandatory
9. Loading skeletons on every fetch — never spinners
10. No hardcoded data anywhere — everything from API

## Shared Components (build once, used everywhere)
StatCard, ScoreRing, ProgressBar, PriorityBadge, 
ModuleHeader, StoryCard, DataTable, LoadingSkeleton

## Module Colors
M01 CRM: #2563eb    M02 RFQ: #16a34a    M03 Contracts: #7c3aed
M04 PM:  #ea580c    M05 PMO: #0d9488    M06 Health: #e11d48
M07 Portal: #d97706  M08 Suppliers: #4f46e5  M09 SIOP: #0891b2
M10 Analytics: #475569   Infrastructure: #64748b