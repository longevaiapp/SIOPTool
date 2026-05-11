"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuotes, useClients } from "@/lib/hooks/use-resources";
import { formatDate, formatMoney } from "@/lib/format";
import { useListFilters, filterAndSort } from "@/components/shared/ListFilters";
import { LoadingSkeleton } from "@/components/shared";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    draft: { bg: "rgba(142, 142, 147, 0.12)", text: "#636366", label: "Draft" },
    sent: { bg: "rgba(10, 132, 255, 0.12)", text: "#0a84ff", label: "Sent" },
    accepted: { bg: "rgba(48, 209, 88, 0.12)", text: "#248a3d", label: "Accepted" },
    rejected: { bg: "rgba(255, 69, 58, 0.12)", text: "#ff453a", label: "Rejected" },
    expired: { bg: "rgba(255, 159, 10, 0.12)", text: "#ff9f0a", label: "Expired" },
    void: { bg: "rgba(142, 142, 147, 0.12)", text: "#636366", label: "Void" },
};

export default function QuotesPage() {
    const t = useT();
    const { data: quotesData, isLoading } = useQuotes();
    const { data: clientsData } = useClients();
    const router = useRouter();

    const QUOTES = useMemo(() => {
        const clientMap = new Map((clientsData ?? []).map(c => [c.id, c.name]));
        return (quotesData ?? []).map(q => ({
            id: q.id,
            folio: q.folio,
            client: (q.client_id && clientMap.get(q.client_id)) ?? "—",
            status: (q.status ?? "draft").toLowerCase(),
            currency: q.currency,
            total: Number(q.total),
            validUntil: formatDate(q.valid_until),
            created: formatDate(q.created_at),
        }));
    }, [quotesData, clientsData]);

    const KPI_CARDS = [
        { label: t("quotes.kpi_active"), value: String(QUOTES.filter(q => q.status === "sent" || q.status === "draft").length), delta: t("quotes.total_count", { n: QUOTES.length }) },
        { label: t("quotes.kpi_accepted"), value: String(QUOTES.filter(q => q.status === "accepted").length), delta: t("quotes.this_period") },
        { label: t("quotes.kpi_pipeline"), value: formatMoney(QUOTES.filter(q => q.status === "sent").reduce((s, q) => s + q.total, 0)), delta: t("quotes.in_sent") },
        { label: t("quotes.kpi_won"), value: formatMoney(QUOTES.filter(q => q.status === "accepted").reduce((s, q) => s + q.total, 0)), delta: t("quotes.accepted_total") },
    ];

    const filters = useListFilters({
        searchPlaceholder: t("quotes.search_ph"),
        statusOptions: Object.entries(STATUS_STYLES).map(([v, s]) => ({ value: v, label: s.label })),
        sortOptions: [
            { value: "total_desc", label: "Total ↓" },
            { value: "created_desc", label: "Created ↓" },
        ],
    });
    const filtered = filterAndSort(QUOTES, filters, {
        searchFields: ["folio", "client"],
        statusField: "status",
        sorters: {
            total_desc: (a, b) => b.total - a.total,
            created_desc: (a, b) => (b.created ?? "").localeCompare(a.created ?? ""),
        },
    });

    return (
        <div className="p-6">
            <header className="mb-6">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#34c759]">
                    {t("quotes.eyebrow")}
                </p>
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-[28px] font-bold tracking-tight text-[#1d1d1f]">{t("quotes.title")}</h1>
                        <p className="mt-0.5 text-[13px] text-[#8e8e93]">{t("quotes.subtitle")}</p>
                    </div>
                    <Link href="/quotes/new" className="btn btn--primary">{t("quotes.btn_new")}</Link>
                </div>
            </header>

            <div className="mb-6 grid grid-cols-4 gap-4">
                {KPI_CARDS.map((kpi) => (
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
                    <div className="flex items-center gap-3">
                        <h2 className="text-[15px] font-semibold text-[#1d1d1f]">{t("quotes.registry")}</h2>
                        <span className="rounded-full bg-[#34c759]/10 px-2.5 py-1 text-[11px] font-semibold text-[#34c759]">
                            {t("quotes.count_label", { n: filtered.length })}
                        </span>
                    </div>
                </div>

                <table className="glass-table">
                    <thead>
                        <tr>
                            <th>{t("quotes.col_folio")}</th>
                            <th>{t("quotes.col_client")}</th>
                            <th>{t("quotes.col_status")}</th>
                            <th>{t("quotes.col_total")}</th>
                            <th>{t("quotes.col_valid")}</th>
                            <th>{t("quotes.col_created")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && filtered.length === 0 && (
                            <tr><td colSpan={6} className="px-6 py-8"><LoadingSkeleton rows={4} type="text" /></td></tr>
                        )}
                        {filtered.map((q) => {
                            const status = STATUS_STYLES[q.status] ?? STATUS_STYLES.draft;
                            return (
                                <tr key={q.id} className="cursor-pointer" onClick={() => router.push(`/quotes/${q.id}`)}>
                                    <td><span className="font-mono text-[12px] font-semibold text-[#34c759]">{q.folio}</span></td>
                                    <td className="font-semibold text-[#1d1d1f]">{q.client}</td>
                                    <td>
                                        <span className="inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold"
                                            style={{ background: status.bg, color: status.text }}>
                                            {status.label}
                                        </span>
                                    </td>
                                    <td className="font-semibold text-[#1d1d1f]">{formatMoney(q.total)} {q.currency}</td>
                                    <td className="text-[#8e8e93]">{q.validUntil}</td>
                                    <td className="text-[#8e8e93]">{q.created}</td>
                                </tr>
                            );
                        })}
                        {filtered.length === 0 && (
                            <tr><td colSpan={6} className="py-12 text-center text-[#8e8e93]">{t("quotes.empty")} <Link href="/quotes/new" className="font-semibold text-[#34c759]">{t("quotes.create_first")}</Link>.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
