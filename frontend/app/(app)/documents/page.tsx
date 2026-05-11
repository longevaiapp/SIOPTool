"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useDocuments, useClients, useProjects } from "@/lib/hooks/use-resources";
import { formatDate } from "@/lib/format";
import { useListFilters, filterAndSort } from "@/components/shared/ListFilters";
import { useToast } from "@/components/shared/ToastProvider";
import { generatePdf } from "@/lib/api";
import { API_BASE_URL } from "@/lib/api/client";
import { useT } from "@/lib/i18n";

const KIND_LABELS: Record<string, string> = {
    minute: "Minuta", quote: "Cotización", proposal: "Propuesta",
    sow: "SOW", contract: "Contrato", kickoff: "Kickoff",
    sprint_report: "Sprint Report", sprint_plan: "Sprint Plan",
    sprint_retro: "Retro", status_weekly: "Status Semanal",
    qbr: "QBR", postmortem: "Postmortem", change_order: "Change Order",
    invoice: "Factura", nda: "NDA", msa: "MSA",
    uat_report: "UAT", discovery_report: "Discovery", pmo_review: "PMO Review",
    risk_register: "Risk Register", renewal_proposal: "Renewal",
    compliance_audit: "Compliance Audit", supplier_evaluation: "Supplier Eval",
    case_study: "Case Study", health_card: "Health Card", bug_report: "Bug Report",
    acceptance: "Sign-off", onepager: "One-pager", tech_brief: "Tech Brief",
    wbs_estimate: "WBS", capacity_plan: "Capacity", timesheet: "Timesheet",
    po: "PO", supplier_quote: "Supp. Quote", statement: "Estado de cuenta",
    onboarding_pack: "Onboarding", internal_kickoff: "Internal KO",
    daily_standup: "Standup", baa: "BAA", siop_weekly: "SIOP Weekly",
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
    draft: { bg: "rgba(142, 142, 147, 0.12)", text: "#636366" },
    sent: { bg: "rgba(10, 132, 255, 0.12)", text: "#0a84ff" },
    signed: { bg: "rgba(48, 209, 88, 0.12)", text: "#248a3d" },
    accepted: { bg: "rgba(48, 209, 88, 0.12)", text: "#248a3d" },
    rejected: { bg: "rgba(255, 69, 58, 0.12)", text: "#ff453a" },
    void: { bg: "rgba(142, 142, 147, 0.12)", text: "#636366" },
};

export default function DocumentsPage() {
    const t = useT();
    const { data: docs, mutate } = useDocuments();
    const { data: clients } = useClients();
    const { data: projects } = useProjects();
    const { toast } = useToast();
    const [kindFilter, setKindFilter] = useState<string>("all");
    const [previewId, setPreviewId] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);

    const ROWS = useMemo(() => {
        const clientMap = new Map((clients ?? []).map(c => [c.id, c.name]));
        const projMap = new Map((projects ?? []).map(p => [p.id, p.name]));
        return (docs ?? []).map(d => ({
            id: d.id,
            folio: d.folio,
            kind: d.kind,
            kindLabel: KIND_LABELS[d.kind] ?? d.kind,
            title: d.title,
            client: (d.client_id && clientMap.get(d.client_id)) ?? "—",
            project: (d.project_id && projMap.get(d.project_id)) ?? "—",
            version: d.version,
            status: d.status,
            created: formatDate(d.created_at),
            hasPdf: Boolean(d.storage_path),
            sourceId: d.source_id ?? null,
        }));
    }, [docs, clients, projects]);

    const KPI_CARDS = [
        { label: t("documents.kpi_total"), value: String(ROWS.length), delta: t("documents.kpi_total_hint") },
        { label: t("documents.kpi_drafts"), value: String(ROWS.filter(r => r.status === "draft").length), delta: t("documents.kpi_drafts_hint") },
        { label: t("documents.kpi_sent"), value: String(ROWS.filter(r => r.status === "sent").length), delta: t("documents.kpi_sent_hint") },
        { label: t("documents.kpi_signed"), value: String(ROWS.filter(r => ["signed", "accepted"].includes(r.status)).length), delta: t("documents.kpi_signed_hint") },
    ];

    const kindOptions = Array.from(new Set(ROWS.map(r => r.kind)))
        .map(k => ({ value: k, label: KIND_LABELS[k] ?? k }));

    const filters = useListFilters({
        searchPlaceholder: "Search by folio, title, client...",
        statusOptions: [
            { value: "draft", label: "Draft" },
            { value: "sent", label: "Sent" },
            { value: "signed", label: "Signed" },
            { value: "accepted", label: "Accepted" },
            { value: "rejected", label: "Rejected" },
            { value: "void", label: "Void" },
        ],
        sortOptions: [{ value: "created_desc", label: "Created ↓" }, { value: "folio_asc", label: "Folio ↑" }],
    });
    const filtered = filterAndSort(ROWS, filters, {
        searchFields: ["folio", "title", "client", "project", "kindLabel"],
        statusField: "status",
        sorters: {
            created_desc: (a, b) => (b.created ?? "").localeCompare(a.created ?? ""),
            folio_asc: (a, b) => a.folio.localeCompare(b.folio),
        },
    }).filter(r => kindFilter === "all" || r.kind === kindFilter);

    const previewDoc = previewId ? ROWS.find(r => r.id === previewId) ?? null : null;

    const regenerate = async (kind: string, sourceId: string | null, folio: string) => {
        if (!sourceId) {
            toast({ title: "No source", description: "Este documento no tiene origen para regenerar.", variant: "error" });
            return;
        }
        setBusy(folio);
        try {
            const fresh = await generatePdf(kind, sourceId);
            toast({ title: "PDF regenerado", description: `${fresh.folio} v${fresh.version}`, variant: "success" });
            mutate();
        } catch (e) {
            toast({ title: "Error", description: (e as Error).message, variant: "error" });
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="p-6">
            <header className="mb-6">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#5856d6]">
                    {t("documents.module_tag")}
                </p>
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-[28px] font-bold tracking-tight text-[#1d1d1f]">{t("documents.title")}</h1>
                        <p className="mt-0.5 text-[13px] text-[#8e8e93]">{t("documents.subtitle")}</p>
                    </div>
                </div>
            </header>

            <div className="mb-6 grid grid-cols-4 gap-4">
                {KPI_CARDS.map((kpi) => (
                    <div key={kpi.label} className="glass-stat">
                        <p className="mb-1 text-[11px] font-medium text-[#8e8e93]">{kpi.label}</p>
                        <p className="mb-1 text-[28px] font-bold tracking-tight text-[#1d1d1f]">{kpi.value}</p>
                        <p className="text-[11px] text-[#8e8e93]">{kpi.delta}</p>
                    </div>
                ))}
            </div>

            {filters.toolbar}

            <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[#8e8e93]">{t("docs.kind")}</span>
                <button
                    onClick={() => setKindFilter("all")}
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${kindFilter === "all" ? "bg-[#5856d6] text-white" : "bg-black/5 text-[#1d1d1f] hover:bg-black/10"}`}
                >
                    All ({ROWS.length})
                </button>
                {kindOptions.map(k => {
                    const count = ROWS.filter(r => r.kind === k.value).length;
                    return (
                        <button
                            key={k.value}
                            onClick={() => setKindFilter(k.value)}
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${kindFilter === k.value ? "bg-[#5856d6] text-white" : "bg-black/5 text-[#1d1d1f] hover:bg-black/10"}`}
                        >
                            {k.label} ({count})
                        </button>
                    );
                })}
            </div>

            <div className="glass-card overflow-hidden">
                <div className="flex items-center justify-between border-b border-black/[0.04] px-5 py-4">
                    <h2 className="text-[15px] font-semibold text-[#1d1d1f]">{t("documents.registry")}</h2>
                    <span className="rounded-full bg-[#5856d6]/10 px-2.5 py-1 text-[11px] font-semibold text-[#5856d6]">
                        {filtered.length} documents · {kindOptions.length} kinds
                    </span>
                </div>
                <table className="glass-table">
                    <thead>
                        <tr>
                            <th>{t("docs.col_folio")}</th>
                            <th>{t("docs.col_kind")}</th>
                            <th>{t("docs.col_title")}</th>
                            <th>{t("docs.col_client")}</th>
                            <th>{t("docs.col_project")}</th>
                            <th>{t("docs.col_v")}</th>
                            <th>{t("docs.col_status")}</th>
                            <th>{t("docs.col_created")}</th>
                            <th>{t("docs.col_actions")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((d) => {
                            const status = STATUS_STYLES[d.status] ?? STATUS_STYLES.draft;
                            return (
                                <tr key={d.id} className="hover:bg-black/[0.02]">
                                    <td>
                                        <button onClick={() => setPreviewId(d.id)} className="font-mono text-[12px] font-semibold text-[#5856d6] hover:underline">
                                            {d.folio}
                                        </button>
                                    </td>
                                    <td><span className="rounded-full bg-black/5 px-2 py-1 text-[11px] font-semibold">{d.kindLabel}</span></td>
                                    <td className="font-semibold text-[#1d1d1f]">
                                        <Link href={`/documents/${d.id}`} className="hover:text-[#5856d6]">{d.title}</Link>
                                    </td>
                                    <td className="text-[#8e8e93]">{d.client}</td>
                                    <td className="text-[#8e8e93]">{d.project}</td>
                                    <td className="font-mono text-[12px]">v{d.version}</td>
                                    <td>
                                        <span className="inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold"
                                            style={{ background: status.bg, color: status.text }}>{d.status.toUpperCase()}</span>
                                    </td>
                                    <td className="text-[#8e8e93]">{d.created}</td>
                                    <td>
                                        <div className="flex items-center gap-1">
                                            {d.hasPdf && (
                                                <button
                                                    onClick={() => setPreviewId(d.id)}
                                                    title={t("documents.preview")}
                                                    className="rounded-md border border-black/10 bg-white px-2 py-1 text-[11px] font-semibold hover:bg-black/[0.04]"
                                                >👁️</button>
                                            )}
                                            {d.hasPdf && (
                                                <a
                                                    href={`${API_BASE_URL}/documents/${d.id}/pdf`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    title={t("documents.open_pdf")}
                                                    className="rounded-md border border-black/10 bg-white px-2 py-1 text-[11px] font-semibold hover:bg-black/[0.04]"
                                                >📄</a>
                                            )}
                                            <button
                                                onClick={() => regenerate(d.kind, d.sourceId, d.folio)}
                                                disabled={busy === d.folio || !d.sourceId}
                                                title={d.sourceId ? t("documents.regen_pdf") : t("docs.no_source")}
                                                className="rounded-md border border-black/10 bg-white px-2 py-1 text-[11px] font-semibold hover:bg-black/[0.04] disabled:opacity-40"
                                            >{busy === d.folio ? "..." : "🔄"}</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filtered.length === 0 && (
                            <tr><td colSpan={9} className="py-12 text-center text-[#8e8e93]">{t("documents.empty")}</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {previewDoc && (
                <>
                    <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setPreviewId(null)} />
                    <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[820px] flex-col bg-white shadow-2xl">
                        <header className="flex items-center justify-between border-b border-black/10 px-5 py-3">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5856d6]">{previewDoc.kindLabel} · v{previewDoc.version}</p>
                                <h2 className="text-[16px] font-bold text-[#1d1d1f]">{previewDoc.title}</h2>
                                <p className="text-[12px] text-[#8e8e93]"><span className="font-mono font-semibold">{previewDoc.folio}</span> · {previewDoc.client}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={`${API_BASE_URL}/documents/${previewDoc.id}/pdf`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-lg bg-[#5856d6] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#4845b8]"
                                >{t("documents.open_tab")}</a>
                                <Link href={`/documents/${previewDoc.id}`} className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-[12px] font-semibold hover:bg-black/[0.04]">{t("documents.detail")}</Link>
                                <button onClick={() => setPreviewId(null)} className="rounded-lg px-2 py-1 text-[18px] text-[#8e8e93] hover:bg-black/[0.04]">×</button>
                            </div>
                        </header>
                        <div className="flex-1 bg-[#525659]">
                            {previewDoc.hasPdf ? (
                                <iframe
                                    src={`${API_BASE_URL}/documents/${previewDoc.id}/pdf#toolbar=1&view=FitH`}
                                    title={previewDoc.title}
                                    className="h-full w-full border-0"
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center text-[13px] text-white/70">{t("documents.pdf_missing")}</div>
                            )}
                        </div>
                    </aside>
                </>
            )}
        </div>
    );
}
