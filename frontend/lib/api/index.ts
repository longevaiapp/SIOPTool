/**
 * Generic resource builder: list/get/create/update/delete + the SWR
 * key for that resource. One entry per backend module.
 */
import { api } from "./client";

export interface Resource<T> {
    path: string;
    list: () => Promise<T[]>;
    get: (id: string) => Promise<T>;
    create: (body: Partial<T>) => Promise<T>;
    update: (id: string, body: Partial<T>) => Promise<T>;
    remove: (id: string) => Promise<void>;
}

export function makeResource<T>(path: string): Resource<T> {
    return {
        path,
        list: () => api.get<T[]>(path),
        get: (id) => api.get<T>(`${path}/${id}`),
        create: (body) => api.post<T>(path, body),
        update: (id, body) => api.patch<T>(`${path}/${id}`, body),
        remove: (id) => api.delete<void>(`${path}/${id}`),
    };
}

import type {
    ApiClient, ApiDeal, ApiContract, ApiProject, ApiSprint, ApiTask,
    ApiMeeting, ApiActionItem, ApiRfq, ApiSupplier, ApiInvoice,
    ApiApproval, ApiMessage, ApiSupportTicket, ApiProgram, ApiProgramProject,
    ApiInsight, ApiScenario, ApiRoleCapacity, ApiDemandForecast,
    ApiRisk, ApiComplianceControl,
    ApiDocument, ApiQuote, ApiProposal, ApiChangeOrder,
    ApiTimeEntry,
} from "../types/api";

export const clientsApi = makeResource<ApiClient>("/clients");
export const dealsApi = makeResource<ApiDeal>("/deals");
export const contractsApi = makeResource<ApiContract>("/contracts");
export const projectsApi = makeResource<ApiProject>("/projects");
export const sprintsApi = makeResource<ApiSprint>("/sprints");
export const tasksApi = makeResource<ApiTask>("/tasks");
export const meetingsApi = makeResource<ApiMeeting>("/meetings");
export const actionItemsApi = makeResource<ApiActionItem>("/action-items");
export const rfqApi = makeResource<ApiRfq>("/rfq-sessions");
export const suppliersApi = makeResource<ApiSupplier>("/suppliers");
export const invoicesApi = makeResource<ApiInvoice>("/invoices");
export const approvalsApi = makeResource<ApiApproval>("/approvals");

export const approvalsDecide = {
    approve: (id: string, body: { note?: string; approver_id?: string } = {}) =>
        api.post<ApiApproval>(`/approvals/${id}/approve`, body),
    reject: (id: string, body: { note?: string; approver_id?: string } = {}) =>
        api.post<ApiApproval>(`/approvals/${id}/reject`, body),
};

export const insightsDecide = {
    apply: (id: string, body: { note?: string; project_id?: string; client_id?: string } = {}) =>
        api.post<{ insight: ApiInsight; approval_id: string }>(`/insights/${id}/apply`, body),
    dismiss: (id: string, body: { reason?: string } = {}) =>
        api.post<ApiInsight>(`/insights/${id}/dismiss`, body),
};
export const messagesApi = makeResource<ApiMessage>("/messages");
export const ticketsApi = makeResource<ApiSupportTicket>("/support-tickets");
export const programsApi = makeResource<ApiProgram>("/programs");
export const insightsApi = makeResource<ApiInsight>("/insights");
export const scenariosApi = makeResource<ApiScenario>("/siop-scenarios");
export const roleCapacityApi = makeResource<ApiRoleCapacity>("/role-capacity");
export const demandForecastApi = makeResource<ApiDemandForecast>("/demand-forecast");
export const timeEntriesApi = makeResource<ApiTimeEntry>("/timesheets");

export const timesheetOps = {
    rollup: (week_start?: string) =>
        api.post<{
            week_start: string;
            rows: { role: string; week_start: string; hours: number; fte: number; role_capacity_id: string; updated: boolean }[];
        }>("/timesheets/rollup", week_start ? { week_start } : {}),
    summary: (week_start?: string) =>
        api.get<{
            week_start: string;
            total_hours: number;
            total_fte: number;
            by_role: { role: string; hours: number; fte: number; entries: number }[];
        }>(`/timesheets/summary${week_start ? `?week_start=${week_start}` : ""}`),
};
export const risksApi = makeResource<ApiRisk>("/risks");
export const complianceApi = makeResource<ApiComplianceControl>("/compliance-controls");
export const documentsApi = makeResource<ApiDocument>("/documents");
export const quotesApi = makeResource<ApiQuote>("/quotes");
export const proposalsApi = makeResource<ApiProposal>("/proposals");
export const changeOrdersApi = makeResource<ApiChangeOrder>("/change-orders");

// Contrato (SOW DRAFT) generado a partir de una cotización
export type ContractFromQuoteResponse = {
    id: string;
    title: string;
    contract_type: string;
    status: string;
    value: number;
    deal_id: string | null;
    client_id: string;
    quote_id: string;
    quote_folio: string;
};
export async function createContractFromQuote(
    quoteId: string,
    body?: { contract_type?: string; title?: string; notes?: string; hipaa_required?: boolean },
): Promise<ContractFromQuoteResponse> {
    return api.post<ContractFromQuoteResponse>(`/contracts/from-quote/${quoteId}`, body ?? {});
}

// PDF generation: returns the new ApiDocument row
export async function generatePdf(
    kind: string,
    source_id: string,
    overrides?: Record<string, unknown>,
): Promise<ApiDocument> {
    return api.post<ApiDocument>("/documents/generate", { kind, source_id, overrides });
}

// Contract wizard: developer profile + client snapshot + missing-field hints
export type ContractWizardData = {
    developer: {
        legal_name: string;
        commercial_name: string;
        person_type: string;
        rfc: string;
        tax_regime: string;
        id_doc: string;
        address: {
            street: string; ext_number: string; int_number: string;
            neighborhood: string; zip: string; city: string; state: string; country: string;
        };
        contact: { email: string; phone: string; website: string };
        bank: {
            bank_name: string; holder: string; account: string;
            clabe: string; swift: string; currency: string;
        };
        jurisdiction_city: string;
        jurisdiction_state: string;
        payment_schedule: string;
        late_interest_pct_mo: number;
        warranty_days: number;
        confidentiality_yrs: number;
        liability_cap_months: number;
        legal_notices_email: string;
    };
    client: Record<string, unknown>;
    missing_client_fields: { key: string; label: string; required: boolean; default?: string }[];
    contract: Record<string, unknown>;
};
export async function getContractWizardData(contractId: string): Promise<ContractWizardData> {
    return api.get<ContractWizardData>(`/documents/contracts/${contractId}/wizard-data`);
}

// Aggregate of related artifact ids for a deal (used by the pipeline timeline).
export type DealRelated = {
    deal_id: string;
    quote_id: string | null;
    quote_folio: string | null;
    proposal_id: string | null;
    contract_id: string | null;
    project_id: string | null;
    rfq_id: string | null;
};
export async function getDealRelated(dealId: string): Promise<DealRelated> {
    return api.get<DealRelated>(`/deals/${dealId}/related`);
}

// Programs has an extra link endpoint
export const programProjectsApi = {
    list: (programId: string) =>
        api.get<ApiProgramProject[]>(`/programs/${programId}/projects`),
    link: (programId: string, projectId: string) =>
        api.post<ApiProgramProject>(`/programs/${programId}/projects`, {
            program_id: programId, project_id: projectId,
        }),
};

// Meetings: AssemblyAI + analyzer endpoints
export const meetingTranscriptionApi = {
    get: (meetingId: string) => api.get(`/meetings/${meetingId}/transcription`),
    listAnalyses: (meetingId: string) => api.get(`/meetings/${meetingId}/analyses`),
    analyze: (meetingId: string, analyzer_type?: string) =>
        api.post(`/meetings/${meetingId}/analyze`, analyzer_type ? { analyzer_type } : {}),
    approve: (meetingId: string, analysisId: string, indices: number[]) =>
        api.post(`/meetings/${meetingId}/analyses/${analysisId}/approve`, { indices }),
    apply: (meetingId: string, analysisId: string, selections: Record<string, unknown>) =>
        api.post(`/meetings/${meetingId}/analyses/${analysisId}/approve`, { selections }),
};
