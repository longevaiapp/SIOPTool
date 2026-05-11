# 🎙️ Juntify Internal Module - AI Analyzers

> Meeting transcription analysis for SIOP

---

## Overview

The Juntify internal module enables:
1. **Recording** meetings (audio capture)
2. **Transcribing** via AssemblyAI
3. **Analyzing** with specialized AI prompts
4. **Extracting** tasks, signals, and insights
5. **Feeding** other SIOP modules automatically

---

## Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    JUNTIFY INTERNAL MODULE                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────────────┐  │
│  │ RECORD  │───▶│TRANSCRIBE│───▶│ ANALYZE │───▶│ EXTRACT & FEED │  │
│  │ Audio   │    │AssemblyAI│    │ OpenAI  │    │  to modules    │  │
│  └─────────┘    └─────────┘    └─────────┘    └─────────────────┘  │
│                                      │                              │
│                                      ▼                              │
│                            ┌─────────────────┐                      │
│                            │  10 ANALYZERS   │                      │
│                            └─────────────────┘                      │
│                                      │                              │
│          ┌───────────────────────────┼───────────────────────────┐  │
│          ▼                           ▼                           ▼  │
│    ┌───────────┐              ┌───────────┐              ┌─────────┐│
│    │    CRM    │              │ Projects  │              │  SIOP   ││
│    │   deals   │              │  tasks    │              │ insights││
│    └───────────┘              └───────────┘              └─────────┘│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## The 10 Analyzers

### 1️⃣ `lead_qualification`

**When**: First contact with a prospect  
**Who**: Sales Lead + Prospect  
**Feeds**: CRM (deals)

**Outputs**:
```json
{
  "icp_match_score": 85,
  "icp_signals": ["HealthTech", "Series B", ">50 employees"],
  "budget_signals": ["mentioned $200K range"],
  "timeline_signals": ["needs solution by Q3"],
  "decision_maker_present": true,
  "next_steps": ["Schedule discovery call", "Send company deck"],
  "recommended_stage": "qualified_lead",
  "tasks": [
    {
      "text": "🟡 Send company deck to prospect",
      "assignee": "Sales Lead",
      "due_date": "2026-05-02"
    }
  ]
}
```

---

### 2️⃣ `discovery_rfq`

**When**: Discovery/intake call with prospect  
**Who**: PM + Sales + Client  
**Feeds**: RFQ (rfq_sessions), CRM (deals)

**Outputs**:
```json
{
  "rfq_answers": {
    "section_1_client": { "q1": "answer", "q2": "answer" },
    "section_2_project_type": { ... },
    "section_3_regulatory": { ... }
  },
  "completion_pct": 75,
  "missing_sections": ["Budget Expectations", "Timeline"],
  "icp_match_score": 88,
  "budget_estimate": "$250K-$350K",
  "timeline_discussed": "6 months",
  "regulatory_context": ["HIPAA", "FHIR R4"],
  "risks_identified": ["Data quality uncertainty", "Tight timeline"],
  "tasks": [...]
}
```

---

### 3️⃣ `sales_followup`

**When**: Follow-up calls during sales cycle  
**Who**: Sales Lead + Prospect  
**Feeds**: CRM (deals, deal.ai_score)

**Outputs**:
```json
{
  "deal_temperature": "warm",
  "buying_signals": ["Asked about implementation timeline", "Requested references"],
  "objections": ["Concerned about integration complexity"],
  "competitor_mentions": ["Mentioned evaluating Acme Corp"],
  "decision_maker_present": true,
  "budget_confirmed": true,
  "budget_amount": 280000,
  "timeline_update": "Decision by end of month",
  "probability_change": "+15%",
  "recommended_stage": "proposal_sent",
  "tasks": [
    {
      "text": "🔴 Send proposal by Friday",
      "assignee": "Sales Lead",
      "due_date": "2026-05-03"
    }
  ]
}
```

---

### 4️⃣ `siop_weekly`

**When**: Weekly S+I+OP review meeting  
**Who**: CEO + COO + PMO + Sales  
**Feeds**: SIOP Engine (siop_snapshots, siop_decisions)

**Outputs**:
```json
{
  "demand_updates": {
    "pipeline_change": "+$180K",
    "new_deals": ["GenomicsCo Phase 2"],
    "deals_at_risk": ["LabCore stagnant 12 days"]
  },
  "capacity_updates": {
    "utilization_current": "84%",
    "bottlenecks": ["Solutions Architect at 92%"],
    "hiring_discussed": ["Need contractor for SA role"]
  },
  "operations_updates": {
    "projects_on_track": 3,
    "projects_at_risk": 2,
    "blockers_escalated": ["FHIR Gateway client dependency"]
  },
  "gaps_identified": [
    {
      "dimension": "Revenue Demand vs Capacity",
      "gap": "-$380K shortfall",
      "severity": "critical"
    }
  ],
  "decisions_made": [
    {
      "title": "Open contractor RFQ for Solutions Architect",
      "owner": "PMO Lead",
      "due_date": "2026-05-05",
      "priority": "critical"
    }
  ],
  "tasks": [...]
}
```

---

### 5️⃣ `project_kickoff`

**When**: Project kickoff meeting  
**Who**: PM + Client + Team  
**Feeds**: Projects (projects, sprints, risk_items)

**Outputs**:
```json
{
  "scope_confirmed": {
    "in_scope": ["NLP model", "API integration", "Dashboard"],
    "out_of_scope": ["Mobile app", "Real-time streaming"],
    "assumptions": ["Client provides training data by Week 2"]
  },
  "milestones_discussed": [
    { "name": "Data Pipeline Complete", "target": "Week 4" },
    { "name": "Model Training Done", "target": "Week 8" }
  ],
  "team_introductions": ["PM: Sarah", "Tech Lead: Juan", "Client PM: Maria"],
  "client_expectations": ["Weekly demos", "Bi-weekly status reports"],
  "risks_identified": [
    {
      "title": "Data quality unknown",
      "probability": 60,
      "impact": 80,
      "mitigation": "Early data audit in Sprint 1"
    }
  ],
  "communication_cadence": "Weekly Thursday 2pm",
  "sprint_1_scope": ["Setup environment", "Data ingestion", "Initial EDA"],
  "tasks": [...]
}
```

---

### 6️⃣ `sprint_review`

**When**: Sprint demo/review with client  
**Who**: PM + Dev Team + Client  
**Feeds**: Projects (tasks, health_score), Customer Health (nps)

**Outputs**:
```json
{
  "features_demoed": ["Search functionality", "Dashboard v1", "Export to PDF"],
  "client_feedback": {
    "positive": ["Loved the search speed", "UI is clean"],
    "negative": ["Export takes too long", "Missing filter option"],
    "requests": ["Add date range filter"]
  },
  "change_requests": [
    {
      "title": "Add date range filter to search",
      "priority": "medium",
      "impact": "Small - ~3 story points"
    }
  ],
  "blockers_discussed": ["API rate limiting from external provider"],
  "satisfaction_signals": {
    "overall": "positive",
    "nps_estimate": 72,
    "escalation_risk": "low"
  },
  "next_sprint_priorities": ["Fix export performance", "Add filters"],
  "tasks": [...]
}
```

---

### 7️⃣ `client_qbr`

**When**: Quarterly Business Review  
**Who**: PM + Sales + Client Leadership  
**Feeds**: Customer Health (clients, nps_surveys), CRM (upsell signals)

**Outputs**:
```json
{
  "relationship_health": "strong",
  "achievements_reviewed": ["Launched 3 features", "99.9% uptime", "Saved 120 hours/month"],
  "challenges_discussed": ["Onboarding took longer than expected"],
  "nps_score": 78,
  "renewal_sentiment": "positive",
  "expansion_signals": [
    {
      "opportunity": "Phase 2 - Mobile App",
      "estimated_value": "$180K",
      "client_interest": "high"
    }
  ],
  "referral_potential": true,
  "action_items": [
    {
      "title": "Prepare Phase 2 proposal",
      "owner": "Sales Lead",
      "due_date": "2026-05-15"
    }
  ],
  "tasks": [...]
}
```

---

### 8️⃣ `pmo_review`

**When**: Internal PMO portfolio review  
**Who**: PMO Director + PMs  
**Feeds**: PMO (portfolio health), AI Insights

**Outputs**:
```json
{
  "portfolio_health_discussed": {
    "overall_score": 74,
    "trend": "declining",
    "concern_areas": ["Two projects over budget"]
  },
  "at_risk_projects": [
    {
      "project": "BioMetrics v2",
      "issues": ["Budget +19%", "Scope creep"],
      "action": "CFO review required"
    }
  ],
  "resource_conflicts": [
    {
      "resource": "Solutions Architect",
      "conflict": "Assigned to 3 projects at 120%",
      "resolution": "De-prioritize FHIR Gateway"
    }
  ],
  "timeline_adjustments": [
    {
      "project": "FHIR Gateway",
      "change": "Sprint 8 deferred 3 weeks",
      "reason": "Resource constraint"
    }
  ],
  "escalations_needed": ["BioMetrics budget to CEO"],
  "tasks": [...]
}
```

---

### 9️⃣ `compliance_audit`

**When**: Compliance review meeting  
**Who**: Compliance Lead + CTO + Legal  
**Feeds**: Compliance (compliance_controls)

**Outputs**:
```json
{
  "controls_reviewed": ["HIPAA-01", "HIPAA-02", "HIPAA-03", "FHIR-01"],
  "status_updates": [
    { "control": "HIPAA-03", "status": "expiring", "deadline": "2026-05-18" }
  ],
  "gaps_found": [
    {
      "control": "SEC-01",
      "gap": "Annual pen test overdue",
      "severity": "high",
      "remediation": "Schedule pen test within 2 weeks"
    }
  ],
  "audit_findings": [],
  "framework_updates": ["HIPAA 2026 update coming in Q3"],
  "remediation_tasks": [
    {
      "text": "🔴 Schedule penetration test with vendor",
      "assignee": "CTO",
      "due_date": "2026-05-10",
      "priority": "critical"
    }
  ],
  "tasks": [...]
}
```

---

### 🔟 `supplier_negotiation`

**When**: Calls with suppliers/vendors  
**Who**: Ops Lead + Supplier  
**Feeds**: Suppliers (suppliers, supplier_contracts)

**Outputs**:
```json
{
  "supplier": "DataBridge Analytics",
  "meeting_purpose": "Contract renewal discussion",
  "sla_discussion": {
    "current_compliance": "98%",
    "issues_raised": ["2 incidents in Q1"],
    "improvements_requested": ["Faster response time"]
  },
  "pricing_changes": {
    "current": "$12K/mo",
    "proposed": "$14K/mo",
    "negotiated": "$13K/mo with 2-year commitment"
  },
  "contract_terms": {
    "renewal_date": "2026-07-01",
    "term_length": "2 years",
    "auto_renew": true
  },
  "performance_issues": ["Latency spikes during peak hours"],
  "action_items": [
    {
      "title": "Review contract draft",
      "owner": "Legal",
      "due_date": "2026-05-20"
    }
  ],
  "tasks": [...]
}
```

---

## Prompt Engineering Guidelines

### Common Elements

All analyzers should:

1. **Resolve relative dates** using meeting date as reference
2. **Detect real names** from transcript and replace Speaker 1/2/etc.
3. **Extract tasks** with priority emoji (🔴 urgent, 🟡 normal, 🟢 low)
4. **Include confidence scores** where applicable
5. **Return valid JSON** always

### System Prompt Template

```
You are an AI assistant analyzing a business meeting transcript.

CONTEXT:
- Meeting date: {meeting_date}
- Meeting type: {meeting_type}
- Participants: {participants}

INSTRUCTIONS:
1. Analyze the transcript carefully
2. Extract structured information as JSON
3. Resolve relative dates (e.g., "next Friday" → actual date)
4. Replace generic speaker labels with real names if mentioned
5. Only include information explicitly stated - do not fabricate
6. For tasks, use priority emojis: 🔴 urgent, 🟡 normal, 🟢 low

OUTPUT SCHEMA:
{output_schema}

Respond ONLY with valid JSON matching the schema.
```

### User Prompt Template

```
Analyze this {meeting_type} transcript:

---
{transcript}
---

Extract the required information and return as JSON.
```

---

## Implementation Priority

| Analyzer | Priority | Sprint | Dependencies |
|----------|----------|--------|--------------|
| `lead_qualification` | P0 | 3 | CRM service |
| `discovery_rfq` | P0 | 4 | RFQ service |
| `sales_followup` | P0 | 3 | CRM service |
| `siop_weekly` | P0 | 6 | SIOP service |
| `project_kickoff` | P0 | 5 | Project service |
| `sprint_review` | P0 | 5 | Project service |
| `client_qbr` | P1 | 8 | Health service |
| `pmo_review` | P1 | 7 | PMO service |
| `compliance_audit` | P1 | 7 | Compliance service |
| `supplier_negotiation` | P2 | 8 | Supplier service |

---

## Database Tables

```sql
-- Analyzers configuration
siop_analyzers (id, name, system_prompt, user_prompt, output_schema, ...)

-- Meeting transcriptions
ju_files (id, meeting_type, transcript, analyzer_id, ai_scope_outputs, ...)

-- AI outputs
ai_outputs (id, job_type, output_json, tokens_used, ...)

-- Extracted tasks
tasks (id, source_meeting_id, title, priority, due_date, ...)
```

---

## Integration with Modules

| Analyzer Output | Target Module | Action |
|-----------------|---------------|--------|
| `icp_match_score` | CRM | Update deal.icp_match_score |
| `rfq_answers` | RFQ | Populate rfq_sessions.responses |
| `probability_change` | CRM | Update deal.probability |
| `risks_identified` | Projects | Create risk_items |
| `gaps_identified` | SIOP | Create siop_decisions |
| `nps_estimate` | Customer Health | Create nps_surveys |
| `tasks[]` | All | Create tasks with source_meeting_id |
