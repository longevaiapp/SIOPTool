/**
 * Adapters: map API record shapes (Pydantic) to legacy mock shapes used by sub-route pages.
 * Keeps existing UI code working while data comes from the live backend.
 *
 * Fields not present in the API are filled with safe defaults / empty arrays.
 */
import type {
    ApiClient, ApiDeal, ApiContract, ApiProject, ApiProgram,
    ApiRfq, ApiSupplier, ApiMeeting,
} from "./types/api";

const MODULE_COLOR_PALETTE = ["#2563eb", "#16a34a", "#7c3aed", "#ea580c", "#0d9488", "#e11d48", "#d97706", "#4f46e5", "#0891b2"];
const colorFor = (id: string) => MODULE_COLOR_PALETTE[Math.abs([...id].reduce((a, c) => a + c.charCodeAt(0), 0)) % MODULE_COLOR_PALETTE.length];

const tierFromArr = (arr: number): "platinum" | "gold" | "silver" | "bronze" => {
    if (arr >= 750000) return "platinum";
    if (arr >= 300000) return "gold";
    if (arr >= 100000) return "silver";
    return "bronze";
};
const healthBucket = (s: number): "green" | "yellow" | "red" | "gray" => {
    if (s >= 80) return "green";
    if (s >= 60) return "yellow";
    if (s > 0) return "red";
    return "gray";
};

export interface MockClient {
    id: string; name: string; industry: string; size: string;
    tier: "platinum" | "gold" | "silver" | "bronze";
    location: string; logo_color: string;
    health_score: number; nps: number; arr: number;
    contact_name: string; contact_email: string; phone: string;
}
export const toMockClient = (c: ApiClient): MockClient => {
    const arr = Number((c as unknown as { arr?: number }).arr ?? 0);
    return {
        id: c.id,
        name: c.name,
        industry: (c as unknown as { industry?: string }).industry ?? "",
        size: (c as unknown as { size?: string }).size ?? "",
        tier: tierFromArr(arr),
        location: (c as unknown as { location?: string }).location ?? "",
        logo_color: colorFor(c.id),
        health_score: Number((c as unknown as { health_score?: number }).health_score ?? 0),
        nps: Number((c as unknown as { nps?: number }).nps ?? 0),
        arr,
        contact_name: (c as unknown as { contact_name?: string }).contact_name ?? "",
        contact_email: (c as unknown as { contact_email?: string }).contact_email ?? "",
        phone: (c as unknown as { phone?: string }).phone ?? "",
    };
};

export interface MockDeal {
    id: string; name: string; client_id: string; value: number;
    stage: string; type: string; owner: string;
    expected_close: string; notes: string; next_action: string;
    ai_score: number; days_in_stage: number; created_at: string;
    rfq_id: string | null; project_id: string | null;
}
export const toMockDeal = (d: ApiDeal): MockDeal => ({
    id: d.id,
    name: (d as unknown as { name?: string; title?: string }).name ?? (d as unknown as { title?: string }).title ?? `${d.client_name ?? "Deal"} · ${d.deal_type ?? ""}`.trim(),
    client_id: d.client_id,
    value: Number(d.value ?? 0),
    stage: d.stage ?? "Qualified Lead",
    type: d.deal_type ?? "",
    owner: d.owner ?? "",
    expected_close: d.expected_close ?? "",
    notes: d.notes ?? "",
    next_action: d.next_action ?? "",
    ai_score: Number(d.ai_score ?? 0),
    days_in_stage: Number(d.days_in_stage ?? 0),
    created_at: d.created_at,
    rfq_id: (d as unknown as { rfq_id?: string }).rfq_id ?? null,
    project_id: (d as unknown as { project_id?: string }).project_id ?? null,
});

export interface MockContract {
    id: string; type: string; title: string; client_id: string;
    project_id: string | null; status: string; value: number;
    signed_date: string | null; expiry_date: string | null;
    signers: string[]; notes: string; compliance_controls: string[];
}
export const toMockContract = (c: ApiContract): MockContract => ({
    id: c.id,
    type: c.contract_type ?? "msa",
    title: c.title,
    client_id: c.client_id,
    project_id: c.project_id ?? null,
    status: c.status ?? "draft",
    value: Number(c.value ?? 0),
    signed_date: c.signed_date ?? null,
    expiry_date: c.expiry_date ?? null,
    signers: c.signers ?? [],
    notes: c.notes ?? "",
    compliance_controls: c.compliance_controls ?? [],
});

export interface MockProject {
    id: string; name: string; client_id: string;
    deal_id: string | null; contract_id: string | null;
    status: string; progress: number;
    start_date: string; end_date: string;
    spent: number; budget: number;
    pm_name: string; tech_lead: string;
    current_sprint: number;
    health: "green" | "yellow" | "red" | "gray"; health_score: number;
    margin_actual: number; margin_target: number;
    team: string[]; description: string; objectives: string;
    deliverables: string[]; compliance_frameworks: string[];
    hipaa_required: boolean; baa_signed: boolean;
}
export const toMockProject = (p: ApiProject): MockProject => {
    const budget = Number(p.budget ?? 0);
    const spent = Number(p.spent ?? 0);
    const marginActual = budget > 0 ? Math.max(0, Math.round(((budget - spent) / budget) * 100)) : 0;
    const hs = Number(p.health_score ?? 0);
    return {
        id: p.id,
        name: p.name,
        client_id: p.client_id ?? "",
        deal_id: p.deal_id ?? null,
        contract_id: p.contract_id ?? null,
        status: p.status ?? "planning",
        progress: Number(p.progress ?? 0),
        start_date: p.start_date ?? "",
        end_date: p.end_date ?? "",
        spent,
        budget,
        pm_name: p.pm_name ?? "",
        tech_lead: p.tech_lead ?? "",
        current_sprint: 0,
        health: healthBucket(hs),
        health_score: hs,
        margin_actual: marginActual,
        margin_target: 35,
        team: [],
        description: (p as unknown as { description?: string }).description ?? "",
        objectives: (p as unknown as { objectives?: string }).objectives ?? "",
        deliverables: [],
        compliance_frameworks: [],
        hipaa_required: Boolean(p.phi_involved),
        baa_signed: Boolean(p.baa_confirmed),
    };
};

export interface MockProgram {
    id: string; name: string; description: string;
    progress: number; lead: string;
    strategic_priority: "P0" | "P1" | "P2";
    portfolio_value: number; project_ids: string[];
    status: "on_track" | "at_risk" | "delayed";
    risk: "low" | "medium" | "high";
}
export const toMockProgram = (p: ApiProgram): MockProgram => {
    const sp = ((p as unknown as { strategic_priority?: string }).strategic_priority ?? "P2") as "P0" | "P1" | "P2";
    const status = (((p as unknown as { status?: string }).status ?? "on_track").toLowerCase() as MockProgram["status"]);
    return {
        id: p.id,
        name: p.name,
        description: (p as unknown as { description?: string }).description ?? "",
        progress: Number((p as unknown as { progress?: number }).progress ?? 0),
        lead: (p as unknown as { owner?: string; lead?: string }).owner ?? (p as unknown as { lead?: string }).lead ?? "",
        strategic_priority: sp,
        portfolio_value: Number((p as unknown as { portfolio_value?: number }).portfolio_value ?? 0),
        project_ids: ((p as unknown as { project_ids?: string[] }).project_ids ?? []),
        status: ["on_track", "at_risk", "delayed"].includes(status) ? status : "on_track",
        risk: "medium",
    };
};

export interface MockRFQ {
    id: string; name: string; client_id: string;
    project_type: string; status: string; score: number;
    budget_range: string; timeline_weeks: number;
    submitted_at: string; compliance: string[];
    answers: Record<string, string>;
    deal_id: string | null;
}
export const toMockRFQ = (r: ApiRfq): MockRFQ => {
    const responses = (r.responses ?? {}) as Record<string, unknown>;
    const answers: Record<string, string> = {};
    for (const k of Object.keys(responses)) {
        const v = responses[k];
        answers[k] = typeof v === "string" ? v : JSON.stringify(v);
    }
    return {
        id: r.id,
        name: typeof responses.name === "string" ? responses.name : `RFQ ${r.id.slice(0, 6)}`,
        client_id: r.client_id ?? "",
        project_type: typeof responses.project_type === "string" ? responses.project_type : "",
        status: r.status ?? "draft",
        score: Number(r.completion_pct ?? 0),
        budget_range: typeof responses.budget_range === "string" ? responses.budget_range : "",
        timeline_weeks: Number(typeof responses.timeline_weeks === "number" ? responses.timeline_weeks : 0),
        submitted_at: r.created_at,
        compliance: Array.isArray(responses.compliance) ? (responses.compliance as string[]) : [],
        answers,
        deal_id: r.deal_id ?? null,
    };
};

export interface MockSupplier {
    id: string; name: string; category: string;
    contact: { name: string; email: string };
    status: string; risk_level: string;
    rating: number; spend_ytd: number; contract_end: string;
    used_in_projects: string[]; services: string[];
}
export const toMockSupplier = (s: ApiSupplier): MockSupplier => ({
    id: s.id,
    name: s.name,
    category: s.category ?? "",
    contact: { name: s.contact_name ?? "", email: s.contact_email ?? "" },
    status: s.status ?? "active",
    risk_level: (s.risk_level ?? "medium").toLowerCase(),
    rating: Number(s.performance_score ?? 0) / 20, // 0-100 → 0-5
    spend_ytd: Number(s.spend_ytd ?? 0),
    contract_end: "",
    used_in_projects: [],
    services: s.compliance_certs ?? [],
});

export interface MockMeeting {
    id: string; title: string; type: string; status: string;
    date: string; duration_min: number;
    client_id: string | null; deal_id: string | null; project_id: string | null;
    participants: string[]; summary: string;
}
export const toMockMeeting = (m: ApiMeeting): MockMeeting => ({
    id: m.id,
    title: m.title,
    type: m.meeting_type ?? "internal",
    status: m.status ?? "scheduled",
    date: m.scheduled_at ?? m.created_at,
    duration_min: Number(m.duration_minutes ?? 0),
    client_id: m.client_id ?? null,
    deal_id: m.deal_id ?? null,
    project_id: m.project_id ?? null,
    participants: (m.participants ?? []).map(p => typeof p === "string" ? p : (p?.name ?? "Unknown")),
    summary: (m as unknown as { summary?: string }).summary ?? m.notes ?? "",
});
