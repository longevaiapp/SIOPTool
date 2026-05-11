"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
    PROJECTS, getProject, getApprovalsByProject, getMessagesByProject,
    getInvoicesByProject, getTasksByProject, formatDate, formatMoney, daysBetween,
} from "@/lib/mock";
import { useT } from "@/lib/i18n";

type Tab = "overview" | "timeline" | "deliverables" | "team" | "invoices" | "documents";

export default function WorkspaceProjectDetailPage() {
    const t = useT();
    const params = useParams();
    const project = getProject(params.id as string) ?? PROJECTS[0];
    const [activeTab, setActiveTab] = useState<Tab>("overview");

    const approvals = getApprovalsByProject(project.id);
    const messages = getMessagesByProject(project.id);
    const invoices = getInvoicesByProject(project.id);
    const tasks = getTasksByProject(project.id);

    const totalDays = daysBetween(project.start_date, project.end_date);
    const elapsedDays = daysBetween(project.start_date, new Date().toISOString());
    const remainingDays = daysBetween(new Date().toISOString(), project.end_date);

    return (
        <div>
            <Link href="/workspace/projects" className="mb-4 inline-flex items-center gap-2 text-[13px] text-[#ff453a] hover:underline">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                {t("ws.proj_d.back")}
            </Link>

            {/* Header */}
            <div className="mb-6 rounded-2xl border border-black/[0.06] bg-white/70 p-6 backdrop-blur">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#ff453a]">
                            {t("ws.proj_d.your_project", { id: project.id })}
                        </p>
                        <h1 className="text-[28px] font-bold text-[#1d1d1f]">{project.name}</h1>
                        <p className="mt-1 text-[13px] text-[#636366]">{t("ws.proj_d.pm", { pm: project.pm_name })} {project.tech_lead !== "TBD" && `· ${t("ws.proj_d.tech", { n: project.tech_lead })}`}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${
                        project.health === "green" ? "bg-[#30d158]/15 text-[#248a3d]" :
                        project.health === "yellow" ? "bg-[#ff9f0a]/15 text-[#c93400]" :
                        "bg-[#8e8e93]/15 text-[#636366]"
                    }`}>
                        {t("ws.proj_d.on_track")}
                    </span>
                </div>

                {/* Stats */}
                <div className="mt-6 grid grid-cols-4 gap-4">
                    <Stat label={t("ws.proj_d.stat_progress")} value={`${project.progress}%`} sub={t("ws.proj_d.stat_progress_sub", { n: project.current_sprint })} color="#ff9f0a" />
                    <Stat label={t("ws.proj_d.stat_days")} value={`${remainingDays}`} sub={t("ws.proj_d.stat_days_sub", { n: totalDays })} color="#0a84ff" />
                    <Stat label={t("ws.proj_d.stat_pending")} value={`${approvals.filter(a => a.status === "pending").length}`} sub={t("ws.proj_d.stat_pending_sub")} color="#5856d6" />
                    <Stat label={t("ws.proj_d.stat_open_inv")} value={`${invoices.filter(i => i.status === "sent" || i.status === "overdue").length}`} sub={formatMoney(invoices.filter(i => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + i.amount, 0))} color="#30d158" />
                </div>

                {/* Progress bar */}
                <div className="mt-6">
                    <div className="h-2 overflow-hidden rounded-full bg-black/[0.05]">
                        <div className="h-full bg-gradient-to-r from-[#ff9f0a] to-[#ff453a]" style={{ width: `${project.progress}%` }} />
                    </div>
                    <div className="mt-2 flex justify-between text-[11px] text-[#8e8e93]">
                        <span>{formatDate(project.start_date)}</span>
                        <span>{t("ws.proj_d.today")}</span>
                        <span>{formatDate(project.end_date)}</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="mb-4 flex gap-2 overflow-x-auto border-b border-black/[0.06]">
                {[
                    { id: "overview", label: t("ws.proj_d.tab_overview") },
                    { id: "timeline", label: t("ws.proj_d.tab_timeline") },
                    { id: "deliverables", label: t("ws.proj_d.tab_deliverables") },
                    { id: "team", label: t("ws.proj_d.tab_team") },
                    { id: "invoices", label: t("ws.proj_d.tab_invoices", { n: invoices.length }) },
                    { id: "documents", label: t("ws.proj_d.tab_documents") },
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id as Tab)}
                        className={`whitespace-nowrap px-4 py-2.5 text-[13px] font-medium transition-all ${
                            activeTab === t.id ? "border-b-2 border-[#ff453a] text-[#ff453a]" : "text-[#8e8e93] hover:text-[#1d1d1f]"
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {activeTab === "overview" && (
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="space-y-4 lg:col-span-2">
                        <Card title={t("ws.proj_d.h_about")}>
                            <p className="text-[13px] leading-relaxed text-[#1d1d1f]">{project.description}</p>
                            <h4 className="mt-4 mb-2 text-[12px] font-semibold text-[#1d1d1f]">{t("ws.proj_d.h_objectives")}</h4>
                            <p className="text-[12px] text-[#636366]">{project.objectives}</p>
                        </Card>
                        <Card title={t("ws.proj_d.h_recent")}>
                            {messages.slice(0, 5).map(m => (
                                <div key={m.id} className="border-b border-black/[0.04] pb-3 last:border-0">
                                    <div className="flex justify-between">
                                        <p className="text-[12px] font-semibold text-[#1d1d1f]">{m.from_name}</p>
                                        <p className="text-[10px] text-[#8e8e93]">{new Date(m.sent_at).toLocaleString()}</p>
                                    </div>
                                    <p className="mt-1 text-[12px] text-[#636366]">{m.text}</p>
                                </div>
                            ))}
                        </Card>
                    </div>
                    <div className="space-y-4">
                        <Card title={t("ws.proj_d.h_pending")}>
                            {approvals.filter(a => a.status === "pending").map(a => (
                                <div key={a.id} className="rounded-xl bg-[#5856d6]/8 p-3">
                                    <p className="text-[12px] font-semibold text-[#1d1d1f]">{a.title}</p>
                                    <p className="mt-1 text-[11px] text-[#636366]">{t("ws.proj_d.due", { d: formatDate(a.due_date) })}</p>
                                    <Link href="/workspace/approvals" className="mt-2 inline-block text-[11px] font-semibold text-[#5856d6] hover:underline">{t("ws.proj_d.review")}</Link>
                                </div>
                            ))}
                            {approvals.filter(a => a.status === "pending").length === 0 && <p className="text-[11px] text-[#8e8e93]">{t("ws.proj_d.no_pending")}</p>}
                        </Card>
                    </div>
                </div>
            )}

            {activeTab === "timeline" && (
                <Card title={t("ws.proj_d.h_sprint", { n: project.current_sprint })}>
                    <div className="grid grid-cols-4 gap-3">
                        {(["todo", "in_progress", "review", "done"] as const).map(col => {
                            const colTasks = tasks.filter(t => t.status === col);
                            const labels = { todo: t("ws.proj_d.col_planned"), in_progress: t("ws.proj_d.col_in_progress"), review: t("ws.proj_d.col_review"), done: t("ws.proj_d.col_completed") };
                            const colors = { todo: "#8e8e93", in_progress: "#0a84ff", review: "#bf5af2", done: "#30d158" };
                            return (
                                <div key={col} className="rounded-xl bg-black/[0.02] p-3">
                                    <p className="mb-3 text-[11px] font-semibold uppercase" style={{ color: colors[col] }}>{labels[col]} ({colTasks.length})</p>
                                    <div className="space-y-2">
                                        {colTasks.map(t => (
                                            <div key={t.id} className="rounded-lg bg-white p-2 shadow-sm">
                                                <p className="text-[11px] font-medium text-[#1d1d1f]">{t.title}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}

            {activeTab === "deliverables" && (
                <Card title={t("ws.proj_d.h_deliverables")}>
                    <ul className="space-y-2">
                        {project.deliverables.map((d, i) => (
                            <li key={d} className="flex items-center gap-3 rounded-xl bg-black/[0.02] p-3">
                                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-white ${
                                    i < project.deliverables.length * (project.progress / 100) ? "bg-[#30d158]" : "bg-[#8e8e93]"
                                }`}>
                                    {i < project.deliverables.length * (project.progress / 100) ? "✓" : i + 1}
                                </span>
                                <span className="text-[13px] text-[#1d1d1f]">{d}</span>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            {activeTab === "team" && (
                <Card title={t("ws.proj_d.h_team")}>
                    <div className="space-y-2">
                        <Member name={project.pm_name} role={t("ws.proj_d.role_pm")} lead />
                        {project.tech_lead !== "TBD" && <Member name={project.tech_lead} role={t("ws.proj_d.role_tech")} lead />}
                        {project.team.filter(r => !"Project Manager,Tech Lead".includes(r)).map((r, i) => (
                            <Member key={i} name={t("ws.proj_d.member_n", { n: i + 1 })} role={r} />
                        ))}
                    </div>
                </Card>
            )}

            {activeTab === "invoices" && (
                <Card title={t("ws.proj_d.h_invoices")}>
                    {invoices.length === 0 ? <p className="text-[12px] text-[#8e8e93]">{t("ws.proj_d.no_invoices")}</p> : (
                        <div className="space-y-2">
                            {invoices.map(inv => (
                                <div key={inv.id} className="flex items-center justify-between rounded-xl border border-black/[0.06] p-3">
                                    <div>
                                        <p className="text-[13px] font-semibold text-[#1d1d1f]">{inv.number}</p>
                                        <p className="text-[11px] text-[#8e8e93]">{t("ws.proj_d.inv_dates", { i: formatDate(inv.issue_date), d: formatDate(inv.due_date) })}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[14px] font-bold text-[#1d1d1f]">{formatMoney(inv.amount)}</p>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                            inv.status === "paid" ? "bg-[#30d158]/15 text-[#248a3d]" :
                                            inv.status === "overdue" ? "bg-[#ff453a]/15 text-[#c93400]" :
                                            "bg-[#0a84ff]/15 text-[#0040dd]"
                                        }`}>{inv.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            )}

            {activeTab === "documents" && (
                <Card title={t("ws.proj_d.h_documents")}>
                    <div className="rounded-xl border border-dashed border-black/[0.08] p-8 text-center">
                        <p className="text-[12px] text-[#8e8e93]">{t("ws.proj_d.doc_placeholder")}</p>
                    </div>
                </Card>
            )}
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

function Stat({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
    return (
        <div className="rounded-xl bg-black/[0.02] p-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-[#8e8e93]">{label}</p>
            <p className="mt-1 text-[20px] font-bold" style={{ color }}>{value}</p>
            <p className="text-[10px] text-[#8e8e93]">{sub}</p>
        </div>
    );
}

function Member({ name, role, lead }: { name: string; role: string; lead?: boolean }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-black/[0.06] p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#ff9f0a] to-[#ff453a] text-[12px] font-bold text-white">
                {name.split(" ").map(n => n[0]).slice(0, 2).join("")}
            </div>
            <div className="flex-1">
                <p className="text-[13px] font-medium text-[#1d1d1f]">{name}</p>
                <p className="text-[11px] text-[#8e8e93]">{role}</p>
            </div>
            {lead && <span className="rounded-full bg-[#ff9f0a]/15 px-2 py-0.5 text-[10px] font-bold text-[#ff9f0a]">LEAD</span>}
        </div>
    );
}
