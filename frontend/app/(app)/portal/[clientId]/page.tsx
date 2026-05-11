"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR, { mutate as globalMutate } from "swr";
import { fetcher, api } from "@/lib/api/client";
import { approvalsDecide } from "@/lib/api";
import { formatMoney, formatDate } from "@/lib/format";
import { useToast } from "@/components/shared/ToastProvider";
import { useT } from "@/lib/i18n";

type Dashboard = {
    client: {
        id: string; name: string; status?: string | null; segment?: string | null;
        health_score?: number | null; arr?: number | null;
        primary_contact_name?: string | null; primary_contact_email?: string | null; primary_contact_role?: string | null;
    };
    counts: { pending_approvals: number; unread_messages: number; active_projects: number; open_invoices: number; documents: number };
    invoice_totals: { paid?: number; outstanding?: number; overdue?: number };
    projects: { id: string; name: string; status: string; phase?: string | null; health_score?: number | null; budget?: number | null; phi_involved?: number | boolean | null; baa_confirmed?: number | boolean | null }[];
    approvals: { id: string; title: string; description?: string | null; approval_type: string; status: string; decided_at?: string | null; decision_note?: string | null; project_id?: string | null; created_at: string }[];
    messages: { id: string; sender_name: string; sender_role: string; body: string; read_at?: string | null; project_id?: string | null; created_at: string }[];
    documents: { id: string; folio: string; kind: string; title: string; status: string; version: number; created_at: string; sent_at?: string | null; signed_at?: string | null }[];
    invoices: { id: string; number: string; amount: number; currency: string; status: string; issue_date?: string | null; due_date?: string | null; paid_date?: string | null; created_at: string }[];
};

type Tab = "overview" | "approvals" | "messages" | "documents" | "invoices";

const STATUS_PILL: Record<string, string> = {
    PENDING: "bg-[#ff9f0a]/15 text-[#b06000]",
    APPROVED: "bg-[#30d158]/15 text-[#0e7a2c]",
    REJECTED: "bg-[#ff453a]/15 text-[#9d1f15]",
    sent: "bg-[#0a84ff]/15 text-[#0a3d7a]",
    paid: "bg-[#30d158]/15 text-[#0e7a2c]",
    overdue: "bg-[#ff453a]/15 text-[#9d1f15]",
    draft: "bg-black/[0.06] text-[#636366]",
    void: "bg-black/[0.06] text-[#636366]",
    signed: "bg-[#30d158]/15 text-[#0e7a2c]",
    accepted: "bg-[#30d158]/15 text-[#0e7a2c]",
    rejected: "bg-[#ff453a]/15 text-[#9d1f15]",
};

export default function PortalClientPage() {
    const t = useT();
    const params = useParams();
    const clientId = String(params.clientId);
    const { toast } = useToast();
    const [tab, setTab] = useState<Tab>("overview");
    const [busyId, setBusyId] = useState<string | null>(null);
    const [reply, setReply] = useState("");
    const [decisionDraft, setDecisionDraft] = useState<{ id: string; action: "approve" | "reject"; note: string } | null>(null);

    const swrKey = `/portal/${clientId}/dashboard`;
    const { data, error, isLoading, mutate } = useSWR<Dashboard>(swrKey, fetcher, { refreshInterval: 30_000 });

    if (isLoading) return <div className="p-10 text-[13px] text-[#8e8e93]">{t("portal.loading_portal")}</div>;
    if (error || !data) return (
        <div className="p-10">
            <p className="text-[14px] font-semibold text-[#ff453a]">{t("portal.could_not_load")}</p>
            <Link href="/portal" className="mt-2 inline-block text-[12px] text-[#0a84ff]">{t("portal.back_to_clients")}</Link>
        </div>
    );

    const c = data.client;
    const tot = data.invoice_totals;

    const submitDecision = async () => {
        if (!decisionDraft) return;
        setBusyId(decisionDraft.id);
        try {
            const fn = decisionDraft.action === "approve" ? approvalsDecide.approve : approvalsDecide.reject;
            await fn(decisionDraft.id, { note: decisionDraft.note || undefined });
            await mutate();
            globalMutate("/audit-log/summary");
            globalMutate("/notifications?limit=30");
            toast({ title: decisionDraft.action === "approve" ? t("portal.toast_approval_approved") : t("portal.toast_approval_rejected"), variant: "success" });
            setDecisionDraft(null);
        } catch (err) {
            toast({ title: t("portal.toast_failed"), description: err instanceof Error ? err.message : "", variant: "destructive" });
        } finally {
            setBusyId(null);
        }
    };

    const sendReply = async () => {
        if (!reply.trim()) return;
        setBusyId("reply");
        try {
            await api.post(`/portal/${clientId}/messages`, {
                body: reply.trim(),
                sender_name: c.primary_contact_name ?? c.name,
            });
            setReply("");
            await mutate();
            globalMutate("/notifications?limit=30");
            toast({ title: t("portal.toast_message_sent"), variant: "success" });
        } catch (err) {
            toast({ title: t("portal.toast_failed"), description: err instanceof Error ? err.message : "", variant: "destructive" });
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="mx-auto max-w-6xl p-6">
            <header className="mb-6 flex items-end justify-between">
                <div>
                    <Link href="/portal" className="text-[11px] text-[#8e8e93] hover:text-[#1d1d1f]">{t("portal.back_clients")}</Link>
                    <p className="mt-1 mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#d97706]">{t("portal.eyebrow")}</p>
                    <h1 className="text-[28px] font-bold tracking-tight text-[#1d1d1f]">{c.name}</h1>
                    <p className="mt-0.5 text-[13px] text-[#8e8e93]">
                        {c.primary_contact_name ?? "—"}{c.primary_contact_role ? ` · ${c.primary_contact_role}` : ""}
                        {c.primary_contact_email ? ` · ${c.primary_contact_email}` : ""}
                    </p>
                </div>
                <div className="text-right">
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${STATUS_PILL[(c.status ?? "").toUpperCase()] ?? "bg-black/[0.06] text-[#636366]"}`}>{c.status ?? "—"}</span>
                </div>
            </header>

            {/* KPIs */}
            <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
                <KPI label={t("portal.kpi_pending_approvals")} value={data.counts.pending_approvals} color="#ff9f0a" />
                <KPI label={t("portal.kpi_active_projects")} value={data.counts.active_projects} color="#30d158" />
                <KPI label={t("portal.kpi_unread_messages")} value={data.counts.unread_messages} color="#0a84ff" />
                <KPI label={t("portal.kpi_open_invoices")} value={data.counts.open_invoices} color="#5856d6" />
                <KPI label={t("portal.kpi_documents")} value={data.counts.documents} color="#d97706" />
            </div>

            <div className="mb-4 flex gap-2 border-b border-black/[0.06]">
                {((["overview", "approvals", "messages", "documents", "invoices"] as Tab[]).map(tk => {
                    const tabLabel: Record<Tab, string> = {
                        overview: t("portal.tab_overview"),
                        approvals: t("portal.tab_approvals"),
                        messages: t("portal.tab_messages"),
                        documents: t("portal.tab_documents"),
                        invoices: t("portal.tab_invoices"),
                    };
                    return (
                    <button key={tk} onClick={() => setTab(tk)} className={`px-4 py-2.5 text-[13px] font-medium transition-all ${tab === tk ? "border-b-2 border-[#d97706] text-[#d97706]" : "text-[#8e8e93] hover:text-[#1d1d1f]"}`}>
                        {tabLabel[tk]}{tk === "approvals" && data.counts.pending_approvals > 0 ? ` (${data.counts.pending_approvals})` : ""}
                    </button>
                    );
                }))}
            </div>

            {tab === "overview" && (
                <div className="grid gap-6 lg:grid-cols-2">
                    <Card title={t("portal.active_projects")}>
                        {data.projects.length === 0 ? <Empty msg={t("portal.no_projects")} /> : (
                            <ul className="space-y-2">
                                {data.projects.map(p => (
                                    <li key={p.id} className="flex items-center justify-between rounded-xl border border-black/[0.06] bg-white/60 p-3">
                                        <div>
                                            <p className="text-[13px] font-semibold text-[#1d1d1f]">{p.name}</p>
                                            <p className="text-[11px] text-[#8e8e93]">
                                                {p.status} {p.phase ? `· ${p.phase}` : ""} {p.phi_involved ? "· PHI" : ""} {p.baa_confirmed ? "· BAA✓" : ""}
                                            </p>
                                        </div>
                                        {p.health_score != null && (
                                            <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: `${healthColor(Number(p.health_score))}20`, color: healthColor(Number(p.health_score)) }}>
                                                {Math.round(Number(p.health_score))}
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>
                    <Card title={t("portal.recent_activity")}>
                        {data.messages.length === 0 && data.approvals.length === 0 ? <Empty msg={t("portal.nothing_yet")} /> : (
                            <ul className="space-y-2 text-[12px]">
                                {data.approvals.slice(0, 3).map(a => (
                                    <li key={a.id} className="flex items-start gap-2">
                                        <span className="mt-0.5 text-[#ff9f0a]">●</span>
                                        <div>
                                            <p className="font-medium text-[#1d1d1f]">{a.title}</p>
                                            <p className="text-[11px] text-[#8e8e93]">{t("portal.approval_label")} · {a.status} · {formatDate(a.created_at)}</p>
                                        </div>
                                    </li>
                                ))}
                                {data.messages.slice(0, 3).map(m => (
                                    <li key={m.id} className="flex items-start gap-2">
                                        <span className="mt-0.5 text-[#0a84ff]">●</span>
                                        <div>
                                            <p className="font-medium text-[#1d1d1f]">{m.sender_name}</p>
                                            <p className="text-[11px] text-[#636366]">{m.body.slice(0, 80)}{m.body.length > 80 ? "…" : ""}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>
                </div>
            )}

            {tab === "approvals" && (
                <div className="space-y-2">
                    {data.approvals.length === 0 ? <Empty msg={t("portal.no_approvals")} /> : data.approvals.map(a => (
                        <div key={a.id} className="rounded-2xl border border-black/[0.06] bg-white/60 p-4">
                            <div className="mb-2 flex items-start justify-between">
                                <div>
                                    <p className="text-[14px] font-semibold text-[#1d1d1f]">{a.title}</p>
                                    <p className="mt-0.5 text-[11px] text-[#8e8e93]">{a.approval_type} · {t("portal.requested")} {formatDate(a.created_at)}</p>
                                </div>
                                <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${STATUS_PILL[a.status] ?? "bg-black/[0.06]"}`}>{a.status}</span>
                            </div>
                            {a.description && <p className="mb-3 text-[12px] text-[#636366]">{a.description}</p>}
                            {a.decided_at && a.decision_note && (
                                <p className="mb-2 rounded-lg bg-black/[0.03] px-3 py-2 text-[11px] text-[#636366]">
                                    {t("portal.decision")}: “{a.decision_note}” · {formatDate(a.decided_at)}
                                </p>
                            )}
                            {a.status === "PENDING" && (
                                <div className="flex gap-2">
                                    <button disabled={busyId === a.id} onClick={() => setDecisionDraft({ id: a.id, action: "approve", note: "" })} className="rounded-md bg-[#30d158] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50">{t("portal.approve")}</button>
                                    <button disabled={busyId === a.id} onClick={() => setDecisionDraft({ id: a.id, action: "reject", note: "" })} className="rounded-md bg-[#ff453a] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50">{t("portal.reject")}</button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {tab === "messages" && (
                <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
                    <Card title={t("portal.conversation")}>
                        {data.messages.length === 0 ? <Empty msg={t("portal.no_messages")} /> : (
                            <ul className="space-y-3">
                                {[...data.messages].reverse().map(m => {
                                    const fromClient = (m.sender_role ?? "").toUpperCase() === "CLIENT";
                                    return (
                                        <li key={m.id} className={`flex ${fromClient ? "justify-end" : "justify-start"}`}>
                                            <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-[13px] ${fromClient ? "bg-[#d97706] text-white" : "bg-black/[0.04] text-[#1d1d1f]"}`}>
                                                <p className="mb-0.5 text-[10px] font-semibold opacity-80">{m.sender_name} · {m.sender_role}</p>
                                                <p>{m.body}</p>
                                                <p className="mt-1 text-[9px] opacity-60">{formatDate(m.created_at)}</p>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </Card>
                    <Card title={t("portal.reply")}>
                        <textarea
                            rows={6}
                            value={reply}
                            onChange={e => setReply(e.target.value)}
                            placeholder={t("portal.write_reply")}
                            className="w-full rounded-xl border border-black/[0.08] bg-white p-3 text-[13px] outline-none focus:border-[#d97706]"
                        />
                        <button
                            disabled={busyId === "reply" || !reply.trim()}
                            onClick={sendReply}
                            className="mt-2 w-full rounded-xl bg-gradient-to-br from-[#d97706] to-[#b45309] px-4 py-2 text-[13px] font-semibold text-white shadow-md hover:shadow-lg disabled:opacity-50"
                        >
                            {busyId === "reply" ? t("portal.sending") : t("portal.send")}
                        </button>
                        <p className="mt-2 text-[10px] text-[#8e8e93]">{t("portal.reply_hint")}</p>
                    </Card>
                </div>
            )}

            {tab === "documents" && (
                <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white/60">
                    <table className="w-full text-[13px]">
                        <thead className="bg-black/[0.02] text-[11px] uppercase text-[#8e8e93]">
                            <tr>
                                <th className="px-4 py-2 text-left">{t("portal.col_folio")}</th>
                                <th className="px-4 py-2 text-left">{t("portal.col_kind")}</th>
                                <th className="px-4 py-2 text-left">{t("portal.col_title")}</th>
                                <th className="px-4 py-2 text-left">{t("portal.col_status")}</th>
                                <th className="px-4 py-2 text-right">v</th>
                                <th className="px-4 py-2 text-left">{t("portal.col_sent")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.documents.length === 0 && (<tr><td colSpan={6} className="px-4 py-8 text-center text-[#8e8e93]">{t("portal.no_documents")}</td></tr>)}
                            {data.documents.map(d => (
                                <tr key={d.id} className="border-t border-black/[0.06]">
                                    <td className="px-4 py-2 font-mono text-[11px] text-[#636366]">{d.folio}</td>
                                    <td className="px-4 py-2 text-[#1d1d1f]">{d.kind}</td>
                                    <td className="px-4 py-2 text-[#1d1d1f]">{d.title}</td>
                                    <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_PILL[d.status] ?? "bg-black/[0.06]"}`}>{d.status}</span></td>
                                    <td className="px-4 py-2 text-right text-[#636366]">{d.version}</td>
                                    <td className="px-4 py-2 text-[#8e8e93]">{d.sent_at ? formatDate(d.sent_at) : "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {tab === "invoices" && (
                <div>
                    <div className="mb-3 grid grid-cols-3 gap-3">
                        <KPI label={t("portal.kpi_paid")} value={formatMoney(Number(tot.paid ?? 0))} color="#30d158" />
                        <KPI label={t("portal.kpi_outstanding")} value={formatMoney(Number(tot.outstanding ?? 0))} color="#ff9f0a" />
                        <KPI label={t("portal.kpi_overdue")} value={formatMoney(Number(tot.overdue ?? 0))} color="#ff453a" />
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white/60">
                        <table className="w-full text-[13px]">
                            <thead className="bg-black/[0.02] text-[11px] uppercase text-[#8e8e93]">
                                <tr>
                                    <th className="px-4 py-2 text-left">{t("portal.col_number")}</th>
                                    <th className="px-4 py-2 text-right">{t("portal.col_amount")}</th>
                                    <th className="px-4 py-2 text-left">{t("portal.col_status")}</th>
                                    <th className="px-4 py-2 text-left">{t("portal.col_issue")}</th>
                                    <th className="px-4 py-2 text-left">{t("portal.col_due")}</th>
                                    <th className="px-4 py-2 text-left">{t("portal.col_paid")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.invoices.length === 0 && (<tr><td colSpan={6} className="px-4 py-8 text-center text-[#8e8e93]">{t("portal.no_invoices")}</td></tr>)}
                                {data.invoices.map(i => (
                                    <tr key={i.id} className="border-t border-black/[0.06]">
                                        <td className="px-4 py-2 font-mono text-[12px] text-[#1d1d1f]">{i.number}</td>
                                        <td className="px-4 py-2 text-right font-semibold text-[#1d1d1f]">{formatMoney(Number(i.amount))}</td>
                                        <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_PILL[(i.status ?? "").toLowerCase()] ?? "bg-black/[0.06]"}`}>{i.status}</span></td>
                                        <td className="px-4 py-2 text-[#636366]">{i.issue_date ?? "—"}</td>
                                        <td className="px-4 py-2 text-[#636366]">{i.due_date ?? "—"}</td>
                                        <td className="px-4 py-2 text-[#636366]">{i.paid_date ?? "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {decisionDraft && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDecisionDraft(null)}>
                    <div onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
                        <p className="mb-3 text-[15px] font-semibold text-[#1d1d1f]">
                            {decisionDraft.action === "approve" ? t("portal.modal_approve") : t("portal.modal_reject")}
                        </p>
                        <textarea
                            rows={4}
                            value={decisionDraft.note}
                            onChange={e => setDecisionDraft({ ...decisionDraft, note: e.target.value })}
                            placeholder={t("portal.optional_note")}
                            className="w-full rounded-xl border border-black/[0.08] bg-white p-3 text-[13px] outline-none focus:border-[#d97706]"
                        />
                        <div className="mt-3 flex justify-end gap-2">
                            <button onClick={() => setDecisionDraft(null)} className="rounded-md bg-black/[0.05] px-3 py-1.5 text-[12px] font-semibold">{t("common.cancel")}</button>
                            <button
                                disabled={busyId === decisionDraft.id}
                                onClick={submitDecision}
                                className={`rounded-md px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50 ${decisionDraft.action === "approve" ? "bg-[#30d158]" : "bg-[#ff453a]"}`}
                            >
                                {busyId === decisionDraft.id ? "…" : decisionDraft.action === "approve" ? t("portal.approve") : t("portal.reject")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function healthColor(score: number): string {
    if (score >= 80) return "#30d158";
    if (score >= 60) return "#ff9f0a";
    if (score > 0) return "#ff453a";
    return "#8e8e93";
}

function KPI({ label, value, color }: { label: string; value: string | number; color: string }) {
    return (
        <div className="rounded-2xl border border-black/[0.06] bg-white/60 p-3 backdrop-blur">
            <p className="text-[10px] font-medium uppercase text-[#8e8e93]">{label}</p>
            <p className="mt-1 text-[22px] font-bold" style={{ color }}>{value}</p>
        </div>
    );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-black/[0.06] bg-white/60 p-5 backdrop-blur">
            <h3 className="mb-3 text-[14px] font-semibold text-[#1d1d1f]">{title}</h3>
            {children}
        </div>
    );
}

function Empty({ msg }: { msg: string }) {
    return <p className="py-6 text-center text-[12px] text-[#8e8e93]">{msg}</p>;
}
