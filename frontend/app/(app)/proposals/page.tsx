"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useProposals, useClients } from "@/lib/hooks/use-resources";
import { formatDate } from "@/lib/format";
import { useListFilters, filterAndSort } from "@/components/shared/ListFilters";
import { LoadingSkeleton } from "@/components/shared";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    draft: { bg: "rgba(142, 142, 147, 0.12)", text: "#636366", label: "Draft" },
    sent: { bg: "rgba(10, 132, 255, 0.12)", text: "#0a84ff", label: "Sent" },
    accepted: { bg: "rgba(48, 209, 88, 0.12)", text: "#248a3d", label: "Accepted" },
    rejected: { bg: "rgba(255, 69, 58, 0.12)", text: "#ff453a", label: "Rejected" },
    withdrawn: { bg: "rgba(142, 142, 147, 0.12)", text: "#636366", label: "Withdrawn" },
    expired: { bg: "rgba(255, 159, 10, 0.12)", text: "#ff9f0a", label: "Expired" },
};

export default function ProposalsPage() {
    const t = useT();
    const { data: proposalsData, isLoading } = useProposals();
    const { data: clientsData } = useClients();
    const router = useRouter();

    const PROPOSALS = useMemo(() => {
        const clientMap = new Map((clientsData ?? []).map(c => [c.id, c.name]));
        return (proposalsData ?? []).map(p => ({
            id: p.id,
            folio: p.folio,
            title: p.title,
            client: (p.client_id && clientMap.get(p.client_id)) ?? "—",
            model: p.commercial_model,
            status: (p.status ?? "draft").toLowerCase(),
            version: p.version,
            validUntil: formatDate(p.valid_until),
            created: formatDate(p.created_at),
        }));
    }, [proposalsData, clientsData]);

    const KPI_CARDS = [
        { label: t("prop.kpi_total"), value: String(PROPOSALS.length), delta: t("prop.all_time") },
        { label: t("prop.kpi_sent"), value: String(PROPOSALS.filter(p => p.status === "sent").length), delta: t("prop.awaiting") },
        { label: t("prop.kpi_accepted"), value: String(PROPOSALS.filter(p => p.status === "accepted").length), delta: t("prop.won") },
        { label: t("prop.kpi_winrate"), value: PROPOSALS.length ? `${Math.round((PROPOSALS.filter(p => p.status === "accepted").length / Math.max(1, PROPOSALS.filter(p => ["accepted", "rejected"].includes(p.status)).length)) * 100)}%` : "—", delta: t("prop.accepted_decided") },
    ];

    const filters = useListFilters({
        searchPlaceholder: t("prop.search_ph"),
        statusOptions: Object.entries(STATUS_STYLES).map(([v, s]) => ({ value: v, label: s.label })),
        sortOptions: [{ value: "created_desc", label: "Created ↓" }],
    });
    const filtered = filterAndSort(PROPOSALS, filters, {
        searchFields: ["folio", "title", "client"],
        statusField: "status",
        sorters: { created_desc: (a, b) => (b.created ?? "").localeCompare(a.created ?? "") },
    });

    return (
        <div className="p-6">
            <header className="mb-6">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#5e5ce6]">
                    {t("prop.eyebrow")}
                </p>
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-[28px] font-bold tracking-tight text-[#1d1d1f]">{t("prop.title")}</h1>
                        <p className="mt-0.5 text-[13px] text-[#8e8e93]">{t("prop.subtitle")}</p>
                    </div>
                    <Link href="/proposals/new" className="btn btn--primary">{t("prop.btn_new")}</Link>
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
                    <h2 className="text-[15px] font-semibold text-[#1d1d1f]">{t("prop.registry")}</h2>
                    <span className="rounded-full bg-[#5e5ce6]/10 px-2.5 py-1 text-[11px] font-semibold text-[#5e5ce6]">
                        {t("prop.count_label", { n: filtered.length })}
                    </span>
                </div>
                <table className="glass-table">
                    <thead>
                        <tr>
                            <th>{t("prop.col_folio")}</th>
                            <th>{t("prop.col_title")}</th>
                            <th>{t("prop.col_client")}</th>
                            <th>{t("prop.col_model")}</th>
                            <th>{t("prop.col_version")}</th>
                            <th>{t("prop.col_status")}</th>
                            <th>{t("prop.col_valid")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && filtered.length === 0 && (
                            <tr><td colSpan={8} className="px-6 py-8"><LoadingSkeleton rows={4} type="text" /></td></tr>
                        )}
                        {filtered.map((p) => {
                            const status = STATUS_STYLES[p.status] ?? STATUS_STYLES.draft;
                            return (
                                <tr key={p.id} className="cursor-pointer" onClick={() => router.push(`/proposals/${p.id}`)}>
                                    <td><span className="font-mono text-[12px] font-semibold text-[#5e5ce6]">{p.folio}</span></td>
                                    <td className="font-semibold text-[#1d1d1f]">{p.title}</td>
                                    <td className="text-[#8e8e93]">{p.client}</td>
                                    <td className="text-[#8e8e93]">{p.model}</td>
                                    <td className="font-mono text-[12px]">v{p.version}</td>
                                    <td>
                                        <span className="inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold"
                                            style={{ background: status.bg, color: status.text }}>{status.label}</span>
                                    </td>
                                    <td className="text-[#8e8e93]">{p.validUntil}</td>
                                </tr>
                            );
                        })}
                        {filtered.length === 0 && (
                            <tr><td colSpan={7} className="py-12 text-center text-[#8e8e93]">{t("prop.empty")} <Link href="/proposals/new" className="font-semibold text-[#5e5ce6]">{t("prop.create_first")}</Link>.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
