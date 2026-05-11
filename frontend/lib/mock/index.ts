// ══════════════════════════════════════════════════════════════════════════
// 🎭 SHARED MOCK DATA LAYER
// All entities have stable IDs and cross-references so views connect.
// Replace with API calls when backend is ready.
// ══════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────── Clients ──
export interface Client {
    id: string;
    name: string;
    industry: string;
    size: "startup" | "mid" | "enterprise";
    contact_name: string;
    contact_email: string;
    phone: string;
    location: string;
    logo_color: string;
    health_score: number;
    nps: number;
    arr: number;
    tier: "platinum" | "gold" | "silver" | "bronze";
}

export const CLIENTS: Client[] = [
    { id: "cli-genomics", name: "GenomicsCo", industry: "Biotech / Genomics", size: "enterprise", contact_name: "Dr. Sarah Chen", contact_email: "schen@genomicsco.com", phone: "+1 415 555 0102", location: "San Francisco, CA", logo_color: "#0a84ff", health_score: 92, nps: 78, arr: 1200000, tier: "platinum" },
    { id: "cli-labcore", name: "LabCore Diagnostics", industry: "Clinical Labs", size: "enterprise", contact_name: "Mark Rivera", contact_email: "mrivera@labcore.com", phone: "+1 312 555 0188", location: "Chicago, IL", logo_color: "#ff453a", health_score: 58, nps: 32, arr: 480000, tier: "gold" },
    { id: "cli-hospita", name: "Hospita Group", industry: "Hospital Network", size: "enterprise", contact_name: "Jenna Park", contact_email: "jpark@hospita.io", phone: "+1 617 555 0144", location: "Boston, MA", logo_color: "#bf5af2", health_score: 81, nps: 64, arr: 890000, tier: "platinum" },
    { id: "cli-mednet", name: "MedNet Labs", industry: "Pathology", size: "mid", contact_name: "Daniel Wu", contact_email: "dwu@mednet.com", phone: "+1 213 555 0177", location: "Los Angeles, CA", logo_color: "#30d158", health_score: 75, nps: 55, arr: 320000, tier: "gold" },
    { id: "cli-healthrx", name: "HealthRx Corp", industry: "Pharma", size: "enterprise", contact_name: "Olivia Brown", contact_email: "obrown@healthrx.com", phone: "+1 646 555 0119", location: "New York, NY", logo_color: "#ff9f0a", health_score: 67, nps: 41, arr: 540000, tier: "gold" },
    { id: "cli-amatista", name: "Amatista Internal", industry: "Internal R&D", size: "mid", contact_name: "Carlos Vega", contact_email: "cvega@amatista.ai", phone: "+1 305 555 0166", location: "Miami, FL", logo_color: "#5856d6", health_score: 88, nps: 72, arr: 220000, tier: "silver" },
];

// ─────────────────────────────────────────────────────────────────── Deals ──
export interface Deal {
    id: string;
    name: string;
    client_id: string;
    value: number;
    stage: "Qualified Lead" | "Discovery" | "RFQ Submitted" | "Demo Done" | "Proposal Sent" | "Negotiation" | "Won" | "Lost";
    ai_score: number;
    type: string;
    owner: string;
    days_in_stage: number;
    created_at: string;
    expected_close: string;
    rfq_id?: string;
    project_id?: string;
    meeting_ids: string[];
    notes: string;
    next_action: string;
}

export const DEALS: Deal[] = [
    { id: "deal-001", name: "NLP Clinical Suite", client_id: "cli-labcore", value: 320000, stage: "Negotiation", ai_score: 62, type: "Platform", owner: "SC", days_in_stage: 28, created_at: "2026-02-15", expected_close: "2026-05-30", rfq_id: "rfq-002", meeting_ids: ["mtg-001", "mtg-004"], notes: "Stagnant. Procurement legal review delays. Counter-offer needed.", next_action: "Schedule exec sponsor call this week" },
    { id: "deal-002", name: "BioMetrics AI v3", client_id: "cli-amatista", value: 180000, stage: "Proposal Sent", ai_score: 55, type: "Custom ML", owner: "SC", days_in_stage: 12, created_at: "2026-03-10", expected_close: "2026-06-15", meeting_ids: ["mtg-002"], notes: "Internal stakeholder buy-in pending.", next_action: "Follow-up with VP Eng" },
    { id: "deal-003", name: "FHIR Integration Layer", client_id: "cli-hospita", value: 420000, stage: "Demo Done", ai_score: 73, type: "Integration", owner: "MT", days_in_stage: 41, created_at: "2026-01-20", expected_close: "2026-06-30", rfq_id: "rfq-001", project_id: "proj-002", meeting_ids: ["mtg-003"], notes: "Strong technical fit. CISO approval pending.", next_action: "Submit security questionnaire" },
    { id: "deal-004", name: "Pharma Data Management", client_id: "cli-healthrx", value: 95000, stage: "RFQ Submitted", ai_score: 44, type: "Consulting", owner: "AO", days_in_stage: 3, created_at: "2026-04-15", expected_close: "2026-07-30", rfq_id: "rfq-003", meeting_ids: [], notes: "Awaiting RFQ response from prospect.", next_action: "Wait for response (due 2026-05-10)" },
    { id: "deal-005", name: "GenomicsCo Expansion", client_id: "cli-genomics", value: 610000, stage: "Discovery", ai_score: 35, type: "Platform", owner: "SC", days_in_stage: 5, created_at: "2026-04-25", expected_close: "2026-09-30", project_id: "proj-001", meeting_ids: ["mtg-005"], notes: "Phase 2 expansion. Existing customer.", next_action: "Prepare Phase 2 architecture deck" },
    { id: "deal-006", name: "AI Pathology Review", client_id: "cli-mednet", value: 245000, stage: "Qualified Lead", ai_score: 35, type: "AI Model", owner: "MT", days_in_stage: 3, created_at: "2026-04-27", expected_close: "2026-08-15", meeting_ids: ["mtg-006"], notes: "First conversation completed. Needs technical deep-dive.", next_action: "Schedule technical demo" },
];

export const DEAL_STAGE_COLORS: Record<string, { bg: string; text: string }> = {
    "Qualified Lead": { bg: "rgba(142, 142, 147, 0.12)", text: "#636366" },
    "Discovery": { bg: "rgba(0, 122, 255, 0.12)", text: "#0040dd" },
    "RFQ Submitted": { bg: "rgba(255, 204, 0, 0.12)", text: "#996f00" },
    "Demo Done": { bg: "rgba(191, 90, 242, 0.12)", text: "#8944ab" },
    "Proposal Sent": { bg: "rgba(255, 159, 10, 0.12)", text: "#c93400" },
    "Negotiation": { bg: "rgba(48, 209, 88, 0.12)", text: "#248a3d" },
    "Won": { bg: "rgba(48, 209, 88, 0.18)", text: "#0a7a30" },
    "Lost": { bg: "rgba(255, 69, 58, 0.12)", text: "#c93400" },
};

// ─────────────────────────────────────────────────────────────────── RFQs ───
export interface RFQ {
    id: string;
    name: string;
    client_id: string;
    deal_id?: string;
    status: "draft" | "in_progress" | "submitted" | "awarded" | "lost";
    project_type: string;
    budget_range: string;
    timeline_weeks: number;
    compliance: string[];
    submitted_at?: string;
    score: number;
    answers: Record<string, string | string[]>;
}

export const RFQS: RFQ[] = [
    { id: "rfq-001", name: "FHIR Integration RFQ", client_id: "cli-hospita", deal_id: "deal-003", status: "awarded", project_type: "Integration", budget_range: "$400K - $500K", timeline_weeks: 24, compliance: ["HIPAA", "SOC 2", "HITRUST"], submitted_at: "2026-02-10", score: 87, answers: { project_scope: "Build FHIR R4 ingestion + mapping layer for legacy EMR", success_criteria: "Sub-200ms latency, 99.9% uptime, full EHR vendor coverage", team_size: "4-6 engineers", deployment: "On-prem hybrid cloud" } },
    { id: "rfq-002", name: "NLP Clinical RFQ", client_id: "cli-labcore", deal_id: "deal-001", status: "submitted", project_type: "Custom ML", budget_range: "$300K - $400K", timeline_weeks: 18, compliance: ["HIPAA"], submitted_at: "2026-03-05", score: 72, answers: { project_scope: "NLP suite for pathology reports - entity extraction + summarization", success_criteria: "F1 > 0.92 on clinical entities", team_size: "3-4 ML engineers", deployment: "AWS HIPAA-eligible" } },
    { id: "rfq-003", name: "Pharma Data Management RFQ", client_id: "cli-healthrx", deal_id: "deal-004", status: "in_progress", project_type: "Consulting", budget_range: "$80K - $120K", timeline_weeks: 12, compliance: ["HIPAA", "GDPR"], score: 55, answers: { project_scope: "Data pipeline assessment + roadmap" } },
];

// ───────────────────────────────────────────────────────────── Projects ────
export interface Project {
    id: string;
    name: string;
    client_id: string;
    deal_id?: string;
    status: "planning" | "active" | "review" | "paused" | "complete";
    progress: number;
    health: "green" | "yellow" | "red" | "gray";
    health_score: number;
    pm_name: string;
    tech_lead: string;
    team: string[];
    budget: number;
    spent: number;
    margin_target: number;
    margin_actual: number;
    start_date: string;
    end_date: string;
    sprint_length: number;
    current_sprint: number;
    project_type: string;
    description: string;
    objectives: string;
    deliverables: string[];
    compliance_frameworks: string[];
    hipaa_required: boolean;
    baa_signed: boolean;
    contract_id?: string;
}

export const PROJECTS: Project[] = [
    { id: "proj-001", name: "GenomicsCo AI Platform", client_id: "cli-genomics", deal_id: "deal-005", status: "active", progress: 68, health: "green", health_score: 86, pm_name: "Pedro PM", tech_lead: "Juan Dev", team: ["Project Manager", "Tech Lead", "ML Engineer", "Backend Developer", "Frontend Developer", "QA Engineer"], budget: 610000, spent: 412000, margin_target: 38, margin_actual: 35, start_date: "2026-01-15", end_date: "2026-09-30", sprint_length: 2, current_sprint: 8, project_type: "platform", description: "End-to-end AI platform for genomic variant interpretation and clinical reporting.", objectives: "Reduce variant interpretation time by 60%. Achieve >95% concordance with manual review.", deliverables: ["AI Inference API", "Clinical Reporting Dashboard", "EHR Integration", "Documentation", "Training"], compliance_frameworks: ["HIPAA", "SOC 2"], hipaa_required: true, baa_signed: true, contract_id: "ctr-001" },
    { id: "proj-002", name: "FHIR Integration", client_id: "cli-hospita", deal_id: "deal-003", status: "active", progress: 45, health: "yellow", health_score: 72, pm_name: "Maria T.", tech_lead: "Alex K.", team: ["Project Manager", "Solutions Architect", "Backend Developer", "Backend Developer", "QA Engineer"], budget: 420000, spent: 198000, margin_target: 35, margin_actual: 28, start_date: "2026-02-01", end_date: "2026-08-15", sprint_length: 2, current_sprint: 6, project_type: "integration", description: "FHIR R4 integration layer for hospital EMR systems with real-time data sync.", objectives: "Support 5+ EHR vendors. Sub-200ms latency. 99.9% uptime SLA.", deliverables: ["FHIR Gateway", "Mapping Engine", "Admin Console", "Migration Tools"], compliance_frameworks: ["HIPAA", "HITRUST"], hipaa_required: true, baa_signed: true, contract_id: "ctr-002" },
    { id: "proj-003", name: "BioMetrics AI v3", client_id: "cli-amatista", status: "active", progress: 82, health: "green", health_score: 90, pm_name: "Sara C.", tech_lead: "Tom R.", team: ["Project Manager", "ML Engineer", "ML Engineer", "Frontend Developer"], budget: 180000, spent: 142000, margin_target: 42, margin_actual: 44, start_date: "2025-11-01", end_date: "2026-05-30", sprint_length: 2, current_sprint: 13, project_type: "custom_ml", description: "Internal computer vision suite for biometric analysis - v3 modernization.", objectives: "Migrate to PyTorch 2. Improve accuracy by 15%. Reduce inference cost by 40%.", deliverables: ["Updated Models", "Inference API", "Benchmarks Report"], compliance_frameworks: [], hipaa_required: false, baa_signed: false },
    { id: "proj-004", name: "Data Lake Migration", client_id: "cli-mednet", status: "review", progress: 95, health: "green", health_score: 88, pm_name: "Andre O.", tech_lead: "Lucia M.", team: ["Project Manager", "DevOps Engineer", "Backend Developer"], budget: 245000, spent: 231000, margin_target: 32, margin_actual: 30, start_date: "2025-10-01", end_date: "2026-05-15", sprint_length: 2, current_sprint: 15, project_type: "platform", description: "Migration from legacy data warehouse to modern data lake on AWS.", objectives: "Zero-downtime migration. 50% query cost reduction.", deliverables: ["Migrated Data Lake", "ETL Pipelines", "Runbook"], compliance_frameworks: ["HIPAA"], hipaa_required: true, baa_signed: true, contract_id: "ctr-003" },
    { id: "proj-005", name: "Pharma Analytics", client_id: "cli-healthrx", status: "planning", progress: 12, health: "gray", health_score: 75, pm_name: "Diana L.", tech_lead: "TBD", team: ["Project Manager"], budget: 135000, spent: 8000, margin_target: 35, margin_actual: 35, start_date: "2026-05-15", end_date: "2026-09-30", sprint_length: 2, current_sprint: 1, project_type: "consulting", description: "Analytics roadmap and pilot for pharma data ops.", objectives: "Define 3-year analytics strategy. Deliver 2 pilot use cases.", deliverables: ["Strategy Document", "Pilot 1", "Pilot 2"], compliance_frameworks: ["HIPAA", "GDPR"], hipaa_required: true, baa_signed: false },
];

export const PROJECT_STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: "rgba(48, 209, 88, 0.12)", text: "#248a3d", label: "Active" },
    review: { bg: "rgba(191, 90, 242, 0.12)", text: "#8944ab", label: "In Review" },
    planning: { bg: "rgba(0, 122, 255, 0.12)", text: "#0040dd", label: "Planning" },
    paused: { bg: "rgba(255, 159, 10, 0.12)", text: "#c93400", label: "Paused" },
    complete: { bg: "rgba(142, 142, 147, 0.12)", text: "#636366", label: "Complete" },
};

// ───────────────────────────────────────────────────────── Sprints/Tasks ───
export interface Task {
    id: string;
    project_id: string;
    sprint: number;
    title: string;
    assignee: string;
    status: "todo" | "in_progress" | "review" | "done";
    points: number;
    priority: "low" | "medium" | "high";
}

export const TASKS: Task[] = [
    { id: "t-001", project_id: "proj-001", sprint: 8, title: "Implement variant scoring algorithm", assignee: "Juan Dev", status: "in_progress", points: 8, priority: "high" },
    { id: "t-002", project_id: "proj-001", sprint: 8, title: "Build clinical report PDF export", assignee: "Maria F.", status: "review", points: 5, priority: "medium" },
    { id: "t-003", project_id: "proj-001", sprint: 8, title: "Setup HIPAA audit logging", assignee: "Carlos V.", status: "done", points: 3, priority: "high" },
    { id: "t-004", project_id: "proj-001", sprint: 8, title: "Frontend: dashboard filters", assignee: "Ana L.", status: "todo", points: 5, priority: "medium" },
    { id: "t-005", project_id: "proj-001", sprint: 8, title: "ML model retraining pipeline", assignee: "Juan Dev", status: "todo", points: 13, priority: "high" },
    { id: "t-006", project_id: "proj-002", sprint: 6, title: "FHIR R4 patient resource mapping", assignee: "Alex K.", status: "in_progress", points: 8, priority: "high" },
    { id: "t-007", project_id: "proj-002", sprint: 6, title: "Performance testing - 1000 RPS", assignee: "QA", status: "todo", points: 5, priority: "high" },
];

// ─────────────────────────────────────────────────────────────── Meetings ──
export interface Meeting {
    id: string;
    type: string;
    title: string;
    client_id?: string;
    deal_id?: string;
    project_id?: string;
    date: string;
    duration_min: number;
    participants: string[];
    status: "scheduled" | "in_progress" | "completed" | "analyzed";
    summary?: string;
    action_items_count: number;
}

export const MEETINGS: Meeting[] = [
    { id: "mtg-001", type: "lead_qualification", title: "LabCore - Initial Discovery", client_id: "cli-labcore", deal_id: "deal-001", date: "2026-04-22", duration_min: 45, participants: ["Sarah Sales", "Mark Rivera"], status: "analyzed", summary: "Pathology lab seeking NLP for report processing. Budget confirmed $300K-$400K. Decision in 60 days.", action_items_count: 4 },
    { id: "mtg-002", type: "discovery_rfq", title: "Amatista BioMetrics v3 Discovery", client_id: "cli-amatista", deal_id: "deal-002", date: "2026-04-18", duration_min: 60, participants: ["Sarah Sales", "Carlos Vega", "Tom R."], status: "analyzed", summary: "Internal v3 modernization. PyTorch 2 migration. 15% accuracy target.", action_items_count: 3 },
    { id: "mtg-003", type: "discovery_rfq", title: "Hospita FHIR Technical Deep-Dive", client_id: "cli-hospita", deal_id: "deal-003", date: "2026-04-10", duration_min: 90, participants: ["Maria T.", "Jenna Park", "Alex K."], status: "analyzed", summary: "Confirmed 5 EHR vendors. CISO requires SOC 2 + HITRUST.", action_items_count: 6 },
    { id: "mtg-004", type: "sales_followup", title: "LabCore - Procurement Sync", client_id: "cli-labcore", deal_id: "deal-001", date: "2026-04-28", duration_min: 30, participants: ["Sarah Sales", "Mark Rivera", "Legal"], status: "completed", action_items_count: 2 },
    { id: "mtg-005", type: "client_qbr", title: "GenomicsCo Q2 Business Review", client_id: "cli-genomics", deal_id: "deal-005", project_id: "proj-001", date: "2026-04-25", duration_min: 60, participants: ["Pedro PM", "Dr. Sarah Chen", "Sarah Sales"], status: "analyzed", summary: "Phase 1 success. Phase 2 expansion approved verbally - $610K.", action_items_count: 5 },
    { id: "mtg-006", type: "lead_qualification", title: "MedNet AI Pathology Intro", client_id: "cli-mednet", deal_id: "deal-006", date: "2026-04-29", duration_min: 30, participants: ["Maria T.", "Daniel Wu"], status: "completed", action_items_count: 3 },
    { id: "mtg-007", type: "sprint_review", title: "GenomicsCo Sprint 7 Review", project_id: "proj-001", date: "2026-04-26", duration_min: 60, participants: ["Pedro PM", "Juan Dev", "Maria F.", "Carlos V."], status: "analyzed", action_items_count: 7 },
    { id: "mtg-008", type: "siop_weekly", title: "Weekly SIOP Sync", date: "2026-04-29", duration_min: 60, participants: ["Pedro PM", "Maria T.", "Diana L.", "Andre O."], status: "completed", action_items_count: 4 },
];

// ─────────────────────────────────────────────────────────────── Contracts ──
export interface Contract {
    id: string;
    type: "msa" | "sow" | "baa" | "nda" | "amendment";
    title: string;
    client_id: string;
    project_id?: string;
    status: "draft" | "review" | "signed" | "expired";
    value: number;
    signed_date?: string;
    expiry_date?: string;
    compliance_controls: string[];
    document_url: string;
    signers: string[];
    notes: string;
}

export const CONTRACTS: Contract[] = [
    { id: "ctr-001", type: "sow", title: "GenomicsCo AI Platform - SOW Phase 1", client_id: "cli-genomics", project_id: "proj-001", status: "signed", value: 610000, signed_date: "2026-01-10", expiry_date: "2026-12-31", compliance_controls: ["HIPAA-164.308", "HIPAA-164.312", "SOC2-CC6.1"], document_url: "#", signers: ["Dr. Sarah Chen", "LongevAI CEO"], notes: "Master SOW. Phase 2 amendment in progress." },
    { id: "ctr-002", type: "baa", title: "Hospita Group BAA", client_id: "cli-hospita", project_id: "proj-002", status: "signed", value: 0, signed_date: "2026-01-25", expiry_date: "2027-01-25", compliance_controls: ["HIPAA-164.308", "HIPAA-164.314", "HITRUST-CSF"], document_url: "#", signers: ["Jenna Park", "LongevAI Compliance"], notes: "Standard BAA, renewable annually." },
    { id: "ctr-003", type: "sow", title: "MedNet Data Lake SOW", client_id: "cli-mednet", project_id: "proj-004", status: "signed", value: 245000, signed_date: "2025-09-25", expiry_date: "2026-06-30", compliance_controls: ["HIPAA-164.308"], document_url: "#", signers: ["Daniel Wu", "LongevAI CEO"], notes: "On track. No amendments." },
    { id: "ctr-004", type: "msa", title: "LabCore MSA", client_id: "cli-labcore", status: "review", value: 0, compliance_controls: ["HIPAA-164.308"], document_url: "#", signers: [], notes: "Master Services Agreement under legal review." },
    { id: "ctr-005", type: "nda", title: "HealthRx Mutual NDA", client_id: "cli-healthrx", status: "signed", value: 0, signed_date: "2026-04-10", expiry_date: "2028-04-10", compliance_controls: [], document_url: "#", signers: ["Olivia Brown", "LongevAI Sales"], notes: "Mutual NDA for Pharma Data Management discussions." },
];

// ──────────────────────────────────────────────────────────── Suppliers ────
export interface Supplier {
    id: string;
    name: string;
    category: "infrastructure" | "ml_ops" | "consulting" | "data" | "security";
    status: "active" | "evaluation" | "inactive";
    rating: number;
    spend_ytd: number;
    contract_end: string;
    contact: string;
    services: string[];
    risk_level: "low" | "medium" | "high";
    used_in_projects: string[];
}

export const SUPPLIERS: Supplier[] = [
    { id: "sup-aws", name: "AWS", category: "infrastructure", status: "active", rating: 4.7, spend_ytd: 145000, contract_end: "2027-01-31", contact: "Enterprise Account Manager", services: ["Compute", "Storage", "HIPAA-eligible services"], risk_level: "low", used_in_projects: ["proj-001", "proj-002", "proj-004"] },
    { id: "sup-openai", name: "OpenAI", category: "ml_ops", status: "active", rating: 4.5, spend_ytd: 28000, contract_end: "2026-12-31", contact: "Sales Engineering", services: ["GPT-4o API", "Embeddings"], risk_level: "medium", used_in_projects: ["proj-001"] },
    { id: "sup-snowflake", name: "Snowflake", category: "data", status: "active", rating: 4.6, spend_ytd: 62000, contract_end: "2026-09-30", contact: "Customer Success", services: ["Data Warehouse"], risk_level: "low", used_in_projects: ["proj-004"] },
    { id: "sup-datadog", name: "Datadog", category: "infrastructure", status: "active", rating: 4.4, spend_ytd: 18000, contract_end: "2026-08-15", contact: "Account Manager", services: ["APM", "Logs", "Security"], risk_level: "low", used_in_projects: ["proj-001", "proj-002"] },
    { id: "sup-vanta", name: "Vanta", category: "security", status: "active", rating: 4.8, spend_ytd: 15000, contract_end: "2027-03-30", contact: "CSM", services: ["SOC 2 Compliance", "HIPAA Monitoring"], risk_level: "low", used_in_projects: [] },
    { id: "sup-scale", name: "Scale AI", category: "ml_ops", status: "evaluation", rating: 4.2, spend_ytd: 0, contract_end: "-", contact: "Sales", services: ["Data Labeling"], risk_level: "medium", used_in_projects: [] },
];

// ─────────────────────────────────────────────────────── AI Insights ──────
export interface Insight {
    id: string;
    severity: "critical" | "warning" | "info" | "success";
    module: string;
    module_color: string;
    title: string;
    detail: string;
    suggested_action: string;
    related_entity?: { type: "deal" | "project" | "client"; id: string };
    created_at: string;
}

export const INSIGHTS: Insight[] = [
    { id: "ins-001", severity: "critical", module: "SIOP", module_color: "#0891b2", title: "Capacity gap: -2.5 FTEs projected for Q3", detail: "Current sprint commitments exceed available capacity by 2.5 FTEs starting July 1.", suggested_action: "Hire 2 ML engineers OR delay non-critical Phase 2 features", created_at: "2026-04-30T08:32:00Z" },
    { id: "ins-002", severity: "warning", module: "CRM", module_color: "#0a84ff", title: "LabCore deal stagnant 12 days — AI score dropped 74→58", detail: "No engagement detected. Procurement legal review extending timeline.", suggested_action: "Schedule executive sponsor call", related_entity: { type: "deal", id: "deal-001" }, created_at: "2026-04-30T08:15:00Z" },
    { id: "ins-003", severity: "info", module: "Compliance", module_color: "#7c3aed", title: "HIPAA control review due in 14 days", detail: "Annual review of HIPAA-164.308 controls.", suggested_action: "Schedule with compliance team", created_at: "2026-04-30T07:00:00Z" },
    { id: "ins-004", severity: "success", module: "Projects", module_color: "#ea580c", title: "GenomicsCo Sprint 7 completed on time", detail: "All 28 story points delivered. Velocity trending up.", suggested_action: "Celebrate. Maintain pace.", related_entity: { type: "project", id: "proj-001" }, created_at: "2026-04-30T05:00:00Z" },
    { id: "ins-005", severity: "warning", module: "Customer Health", module_color: "#e11d48", title: "LabCore health dropped to 58 — churn risk", detail: "NPS dropped from 45 to 32. Last QBR delayed.", suggested_action: "Schedule recovery QBR within 7 days", related_entity: { type: "client", id: "cli-labcore" }, created_at: "2026-04-29T16:00:00Z" },
];

// ─────────────────────────────────────────────────────── Invoices ────────
export interface Invoice {
    id: string;
    number: string;
    client_id: string;
    project_id?: string;
    amount: number;
    status: "draft" | "sent" | "paid" | "overdue";
    issue_date: string;
    due_date: string;
    paid_date?: string;
    line_items: { description: string; amount: number }[];
}

export const INVOICES: Invoice[] = [
    { id: "inv-001", number: "INV-2026-0042", client_id: "cli-genomics", project_id: "proj-001", amount: 152500, status: "paid", issue_date: "2026-03-01", due_date: "2026-03-31", paid_date: "2026-03-28", line_items: [{ description: "Sprint 5-6 Development", amount: 120000 }, { description: "Infrastructure & Tools", amount: 32500 }] },
    { id: "inv-002", number: "INV-2026-0048", client_id: "cli-genomics", project_id: "proj-001", amount: 152500, status: "paid", issue_date: "2026-04-01", due_date: "2026-04-30", paid_date: "2026-04-25", line_items: [{ description: "Sprint 7-8 Development", amount: 120000 }, { description: "Infrastructure & Tools", amount: 32500 }] },
    { id: "inv-003", number: "INV-2026-0055", client_id: "cli-genomics", project_id: "proj-001", amount: 152500, status: "sent", issue_date: "2026-05-01", due_date: "2026-05-31", line_items: [{ description: "Sprint 9-10 Development", amount: 120000 }, { description: "Infrastructure & Tools", amount: 32500 }] },
    { id: "inv-004", number: "INV-2026-0040", client_id: "cli-hospita", project_id: "proj-002", amount: 98000, status: "overdue", issue_date: "2026-03-15", due_date: "2026-04-15", line_items: [{ description: "FHIR Gateway Sprint 5-6", amount: 98000 }] },
    { id: "inv-005", number: "INV-2026-0050", client_id: "cli-hospita", project_id: "proj-002", amount: 98000, status: "sent", issue_date: "2026-04-15", due_date: "2026-05-15", line_items: [{ description: "FHIR Gateway Sprint 7-8", amount: 98000 }] },
];

// ─────────────────────────────────────────────────────── Approvals ────────
export interface Approval {
    id: string;
    type: "deliverable" | "scope_change" | "milestone" | "design";
    title: string;
    description: string;
    project_id: string;
    requested_by: string;
    requested_at: string;
    due_date: string;
    status: "pending" | "approved" | "rejected";
}

export const APPROVALS: Approval[] = [
    { id: "apr-001", type: "milestone", title: "Sprint 8 Demo Sign-Off", description: "Variant scoring algorithm + clinical reporting MVP delivered. Please review demo recording and confirm acceptance.", project_id: "proj-001", requested_by: "Pedro PM", requested_at: "2026-04-29", due_date: "2026-05-05", status: "pending" },
    { id: "apr-002", type: "scope_change", title: "Add multi-language support to dashboard", description: "Adding i18n support for ES/PT will add 2 sprints to timeline (~$45K). Please approve before proceeding.", project_id: "proj-001", requested_by: "Pedro PM", requested_at: "2026-04-26", due_date: "2026-05-03", status: "pending" },
    { id: "apr-003", type: "deliverable", title: "Phase 1 Architecture Document", description: "Final architecture document ready for review and sign-off.", project_id: "proj-001", requested_by: "Juan Dev", requested_at: "2026-04-15", due_date: "2026-04-22", status: "approved" },
];

// ─────────────────────────────────────────────────────── Messages ─────────
export interface Message {
    id: string;
    project_id: string;
    from_role: "client" | "pm" | "team";
    from_name: string;
    text: string;
    sent_at: string;
    read: boolean;
}

export const MESSAGES: Message[] = [
    { id: "msg-001", project_id: "proj-001", from_role: "pm", from_name: "Pedro PM", text: "Sprint 8 demo is ready! Recording attached. Please review and sign off.", sent_at: "2026-04-29T14:32:00Z", read: true },
    { id: "msg-002", project_id: "proj-001", from_role: "client", from_name: "Dr. Sarah Chen", text: "Thanks Pedro! Will review tomorrow morning. Quick question: did we include the variant filtering UI?", sent_at: "2026-04-29T15:10:00Z", read: true },
    { id: "msg-003", project_id: "proj-001", from_role: "pm", from_name: "Pedro PM", text: "Yes — included as part of the dashboard. You'll see it in the demo at minute 12.", sent_at: "2026-04-29T15:25:00Z", read: true },
    { id: "msg-004", project_id: "proj-001", from_role: "pm", from_name: "Pedro PM", text: "Also — we want to discuss adding multi-language support. Approval request sent.", sent_at: "2026-04-30T09:00:00Z", read: false },
];

// ─────────────────────────────────────────────────────── Tickets ──────────
export interface Ticket {
    id: string;
    client_id: string;
    project_id?: string;
    title: string;
    priority: "low" | "medium" | "high" | "urgent";
    status: "open" | "in_progress" | "resolved" | "closed";
    created_at: string;
    description: string;
}

export const TICKETS: Ticket[] = [
    { id: "tkt-001", client_id: "cli-genomics", project_id: "proj-001", title: "Cannot access dashboard - SSO error", priority: "high", status: "in_progress", created_at: "2026-04-28", description: "Getting SSO error when trying to login from corporate network." },
    { id: "tkt-002", client_id: "cli-genomics", project_id: "proj-001", title: "Request: export report to Excel format", priority: "medium", status: "open", created_at: "2026-04-26", description: "Would like to export clinical reports to Excel in addition to PDF." },
    { id: "tkt-003", client_id: "cli-genomics", title: "Question about HIPAA audit logs", priority: "low", status: "resolved", created_at: "2026-04-15", description: "How long are audit logs retained?" },
];

// ───────────────────────────────────────────────────────── Helpers ────────
export function getClient(id: string) { return CLIENTS.find(c => c.id === id); }
export function getDeal(id: string) { return DEALS.find(d => d.id === id); }
export function getProject(id: string) { return PROJECTS.find(p => p.id === id); }
export function getRFQ(id: string) { return RFQS.find(r => r.id === id); }
export function getMeeting(id: string) { return MEETINGS.find(m => m.id === id); }
export function getContract(id: string) { return CONTRACTS.find(c => c.id === id); }
export function getSupplier(id: string) { return SUPPLIERS.find(s => s.id === id); }

export function getDealsByClient(clientId: string) { return DEALS.filter(d => d.client_id === clientId); }
export function getProjectsByClient(clientId: string) { return PROJECTS.filter(p => p.client_id === clientId); }
export function getMeetingsByDeal(dealId: string) { return MEETINGS.filter(m => m.deal_id === dealId); }
export function getMeetingsByProject(projectId: string) { return MEETINGS.filter(m => m.project_id === projectId); }
export function getMeetingsByClient(clientId: string) { return MEETINGS.filter(m => m.client_id === clientId); }
export function getTasksByProject(projectId: string) { return TASKS.filter(t => t.project_id === projectId); }
export function getContractsByClient(clientId: string) { return CONTRACTS.filter(c => c.client_id === clientId); }
export function getContractsByProject(projectId: string) { return CONTRACTS.filter(c => c.project_id === projectId); }
export function getInvoicesByClient(clientId: string) { return INVOICES.filter(i => i.client_id === clientId); }
export function getInvoicesByProject(projectId: string) { return INVOICES.filter(i => i.project_id === projectId); }
export function getApprovalsByProject(projectId: string) { return APPROVALS.filter(a => a.project_id === projectId); }
export function getMessagesByProject(projectId: string) { return MESSAGES.filter(m => m.project_id === projectId); }
export function getTicketsByClient(clientId: string) { return TICKETS.filter(t => t.client_id === clientId); }

export function formatMoney(value: number): string {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value}`;
}

export function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function daysBetween(from: string, to: string): number {
    return Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24));
}

// ════════════════════════════════════════════════════════════════════════
// 🔮 SIOP ENGINE — Capacity, Demand, Scenarios
// ════════════════════════════════════════════════════════════════════════

export interface RoleCapacity {
    role: string;
    available_fte: number;
    committed_fte: number;
    forecast_demand: number; // next quarter
    cost_per_fte: number;
    bench: number;
}

export const ROLE_CAPACITY: RoleCapacity[] = [
    { role: "ML Engineer", available_fte: 6, committed_fte: 5.5, forecast_demand: 8, cost_per_fte: 18000, bench: 0.5 },
    { role: "Backend Developer", available_fte: 8, committed_fte: 7, forecast_demand: 9, cost_per_fte: 14000, bench: 1 },
    { role: "Frontend Developer", available_fte: 5, committed_fte: 4.5, forecast_demand: 6, cost_per_fte: 13000, bench: 0.5 },
    { role: "Project Manager", available_fte: 4, committed_fte: 4, forecast_demand: 5, cost_per_fte: 16000, bench: 0 },
    { role: "Solutions Architect", available_fte: 3, committed_fte: 2.5, forecast_demand: 3, cost_per_fte: 20000, bench: 0.5 },
    { role: "QA Engineer", available_fte: 4, committed_fte: 3, forecast_demand: 4, cost_per_fte: 11000, bench: 1 },
    { role: "DevOps Engineer", available_fte: 2, committed_fte: 2, forecast_demand: 3, cost_per_fte: 17000, bench: 0 },
    { role: "Data Scientist", available_fte: 3, committed_fte: 2.5, forecast_demand: 4, cost_per_fte: 17000, bench: 0.5 },
];

export interface DemandWeek {
    week: string; // ISO week start
    label: string;
    booked_revenue: number;
    forecast_revenue: number;
    pipeline_revenue: number;
    fte_demand: number;
    fte_capacity: number;
}

export const DEMAND_FORECAST: DemandWeek[] = [
    { week: "2026-05-04", label: "May W1", booked_revenue: 285000, forecast_revenue: 285000, pipeline_revenue: 60000, fte_demand: 30, fte_capacity: 35 },
    { week: "2026-05-11", label: "May W2", booked_revenue: 290000, forecast_revenue: 295000, pipeline_revenue: 70000, fte_demand: 31, fte_capacity: 35 },
    { week: "2026-05-18", label: "May W3", booked_revenue: 290000, forecast_revenue: 305000, pipeline_revenue: 80000, fte_demand: 32, fte_capacity: 35 },
    { week: "2026-05-25", label: "May W4", booked_revenue: 295000, forecast_revenue: 320000, pipeline_revenue: 95000, fte_demand: 33, fte_capacity: 35 },
    { week: "2026-06-01", label: "Jun W1", booked_revenue: 310000, forecast_revenue: 345000, pipeline_revenue: 110000, fte_demand: 35, fte_capacity: 35 },
    { week: "2026-06-08", label: "Jun W2", booked_revenue: 305000, forecast_revenue: 360000, pipeline_revenue: 130000, fte_demand: 36, fte_capacity: 35 },
    { week: "2026-06-15", label: "Jun W3", booked_revenue: 295000, forecast_revenue: 380000, pipeline_revenue: 150000, fte_demand: 38, fte_capacity: 36 },
    { week: "2026-06-22", label: "Jun W4", booked_revenue: 280000, forecast_revenue: 395000, pipeline_revenue: 180000, fte_demand: 39, fte_capacity: 36 },
    { week: "2026-06-29", label: "Jul W1", booked_revenue: 240000, forecast_revenue: 410000, pipeline_revenue: 200000, fte_demand: 40, fte_capacity: 36 },
    { week: "2026-07-06", label: "Jul W2", booked_revenue: 220000, forecast_revenue: 425000, pipeline_revenue: 220000, fte_demand: 41, fte_capacity: 36 },
    { week: "2026-07-13", label: "Jul W3", booked_revenue: 200000, forecast_revenue: 440000, pipeline_revenue: 240000, fte_demand: 42, fte_capacity: 38 },
    { week: "2026-07-20", label: "Jul W4", booked_revenue: 180000, forecast_revenue: 455000, pipeline_revenue: 260000, fte_demand: 43, fte_capacity: 38 },
];

export interface Scenario {
    id: string;
    name: string;
    type: "baseline" | "upside" | "downside" | "event" | "risk";
    status: "active" | "modeling" | "complete" | "draft";
    description: string;
    demand_delta_pct: number;
    revenue_impact: number;
    supply_gap: number;
    margin_impact: number;
    confidence: number;
    last_updated: string;
    assumptions: string[];
    actions: string[];
}

export const SCENARIOS: Scenario[] = [
    { id: "scn-001", name: "Base Case Q2-Q3", type: "baseline", status: "active", description: "Current pipeline + booked work, no major changes.", demand_delta_pct: 0, revenue_impact: 0, supply_gap: 0, margin_impact: 0, confidence: 92, last_updated: "2026-04-30T08:00:00Z", assumptions: ["Pipeline conversion 38%", "No churn in top 5 clients", "Current team retention"], actions: ["Maintain current capacity", "Continue planned hires"] },
    { id: "scn-002", name: "Growth +15% (Phase 2 + LabCore)", type: "upside", status: "modeling", description: "GenomicsCo Phase 2 closes + LabCore deal closes Q3.", demand_delta_pct: 15, revenue_impact: 720000, supply_gap: 180000, margin_impact: 3, confidence: 78, last_updated: "2026-04-29T16:00:00Z", assumptions: ["GenomicsCo Phase 2 closes May", "LabCore signs by Jul"], actions: ["Hire 2 ML engineers immediately", "Engage 1 contractor for QA"] },
    { id: "scn-003", name: "Conservative -10%", type: "downside", status: "complete", description: "LabCore lost + 1 mid-market churn.", demand_delta_pct: -10, revenue_impact: -480000, supply_gap: 0, margin_impact: -2, confidence: 88, last_updated: "2026-04-27T11:00:00Z", assumptions: ["LabCore deal lost", "1 client churn"], actions: ["Pause non-critical hires", "Reallocate bench to internal R&D"] },
    { id: "scn-004", name: "MedNet Expansion", type: "event", status: "modeling", description: "MedNet renews + adds analytics module.", demand_delta_pct: 8, revenue_impact: 320000, supply_gap: 45000, margin_impact: 1, confidence: 65, last_updated: "2026-04-30T03:00:00Z", assumptions: ["MedNet QBR positive", "Budget approved"], actions: ["Reserve 1 FTE Backend", "Confirm 1 Data Scientist availability"] },
    { id: "scn-005", name: "Supply Chain Risk", type: "risk", status: "draft", description: "Key OpenAI/AWS pricing change mid-year.", demand_delta_pct: 0, revenue_impact: 0, supply_gap: 320000, margin_impact: -8, confidence: 55, last_updated: "2026-04-22T14:00:00Z", assumptions: ["OpenAI 30% price hike", "AWS reserved instance increase"], actions: ["Negotiate annual commits", "Pilot alternative LLM providers"] },
];

// ════════════════════════════════════════════════════════════════════════
// 🏛️ PMO — Programs (groupings of projects)
// ════════════════════════════════════════════════════════════════════════

export interface Program {
    id: string;
    name: string;
    description: string;
    project_ids: string[];
    portfolio_value: number;
    status: "on_track" | "at_risk" | "delayed";
    risk: "low" | "medium" | "high";
    progress: number;
    lead: string;
    strategic_priority: "P0" | "P1" | "P2";
}

export const PROGRAMS: Program[] = [
    { id: "prg-001", name: "Healthcare AI Platform", description: "Strategic platform for genomics + pathology AI products.", project_ids: ["proj-001", "proj-003"], portfolio_value: 790000, status: "on_track", risk: "low", progress: 75, lead: "Pedro PM", strategic_priority: "P0" },
    { id: "prg-002", name: "Clinical Integrations", description: "EHR / FHIR integration suite for hospital networks.", project_ids: ["proj-002"], portfolio_value: 420000, status: "at_risk", risk: "medium", progress: 45, lead: "Maria T.", strategic_priority: "P0" },
    { id: "prg-003", name: "Data Modernization", description: "Data lake + analytics modernization for healthcare data.", project_ids: ["proj-004", "proj-005"], portfolio_value: 380000, status: "on_track", risk: "low", progress: 53, lead: "Andre O.", strategic_priority: "P1" },
];

export function getProgram(id: string) { return PROGRAMS.find(p => p.id === id); }
export function getProgramProjects(programId: string) {
    const p = getProgram(programId);
    return p ? PROJECTS.filter(pr => p.project_ids.includes(pr.id)) : [];
}
export function getScenario(id: string) { return SCENARIOS.find(s => s.id === id); }
