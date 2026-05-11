"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRfqs, useClients, useDeals } from "@/lib/hooks/use-resources";
import { formatDate } from "@/lib/format";
import { useListFilters, filterAndSort } from "@/components/shared/ListFilters";
import { LoadingSkeleton } from "@/components/shared";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";

/* ═══ RFQ & Intake Engine — Liquid Glass ═══ */

const RFQ_BUDGET_HINT = (val: number | null | undefined) => {
    const v = Number(val ?? 0);
    if (v <= 0) return "—";
    if (v >= 500000) return "$500K+";
    if (v >= 300000) return "$300K–$500K";
    if (v >= 100000) return "$100K–$300K";
    return "<$100K";
};

const STATUS_STYLES = (t: (k: string) => string): Record<string, { bg: string; text: string; label: string }> => ({
    draft: { bg: "rgba(142, 142, 147, 0.12)", text: "#636366", label: t("rfq.status_draft") },
    in_progress: { bg: "rgba(0, 122, 255, 0.12)", text: "#0040dd", label: t("rfq.status_in_progress") },
    submitted: { bg: "rgba(255, 159, 10, 0.12)", text: "#c93400", label: t("rfq.status_submitted") },
    awarded: { bg: "rgba(48, 209, 88, 0.12)", text: "#248a3d", label: t("rfq.status_awarded") },
    lost: { bg: "rgba(255, 69, 58, 0.12)", text: "#c93400", label: t("rfq.status_lost") },
});

function AIScoreBar({ score }: { score: number }) {
    if (score === 0) return <span className="text-[12px] text-[#8e8e93]">—</span>;
    const color = score >= 80 ? "#30d158" : score >= 60 ? "#ff9f0a" : "#ff453a";
    return (
        <div className="ai-score-bar">
            <div className="ai-score-bar__track">
                <div
                    className="ai-score-bar__fill"
                    style={{
                        width: `${score}%`,
                        background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                    }}
                />
            </div>
            <span className="ai-score-bar__value" style={{ color }}>{score}</span>
        </div>
    );
}

export default function RFQPage() {
    const t = useT();
    const { data: rfqsData, isLoading } = useRfqs();
    const { data: clientsData } = useClients();
    const { data: dealsData } = useDeals();
    const router = useRouter();

    const RFQS = useMemo(() => {
        const clientMap = new Map((clientsData ?? []).map(c => [c.id, c.name]));
        const dealMap = new Map((dealsData ?? []).map(d => [d.id, d]));
        return (rfqsData ?? []).map(r => {
            const deal = r.deal_id ? dealMap.get(r.deal_id) : undefined;
            return {
                id: r.id,
                displayId: r.id.slice(0, 8).toUpperCase(),
                client: (r.client_id && clientMap.get(r.client_id)) ?? deal?.client_name ?? "—",
                type: deal?.deal_type ?? "—",
                status: r.status,
                aiScore: Number(r.completion_pct ?? 0),
                est: RFQ_BUDGET_HINT(deal?.value),
                pm: deal?.owner ?? "—",
                date: formatDate(r.created_at),
            };
        });
    }, [rfqsData, clientsData, dealsData]);

    const KPI_CARDS = [
        { label: t("rfq.kpi_active"), value: String(RFQS.length), delta: t("rfq.in_progress_label", { n: RFQS.filter(r => r.status === "in_progress").length }), positive: true as boolean | null },
        { label: t("rfq.kpi_completion"), value: RFQS.length ? `${Math.round(RFQS.reduce((s, r) => s + r.aiScore, 0) / RFQS.length)}%` : "—", delta: t("rfq.weighted"), positive: true as boolean | null },
        { label: t("rfq.kpi_submitted"), value: String(RFQS.filter(r => r.status === "submitted").length), delta: t("rfq.awaiting"), positive: null as boolean | null },
        { label: t("rfq.kpi_awarded"), value: String(RFQS.filter(r => r.status === "awarded").length), delta: t("rfq.closed_won"), positive: true as boolean | null },
    ];
    const statusStyles = STATUS_STYLES(t);
    const filters = useListFilters({
        searchPlaceholder: t("rfq.search_ph"),
        statusOptions: Object.entries(statusStyles).map(([v, s]) => ({ value: v, label: s.label })),
        sortOptions: [
            { value: "score_desc", label: t("rfq.sort_score") },
            { value: "date_desc", label: t("rfq.sort_date") },
        ],
    });
    const filtered = filterAndSort(RFQS, filters, {
        searchFields: ["displayId", "client", "type"],
        statusField: "status",
        sorters: {
            score_desc: (a, b) => b.aiScore - a.aiScore,
            date_desc: (a, b) => b.id.localeCompare(a.id),
        },
    });
    return (
        <div className="p-6">
            {/* Header */}
            <header className="mb-6">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#30d158]">
                    {t("rfq.module_tag")}
                </p>
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-[28px] font-bold tracking-tight text-[#1d1d1f]">
                            {t("rfq.title")}
                        </h1>
                        <p className="mt-0.5 text-[13px] text-[#8e8e93]">
                            {t("rfq.subtitle")}
                        </p>
                    </div>
                    <Link href="/rfq/new" className="btn btn--primary">{t("page.new_rfq")}</Link>
                </div>
            </header>

            {/* KPI Stats */}
            <div className="mb-6 grid grid-cols-4 gap-4">
                {KPI_CARDS.map((kpi) => (
                    <div key={kpi.label} className="glass-stat">
                        <p className="mb-1 text-[11px] font-medium text-[#8e8e93]">{kpi.label}</p>
                        <p className="mb-1 text-[28px] font-bold tracking-tight text-[#1d1d1f]">{kpi.value}</p>
                        <p className={`text-[11px] ${kpi.positive ? "text-[#30d158]" : "text-[#8e8e93]"}`}>
                            {kpi.delta}
                        </p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            {filters.toolbar}

            {/* RFQ Table */}
            <div className="glass-card overflow-hidden">
                <div className="flex items-center justify-between border-b border-black/[0.04] px-5 py-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-[15px] font-semibold text-[#1d1d1f]">{t("rfq.kpi_active")}</h2>
                        <span className="rounded-full bg-[#30d158]/10 px-2.5 py-1 text-[11px] font-semibold text-[#30d158]">
                            {t("rfq.requests_count", { n: filtered.length })}
                        </span>
                    </div>
                </div>

                <table className="glass-table">
                    <thead>
                        <tr>
                            <th>{t("rfq.col_id")}</th>
                            <th>{t("rfq.col_client")}</th>
                            <th>{t("rfq.col_type")}</th>
                            <th>{t("rfq.col_status")}</th>
                            <th>{t("rfq.col_score")}</th>
                            <th>{t("rfq.col_estimate")}</th>
                            <th>{t("rfq.col_pm")}</th>
                            <th>{t("rfq.col_date")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && filtered.length === 0 && (
                            <tr><td colSpan={8} className="px-6 py-8"><LoadingSkeleton rows={4} type="text" /></td></tr>
                        )}
                        {!isLoading && filtered.length === 0 && (
                            <tr><td colSpan={8} className="py-12 text-center text-[13px] text-[#8e8e93]">{t("rfq.empty")}</td></tr>
                        )}
                        {filtered.map((rfq) => {
                            const status = statusStyles[rfq.status] ?? statusStyles.draft;
                            return (
                                <tr key={rfq.id} className="cursor-pointer" onClick={() => router.push(`/rfq/${rfq.id}`)}>
                                    <td>
                                        <span className="font-mono text-[12px] font-semibold text-[#30d158]">
                                            {rfq.displayId}
                                        </span>
                                    </td>
                                    <td className="font-semibold text-[#1d1d1f]">{rfq.client}</td>
                                    <td className="text-[#8e8e93]">{rfq.type}</td>
                                    <td>
                                        <span
                                            className="status-badge"
                                            style={{ "--badge-bg": status.bg, "--badge-color": status.text } as React.CSSProperties}
                                        >
                                            {status.label}
                                        </span>
                                    </td>
                                    <td><AIScoreBar score={rfq.aiScore} /></td>
                                    <td className="font-mono font-semibold text-[#1d1d1f]">{rfq.est}</td>
                                    <td>
                                        <div className="avatar avatar--sm">{rfq.pm}</div>
                                    </td>
                                    <td className="text-[12px] text-[#8e8e93]">{rfq.date}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
