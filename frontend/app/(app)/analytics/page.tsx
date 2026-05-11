"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { useClients, useDeals, useProjects, useInvoices, useMeetings, useContracts, useRfqs, useInsights, useDemandForecast } from "@/lib/hooks/use-resources";
import { fetcher } from "@/lib/api/client";
import { formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";

type Period = "30d" | "90d" | "ytd" | "12m";

type OpsDashboard = {
    period: string;
    since: string;
    operations: {
        approvals_by_status: { status: string; count: number }[];
        insights_by_severity: { severity: string; open: number; total: number }[];
        audit_total: number;
        audit_in_period: number;
        audit_by_module: { module: string; count: number }[];
        audit_by_day: { day: string; count: number }[];
    };
};

const stageEq = (a: string | null | undefined, b: string) => (a ?? "").toLowerCase() === b.toLowerCase();
const healthBucket = (score: number): "green" | "yellow" | "red" | "gray" => {
    if (score >= 80) return "green";
    if (score >= 60) return "yellow";
    if (score > 0) return "red";
    return "gray";
};
const tierFromArr = (arr: number): "platinum" | "gold" | "silver" | "bronze" => {
    if (arr >= 750000) return "platinum";
    if (arr >= 300000) return "gold";
    if (arr >= 100000) return "silver";
    return "bronze";
};

export default function AnalyticsPage() {
    const t = useT();
    const [period, setPeriod] = useState<Period>("90d");

    const { data: CLIENTS = [] } = useClients();
    const { data: DEALS = [] } = useDeals();
    const { data: PROJECTS = [] } = useProjects();
    const { data: INVOICES = [] } = useInvoices();
    const { data: MEETINGS = [] } = useMeetings();
    const { data: CONTRACTS = [] } = useContracts();
    const { data: RFQS = [] } = useRfqs();
    const { data: INSIGHTS = [] } = useInsights();
    const { data: DEMAND_FORECAST = [] } = useDemandForecast();
    const { data: ops } = useSWR<OpsDashboard>(`/analytics/dashboard?period=${period}`, fetcher, { refreshInterval: 60_000 });

    const m = useMemo(() => {
        const wonDeals = DEALS.filter(d => stageEq(d.stage, "Won"));
        const lostDeals = DEALS.filter(d => stageEq(d.stage, "Lost"));
        const winRate = ((wonDeals.length) / Math.max(wonDeals.length + lostDeals.length, 1)) * 100;
        const pipelineValue = DEALS.filter(d => !stageEq(d.stage, "Won") && !stageEq(d.stage, "Lost")).reduce((s, d) => s + Number(d.value ?? 0), 0);
        const avgDealSize = wonDeals.reduce((s, d) => s + Number(d.value ?? 0), 0) / Math.max(wonDeals.length, 1);

        const activeProjects = PROJECTS.filter(p => stageEq(p.status, "active"));
        const avgProgress = activeProjects.reduce((s, p) => s + Number(p.progress ?? 0), 0) / Math.max(activeProjects.length, 1);
        const onTime = PROJECTS.filter(p => healthBucket(Number(p.health_score ?? 0)) === "green").length;
        const onTimePct = PROJECTS.length ? (onTime / PROJECTS.length) * 100 : 0;

        const paidRevenue = INVOICES.filter(i => stageEq(i.status, "paid")).reduce((s, i) => s + Number(i.amount ?? 0), 0);
        const outstandingRevenue = INVOICES.filter(i => stageEq(i.status, "sent") || stageEq(i.status, "overdue")).reduce((s, i) => s + Number(i.amount ?? 0), 0);
        const totalARR = CLIENTS.reduce((s, c) => s + Number((c as { arr?: number }).arr ?? 0), 0);

        const avgHealth = CLIENTS.length ? CLIENTS.reduce((s, c) => s + Number((c as { health_score?: number }).health_score ?? 0), 0) / CLIENTS.length : 0;
        const avgNPS = CLIENTS.length ? CLIENTS.reduce((s, c) => s + Number((c as { nps?: number }).nps ?? 0), 0) / CLIENTS.length : 0;

        const marginActuals = activeProjects.map(p => {
            const b = Number(p.budget ?? 0);
            const sp = Number(p.spent ?? 0);
            return b > 0 ? Math.max(0, Math.round(((b - sp) / b) * 100)) : 0;
        });
        const avgMargin = marginActuals.length ? marginActuals.reduce((a, b) => a + b, 0) / marginActuals.length : 0;
        const targetMargin = 35;

        return {
            winRate, pipelineValue, avgDealSize, wonDeals: wonDeals.length,
            avgProgress, onTimePct, activeProjects: activeProjects.length,
            paidRevenue, outstandingRevenue, totalARR,
            avgHealth, avgNPS,
            avgMargin, targetMargin,
            totalMeetings: MEETINGS.length,
            totalContracts: CONTRACTS.filter(c => stageEq(c.status, "signed")).length,
            totalRFQs: RFQS.length,
        };
    }, [CLIENTS, DEALS, PROJECTS, INVOICES, MEETINGS, CONTRACTS, RFQS]);

    return (
        <div className="p-6">
            <header className="mb-6 flex items-end justify-between">
                <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#475569]">{t("analytics.eyebrow")}</p>
                    <h1 className="text-[28px] font-bold tracking-tight text-[#1d1d1f]">{t("analytics.title")}</h1>
                    <p className="mt-0.5 text-[13px] text-[#8e8e93]">{t("analytics.subtitle")}</p>
                </div>
                <div className="flex gap-1 rounded-xl border border-black/[0.08] bg-white p-1">
                    {(["30d", "90d", "ytd", "12m"] as Period[]).map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase ${
                                period === p ? "bg-[#475569] text-white" : "text-[#636366] hover:bg-black/[0.03]"
                            }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </header>

            {/* Top KPIs */}
            <div className="mb-6 grid grid-cols-4 gap-4">
                <KPI label={t("analytics.kpi_arr")} value={formatMoney(m.totalARR)} sub={t("analytics.clients_count", { n: CLIENTS.length })} color="#0d9488" trend={+12} />
                <KPI label={t("analytics.kpi_pipeline")} value={formatMoney(m.pipelineValue)} sub={t("analytics.open_deals", { n: DEALS.length - m.wonDeals })} color="#0a84ff" trend={+8} />
                <KPI label={t("analytics.kpi_winrate")} value={`${m.winRate.toFixed(0)}%`} sub={t("analytics.won", { n: m.wonDeals })} color="#30d158" trend={+5} />
                <KPI label={t("analytics.kpi_deal_size")} value={formatMoney(m.avgDealSize)} sub={t("analytics.closed_won")} color="#5856d6" trend={-2} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Pipeline Funnel */}
                <Card title={t("analytics.card_pipeline")}>
                    <PipelineFunnel deals={DEALS} />
                </Card>

                {/* Revenue Forecast */}
                <Card title={t("analytics.card_revenue")}>
                    <RevenueChart forecast={DEMAND_FORECAST} />
                </Card>

                {/* Project Health */}
                <Card title={t("analytics.card_health")}>
                    <ProjectHealthDistribution projects={PROJECTS} />
                </Card>

                {/* Customer Tier */}
                <Card title={t("analytics.card_tier")}>
                    <ClientsByTier clients={CLIENTS} />
                </Card>

                {/* Margin */}
                <Card title={t("analytics.card_margin")}>
                    <MarginByProject projects={PROJECTS} />
                </Card>

                {/* Insights summary */}
                <Card title={t("analytics.card_insights")}>
                    <InsightsSummary insights={INSIGHTS} />
                </Card>
            </div>

            {/* Bottom row big KPIs */}
            <div className="mt-6 grid grid-cols-6 gap-3">
                <SmallKPI label={t("analytics.bottom_active")} value={`${m.activeProjects}`} />
                <SmallKPI label={t("analytics.bottom_ontime")} value={`${m.onTimePct.toFixed(0)}%`} />
                <SmallKPI label={t("analytics.bottom_health")} value={`${m.avgHealth.toFixed(0)}`} />
                <SmallKPI label={t("analytics.bottom_nps")} value={`${m.avgNPS.toFixed(0)}`} />
                <SmallKPI label={t("analytics.bottom_meetings")} value={`${m.totalMeetings}`} />
                <SmallKPI label={t("analytics.bottom_contracts")} value={`${m.totalContracts}`} />
            </div>

            {/* Operations Activity (Days 12–15) */}
            <div className="mt-8">
                <h2 className="mb-3 text-[16px] font-semibold text-[#1d1d1f]">{t("analytics.ops")}</h2>
                <div className="grid gap-6 lg:grid-cols-3">
                    <Card title={t("analytics.ops_audit_day")}>
                        <AuditSparkline data={ops?.operations.audit_by_day ?? []} totalInPeriod={ops?.operations.audit_in_period ?? 0} totalAll={ops?.operations.audit_total ?? 0} />
                    </Card>
                    <Card title={t("analytics.ops_audit_module")}>
                        <AuditByModule data={ops?.operations.audit_by_module ?? []} />
                    </Card>
                    <Card title={t("analytics.ops_approvals")}>
                        <OpsBreakdown
                            approvals={ops?.operations.approvals_by_status ?? []}
                            insights={ops?.operations.insights_by_severity ?? []}
                        />
                    </Card>
                </div>
            </div>
        </div>
    );
}

/* ─────────── Charts (CSS only) ─────────── */

function PipelineFunnel({ deals }: { deals: Array<{ stage: string; value?: number | null }> }) {
    const stages = ["Qualified Lead", "Discovery", "RFQ Submitted", "Demo Done", "Proposal Sent", "Negotiation"] as const;
    const data = stages.map(stage => ({
        stage,
        count: deals.filter(d => stageEq(d.stage, stage)).length,
        value: deals.filter(d => stageEq(d.stage, stage)).reduce((s, d) => s + Number(d.value ?? 0), 0),
    }));
    const max = Math.max(...data.map(d => d.value), 1);

    return (
        <div className="space-y-2">
            {data.map(d => (
                <div key={d.stage}>
                    <div className="mb-1 flex justify-between text-[11px]">
                        <span className="font-medium text-[#1d1d1f]">{d.stage}</span>
                        <span className="text-[#8e8e93]">{d.count} · {formatMoney(d.value)}</span>
                    </div>
                    <div className="h-6 overflow-hidden rounded-lg bg-black/[0.04]">
                        <div className="flex h-full items-center px-2 text-[10px] font-semibold text-white" style={{
                            width: `${(d.value / max) * 100}%`,
                            minWidth: d.value > 0 ? "40px" : "0",
                            background: "linear-gradient(90deg, #0a84ff, #5856d6)",
                        }}>
                            {d.value > 0 && formatMoney(d.value)}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function RevenueChart({ forecast }: { forecast: Array<{ week_start: string; label?: string | null; booked_revenue?: number | null; forecast_revenue?: number | null }> }) {
    const t = useT();
    if (forecast.length === 0) return <div className="py-8 text-center text-[12px] text-[#8e8e93]">{t("analytics.no_forecast")}</div>;
    const max = Math.max(...forecast.map(w => Number(w.forecast_revenue ?? 0)), 1);
    return (
        <div>
            <div className="flex h-40 items-end gap-1">
                {forecast.map(w => {
                    const booked = Number(w.booked_revenue ?? 0);
                    const fc = Number(w.forecast_revenue ?? 0);
                    const label = w.label ?? "";
                    return (
                        <div key={w.week_start} className="group flex flex-1 flex-col items-center gap-1">
                            <div className="flex w-full flex-col-reverse rounded-t-sm bg-black/[0.02]" style={{ height: "100%" }}>
                                <div style={{ height: `${(booked / max) * 100}%`, background: "#0d9488" }} />
                                <div style={{ height: `${((fc - booked) / max) * 100}%`, background: "#0a84ff", opacity: 0.7 }} />
                            </div>
                            <p className="text-[8px] text-[#8e8e93]">{label.split(" ")[1] ?? label}</p>
                        </div>
                    );
                })}
            </div>
            <div className="mt-3 flex justify-center gap-4 text-[10px] text-[#636366]">
                <span><span className="inline-block h-2 w-2 rounded-full bg-[#0d9488]" /> {t("analytics.legend_booked")}</span>
                <span><span className="inline-block h-2 w-2 rounded-full bg-[#0a84ff]" /> {t("analytics.legend_forecast")}</span>
            </div>
        </div>
    );
}

function ProjectHealthDistribution({ projects }: { projects: Array<{ health_score?: number | null }> }) {
    const t = useT();
    const dist = {
        green: projects.filter(p => healthBucket(Number(p.health_score ?? 0)) === "green").length,
        yellow: projects.filter(p => healthBucket(Number(p.health_score ?? 0)) === "yellow").length,
        red: projects.filter(p => healthBucket(Number(p.health_score ?? 0)) === "red").length,
        gray: projects.filter(p => healthBucket(Number(p.health_score ?? 0)) === "gray").length,
    };
    const total = Math.max(projects.length, 1);
    return (
        <div>
            <div className="mb-3 flex h-6 overflow-hidden rounded-lg">
                <div style={{ width: `${(dist.green / total) * 100}%`, background: "#30d158" }} title={`${t("analytics.health_green")}: ${dist.green}`} />
                <div style={{ width: `${(dist.yellow / total) * 100}%`, background: "#ff9f0a" }} title={`${t("analytics.health_yellow")}: ${dist.yellow}`} />
                <div style={{ width: `${(dist.red / total) * 100}%`, background: "#ff453a" }} title={`${t("analytics.health_red")}: ${dist.red}`} />
                <div style={{ width: `${(dist.gray / total) * 100}%`, background: "#8e8e93" }} title={`${t("analytics.health_planning")}: ${dist.gray}`} />
            </div>
            <div className="grid grid-cols-4 gap-2 text-[11px]">
                <Tile color="#30d158" label={t("analytics.health_green")} count={dist.green} />
                <Tile color="#ff9f0a" label={t("analytics.health_yellow")} count={dist.yellow} />
                <Tile color="#ff453a" label={t("analytics.health_red")} count={dist.red} />
                <Tile color="#8e8e93" label={t("analytics.health_planning")} count={dist.gray} />
            </div>
        </div>
    );
}

function Tile({ color, label, count }: { color: string; label: string; count: number }) {
    return (
        <div className="rounded-lg bg-black/[0.02] p-2 text-center">
            <p className="text-[18px] font-bold" style={{ color }}>{count}</p>
            <p className="text-[10px] text-[#8e8e93]">{label}</p>
        </div>
    );
}

function ClientsByTier({ clients: clientList }: { clients: Array<{ id: string; arr?: number | null }> }) {
    const t = useT();
    const tiers = ["platinum", "gold", "silver", "bronze"] as const;
    const colors = { platinum: "#bf5af2", gold: "#ff9f0a", silver: "#8e8e93", bronze: "#a16207" };
    const tierLabel = { platinum: t("analytics.tier_platinum"), gold: t("analytics.tier_gold"), silver: t("analytics.tier_silver"), bronze: t("analytics.tier_bronze") };
    const withTier = clientList.map(c => ({ ...c, tier: tierFromArr(Number(c.arr ?? 0)) }));
    const total = Math.max(withTier.reduce((s, c) => s + Number(c.arr ?? 0), 0), 1);
    return (
        <div className="space-y-2">
            {tiers.map(tk => {
                const clients = withTier.filter(c => c.tier === tk);
                const arr = clients.reduce((s, c) => s + Number(c.arr ?? 0), 0);
                if (clients.length === 0) return null;
                return (
                    <div key={tk}>
                        <div className="mb-1 flex justify-between text-[11px]">
                            <span className="font-medium text-[#1d1d1f]">{t("analytics.tier_with_count", { tier: tierLabel[tk], n: clients.length })}</span>
                            <span className="text-[#8e8e93]">{formatMoney(arr)}</span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-black/[0.04]">
                            <div className="h-full" style={{ width: `${(arr / total) * 100}%`, background: colors[tk] }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function MarginByProject({ projects }: { projects: Array<{ id: string; name: string; status: string; budget?: number | null; spent?: number | null }> }) {
    const t = useT();
    const target = 35;
    const data = projects.filter(p => stageEq(p.status, "active")).slice(0, 6).map(p => {
        const b = Number(p.budget ?? 0);
        const sp = Number(p.spent ?? 0);
        const actual = b > 0 ? Math.max(0, Math.round(((b - sp) / b) * 100)) : 0;
        return { id: p.id, name: p.name, margin_actual: actual, margin_target: target };
    });
    return (
        <div className="space-y-2">
            {data.map(p => (
                <div key={p.id}>
                    <div className="mb-1 flex justify-between text-[11px]">
                        <span className="font-medium text-[#1d1d1f] truncate max-w-[60%]">{p.name}</span>
                        <span className={p.margin_actual >= p.margin_target ? "text-[#30d158]" : "text-[#ff9f0a]"}>
                            {t("analytics.margin_target", { a: p.margin_actual, t: p.margin_target })}
                        </span>
                    </div>
                    <div className="relative h-2 overflow-hidden rounded-full bg-black/[0.04]">
                        <div className="absolute inset-y-0 left-0" style={{ width: `${p.margin_actual}%`, background: p.margin_actual >= p.margin_target ? "#30d158" : "#ff9f0a" }} />
                        <div className="absolute inset-y-0 w-0.5 bg-[#1d1d1f]" style={{ left: `${p.margin_target}%` }} />
                    </div>
                </div>
            ))}
        </div>
    );
}

function InsightsSummary({ insights }: { insights: Array<{ severity?: string | null }> }) {
    const t = useT();
    const sev = (s: string | null | undefined) => (s ?? "info").toLowerCase();
    const counts = {
        critical: insights.filter(i => sev(i.severity) === "critical" || sev(i.severity) === "high").length,
        warning: insights.filter(i => sev(i.severity) === "warning" || sev(i.severity) === "medium").length,
        info: insights.filter(i => sev(i.severity) === "info" || sev(i.severity) === "low").length,
        success: insights.filter(i => sev(i.severity) === "success").length,
    };
    return (
        <div className="grid grid-cols-2 gap-3">
            <SeverityTile color="#ff453a" icon="🔴" label={t("analytics.sev_critical")} count={counts.critical} />
            <SeverityTile color="#ff9f0a" icon="🟡" label={t("analytics.sev_warning")} count={counts.warning} />
            <SeverityTile color="#0a84ff" icon="🔵" label={t("analytics.sev_info")} count={counts.info} />
            <SeverityTile color="#30d158" icon="🟢" label={t("analytics.sev_success")} count={counts.success} />
        </div>
    );
}

function SeverityTile({ color, icon, label, count }: { color: string; icon: string; label: string; count: number }) {
    return (
        <div className="rounded-xl border border-black/[0.06] bg-black/[0.01] p-3">
            <div className="flex items-center justify-between">
                <span className="text-[18px]">{icon}</span>
                <span className="text-[24px] font-bold" style={{ color }}>{count}</span>
            </div>
            <p className="mt-1 text-[10px] font-semibold uppercase text-[#8e8e93]">{label}</p>
        </div>
    );
}

/* ─────────── Operations Activity (Day 16) ─────────── */

function AuditSparkline({ data, totalInPeriod, totalAll }: { data: { day: string; count: number }[]; totalInPeriod: number; totalAll: number }) {
    const t = useT();
    if (data.length === 0) {
        return <div className="py-8 text-center text-[12px] text-[#8e8e93]">{t("analytics.audit_no_period")}</div>;
    }
    const max = Math.max(...data.map(d => d.count), 1);
    return (
        <div>
            <div className="mb-3 flex items-baseline gap-3">
                <p className="text-[26px] font-bold text-[#475569]">{totalInPeriod.toLocaleString()}</p>
                <p className="text-[11px] text-[#8e8e93]">{t("analytics.audit_summary", { n: totalAll.toLocaleString() })}</p>
            </div>
            <div className="flex h-24 items-end gap-[2px]">
                {data.map(d => (
                    <div
                        key={d.day}
                        className="group relative flex-1 rounded-t-sm bg-[#475569]/80 hover:bg-[#475569]"
                        style={{ height: `${Math.max((d.count / max) * 100, 4)}%` }}
                        title={`${d.day} · ${d.count}`}
                    />
                ))}
            </div>
            <div className="mt-2 flex justify-between text-[9px] text-[#8e8e93]">
                <span>{data[0]?.day.slice(5)}</span>
                <span>{data[data.length - 1]?.day.slice(5)}</span>
            </div>
        </div>
    );
}

function AuditByModule({ data }: { data: { module: string; count: number }[] }) {
    const t = useT();
    if (data.length === 0) {
        return <div className="py-8 text-center text-[12px] text-[#8e8e93]">{t("analytics.no_module")}</div>;
    }
    const max = Math.max(...data.map(d => d.count), 1);
    return (
        <div className="space-y-2">
            {data.map(d => (
                <div key={d.module}>
                    <div className="mb-1 flex justify-between text-[11px]">
                        <span className="font-medium text-[#1d1d1f]">{d.module}</span>
                        <span className="text-[#8e8e93]">{d.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-black/[0.04]">
                        <div className="h-full" style={{ width: `${(d.count / max) * 100}%`, background: "#475569" }} />
                    </div>
                </div>
            ))}
        </div>
    );
}

function OpsBreakdown({
    approvals,
    insights,
}: {
    approvals: { status: string; count: number }[];
    insights: { severity: string; open: number; total: number }[];
}) {
    const t = useT();
    const approvalColor = (s: string) => ({ PENDING: "#ff9f0a", APPROVED: "#30d158", REJECTED: "#ff453a" }[s.toUpperCase()] ?? "#8e8e93");
    const sevColor = (s: string) => ({ CRITICAL: "#ff453a", HIGH: "#ff9f0a", MEDIUM: "#ffd60a", LOW: "#0a84ff", INFO: "#8e8e93" }[s.toUpperCase()] ?? "#8e8e93");

    const totalApprovals = approvals.reduce((s, a) => s + a.count, 0);
    const totalInsights = insights.reduce((s, i) => s + i.total, 0);
    const openInsights = insights.reduce((s, i) => s + i.open, 0);

    return (
        <div className="space-y-4">
            <div>
                <div className="mb-2 flex justify-between text-[11px] font-semibold uppercase text-[#8e8e93]">
                    <span>{t("analytics.ops_approvals_lbl")}</span>
                    <span>{t("analytics.ops_total", { n: totalApprovals })}</span>
                </div>
                {totalApprovals === 0 ? (
                    <p className="py-2 text-center text-[11px] text-[#8e8e93]">{t("analytics.ops_no_approvals")}</p>
                ) : (
                    <div className="space-y-1.5">
                        {approvals.map(a => (
                            <div key={a.status} className="flex items-center gap-2 text-[11px]">
                                <span className="inline-block h-2 w-2 rounded-full" style={{ background: approvalColor(a.status) }} />
                                <span className="flex-1 capitalize text-[#1d1d1f]">{a.status.toLowerCase()}</span>
                                <span className="font-semibold text-[#1d1d1f]">{a.count}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="border-t border-black/[0.06] pt-3">
                <div className="mb-2 flex justify-between text-[11px] font-semibold uppercase text-[#8e8e93]">
                    <span>{t("analytics.ops_insights_lbl")}</span>
                    <span>{t("analytics.ops_open_total", { open: openInsights, total: totalInsights })}</span>
                </div>
                {totalInsights === 0 ? (
                    <p className="py-2 text-center text-[11px] text-[#8e8e93]">{t("analytics.ops_no_insights")}</p>
                ) : (
                    <div className="space-y-1.5">
                        {insights.map(i => (
                            <div key={i.severity} className="flex items-center gap-2 text-[11px]">
                                <span className="inline-block h-2 w-2 rounded-full" style={{ background: sevColor(i.severity) }} />
                                <span className="flex-1 capitalize text-[#1d1d1f]">{i.severity.toLowerCase()}</span>
                                <span className="text-[#8e8e93]">{t("analytics.open_label", { n: i.open })}</span>
                                <span className="font-semibold text-[#1d1d1f]">/ {i.total}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-black/[0.06] bg-white/60 p-5 backdrop-blur">
            <h3 className="mb-4 text-[14px] font-semibold text-[#1d1d1f]">{title}</h3>
            {children}
        </div>
    );
}

function KPI({ label, value, sub, color, trend }: { label: string; value: string; sub: string; color: string; trend?: number }) {
    return (
        <div className="rounded-2xl border border-black/[0.06] bg-white/60 p-4 backdrop-blur">
            <div className="flex items-start justify-between">
                <p className="text-[11px] font-medium text-[#8e8e93]">{label}</p>
                {trend !== undefined && (
                    <span className={`text-[10px] font-bold ${trend >= 0 ? "text-[#30d158]" : "text-[#ff453a]"}`}>
                        {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
                    </span>
                )}
            </div>
            <p className="mt-1 text-[26px] font-bold" style={{ color }}>{value}</p>
            <p className="text-[11px] text-[#8e8e93]">{sub}</p>
        </div>
    );
}

function SmallKPI({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-black/[0.06] bg-white/60 p-3 text-center backdrop-blur">
            <p className="text-[20px] font-bold text-[#1d1d1f]">{value}</p>
            <p className="text-[10px] text-[#8e8e93]">{label}</p>
        </div>
    );
}
