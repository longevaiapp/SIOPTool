# LongevAI SIOP Tool

AIaaS HealthTech Factory OS on the Juntify platform.

## Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: FastAPI (Python 3.11)
- **Database**: Hostinger MySQL (SQLAlchemy)
- **Package Manager**: pnpm

## Modules

| # | Module | Route | Color |
|---|--------|-------|-------|
| M01 | CRM | `/crm` | `#2563eb` |
| M02 | RFQ | `/rfq` | `#16a34a` |
| M03 | Contracts | `/contracts` | `#7c3aed` |
| M04 | Juntify PM | `/pm-tab` | `#ea580c` |
| M05 | PMO | `/pmo` | `#0d9488` |
| M06 | Customer Health | `/customer-health` | `#e11d48` |
| M07 | Client Portal | `/client-portal` | `#d97706` |
| M08 | Suppliers | `/suppliers` | `#4f46e5` |
| M09 | SIOP Engine | `/siop-engine` | `#0891b2` |
| M10 | Analytics | `/analytics` | `#475569` |

## Local Setup

### Prerequisites

- Node.js 20+
- pnpm 9+ (`npm install -g pnpm`)
- Python 3.11+
- MySQL 8+

### 1. Clone & install

```bash
git clone <repo-url>
cd SIOPTool
```

### 2. Frontend

```bash
cd frontend
pnpm install
cp ../.env.example .env.local
# Fill in OPENAI_API_KEY, NEXTAUTH_SECRET, etc.
pnpm dev
# → http://localhost:3000
```

### 3. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example .env
# Fill in DB_* and OPENAI_API_KEY values
uvicorn main:app --reload --port 8000
# → http://localhost:8000/docs
```

### 4. Database

Create a MySQL database named `sioptool`, then run the migration files in order:

```bash
mysql -u <user> -p sioptool < backend/migrations/001_initial.sql
```

## Development Rules

1. Business logic in **service layer** only — never in route handlers
2. Every DB write inserts to `audit_log` (append-only, never delete/update)
3. PHI projects: `baa_confirmed=true` required before status → active
4. All AI calls: validate output with Zod (frontend) or Pydantic (backend)
5. AI recommends only — no AI output auto-mutates critical records
6. Every table: `id uuid`, `created_at`, `updated_at`, `workspace_id`
7. Soft deletes only: `deleted_at`, `is_deleted` — never hard delete
8. Loading skeletons on every fetch — never spinners
9. No hardcoded data — everything from the API

## Project Structure

```
/frontend
  /app/(auth)/           ← login, register
  /app/(app)/layout.tsx  ← sidebar shell
  /app/(app)/[module]/   ← one page per module
  /components/shared/    ← StatCard, LoadingSkeleton, ModuleHeader, etc.
  /lib/ai/openai.ts      ← ALL OpenAI calls go here
  /lib/hooks/            ← SWR data hooks
  /lib/types/            ← TypeScript interfaces

/backend
  /routers/              ← FastAPI routes (thin — no business logic)
  /services/             ← ALL business logic here
  /models/               ← Pydantic models
  /tasks/                ← Celery async tasks
  /migrations/           ← numbered SQL migration files
  /lib/openai_client.py  ← OpenAI API wrapper
  /lib/db.py             ← MySQL connection (SQLAlchemy)
```
