"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useDeals, useClients, useInsights } from "@/lib/hooks/use-resources";
import { LoadingSkeleton } from "@/components/shared";
import { useListFilters, filterAndSort } from "@/components/shared/ListFilters";
import { useT } from "@/lib/i18n";

/* ══════════════════════════════════════════════════════════════════════════
   🍎 CRM & SALES PIPELINE — True Liquid Glass Design
   ══════════════════════════════════════════════════════════════════════════ */

// ─── Data ─────────────────────────────────────────────────────────────────────

const STAGES: Record<string, { bg: string; text: string; key: string }> = {
    "Negotiation": { bg: "rgba(48, 209, 88, 0.12)", text: "#248a3d", key: "crm.stage_negotiation" },
    "Proposal Sent": { bg: "rgba(255, 159, 10, 0.12)", text: "#c93400", key: "crm.stage_proposal_sent" },
    "Demo Done": { bg: "rgba(191, 90, 242, 0.12)", text: "#8944ab", key: "crm.stage_demo_done" },
    "Discovery": { bg: "rgba(0, 122, 255, 0.12)", text: "#0040dd", key: "crm.stage_discovery" },
    "RFQ Submitted": { bg: "rgba(255, 204, 0, 0.12)", text: "#996f00", key: "crm.stage_rfq_submitted" },
    "Qualified Lead": { bg: "rgba(142, 142, 147, 0.12)", text: "#636366", key: "crm.stage_qualified_lead" },
};

const FALLBACK_STAGE = STAGES["Qualified Lead"];

// Severity to priority mapping for insights
const SEVERITY_TO_PRIO: Record<string, string> = {
    CRITICAL: "critical",
    HIGH: "high",
    MEDIUM: "medium",
    LOW: "low",
    INFO: "info",
};

const PRIO_CONFIG: Record<string, { bg: string; text: string; labelKey: string }> = {
    critical: { bg: "rgba(255, 69, 58, 0.15)", text: "#ff453a", labelKey: "crm.prio_critical" },
    high: { bg: "rgba(255, 159, 10, 0.15)", text: "#ff9f0a", labelKey: "crm.prio_high" },
    medium: { bg: "rgba(0, 122, 255, 0.15)", text: "#007aff", labelKey: "crm.prio_medium" },
    low: { bg: "rgba(142, 142, 147, 0.15)", text: "#8e8e93", labelKey: "crm.prio_low" },
    info: { bg: "rgba(48, 209, 88, 0.15)", text: "#30d158", labelKey: "crm.prio_info" },
};

// ─── Components ───────────────────────────────────────────────────────────────

function AIScoreBar({ score }: { score: number }) {
    const getColor = () => {
        if (score >= 70) return { start: "#30d158", end: "#64d2ff" };
        if (score >= 45) return { start: "#ff9f0a", end: "#ffcc00" };
        return { start: "#ff453a", end: "#ff9f0a" };
    };
    const colors = getColor();

    return (
        <div className="ai-score-bar">
            <div className="ai-score-bar__track">
                <div
                    className="ai-score-bar__fill"
                    style={{
                        width: `${score}%`,
                        background: `linear-gradient(90deg, ${colors.start}, ${colors.end})`,
                    }}
                />
            </div>
            <span
                className="ai-score-bar__value"
                style={{ color: colors.start }}
            >
                {score}
            </span>
        </div>
    );
}

function OwnerAvatar({ initials }: { initials: string }) {
    const colors: Record<string, string[]> = {
        SC: ["#007aff", "#5856d6"],
        MT: ["#30d158", "#64d2ff"],
        AO: ["#ff9f0a", "#ff453a"],
    };
    const [start, end] = colors[initials] ?? ["#8e8e93", "#636366"];

    return (
        <div
            className="avatar avatar--sm"
            style={{ "--avatar-start": start, "--avatar-end": end } as React.CSSProperties}
        >
            {initials}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CRMPage() {
    const t = useT();
    const { data: dealsData, isLoading: dealsLoading } = useDeals();
    const { data: clientsData } = useClients();
    const { data: insightsData } = useInsights();

    const clientById = useMemo(() => {
        const map = new Map<string, string>();
        (clientsData ?? []).forEach(c => map.set(c.id, c.name));
        return map;
    }, [clientsData]);

    const deals = useMemo(() => (dealsData ?? []).map(d => ({
        id: d.id,
        name: d.client_name ?? t("crm.untitled_deal"),
        client: (d.client_id && clientById.get(d.client_id)) ?? d.client_name ?? "—",
        value: Number(d.value ?? 0),
        stage: d.stage,
        ai: Number(d.ai_score ?? 0),
        type: d.deal_type ?? "",
        owner: d.owner ?? "",
        days: Number(d.days_in_stage ?? 0),
    })), [dealsData, clientById]);

    // Transform insights into AI actions for CRM module
    const aiActions = useMemo(() => {
        const crmInsights = (insightsData ?? [])
            .filter(i => i.module === "CRM" || i.entity_type === "deal")
            .filter(i => i.status !== "dismissed" && i.status !== "applied")
            .slice(0, 5); // Show top 5
        
        return crmInsights.map(i => ({
            id: i.id,
            prio: SEVERITY_TO_PRIO[i.severity] ?? "medium",
            title: i.title,
            action: i.description ?? i.recommended_action ?? "",
            entityId: i.entity_id,
        }));
    }, [insightsData]);

    const filters = useListFilters({
        searchPlaceholder: t("crm.search_ph"),
        statusOptions: Object.entries(STAGES).map(([s, v]) => ({ value: s, label: t(v.key) })),
        sortOptions: [
            { value: "ai_desc", label: t("crm.sort_score") },
            { value: "value_desc", label: t("crm.sort_value") },
            { value: "days_desc", label: t("crm.sort_days") },
        ],
    });
    const filtered = filterAndSort(deals, { search: filters.search, status: filters.status, sort: filters.sort }, {
        searchFields: ["name", "client", "type", "owner"],
        statusField: "stage",
        sorters: {
            ai_desc: (a, b) => b.ai - a.ai,
            value_desc: (a, b) => b.value - a.value,
            days_desc: (a, b) => b.days - a.days,
        },
    });
    const totalValue = filtered.reduce((s, d) => s + d.value, 0);
    const wonCount = deals.filter(d => d.stage === "Won").length;
    const negotiationDeals = deals.filter(d => d.stage === "Negotiation");
    const KPI_CARDS = [
        { label: t("crm.kpi_total"), value: `$${(deals.reduce((s, d) => s + d.value, 0) / 1000).toFixed(0)}K`, delta: t("crm.deals_tracked", { n: deals.length }), positive: true as boolean | null },
        { label: t("crm.kpi_won"), value: String(wonCount), delta: t("crm.closed"), positive: true as boolean | null },
        { label: t("crm.kpi_negotiation"), value: String(negotiationDeals.length), delta: t("crm.combined", { n: (negotiationDeals.reduce((s, d) => s + d.value, 0) / 1000).toFixed(0) }), positive: null as boolean | null },
        { label: t("crm.kpi_avg_size"), value: deals.length ? `$${(deals.reduce((s, d) => s + d.value, 0) / deals.length / 1000).toFixed(0)}K` : "$0", delta: "", positive: true as boolean | null },
    ];
    return (
        <div className="p-6">
            {/* Header */}
            <header className="mb-6">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#007aff]">
                    {t("crm.module_tag")}
                </p>
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-[28px] font-bold tracking-tight text-[#1d1d1f]">
                            {t("crm.title")}
                        </h1>
                        <p className="mt-0.5 text-[13px] text-[#8e8e93]">
                            {t("crm.subtitle")}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/crm/new" className="btn btn--secondary">{t("page.add_deal")}</Link>
                        <button className="btn btn--primary">
                            <span>✦</span>
                            {t("crm.ai_forecast")}
                        </button>
                    </div>
                </div>
            </header>

            {/* KPI Stats */}
            <div className="mb-6 grid grid-cols-4 gap-4">
                {KPI_CARDS.map((kpi) => (
                    <div key={kpi.label} className="glass-stat">
                        <p className="mb-1 text-[11px] font-medium text-[#8e8e93]">{kpi.label}</p>
                        <p className="mb-1 text-[28px] font-bold tracking-tight text-[#1d1d1f]">
                            {kpi.value}
                        </p>
                        <p className={`text-[11px] ${kpi.positive ? "text-[#30d158]" : "text-[#8e8e93]"}`}>
                            {kpi.delta}
                        </p>
                    </div>
                ))}
            </div>

            {/* Filters toolbar */}
            {filters.toolbar}

            {/* Main Content */}
            <div className="grid grid-cols-[1fr_320px] gap-5">
                {/* Pipeline Table */}
                <div className="glass-card overflow-hidden">
                    {/* Table Header */}
                    <div className="flex items-center justify-between border-b border-black/[0.04] px-5 py-4">
                        <div className="flex items-center gap-3">
                            <h2 className="text-[15px] font-semibold text-[#1d1d1f]">{t("crm.active_pipeline")}</h2>
                            <span className="rounded-full bg-[#007aff]/10 px-2.5 py-1 text-[11px] font-semibold text-[#007aff]">
                                {t("crm.deals_value", { n: filtered.length, value: (totalValue / 1000).toFixed(0) })}
                            </span>
                        </div>
                        <button className="text-[12px] font-medium text-[#007aff] hover:underline">
                            {t("crm.sort_ai")}
                        </button>
                    </div>

                    {/* Table Content */}
                    <div className="overflow-x-auto">
                        <table className="glass-table">
                            <thead>
                                <tr>
                                    <th>{t("crm.col_deal")}</th>
                                    <th>{t("crm.col_client")}</th>
                                    <th>{t("crm.col_value")}</th>
                                    <th>{t("crm.col_stage")}</th>
                                    <th>{t("crm.col_score")}</th>
                                    <th>{t("crm.col_type")}</th>
                                    <th>{t("crm.col_owner")}</th>
                                    <th>{t("crm.col_days")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dealsLoading && filtered.length === 0 ? (
                                    <tr><td colSpan={8}><LoadingSkeleton rows={5} type="table" /></td></tr>
                                ) : null}
                                {filtered.map((deal) => {
                                    const stage = STAGES[deal.stage] ?? FALLBACK_STAGE;
                                    return (
                                        <tr key={deal.id} className="cursor-pointer" onClick={() => window.location.href = `/crm/${deal.id}`}>
                                            <td>
                                                <span className="font-semibold text-[#1d1d1f] hover:text-[#007aff]">
                                                    {deal.name}
                                                </span>
                                            </td>
                                            <td className="text-[#8e8e93]">{deal.client}</td>
                                            <td className="font-mono font-semibold text-[#1d1d1f]">
                                                ${(deal.value / 1000).toFixed(0)}K
                                            </td>
                                            <td>
                                                <span
                                                    className="status-badge"
                                                    style={{
                                                        "--badge-bg": stage.bg,
                                                        "--badge-color": stage.text,
                                                    } as React.CSSProperties}
                                                >
                                                    {t(stage.key)}
                                                </span>
                                            </td>
                                            <td>
                                                <AIScoreBar score={deal.ai} />
                                            </td>
                                            <td className="text-[12px] text-[#8e8e93]">{deal.type}</td>
                                            <td>
                                                <OwnerAvatar initials={deal.owner} />
                                            </td>
                                            <td>
                                                <span
                                                    className={`font-mono text-[12px] font-semibold ${
                                                        deal.days > 30 ? "text-[#ff453a]" : "text-[#8e8e93]"
                                                    }`}
                                                >
                                                    {deal.days}d
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* AI Actions Panel */}
                <div className="glass-dark rounded-2xl">
                    <div className="border-b border-white/[0.06] px-4 py-3">
                        <h2 className="flex items-center gap-2 text-[14px] font-semibold text-white">
                            <span className="text-[16px]">✦</span>
                            {t("crm.ai_actions")}
                            {aiActions.length > 0 && (
                                <span className="rounded-full bg-[#ff453a]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#ff453a]">
                                    {aiActions.length}
                                </span>
                            )}
                        </h2>
                    </div>
                    <div className="space-y-3 p-3">
                        {aiActions.length === 0 ? (
                            <div className="rounded-xl bg-white/[0.03] p-4 text-center">
                                <p className="text-[12px] text-white/50">{t("crm.no_ai_actions")}</p>
                                <p className="mt-1 text-[11px] text-white/30">{t("crm.ai_hint")}</p>
                            </div>
                        ) : (
                            aiActions.map((action) => {
                                const prio = PRIO_CONFIG[action.prio] ?? PRIO_CONFIG.medium;
                                return (
                                    <Link
                                        key={action.id}
                                        href={action.entityId ? `/crm/${action.entityId}` : "/ai-insights"}
                                        className="block cursor-pointer rounded-xl bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.06]"
                                    >
                                        <span
                                            className="mb-2 inline-block rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                                            style={{ background: prio.bg, color: prio.text }}
                                        >
                                            {t(prio.labelKey)}
                                        </span>
                                        <p className="mb-2 text-[12px] font-medium leading-snug text-white">
                                            {action.title}
                                        </p>
                                        <p className="text-[11px] leading-relaxed text-white/50">
                                            {action.action}
                                        </p>
                                    </Link>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
