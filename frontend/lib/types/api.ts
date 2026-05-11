/**
 * Shared types matching backend Pydantic models.
 * All entities have BaseRecord fields injected by the CrudResource layer.
 */

export interface BaseRecord {
    id: string;
    created_at: string;
    updated_at: string;
    workspace_id: string;
    is_deleted: boolean;
    deleted_at?: string | null;
}

// ─── CRM ──
export interface ApiClient extends BaseRecord {
    name: string;
    industry?: string | null;
    segment?: string | null;
    status: string;
    health_score?: number | null;
    nps?: number | null;
    arr?: number | null;
    contact_name?: string | null;
    contact_email?: string | null;
    phone?: string | null;
    location?: string | null;
    notes?: string | null;
}

export interface ApiDeal extends BaseRecord {
    client_id: string;
    client_name?: string | null;
    deal_type?: string | null;
    stage: string;
    value?: number | null;
    probability?: number | null;
    ai_score?: number | null;
    days_in_stage?: number | null;
    expected_close?: string | null;
    owner?: string | null;
    commercial_model?: string | null;
    notes?: string | null;
    next_action?: string | null;
}

// ─── Contracts ──
export interface ApiContract extends BaseRecord {
    contract_type: string;
    title: string;
    client_id: string;
    project_id?: string | null;
    deal_id?: string | null;
    status: string;
    value?: number | null;
    signed_date?: string | null;
    expiry_date?: string | null;
    signers?: string[] | null;
    compliance_controls?: string[] | null;
    document_url?: string | null;
    hipaa_required?: boolean | null;
    baa_signed?: boolean | null;
    notes?: string | null;
}

// ─── PM ──
export interface ApiProject extends BaseRecord {
    name: string;
    client_name?: string | null;
    client_id?: string | null;
    deal_id?: string | null;
    contract_id?: string | null;
    status: string;
    phi_involved?: boolean | null;
    baa_confirmed?: boolean | null;
    methodology?: string | null;
    budget?: number | null;
    spent?: number | null;
    progress?: number | null;
    health?: string | null;
    health_score?: number | null;
    pm_name?: string | null;
    tech_lead?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    phase?: string | null;
}

export interface ApiSprint extends BaseRecord {
    project_id: string;
    name: string;
    status: string;
    start_date?: string | null;
    end_date?: string | null;
    story_points_planned?: number | null;
    story_points_completed?: number | null;
    velocity?: number | null;
}

export interface ApiTask extends BaseRecord {
    project_id: string;
    sprint_id?: string | null;
    title: string;
    description?: string | null;
    task_type?: string | null;
    status: string;
    priority?: string | null;
    assignee?: string | null;
    points?: number | null;
    is_clinical_safety?: boolean | null;
}

// ─── Meetings ──
export interface ApiMeeting extends BaseRecord {
    title: string;
    meeting_type?: string | null;
    status: string;
    scheduled_at?: string | null;
    duration_minutes?: number | null;
    client_id?: string | null;
    deal_id?: string | null;
    project_id?: string | null;
    participants?: Array<string | { name?: string; role?: string; email?: string | null; speaker_label?: string | null; title?: string | null }> | null;
    transcript?: string | null;
    audio_url?: string | null;
    notes?: string | null;
    ai_outputs?: Record<string, unknown> | null;
}

export interface ApiActionItem extends BaseRecord {
    meeting_id: string;
    text: string;
    priority?: string | null;
    accepted?: boolean | null;
    assignee?: string | null;
    due_date?: string | null;
    status?: string | null;
}

// ─── RFQ ──
export interface ApiRfq extends BaseRecord {
    deal_id?: string | null;
    client_id?: string | null;
    responses?: Record<string, unknown> | null;
    completion_pct?: number | null;
    status: string;
}

// ─── Suppliers / Invoices ──
export interface ApiSupplier extends BaseRecord {
    name: string;
    category?: string | null;
    status: string;
    contact_name?: string | null;
    contact_email?: string | null;
    spend_ytd?: number | null;
    contract_value?: number | null;
    performance_score?: number | null;
    risk_level?: string | null;
    compliance_certs?: string[] | null;
    notes?: string | null;
}

export interface ApiInvoice extends BaseRecord {
    folio?: string | null;
    number: string;
    client_id: string;
    project_id?: string | null;
    contract_id?: string | null;
    amount: number;
    currency: string;
    status: string;
    issue_date?: string | null;
    due_date?: string | null;
    paid_date?: string | null;
    notes?: string | null;
}

// ─── Portal ──
export interface ApiApproval extends BaseRecord {
    title: string;
    approval_type?: string | null;
    description?: string | null;
    client_id?: string | null;
    project_id?: string | null;
    status: string;
    requested_by?: string | null;
    due_date?: string | null;
    decided_by?: string | null;
    decided_at?: string | null;
    decision_note?: string | null;
    approver_id?: string | null;
}

export interface ApiMessage extends BaseRecord {
    client_id?: string | null;
    project_id?: string | null;
    sender_name: string;
    sender_role: string;
    body: string;
    read?: boolean | null;
}

export interface ApiSupportTicket extends BaseRecord {
    title: string;
    description?: string | null;
    priority?: string | null;
    status: string;
    client_id?: string | null;
    project_id?: string | null;
}

// ─── PMO ──
export interface ApiProgram extends BaseRecord {
    name: string;
    description?: string | null;
    strategic_priority?: string | null;
    status: string;
    progress?: number | null;
    portfolio_value?: number | null;
    owner?: string | null;
}

export interface ApiProgramProject extends BaseRecord {
    program_id: string;
    project_id: string;
}

// ─── AI / SIOP ──
export interface ApiInsight extends BaseRecord {
    module: string;
    insight_type?: string | null;
    title: string;
    description?: string | null;
    severity?: string | null;
    related_entity_type?: string | null;
    related_entity_id?: string | null;
    payload?: Record<string, unknown> | null;
    acknowledged?: boolean | null;
    acknowledged_at?: string | null;
}

export interface ApiScenario extends BaseRecord {
    name: string;
    description?: string | null;
    horizon_weeks?: number | null;
    assumptions?: Record<string, unknown> | null;
    results?: Record<string, unknown> | null;
    is_baseline?: boolean | null;
    created_by?: string | null;
}

export interface ApiRoleCapacity extends BaseRecord {
    role: string;
    available_fte?: number | null;
    committed_fte?: number | null;
    forecast_demand?: number | null;
    cost_per_fte?: number | null;
    bench?: number | null;
    week_start?: string | null;
}

export interface ApiDemandForecast extends BaseRecord {
    week_start: string;
    label?: string | null;
    booked_revenue?: number | null;
    forecast_revenue?: number | null;
    pipeline_revenue?: number | null;
    fte_demand?: number | null;
    fte_capacity?: number | null;
}

export interface ApiTimeEntry extends BaseRecord {
    user_id?: string | null;
    user_name?: string | null;
    role: string;
    project_id?: string | null;
    week_start: string;
    hours?: number | null;
    notes?: string | null;
}

// ─── Risk / Compliance ──
export interface ApiRisk extends BaseRecord {
    project_id?: string | null;
    title: string;
    description?: string | null;
    severity?: string | null;
    likelihood?: string | null;
    status: string;
    mitigation?: string | null;
    owner?: string | null;
}

export interface ApiComplianceControl extends BaseRecord {
    project_id?: string | null;
    contract_id?: string | null;
    framework: string;
    control_id: string;
    status: string;
    notes?: string | null;
    last_reviewed?: string | null;
}

// ─── Documents (universal PDF repository) ──
export interface ApiDocument extends BaseRecord {
    folio: string;
    kind: string;
    title: string;
    source_table?: string | null;
    source_id?: string | null;
    client_id?: string | null;
    project_id?: string | null;
    deal_id?: string | null;
    version: number;
    status: string;
    storage_path?: string | null;
    pdf_size_bytes?: number | null;
    metadata_json?: Record<string, unknown> | null;
    generated_by?: string | null;
    sent_at?: string | null;
    signed_at?: string | null;
    accepted_at?: string | null;
    rejected_at?: string | null;
    voided_at?: string | null;
}

// ─── Quotes ──
export interface ApiQuote extends BaseRecord {
    folio: string;
    deal_id?: string | null;
    client_id?: string | null;
    rfq_session_id?: string | null;
    status: string;
    currency: string;
    subtotal: number | string;
    tax_rate: number | string;
    tax: number | string;
    total: number | string;
    valid_until?: string | null;
    terms?: string | null;
    notes?: string | null;
    sent_at?: string | null;
    accepted_at?: string | null;
    rejected_at?: string | null;
}

// ─── Proposals ──
export interface ApiProposal extends BaseRecord {
    folio: string;
    title: string;
    deal_id?: string | null;
    client_id?: string | null;
    rfq_session_id?: string | null;
    quote_id?: string | null;
    version: number;
    status: string;
    commercial_model: string;
    executive_summary?: string | null;
    scope_md?: string | null;
    approach_md?: string | null;
    timeline_md?: string | null;
    team_md?: string | null;
    assumptions_md?: string | null;
    terms_md?: string | null;
    valid_until?: string | null;
    sent_at?: string | null;
    accepted_at?: string | null;
    rejected_at?: string | null;
}

// ─── Change Orders ──
export interface ApiChangeOrder extends BaseRecord {
    folio: string;
    title: string;
    project_id?: string | null;
    contract_id?: string | null;
    client_id?: string | null;
    meeting_id?: string | null;
    reason?: string | null;
    description?: string | null;
    status: string;
    scope_impact?: string | null;
    timeline_impact_days?: number | null;
    budget_impact?: number | string | null;
    currency?: string | null;
    requested_by?: string | null;
    approved_by?: string | null;
    approved_at?: string | null;
    rejected_at?: string | null;
    applied_at?: string | null;
}
