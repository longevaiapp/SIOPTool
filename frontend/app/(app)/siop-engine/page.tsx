"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { mutate as globalMutate } from "swr";
import { useScenarios, useRoleCapacity, useDemandForecast, useProjects } from "@/lib/hooks/use-resources";
import { api } from "@/lib/api/client";
import { formatMoney } from "@/lib/format";
import { useToast } from "@/components/shared/ToastProvider";
import { useT } from "@/lib/i18n";

type RoleRow = { role: string; available_fte: number; committed_fte: number; forecast_demand: number; bench: number; cost_per_fte: number };
type WeekRow = { week: string; label: string; booked_revenue: number; forecast_revenue: number; pipeline_revenue: number; fte_demand: number; fte_capacity: number };
type ScenarioRow = {
    id: string; name: string; description: string;
    type: string; status: string;
    demand_delta_pct: number; revenue_impact: number; supply_gap: number;
    margin_impact: number; confidence: number; actions: string[];
};

const num = (v: unknown, d = 0) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : d;
};
const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);
const arr = (v: unknown): string[] => Array.isArray(v) ? (v.filter(x => typeof x === "string") as string[]) : [];

/* ══════════════════════════════════════════════════════════════════════════
   🔮 SIOP ENGINE — Sales & Operations Planning
   - KPIs
   - Demand vs Capacity weekly chart
   - Capacity by role (heatmap-like table with utilization)
   - Scenarios with side-by-side compare
   - Run S&OP cycle CTA
   ══════════════════════════════════════════════════════════════════════════ */

type Tab = "overview" | "demand" | "capacity" | "scenarios";

export default function SIOPEnginePage() {
    const t = useT();
    const [tab, setTab] = useState<Tab>("overview");
    const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);
    const [running, setRunning] = useState(false);
    const { toast } = useToast();

    const { data: scenariosData } = useScenarios();
    const { data: capacityData } = useRoleCapacity();
    const { data: forecastData } = useDemandForecast();
    const { data: projectsData } = useProjects();

    const ROLE_CAPACITY: RoleRow[] = useMemo(() => (capacityData ?? []).map(r => ({
        role: r.role,
        available_fte: num(r.available_fte),
        committed_fte: num(r.committed_fte),
        forecast_demand: num(r.forecast_demand),
        bench: num(r.bench),
        cost_per_fte: num(r.cost_per_fte, 12000),
    })), [capacityData]);

    const DEMAND_FORECAST: WeekRow[] = useMemo(() => (forecastData ?? []).map((w, idx) => ({
        week: w.week_start,
        label: w.label ?? `W${idx + 1}`,
        booked_revenue: num(w.booked_revenue),
        forecast_revenue: num(w.forecast_revenue),
        pipeline_revenue: num(w.pipeline_revenue),
        fte_demand: num(w.fte_demand),
        fte_capacity: num(w.fte_capacity),
    })), [forecastData]);

    const SCENARIOS: ScenarioRow[] = useMemo(() => (scenariosData ?? []).map(s => {
        const r = (s.results ?? {}) as Record<string, unknown>;
        const a = (s.assumptions ?? {}) as Record<string, unknown>;
        return {
            id: s.id,
            name: s.name,
            description: s.description ?? "",
            type: str(r.type ?? a.type, "baseline"),
            status: str(r.status, s.is_baseline ? "active" : "draft"),
            demand_delta_pct: num(r.demand_delta_pct ?? a.demand_delta_pct),
            revenue_impact: num(r.revenue_impact),
            supply_gap: num(r.supply_gap),
            margin_impact: num(r.margin_impact),
            confidence: num(r.confidence, 75),
            actions: arr(r.actions),
        };
    }), [scenariosData]);

    const totals = useMemo(() => {
        const totalAvail = ROLE_CAPACITY.reduce((s, r) => s + r.available_fte, 0);
        const totalCommitted = ROLE_CAPACITY.reduce((s, r) => s + r.committed_fte, 0);
        const totalDemand = ROLE_CAPACITY.reduce((s, r) => s + r.forecast_demand, 0);
        const utilization = totalAvail > 0 ? (totalCommitted / totalAvail) * 100 : 0;
        const gap = totalDemand - totalAvail;
        const activeProjects = (projectsData ?? []).filter(p => (p.status ?? "").toLowerCase() === "active").length;
        const bookedRevenue = DEMAND_FORECAST.reduce((s, w) => s + w.booked_revenue, 0);
        const forecastRevenue = DEMAND_FORECAST.reduce((s, w) => s + w.forecast_revenue, 0);
        return { totalAvail, totalCommitted, totalDemand, utilization, gap, activeProjects, bookedRevenue, forecastRevenue };
    }, [ROLE_CAPACITY, DEMAND_FORECAST, projectsData]);

    const handleRunCycle = async () => {
        setRunning(true);
        try {
            const res = await api.post<{ scenarios_created: number; snapshot: { capacity: { gap_fte: number } } }>(
                "/siop-engine/run",
                { horizon_weeks: 12 },
            );
            await globalMutate("/siop-scenarios");
            globalMutate("/audit-log/summary");
            globalMutate("/notifications?limit=30");
            const gap = res.snapshot?.capacity?.gap_fte ?? 0;
            toast({
                title: t("siop.toast_run_ok"),
                description: t("siop.run_desc", { n: res.scenarios_created, gap: gap > 0 ? t("siop.run_gap", { n: gap.toFixed(1) }) : t("siop.run_balanced") }),
                variant: "success",
                duration: 5000,
            });
        } catch (err) {
            toast({
                title: t("siop.toast_run_failed"),
                description: err instanceof Error ? err.message : t("siop.unknown_error"),
                variant: "destructive",
                duration: 6000,
            });
        } finally {
            setRunning(false);
        }
    };

    const toggleScenario = (id: string) => {
        setSelectedScenarios(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id].slice(-3));
    };

    return (
        <div className="p-6">
            {/* Header */}
            <header className="mb-6">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#0891b2]">
                    {t("siop.eyebrow")}
                </p>
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-[28px] font-bold tracking-tight text-[#1d1d1f]">{t("siop.title")}</h1>
                        <p className="mt-0.5 text-[13px] text-[#8e8e93]">
                            {t("siop.subtitle")}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleRunCycle}
                            disabled={running}
                            className="rounded-xl border border-black/[0.08] bg-white px-4 py-2 text-[13px] font-semibold text-[#1d1d1f] hover:bg-black/[0.02] disabled:opacity-60"
                        >
                            {running ? t("siop.btn_running") : t("siop.btn_run")}
                        </button>
                        <Link href="/siop-engine/new" className="rounded-xl bg-gradient-to-br from-[#0891b2] to-[#0e7490] px-4 py-2 text-[13px] font-semibold text-white shadow-lg">
                            {t("siop.btn_new_scenario")}
                        </Link>
                    </div>
                </div>
            </header>

            {/* KPIs */}
            <div className="mb-6 grid grid-cols-4 gap-4">
                <KPI label={t("siop.kpi_utilization")} value={`${totals.utilization.toFixed(0)}%`} sub={`${totals.totalCommitted.toFixed(1)} / ${totals.totalAvail} FTE`} color={totals.utilization > 90 ? "#ff453a" : totals.utilization > 80 ? "#ff9f0a" : "#30d158"} />
                <KPI label={t("siop.kpi_gap")} value={totals.gap > 0 ? `-${totals.gap.toFixed(1)} FTE` : t("siop.kpi_surplus")} sub={totals.gap > 0 ? t("siop.kpi_hiring_needed") : t("siop.kpi_all_good")} color={totals.gap > 0 ? "#ff453a" : "#30d158"} />
                <KPI label={t("siop.kpi_booked")} value={formatMoney(totals.bookedRevenue)} sub={t("siop.kpi_confirmed")} color="#0891b2" />
                <KPI label={t("siop.kpi_forecast")} value={formatMoney(totals.forecastRevenue)} sub={`+${formatMoney(totals.forecastRevenue - totals.bookedRevenue)} pipeline`} color="#5856d6" />
            </div>

            {/* Tabs */}
            <div className="mb-4 flex gap-2 border-b border-black/[0.06]">
                {(["overview", "demand", "capacity", "scenarios"] as Tab[]).map(tk => (
                    <button
                        key={tk}
                        onClick={() => setTab(tk)}
                        className={`px-4 py-2.5 text-[13px] font-medium transition-all ${
                            tab === tk ? "border-b-2 border-[#0891b2] text-[#0891b2]" : "text-[#8e8e93] hover:text-[#1d1d1f]"
                        }`}
                    >
                        {tk === "demand" ? t("siop.tab_demand") : tk === "capacity" ? t("siop.tab_capacity") : tk === "scenarios" ? `${t("siop.tab_scenarios")} (${SCENARIOS.length})` : t("siop.tab_overview")}
                    </button>
                ))}
            </div>

            {tab === "overview" && (
                <div className="grid gap-4 lg:grid-cols-2">
                    <DemandChart compact data={DEMAND_FORECAST} />
                    <CapacityHeatmap compact data={ROLE_CAPACITY} />
                </div>
            )}

            {tab === "demand" && <DemandChart data={DEMAND_FORECAST} />}
            {tab === "capacity" && <CapacityHeatmap data={ROLE_CAPACITY} />}

            {tab === "scenarios" && (
                <div>
                    {selectedScenarios.length >= 2 && <ScenarioCompare ids={selectedScenarios} scenarios={SCENARIOS} />}
                    <ScenariosTable selected={selectedScenarios} onToggle={toggleScenario} scenarios={SCENARIOS} />
                </div>
            )}
        </div>
    );
}

/* ────────────── Components ────────────── */

function KPI({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
    return (
        <div className="rounded-2xl border border-black/[0.06] bg-white/60 p-4 backdrop-blur">
            <p className="mb-1 text-[11px] font-medium text-[#8e8e93]">{label}</p>
            <p className="mb-1 text-[26px] font-bold tracking-tight" style={{ color }}>{value}</p>
            <p className="text-[11px] text-[#8e8e93]">{sub}</p>
        </div>
    );
}

function DemandChart({ compact, data }: { compact?: boolean; data: WeekRow[] }) {
    const t = useT();
    if (data.length === 0) {
        return <div className="rounded-2xl border border-black/[0.06] bg-white/60 p-8 text-center text-[12px] text-[#8e8e93]">{t("siop.no_demand")}</div>;
    }
    const max = Math.max(...data.map(w => w.forecast_revenue + w.pipeline_revenue), 1);
    const visible = compact ? data.slice(0, 8) : data;

    return (
        <div className="rounded-2xl border border-black/[0.06] bg-white/60 p-5 backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-[#1d1d1f]">{t("siop.demand_chart_title")}</h2>
                <Legend items={[
                    { color: "#0891b2", label: t("siop.legend_booked") },
                    { color: "#5856d6", label: t("siop.legend_forecast") },
                    { color: "#ff9f0a", label: t("siop.legend_pipeline") },
                ]} />
            </div>

            {/* Stacked bars */}
            <div className="flex h-48 items-end gap-1.5">
                {visible.map(w => {
                    const bookedH = (w.booked_revenue / max) * 100;
                    const forecastH = ((w.forecast_revenue - w.booked_revenue) / max) * 100;
                    const pipelineH = (w.pipeline_revenue / max) * 100;
                    return (
                        <div key={w.week} className="group flex flex-1 flex-col items-center gap-1">
                            <div className="relative flex w-full flex-1 flex-col-reverse rounded-t-md bg-black/[0.02] overflow-hidden">
                                <div style={{ height: `${bookedH}%`, background: "#0891b2" }} title={t("siop.tt_booked", { v: formatMoney(w.booked_revenue) })} />
                                <div style={{ height: `${forecastH}%`, background: "#5856d6" }} title={t("siop.tt_forecast", { v: formatMoney(w.forecast_revenue - w.booked_revenue) })} />
                                <div style={{ height: `${pipelineH}%`, background: "#ff9f0a", opacity: 0.7 }} title={t("siop.tt_pipeline", { v: formatMoney(w.pipeline_revenue) })} />
                                <div className="absolute -top-12 left-1/2 z-10 hidden -translate-x-1/2 rounded-lg bg-[#1d1d1f] px-2 py-1 text-[10px] text-white group-hover:block">
                                    {formatMoney(w.forecast_revenue + w.pipeline_revenue)}
                                </div>
                            </div>
                            <p className="rotate-[-30deg] origin-top-left text-[9px] text-[#8e8e93] whitespace-nowrap">{w.label}</p>
                        </div>
                    );
                })}
            </div>

            {/* Capacity line summary */}
            <div className="mt-6 grid grid-cols-3 gap-3 border-t border-black/[0.04] pt-4 text-[12px]">
                <div>
                    <p className="text-[10px] text-[#8e8e93]">{t("siop.avg_fte_demand")}</p>
                    <p className="text-[16px] font-bold text-[#1d1d1f]">{visible.length ? (visible.reduce((s, w) => s + w.fte_demand, 0) / visible.length).toFixed(1) : "—"}</p>
                </div>
                <div>
                    <p className="text-[10px] text-[#8e8e93]">{t("siop.avg_fte_capacity")}</p>
                    <p className="text-[16px] font-bold text-[#1d1d1f]">{visible.length ? (visible.reduce((s, w) => s + w.fte_capacity, 0) / visible.length).toFixed(1) : "—"}</p>
                </div>
                <div>
                    <p className="text-[10px] text-[#8e8e93]">{t("siop.peak_gap")}</p>
                    <p className="text-[16px] font-bold text-[#ff453a]">
                        {visible.length ? Math.max(...visible.map(w => w.fte_demand - w.fte_capacity)).toFixed(1) : "0"} FTE
                    </p>
                </div>
            </div>
        </div>
    );
}

function CapacityHeatmap({ compact, data }: { compact?: boolean; data: RoleRow[] }) {
    const t = useT();
    if (data.length === 0) {
        return <div className="rounded-2xl border border-black/[0.06] bg-white/60 p-8 text-center text-[12px] text-[#8e8e93]">{t("siop.no_capacity")}</div>;
    }
    const visible = compact ? data.slice(0, 5) : data;

    return (
        <div className="rounded-2xl border border-black/[0.06] bg-white/60 p-5 backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-[#1d1d1f]">{t("siop.capacity_by_role")}</h2>
                <p className="text-[11px] text-[#8e8e93]">{t("siop.capacity_subtitle")}</p>
            </div>

            <div className="space-y-3">
                {visible.map(r => {
                    const utilPct = r.available_fte > 0 ? (r.committed_fte / r.available_fte) * 100 : 0;
                    const demandPct = r.available_fte > 0 ? (r.forecast_demand / r.available_fte) * 100 : 0;
                    const gap = r.forecast_demand - r.available_fte;
                    return (
                        <div key={r.role}>
                            <div className="mb-1 flex items-center justify-between text-[12px]">
                                <span className="font-semibold text-[#1d1d1f]">{r.role}</span>
                                <div className="flex items-center gap-3 text-[11px]">
                                    <span className="text-[#8e8e93]">{r.committed_fte}/{r.available_fte} FTE</span>
                                    <span className={gap > 0 ? "font-bold text-[#ff453a]" : "text-[#30d158]"}>
                                        {gap > 0 ? t("siop.need_plus", { n: gap }) : t("siop.ok")}
                                    </span>
                                </div>
                            </div>
                            <div className="relative h-6 overflow-hidden rounded-lg bg-black/[0.04]">
                                {/* committed */}
                                <div
                                    className="absolute inset-y-0 left-0 rounded-l-lg"
                                    style={{
                                        width: `${Math.min(utilPct, 100)}%`,
                                        background: utilPct > 95 ? "#ff453a" : utilPct > 80 ? "#ff9f0a" : "#30d158",
                                    }}
                                />
                                {/* demand marker line */}
                                <div
                                    className="absolute inset-y-0 w-0.5 bg-[#5856d6]"
                                    style={{ left: `${Math.min(demandPct, 100)}%` }}
                                    title={t("siop.tt_demand_marker", { v: r.forecast_demand })}
                                />
                                {/* labels */}
                                <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px] font-semibold">
                                    <span className="text-white">{t("siop.util_label", { n: utilPct.toFixed(0) })}</span>
                                    <span className="text-[#5856d6]">{t("siop.demand_arrow", { n: r.forecast_demand })}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 flex justify-between border-t border-black/[0.04] pt-3 text-[11px] text-[#8e8e93]">
                <span>{t("siop.bench_label", { n: data.reduce((s, r) => s + r.bench, 0).toFixed(1) })}</span>
                <span>{t("siop.cost_basis", { v: formatMoney(data.reduce((s, r) => s + r.committed_fte * r.cost_per_fte, 0)) })}</span>
            </div>
        </div>
    );
}

function ScenariosTable({ selected, onToggle, scenarios }: { selected: string[]; onToggle: (id: string) => void; scenarios: ScenarioRow[] }) {
    const t = useT();
    return (
        <div className="rounded-2xl border border-black/[0.06] bg-white/60 backdrop-blur">
            <div className="flex items-center justify-between border-b border-black/[0.04] px-5 py-3">
                <h2 className="text-[15px] font-semibold text-[#1d1d1f]">{t("siop.scenarios_title")}</h2>
                <p className="text-[11px] text-[#8e8e93]">{t("siop.select_compare")}</p>
            </div>
            <table className="w-full">
                <thead>
                    <tr className="border-b border-black/[0.04] text-left text-[11px] uppercase text-[#8e8e93]">
                        <th className="px-3 py-2 w-8"></th>
                        <th className="px-3 py-2">{t("siop.col_scenario")}</th>
                        <th className="px-3 py-2">{t("siop.col_type")}</th>
                        <th className="px-3 py-2">{t("siop.col_demand_delta")}</th>
                        <th className="px-3 py-2">{t("siop.col_revenue_impact")}</th>
                        <th className="px-3 py-2">{t("siop.col_supply_gap")}</th>
                        <th className="px-3 py-2">{t("siop.col_margin_delta")}</th>
                        <th className="px-3 py-2">{t("siop.col_confidence")}</th>
                        <th className="px-3 py-2">{t("siop.col_status")}</th>
                    </tr>
                </thead>
                <tbody>
                    {scenarios.map(s => {
                        const isSel = selected.includes(s.id);
                        return (
                            <tr key={s.id} className={`border-b border-black/[0.03] last:border-0 hover:bg-black/[0.02] ${isSel ? "bg-[#0891b2]/5" : ""}`}>
                                <td className="px-3 py-3">
                                    <input type="checkbox" checked={isSel} onChange={() => onToggle(s.id)} />
                                </td>
                                <td className="px-3 py-3">
                                    <p className="text-[13px] font-semibold text-[#1d1d1f]">{s.name}</p>
                                    <p className="text-[11px] text-[#8e8e93]">{s.description}</p>
                                </td>
                                <td className="px-3 py-3">
                                    <TypeBadge type={s.type} />
                                </td>
                                <td className={`px-3 py-3 text-[12px] font-semibold ${s.demand_delta_pct > 0 ? "text-[#30d158]" : s.demand_delta_pct < 0 ? "text-[#ff453a]" : "text-[#8e8e93]"}`}>
                                    {s.demand_delta_pct > 0 ? "+" : ""}{s.demand_delta_pct}%
                                </td>
                                <td className={`px-3 py-3 text-[12px] font-semibold ${s.revenue_impact > 0 ? "text-[#30d158]" : s.revenue_impact < 0 ? "text-[#ff453a]" : "text-[#8e8e93]"}`}>
                                    {s.revenue_impact > 0 ? "+" : s.revenue_impact < 0 ? "-" : ""}{formatMoney(Math.abs(s.revenue_impact))}
                                </td>
                                <td className={`px-3 py-3 text-[12px] ${s.supply_gap > 0 ? "font-semibold text-[#ff9f0a]" : "text-[#8e8e93]"}`}>
                                    {s.supply_gap > 0 ? formatMoney(s.supply_gap) : "—"}
                                </td>
                                <td className={`px-3 py-3 text-[12px] font-semibold ${s.margin_impact > 0 ? "text-[#30d158]" : s.margin_impact < 0 ? "text-[#ff453a]" : "text-[#8e8e93]"}`}>
                                    {s.margin_impact > 0 ? "+" : ""}{s.margin_impact}pp
                                </td>
                                <td className="px-3 py-3">
                                    <ConfidenceBar confidence={s.confidence} />
                                </td>
                                <td className="px-3 py-3">
                                    <StatusBadge status={s.status} />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function ScenarioCompare({ ids, scenarios }: { ids: string[]; scenarios: ScenarioRow[] }) {
    const t = useT();
    const list = scenarios.filter(s => ids.includes(s.id));
    return (
        <div className="mb-4 rounded-2xl border border-[#0891b2]/30 bg-[#0891b2]/5 p-5">
            <h3 className="mb-3 text-[14px] font-semibold text-[#0891b2]">{t("siop.compare_title")}</h3>
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${list.length}, 1fr)` }}>
                {list.map(s => (
                    <div key={s.id} className="rounded-xl bg-white p-3">
                        <p className="text-[13px] font-semibold text-[#1d1d1f]">{s.name}</p>
                        <TypeBadge type={s.type} />
                        <div className="mt-3 space-y-1.5 text-[11px]">
                            <Row label={t("siop.row_revenue")} value={formatMoney(Math.abs(s.revenue_impact))} positive={s.revenue_impact >= 0} />
                            <Row label={t("siop.row_supply_gap")} value={s.supply_gap > 0 ? formatMoney(s.supply_gap) : t("siop.row_none")} positive={s.supply_gap === 0} />
                            <Row label={t("siop.row_margin")} value={`${s.margin_impact > 0 ? "+" : ""}${s.margin_impact}pp`} positive={s.margin_impact >= 0} />
                            <Row label={t("siop.row_confidence")} value={`${s.confidence}%`} positive={s.confidence >= 75} />
                        </div>
                        <p className="mt-3 text-[10px] font-semibold uppercase text-[#8e8e93]">{t("siop.key_actions")}</p>
                        <ul className="mt-1 list-disc pl-4 text-[10px] text-[#636366]">
                            {s.actions.map(a => <li key={a}>{a}</li>)}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
}

function Row({ label, value, positive }: { label: string; value: string; positive: boolean }) {
    return (
        <div className="flex justify-between">
            <span className="text-[#8e8e93]">{label}</span>
            <span className={`font-semibold ${positive ? "text-[#30d158]" : "text-[#ff453a]"}`}>{value}</span>
        </div>
    );
}

function ConfidenceBar({ confidence }: { confidence: number }) {
    const color = confidence >= 85 ? "#30d158" : confidence >= 65 ? "#ff9f0a" : "#ff453a";
    return (
        <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-black/5">
                <div className="h-full" style={{ width: `${confidence}%`, background: color }} />
            </div>
            <span className="text-[11px] text-[#636366]">{confidence}%</span>
        </div>
    );
}

function TypeBadge({ type }: { type: string }) {
    const t = useT();
    const map: Record<string, { bg: string; color: string; key: string }> = {
        baseline: { bg: "rgba(8, 145, 178, 0.12)", color: "#0891b2", key: "siop.type_baseline" },
        upside: { bg: "rgba(48, 209, 88, 0.12)", color: "#248a3d", key: "siop.type_upside" },
        downside: { bg: "rgba(255, 159, 10, 0.12)", color: "#c93400", key: "siop.type_downside" },
        event: { bg: "rgba(0, 122, 255, 0.12)", color: "#0040dd", key: "siop.type_event" },
        risk: { bg: "rgba(255, 69, 58, 0.12)", color: "#ff453a", key: "siop.type_risk" },
    };
    const s = map[type] ?? map.baseline;
    return <span className="inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase" style={{ background: s.bg, color: s.color }}>{t(s.key)}</span>;
}

function StatusBadge({ status }: { status: string }) {
    const t = useT();
    const map: Record<string, { bg: string; color: string; key: string }> = {
        active: { bg: "rgba(48, 209, 88, 0.12)", color: "#248a3d", key: "siop.status_active" },
        modeling: { bg: "rgba(191, 90, 242, 0.12)", color: "#8944ab", key: "siop.status_modeling" },
        complete: { bg: "rgba(0, 122, 255, 0.12)", color: "#0040dd", key: "siop.status_complete" },
        draft: { bg: "rgba(142, 142, 147, 0.12)", color: "#636366", key: "siop.status_draft" },
    };
    const s = map[status] ?? map.draft;
    return <span className="inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase" style={{ background: s.bg, color: s.color }}>{t(s.key)}</span>;
}

function Legend({ items }: { items: { color: string; label: string }[] }) {
    return (
        <div className="flex gap-3">
            {items.map(i => (
                <div key={i.label} className="flex items-center gap-1 text-[10px] text-[#636366]">
                    <span className="h-2 w-2 rounded-full" style={{ background: i.color }} />
                    {i.label}
                </div>
            ))}
        </div>
    );
}
