"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePrograms, useProjects, useRoleCapacity } from "@/lib/hooks/use-resources";
import { formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";

/* 🏛️ PMO Dashboard — Portfolio of Programs */

export default function PMOPage() {
    const t = useT();
    const { data: programsData } = usePrograms();
    const { data: projectsData } = useProjects();
    const { data: capacityData } = useRoleCapacity();

    const PROGRAMS = useMemo(() => (programsData ?? []).map(p => ({
        id: p.id,
        name: p.name,
        description: p.description ?? "",
        strategic_priority: p.strategic_priority ?? "P2",
        status: (p.status ?? "on_track").toLowerCase(),
        risk: "medium",
        lead: p.owner ?? "—",
        progress: Number(p.progress ?? 0),
        portfolio_value: Number(p.portfolio_value ?? 0),
        project_ids: [] as string[],
    })), [programsData]);

    const PROJECTS = useMemo(() => (projectsData ?? []).map(p => ({
        id: p.id,
        name: p.name,
        progress: Number(p.progress ?? 0),
        health: Number(p.health_score ?? 0) >= 80 ? "green" : Number(p.health_score ?? 0) >= 60 ? "yellow" : Number(p.health_score ?? 0) > 0 ? "red" : "gray",
    })), [projectsData]);

    const ROLE_CAPACITY = useMemo(() => (capacityData ?? []).map(r => ({
        role: r.role,
        available_fte: Number(r.available_fte ?? 0),
        committed_fte: Number(r.committed_fte ?? 0),
        forecast_demand: Number(r.forecast_demand ?? 0),
    })), [capacityData]);

    const totalValue = PROGRAMS.reduce((s, p) => s + p.portfolio_value, 0);
    const totalProjects = PROJECTS.length;
    const atRisk = PROGRAMS.filter(p => p.status === "at_risk").length;
    const avgProgress = PROGRAMS.length ? PROGRAMS.reduce((s, p) => s + p.progress, 0) / PROGRAMS.length : 0;

    const totalAvail = ROLE_CAPACITY.reduce((s, r) => s + r.available_fte, 0);
    const totalCommitted = ROLE_CAPACITY.reduce((s, r) => s + r.committed_fte, 0);
    const utilization = totalAvail > 0 ? (totalCommitted / totalAvail) * 100 : 0;

    return (
        <div className="p-6">
            <header className="mb-6">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#0d9488]">{t("pmo.eyebrow")}</p>
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-[28px] font-bold tracking-tight text-[#1d1d1f]">{t("pmo.title")}</h1>
                        <p className="mt-0.5 text-[13px] text-[#8e8e93]">{t("pmo.subtitle")}</p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/pmo/risks/new" className="rounded-xl bg-black/[0.05] px-4 py-2 text-[13px] font-semibold text-[#0d9488]">{t("pmo.btn_risk")}</Link>
                        <Link href="/pmo/new" className="rounded-xl bg-gradient-to-br from-[#0d9488] to-[#0f766e] px-4 py-2 text-[13px] font-semibold text-white shadow-lg">
                            {t("pmo.btn_new_program")}
                        </Link>
                    </div>
                </div>
            </header>

            {/* KPIs */}
            <div className="mb-6 grid grid-cols-4 gap-4">
                <KPI label={t("pmo.kpi_value")} value={formatMoney(totalValue)} sub={t("pmo.programs_label", { n: PROGRAMS.length, p: totalProjects })} color="#0d9488" />
                <KPI label={t("pmo.kpi_utilization")} value={`${utilization.toFixed(0)}%`} sub={`${totalCommitted.toFixed(1)}/${totalAvail} FTE`} color={utilization > 90 ? "#ff453a" : "#30d158"} />
                <KPI label={t("pmo.kpi_at_risk")} value={`${atRisk}`} sub={atRisk === 0 ? t("pmo.all_healthy") : t("pmo.attn_needed")} color={atRisk > 0 ? "#ff9f0a" : "#30d158"} />
                <KPI label={t("pmo.kpi_avg_progress")} value={`${avgProgress.toFixed(0)}%`} sub={t("pmo.across_portfolio")} color="#5856d6" />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Programs */}
                <div className="lg:col-span-2">
                    <h2 className="mb-3 text-[15px] font-semibold text-[#1d1d1f]">{t("pmo.programs")}</h2>
                    <div className="space-y-3">
                        {PROGRAMS.map(p => {
                            const projects: typeof PROJECTS = [];
                            return (
                                <Link key={p.id} href={`/pmo/${p.id}`} className="block rounded-2xl border border-black/[0.06] bg-white/60 p-5 backdrop-blur transition-all hover:shadow-lg">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="mb-2 flex items-center gap-2">
                                                <span className="rounded-full bg-[#0d9488]/15 px-2 py-0.5 text-[10px] font-bold text-[#0d9488]">{p.strategic_priority}</span>
                                                <StatusBadge status={p.status} />
                                                <RiskBadge risk={p.risk} />
                                            </div>
                                            <h3 className="text-[16px] font-semibold text-[#1d1d1f]">{p.name}</h3>
                                            <p className="mt-1 text-[12px] text-[#636366]">{p.description}</p>
                                            <p className="mt-2 text-[11px] text-[#8e8e93]">
                                                {t("pmo.lead")}: <span className="font-semibold text-[#1d1d1f]">{p.lead}</span> · {projects.length} project{projects.length !== 1 ? "s" : ""} · {formatMoney(p.portfolio_value)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[24px] font-bold text-[#0d9488]">{p.progress}%</p>
                                            <p className="text-[10px] text-[#8e8e93]">{t("pmo.progress")}</p>
                                        </div>
                                    </div>
                                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/[0.05]">
                                        <div className="h-full bg-gradient-to-r from-[#0d9488] to-[#14b8a6]" style={{ width: `${p.progress}%` }} />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Resource heatmap */}
                <div>
                    <h2 className="mb-3 text-[15px] font-semibold text-[#1d1d1f]">{t("pmo.heatmap")}</h2>
                    <div className="rounded-2xl border border-black/[0.06] bg-white/60 p-4 backdrop-blur">
                        <div className="space-y-2.5">
                            {ROLE_CAPACITY.map(r => {
                                const util = (r.committed_fte / r.available_fte) * 100;
                                return (
                                    <div key={r.role}>
                                        <div className="mb-1 flex justify-between text-[11px]">
                                            <span className="font-medium text-[#1d1d1f]">{r.role}</span>
                                            <span className="text-[#8e8e93]">{util.toFixed(0)}%</span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-black/[0.04]">
                                            <div
                                                className="h-full"
                                                style={{
                                                    width: `${Math.min(util, 100)}%`,
                                                    background: util > 95 ? "#ff453a" : util > 80 ? "#ff9f0a" : "#30d158",
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <Link href="/siop-engine" className="mt-4 block text-center text-[11px] font-semibold text-[#0d9488] hover:underline">
                            {t("pmo.see_capacity")}
                        </Link>
                    </div>

                    {/* All projects glance */}
                    <h2 className="mb-3 mt-6 text-[15px] font-semibold text-[#1d1d1f]">{t("pmo.projects_glance")}</h2>
                    <div className="rounded-2xl border border-black/[0.06] bg-white/60 p-4 backdrop-blur">
                        <div className="space-y-2">
                            {PROJECTS.map(pr => (
                                <Link key={pr.id} href={`/pm-tab/${pr.id}`} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-black/[0.03]">
                                    <div className="flex items-center gap-2">
                                        <span className={`h-2 w-2 rounded-full ${
                                            pr.health === "green" ? "bg-[#30d158]" :
                                            pr.health === "yellow" ? "bg-[#ff9f0a]" :
                                            pr.health === "red" ? "bg-[#ff453a]" : "bg-[#8e8e93]"
                                        }`} />
                                        <span className="text-[12px] text-[#1d1d1f]">{pr.name}</span>
                                    </div>
                                    <span className="text-[11px] text-[#8e8e93]">{pr.progress}%</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
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

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { bg: string; color: string; label: string }> = {
        on_track: { bg: "rgba(48, 209, 88, 0.12)", color: "#248a3d", label: "On Track" },
        at_risk: { bg: "rgba(255, 69, 58, 0.12)", color: "#ff453a", label: "At Risk" },
        delayed: { bg: "rgba(255, 159, 10, 0.12)", color: "#c93400", label: "Delayed" },
    };
    const s = map[status] ?? map.on_track;
    return <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: s.bg, color: s.color }}>{s.label}</span>;
}

function RiskBadge({ risk }: { risk: string }) {
    const map: Record<string, { color: string }> = {
        low: { color: "#30d158" },
        medium: { color: "#ff9f0a" },
        high: { color: "#ff453a" },
    };
    return <span className="text-[10px] font-bold uppercase" style={{ color: map[risk].color }}>● {risk} risk</span>;
}
