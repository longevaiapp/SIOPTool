"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";
import {
    getClient, getProjectsByClient, getInvoicesByClient, getApprovalsByProject,
    getMessagesByProject, getTicketsByClient, formatMoney, formatDate, daysBetween,
    APPROVALS, MESSAGES,
} from "@/lib/mock";

// Demo: client user is mapped to GenomicsCo
const DEMO_CLIENT_ID = "cli-genomics";

export default function WorkspaceOverview() {
    const t = useT();
    const client = getClient(DEMO_CLIENT_ID);
    if (!client) return null;

    const projects = getProjectsByClient(client.id);
    const activeProjects = projects.filter(p => p.status === "active");
    const invoices = getInvoicesByClient(client.id);
    const overdueInvoices = invoices.filter(i => i.status === "overdue");
    const pendingApprovals = projects.flatMap(p => getApprovalsByProject(p.id)).filter(a => a.status === "pending");
    const tickets = getTicketsByClient(client.id);
    const openTickets = tickets.filter(t => t.status !== "closed" && t.status !== "resolved");
    const unreadMessages = projects.flatMap(p => getMessagesByProject(p.id)).filter(m => !m.read && m.from_role !== "client");

    return (
        <div>
            {/* Welcome */}
            <div className="mb-6">
                <h1 className="text-[28px] font-bold tracking-tight text-[#1d1d1f]">
                    {t("ws.welcome", { name: client.contact_name.split(" ")[0] })}
                </h1>
                <p className="mt-1 text-[13px] text-[#8e8e93]">
                    {t("ws.welcome_sub")}
                </p>
            </div>

            {/* KPI Cards */}
            <div className="mb-6 grid gap-4 md:grid-cols-4">
                <KPI label={t("ws.kpi_active")} value={`${activeProjects.length}`} sub={t("ws.kpi_active_sub", { n: projects.length })} color="#ff9f0a" icon="📁" />
                <KPI label={t("ws.kpi_pending")} value={`${pendingApprovals.length}`} sub={t("ws.kpi_pending_sub")} color="#5856d6" icon="✓" highlight={pendingApprovals.length > 0} />
                <KPI label={t("ws.kpi_open")} value={formatMoney(invoices.filter(i => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + i.amount, 0))} sub={t("ws.kpi_overdue_sub", { n: overdueInvoices.length })} color={overdueInvoices.length > 0 ? "#ff453a" : "#30d158"} icon="💰" />
                <KPI label={t("ws.kpi_messages")} value={`${unreadMessages.length}`} sub={t("ws.kpi_messages_sub")} color="#0a84ff" icon="💬" highlight={unreadMessages.length > 0} />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Projects */}
                <div className="lg:col-span-2 space-y-6">
                    <Section title={t("ws.section_projects")} link="/workspace/projects" linkLabel={t("ws.view_all")}>
                        <div className="space-y-3">
                            {projects.map(p => (
                                <Link key={p.id} href={`/workspace/projects/${p.id}`} className="block rounded-2xl border border-black/[0.06] bg-white/60 p-4 backdrop-blur transition-all hover:shadow-md">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-[15px] font-semibold text-[#1d1d1f]">{p.name}</p>
                                            <p className="text-[11px] text-[#8e8e93]">{t("ws.pm_sprint", { pm: p.pm_name, n: p.current_sprint })}</p>
                                        </div>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                            p.health === "green" ? "bg-[#30d158]/15 text-[#248a3d]" :
                                            p.health === "yellow" ? "bg-[#ff9f0a]/15 text-[#c93400]" :
                                            "bg-[#8e8e93]/15 text-[#636366]"
                                        }`}>
                                            {t("ws.on_track")}
                                        </span>
                                    </div>
                                    <div className="mt-3">
                                        <div className="mb-1 flex justify-between text-[11px]">
                                            <span className="text-[#8e8e93]">{t("ws.progress")}</span>
                                            <span className="font-semibold text-[#1d1d1f]">{p.progress}%</span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-black/[0.05]">
                                            <div className="h-full bg-gradient-to-r from-[#ff9f0a] to-[#ff453a] transition-all" style={{ width: `${p.progress}%` }} />
                                        </div>
                                    </div>
                                    <div className="mt-3 flex justify-between text-[11px] text-[#8e8e93]">
                                        <span>{t("ws.started", { d: formatDate(p.start_date) })}</span>
                                        <span>{t("ws.days_remaining", { n: daysBetween(new Date().toISOString(), p.end_date) })}</span>
                                    </div>
                                </Link>
                            ))}
                            {projects.length === 0 && (
                                <p className="rounded-xl bg-black/[0.02] p-4 text-center text-[12px] text-[#8e8e93]">{t("ws.no_projects")}</p>
                            )}
                        </div>
                    </Section>

                    {/* Pending Approvals */}
                    {pendingApprovals.length > 0 && (
                        <Section title={t("ws.section_pending")} link="/workspace/approvals" linkLabel={t("ws.view_all")}>
                            <div className="space-y-2">
                                {pendingApprovals.slice(0, 3).map(a => (
                                    <Link key={a.id} href="/workspace/approvals" className="block rounded-xl border border-[#5856d6]/20 bg-[#5856d6]/5 p-3 hover:bg-[#5856d6]/10">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-[13px] font-semibold text-[#1d1d1f]">{a.title}</p>
                                                <p className="text-[11px] text-[#636366]">{t("ws.requested_by", { by: a.requested_by, date: formatDate(a.due_date) })}</p>
                                            </div>
                                            <span className="rounded-full bg-[#5856d6]/15 px-2 py-0.5 text-[10px] font-bold uppercase text-[#5856d6]">{a.type.replace("_", " ")}</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </Section>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Recent messages */}
                    <Section title={t("ws.section_recent")} link="/workspace/messages" linkLabel={t("ws.section_messages")}>
                        <div className="space-y-3">
                            {MESSAGES.slice(0, 4).map(m => (
                                <div key={m.id} className="flex gap-2">
                                    <div className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${m.read ? "bg-black/10" : "bg-[#0a84ff]"}`} />
                                    <div className="flex-1">
                                        <p className="text-[12px] font-medium text-[#1d1d1f]">{m.from_name}</p>
                                        <p className="line-clamp-2 text-[11px] text-[#636366]">{m.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Section>

                    {/* Invoices */}
                    {overdueInvoices.length > 0 && (
                        <div className="rounded-2xl border border-[#ff453a]/30 bg-[#ff453a]/5 p-4">
                            <p className="text-[12px] font-bold text-[#ff453a]">{t("ws.overdue_warn")}</p>
                            <p className="mt-1 text-[11px] text-[#1d1d1f]">
                                {t(overdueInvoices.length === 1 ? "ws.overdue_text_one" : "ws.overdue_text_other", { n: overdueInvoices.length, v: formatMoney(overdueInvoices.reduce((s, i) => s + i.amount, 0)) })}
                            </p>
                            <Link href="/workspace/invoices" className="mt-2 inline-block text-[11px] font-semibold text-[#ff453a] hover:underline">
                                {t("ws.view_invoices")}
                            </Link>
                        </div>
                    )}

                    {/* Open tickets */}
                    <Section title={t("ws.section_support")} link="/workspace/support" linkLabel={t("ws.view_all")}>
                        {openTickets.length === 0 ? (
                            <p className="text-[11px] text-[#8e8e93]">{t("ws.no_open_tickets")}</p>
                        ) : (
                            <div className="space-y-2">
                                {openTickets.slice(0, 3).map(t => (
                                    <div key={t.id} className="rounded-xl bg-black/[0.02] p-2.5">
                                        <p className="text-[12px] font-medium text-[#1d1d1f]">{t.title}</p>
                                        <p className="text-[10px] text-[#8e8e93]">{t.priority.toUpperCase()} · {t.status}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Section>
                </div>
            </div>
        </div>
    );
}

function KPI({ label, value, sub, color, icon, highlight }: { label: string; value: string; sub: string; color: string; icon: string; highlight?: boolean }) {
    return (
        <div className={`rounded-2xl border p-4 backdrop-blur transition-all ${highlight ? "border-[--c]/30 bg-[--c]/5" : "border-black/[0.06] bg-white/60"}`} style={{ "--c": color } as React.CSSProperties}>
            <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8e8e93]">{label}</p>
                <span className="text-[18px]">{icon}</span>
            </div>
            <p className="text-[24px] font-bold tracking-tight" style={{ color }}>{value}</p>
            <p className="text-[11px] text-[#8e8e93]">{sub}</p>
        </div>
    );
}

function Section({ title, link, linkLabel, children }: { title: string; link?: string; linkLabel?: string; children: React.ReactNode }) {
    return (
        <div>
            <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-[#1d1d1f]">{title}</h2>
                {link && <Link href={link} className="text-[11px] font-semibold text-[#ff453a] hover:underline">{linkLabel} →</Link>}
            </div>
            {children}
        </div>
    );
}
