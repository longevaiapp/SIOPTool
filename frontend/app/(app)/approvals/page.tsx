"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApprovals, useClients, useProjects } from "@/lib/hooks/use-resources";
import { approvalsDecide } from "@/lib/api";
import { LoadingSkeleton } from "@/components/shared";
import { useToast } from "@/components/shared/ToastProvider";
import { useT } from "@/lib/i18n";
import { mutate as globalMutate } from "swr";

const STATUS_STYLES = (t: (k: string) => string): Record<string, { bg: string; text: string; label: string }> => ({
    PENDING: { bg: "rgba(255, 159, 10, 0.12)", text: "#c93400", label: t("appr.status_pending") },
    APPROVED: { bg: "rgba(48, 209, 88, 0.12)", text: "#248a3d", label: t("appr.status_approved") },
    REJECTED: { bg: "rgba(255, 69, 58, 0.12)", text: "#c93400", label: t("appr.status_rejected") },
});

const TYPE_LABEL = (t: (k: string) => string): Record<string, string> => ({
    DELIVERABLE: t("appr.type_deliverable"),
    MILESTONE: t("appr.type_milestone"),
    SCOPE_CHANGE: t("appr.type_scope"),
    PAYMENT: t("appr.type_payment"),
    OTHER: t("appr.type_other"),
});

function fmt(ts: string | null | undefined): string {
    if (!ts) return "—";
    try {
        return new Date(ts).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
    } catch {
        return ts;
    }
}

type DecisionState = { id: string; kind: "approve" | "reject" } | null;

export default function ApprovalsPage() {
    const t = useT();
    const { data: approvalsData, isLoading, mutate } = useApprovals();
    const { data: clientsData } = useClients();
    const { data: projectsData } = useProjects();
    const { toast } = useToast();

    const [statusFilter, setStatusFilter] = useState<string>("PENDING");
    const [typeFilter, setTypeFilter] = useState<string>("");
    const [decision, setDecision] = useState<DecisionState>(null);
    const [note, setNote] = useState<string>("");
    const [submitting, setSubmitting] = useState(false);

    const statusStyles = STATUS_STYLES(t);
    const typeLabel = TYPE_LABEL(t);

    const clientMap = useMemo(
        () => new Map((clientsData ?? []).map(c => [c.id, c.name])),
        [clientsData],
    );
    const projectMap = useMemo(
        () => new Map((projectsData ?? []).map(p => [p.id, p.name])),
        [projectsData],
    );

    const rows = useMemo(() => {
        const list = approvalsData ?? [];
        return list.filter(a => {
            if (statusFilter && a.status !== statusFilter) return false;
            if (typeFilter && a.approval_type !== typeFilter) return false;
            return true;
        });
    }, [approvalsData, statusFilter, typeFilter]);

    const counts = useMemo(() => {
        const list = approvalsData ?? [];
        return {
            pending: list.filter(a => a.status === "PENDING").length,
            approved: list.filter(a => a.status === "APPROVED").length,
            rejected: list.filter(a => a.status === "REJECTED").length,
            total: list.length,
        };
    }, [approvalsData]);

    function openDecision(id: string, kind: "approve" | "reject") {
        setDecision({ id, kind });
        setNote("");
    }

    async function submitDecision() {
        if (!decision) return;
        setSubmitting(true);
        try {
            if (decision.kind === "approve") {
                await approvalsDecide.approve(decision.id, { note: note || undefined });
                toast({ title: t("appr.toast_granted"), variant: "success" });
            } else {
                await approvalsDecide.reject(decision.id, { note: note || undefined });
                toast({ title: t("appr.toast_rejected"), variant: "success" });
            }
            setDecision(null);
            setNote("");
            await mutate();
            globalMutate("/audit-log/summary");
        } catch (err) {
            const msg = err instanceof Error ? err.message : t("appr.toast_failed_default");
            toast({ title: t("appr.toast_failed_title"), description: msg, variant: "error" });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div>
            <header className="mb-6">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#1d1d1f]/60">
                    {t("approvals.tag")}
                </p>
                <div className="flex items-end justify-between">
                    <h1 className="text-[28px] font-bold tracking-tight text-[#1d1d1f]">{t("approvals.title")}</h1>
                    <Link href="/approvals/new" className="rounded-xl bg-gradient-to-br from-[#d97706] to-[#b45309] px-4 py-2 text-[13px] font-semibold text-white shadow-lg">{t("page.request_approval")}</Link>
                </div>
                <p className="mt-0.5 text-[13px] text-[#8e8e93]">
                    {t("approvals.subtitle")}
                </p>
            </header>

            <div className="mb-6 grid grid-cols-4 gap-4">
                <KPI label={t("approvals.kpi_pending")} value={`${counts.pending}`} sub={t("approvals.kpi_pending_hint")} color="#ff9f0a" />
                <KPI label={t("approvals.kpi_approved")} value={`${counts.approved}`} sub="" color="#30d158" />
                <KPI label={t("approvals.kpi_rejected")} value={`${counts.rejected}`} sub="" color="#ff453a" />
                <KPI label={t("appr.kpi_total")} value={`${counts.total}`} sub={t("appr.kpi_total_sub")} color="#8e8e93" />
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="inline-flex rounded-lg border border-black/[0.08] bg-white p-1">
                    {(["PENDING", "APPROVED", "REJECTED", ""] as const).map(s => (
                        <button
                            key={s || "all"}
                            onClick={() => setStatusFilter(s)}
                            className={`rounded-md px-3 py-1.5 text-[12px] font-semibold transition-all ${
                                statusFilter === s
                                    ? "bg-[#1d1d1f] text-white"
                                    : "text-[#8e8e93] hover:text-[#1d1d1f]"
                            }`}
                        >
                            {s ? statusStyles[s].label : t("appr.filter_all")}
                        </button>
                    ))}
                </div>
                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-[13px]"
                >
                    <option value="">{t("page.filter_all_types")}</option>
                    {Object.entries(typeLabel).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                    ))}
                </select>
                <span className="ml-auto text-[12px] text-[#8e8e93]">{t("appr.matching", { n: rows.length })}</span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
                <table className="glass-table w-full">
                    <thead>
                        <tr>
                            <th>{t("appr.col_title")}</th>
                            <th>{t("appr.col_type")}</th>
                            <th>{t("appr.col_client")}</th>
                            <th>{t("appr.col_project")}</th>
                            <th>{t("appr.col_status")}</th>
                            <th>{t("appr.col_decided")}</th>
                            <th className="text-right">{t("appr.col_actions")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && rows.length === 0 && (
                            <tr><td colSpan={7} className="px-6 py-8"><LoadingSkeleton rows={5} type="text" /></td></tr>
                        )}
                        {!isLoading && rows.length === 0 && (
                            <tr><td colSpan={7} className="py-12 text-center text-[13px] text-[#8e8e93]">{t("approvals.empty")}</td></tr>
                        )}
                        {rows.map(a => {
                            const style = statusStyles[a.status] ?? statusStyles.PENDING;
                            const isPending = a.status === "PENDING";
                            return (
                                <tr key={a.id}>
                                    <td>
                                        <div className="font-semibold text-[#1d1d1f]">{a.title}</div>
                                        {a.description && (
                                            <p className="mt-0.5 max-w-md truncate text-[12px] text-[#8e8e93]">{a.description}</p>
                                        )}
                                    </td>
                                    <td className="text-[12px] text-[#8e8e93]">
                                        {typeLabel[a.approval_type ?? "OTHER"] ?? a.approval_type ?? "—"}
                                    </td>
                                    <td className="text-[12px] text-[#8e8e93]">
                                        {a.client_id ? (clientMap.get(a.client_id) ?? a.client_id.slice(0, 8)) : "—"}
                                    </td>
                                    <td className="text-[12px] text-[#8e8e93]">
                                        {a.project_id ? (
                                            <Link href={`/pm-tab/${a.project_id}`} className="hover:text-[#1d1d1f]">
                                                {projectMap.get(a.project_id) ?? a.project_id.slice(0, 8)}
                                            </Link>
                                        ) : "—"}
                                    </td>
                                    <td>
                                        <span
                                            className="inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold"
                                            style={{ background: style.bg, color: style.text }}
                                        >
                                            {style.label}
                                        </span>
                                    </td>
                                    <td className="text-[12px] text-[#8e8e93]">{fmt(a.decided_at)}</td>
                                    <td className="text-right">
                                        {isPending ? (
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => openDecision(a.id, "approve")}
                                                    className="rounded-lg bg-[#30d158] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#248a3d]"
                                                >
                                                    {t("appr.btn_approve")}
                                                </button>
                                                <button
                                                    onClick={() => openDecision(a.id, "reject")}
                                                    className="rounded-lg border border-[#ff453a]/30 bg-white px-3 py-1.5 text-[12px] font-semibold text-[#ff453a] hover:bg-[#ff453a]/5"
                                                >
                                                    {t("appr.btn_reject")}
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-[11px] text-[#8e8e93]">
                                                {a.decision_note ? `“${a.decision_note}”` : "—"}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {decision && (
                <div
                    className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
                    onClick={() => !submitting && setDecision(null)}
                >
                    <div
                        className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="mb-1 text-[18px] font-bold text-[#1d1d1f]">
                            {decision.kind === "approve" ? t("approvals.modal_approve") : t("approvals.modal_reject")}
                        </h2>
                        <p className="mb-4 text-[12px] text-[#8e8e93]">
                            {t("approvals.modal_audit_note")}
                        </p>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[1px] text-[#8e8e93]">
                            {t("approvals.modal_note_label")}
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={4}
                            placeholder={decision.kind === "approve" ? t("approvals.modal_note_approve") : t("approvals.modal_note_reject")}
                            className="w-full rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-[13px] focus:border-[#007aff] focus:outline-none"
                        />
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                onClick={() => setDecision(null)}
                                disabled={submitting}
                                className="rounded-lg border border-black/[0.08] bg-white px-4 py-2 text-[13px] text-[#8e8e93] hover:text-[#1d1d1f] disabled:opacity-50"
                            >
                                {t("common.cancel")}
                            </button>
                            <button
                                onClick={submitDecision}
                                disabled={submitting}
                                className={`rounded-lg px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50 ${
                                    decision.kind === "approve"
                                        ? "bg-[#30d158] hover:bg-[#248a3d]"
                                        : "bg-[#ff453a] hover:bg-[#c93400]"
                                }`}
                            >
                                {submitting ? t("common.saving") : decision.kind === "approve" ? t("approvals.btn_approve") : t("approvals.btn_reject")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function KPI({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
    return (
        <div className="rounded-2xl border border-black/[0.06] bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[2px] text-[#8e8e93]">{label}</p>
            <p className="mt-1 text-[24px] font-bold" style={{ color }}>{value}</p>
            <p className="text-[11px] text-[#8e8e93]">{sub}</p>
        </div>
    );
}
