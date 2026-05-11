"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useChangeOrders, useProjects, useClients } from "@/lib/hooks/use-resources";
import { formatDate, formatMoney } from "@/lib/format";
import { useListFilters, filterAndSort } from "@/components/shared/ListFilters";
import { LoadingSkeleton } from "@/components/shared";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    proposed: { bg: "rgba(255, 159, 10, 0.12)", text: "#ff9f0a", label: "Proposed" },
    approved: { bg: "rgba(48, 209, 88, 0.12)", text: "#248a3d", label: "Approved" },
    rejected: { bg: "rgba(255, 69, 58, 0.12)", text: "#ff453a", label: "Rejected" },
    applied: { bg: "rgba(10, 132, 255, 0.12)", text: "#0a84ff", label: "Applied" },
    void: { bg: "rgba(142, 142, 147, 0.12)", text: "#636366", label: "Void" },
};

export default function ChangeOrdersPage() {
    const t = useT();
    const { data: cos, isLoading } = useChangeOrders();
    const { data: projects } = useProjects();
    const { data: clients } = useClients();
    const router = useRouter();

    const ROWS = useMemo(() => {
        const projMap = new Map((projects ?? []).map(p => [p.id, p.name]));
        const clientMap = new Map((clients ?? []).map(c => [c.id, c.name]));
        return (cos ?? []).map(co => ({
            id: co.id,
            folio: co.folio,
            title: co.title,
            project: (co.project_id && projMap.get(co.project_id)) ?? "—",
            client: (co.client_id && clientMap.get(co.client_id)) ?? "—",
            status: (co.status ?? "proposed").toLowerCase(),
            timeline: co.timeline_impact_days ?? 0,
            budget: Number(co.budget_impact ?? 0),
            currency: co.currency ?? "MXN",
            created: formatDate(co.created_at),
        }));
    }, [cos, projects, clients]);

    const KPI_CARDS = [
        { label: t("co.kpi_active"), value: String(ROWS.filter(r => r.status === "proposed").length), delta: t("co.awaiting") },
        { label: t("co.kpi_approved"), value: String(ROWS.filter(r => r.status === "approved" || r.status === "applied").length), delta: t("co.this_period") },
        { label: t("co.kpi_timeline"), value: `${ROWS.reduce((s, r) => s + (r.timeline || 0), 0)}d`, delta: t("co.total_impact") },
        { label: t("co.kpi_budget"), value: formatMoney(ROWS.reduce((s, r) => s + (r.budget || 0), 0)), delta: t("co.total_impact") },
    ];

    const filters = useListFilters({
        searchPlaceholder: t("co.search_ph"),
        statusOptions: Object.entries(STATUS_STYLES).map(([v, s]) => ({ value: v, label: s.label })),
        sortOptions: [{ value: "created_desc", label: "Created ↓" }],
    });
    const filtered = filterAndSort(ROWS, filters, {
        searchFields: ["folio", "title", "project", "client"],
        statusField: "status",
        sorters: { created_desc: (a, b) => (b.created ?? "").localeCompare(a.created ?? "") },
    });

    return (
        <div className="p-6">
            <header className="mb-6">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#ff6b35]">
                    {t("co.eyebrow")}
                </p>
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-[28px] font-bold tracking-tight text-[#1d1d1f]">{t("co.title")}</h1>
                        <p className="mt-0.5 text-[13px] text-[#8e8e93]">{t("co.subtitle")}</p>
                    </div>
                    <Link href="/change-orders/new" className="btn btn--primary">{t("co.btn_new")}</Link>
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

            <div className="glass-card overflow-hidden">
                <div className="flex items-center justify-between border-b border-black/[0.04] px-5 py-4">
                    <h2 className="text-[15px] font-semibold text-[#1d1d1f]">{t("co.registry")}</h2>
                    <span className="rounded-full bg-[#ff6b35]/10 px-2.5 py-1 text-[11px] font-semibold text-[#ff6b35]">
                        {t("co.count_label", { n: filtered.length })}
                    </span>
                </div>
                <table className="glass-table">
                    <thead>
                        <tr>
                            <th>{t("co.col_folio")}</th>
                            <th>{t("co.col_title")}</th>
                            <th>{t("co.col_project")}</th>
                            <th>{t("co.col_status")}</th>
                            <th>{t("co.col_days")}</th>
                            <th>{t("co.col_budget")}</th>
                            <th>{t("co.col_created")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && filtered.length === 0 && (
                            <tr><td colSpan={7} className="px-6 py-8"><LoadingSkeleton rows={4} type="text" /></td></tr>
                        )}
                        {filtered.map((r) => {
                            const status = STATUS_STYLES[r.status] ?? STATUS_STYLES.proposed;
                            return (
                                <tr key={r.id} className="cursor-pointer" onClick={() => router.push(`/change-orders/${r.id}`)}>
                                    <td><span className="font-mono text-[12px] font-semibold text-[#ff6b35]">{r.folio}</span></td>
                                    <td className="font-semibold text-[#1d1d1f]">{r.title}</td>
                                    <td className="text-[#8e8e93]">{r.project}</td>
                                    <td>
                                        <span className="inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold"
                                            style={{ background: status.bg, color: status.text }}>{status.label}</span>
                                    </td>
                                    <td className="text-[#1d1d1f]">{r.timeline ? `${r.timeline > 0 ? "+" : ""}${r.timeline}d` : "—"}</td>
                                    <td className="text-[#1d1d1f]">{r.budget ? `${r.budget > 0 ? "+" : ""}${formatMoney(r.budget)} ${r.currency}` : "—"}</td>
                                    <td className="text-[#8e8e93]">{r.created}</td>
                                </tr>
                            );
                        })}
                        {filtered.length === 0 && (
                            <tr><td colSpan={7} className="py-12 text-center text-[#8e8e93]">{t("co.empty")} <Link href="/change-orders/new" className="font-semibold text-[#ff6b35]">{t("co.create_first")}</Link>.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
