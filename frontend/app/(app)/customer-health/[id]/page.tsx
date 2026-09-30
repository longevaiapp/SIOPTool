"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
    useClient, useDeals, useProjects, useMeetings, useContracts, useTickets, useInvoices, useMessages,
} from "@/lib/hooks/use-resources";
import { toMockClient, toMockDeal, toMockProject, toMockContract, toMockMeeting } from "@/lib/adapters";
import { formatMoney, formatDate } from "@/lib/format";
import { GeneratePdfMenu, type PdfKindOption } from "@/components/shared";
import { useT } from "@/lib/i18n";

type Tab = "overview" | "deals" | "projects" | "meetings" | "engagement" | "documents" | "contacts";

export default function ClientHealthDetailPage() {
    const t = useT();
    const params = useParams();
    const clientId = params.id as string;
    const { data: rawClient } = useClient(clientId);
    const { data: dealsData } = useDeals();
    const { data: projectsData } = useProjects();
    const { data: meetingsData } = useMeetings();
    const { data: contractsData } = useContracts();
    const { data: ticketsData } = useTickets();
    const { data: invoicesData } = useInvoices();
    const { data: messagesData } = useMessages();
    const [activeTab, setActiveTab] = useState<Tab>("overview");
    const client = rawClient ? toMockClient(rawClient) : null;
    if (!client) return <div className="p-6 text-[13px] text-[#8e8e93]">{t("ch_d.loading")}</div>;

    const deals = (dealsData ?? []).filter(d => d.client_id === client.id).map(toMockDeal);
    const projects = (projectsData ?? []).filter(p => p.client_id === client.id).map(toMockProject);
    const meetings = (meetingsData ?? []).filter(m => m.client_id === client.id).map(toMockMeeting);
    const contracts = (contractsData ?? []).filter(c => c.client_id === client.id).map(toMockContract);

    const activeDeals = deals.filter(d => !["Won", "Lost"].includes(d.stage));
    const pipelineValue = activeDeals.reduce((sum, d) => sum + d.value, 0);

    const tierColor = {
        platinum: "#bf5af2",
        gold: "#ff9f0a",
        silver: "#8e8e93",
        bronze: "#cd7f32",
    }[client.tier];

    return (
        <div className="p-6">
            <Link href="/customer-health" className="mb-4 inline-flex items-center gap-2 text-[13px] text-[#e11d48] hover:underline">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                {t("ch_d.back")}
            </Link>

            {/* Header */}
            <div className="glass-card mb-6 p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div translate="no"
                            className="flex h-16 w-16 items-center justify-center rounded-2xl text-[24px] font-bold text-white"
                            style={{ background: `linear-gradient(135deg, ${client.logo_color}, ${client.logo_color}aa)` }}
                        >
                            {client.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#e11d48]">
                                {t("ch_d.client_id", { id: client.id })}
                            </p>
                            <h1 className="text-[28px] font-bold tracking-tight text-[#1d1d1f]">{client.name}</h1>
                            <p className="mt-0.5 text-[13px] text-[#8e8e93]">
                                {client.industry} · {client.size} · {client.location}
                            </p>
                        </div>
                    </div>
                    <span className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white" style={{ background: tierColor }}>
                        {client.tier}
                    </span>
                </div>

                <div className="mt-3 flex justify-end">
                    <GeneratePdfMenu
                        sourceId={client.id}
                        color="#e11d48"
                        triggerLabel={t("ch_d.gen_pdf")}
                        options={[
                            { kind: "health_card", label: t("ch_d.pdf_health"), description: t("ch_d.pdf_health_desc") },
                            { kind: "statement", label: t("ch_d.pdf_statement"), description: t("ch_d.pdf_statement_desc") },
                        ] as PdfKindOption[]}
                    />
                </div>

                {/* Health Stats */}
                <div className="mt-6 grid grid-cols-4 gap-4">
                    <HealthMetric label={t("ch_d.score")} value={`${client.health_score}`} max={100} color={client.health_score >= 80 ? "#30d158" : client.health_score >= 60 ? "#ff9f0a" : "#ff453a"} />
                    <HealthMetric label={t("ch_d.nps")} value={`${client.nps}`} max={100} color={client.nps >= 50 ? "#30d158" : client.nps >= 30 ? "#ff9f0a" : "#ff453a"} />
                    <div className="rounded-xl bg-black/[0.02] p-4">
                        <p className="text-[10px] font-medium uppercase text-[#8e8e93]">{t("ch_d.arr")}</p>
                        <p className="mt-1 text-[24px] font-bold text-[#1d1d1f]">{formatMoney(client.arr)}</p>
                        <p className="text-[10px] text-[#30d158]">{t("ch_d.arr_sub")}</p>
                    </div>
                    <div className="rounded-xl bg-black/[0.02] p-4">
                        <p className="text-[10px] font-medium uppercase text-[#8e8e93]">{t("ch_d.pipeline")}</p>
                        <p className="mt-1 text-[24px] font-bold text-[#1d1d1f]">{formatMoney(pipelineValue)}</p>
                        <p className="text-[10px] text-[#0a84ff]">{t("ch_d.pipeline_sub", { n: activeDeals.length })}</p>
                    </div>
                </div>

                {client.health_score < 70 && (
                    <div className="mt-4 rounded-xl border border-[#ff453a]/30 bg-[#ff453a]/5 p-3">
                        <p className="text-[12px] font-semibold text-[#ff453a]">{t("ch_d.churn_warn")}</p>
                        <p className="mt-1 text-[12px] text-[#1d1d1f]">{t("ch_d.churn_msg")}</p>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="mb-4 flex gap-2 overflow-x-auto border-b border-black/[0.06]">
                {[
                    { id: "overview", label: t("ch_d.tab_overview") },
                    { id: "deals", label: t("ch_d.tab_deals", { n: deals.length }) },
                    { id: "projects", label: t("ch_d.tab_projects", { n: projects.length }) },
                    { id: "meetings", label: t("ch_d.tab_meetings", { n: meetings.length }) },
                    { id: "engagement", label: t("ch_d.tab_engage") },
                    { id: "contacts", label: t("ch_d.tab_contacts") },
                    { id: "documents", label: t("ch_d.tab_docs", { n: contracts.length }) },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as Tab)}
                        className={`whitespace-nowrap px-4 py-2.5 text-[13px] font-medium transition-all ${
                            activeTab === tab.id ? "border-b-2 border-[#e11d48] text-[#e11d48]" : "text-[#8e8e93] hover:text-[#1d1d1f]"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                    {activeTab === "overview" && (
                        <>
                            <div className="glass-card p-5">
                                <h3 className="mb-3 text-[14px] font-semibold text-[#1d1d1f]">{t("ch_d.h_health_trend")}</h3>
                                <SimpleSparkline values={[client.health_score - 10, client.health_score - 5, client.health_score - 8, client.health_score - 3, client.health_score + 2, client.health_score]} color="#e11d48" />
                            </div>
                            <div className="glass-card p-5">
                                <h3 className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-[#1d1d1f]"><span>✦</span> {t("ch_d.h_drivers")}</h3>
                                <div className="space-y-2">
                                    {client.health_score >= 80 && <Driver positive title={t("ch_d.drv_strong")} detail={t("ch_d.drv_strong_sub")} />}
                                    {client.health_score < 70 && <Driver title={t("ch_d.drv_decline")} detail={t("ch_d.drv_decline_sub")} />}
                                    {activeDeals.length > 0 && <Driver positive title={t("ch_d.drv_expand")} detail={t("ch_d.drv_expand_sub", { n: activeDeals.length, v: formatMoney(pipelineValue) })} />}
                                    {projects.filter(p => p.health === "yellow" || p.health === "red").length > 0 && <Driver title={t("ch_d.drv_proj")} detail={t("ch_d.drv_proj_sub")} />}
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === "deals" && (
                        <div className="glass-card p-5">
                            <h3 className="mb-4 text-[14px] font-semibold text-[#1d1d1f]">{t("ch_d.h_all_deals")}</h3>
                            {deals.length === 0 ? <p className="text-[12px] text-[#8e8e93]">{t("ch_d.no_deals")}</p> : (
                                <div className="space-y-2">
                                    {deals.map(d => (
                                        <Link key={d.id} href={`/crm/${d.id}`} className="flex items-center justify-between rounded-xl border border-black/[0.06] p-3 hover:bg-black/[0.02]">
                                            <div>
                                                <p className="text-[13px] font-semibold text-[#1d1d1f]">{d.name}</p>
                                                <p className="text-[11px] text-[#8e8e93]">{t("ch_d.deal_sub", { stage: d.stage, n: d.ai_score })}</p>
                                            </div>
                                            <p className="text-[14px] font-bold text-[#1d1d1f]">{formatMoney(d.value)}</p>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "projects" && (
                        <div className="glass-card p-5">
                            <h3 className="mb-4 text-[14px] font-semibold text-[#1d1d1f]">{t("ch_d.h_all_projects")}</h3>
                            {projects.length === 0 ? <p className="text-[12px] text-[#8e8e93]">{t("ch_d.no_projects")}</p> : (
                                <div className="space-y-2">
                                    {projects.map(p => (
                                        <Link key={p.id} href={`/pm-tab/${p.id}`} className="block rounded-xl border border-black/[0.06] p-3 hover:bg-black/[0.02]">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[13px] font-semibold text-[#1d1d1f]">{p.name}</p>
                                                <span className={`h-2 w-2 rounded-full bg-[${p.health === "green" ? "#30d158" : p.health === "yellow" ? "#ff9f0a" : p.health === "red" ? "#ff453a" : "#8e8e93"}]`} style={{ background: p.health === "green" ? "#30d158" : p.health === "yellow" ? "#ff9f0a" : p.health === "red" ? "#ff453a" : "#8e8e93" }} />
                                            </div>
                                            <p className="mt-1 text-[11px] text-[#8e8e93]">{t("ch_d.proj_sub", { status: p.status, p: p.progress, s: p.current_sprint })}</p>
                                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[0.05]">
                                                <div className="h-full bg-[#ff453a]" style={{ width: `${p.progress}%` }} />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "meetings" && (
                        <div className="glass-card p-5">
                            <h3 className="mb-4 text-[14px] font-semibold text-[#1d1d1f]">{t("ch_d.h_meetings")}</h3>
                            {meetings.length === 0 ? <p className="text-[12px] text-[#8e8e93]">{t("ch_d.no_meetings")}</p> : (
                                <div className="space-y-2">
                                    {meetings.map(m => (
                                        <Link key={m.id} href={`/meetings/${m.id}`} className="block rounded-xl border border-black/[0.06] p-3 hover:bg-black/[0.02]">
                                            <p className="text-[13px] font-semibold text-[#1d1d1f]">{m.title}</p>
                                            <p className="text-[11px] text-[#8e8e93]">{formatDate(m.date)} · {m.duration_min}min</p>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "engagement" && (() => {
                        const tickets = (ticketsData ?? []).filter(t => t.client_id === client.id);
                        const openTickets = tickets.filter(t => t.status !== "closed" && t.status !== "resolved").length;
                        const invoices = (invoicesData ?? []).filter(i => i.client_id === client.id);
                        const paidOnTime = invoices.filter(i => i.status === "paid").length;
                        const overdue = invoices.filter(i => i.status === "overdue").length;
                        const projectIds = projects.map(p => p.id);
                        const clientMessages = (messagesData ?? []).filter(m => projectIds.includes(m.project_id ?? ""));
                        const lastClientMsg = [...clientMessages].reverse().find(m => m.from_role === "client");
                        return (
                            <div className="space-y-4">
                                <div className="glass-card p-5">
                                    <h3 className="mb-4 text-[14px] font-semibold text-[#1d1d1f]">{t("ch_d.h_portal")}</h3>
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                        <Metric icon="🔐" label={t("ch_d.m_last")} value={t("ch_d.m_last_v")} sub={t("ch_d.m_last_sub")} color="#30d158" />
                                        <Metric icon="📊" label={t("ch_d.m_logins")} value="42" sub={t("ch_d.m_logins_sub")} color="#0a84ff" />
                                        <Metric icon="📄" label={t("ch_d.m_docs")} value="18" sub={t("ch_d.m_docs_sub")} color="#5856d6" />
                                        <Metric icon="✓" label={t("ch_d.m_appr")} value="3 / 5" sub={t("ch_d.m_appr_sub")} color="#ff9f0a" />
                                    </div>
                                </div>

                                <div className="grid gap-4 lg:grid-cols-2">
                                    <div className="glass-card p-5">
                                        <h3 className="mb-3 text-[13px] font-semibold text-[#1d1d1f]">{t("ch_d.h_comm")}</h3>
                                        <div className="space-y-2 text-[12px]">
                                            <Row label={t("ch_d.c_total")} value={`${clientMessages.length}`} />
                                            <Row label={t("ch_d.c_last")} value={lastClientMsg ? new Date(lastClientMsg.sent_at).toLocaleDateString() : "—"} />
                                            <Row label={t("ch_d.c_avg")} value="< 4h" />
                                            <Row label={t("ch_d.c_unread")} value={`${clientMessages.filter(m => !m.read && m.from_role === "client").length}`} />
                                        </div>
                                    </div>

                                    <div className="glass-card p-5">
                                        <h3 className="mb-3 text-[13px] font-semibold text-[#1d1d1f]">{t("ch_d.h_billing")}</h3>
                                        <div className="space-y-2 text-[12px]">
                                            <Row label={t("ch_d.b_open")} value={`${openTickets}`} highlight={openTickets > 0} />
                                            <Row label={t("ch_d.b_resolved")} value={`${tickets.length - openTickets}`} />
                                            <Row label={t("ch_d.b_paid")} value={`${paidOnTime} / ${invoices.length}`} />
                                            <Row label={t("ch_d.b_overdue")} value={`${overdue}`} highlight={overdue > 0} />
                                        </div>
                                    </div>
                                </div>

                                <div className="glass-card p-5">
                                    <h3 className="mb-3 text-[13px] font-semibold text-[#1d1d1f]">{t("ch_d.h_engage_trend")}</h3>
                                    <div className="flex h-24 items-end gap-2">
                                        {[35, 42, 38, 51, 48, 55, 62, 58].map((v, i) => (
                                            <div key={i} className="flex flex-1 flex-col items-center gap-1">
                                                <div className="w-full rounded-t-sm bg-gradient-to-t from-[#e11d48] to-[#ff9f0a]" style={{ height: `${v}%` }} />
                                                <span className="text-[9px] text-[#8e8e93]">W{i + 1}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="mt-2 text-[11px] text-[#30d158]">{t("ch_d.engage_msg")}</p>
                                </div>
                            </div>
                        );
                    })()}

                    {activeTab === "contacts" && (
                        <div className="glass-card p-5">
                            <h3 className="mb-4 text-[14px] font-semibold text-[#1d1d1f]">{t("ch_d.h_contact")}</h3>
                            <div className="rounded-xl border border-black/[0.06] p-4">
                                <div className="flex items-center gap-3">
                                    <div translate="no" className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#e11d48] to-[#ff9f0a] text-[14px] font-bold text-white">
                                        {client.contact_name.split(" ").map(n => n[0]).join("")}
                                    </div>
                                    <div>
                                        <p className="text-[14px] font-semibold text-[#1d1d1f]">{client.contact_name}</p>
                                        <p className="text-[12px] text-[#8e8e93]">{client.contact_email}</p>
                                        <p className="text-[12px] text-[#8e8e93]">{client.phone}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "documents" && (
                        <div className="glass-card p-5">
                            <h3 className="mb-4 text-[14px] font-semibold text-[#1d1d1f]">{t("ch_d.h_contracts")}</h3>
                            {contracts.length === 0 ? <p className="text-[12px] text-[#8e8e93]">{t("ch_d.no_contracts")}</p> : (
                                <div className="space-y-2">
                                    {contracts.map(c => (
                                        <Link key={c.id} href={`/contracts/${c.id}`} className="block rounded-xl border border-black/[0.06] p-3 hover:bg-black/[0.02]">
                                            <p className="text-[13px] font-semibold text-[#1d1d1f]">{c.title}</p>
                                            <p className="text-[11px] text-[#8e8e93]">{t("ch_d.contract_sub", { type: c.type.toUpperCase(), status: c.status })} {c.signed_date && `· ${formatDate(c.signed_date)}`}</p>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    <div className="glass-card p-5">
                        <h3 className="mb-3 text-[13px] font-semibold text-[#1d1d1f]">{t("ch_d.quick_actions")}</h3>
                        <div className="space-y-2">
                            <Link href={`/customer-health/${client.id}/edit`} className="flex items-center justify-center w-full rounded-lg bg-[#e11d48] px-3 py-2 text-[12px] font-semibold text-white">{t("ch_d.qa_edit")}</Link>
                            <button className="w-full rounded-lg bg-[#e11d48] px-3 py-2 text-[12px] font-semibold text-white">{t("ch_d.qa_qbr")}</button>
                            <button className="w-full rounded-lg bg-[#5856d6] px-3 py-2 text-[12px] font-semibold text-white">{t("ch_d.qa_meeting")}</button>
                            <button className="w-full rounded-lg border border-black/[0.08] bg-black/[0.02] px-3 py-2 text-[12px] font-medium text-[#1d1d1f]">{t("ch_d.qa_email")}</button>
                            <button className="w-full rounded-lg border border-black/[0.08] bg-black/[0.02] px-3 py-2 text-[12px] font-medium text-[#1d1d1f]">{t("ch_d.qa_report")}</button>
                        </div>
                    </div>

                    <div className="glass-card p-5">
                        <h3 className="mb-3 text-[13px] font-semibold text-[#1d1d1f]">{t("ch_d.acc_summary")}</h3>
                        <div className="space-y-2 text-[12px]">
                            <Row label={t("ch_d.acc_ltv")} value={formatMoney(client.arr * 2.5)} />
                            <Row label={t("ch_d.acc_active")} value={`${projects.filter(p => p.status === "active").length}`} />
                            <Row label={t("ch_d.acc_deals")} value={`${activeDeals.length}`} />
                            <Row label={t("ch_d.acc_last_meeting")} value={meetings[0] ? formatDate(meetings[0].date) : "—"} />
                            <Row label={t("ch_d.acc_tier")} value={client.tier.toUpperCase()} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function HealthMetric({ label, value, max, color }: { label: string; value: string; max: number; color: string }) {
    const pct = (parseInt(value) / max) * 100;
    return (
        <div className="rounded-xl bg-black/[0.02] p-4">
            <p className="text-[10px] font-medium uppercase text-[#8e8e93]">{label}</p>
            <p className="mt-1 text-[24px] font-bold" style={{ color }}>{value}<span className="text-[12px] text-[#8e8e93]">/{max}</span></p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[0.05]">
                <div className="h-full transition-all" style={{ width: `${pct}%`, background: color }} />
            </div>
        </div>
    );
}

function SimpleSparkline({ values, color }: { values: number[]; color: string }) {
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${100 - ((v - min) / range) * 80 - 10}`).join(" ");
    return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-32 w-full">
            <polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
            {values.map((v, i) => (
                <circle key={i} cx={(i / (values.length - 1)) * 100} cy={100 - ((v - min) / range) * 80 - 10} r="1.5" fill={color} />
            ))}
        </svg>
    );
}

function Driver({ title, detail, positive }: { title: string; detail: string; positive?: boolean }) {
    return (
        <div className="rounded-xl p-3" style={{ background: positive ? "rgba(48, 209, 88, 0.08)" : "rgba(255, 159, 10, 0.08)" }}>
            <p className="text-[12px] font-semibold" style={{ color: positive ? "#30d158" : "#ff9f0a" }}>{positive ? "✓" : "⚠"} {title}</p>
            <p className="mt-0.5 text-[11px] text-[#1d1d1f]">{detail}</p>
        </div>
    );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div className="flex justify-between"><span className="text-[#8e8e93]">{label}:</span><span className={`font-medium ${highlight ? "text-[#ff453a]" : "text-[#1d1d1f]"}`}>{value}</span></div>
    );
}

function Metric({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub: string; color: string }) {
    return (
        <div className="rounded-xl border border-black/[0.06] bg-black/[0.01] p-3">
            <div className="mb-1 flex items-center justify-between">
                <span className="text-[16px]">{icon}</span>
            </div>
            <p className="text-[18px] font-bold tracking-tight" style={{ color }}>{value}</p>
            <p className="text-[10px] font-semibold uppercase text-[#8e8e93]">{label}</p>
            <p className="mt-0.5 text-[10px] text-[#636366]">{sub}</p>
        </div>
    );
}
