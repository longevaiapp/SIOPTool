# 🏗️ Architecture

> System design for LongevAI SIOP Tool

---

## High-Level Architecture

```
┌───────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js 15)                         │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                        App Router (13 modules)                       │  │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │  │
│  │  │ CRM │ │ RFQ │ │Cont │ │ PM  │ │ PMO │ │Hlth │ │Port │ │Supp │   │  │
│  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘   │  │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                            │  │
│  │  │SIOP │ │Anly │ │Cmnd │ │AIIns│ │OView│                            │  │
│  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                            │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                              │                                            │
│  ┌─────────────────┐  ┌──────┴──────┐  ┌─────────────────┐                │
│  │  Shared UI      │  │  SWR Hooks  │  │  AI Client      │                │
│  │  (shadcn/ui)    │  │  (use-api)  │  │  (openai.ts)    │                │
│  └─────────────────┘  └─────────────┘  └─────────────────┘                │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ REST API (JSON)
                                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                              BACKEND (FastAPI)                             │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                         API Routers (thin)                           │  │
│  │  /crm  /rfq  /contracts  /projects  /pmo  /health  /portal  /supp   │  │
│  │  /siop  /analytics  /ai-insights  /juntify  /auth  /admin           │  │
│  └──────────────────────────────────┬──────────────────────────────────┘  │
│                                     │                                     │
│  ┌──────────────────────────────────▼──────────────────────────────────┐  │
│  │                        Service Layer (business logic)                │  │
│  │  crm_service  rfq_service  contracts_service  projects_service ...  │  │
│  └──────────────────────────────────┬──────────────────────────────────┘  │
│                                     │                                     │
│  ┌─────────────────┐  ┌─────────────┴──────┐  ┌─────────────────────┐    │
│  │  Pydantic       │  │  SQLAlchemy ORM    │  │  OpenAI Client      │    │
│  │  (validation)   │  │  (db.py)           │  │  (openai_client.py) │    │
│  └─────────────────┘  └────────────────────┘  └─────────────────────┘    │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                        Celery Tasks (async)                          │  │
│  │  transcription_tasks  analysis_tasks  report_tasks  sync_tasks       │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
             ┌───────────┐   ┌───────────┐   ┌───────────┐
             │  MySQL    │   │  OpenAI   │   │ AssemblyAI│
             │ Hostinger │   │   API     │   │   API     │
             └───────────┘   └───────────┘   └───────────┘
```

---

## Layer Responsibilities

### Frontend

| Layer | Responsibility | Location |
|-------|----------------|----------|
| **Pages** | Route components, layout | `/app/(app)/[module]/page.tsx` |
| **Components** | UI rendering | `/components/[module]/` |
| **Shared** | Reusable UI | `/components/shared/` |
| **Hooks** | Data fetching (SWR) | `/lib/hooks/use-[resource].ts` |
| **Types** | TypeScript interfaces | `/lib/types/[module].ts` |
| **AI** | OpenAI calls | `/lib/ai/openai.ts` |

### Backend

| Layer | Responsibility | Location |
|-------|----------------|----------|
| **Routers** | HTTP endpoints (thin) | `/routers/[module].py` |
| **Services** | Business logic | `/services/[module]_service.py` |
| **Models** | Pydantic schemas | `/models/[module].py` |
| **Tasks** | Async jobs | `/tasks/[module]_tasks.py` |
| **Lib** | Shared utilities | `/lib/db.py`, `/lib/openai_client.py` |

---

## Key Design Patterns

### 1. Service Layer Pattern

```python
# ❌ WRONG - logic in router
@router.post("/deals")
async def create_deal(deal: DealCreate, db: Session):
    db_deal = Deal(**deal.dict())
    db.add(db_deal)
    db.commit()
    return db_deal

# ✅ CORRECT - router delegates to service
@router.post("/deals")
async def create_deal(deal: DealCreate, db: Session):
    return await crm_service.create_deal(db, deal)
```

### 2. Audit Logging

Every write operation must log to `audit_log`:

```python
async def create_deal(db: Session, deal: DealCreate, user_id: str):
    db_deal = Deal(**deal.dict())
    db.add(db_deal)
    
    # REQUIRED: audit log
    db.add(AuditLog(
        table_name="deals",
        record_id=db_deal.id,
        action="create",
        actor_id=user_id,
        new_values=deal.dict()
    ))
    
    db.commit()
    return db_deal
```

### 3. Soft Deletes

Never hard delete:

```python
async def delete_deal(db: Session, deal_id: str, user_id: str):
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    
    # ❌ WRONG
    # db.delete(deal)
    
    # ✅ CORRECT
    deal.is_deleted = True
    deal.deleted_at = datetime.utcnow()
    
    db.add(AuditLog(...))
    db.commit()
```

### 4. Workspace Isolation

All queries filter by workspace:

```python
async def get_deals(db: Session, workspace_id: str):
    return db.query(Deal).filter(
        Deal.workspace_id == workspace_id,
        Deal.is_deleted == False
    ).all()
```

---

## Authentication Flow

```
┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐
│ Browser │──1──▶│ Next.js │──2──▶│ FastAPI │──3──▶│  MySQL  │
│         │      │ Frontend│      │ Backend │      │         │
│         │◀──4──│         │◀─────│         │◀─────│         │
└─────────┘      └─────────┘      └─────────┘      └─────────┘

1. User submits credentials
2. POST /auth/login
3. Verify password hash
4. Return JWT token
```

### JWT Token Structure

```json
{
  "sub": "user_uuid",
  "workspace_id": "workspace_uuid",
  "org_id": "org_uuid",
  "role": "admin",
  "exp": 1735689600
}
```

---

## AI Integration

### Meeting Analysis Flow

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ Upload  │───▶│ Celery  │───▶│Assembly │───▶│ OpenAI  │
│ Audio   │    │ Task    │    │ AI      │    │ GPT-4o  │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
                    │                             │
                    ▼                             ▼
              ┌───────────┐               ┌─────────────┐
              │  ju_files │◀──────────────│  ai_outputs │
              │(transcript)│               │ (analysis)  │
              └───────────┘               └─────────────┘
                    │
                    ▼
              ┌───────────┐
              │  tasks    │
              │(extracted)│
              └───────────┘
```

### AI Validation Rule

All AI outputs MUST be validated:

```python
# Backend (Pydantic)
class LeadQualificationOutput(BaseModel):
    icp_match_score: int = Field(..., ge=0, le=100)
    icp_signals: List[str]
    tasks: List[ExtractedTask]

output = LeadQualificationOutput(**ai_response)
```

```typescript
// Frontend (Zod)
const LeadQualificationSchema = z.object({
  icp_match_score: z.number().min(0).max(100),
  icp_signals: z.array(z.string()),
  tasks: z.array(ExtractedTaskSchema)
});

const output = LeadQualificationSchema.parse(aiResponse);
```

---

## Data Flow Patterns

### SWR Data Fetching

```typescript
// lib/hooks/use-deals.ts
export function useDeals() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/crm/deals',
    fetcher
  );
  
  return {
    deals: data?.data ?? [],
    isLoading,
    error,
    refresh: mutate
  };
}
```

### Optimistic Updates

```typescript
async function createDeal(deal: DealCreate) {
  // Optimistic update
  mutate(deals => [...deals, { ...deal, id: 'temp' }], false);
  
  // Actual API call
  const response = await api.post('/crm/deals', deal);
  
  // Revalidate
  mutate();
  
  return response.data;
}
```

---

## File Structure (Target)

```
/frontend
├── app/
│   ├── (auth)/                    # Auth pages
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (app)/                     # Protected pages
│   │   ├── layout.tsx             # Sidebar shell
│   │   ├── overview/page.tsx
│   │   ├── crm/page.tsx
│   │   ├── rfq/page.tsx
│   │   └── ... (13 modules)
│   └── api/                       # API routes (if needed)
├── components/
│   ├── shared/                    # Shared components
│   └── [module]/                  # Module-specific
├── lib/
│   ├── ai/openai.ts
│   ├── hooks/use-[resource].ts
│   └── types/[module].ts

/backend
├── main.py
├── routers/
│   ├── auth.py
│   ├── crm.py
│   ├── rfq.py
│   └── ... (22 services)
├── services/
│   ├── auth_service.py
│   ├── crm_service.py
│   └── ...
├── models/
│   ├── auth.py
│   ├── crm.py
│   └── ...
├── tasks/
│   ├── transcription_tasks.py
│   └── ...
├── lib/
│   ├── db.py
│   └── openai_client.py
└── migrations/
    ├── 001_base_schema.sql
    └── 002_juntify_schema.sql
```

---

## Deployment Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                        HOSTINGER                              │
│                                                               │
│  ┌─────────────────┐     ┌─────────────────┐                 │
│  │  Next.js App    │     │  FastAPI App    │                 │
│  │  (PM2)          │     │  (Uvicorn)      │                 │
│  │  Port 3000      │     │  Port 8000      │                 │
│  └────────┬────────┘     └────────┬────────┘                 │
│           │                       │                          │
│           └───────────┬───────────┘                          │
│                       │                                      │
│                       ▼                                      │
│              ┌─────────────────┐                             │
│              │     Nginx       │                             │
│              │  (Reverse Proxy)│                             │
│              │  Port 80/443    │                             │
│              └─────────────────┘                             │
│                       │                                      │
│                       ▼                                      │
│              ┌─────────────────┐                             │
│              │     MySQL 8     │                             │
│              │   (Hostinger)   │                             │
│              └─────────────────┘                             │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## Security Considerations

| Aspect | Implementation |
|--------|----------------|
| **Authentication** | JWT with 24h expiry |
| **Authorization** | Role-based (admin, pm, user, viewer) |
| **Data Isolation** | Workspace filtering on ALL queries |
| **PHI Protection** | BAA confirmation before project activation |
| **API Security** | Rate limiting, input validation |
| **Secrets** | Environment variables only |
| **Audit Trail** | All mutations logged |
