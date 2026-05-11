"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/api/client";
import { LoadingSkeleton } from "@/components/shared";
import { useT } from "@/lib/i18n";

type AuditItem = {
    id: string;
    timestamp: string;
    user_id: string | null;
    action: string;
    module: string;
    record_id: string | null;
    payload_delta: Record<string, unknown> | null;
};

type AuditList = {
    total: number;
    limit: number;
    offset: number;
    items: AuditItem[];
};

type AuditSummary = {
    total: number;
    last_24h: number;
    by_module: Array<{ module: string; count: number }>;
    by_action: Array<{ action: string; count: number }>;
};

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
    create: { bg: "rgba(48, 209, 88, 0.12)", text: "#248a3d" },
    update: { bg: "rgba(0, 122, 255, 0.12)", text: "#0040dd" },
    delete: { bg: "rgba(255, 69, 58, 0.12)", text: "#c93400" },
    soft_delete: { bg: "rgba(255, 159, 10, 0.12)", text: "#c93400" },
    approve: { bg: "rgba(48, 209, 88, 0.12)", text: "#248a3d" },
    reject: { bg: "rgba(255, 69, 58, 0.12)", text: "#c93400" },
    analyze: { bg: "rgba(191, 90, 242, 0.12)", text: "#8944ab" },
    generate: { bg: "rgba(94, 92, 230, 0.12)", text: "#5e5ce6" },
};

function actionStyle(action: string) {
    const lower = action.toLowerCase();
    for (const key of Object.keys(ACTION_COLORS)) {
        if (lower.includes(key)) return ACTION_COLORS[key];
    }
    return { bg: "rgba(142, 142, 147, 0.12)", text: "#636366" };
}

function fmt(ts: string): string {
    try {
        const d = new Date(ts);
        return d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "medium" });
    } catch {
        return ts;
    }
}

export default function AuditLogPage() {
    const t = useT();
    const [module, setModule] = useState<string>("");
    const [action, setAction] = useState<string>("");
    const [q, setQ] = useState<string>("");
    const [offset, setOffset] = useState<number>(0);
    const [selected, setSelected] = useState<AuditItem | null>(null);
    const limit = 50;

    const { data: summary } = useSWR<AuditSummary>("/audit-log/summary", fetcher);

    const queryKey = useMemo(() => {
        const params = new URLSearchParams();
        if (module) params.set("module", module);
        if (action) params.set("action", action);
        if (q) params.set("q", q);
        params.set("limit", String(limit));
        params.set("offset", String(offset));
        return `/audit-log?${params.toString()}`;
    }, [module, action, q, offset]);

    const { data, isLoading } = useSWR<AuditList>(queryKey, fetcher);
    const items = data?.items ?? [];
    const total = data?.total ?? 0;
    const moduleOptions = summary?.by_module ?? [];
    const actionOptions = summary?.by_action ?? [];

    function clearFilters() {
        setModule("");
        setAction("");
        setQ("");
        setOffset(0);
    }

    return (
        <div>
            <header className="mb-6">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#1d1d1f]/60">
                    {t("audit.tag")}
                </p>
                <h1 className="text-[28px] font-bold tracking-tight text-[#1d1d1f]">{t("audit.title")}</h1>
                <p className="mt-0.5 text-[13px] text-[#8e8e93]">
                    {t("audit.subtitle")}
                </p>
            </header>

            {/* KPIs */}
            <div className="mb-6 grid grid-cols-4 gap-4">
                <KPI label={t("audit.kpi_total")} value={summary ? summary.total.toLocaleString() : "—"} sub={t("audit.kpi_total_hint")} />
                <KPI label={t("audit.kpi_24h")} value={summary ? summary.last_24h.toLocaleString() : "—"} sub={t("audit.kpi_24h_hint")} />
                <KPI label={t("audit.kpi_modules")} value={summary ? `${summary.by_module.length}` : "—"} sub={t("audit.distinct_sources")} />
                <KPI label={t("audit.kpi_actions")} value={summary ? `${summary.by_action.length}` : "—"} sub={t("audit.distinct_verbs")} />
            </div>

            {/* Filters */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <input
                    type="text"
                    placeholder={t("audit.search_placeholder")}
                    value={q}
                    onChange={(e) => { setQ(e.target.value); setOffset(0); }}
                    className="min-w-[260px] rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-[13px] focus:border-[#007aff] focus:outline-none"
                />
                <select
                    value={module}
                    onChange={(e) => { setModule(e.target.value); setOffset(0); }}
                    className="rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-[13px]"
                >
                    <option value="">{t("page.filter_all_modules")}</option>
                    {moduleOptions.map((m) => (
                        <option key={m.module} value={m.module}>{m.module} ({m.count})</option>
                    ))}
                </select>
                <select
                    value={action}
                    onChange={(e) => { setAction(e.target.value); setOffset(0); }}
                    className="rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-[13px]"
                >
                    <option value="">{t("page.filter_all_actions")}</option>
                    {actionOptions.map((a) => (
                        <option key={a.action} value={a.action}>{a.action} ({a.count})</option>
                    ))}
                </select>
                {(module || action || q) && (
                    <button
                        onClick={clearFilters}
                        className="rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-[12px] text-[#8e8e93] hover:text-[#1d1d1f]"
                    >
                        {t("page.clear_filters")}
                    </button>
                )}
                <span className="ml-auto text-[12px] text-[#8e8e93]">
                    {t("audit.events_showing", { total: total.toLocaleString(), from: offset + 1, to: Math.min(offset + limit, total) })}
                </span>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
                <table className="glass-table w-full">
                    <thead>
                        <tr>
                            <th>{t("audit.col_timestamp")}</th>
                            <th>{t("audit.col_module")}</th>
                            <th>{t("audit.col_action")}</th>
                            <th>{t("audit.col_record")}</th>
                            <th>{t("audit.col_user")}</th>
                            <th>Δ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && items.length === 0 && (
                            <tr><td colSpan={6} className="px-6 py-8"><LoadingSkeleton rows={5} type="text" /></td></tr>
                        )}
                        {!isLoading && items.length === 0 && (
                            <tr><td colSpan={6} className="py-12 text-center text-[13px] text-[#8e8e93]">{t("audit.empty")}</td></tr>
                        )}
                        {items.map((row) => {
                            const style = actionStyle(row.action);
                            const deltaKeys = row.payload_delta ? Object.keys(row.payload_delta) : [];
                            return (
                                <tr key={row.id} className="cursor-pointer" onClick={() => setSelected(row)}>
                                    <td className="font-mono text-[12px] text-[#8e8e93]">{fmt(row.timestamp)}</td>
                                    <td className="font-semibold text-[#1d1d1f]">{row.module}</td>
                                    <td>
                                        <span
                                            className="inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold"
                                            style={{ background: style.bg, color: style.text }}
                                        >
                                            {row.action}
                                        </span>
                                    </td>
                                    <td className="font-mono text-[11px] text-[#8e8e93]">{row.record_id ? row.record_id.slice(0, 8) + "…" : "—"}</td>
                                    <td className="text-[12px] text-[#8e8e93]">{row.user_id ?? t("audit.system")}</td>
                                    <td className="text-[12px] text-[#8e8e93]">
                                        {deltaKeys.length === 0 ? "—" : t("audit.fields_count", { n: deltaKeys.length })}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {total > limit && (
                <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                        onClick={() => setOffset(Math.max(0, offset - limit))}
                        disabled={offset === 0}
                        className="rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 text-[12px] disabled:opacity-50"
                    >
                        {t("page.prev")}
                    </button>
                    <button
                        onClick={() => setOffset(offset + limit)}
                        disabled={offset + limit >= total}
                        className="rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 text-[12px] disabled:opacity-50"
                    >
                        {t("page.next")}
                    </button>
                </div>
            )}

            {/* Detail drawer */}
            {selected && (
                <div
                    className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
                    onClick={() => setSelected(null)}
                >
                    <div
                        className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-4 flex items-start justify-between">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[2px] text-[#8e8e93]">
                                    {selected.module}
                                </p>
                                <h2 className="text-[18px] font-bold text-[#1d1d1f]">{selected.action}</h2>
                                <p className="mt-1 font-mono text-[11px] text-[#8e8e93]">{fmt(selected.timestamp)}</p>
                            </div>
                            <button
                                onClick={() => setSelected(null)}
                                className="rounded-full bg-black/[0.04] px-3 py-1 text-[12px] text-[#8e8e93] hover:bg-black/[0.08]"
                            >
                                {t("audit.close")}
                            </button>
                        </div>
                        <dl className="mb-4 grid grid-cols-[110px_1fr] gap-y-2 text-[12px]">
                            <dt className="text-[#8e8e93]">Audit ID</dt>
                            <dd className="font-mono text-[11px] text-[#1d1d1f]">{selected.id}</dd>
                            <dt className="text-[#8e8e93]">Record ID</dt>
                            <dd className="font-mono text-[11px] text-[#1d1d1f]">{selected.record_id ?? "—"}</dd>
                            <dt className="text-[#8e8e93]">User</dt>
                            <dd className="text-[#1d1d1f]">{selected.user_id ?? "system"}</dd>
                        </dl>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[2px] text-[#8e8e93]">
                            {t("audit.payload_delta")}
                        </p>
                        <pre className="max-h-[60vh] overflow-auto rounded-xl bg-[#1d1d1f] p-4 text-[11px] leading-relaxed text-[#a1f0d2]">
                            {selected.payload_delta
                                ? JSON.stringify(selected.payload_delta, null, 2)
                                : "(no payload)"}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
}

function KPI({ label, value, sub }: { label: string; value: string; sub: string }) {
    return (
        <div className="rounded-2xl border border-black/[0.06] bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[2px] text-[#8e8e93]">{label}</p>
            <p className="mt-1 text-[24px] font-bold text-[#1d1d1f]">{value}</p>
            <p className="text-[11px] text-[#8e8e93]">{sub}</p>
        </div>
    );
}
