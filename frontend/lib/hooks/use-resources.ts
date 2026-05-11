/**
 * SWR hooks per resource. Use the returned `mutate` to refresh after writes.
 *
 * Pattern:
 *   const { data, isLoading, error, mutate } = useClients();
 *   await clientsApi.create({ name: "..." }); mutate();
 */
import useSWR, { type SWRResponse } from "swr";
import { fetcher } from "../api/client";
import type {
    ApiClient, ApiDeal, ApiContract, ApiProject, ApiSprint, ApiTask,
    ApiMeeting, ApiActionItem, ApiRfq, ApiSupplier, ApiInvoice,
    ApiApproval, ApiMessage, ApiSupportTicket, ApiProgram,
    ApiInsight, ApiScenario, ApiRoleCapacity, ApiDemandForecast,
    ApiRisk, ApiComplianceControl,
    ApiDocument, ApiQuote, ApiProposal, ApiChangeOrder,
    ApiTimeEntry,
} from "../types/api";

function useList<T>(path: string): SWRResponse<T[]> {
    return useSWR<T[]>(path, fetcher);
}
function useOne<T>(path: string, id: string | null | undefined): SWRResponse<T> {
    return useSWR<T>(id ? `${path}/${id}` : null, fetcher);
}

export const useClients     = () => useList<ApiClient>("/clients");
export const useClient      = (id?: string | null) => useOne<ApiClient>("/clients", id);
export const useDeals       = () => useList<ApiDeal>("/deals");
export const useDeal        = (id?: string | null) => useOne<ApiDeal>("/deals", id);
export const useContracts   = () => useList<ApiContract>("/contracts");
export const useContract    = (id?: string | null) => useOne<ApiContract>("/contracts", id);
export const useProjects    = () => useList<ApiProject>("/projects");
export const useProject     = (id?: string | null) => useOne<ApiProject>("/projects", id);
export const useSprints     = () => useList<ApiSprint>("/sprints");
export const useTasks       = () => useList<ApiTask>("/tasks");
export const useMeetings    = () => useList<ApiMeeting>("/meetings");
export const useMeeting     = (id?: string | null) => useOne<ApiMeeting>("/meetings", id);
export const useActionItems = () => useList<ApiActionItem>("/action-items");
export const useRfqs        = () => useList<ApiRfq>("/rfq-sessions");
export const useRfq         = (id?: string | null) => useOne<ApiRfq>("/rfq-sessions", id);
export const useSuppliers   = () => useList<ApiSupplier>("/suppliers");
export const useSupplier    = (id?: string | null) => useOne<ApiSupplier>("/suppliers", id);
export const useInvoices    = () => useList<ApiInvoice>("/invoices");
export const useInvoice     = (id?: string | null) => useOne<ApiInvoice>("/invoices", id);
export const useApprovals   = () => useList<ApiApproval>("/approvals");
export const useMessages    = () => useList<ApiMessage>("/messages");
export const useTickets     = () => useList<ApiSupportTicket>("/support-tickets");
export const usePrograms    = () => useList<ApiProgram>("/programs");
export const useProgram     = (id?: string | null) => useOne<ApiProgram>("/programs", id);
export const useProgramProjects = (programId?: string | null) =>
    useSWR<{ program_id: string; project_id: string }[]>(programId ? `/programs/${programId}/projects` : null, fetcher);
export const useInsights    = () => useList<ApiInsight>("/insights");
export const useScenarios   = () => useList<ApiScenario>("/siop-scenarios");
export const useRoleCapacity = () => useList<ApiRoleCapacity>("/role-capacity");
export const useDemandForecast = () => useList<ApiDemandForecast>("/demand-forecast");
export const useTimeEntries = () => useList<ApiTimeEntry>("/timesheets");
export const useRisks       = () => useList<ApiRisk>("/risks");
export const useCompliance  = () => useList<ApiComplianceControl>("/compliance-controls");
export const useDocuments  = () => useList<ApiDocument>("/documents");
export const useDocument   = (id?: string | null) => useOne<ApiDocument>("/documents", id);
export const useQuotes     = () => useList<ApiQuote>("/quotes");
export const useQuote      = (id?: string | null) => useOne<ApiQuote>("/quotes", id);
export const useProposals  = () => useList<ApiProposal>("/proposals");
export const useProposal   = (id?: string | null) => useOne<ApiProposal>("/proposals", id);
export const useChangeOrders = () => useList<ApiChangeOrder>("/change-orders");
export const useChangeOrder  = (id?: string | null) => useOne<ApiChangeOrder>("/change-orders", id);

// ── Meeting transcription + analyzer hooks ────────────────────────────────

export interface ApiMeetingTranscription {
    meeting_id: string;
    transcription_status: "idle" | "queued" | "processing" | "completed" | "error";
    transcription_id: string | null;
    transcription_error: string | null;
    transcript: string | null;
    utterances: Array<{ speaker: string; text: string; start: number; end: number; confidence?: number }> | null;
    language_detected: string | null;
    audio_duration_seconds: number | null;
    audio_url: string | null;
}

export interface ApiMeetingAnalysis {
    id: string;
    created_at: string;
    updated_at: string;
    meeting_id: string;
    analyzer_type: string;
    status: "pending" | "running" | "completed" | "error";
    output: {
        summary?: string;
        key_decisions?: string[];
        action_items?: Array<{ text: string; assignee?: string | null; priority?: string; points?: number; due_date?: string | null }>;
        risks?: Array<{ title: string; severity: string; detail: string }>;
        next_steps?: string[];
    } | null;
    error_message: string | null;
    model: string | null;
    approved_at: string | null;
    approved_by: string | null;
}

export const useMeetingTranscription = (id?: string | null, refreshInterval = 0) =>
    useSWR<ApiMeetingTranscription>(
        id ? `/meetings/${id}/transcription` : null,
        fetcher,
        { refreshInterval },
    );

export const useMeetingAnalyses = (id?: string | null) =>
    useSWR<ApiMeetingAnalysis[]>(id ? `/meetings/${id}/analyses` : null, fetcher);
