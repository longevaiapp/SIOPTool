"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

// ─── Data ─────────────────────────────────────────────────────────────────────

const PHILOSOPHY_COLS = [
    { num: "01", title: "Single Source of Truth", body: "Every operational decision — commercial, technical or financial — must be traceable to a live data point in the system. SIOP Nexus is not a reporting layer: it is the official record of the business's current state. If it's not in the system, it doesn't operationally exist." },
    { num: "02", title: "Two Data Types, One Intelligence", body: "Variable Inputs are live data: active pipeline, real capacity, sprint velocity, system alerts. Fixed Inputs are the master database: ICP definition, pricing models, architecture, contracts, compliance frameworks. Intelligence emerges from continuously crossing both streams." },
    { num: "03", title: "Operation Guided by Gaps, Not Reports", body: "A reporting system communicates what already happened. SIOP Nexus detects gaps before they materialize: demand-capacity mismatches, pipeline anomalies, regulatory risks, resource overloads. The system acts as a proactive co-pilot: generates recommendations, escalates alerts, proposes scenarios." },
];

const PRINCIPLES_EXTRA = [
    { num: "4", color: "teal" as const, title: "AI as Co-pilot, Human as Decision-Maker", body: "The AI predicts, recommends and alerts. The team validates and decides. No critical action — hiring, deal closure, scope change — is executed by automation without explicit human approval." },
    { num: "5", color: "amber" as const, title: "Modularity with Interconnection", body: "Each module can operate and be measured independently, but all feed one another. A completed RFQ automatically triggers the CRM, the capacity module, and the AI Scope Engine." },
    { num: "6", color: "violet" as const, title: "Compliance by Design", body: "HIPAA, COFEPRIS, FHIR R4, GDPR and NOM-024 are not bolt-on layers: they are constraints that shape the architecture from day one. Every module handling clinical data has audit trails, encryption, and access control by default." },
];

const FLOW_PHASES: { label: string; nodes: { step: string; title: string; who: string; detail: string; v?: "teal" | "amber" | "violet" | "rose" }[] }[] = [
    {
        label: "Phase 1 — Demand Capture",
        nodes: [
            { step: "01 · Trigger", title: "Prospect or Inbound Lead", who: "👤 Sales Lead + AI scoring", detail: "Automatic ICP qualification. AI score assigned in under 2 minutes. Lead enters CRM pipeline.", v: "teal" },
            { step: "02 · Intake", title: "Structured RFQ", who: "📋 PM + Client", detail: "60 questions across 10 sections. AI-assisted questionnaire. Estimated duration: 90 minutes." },
            { step: "03 · AI Output", title: "Auto-Generated Scope", who: "🤖 AI Engine", detail: "Charter + Budget + Timeline + Risk Register + Backlog seed. Generated in under 5 minutes.", v: "teal" },
            { step: "04 · Commercial", title: "CRM Deal Activated", who: "💼 Sales Lead", detail: "Pipeline updated. AI probability assigned. Rolling forecast automatically adjusted." },
        ],
    },
    {
        label: "Phase 2 — SIOP Planning",
        nodes: [
            { step: "05 · SIOP Check", title: "Capacity Gap Analysis", who: "🎯 SIOP Engine + COO", detail: "Can the company take on this project? Demand vs. real availability of team and infrastructure.", v: "amber" },
            { step: "06 · Approval", title: "Deal Closed + Contract", who: "⚖️ CEO + Compliance", detail: "Digital signature. NDA + MSA executed. Legal entity and payment conditions confirmed." },
            { step: "07 · Activation", title: "Project Created", who: "🏗️ PMO Lead", detail: "Sprint 1 pre-configured. Team assigned. Risk register active. Client onboarded to portal.", v: "teal" },
            { step: "08 · Infrastructure", title: "Stack & Datasets Ready", who: "🤖 CTO + AI Engineer", detail: "Staging environment configured. Datasets licensed. API keys and access credentials established." },
        ],
    },
    {
        label: "Phase 3 — Execution & Continuous Monitoring",
        nodes: [
            { step: "09 · Sprints", title: "Delivery Cycle", who: "⚙️ CTO + PMO", detail: "2-week sprints. Client demos. Velocity tracked. Blockers escalated within 24 hours." },
            { step: "10 · SIOP Loop", title: "Weekly S+I+OP Review", who: "🎯 COO + PMO + Sales", detail: "Demand, capacity and operations update. Gap analysis. Hiring or re-prioritization decisions.", v: "amber" },
            { step: "11 · AI Insights", title: "Alerts & Predictions", who: "🧠 AI Copilot", detail: "Anomalies detected. Risks escalated. Next best action recommendations surfaced automatically.", v: "violet" },
            { step: "12 · Executive", title: "Reporting + Decision", who: "📊 CEO + Board", detail: "Weekly SIOP Review. Portfolio health. Actual P&L. Rolling Q forecast. Quarterly QBR.", v: "teal" },
        ],
    },
    {
        label: "Phase 4 — Closure & Expansion",
        nodes: [
            { step: "13 · Delivery", title: "Go-Live + Acceptance", who: "✅ PM + Client", detail: "UAT approved. Compliance checklist closed. Documentation delivered. NPS captured.", v: "rose" },
            { step: "14 · Support", title: "Active SLA & Support", who: "🛟 Ops Lead", detail: "Helpdesk live. SLAs enforced. Ticketing integrated. Auto-escalation by incident severity." },
            { step: "15 · Growth", title: "Upsell & Referral", who: "📈 Sales + PMO", detail: "AI detects expansion opportunities. Phase 2 proposal generated. Client converted to referral source.", v: "teal" },
            { step: "16 · Closed Loop", title: "SIOP Updated", who: "🎯 SIOP Engine", detail: "Capacity released. Pipeline adjusted. Project history logged. AI model retrained on outcomes.", v: "amber" },
        ],
    },
];

const MODULES = [
    { accent: "#00BFA5", icon: "📋", num: "M-01 · P0", name: "RFQ & Intake Engine", desc: "Demand capture engine. AI-assisted questionnaire across 60 questions in 10 structured sections.", inputs: ["Client data", "60Q answers", "Project type", "Regulatory context"], outputs: ["Charter", "Budget est.", "Risk Register", "Backlog seed"], ai: ["Charter generation", "AI Scope Score", "Supplier RFQ"], kpis: ["RFQ→Deal %", "AI Score", "Intake time"], owner: "Sales Lead + PMO", status: "Active", statusType: "teal" as const },
    { accent: "#7C5CFC", icon: "🤖", num: "M-02 · P0", name: "AI Scope Output Engine", desc: "Automatic generation of project deliverables from the RFQ. Central intelligence engine of the product.", inputs: ["RFQ questionnaire", "Project history", "Regulatory datasets"], outputs: ["Project Charter", "Phase timeline", "Budget model", "Pre-populated risk"], ai: ["NLP → Charter", "AI cost model", "Risk scoring"], kpis: ["Confidence %", "Charter accuracy"], owner: "AI Engineer + CTO", status: "Active", statusType: "teal" as const },
    { accent: "#F5A623", icon: "💼", num: "M-03 · P0", name: "CRM & Sales Planning", desc: "Intelligent commercial pipeline. Predictive deal scoring, rolling forecast, and full sales cycle management.", inputs: ["Deal activity", "Demos completed", "Proposals sent", "Contacts"], outputs: ["Pipeline $", "Rolling forecast", "Win rate", "Weighted value"], ai: ["Deal AI scoring", "Anomaly flag", "Churn prediction"], kpis: ["Pipeline $", "Win Rate %", "CAC", "Forecast acc."], owner: "Sales Lead", status: "Active", statusType: "teal" as const },
    { accent: "#2563EB", icon: "🌐", num: "M-04 · P1", name: "Client Portal", desc: "Client-facing portal with project visibility, approvals, deliverables, and integrated direct communication.", inputs: ["Project status", "Approvals", "Messages"], outputs: ["Client dashboard", "Alerts", "Documents"], ai: ["Automatic updates", "Milestone alerts"], kpis: ["Client NPS", "Approval time"], owner: "PMO Lead + Ops", status: "In Development", statusType: "amber" as const },
    { accent: "#2A7A5A", icon: "📁", num: "M-05 · P0", name: "Project Management", desc: "HealthTech project delivery with 8 specialized views: Overview, Sprints, Board, Backlog, Docs, Risks, Compliance, Reports.", inputs: ["Tasks", "Story points", "Blockers", "Sprints"], outputs: ["Health score", "Burndown", "Velocity", "Risk log"], ai: ["Blocker alert", "AI health scoring"], kpis: ["Health score", "On-time %", "Velocity"], owner: "PMO Lead + CTO", status: "Active", statusType: "teal" as const },
    { accent: "#0F1525", icon: "🏗️", num: "M-06 · P0", name: "PMO & Portfolio", desc: "Multi-project governance. Aggregated health scoring, portfolio-level risk, and executive reporting.", inputs: ["Per-project health", "Budget variance", "Risks"], outputs: ["Portfolio health", "Delivery prediction", "PMO action"], ai: ["Portfolio scoring", "Risk escalation"], kpis: ["Portfolio health", "At-risk count"], owner: "PMO Director", status: "Active", statusType: "teal" as const },
    { accent: "#D62839", icon: "🎯", num: "M-07 · P0", name: "SIOP Planning Engine", desc: "The system's core. Integrates Sales + Inventory/Capacity + Operations into a unified decision model.", inputs: ["CRM pipeline", "Real capacity", "Ops data", "$ forecast"], outputs: ["Gap analysis", "Scenarios", "AI decision"], ai: ["Gap detection", "AI scenario", "Hiring rec."], kpis: ["D-C Gap %", "SIOP Score"], owner: "CEO + COO", status: "Active alert", statusType: "rose" as const },
    { accent: "#F0415A", icon: "🏭", num: "M-08 · P0", name: "Capacity & Inventory", desc: "Resource inventory: human team, datasets, cloud infrastructure, AI models, and clinical partners.", inputs: ["Assignments", "Available hours", "FTE costs"], outputs: ["Utilization %", "Overload flags", "Weekly cost"], ai: ["Overload alert", "Allocation opt."], kpis: ["Utilization %", "FTE gap", "Cost/week"], owner: "PMO Lead + CTO", status: "Watchlist", statusType: "amber" as const },
    { accent: "#2A7A5A", icon: "🤝", num: "M-09 · P1", name: "Suppliers & Partners", desc: "Supplier marketplace with multi-dimensional AI scoring, contracts, and relationship management.", inputs: ["Proposals", "Contracts", "Performance"], outputs: ["AI Score", "Recommended pick", "External RFQ"], ai: ["Supplier scoring", "Renewal alert"], kpis: ["Avg score", "SLA compliance"], owner: "Ops Lead + PMO", status: "Active", statusType: "teal" as const },
    { accent: "#D4AC3A", icon: "💰", num: "M-10 · P0", name: "Finance & KPI Intelligence", desc: "Per-project and consolidated P&L, margins, financial anomaly detection, and revenue confidence modeling.", inputs: ["Actual costs", "Revenue", "Invoicing", "Burn rate"], outputs: ["P&L", "Margin %", "Anomalies", "Forecast"], ai: ["Anomaly detect", "Revenue forecast AI"], kpis: ["Gross margin %", "Burn rate", "ARR"], owner: "CFO / Finance", status: "Active", statusType: "teal" as const },
    { accent: "#7C5CFC", icon: "🧠", num: "M-11 · P0", name: "AI Insights Layer", desc: "Cross-cutting intelligence layer. Alerts, predictions, anomalies, recommendations, and next best actions.", inputs: ["All modules", "Historical data", "AI config"], outputs: ["Prioritized insights", "Recommendations", "Confidence"], ai: ["Auto-insights", "Cross-module AI"], kpis: ["Active alerts", "Avg confidence"], owner: "AI Engineer", status: "Active", statusType: "teal" as const },
    { accent: "#2563EB", icon: "🛡️", num: "M-12 · P0", name: "Compliance & Risk Center", desc: "Full regulatory control. HIPAA, COFEPRIS, FHIR R4, GDPR, NOM-024. End-to-end auditability.", inputs: ["Defined controls", "Evidence", "Review dates"], outputs: ["Control status", "Risk score", "Required actions"], ai: ["Compliance AI", "Risk escalation"], kpis: ["Compliance %", "Critical controls"], owner: "Compliance Lead", status: "3 alerts", statusType: "amber" as const },
    { accent: "#00BFA5", icon: "📊", num: "M-13 · P1", name: "Reports & Output Layer", desc: "Automatic generation and distribution of executive, operational, financial, and client reports.", inputs: ["All-module KPIs", "Report config"], outputs: ["Weekly SIOP", "Portfolio PDF", "QBR"], ai: ["Auto-generation", "Distribution"], kpis: ["Reports/week", "On-time dist."], owner: "PMO + CEO", status: "Active", statusType: "teal" as const },
    { accent: "#F0415A", icon: "⚡", num: "M-14 · P0", name: "Master Control Center", desc: "Executive system view. Global traffic lights, aggregated KPIs, critical alerts, and status of all 13 modules.", inputs: ["KPIs M01–M13", "AI alerts", "System status"], outputs: ["Executive view", "Traffic lights", "Decisions"], ai: ["Real-time aggregation", "Alert routing"], kpis: ["System health", "Alert count"], owner: "CEO + COO", status: "Active", statusType: "teal" as const },
];

const KPIS = [
    {
        icon: "📈", title: "Strategic KPIs", role: "CEO + Board · Quarterly review",
        rows: [["ARR (Annual Recurring Revenue)", "≥ $2M Year 1", "Monthly"], ["LTV : CAC Ratio", "≥ 3x", "Quarterly"], ["Net Revenue Retention (NRR)", "≥ 110%", "Monthly"], ["Product-Market Fit Score", "NPS ≥ 50", "Quarterly"], ["Runway (months)", "≥ 18 months", "Weekly"], ["Market Expansion Score", "3 countries Y3", "Annual"]],
        warn: [4],
    },
    {
        icon: "⚙️", title: "Operational KPIs", role: "COO + PMO · Weekly review",
        rows: [["On-Time Delivery Rate", "≥ 80%", "Monthly"], ["Portfolio Health Score", "≥ 85/100", "Weekly"], ["Sprint Velocity Consistency", "±15%", "Bi-weekly"], ["Team Utilization Rate", "70–85%", "Weekly"], ["SIOP Demand-Capacity Gap", "≤ 5%", "Weekly"], ["Customer Effort Score (CES)", "≤ 2 (of 7)", "Monthly"]],
        warn: [3], crit: [4],
    },
    {
        icon: "💰", title: "Financial KPIs", role: "CFO · Monthly close",
        rows: [["Gross Margin per Project", "≥ 40%", "Monthly"], ["MRR Growth Rate", "≥ 15%/month", "Monthly"], ["Weekly Burn Rate", "≤ $28K", "Weekly"], ["Revenue Forecast Accuracy", "±10%", "Monthly"], ["CAC Payback Period", "≤ 9 months", "Quarterly"], ["EBITDA Margin (Year 2+)", "≥ 20%", "Annual"]],
        warn: [2],
    },
    {
        icon: "🧠", title: "AI Adoption KPIs", role: "AI Engineer + CTO · Weekly",
        rows: [["Average AI Confidence Score", "≥ 85%", "Weekly"], ["Critical alerts detected → acted on", "≥ 90%", "Weekly"], ["AI feature adoption (DAU)", "≥ 70%", "Monthly"], ["Forecast model accuracy", "±12%", "Monthly"], ["AI Cost per Insight (tokens)", "≤ $0.05", "Monthly"], ["Models in production", "≥ 6", "Quarterly"]],
        warn: [4],
    },
];

const CONNECTIONS = [
    { src: "RFQ_INTAKE", dest: "AI_SCOPE_OUTPUT", data: "60 questionnaire answers + client context", freq: "ev", trigger: "Questionnaire completed", impact: "Generates Charter + Budget + Risk" },
    { src: "RFQ_INTAKE", dest: "CRM_PIPELINE", data: "Qualified client, project type, estimated value", freq: "ev", trigger: "RFQ approved by PM", impact: "Creates deal in pipeline" },
    { src: "AI_SCOPE_OUTPUT", dest: "PROJECTS", data: "Charter + Backlog seed + Sprint 1 pre-config", freq: "ev", trigger: "Deal closed and signed", impact: "Creates project with sprint activated" },
    { src: "CRM_PIPELINE", dest: "SIOP_ENGINE", data: "Revenue forecast, pipeline value, win probability", freq: "wk", trigger: "Automatic refresh", impact: "Feeds demand (S) side of SIOP" },
    { src: "CAPACITY_INVENTORY", dest: "SIOP_ENGINE", data: "Available hours, utilization, overload flags", freq: "wk", trigger: "Assignment change", impact: "Feeds inventory (I) side of SIOP" },
    { src: "PROJECTS", dest: "PMO_PORTFOLIO", data: "Health score, progress %, blockers, actual budget", freq: "wk", trigger: "PM update", impact: "Calculates portfolio health score" },
    { src: "PROJECT_EXEC", dest: "CAPACITY_INVENTORY", data: "Hours consumed, FTEs released at phase close", freq: "ev", trigger: "Sprint / phase end", impact: "Frees capacity for new projects" },
    { src: "SIOP_ENGINE", dest: "MASTER_CONTROL", data: "Gap analysis, scenarios, AI-driven decisions", freq: "wk", trigger: "Weekly SIOP cycle", impact: "Updates executive traffic lights" },
    { src: "AI_INSIGHTS", dest: "MASTER_CONTROL", data: "Prioritized alerts, anomalies, predictions", freq: "rt", trigger: "Continuous AI engine", impact: "Triggers alerts across all modules" },
    { src: "FINANCE_KPIS", dest: "SIOP_ENGINE", data: "Per-project margin, burn rate, consolidated P&L", freq: "mo", trigger: "Monthly close", impact: "Feeds financial viability of SIOP scenarios" },
    { src: "COMPLIANCE_RISK", dest: "AI_INSIGHTS", data: "At-risk controls, incidents, regulatory changes", freq: "mo", trigger: "Control status change", impact: "Generates regulatory alerts in Insights" },
    { src: "ALL_MODULES", dest: "REPORTS_OUTPUT", data: "Consolidated KPIs by module and area", freq: "wk", trigger: "Automated schedule", impact: "Auto-generates executive reports" },
];
const FREQ_LABEL: Record<string, { label: string; bg: string; color: string }> = {
    rt: { label: "Real-time", bg: "var(--rose-lt)", color: "var(--rose)" },
    wk: { label: "Weekly", bg: "var(--sage-lt)", color: "var(--sage)" },
    mo: { label: "Monthly", bg: "var(--blue-lt)", color: "var(--blue)" },
    ev: { label: "Per event", bg: "var(--violet-lt)", color: "var(--violet)" },
};

const AI_CARDS = [
    { color: "teal" as const, emoji: "🔮", title: "Demand & Revenue Forecasting", body: "Predictive model that analyzes historical pipeline, win rates by segment, seasonality, and market signals to project revenue with ±12% accuracy. Automatic weekly refresh. Inputs: CRM + historical data + industry benchmarks.", tag: "Confidence: 79–87%" },
    { color: "violet" as const, emoji: "⚡", title: "Capacity Gap Detection", body: "Crosses projected demand (CRM pipeline) against real capacity (team + infra). Detects gaps 4 weeks in advance. Generates hiring or re-prioritization recommendations with quantified financial impact — before the gap becomes a crisis.", tag: "Alert: 4-week lead time" },
    { color: "amber" as const, emoji: "🎯", title: "Deal Scoring & Win Prediction", body: "AI score per deal (0–100) based on: ICP fit, engagement activity, deal size, pipeline velocity, and stagnation risk signals. Predicts close probability by stage with >80% historical accuracy.", tag: "Historical accuracy: 82%" },
    { color: "rose" as const, emoji: "🚨", title: "Cross-Module Anomaly Detection", body: "Real-time monitoring of over 40 metrics across all modules. Detects: deals without activity, resource overloads, budget variance >10%, lapsed compliance controls, sprint velocity drops. Automatic severity-based prioritization.", tag: "False positive rate: <8%" },
    { color: "blue" as const, emoji: "💬", title: "NLP Copilot & Query Interface", body: 'Conversational interface enabling the team to query the system in natural language. "Which projects are at risk?" → instant analysis. "Summarize the portfolio for the board" → executive report generated in seconds. Powered by the Claude API.', tag: "Median latency: <3s" },
    { color: "sage" as const, emoji: "🔒", title: "Compliance Intelligence Monitor", body: "Regulatory monitor tracking control status for HIPAA, COFEPRIS, FHIR, and GDPR. Alerts on upcoming expirations, regulatory changes, and audit risks. Never executes compliance actions without explicit validation.", tag: "Human-in-the-loop: always" },
];

const AI_BOUNDARIES = [
    "❌ Close a deal or sign a contract without CEO approval",
    "❌ Hire or release a team member without human decision",
    "❌ Change project scope without PM + client sign-off",
    "❌ Transfer funds or approve budget without CFO",
    "❌ Send client communications without editorial review",
    "❌ Apply security patches to production without CTO",
];

const GOVERNANCE = [
    { decision: "Close deal and sign contract", owner: "Sales Lead", approver: "CEO (deals >$100K)", sla: "48h", slaType: "ok" as const, audit: "Log + digital signature", escalation: "Direct to CEO" },
    { decision: "Project scope change", owner: "PMO Lead", approver: "PM + Client + CEO", sla: "72h", slaType: "ok" as const, audit: "Formal change request", escalation: "Project committee" },
    { decision: "New hire decision", owner: "CEO", approver: "CFO (budget approval)", sla: "1 week", slaType: "ok" as const, audit: "HRIS process trail", escalation: "CEO + CFO" },
    { decision: "Critical blocker escalation", owner: "PMO Lead", approver: "CEO / COO notification", sla: "24h", slaType: "amber" as const, audit: "PMO incident record", escalation: "Direct to CEO" },
    { decision: "Security incident / data breach", owner: "CTO + Compliance", approver: "CEO + Legal", sla: "<2h", slaType: "red" as const, audit: "Complete audit trail", escalation: "HIPAA Breach Protocol" },
    { decision: "Extraordinary budget approval", owner: "CFO", approver: "CEO (>$10K)", sla: "48h", slaType: "ok" as const, audit: "Finance log + justification", escalation: "Board if >$50K" },
    { decision: "Regulatory / compliance change", owner: "Compliance Lead", approver: "CEO + Legal", sla: "1 week", slaType: "ok" as const, audit: "Risk register updated", escalation: "External legal counsel" },
    { decision: "Production deployment", owner: "CTO", approver: "QA sign-off", sla: "48h", slaType: "amber" as const, audit: "CI/CD log + rollback plan", escalation: "CTO responsible" },
];

const DEV_CARDS = [
    { label: "Tech Stack", title: "Architecture Decisions", body: "Approved production stack. Frontend on Next.js 15 App Router with Server Components for performance. FastAPI backend with async workers. Auth via Supabase with RLS policies. AI streaming via Claude API. All infra as code (Terraform).", code: "Next.js 15 · FastAPI · Supabase\nPostgreSQL · Claude API · Vercel\nReact Native (mobile — Phase 2)" },
    { label: "Data Model", title: "Core Entities", body: "Normalized relational model in PostgreSQL via Supabase. Entity hierarchy: Organization → Project → Sprint → Task → User. Multi-tenant by design with Row Level Security. FHIR Resources stored as JSONB fields in clinical tables for interoperability.", code: "organizations → projects\nprojects → sprints → tasks\nusers ↔ projects (many-to-many)\nrfqs → deals → projects" },
    { label: "AI Integration", title: "Claude API Patterns", body: "Each AI call uses modular system prompts by context domain. Structured outputs via JSON mode for actionable data objects. Streaming for the copilot interface. Embeddings for semantic search within the knowledge base. Rate limiting enforced at the edge layer.", code: "model: claude-sonnet-4-6\nmax_tokens: 4096\nresponse_format: json_object\nstreaming: true (copilot only)" },
    { label: "Security", title: "HIPAA-Ready Architecture", body: "Clinical data on AWS us-east-1 (HIPAA eligible region). AES-256 encryption at-rest, TLS 1.3 in-transit. Immutable audit log in PostgreSQL append-only table. PHI never written to application logs. BAAs signed with AWS, Supabase, and Anthropic.", code: "AWS KMS · RLS in Supabase\nAudit log: append-only table\nPHI masking in dev / staging" },
    { label: "Roadmap", title: "Quick Wins → Future Phases", body: "MVP (Sprint 6): RFQ + CRM + SIOP Engine + AI Insights + Reports. v1.1: Client Portal + Suppliers. v2: Mobile app + EHR integrations + multi-tenant. v3: Biomedical dataset marketplace + LATAM expansion.", code: "S1–S3: Core modules\nS4–S6: AI layer + integrations\nPost-MVP: Portal + Mobile" },
    { label: "Components", title: "Reusable Design System", body: "Atomic component library: KPICard, ProjectCard, InsightRow, CapacityBar, ScoreRing, FlowNode, SIOPGauge. All documented in Storybook. Design tokens centralized with automatic sync to CSS variables across the codebase.", code: "design-tokens.json → CSS vars\nStorybook: 40+ components\nFigma: auto-sync enabled" },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

const CARD_COLORS = {
    teal: { bg: "var(--teal-lt)", border: "var(--teal)", labelColor: "var(--teal-dk)" },
    amber: { bg: "var(--amber-lt)", border: "var(--amber)", labelColor: "#92400E" },
    violet: { bg: "var(--violet-lt)", border: "var(--violet)", labelColor: "#5B21B6" },
    sage: { bg: "var(--sage-lt)", border: "var(--sage)", labelColor: "var(--sage)" },
    rose: { bg: "var(--rose-lt)", border: "var(--rose)", labelColor: "var(--rose)" },
    blue: { bg: "var(--blue-lt)", border: "var(--blue)", labelColor: "var(--blue)" },
};

const NODE_COLORS = {
    teal: { bg: "var(--teal-lt)", border: "var(--teal)", stepColor: "var(--teal)" },
    amber: { bg: "var(--amber-lt)", border: "var(--amber)", stepColor: "var(--amber)" },
    violet: { bg: "var(--violet-lt)", border: "var(--violet)", stepColor: "var(--violet)" },
    rose: { bg: "var(--rose-lt)", border: "var(--rose)", stepColor: "var(--rose)" },
};

function SH({ label, tag, tagColor = "teal" }: { label: string; tag: string; tagColor?: "teal" | "amber" | "violet" | "rose" | "blue" | "ink" }) {
    const tagBg: Record<string, string> = { teal: "var(--teal)", amber: "var(--amber)", violet: "var(--violet)", rose: "var(--rose)", blue: "var(--blue)", ink: "var(--ink3)" };
    const tagTxt: Record<string, string> = { teal: "var(--ink)", amber: "var(--ink)", violet: "#fff", rose: "#fff", blue: "#fff", ink: "#fff" };
    return (
        <div className="mb-7 mt-16 flex items-center gap-4 first:mt-0">
            <span style={{ fontFamily: "var(--f-display)", fontSize: 26, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap" }}>{label}</span>
            <span style={{ background: tagBg[tagColor], color: tagTxt[tagColor], borderRadius: 6, padding: "3px 9px", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px", whiteSpace: "nowrap" }}>{tag}</span>
            <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
        </div>
    );
}

function Chip({ label, type }: { label: string; type: "in" | "out" | "ai" | "kpi" }) {
    const styles = {
        in: { bg: "var(--blue-lt)", border: "#BFDBFE", color: "#1D4ED8" },
        out: { bg: "var(--teal-lt)", border: "#99E8D5", color: "var(--teal-dk)" },
        ai: { bg: "var(--violet-lt)", border: "#C4B5FD", color: "#5B21B6" },
        kpi: { bg: "var(--amber-lt)", border: "#FCD34D", color: "#92400E" },
    }[type];
    return (
        <span style={{ background: styles.bg, borderColor: styles.border, color: styles.color, borderRadius: 6, padding: "3px 9px", fontSize: 10.5, fontWeight: 500, border: "1px solid", display: "inline-block", marginRight: 4, marginBottom: 4 }}>
            {label}
        </span>
    );
}

function StatusBadge({ status, type }: { status: string; type: "teal" | "amber" | "rose" }) {
    const styles = {
        teal: { bg: "#D1FAE5", color: "#065F46", dot: "#10B981" },
        amber: { bg: "var(--amber-lt)", color: "#92400E", dot: "var(--amber)" },
        rose: { bg: "var(--rose-lt)", color: "#9F1239", dot: "var(--rose)" },
    }[type];
    return (
        <span style={{ background: styles.bg, color: styles.color, borderRadius: 20, padding: "3px 9px", fontSize: 10.5, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: styles.dot, display: "inline-block" }} />
            {status}
        </span>
    );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

const TABS = [
    { id: "philosophy", label: "Philosophy" },
    { id: "flow", label: "Process Flow" },
    { id: "modules", label: "14 Modules" },
    { id: "kpis", label: "KPI Architecture" },
    { id: "data", label: "Data & Connections" },
    { id: "ailayer", label: "AI Layer" },
    { id: "governance", label: "Governance" },
    { id: "devnotes", label: "Dev Notes" },
];

export default function OverviewPage() {
    const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

    const scrollTo = (id: string) => {
        sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    return (
        <div style={{ background: "var(--surface)" }}>
            {/* ── Masthead ─────────────────────────────────────── */}
            <div style={{ background: "var(--ink)", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 700px 500px at 75% 50%,rgba(0,191,165,.12),transparent),radial-gradient(ellipse 400px 300px at 15% 80%,rgba(245,166,35,.07),transparent),radial-gradient(ellipse 300px 400px at 90% 10%,rgba(124,92,252,.07),transparent)" }} />
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />
                <div style={{ maxWidth: 1400, margin: "0 auto", padding: "52px 56px 44px", position: "relative", zIndex: 2 }}>
                    <div className="flex flex-wrap items-end justify-between gap-10">
                        <div>
                            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", color: "var(--teal)", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ display: "block", width: 24, height: 1, background: "var(--teal)" }} />
                                Amatista Life · LongevAI Division · AIaaS HealthTech Factory
                            </div>
                            <div style={{ fontFamily: "var(--f-display)", fontSize: 58, fontWeight: 900, color: "var(--white)", lineHeight: .95, letterSpacing: -2.5, marginBottom: 16 }}>
                                Longev<em style={{ color: "var(--teal)", fontStyle: "normal" }}>AI</em>{" "}
                                <span style={{ color: "rgba(255,255,255,.3)" }}>SIOP</span>
                            </div>
                            <p style={{ fontSize: 14, color: "rgba(255,255,255,.45)", maxWidth: 520, lineHeight: 1.65 }}>
                                The <strong style={{ color: "rgba(255,255,255,.7)", fontWeight: 500 }}>AIaaS HealthTech Factory</strong> operating system — built for clinical AI companies, health-tech integrators, and digital health ventures that run at the intersection of <strong style={{ color: "rgba(255,255,255,.7)", fontWeight: 500 }}>AI, medicine, and enterprise operations</strong>.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-start gap-3">
                            {[
                                { num: "14", label: "Core Modules" },
                                { num: "9", label: "Operational Roles" },
                                { num: "100", label: "KPIs Mapped" },
                                { num: "4", label: "AI Layers" },
                                { num: "5", label: "Verticals" },
                            ].map(({ num, label }) => (
                                <div key={label} style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 14, padding: "16px 22px", textAlign: "center", minWidth: 100, backdropFilter: "blur(8px)" }}>
                                    <span style={{ fontFamily: "var(--f-display)", fontSize: 30, fontWeight: 700, color: "var(--amber)", display: "block", lineHeight: 1 }}>{num}</span>
                                    <span style={{ fontSize: 9.5, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: "1.2px", marginTop: 5, display: "block" }}>{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,var(--teal),var(--amber) 50%,var(--violet))", opacity: .6 }} />
            </div>

            {/* ── Sticky doc nav ──────────────────────────────── */}
            <div style={{ background: "var(--ink2)", borderBottom: "1px solid var(--line-dk)", position: "sticky", top: 0, zIndex: 100 }}>
                <div style={{ display: "flex", overflowX: "auto", padding: "0 24px", maxWidth: 1400, margin: "0 auto" }}>
                    {TABS.map(({ id, label }) => (
                        <button
                            key={id}
                            onClick={() => scrollTo(id)}
                            style={{ padding: "13px 18px", fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,.38)", borderBottom: "2px solid transparent", cursor: "pointer", whiteSpace: "nowrap", background: "none", border: "none", fontFamily: "var(--f-ui)", transition: ".15s" }}
                            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,.7)")}
                            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.38)")}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Doc content ─────────────────────────────────── */}
            <div style={{ maxWidth: 1400, margin: "0 auto", padding: "48px 56px 80px" }}>

                {/* Philosophy */}
                <div ref={el => { sectionRefs.current["philosophy"] = el; }} id="philosophy">
                    <SH label="System Philosophy" tag="Foundation" />
                </div>

                <div style={{ background: "var(--ink)", borderRadius: 20, padding: "40px 44px", color: "var(--white)", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 36, position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: -80, right: -80, width: 320, height: 320, background: "radial-gradient(circle,rgba(0,191,165,.18),transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
                    {PHILOSOPHY_COLS.map((p) => (
                        <div key={p.num}>
                            <span style={{ fontFamily: "var(--f-display)", fontSize: 42, fontWeight: 900, color: "rgba(255,255,255,.06)", lineHeight: 1, display: "block", marginBottom: -8 }}>{p.num}</span>
                            <div style={{ fontFamily: "var(--f-display)", fontSize: 19, color: "var(--amber)", marginBottom: 10, lineHeight: 1.2 }}>{p.title}</div>
                            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.55)", lineHeight: 1.75 }}>{p.body}</p>
                        </div>
                    ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginTop: 16 }}>
                    {PRINCIPLES_EXTRA.map((p) => {
                        const c = CARD_COLORS[p.color];
                        return (
                            <div key={p.num} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14, padding: 20 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: c.labelColor, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Principle {p.num}</div>
                                <div style={{ fontFamily: "var(--f-display)", fontSize: 15, color: "var(--ink)", marginBottom: 8 }}>{p.title}</div>
                                <p style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.65 }}>{p.body}</p>
                            </div>
                        );
                    })}
                </div>

                {/* Process Flow */}
                <div ref={el => { sectionRefs.current["flow"] = el; }} id="flow">
                    <SH label="Process Flow — End-to-End" tag="Operational" tagColor="amber" />
                </div>

                <div style={{ background: "var(--white)", borderRadius: 20, padding: "36px 40px", boxShadow: "var(--shadow)", border: "1px solid var(--line)", overflowX: "auto" }}>
                    {FLOW_PHASES.map((phase) => (
                        <div key={phase.label} style={{ marginBottom: 28 }}>
                            <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.8px", color: "var(--muted)", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
                                {phase.label}
                                <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
                            </div>
                            <div style={{ display: "flex", alignItems: "stretch", minWidth: 920 }}>
                                {phase.nodes.map((node, ni) => {
                                    const nc = node.v ? NODE_COLORS[node.v] : null;
                                    return (
                                        <div key={ni} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                                            <div style={{ flex: 1, background: nc?.bg ?? "var(--surface)", border: `1.5px solid ${nc?.border ?? "var(--line)"}`, borderRadius: 12, padding: "14px 16px" }}>
                                                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: nc?.stepColor ?? "var(--teal)", marginBottom: 4 }}>{node.step}</div>
                                                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 3, lineHeight: 1.3 }}>{node.title}</div>
                                                <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 5 }}>{node.who}</div>
                                                <div style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.5, fontStyle: "italic" }}>{node.detail}</div>
                                            </div>
                                            {ni < phase.nodes.length - 1 && (
                                                <div style={{ padding: "0 6px", color: "var(--teal)", fontSize: 16, flexShrink: 0, fontWeight: 700 }}>→</div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Modules */}
                <div ref={el => { sectionRefs.current["modules"] = el; }} id="modules">
                    <SH label="14 Functional Modules" tag="Core Architecture" tagColor="violet" />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
                    {MODULES.map((m) => (
                        <div key={m.name} style={{ background: "var(--white)", border: "1px solid var(--line)", borderRadius: 18, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                            <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--line)", display: "flex", gap: 12, alignItems: "flex-start" }}>
                                <div style={{ width: 3, borderRadius: 3, flexShrink: 0, alignSelf: "stretch", background: m.accent }} />
                                <div style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{m.icon}</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)" }}>{m.num}</div>
                                    <div style={{ fontFamily: "var(--f-display)", fontSize: 16, fontWeight: 700, color: "var(--ink)", margin: "2px 0 4px", lineHeight: 1.2 }}>{m.name}</div>
                                    <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.55 }}>{m.desc}</div>
                                </div>
                            </div>
                            <div style={{ padding: "16px 20px" }}>
                                <div style={{ marginBottom: 10 }}>
                                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px", color: "var(--muted)", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                                        <span style={{ display: "block", width: 10, height: 1.5, background: "currentColor" }} />Inputs
                                    </div>
                                    <div>{m.inputs.map(l => <Chip key={l} label={l} type="in" />)}</div>
                                </div>
                                <div style={{ marginBottom: 10 }}>
                                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px", color: "var(--muted)", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                                        <span style={{ display: "block", width: 10, height: 1.5, background: "currentColor" }} />AI Outputs
                                    </div>
                                    <div>{m.outputs.map(l => <Chip key={l} label={l} type="out" />)}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px", color: "var(--muted)", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                                        <span style={{ display: "block", width: 10, height: 1.5, background: "currentColor" }} />KPIs
                                    </div>
                                    <div>{m.kpis.map(l => <Chip key={l} label={l} type="kpi" />)}</div>
                                </div>
                            </div>
                            <div style={{ background: "var(--surface)", borderTop: "1px solid var(--line)", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ fontSize: 10.5, color: "var(--muted)" }}>Owner: <strong style={{ color: "var(--ink)" }}>{m.owner}</strong></div>
                                <StatusBadge status={m.status} type={m.statusType} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* KPI Architecture */}
                <div ref={el => { sectionRefs.current["kpis"] = el; }} id="kpis">
                    <SH label="KPI Architecture" tag="Measurement" tagColor="rose" />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 18 }}>
                    {KPIS.map((k) => (
                        <div key={k.title} style={{ background: "var(--white)", border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                            <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--line)" }}>
                                <span style={{ fontSize: 20 }}>{k.icon}</span>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{k.title}</div>
                                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{k.role}</div>
                                </div>
                            </div>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr>
                                        {["Metric", "Target · Frequency"].map((h) => (
                                            <th key={h} style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", color: "var(--muted)", padding: "8px 16px", textAlign: "left", background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {k.rows.map(([metric, target, freq], ri) => {
                                        const isWarn = k.warn?.includes(ri);
                                        const isCrit = (k as { crit?: number[] }).crit?.includes(ri);
                                        const badgeStyle = isCrit
                                            ? { background: "var(--rose-lt)", color: "#9F1239" }
                                            : isWarn
                                                ? { background: "var(--amber-lt)", color: "#92400E" }
                                                : { background: "var(--sage-lt)", color: "var(--sage)" };
                                        return (
                                            <tr key={ri}>
                                                <td style={{ padding: "9px 16px", fontSize: 12, borderBottom: ri < k.rows.length - 1 ? "1px solid var(--line)" : "none", fontWeight: 500, color: "var(--ink)", width: "48%" }}>{metric}</td>
                                                <td style={{ padding: "9px 16px", fontSize: 12, borderBottom: ri < k.rows.length - 1 ? "1px solid var(--line)" : "none", color: "var(--muted)" }}>
                                                    <span style={{ ...badgeStyle, display: "inline-block", fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 10, marginRight: 5 }}>{target}</span>
                                                    {freq}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>

                {/* Data Connections */}
                <div ref={el => { sectionRefs.current["data"] = el; }} id="data">
                    <SH label="Data & Systems Connections" tag="Data Architecture" tagColor="blue" />
                </div>

                <div style={{ background: "var(--white)", borderRadius: 18, border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: "var(--ink)" }}>
                                    {["Source Module", "", "Destination", "Data Transferred", "Frequency", "Trigger", "Impact"].map((h) => (
                                        <th key={h} style={{ padding: "13px 16px", fontSize: 9.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "rgba(255,255,255,.5)", textAlign: "left" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {CONNECTIONS.map((c, i) => {
                                    const f = FREQ_LABEL[c.freq];
                                    return (
                                        <tr key={i} style={{ background: i % 2 === 1 ? "var(--surface)" : undefined }}>
                                            <td style={{ padding: "11px 16px", fontSize: 11, fontWeight: 600, color: "var(--teal-dk)", fontFamily: "var(--f-mono)", borderBottom: "1px solid var(--line)" }}>{c.src}</td>
                                            <td style={{ padding: "11px 8px", fontSize: 10, color: "var(--muted)", borderBottom: "1px solid var(--line)" }}>→</td>
                                            <td style={{ padding: "11px 16px", fontSize: 11, fontWeight: 500, color: "var(--rose)", fontFamily: "var(--f-mono)", borderBottom: "1px solid var(--line)" }}>{c.dest}</td>
                                            <td style={{ padding: "11px 16px", fontSize: 12, color: "var(--text)", borderBottom: "1px solid var(--line)" }}>{c.data}</td>
                                            <td style={{ padding: "11px 16px", borderBottom: "1px solid var(--line)" }}>
                                                <span style={{ background: f.bg, color: f.color, fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 8, display: "inline-block" }}>{f.label}</span>
                                            </td>
                                            <td style={{ padding: "11px 16px", fontSize: 12, color: "var(--text)", borderBottom: "1px solid var(--line)" }}>{c.trigger}</td>
                                            <td style={{ padding: "11px 16px", fontSize: 12, color: "var(--muted)", borderBottom: "1px solid var(--line)" }}>{c.impact}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* AI Layer */}
                <div ref={el => { sectionRefs.current["ailayer"] = el; }} id="ailayer">
                    <SH label="AI Layer — System Intelligence" tag="AI Native" tagColor="violet" />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
                    {AI_CARDS.map((card) => {
                        const c = CARD_COLORS[card.color];
                        return (
                            <div key={card.title} style={{ background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 14, padding: 20 }}>
                                <div style={{ fontSize: 26, marginBottom: 10 }}>{card.emoji}</div>
                                <div style={{ fontFamily: "var(--f-display)", fontSize: 14, fontWeight: 700, color: "var(--ink)", marginBottom: 7 }}>{card.title}</div>
                                <p style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.65 }}>{card.body}</p>
                                <span style={{ display: "inline-block", marginTop: 10, fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", padding: "2px 8px", borderRadius: 6, background: "rgba(0,0,0,.07)", color: "var(--ink)" }}>{card.tag}</span>
                            </div>
                        );
                    })}
                </div>

                <div style={{ background: "var(--ink3)", borderRadius: 16, padding: "24px 28px", marginTop: 16, border: "1px solid rgba(255,255,255,.07)" }}>
                    <div style={{ fontFamily: "var(--f-display)", fontSize: 16, color: "var(--white)", marginBottom: 10 }}>⚖️ AI System Boundaries — What the system never does autonomously</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, fontSize: 12, color: "rgba(255,255,255,.5)" }}>
                        {AI_BOUNDARIES.map((b) => <div key={b}>{b}</div>)}
                    </div>
                </div>

                {/* Governance */}
                <div ref={el => { sectionRefs.current["governance"] = el; }} id="governance">
                    <SH label="Governance & Decision Rules" tag="Compliance" tagColor="rose" />
                </div>

                <div style={{ background: "var(--white)", borderRadius: 16, border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: "var(--ink3)" }}>
                                {["Decision / Action", "Owner", "Requires Approval From", "Resolution SLA", "Auditability", "Escalation Path"].map((h) => (
                                    <th key={h} style={{ padding: "13px 16px", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "rgba(255,255,255,.5)", textAlign: "left" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {GOVERNANCE.map((g, i) => {
                                const slaBg = g.slaType === "red" ? "var(--rose-lt)" : g.slaType === "amber" ? "var(--amber-lt)" : "var(--teal-lt)";
                                const slaColor = g.slaType === "red" ? "var(--rose)" : g.slaType === "amber" ? "#92400E" : "var(--teal-dk)";
                                return (
                                    <tr key={i} style={{ background: i % 2 === 1 ? "var(--surface)" : undefined }}>
                                        <td style={{ padding: "11px 16px", fontSize: 12, borderBottom: "1px solid var(--line)", fontWeight: 600, color: "var(--ink)" }}>{g.decision}</td>
                                        <td style={{ padding: "11px 16px", fontSize: 12, borderBottom: "1px solid var(--line)", color: "var(--text)" }}>{g.owner}</td>
                                        <td style={{ padding: "11px 16px", fontSize: 12, borderBottom: "1px solid var(--line)", color: "var(--text)" }}>{g.approver}</td>
                                        <td style={{ padding: "11px 16px", borderBottom: "1px solid var(--line)" }}>
                                            <span style={{ fontFamily: "var(--f-mono)", fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: slaBg, color: slaColor }}>{g.sla}</span>
                                        </td>
                                        <td style={{ padding: "11px 16px", fontSize: 12, borderBottom: "1px solid var(--line)", color: "var(--muted)" }}>{g.audit}</td>
                                        <td style={{ padding: "11px 16px", fontSize: 12, borderBottom: "1px solid var(--line)", color: "var(--muted)" }}>{g.escalation}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Dev Notes */}
                <div ref={el => { sectionRefs.current["devnotes"] = el; }} id="devnotes">
                    <SH label="Developer & Product Notes" tag="Engineering" tagColor="ink" />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
                    {DEV_CARDS.map((d) => (
                        <div key={d.title} style={{ background: "var(--ink3)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: 20 }}>
                            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--teal)", marginBottom: 6 }}>{d.label}</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--white)", marginBottom: 8 }}>{d.title}</div>
                            <p style={{ fontSize: 11.5, color: "rgba(255,255,255,.45)", lineHeight: 1.7 }}>{d.body}</p>
                            <pre style={{ fontFamily: "var(--f-mono)", fontSize: 10.5, background: "rgba(0,0,0,.3)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 6, padding: "8px 10px", color: "var(--teal)", marginTop: 8, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{d.code}</pre>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div style={{ marginTop: 60, paddingTop: 24, borderTop: "1px solid var(--line)", textAlign: "center", fontSize: 11, color: "var(--muted)" }}>
                    SIOP <em>Nexus</em> · Master System Architecture · <strong>Amatista Life SA de CV</strong> · LongevAI Division
                    <br />Confidential Document · Version 2.0 · April 2026 · Built with Claude AI
                </div>
            </div>
        </div>
    );
}
