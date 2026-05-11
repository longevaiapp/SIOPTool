"use client";

import { useState, useMemo } from "react";
import { useT } from "@/lib/i18n";

export interface FilterOption {
    value: string;
    label: string;
}

export interface ListFiltersConfig {
    searchPlaceholder?: string;
    statusOptions?: FilterOption[];
    sortOptions?: FilterOption[];
}

export interface ListFiltersState {
    search: string;
    status: string;
    sort: string;
}

/**
 * ListFilters — reusable search + status filter + sort row for list pages.
 * Returns a hook that yields state + setters + the rendered toolbar.
 */
export function useListFilters(config: ListFiltersConfig) {
    const t = useT();
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("all");
    const [sort, setSort] = useState(config.sortOptions?.[0]?.value ?? "default");

    const toolbar = (
        <div className="glass-card mb-4 flex flex-wrap items-center gap-3 p-3">
            <div className="relative flex-1 min-w-[220px]">
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8e8e93]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={config.searchPlaceholder ?? t("lf.search_ph")}
                    className="w-full rounded-lg border border-black/[0.08] bg-white/60 py-2 pl-9 pr-3 text-[13px] text-[#1d1d1f] placeholder-[#8e8e93] focus:border-[#0a84ff] focus:outline-none focus:ring-2 focus:ring-[#0a84ff]/20"
                />
            </div>
            {config.statusOptions && config.statusOptions.length > 0 && (
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="rounded-lg border border-black/[0.08] bg-white/60 px-3 py-2 text-[13px] text-[#1d1d1f] focus:border-[#0a84ff] focus:outline-none"
                >
                    <option value="all">{t("lf.all_status")}</option>
                    {config.statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
            )}
            {config.sortOptions && config.sortOptions.length > 0 && (
                <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="rounded-lg border border-black/[0.08] bg-white/60 px-3 py-2 text-[13px] text-[#1d1d1f] focus:border-[#0a84ff] focus:outline-none"
                >
                    {config.sortOptions.map(o => <option key={o.value} value={o.value}>{t("lf.sort_prefix", { label: o.label })}</option>)}
                </select>
            )}
            {(search || status !== "all") && (
                <button
                    onClick={() => { setSearch(""); setStatus("all"); }}
                    className="rounded-lg border border-black/[0.08] px-3 py-2 text-[12px] font-medium text-[#8e8e93] hover:bg-black/[0.04]"
                >
                    {t("lf.clear")}
                </button>
            )}
        </div>
    );

    return { search, status, sort, setSearch, setStatus, setSort, toolbar };
}

/**
 * Generic filter helper: filter by search across multiple fields and status equality.
 */
export function filterAndSort<T extends Record<string, any>>(
    items: T[],
    state: ListFiltersState,
    opts: {
        searchFields: (keyof T)[];
        statusField?: keyof T;
        sorters?: Record<string, (a: T, b: T) => number>;
    }
): T[] {
    const q = state.search.trim().toLowerCase();
    let out = items.filter(item => {
        if (q) {
            const hit = opts.searchFields.some(f => String(item[f] ?? "").toLowerCase().includes(q));
            if (!hit) return false;
        }
        if (opts.statusField && state.status !== "all") {
            if (String(item[opts.statusField]) !== state.status) return false;
        }
        return true;
    });
    const sorter = opts.sorters?.[state.sort];
    if (sorter) out = [...out].sort(sorter);
    return out;
}
