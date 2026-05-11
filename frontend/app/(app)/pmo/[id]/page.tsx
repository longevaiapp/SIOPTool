"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useProgram, useProgramProjects, useProjects, useClients } from "@/lib/hooks/use-resources";
import { toMockProgram, toMockProject, toMockClient } from "@/lib/adapters";
import { formatMoney, formatDate } from "@/lib/format";
import { GeneratePdfButton } from "@/components/shared";
import { useT } from "@/lib/i18n";

export default function ProgramDetailPage() {
    const t = useT();
    const params = useParams();
    const programId = params.id as string;
    const { data: rawProgram } = useProgram(programId);
    const { data: links } = useProgramProjects(programId);
    const { data: projectsData } = useProjects();
    const { data: clientsData } = useClients();
    const program = rawProgram ? toMockProgram(rawProgram) : null;
    if (!program) return <div className="p-6 text-[13px] text-[#8e8e93]">{t("pmo_d.loading")}</div>;
    const linkedIds = new Set((links ?? []).map(l => l.project_id));
    const projects = (projectsData ?? []).filter(p => linkedIds.has(p.id)).map(toMockProject);

    const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
    const totalSpent = projects.reduce((s, p) => s + p.spent, 0);
    const burnRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    const avgMargin = projects.reduce((s, p) => s + p.margin_actual, 0) / Math.max(projects.length, 1);
    const totalTeam = new Set(projects.flatMap(p => p.team)).size;

    return (
        <div className="p-6">
            <Link href="/pmo" className="mb-4 inline-flex items-center gap-2 text-[13px] text-[#0d9488] hover:underline">
                {t("pmo_d.back")}
            </Link>

            {/* Header */}
            <div className="mb-6 rounded-2xl border border-black/[0.06] bg-white/70 p-6 backdrop-blur">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#0d9488]">
                            {t("pmo_d.header_meta", { id: program.id, priority: program.strategic_priority })}
                        </p>
                        <h1 className="text-[28px] font-bold text-[#1d1d1f]">{program.name}</h1>
                        <p className="mt-1 text-[13px] text-[#636366]">{program.description}</p>
                        <p className="mt-2 text-[12px] text-[#8e8e93]">{t("pmo_d.lead_label")} <span className="font-semibold text-[#1d1d1f]">{program.lead}</span></p>
                    </div>
                    <div className="text-right">
                        <p className="text-[44px] font-bold text-[#0d9488]">{program.progress}%</p>
                        <p className="text-[11px] text-[#8e8e93]">{t("pmo_d.progress")}</p>
                        <Link
                            href={`/pmo/${program.id}/edit`}
                            className="mt-3 inline-flex rounded-lg border border-[#0d9488]/30 bg-[#0d9488]/10 px-3 py-1.5 text-[12px] font-semibold text-[#0d9488] hover:bg-[#0d9488]/15"
                        >
                            ✏️ {t("pmo_d.edit")}
                        </Link>
                        <div className="mt-2">
                            <GeneratePdfButton kind="siop_weekly" sourceId={program.id} color="#0d9488" label={t("pmo_d.siop_weekly")} />
                        </div>
                    </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/[0.05]">
                    <div className="h-full bg-gradient-to-r from-[#0d9488] to-[#14b8a6]" style={{ width: `${program.progress}%` }} />
                </div>
            </div>

            {/* Stats */}
            <div className="mb-6 grid grid-cols-4 gap-4">
                <Stat label={t("pmo_d.stat_value")} value={formatMoney(program.portfolio_value)} color="#0d9488" />
                <Stat label={t("pmo_d.stat_burn")} value={`${burnRate.toFixed(0)}%`} sub={t("pmo_d.stat_burn_sub", { spent: formatMoney(totalSpent), budget: formatMoney(totalBudget) })} color={burnRate > 90 ? "#ff453a" : "#0a84ff"} />
                <Stat label={t("pmo_d.stat_margin")} value={`${avgMargin.toFixed(0)}%`} color={avgMargin >= 35 ? "#30d158" : "#ff9f0a"} />
                <Stat label={t("pmo_d.stat_team")} value={`${totalTeam}`} sub={t("pmo_d.stat_team_sub")} color="#5856d6" />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Projects */}
                <div className="lg:col-span-2">
                    <h2 className="mb-3 text-[15px] font-semibold text-[#1d1d1f]">{t("pmo_d.h_projects")}</h2>
                    <div className="space-y-3">
                        {projects.map(p => {
                            const rawClient = (clientsData ?? []).find(c => c.id === p.client_id);
                            const client = rawClient ? toMockClient(rawClient) : null;
                            const burn = p.budget > 0 ? (p.spent / p.budget) * 100 : 0;
                            return (
                                <Link key={p.id} href={`/pm-tab/${p.id}`} className="block rounded-2xl border border-black/[0.06] bg-white/60 p-4 backdrop-blur hover:shadow-lg">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-[14px] font-semibold text-[#1d1d1f]">{p.name}</p>
                                            <p className="text-[11px] text-[#8e8e93]">{client?.name} · {t("pmo_d.pm_label")} {p.pm_name}</p>
                                        </div>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                            p.health === "green" ? "bg-[#30d158]/15 text-[#248a3d]" :
                                            p.health === "yellow" ? "bg-[#ff9f0a]/15 text-[#c93400]" :
                                            p.health === "red" ? "bg-[#ff453a]/15 text-[#c93400]" :
                                            "bg-black/[0.05] text-[#636366]"
                                        }`}>{p.status}</span>
                                    </div>
                                    <div className="mt-3 grid grid-cols-3 gap-3 text-[11px]">
                                        <div>
                                            <p className="text-[#8e8e93]">{t("pmo_d.col_progress")}</p>
                                            <p className="font-bold text-[#1d1d1f]">{p.progress}%</p>
                                        </div>
                                        <div>
                                            <p className="text-[#8e8e93]">{t("pmo_d.col_burn")}</p>
                                            <p className={`font-bold ${burn > p.progress + 10 ? "text-[#ff453a]" : "text-[#1d1d1f]"}`}>{burn.toFixed(0)}%</p>
                                        </div>
                                        <div>
                                            <p className="text-[#8e8e93]">{t("pmo_d.col_margin")}</p>
                                            <p className={`font-bold ${p.margin_actual >= p.margin_target ? "text-[#30d158]" : "text-[#ff9f0a]"}`}>{p.margin_actual}%</p>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                        {projects.length === 0 && <p className="rounded-xl bg-black/[0.02] p-4 text-center text-[12px] text-[#8e8e93]">{t("pmo_d.empty")}</p>}
                    </div>
                </div>

                {/* Side */}
                <div className="space-y-4">
                    {/* Timeline */}
                    <div className="rounded-2xl border border-black/[0.06] bg-white/60 p-4 backdrop-blur">
                        <h3 className="mb-3 text-[13px] font-semibold text-[#1d1d1f]">{t("pmo_d.h_timeline")}</h3>
                        <div className="space-y-2">
                            {projects.map(p => (
                                <div key={p.id} className="rounded-lg bg-black/[0.02] p-2.5">
                                    <p className="text-[11px] font-semibold text-[#1d1d1f]">{p.name}</p>
                                    <p className="text-[10px] text-[#8e8e93]">{formatDate(p.start_date)} → {formatDate(p.end_date)}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Risk */}
                    <div className={`rounded-2xl p-4 ${
                        program.risk === "high" ? "border border-[#ff453a]/30 bg-[#ff453a]/5" :
                        program.risk === "medium" ? "border border-[#ff9f0a]/30 bg-[#ff9f0a]/5" :
                        "border border-[#30d158]/30 bg-[#30d158]/5"
                    }`}>
                        <p className="text-[10px] font-semibold uppercase text-[#8e8e93]">{t("pmo_d.h_risk")}</p>
                        <p className={`mt-1 text-[16px] font-bold uppercase ${
                            program.risk === "high" ? "text-[#ff453a]" :
                            program.risk === "medium" ? "text-[#ff9f0a]" : "text-[#30d158]"
                        }`}>{program.risk}</p>
                        <p className="mt-2 text-[11px] text-[#636366]">
                            {program.risk === "high" ? t("pmo_d.risk_high") :
                             program.risk === "medium" ? t("pmo_d.risk_medium") : t("pmo_d.risk_low")}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
    return (
        <div className="rounded-2xl border border-black/[0.06] bg-white/60 p-4 backdrop-blur">
            <p className="text-[11px] font-medium text-[#8e8e93]">{label}</p>
            <p className="mt-1 text-[24px] font-bold" style={{ color }}>{value}</p>
            {sub && <p className="text-[10px] text-[#8e8e93]">{sub}</p>}
        </div>
    );
}
