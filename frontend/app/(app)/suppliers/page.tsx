"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSuppliers } from "@/lib/hooks/use-resources";
import { useListFilters, filterAndSort } from "@/components/shared/ListFilters";
import { LoadingSkeleton } from "@/components/shared";
import { useT } from "@/lib/i18n";

/* ═══ Suppliers ═══ */

const STATUS_STYLES = (t: (k: string) => string): Record<string, { bg: string; text: string; label: string }> => ({
    active: { bg: "rgba(48, 209, 88, 0.12)", text: "#248a3d", label: t("suppliers.status_active") },
    evaluation: { bg: "rgba(255, 159, 10, 0.12)", text: "#c93400", label: t("suppliers.status_evaluation") },
    inactive: { bg: "rgba(142, 142, 147, 0.12)", text: "#636366", label: t("suppliers.status_inactive") },
});

function RatingBadge({ rating }: { rating: number }) {
    const color = rating >= 90 ? "#30d158" : rating >= 75 ? "#ff9f0a" : "#ff453a";
    return (
        <div
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold"
            style={{ background: `${color}20`, color }}
        >
            {rating}
        </div>
    );
}

function PerformanceBar({ value }: { value: number }) {
    const color = value >= 95 ? "#30d158" : value >= 85 ? "#ff9f0a" : "#ff453a";
    return (
        <div className="flex items-center gap-2">
            <div className="h-1.5 w-14 overflow-hidden rounded-full bg-black/5">
                <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${value}%`, background: color }}
                />
            </div>
            <span className="text-[11px] text-[#636366]">{value}%</span>
        </div>
    );
}

export default function SuppliersPage() {
    const t = useT();
    const { data: suppliersData, isLoading } = useSuppliers();
    const router = useRouter();

    const SUPPLIERS = useMemo(() => (suppliersData ?? []).map(s => {
        const perf = Number(s.performance_score ?? 0);
        const ratingPct = perf > 0 ? Math.round(perf) : 0;
        const spendNum = Number(s.spend_ytd ?? 0);
        const certsLen = (s.compliance_certs ?? []).length;
        return {
            id: s.id,
            name: s.name,
            category: (s.category ?? "").replace(/_/g, " "),
            status: (s.status ?? "active").toLowerCase(),
            rating: ratingPct,
            ratingNum: ratingPct,
            spend: spendNum > 0 ? `$${(spendNum / 1000).toFixed(0)}K` : "—",
            spendNum,
            pos: certsLen,
            delivery: ratingPct,
            compliance: s.risk_level === "LOW" || s.risk_level === "low" ? 100 : s.risk_level === "MEDIUM" || s.risk_level === "medium" ? 80 : s.risk_level ? 60 : 90,
        };
    }), [suppliersData]);

    const totalSpend = SUPPLIERS.reduce((s, x) => s + x.spendNum, 0);
    const statusStyles = STATUS_STYLES(t);
    const KPI_CARDS = [
        { label: t("suppliers.kpi_active"), value: String(SUPPLIERS.filter(s => s.status === "active").length), delta: t("suppliers.total_count", { n: SUPPLIERS.length }), positive: true as boolean | null },
        { label: t("suppliers.kpi_perf"), value: SUPPLIERS.length ? `${Math.round(SUPPLIERS.reduce((s, x) => s + x.ratingNum, 0) / SUPPLIERS.length)}%` : "—", delta: t("suppliers.weighted"), positive: true as boolean | null },
        { label: t("suppliers.kpi_spend"), value: `$${(totalSpend / 1000).toFixed(0)}K`, delta: t("suppliers.vendors_count", { n: SUPPLIERS.length }), positive: null as boolean | null },
        { label: t("suppliers.kpi_avg_compliance"), value: SUPPLIERS.length ? `${Math.round(SUPPLIERS.reduce((s, x) => s + x.compliance, 0) / SUPPLIERS.length)}%` : "—", delta: t("suppliers.controls_coverage"), positive: true as boolean | null },
    ];
    const filters = useListFilters({
        searchPlaceholder: t("suppliers.search_ph"),
        statusOptions: Object.entries(statusStyles).map(([v, s]) => ({ value: v, label: s.label })),
        sortOptions: [
            { value: "rating_desc", label: t("suppliers.sort_rating") },
            { value: "spend_desc", label: t("suppliers.sort_spend") },
        ],
    });
    const filtered = filterAndSort(SUPPLIERS, filters, {
        searchFields: ["name", "category"],
        statusField: "status",
        sorters: {
            rating_desc: (a, b) => b.ratingNum - a.ratingNum,
            spend_desc: (a, b) => b.spendNum - a.spendNum,
        },
    });
    return (
        <div className="p-6">
            {/* Header */}
            <header className="mb-6">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#64d2ff]">
                    {t("suppliers.module_tag")}
                </p>
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-[28px] font-bold tracking-tight text-[#1d1d1f]">
                            {t("suppliers.title")}
                        </h1>
                        <p className="mt-0.5 text-[13px] text-[#8e8e93]">
                            {t("suppliers.subtitle")}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button className="btn btn--secondary">{t("page.import")}</button>
                        <Link href="/suppliers/new" className="btn btn--primary">{t("page.new_supplier")}</Link>
                    </div>
                </div>
            </header>

            {/* KPI Stats */}
            <div className="mb-6 grid grid-cols-4 gap-4">
                {KPI_CARDS.map((kpi) => (
                    <div key={kpi.label} className="glass-stat">
                        <p className="mb-1 text-[11px] font-medium text-[#8e8e93]">{kpi.label}</p>
                        <p className="mb-1 text-[28px] font-bold tracking-tight text-[#1d1d1f]">{kpi.value}</p>
                        <p className={`text-[11px] ${kpi.positive ? "text-[#30d158]" : kpi.positive === false ? "text-[#ff453a]" : "text-[#8e8e93]"}`}>
                            {kpi.delta}
                        </p>
                    </div>
                ))}
            </div>

            {filters.toolbar}

            {/* Suppliers Table */}
            <div className="glass-card overflow-hidden">
                <div className="flex items-center justify-between border-b border-black/[0.04] px-5 py-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-[15px] font-semibold text-[#1d1d1f]">{t("suppliers.directory")}</h2>
                        <span className="rounded-full bg-[#64d2ff]/10 px-2.5 py-1 text-[11px] font-semibold text-[#64d2ff]">
                            {t("suppliers.vendors_label", { n: filtered.length })}
                        </span>
                    </div>
                </div>

                <table className="glass-table">
                    <thead>
                        <tr>
                            <th>{t("suppliers.col_supplier")}</th>
                            <th>{t("suppliers.col_category")}</th>
                            <th>{t("suppliers.col_status")}</th>
                            <th>{t("suppliers.col_rating")}</th>
                            <th>{t("suppliers.col_spend")}</th>
                            <th>{t("suppliers.col_pos")}</th>
                            <th>{t("suppliers.col_delivery")}</th>
                            <th>{t("suppliers.col_compliance")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && SUPPLIERS.length === 0 && (
                            <tr><td colSpan={8} className="px-6 py-8"><LoadingSkeleton rows={4} type="text" /></td></tr>
                        )}
                        {!isLoading && filtered.length === 0 && (
                            <tr><td colSpan={8} className="py-12 text-center text-[13px] text-[#8e8e93]">{t("suppliers.empty")}</td></tr>
                        )}
                        {filtered.map((supplier) => {
                            const status = statusStyles[supplier.status] ?? statusStyles.active;
                            return (
                                <tr key={supplier.id} className="cursor-pointer" onClick={() => router.push(`/suppliers/${supplier.id}`)}>
                                    <td>
                                        <span className="font-semibold text-[#1d1d1f] hover:text-[#64d2ff]">
                                            {supplier.name}
                                        </span>
                                    </td>
                                    <td className="text-[#8e8e93]">{supplier.category}</td>
                                    <td>
                                        <span
                                            className="inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold"
                                            style={{ background: status.bg, color: status.text }}
                                        >
                                            {status.label}
                                        </span>
                                    </td>
                                    <td>
                                        <RatingBadge rating={supplier.rating} />
                                    </td>
                                    <td className="font-semibold text-[#1d1d1f]">{supplier.spend}</td>
                                    <td className="text-[#8e8e93]">{supplier.pos}</td>
                                    <td>
                                        <PerformanceBar value={supplier.delivery} />
                                    </td>
                                    <td>
                                        <PerformanceBar value={supplier.compliance} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
