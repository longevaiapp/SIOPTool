"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useInvoices, useClients, useProjects } from "@/lib/hooks/use-resources";
import { formatDate, formatMoney } from "@/lib/format";
import { useListFilters, filterAndSort } from "@/components/shared/ListFilters";
import { useT } from "@/lib/i18n";

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
    DRAFT: { bg: "rgba(142, 142, 147, 0.12)", text: "#636366" },
    SENT: { bg: "rgba(10, 132, 255, 0.12)", text: "#0a84ff" },
    PAID: { bg: "rgba(48, 209, 88, 0.12)", text: "#248a3d" },
    OVERDUE: { bg: "rgba(255, 69, 58, 0.12)", text: "#ff453a" },
    VOID: { bg: "rgba(142, 142, 147, 0.12)", text: "#8e8e93" },
};

export default function InvoicesPage() {
    const t = useT();
    const router = useRouter();
    const { data: invoices } = useInvoices();
    const { data: clients } = useClients();
    const { data: projects } = useProjects();

    const ROWS = useMemo(() => {
        const cMap = new Map((clients ?? []).map(c => [c.id, c.name]));
        const pMap = new Map((projects ?? []).map(p => [p.id, p.name]));
        const today = new Date().toISOString().slice(0, 10);
        return (invoices ?? []).map(i => {
            const overdue = i.status === "SENT" && i.due_date && i.due_date < today;
            return {
                id: i.id,
                folio: i.folio || i.number,
                client: cMap.get(i.client_id) ?? "—",
                project: (i.project_id && pMap.get(i.project_id)) ?? "—",
                amount: Number(i.amount || 0),
                currency: i.currency,
                status: overdue ? "OVERDUE" : i.status,
                issue: formatDate(i.issue_date) ?? "—",
                due: formatDate(i.due_date) ?? "—",
                paid: formatDate(i.paid_date) ?? "—",
            };
        });
    }, [invoices, clients, projects]);

    const totals = ROWS.reduce(
        (a, r) => ({
            total: a.total + r.amount,
            paid: a.paid + (r.status === "PAID" ? r.amount : 0),
            outstanding: a.outstanding + (["SENT", "OVERDUE"].includes(r.status) ? r.amount : 0),
            overdue: a.overdue + (r.status === "OVERDUE" ? r.amount : 0),
        }),
        { total: 0, paid: 0, outstanding: 0, overdue: 0 },
    );

    const KPI_CARDS = [
        { label: t("invoices.kpi_billed"), value: formatMoney(totals.total), delta: `${ROWS.length} invoices` },
        { label: t("invoices.kpi_collected"), value: formatMoney(totals.paid), delta: `${Math.round((totals.paid / (totals.total || 1)) * 100)}% del total` },
        { label: t("invoices.kpi_outstanding"), value: formatMoney(totals.outstanding), delta: t("invoices.kpi_outstanding_hint") },
        { label: t("invoices.kpi_overdue"), value: formatMoney(totals.overdue), delta: t("invoices.kpi_overdue_hint") },
    ];

    const filters = useListFilters({
        searchPlaceholder: t("filters.search_default"),
        statusOptions: [
            { value: "DRAFT", label: t("status.draft") },
            { value: "SENT", label: t("status.sent") },
            { value: "PAID", label: t("status.paid") },
            { value: "OVERDUE", label: t("status.overdue") },
            { value: "VOID", label: t("status.void") },
        ],
        sortOptions: [
            { value: "due_asc", label: t("invoices.sort_due") },
            { value: "amount_desc", label: t("invoices.sort_amount") },
        ],
    });
    const filtered = filterAndSort(ROWS, filters, {
        searchFields: ["folio", "client", "project"],
        statusField: "status",
        sorters: {
            due_asc: (a, b) => (a.due ?? "").localeCompare(b.due ?? ""),
            amount_desc: (a, b) => b.amount - a.amount,
        },
    });

    return (
        <div className="p-6">
            <header className="mb-6">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#0a84ff]">{t("invoices.module_tag")}</p>
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-[28px] font-bold tracking-tight text-[#1d1d1f]">{t("invoices.title")}</h1>
                        <p className="mt-0.5 text-[13px] text-[#8e8e93]">{t("invoices.subtitle")}</p>
                    </div>
                    <Link href="/invoices/new" className="btn btn--primary">{t("page.new_invoice")}</Link>
                </div>
            </header>

            <div className="mb-6 grid grid-cols-4 gap-4">
                {KPI_CARDS.map(kpi => (
                    <div key={kpi.label} className="glass-stat">
                        <p className="mb-1 text-[11px] font-medium text-[#8e8e93]">{kpi.label}</p>
                        <p className="mb-1 text-[28px] font-bold tracking-tight text-[#1d1d1f]">{kpi.value}</p>
                        <p className="text-[11px] text-[#8e8e93]">{kpi.delta}</p>
                    </div>
                ))}
            </div>

            {filters.toolbar}

            <div className="glass-card overflow-hidden">
                <div className="flex items-center justify-between border-b border-black/[0.04] px-5 py-4">
                    <h2 className="text-[15px] font-semibold text-[#1d1d1f]">{t("invoices.registry")}</h2>
                    <span className="rounded-full bg-[#0a84ff]/10 px-2.5 py-1 text-[11px] font-semibold text-[#0a84ff]">
                        {filtered.length} invoices
                    </span>
                </div>
                <table className="glass-table">
                    <thead>
                        <tr>
                            <th>{t("inv_list.col_folio")}</th>
                            <th>{t("inv_list.col_client")}</th>
                            <th>{t("inv_list.col_project")}</th>
                            <th>{t("inv_list.col_amount")}</th>
                            <th>{t("inv_list.col_issue")}</th>
                            <th>{t("inv_list.col_due")}</th>
                            <th>{t("inv_list.col_paid")}</th>
                            <th>{t("inv_list.col_status")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(r => {
                            const s = STATUS_STYLES[r.status] ?? STATUS_STYLES.DRAFT;
                            return (
                                <tr key={r.id} className="cursor-pointer" onClick={() => router.push(`/invoices/${r.id}`)}>
                                    <td><span className="font-mono text-[12px] font-semibold text-[#0a84ff]">{r.folio}</span></td>
                                    <td className="font-semibold text-[#1d1d1f]">{r.client}</td>
                                    <td className="text-[#8e8e93]">{r.project}</td>
                                    <td className="font-semibold">{formatMoney(r.amount)} <span className="text-[11px] text-[#8e8e93]">{r.currency}</span></td>
                                    <td className="text-[#8e8e93]">{r.issue}</td>
                                    <td className="text-[#8e8e93]">{r.due}</td>
                                    <td className="text-[#8e8e93]">{r.paid}</td>
                                    <td>
                                        <span className="inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold"
                                            style={{ background: s.bg, color: s.text }}>{r.status}</span>
                                    </td>
                                </tr>
                            );
                        })}
                        {filtered.length === 0 && (
                            <tr><td colSpan={8} className="py-12 text-center text-[#8e8e93]">{t("invoices.empty")}</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
