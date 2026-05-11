"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { mutate as globalMutate } from "swr";
import { useInsights, useDeals, useProjects, useClients } from "@/lib/hooks/use-resources";
import { insightsDecide } from "@/lib/api";
import { useToast } from "@/components/shared/ToastProvider";
import { useT } from "@/lib/i18n";

/* ✨ AI INSIGHTS — live data */

type ActionStatus = "pending" | "applied" | "dismissed" | "snoozed";
type Severity = "critical" | "warning" | "info" | "success";

interface Insight {
    id: string;
    severity: Severity;
    module: string;
    module_color: string;
    title: string;
    detail: string;
    suggested_action: string;
    related_entity?: { type: "deal" | "project" | "client"; id: string };
    created_at: string;
    status: ActionStatus;
    approval_id?: string;
    dismiss_reason?: string;
}

const MODULE_COLORS: Record<string, string> = {
    crm: "#0a84ff", CRM: "#0a84ff",
    rfq: "#16a34a", RFQ: "#16a34a",
    contracts: "#7c3aed", Contracts: "#7c3aed", Compliance: "#7c3aed",
    pm: "#ea580c", PM: "#ea580c", Projects: "#ea580c",
    pmo: "#0d9488", PMO: "#0d9488",
    health: "#e11d48", "Customer Health": "#e11d48",
    portal: "#d97706",
    suppliers: "#4f46e5", Suppliers: "#4f46e5",
    siop: "#0891b2", SIOP: "#0891b2",
    analytics: "#475569",
};

const normSeverity = (s: string | null | undefined): Severity => {
    const v = (s ?? "info").toLowerCase();
    if (v === "critical" || v === "warning" || v === "info" || v === "success") return v;
    if (v === "high") return "critical";
    if (v === "medium" || v === "med") return "warning";
    if (v === "low") return "info";
    return "info";
};

export default function AIInsightsPage() {
    const t = useT();
    const [filter, setFilter] = useState<"all" | Severity>("all");
    const [selected, setSelected] = useState<Insight | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    const { data: rawInsights, mutate } = useInsights();
    const { data: dealsData } = useDeals();
    const { data: projectsData } = useProjects();
    const { data: clientsData } = useClients();
    const router = useRouter();
    const { toast } = useToast();

    const INSIGHTS: Insight[] = useMemo(() => (rawInsights ?? []).map(i => {
        const moduleKey = i.module ?? "";
        const payload = (i.payload ?? {}) as Record<string, unknown>;
        const detail = i.description ?? (typeof payload.detail === "string" ? payload.detail : "");
        const suggested = typeof payload.suggested_action === "string" ? payload.suggested_action : (typeof payload.recommendation === "string" ? payload.recommendation : "Review and decide");
        const relType = (i.related_entity_type ?? "").toLowerCase();
        const relId = i.related_entity_id ?? "";
        const related = relId && (relType === "deal" || relType === "project" || relType === "client")
            ? { type: relType as "deal" | "project" | "client", id: relId }
            : undefined;
        let status: ActionStatus = "pending";
        if (i.acknowledged) {
            if (typeof payload.applied_at === "string") status = "applied";
            else if (typeof payload.dismissed_at === "string") status = "dismissed";
            else status = "dismissed";
        }
        return {
            id: i.id,
            severity: normSeverity(i.severity),
            module: moduleKey,
            module_color: MODULE_COLORS[moduleKey] ?? "#5856d6",
            title: i.title,
            detail,
            suggested_action: suggested,
            related_entity: related,
            created_at: i.created_at,
            status,
            approval_id: typeof payload.approval_id === "string" ? payload.approval_id : undefined,
            dismiss_reason: typeof payload.dismiss_reason === "string" ? payload.dismiss_reason : undefined,
        };
    }), [rawInsights]);

    const dealMap = useMemo(() => new Map((dealsData ?? []).map(d => [d.id, d])), [dealsData]);
    const projectMap = useMemo(() => new Map((projectsData ?? []).map(p => [p.id, p])), [projectsData]);
    const clientMap = useMemo(() => new Map((clientsData ?? []).map(c => [c.id, c])), [clientsData]);

    const visible = filter === "all" ? INSIGHTS : INSIGHTS.filter(i => i.severity === filter);

    async function applyInsight(insight: Insight) {
        setBusyId(insight.id);
        try {
            const res = await insightsDecide.apply(insight.id);
            await mutate();
            globalMutate("/approvals");
            globalMutate("/audit-log/summary");
            setSelected(null);
            toast({
                title: "Approval created",
                description: "AI recommendation routed for human decision.",
                variant: "success",
            });
            router.push("/approvals");
            return res;
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Apply failed";
            toast({ title: "Apply failed", description: msg, variant: "error" });
        } finally {
            setBusyId(null);
        }
    }

    async function dismissInsight(insight: Insight, reason?: string) {
        setBusyId(insight.id);
        try {
            await insightsDecide.dismiss(insight.id, reason ? { reason } : {});
            await mutate();
            globalMutate("/audit-log/summary");
            setSelected(null);
            toast({ title: "Insight dismissed", variant: "success" });
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Dismiss failed";
            toast({ title: "Dismiss failed", description: msg, variant: "error" });
        } finally {
            setBusyId(null);
        }
    }

    const counts = {
        critical: INSIGHTS.filter(i => i.severity === "critical").length,
        warning: INSIGHTS.filter(i => i.severity === "warning").length,
        info: INSIGHTS.filter(i => i.severity === "info").length,
        success: INSIGHTS.filter(i => i.severity === "success").length,
    };
    const applied = INSIGHTS.filter(i => i.status === "applied").length;

    return (
        <div className="p-6">
            <header className="mb-6 flex items-end justify-between">
                <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#5856d6]">{t("insights.title")}</p>
                    <h1 className="text-[28px] font-bold text-[#1d1d1f]">{t("overview.ai_insights")}</h1>
                    <p className="mt-0.5 text-[13px] text-[#8e8e93]">{t("insights.subtitle")}</p>
                </div>
            </header>

            {/* KPIs */}
            <div className="mb-6 grid grid-cols-4 gap-4">
                <KPI label={t("insights.kpi_active")} value={`${INSIGHTS.length}`} sub="across all modules" color="#5856d6" />
                <KPI label={t("insights.kpi_applied")} value={`${applied}`} sub={INSIGHTS.length ? `${((applied / INSIGHTS.length) * 100).toFixed(0)}% take-up rate` : "—"} color="#30d158" />
                <KPI label={t("insights.kpi_critical")} value={`${counts.critical}`} sub={t("insights.kpi_critical_hint")} color={counts.critical > 0 ? "#ff453a" : "#30d158"} />
                <KPI label={t("insights.kpi_confidence")} value="86%" sub={t("insights.kpi_confidence_hint")} color="#0a84ff" />
            </div>

            {/* Filter */}
            <div className="mb-4 flex gap-2">
                {(["all", "critical", "warning", "info", "success"] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`rounded-full px-4 py-1.5 text-[12px] font-medium capitalize ${
                            filter === f ? "bg-[#1d1d1f] text-white" : "bg-black/[0.04] text-[#636366] hover:bg-black/[0.06]"
                        }`}
                    >
                        {f} ({f === "all" ? INSIGHTS.length : counts[f]})
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="space-y-3">
                {visible.map(i => {
                    const status = i.status;
                    return (
                        <button
                            key={i.id}
                            onClick={() => setSelected(i)}
                            className={`block w-full rounded-2xl border p-5 text-left backdrop-blur transition-all hover:shadow-lg ${
                                status !== "pending" ? "border-black/[0.04] bg-black/[0.01] opacity-60" :
                                i.severity === "critical" ? "border-[#ff453a]/30 bg-[#ff453a]/5" :
                                i.severity === "warning" ? "border-[#ff9f0a]/30 bg-[#ff9f0a]/5" :
                                i.severity === "success" ? "border-[#30d158]/30 bg-[#30d158]/5" :
                                "border-black/[0.06] bg-white/60"
                            }`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="mb-2 flex flex-wrap items-center gap-2">
                                        <SeverityBadge severity={i.severity} />
                                        <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[10px] font-mono text-[#636366]">{i.id}</span>
                                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: `${i.module_color}15`, color: i.module_color }}>{i.module}</span>
                                        {status !== "pending" && <StatusPill status={status} />}
                                    </div>
                                    <h3 className="text-[14px] font-semibold text-[#1d1d1f]">{i.title}</h3>
                                    <p className="mt-1 text-[12px] text-[#636366]">{i.detail}</p>
                                    <p className="mt-2 text-[11px] text-[#8e8e93]">
                                        💡 <span className="font-semibold text-[#1d1d1f]">{i.suggested_action}</span>
                                    </p>
                                </div>
                                <span className="text-[#8e8e93]">→</span>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Detail modal */}
            {selected && <InsightDetail insight={selected} status={selected.status} busy={busyId === selected.id} onClose={() => setSelected(null)} onApply={applyInsight} onDismiss={dismissInsight} dealMap={dealMap} projectMap={projectMap} clientMap={clientMap} />}
        </div>
    );
}

function InsightDetail({ insight, status, busy, onClose, onApply, onDismiss, dealMap, projectMap, clientMap }: {
    insight: Insight;
    status: ActionStatus;
    busy: boolean;
    onClose: () => void;
    onApply: (insight: Insight) => Promise<unknown>;
    onDismiss: (insight: Insight, reason?: string) => Promise<void>;
    dealMap: Map<string, { name?: string; title?: string }>;
    projectMap: Map<string, { name?: string }>;
    clientMap: Map<string, { name?: string }>;
}) {
    const related = insight.related_entity;
    const entity = related?.type === "deal" ? dealMap.get(related.id) :
                   related?.type === "project" ? projectMap.get(related.id) :
                   related?.type === "client" ? clientMap.get(related.id) : null;

    const entityHref = related?.type === "deal" ? `/crm/${related.id}` :
                       related?.type === "project" ? `/pm-tab/${related.id}` :
                       related?.type === "client" ? `/customer-health/${related.id}` : null;

    return (
        <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
            <div onClick={e => e.stopPropagation()} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
                <div className="mb-4 flex items-start justify-between">
                    <div className="flex-1">
                        <div className="mb-2 flex flex-wrap gap-2">
                            <SeverityBadge severity={insight.severity} />
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: `${insight.module_color}15`, color: insight.module_color }}>{insight.module}</span>
                        </div>
                        <h2 className="text-[20px] font-bold text-[#1d1d1f]">{insight.title}</h2>
                    </div>
                    <button onClick={onClose} className="text-[20px] text-[#8e8e93]">✕</button>
                </div>

                {/* Detail */}
                <div className="mb-4 rounded-xl bg-black/[0.02] p-4">
                    <p className="mb-2 text-[10px] font-semibold uppercase text-[#8e8e93]">{t("insights.why_flagged")}</p>
                    <p className="text-[13px] text-[#1d1d1f]">{insight.detail}</p>
                </div>

                {/* Recommended action */}
                <div className="mb-4 rounded-xl border border-[#5856d6]/20 bg-[#5856d6]/5 p-4">
                    <p className="mb-1 text-[10px] font-semibold uppercase text-[#5856d6]">{t("insights.recommended_action")}</p>
                    <p className="text-[14px] font-semibold text-[#1d1d1f]">{insight.suggested_action}</p>
                </div>

                {/* Evidence / related */}
                {entity && entityHref && (
                    <div className="mb-4 rounded-xl border border-black/[0.06] p-4">
                        <p className="mb-2 text-[10px] font-semibold uppercase text-[#8e8e93]">{t("insights.related")}</p>
                        <Link href={entityHref} onClick={onClose} className="flex items-center justify-between rounded-lg p-2 hover:bg-black/[0.03]">
                            <div>
                                <p className="text-[13px] font-semibold text-[#1d1d1f]">{(entity as { name?: string; title?: string }).name ?? (entity as { title?: string }).title ?? "Record"}</p>
                                <p className="text-[11px] text-[#8e8e93] capitalize">{related!.type}</p>
                            </div>
                            <span className="text-[12px] font-semibold text-[#5856d6]">View →</span>
                        </Link>
                    </div>
                )}

                {/* Confidence + meta */}
                <div className="mb-4 grid grid-cols-3 gap-3 text-[11px]">
                    <Meta label="Confidence" value="86%" />
                    <Meta label="Generated" value={new Date(insight.created_at).toLocaleString()} />
                    <Meta label="Status" value={status} />
                </div>

                {/* Actions */}
                {status === "pending" ? (
                    <div className="flex justify-end gap-2 border-t border-black/[0.04] pt-4">
                        <button
                            onClick={() => onDismiss(insight)}
                            disabled={busy}
                            className="rounded-xl border border-[#ff453a]/30 bg-white px-4 py-2 text-[13px] font-semibold text-[#ff453a] hover:bg-[#ff453a]/5 disabled:opacity-50"
                        >
                            {t("insights.dismiss")}
                        </button>
                        <button
                            onClick={() => onApply(insight)}
                            disabled={busy}
                            className="rounded-xl bg-gradient-to-br from-[#5856d6] to-[#bf5af2] px-5 py-2 text-[13px] font-semibold text-white shadow-lg disabled:opacity-50"
                        >
                            {busy ? t("insights.submitting") : t("insights.apply")}
                        </button>
                    </div>
                ) : (
                    <div className="rounded-xl bg-black/[0.02] p-3 text-center text-[12px] text-[#636366]">
                        This insight was <span className="font-semibold capitalize">{status}</span>.
                        {status === "applied" && insight.approval_id && (
                            <Link href="/approvals" onClick={onClose} className="ml-2 text-[#5856d6] hover:underline">
                                View approval →
                            </Link>
                        )}
                        {status === "dismissed" && insight.dismiss_reason && (
                            <span className="ml-2">Reason: “{insight.dismiss_reason}”</span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function Meta({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg bg-black/[0.02] p-2">
            <p className="text-[9px] uppercase text-[#8e8e93]">{label}</p>
            <p className="mt-0.5 font-semibold text-[#1d1d1f] capitalize">{value}</p>
        </div>
    );
}

function SeverityBadge({ severity }: { severity: string }) {
    const map: Record<string, { bg: string; color: string; icon: string }> = {
        critical: { bg: "rgba(255, 69, 58, 0.15)", color: "#ff453a", icon: "🔴" },
        warning: { bg: "rgba(255, 159, 10, 0.15)", color: "#c93400", icon: "🟡" },
        info: { bg: "rgba(10, 132, 255, 0.15)", color: "#0040dd", icon: "🔵" },
        success: { bg: "rgba(48, 209, 88, 0.15)", color: "#248a3d", icon: "🟢" },
    };
    const s = map[severity] ?? map.info;
    return <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: s.bg, color: s.color }}>{s.icon} {severity}</span>;
}

function StatusPill({ status }: { status: ActionStatus }) {
    const map: Record<ActionStatus, { bg: string; color: string }> = {
        pending: { bg: "#f5f5f7", color: "#636366" },
        applied: { bg: "rgba(48, 209, 88, 0.15)", color: "#248a3d" },
        dismissed: { bg: "rgba(255, 69, 58, 0.15)", color: "#ff453a" },
        snoozed: { bg: "rgba(142, 142, 147, 0.15)", color: "#636366" },
    };
    const s = map[status];
    return <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase" style={{ background: s.bg, color: s.color }}>{status}</span>;
}

function KPI({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
    return (
        <div className="rounded-2xl border border-black/[0.06] bg-white/60 p-4 backdrop-blur">
            <p className="mb-1 text-[11px] font-medium text-[#8e8e93]">{label}</p>
            <p className="mb-1 text-[26px] font-bold tracking-tight" style={{ color }}>{value}</p>
            <p className="text-[11px] text-[#8e8e93]">{sub}</p>
        </div>
    );
}
