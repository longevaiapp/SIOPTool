"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useClients } from "@/lib/hooks/use-resources";
import { useListFilters, filterAndSort } from "@/components/shared/ListFilters";
import { LoadingSkeleton } from "@/components/shared";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";

/* ═══ Customer Health ═══ */

const TIER_FROM_ARR = (arr: number): "platinum" | "gold" | "silver" | "bronze" => {
    if (arr >= 750000) return "platinum";
    if (arr >= 300000) return "gold";
    if (arr >= 100000) return "silver";
    return "bronze";
};

const TIER_LABELS = (t: (k: string) => string): Record<string, string> => ({ platinum: t("health.tier_platinum"), gold: t("health.tier_gold"), silver: t("health.tier_silver"), bronze: t("health.tier_bronze") });

const TIER_STYLES: Record<string, { bg: string; text: string }> = {
    Platinum: { bg: "rgba(191, 90, 242, 0.12)", text: "#8944ab" },
    Gold: { bg: "rgba(255, 159, 10, 0.12)", text: "#c93400" },
    Silver: { bg: "rgba(0, 122, 255, 0.12)", text: "#0040dd" },
    Bronze: { bg: "rgba(142, 142, 147, 0.12)", text: "#636366" },
};
const TIER_STYLES_BY_KEY: Record<string, { bg: string; text: string }> = {
    platinum: { bg: "rgba(191, 90, 242, 0.12)", text: "#8944ab" },
    gold: { bg: "rgba(255, 159, 10, 0.12)", text: "#c93400" },
    silver: { bg: "rgba(0, 122, 255, 0.12)", text: "#0040dd" },
    bronze: { bg: "rgba(142, 142, 147, 0.12)", text: "#636366" },
};

const TREND_ICONS: Record<string, { icon: string; color: string }> = {
    up: { icon: "↑", color: "#30d158" },
    stable: { icon: "→", color: "#8e8e93" },
    down: { icon: "↓", color: "#ff453a" },
};

function HealthScore({ score }: { score: number }) {
    const color = score >= 80 ? "#30d158" : score >= 60 ? "#ff9f0a" : "#ff453a";
    return (
        <div className="flex items-center gap-2">
            <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold"
                style={{ background: `${color}20`, color }}
            >
                {score}
            </div>
        </div>
    );
}

function UsageBar({ usage }: { usage: number }) {
    const color = usage >= 80 ? "#30d158" : usage >= 50 ? "#ff9f0a" : "#ff453a";
    return (
        <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-black/5">
                <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${usage}%`, background: color }}
                />
            </div>
            <span className="text-[11px] text-[#636366]">{usage}%</span>
        </div>
    );
}

export default function CustomerHealthPage() {
    const t = useT();
    const { data: clientsData, isLoading } = useClients();
    const router = useRouter();

    const CUSTOMERS = useMemo(() => {
        const tierLabels = TIER_LABELS(t);
        return (clientsData ?? []).map(c => {
        const arr = Number(c.arr ?? 0);
        const health = Number(c.health_score ?? 0);
        const nps = Number(c.nps ?? 0);
        const tierKey = TIER_FROM_ARR(arr);
        return {
            id: c.id,
            name: c.name,
            tier: tierLabels[tierKey],
            tierKey,
            health,
            nps,
            usage: Math.min(100, Math.max(0, Math.round((health + nps) / 2))),
            contracts: 1,
            mrr: arr > 0 ? `$${Math.round(arr / 12 / 1000)}K` : "—",
            arr,
            trend: health >= 80 ? "up" : health >= 60 ? "stable" : "down",
            lastContact: "—",
        };
        });
    }, [clientsData, t]);

    const avgHealth = CUSTOMERS.length ? Math.round(CUSTOMERS.reduce((s, c) => s + c.health, 0) / CUSTOMERS.length) : 0;
    const avgNps = CUSTOMERS.length ? Math.round(CUSTOMERS.reduce((s, c) => s + c.nps, 0) / CUSTOMERS.length) : 0;
    const atRisk = CUSTOMERS.filter(c => c.health < 60).length;
    const KPI_CARDS = [
        { label: t("health.kpi_avg"), value: String(avgHealth), delta: t("health.accounts_count", { n: CUSTOMERS.length }), positive: avgHealth >= 70 },
        { label: t("health.kpi_risk"), value: String(atRisk), delta: atRisk === 0 ? t("health.all_healthy") : t("health.needs_attention"), positive: atRisk === 0 },
        { label: t("health.kpi_nps"), value: avgNps >= 0 ? `+${avgNps}` : String(avgNps), delta: t("health.weighted"), positive: avgNps >= 30 },
        { label: t("health.kpi_strategic"), value: String(CUSTOMERS.filter(c => c.tierKey === "platinum" || c.tierKey === "gold").length), delta: t("health.platinum_gold"), positive: true },
    ];
    const filters = useListFilters({
        searchPlaceholder: t("health.search_ph"),
        statusOptions: Object.keys(TIER_LABELS(t)).map(k => ({ value: k, label: TIER_LABELS(t)[k] })),
        sortOptions: [
            { value: "health_desc", label: t("health.sort_health") },
            { value: "arr_desc", label: t("health.sort_arr") },
            { value: "nps_desc", label: t("health.sort_nps") },
        ],
    });
    const filtered = filterAndSort(CUSTOMERS, filters, {
        searchFields: ["name"],
        statusField: "tierKey",
        sorters: {
            health_desc: (a, b) => b.health - a.health,
            arr_desc: (a, b) => b.arr - a.arr,
            nps_desc: (a, b) => b.nps - a.nps,
        },
    });
    return (
        <div className="p-6">
            {/* Header */}
            <header className="mb-6">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#ff2d55]">
                    {t("health.module_tag")}
                </p>
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-[28px] font-bold tracking-tight text-[#1d1d1f]">
                            {t("health.title")}
                        </h1>
                        <p className="mt-0.5 text-[13px] text-[#8e8e93]">
                            {t("health.subtitle")}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button className="btn btn--secondary">{t("page.export")}</button>
                        <Link href="/customer-health/new" className="btn btn--primary">
                            {t("page.new_client")}
                        </Link>
                    </div>
                </div>
            </header>

            {/* KPI Stats */}
            <div className="mb-6 grid grid-cols-4 gap-4">
                {KPI_CARDS.map((kpi) => (
                    <div key={kpi.label} className="glass-stat">
                        <p className="mb-1 text-[11px] font-medium text-[#8e8e93]">{kpi.label}</p>
                        <p className="mb-1 text-[28px] font-bold tracking-tight text-[#1d1d1f]">{kpi.value}</p>
                        <p className={`text-[11px] ${kpi.positive ? "text-[#30d158]" : "text-[#ff453a]"}`}>
                            {kpi.delta}
                        </p>
                    </div>
                ))}
            </div>

            {filters.toolbar}

            {/* Customers Table */}
            <div className="glass-card overflow-hidden">
                <div className="flex items-center justify-between border-b border-black/[0.04] px-5 py-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-[15px] font-semibold text-[#1d1d1f]">{t("health.account_health")}</h2>
                        <span className="rounded-full bg-[#ff2d55]/10 px-2.5 py-1 text-[11px] font-semibold text-[#ff2d55]">
                            {t("health.accounts_total", { n: filtered.length })}
                        </span>
                    </div>
                </div>

                <table className="glass-table">
                    <thead>
                        <tr>
                            <th>{t("health.col_customer")}</th>
                            <th>{t("health.col_tier")}</th>
                            <th>{t("health.col_health")}</th>
                            <th>{t("health.col_nps")}</th>
                            <th>{t("health.col_usage")}</th>
                            <th>{t("health.col_mrr")}</th>
                            <th>{t("health.col_trend")}</th>
                            <th>{t("health.col_last")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && filtered.length === 0 && (
                            <tr><td colSpan={8} className="px-6 py-8"><LoadingSkeleton rows={4} type="text" /></td></tr>
                        )}
                        {!isLoading && filtered.length === 0 && (
                            <tr><td colSpan={8} className="py-12 text-center text-[13px] text-[#8e8e93]">{t("health.empty")}</td></tr>
                        )}
                        {filtered.map((customer) => {
                            const tier = TIER_STYLES_BY_KEY[customer.tierKey] ?? TIER_STYLES.Bronze;
                            const trend = TREND_ICONS[customer.trend];
                            return (
                                <tr key={customer.id} className="cursor-pointer" onClick={() => router.push(`/customer-health/${customer.id}`)}>
                                    <td>
                                        <span className="font-semibold text-[#1d1d1f] hover:text-[#ff2d55]">
                                            {customer.name}
                                        </span>
                                    </td>
                                    <td>
                                        <span
                                            className="inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold"
                                            style={{ background: tier.bg, color: tier.text }}
                                        >
                                            {customer.tier}
                                        </span>
                                    </td>
                                    <td>
                                        <HealthScore score={customer.health} />
                                    </td>
                                    <td className={customer.nps >= 50 ? "text-[#30d158]" : customer.nps >= 0 ? "text-[#ff9f0a]" : "text-[#ff453a]"}>
                                        +{customer.nps}
                                    </td>
                                    <td>
                                        <UsageBar usage={customer.usage} />
                                    </td>
                                    <td className="font-semibold text-[#1d1d1f]">{customer.mrr}</td>
                                    <td>
                                        <span style={{ color: trend.color }} className="text-[14px] font-bold">
                                            {trend.icon}
                                        </span>
                                    </td>
                                    <td className="text-[#8e8e93]">{customer.lastContact}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
