"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useContracts, useClients } from "@/lib/hooks/use-resources";
import { formatDate, formatMoney } from "@/lib/format";
import { useListFilters, filterAndSort } from "@/components/shared/ListFilters";
import { LoadingSkeleton } from "@/components/shared";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";

/* ═══ Contracts & Compliance ═══ */


const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    draft: { bg: "rgba(142, 142, 147, 0.12)", text: "#636366", label: "Draft" },
    review: { bg: "rgba(191, 90, 242, 0.12)", text: "#8944ab", label: "In Review" },
    signed: { bg: "rgba(48, 209, 88, 0.12)", text: "#248a3d", label: "Signed" },
    expired: { bg: "rgba(255, 69, 58, 0.12)", text: "#ff453a", label: "Expired" },
};

function ComplianceBar({ score }: { score: number }) {
    const color = score >= 95 ? "#30d158" : score >= 80 ? "#ff9f0a" : "#ff453a";
    return (
        <div className="ai-score-bar">
            <div className="ai-score-bar__track">
                <div
                    className="ai-score-bar__fill"
                    style={{
                        width: `${score}%`,
                        background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                    }}
                />
            </div>
            <span className="ai-score-bar__value" style={{ color }}>{score}%</span>
        </div>
    );
}

export default function ContractsPage() {
    const t = useT();
    const { data: contractsData, isLoading } = useContracts();
    const router = useRouter();
    const { data: clientsData } = useClients();

    const CONTRACTS = useMemo(() => {
        const clientMap = new Map((clientsData ?? []).map(c => [c.id, c.name]));
        return (contractsData ?? []).map(c => {
            const ccLen = (c.compliance_controls ?? []).length;
            return {
                id: c.id,
                displayId: c.id.slice(0, 8).toUpperCase(),
                client: (c.client_id && clientMap.get(c.client_id)) ?? "—",
                type: (c.contract_type ?? "").toUpperCase(),
                status: (c.status ?? "draft").toLowerCase(),
                value: Number(c.value ?? 0) > 0 ? formatMoney(Number(c.value)) : "—",
                valueNum: Number(c.value ?? 0),
                expiry: formatDate(c.expiry_date),
                compliance: ccLen >= 3 ? 100 : ccLen >= 2 ? 95 : ccLen >= 1 ? 88 : 70,
                signedDate: formatDate(c.signed_date),
            };
        });
    }, [contractsData, clientsData]);

    const totalValue = CONTRACTS.reduce((s, c) => s + c.valueNum, 0);
    const KPI_CARDS = [
        { label: t("contracts.kpi_active"), value: String(CONTRACTS.filter(c => c.status === "signed").length), delta: `${CONTRACTS.length} total`, positive: true as boolean | null },
        { label: t("contracts.kpi_compliance"), value: CONTRACTS.length ? `${Math.round(CONTRACTS.reduce((s, c) => s + c.compliance, 0) / CONTRACTS.length)}%` : "—", delta: "controls coverage", positive: true as boolean | null },
        { label: t("contracts.kpi_review"), value: String(CONTRACTS.filter(c => c.status === "review").length), delta: "awaiting signature", positive: null as boolean | null },
        { label: t("contracts.kpi_value"), value: formatMoney(totalValue), delta: `${CONTRACTS.length} contracts`, positive: true as boolean | null },
    ];
    const filters = useListFilters({
        searchPlaceholder: t("contracts.search_ph"),
        statusOptions: Object.entries(STATUS_STYLES).map(([v, s]) => ({ value: v, label: s.label })),
        sortOptions: [
            { value: "value_desc", label: t("contracts.sort_value") },
            { value: "compliance_desc", label: t("contracts.sort_compliance") },
        ],
    });
    const filtered = filterAndSort(CONTRACTS, filters, {
        searchFields: ["displayId", "client", "type"],
        statusField: "status",
        sorters: {
            value_desc: (a, b) => b.valueNum - a.valueNum,
            compliance_desc: (a, b) => b.compliance - a.compliance,
        },
    });
    return (
        <div className="p-6">
            {/* Header */}
            <header className="mb-6">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#ff9f0a]">
                    {t("contracts.module_tag")}
                </p>
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-[28px] font-bold tracking-tight text-[#1d1d1f]">
                            {t("contracts.title")}
                        </h1>
                        <p className="mt-0.5 text-[13px] text-[#8e8e93]">
                            {t("contracts.subtitle")}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button className="btn btn--secondary">{t("page.export")}</button>
                        <Link href="/contracts/new" className="btn btn--primary">{t("page.new_contract")}</Link>
                    </div>
                </div>
            </header>

            {/* KPI Stats */}
            <div className="mb-6 grid grid-cols-4 gap-4">
                {KPI_CARDS.map((kpi) => (
                    <div key={kpi.label} className="glass-stat">
                        <p className="mb-1 text-[11px] font-medium text-[#8e8e93]">{kpi.label}</p>
                        <p className="mb-1 text-[28px] font-bold tracking-tight text-[#1d1d1f]">{kpi.value}</p>
                        <p className={`text-[11px] ${kpi.positive ? "text-[#30d158]" : kpi.positive === false ? "text-[#ff453a]" : "text-[#8e8e93]"}`}>
                            {kpi.delta}
                        </p>
                    </div>
                ))}
            </div>

            {filters.toolbar}

            {/* Contracts Table */}
            <div className="glass-card overflow-hidden">
                <div className="flex items-center justify-between border-b border-black/[0.04] px-5 py-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-[15px] font-semibold text-[#1d1d1f]">{t("contracts.registry")}</h2>
                        <span className="rounded-full bg-[#ff9f0a]/10 px-2.5 py-1 text-[11px] font-semibold text-[#ff9f0a]">
                            {filtered.length} contracts
                        </span>
                    </div>
                </div>

                <table className="glass-table">
                    <thead>
                        <tr>
                            <th>{t("contracts.col_id")}</th>
                            <th>{t("contracts.col_client")}</th>
                            <th>{t("contracts.col_type")}</th>
                            <th>{t("contracts.col_status")}</th>
                            <th>{t("contracts.col_value")}</th>
                            <th>{t("contracts.col_compliance")}</th>
                            <th>{t("contracts.col_expiry")}</th>
                            <th>{t("contracts.col_signed")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && filtered.length === 0 && (
                            <tr><td colSpan={8} className="px-6 py-8"><LoadingSkeleton rows={4} type="text" /></td></tr>
                        )}
                        {!isLoading && filtered.length === 0 && (
                            <tr><td colSpan={8} className="py-12 text-center text-[13px] text-[#8e8e93]">{t("contracts.empty")}</td></tr>
                        )}
                        {filtered.map((contract) => {
                            const status = STATUS_STYLES[contract.status] ?? STATUS_STYLES.draft;
                            return (
                                <tr key={contract.id} className="cursor-pointer" onClick={() => router.push(`/contracts/${contract.id}`)}>
                                    <td>
                                        <span className="font-mono text-[12px] font-semibold text-[#ff9f0a]">
                                            {contract.displayId}
                                        </span>
                                    </td>
                                    <td className="font-semibold text-[#1d1d1f]">{contract.client}</td>
                                    <td className="text-[#8e8e93]">{contract.type}</td>
                                    <td>
                                        <span
                                            className="inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold"
                                            style={{ background: status.bg, color: status.text }}
                                        >
                                            {status.label}
                                        </span>
                                    </td>
                                    <td className="font-semibold text-[#1d1d1f]">{contract.value}</td>
                                    <td className="w-32">
                                        <ComplianceBar score={contract.compliance} />
                                    </td>
                                    <td className="text-[#8e8e93]">{contract.expiry}</td>
                                    <td className="text-[#8e8e93]">{contract.signedDate}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
