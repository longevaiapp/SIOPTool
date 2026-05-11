"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { useRoleCapacity, useTimeEntries, useProjects } from "@/lib/hooks/use-resources";
import { roleCapacityApi, timeEntriesApi, timesheetOps } from "@/lib/api";
import { fetcher } from "@/lib/api/client";
import { useToast } from "@/components/shared/ToastProvider";
import { useT } from "@/lib/i18n";

type Tab = "capacity" | "timesheet";

const HOURS_PER_FTE = 40;

function thisMondayISO(): string {
    const d = new Date();
    const day = d.getDay() || 7; // Sun=0 -> 7
    if (day !== 1) d.setDate(d.getDate() - (day - 1));
    return d.toISOString().slice(0, 10);
}

function num(v: unknown, d = 0): number {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : d;
}

export default function CapacityPage() {
    const t = useT();
    const [tab, setTab] = useState<Tab>("capacity");
    const { toast } = useToast();

    const { data: capacity = [], mutate: mutateCap } = useRoleCapacity();
    const { data: entries = [], mutate: mutateEntries } = useTimeEntries();
    const { data: projects = [] } = useProjects();

    const week = thisMondayISO();
    const { data: weekSummary, mutate: mutateSummary } = useSWR<{
        week_start: string;
        total_hours: number;
        total_fte: number;
        by_role: { role: string; hours: number; fte: number; entries: number }[];
    }>(`/timesheets/summary?week_start=${week}`, fetcher);

    const totals = useMemo(() => {
        const avail = capacity.reduce((s, r) => s + num(r.available_fte), 0);
        const committed = capacity.reduce((s, r) => s + num(r.committed_fte), 0);
        const demand = capacity.reduce((s, r) => s + num(r.forecast_demand), 0);
        const util = avail > 0 ? (committed / avail) * 100 : 0;
        const gap = demand - avail;
        return { avail, committed, demand, util, gap };
    }, [capacity]);

    return (
        <div className="p-6">
            <header className="mb-6">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#0891b2]">
                    {t("capacity.eyebrow")}
                </p>
                <h1 className="text-[28px] font-bold tracking-tight text-[#1d1d1f]">{t("capacity.title")}</h1>
                <p className="mt-0.5 text-[13px] text-[#8e8e93]">
                    {t("capacity.subtitle")}
                </p>
            </header>

            <div className="mb-6 grid grid-cols-4 gap-4">
                <KPI label={t("capacity.kpi_available")} value={totals.avail.toFixed(1)} sub={t("capacity.roles_count", { n: capacity.length })} color="#0891b2" />
                <KPI label={t("capacity.kpi_committed")} value={totals.committed.toFixed(1)} sub={t("capacity.utilization_pct", { n: totals.util.toFixed(0) })} color={totals.util > 90 ? "#ff453a" : totals.util > 80 ? "#ff9f0a" : "#30d158"} />
                <KPI label={t("capacity.kpi_demand")} value={totals.demand.toFixed(1)} sub={t("capacity.next_horizon")} color="#5856d6" />
                <KPI label={t("capacity.kpi_gap")} value={totals.gap > 0 ? `-${totals.gap.toFixed(1)}` : t("capacity.balanced")} sub={totals.gap > 0 ? t("capacity.fte_shortage") : t("capacity.fte_surplus", { n: Math.abs(totals.gap).toFixed(1) })} color={totals.gap > 0 ? "#ff453a" : "#30d158"} />
            </div>

            <div className="mb-4 flex gap-2 border-b border-black/[0.06]">
                {(["capacity", "timesheet"] as Tab[]).map(tk => (
                    <button
                        key={tk}
                        onClick={() => setTab(tk)}
                        className={`px-4 py-2.5 text-[13px] font-medium transition-all ${tab === tk ? "border-b-2 border-[#0891b2] text-[#0891b2]" : "text-[#8e8e93] hover:text-[#1d1d1f]"}`}
                    >
                        {tk === "capacity" ? t("capacity.tab_capacity") : t("capacity.tab_timesheet")}
                    </button>
                ))}
            </div>

            {tab === "capacity" && (
                <CapacityTable
                    rows={capacity}
                    onSave={async (id, patch) => {
                        await roleCapacityApi.update(id, patch);
                        await mutateCap();
                        toast({ title: t("capacity.toast_updated"), variant: "success" });
                    }}
                    onAdd={async (row) => {
                        await roleCapacityApi.create(row);
                        await mutateCap();
                        toast({ title: t("capacity.toast_added"), variant: "success" });
                    }}
                    onDelete={async (id) => {
                        await roleCapacityApi.remove(id);
                        await mutateCap();
                        toast({ title: t("capacity.toast_removed"), variant: "success" });
                    }}
                />
            )}

            {tab === "timesheet" && (
                <TimesheetSection
                    week={week}
                    summary={weekSummary}
                    entries={entries.filter(e => e.week_start === week)}
                    projects={projects}
                    onAdd={async (row) => {
                        await timeEntriesApi.create(row);
                        await mutateEntries();
                        await mutateSummary();
                        toast({ title: t("capacity.toast_logged"), variant: "success" });
                    }}
                    onDelete={async (id) => {
                        await timeEntriesApi.remove(id);
                        await mutateEntries();
                        await mutateSummary();
                        toast({ title: t("capacity.toast_deleted"), variant: "success" });
                    }}
                    onRollup={async () => {
                        const res = await timesheetOps.rollup(week);
                        await mutateCap();
                        toast({
                            title: t("capacity.toast_rolled"),
                            description: t("capacity.toast_rolled_desc", { n: res.rows.length }),
                            variant: "success",
                        });
                    }}
                />
            )}
        </div>
    );
}

/* ─────────── Capacity table ─────────── */

type CapRow = {
    id: string;
    role: string;
    available_fte?: number | null;
    committed_fte?: number | null;
    forecast_demand?: number | null;
    week_start?: string | null;
};

function CapacityTable({
    rows, onSave, onAdd, onDelete,
}: {
    rows: CapRow[];
    onSave: (id: string, patch: Partial<CapRow>) => Promise<void>;
    onAdd: (row: { role: string; available_fte: number; committed_fte: number; forecast_demand: number; week_start?: string }) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}) {
    const t = useT();
    const [draft, setDraft] = useState({ role: "", available_fte: 1, committed_fte: 0, forecast_demand: 0 });
    const [busy, setBusy] = useState<string | null>(null);

    return (
        <div className="rounded-2xl border border-black/[0.06] bg-white/60 backdrop-blur">
            <table className="w-full text-[13px]">
                <thead className="border-b border-black/[0.06] bg-black/[0.02] text-[11px] uppercase text-[#8e8e93]">
                    <tr>
                        <th className="px-4 py-3 text-left">{t("capacity.col_role")}</th>
                        <th className="px-4 py-3 text-right">{t("capacity.col_available")}</th>
                        <th className="px-4 py-3 text-right">{t("capacity.col_committed")}</th>
                        <th className="px-4 py-3 text-right">{t("capacity.col_demand")}</th>
                        <th className="px-4 py-3 text-right">{t("capacity.col_utilization")}</th>
                        <th className="px-4 py-3 text-right">{t("capacity.col_gap")}</th>
                        <th className="px-4 py-3"></th>
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 && (
                        <tr><td colSpan={7} className="px-4 py-8 text-center text-[#8e8e93]">{t("capacity.empty_roles")}</td></tr>
                    )}
                    {rows.map(r => (
                        <CapRowEditor key={r.id} row={r} busy={busy === r.id} onSave={async (patch) => {
                            setBusy(r.id);
                            try { await onSave(r.id, patch); } finally { setBusy(null); }
                        }} onDelete={async () => {
                            setBusy(r.id);
                            try { await onDelete(r.id); } finally { setBusy(null); }
                        }} />
                    ))}
                    <tr className="border-t border-black/[0.06] bg-[#f5f5f7]">
                        <td className="px-4 py-3"><input className="w-full rounded-md border border-black/[0.08] bg-white px-2 py-1 text-[13px]" placeholder={t("capacity.ph_role")} value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value })} /></td>
                        <td className="px-4 py-3"><input type="number" step="0.1" className="w-20 rounded-md border border-black/[0.08] bg-white px-2 py-1 text-right text-[13px]" value={draft.available_fte} onChange={e => setDraft({ ...draft, available_fte: num(e.target.value) })} /></td>
                        <td className="px-4 py-3"><input type="number" step="0.1" className="w-20 rounded-md border border-black/[0.08] bg-white px-2 py-1 text-right text-[13px]" value={draft.committed_fte} onChange={e => setDraft({ ...draft, committed_fte: num(e.target.value) })} /></td>
                        <td className="px-4 py-3"><input type="number" step="0.1" className="w-20 rounded-md border border-black/[0.08] bg-white px-2 py-1 text-right text-[13px]" value={draft.forecast_demand} onChange={e => setDraft({ ...draft, forecast_demand: num(e.target.value) })} /></td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3 text-right">
                            <button
                                disabled={!draft.role.trim()}
                                onClick={async () => {
                                    if (!draft.role.trim()) return;
                                    await onAdd({ ...draft, week_start: thisMondayISO() });
                                    setDraft({ role: "", available_fte: 1, committed_fte: 0, forecast_demand: 0 });
                                }}
                                className="rounded-md bg-[#0891b2] px-3 py-1 text-[12px] font-semibold text-white hover:bg-[#0e7490] disabled:opacity-40"
                            >
                                {t("capacity.btn_add")}
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

function CapRowEditor({
    row, busy, onSave, onDelete,
}: {
    row: CapRow;
    busy: boolean;
    onSave: (patch: Partial<CapRow>) => Promise<void>;
    onDelete: () => Promise<void>;
}) {
    const t = useT();
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState({
        role: row.role,
        available_fte: num(row.available_fte),
        committed_fte: num(row.committed_fte),
        forecast_demand: num(row.forecast_demand),
    });
    const avail = num(row.available_fte);
    const committed = num(row.committed_fte);
    const demand = num(row.forecast_demand);
    const util = avail > 0 ? (committed / avail) * 100 : 0;
    const gap = demand - avail;
    const utilColor = util > 90 ? "#ff453a" : util > 80 ? "#ff9f0a" : "#30d158";

    if (editing) {
        return (
            <tr className="border-t border-black/[0.06] bg-[#fffbe6]">
                <td className="px-4 py-2"><input className="w-full rounded-md border border-black/[0.08] bg-white px-2 py-1" value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value })} /></td>
                <td className="px-4 py-2"><input type="number" step="0.1" className="w-20 rounded-md border border-black/[0.08] bg-white px-2 py-1 text-right" value={draft.available_fte} onChange={e => setDraft({ ...draft, available_fte: num(e.target.value) })} /></td>
                <td className="px-4 py-2"><input type="number" step="0.1" className="w-20 rounded-md border border-black/[0.08] bg-white px-2 py-1 text-right" value={draft.committed_fte} onChange={e => setDraft({ ...draft, committed_fte: num(e.target.value) })} /></td>
                <td className="px-4 py-2"><input type="number" step="0.1" className="w-20 rounded-md border border-black/[0.08] bg-white px-2 py-1 text-right" value={draft.forecast_demand} onChange={e => setDraft({ ...draft, forecast_demand: num(e.target.value) })} /></td>
                <td></td><td></td>
                <td className="px-4 py-2 text-right">
                    <button
                        disabled={busy}
                        onClick={async () => { await onSave(draft); setEditing(false); }}
                        className="mr-1 rounded-md bg-[#30d158] px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-40"
                    >{t("capacity.btn_save")}</button>
                    <button
                        disabled={busy}
                        onClick={() => { setDraft({ role: row.role, available_fte: avail, committed_fte: committed, forecast_demand: demand }); setEditing(false); }}
                        className="rounded-md bg-black/[0.06] px-2 py-1 text-[11px] font-semibold text-[#1d1d1f]"
                    >{t("capacity.btn_cancel")}</button>
                </td>
            </tr>
        );
    }

    return (
        <tr className="border-t border-black/[0.06] hover:bg-black/[0.02]">
            <td className="px-4 py-3 font-medium text-[#1d1d1f]">{row.role}</td>
            <td className="px-4 py-3 text-right text-[#1d1d1f]">{avail.toFixed(1)}</td>
            <td className="px-4 py-3 text-right text-[#1d1d1f]">{committed.toFixed(1)}</td>
            <td className="px-4 py-3 text-right text-[#1d1d1f]">{demand.toFixed(1)}</td>
            <td className="px-4 py-3 text-right font-semibold" style={{ color: utilColor }}>{util.toFixed(0)}%</td>
            <td className="px-4 py-3 text-right font-semibold" style={{ color: gap > 0 ? "#ff453a" : "#30d158" }}>{gap > 0 ? `-${gap.toFixed(1)}` : `+${Math.abs(gap).toFixed(1)}`}</td>
            <td className="px-4 py-3 text-right">
                <button disabled={busy} onClick={() => setEditing(true)} className="mr-1 rounded-md bg-black/[0.04] px-2 py-1 text-[11px] hover:bg-black/[0.08]">{t("capacity.btn_edit")}</button>
                <button disabled={busy} onClick={onDelete} className="rounded-md bg-[#ff453a]/10 px-2 py-1 text-[11px] font-semibold text-[#ff453a] hover:bg-[#ff453a]/20">×</button>
            </td>
        </tr>
    );
}

/* ─────────── Timesheet section ─────────── */

type TEntry = {
    id: string;
    user_name?: string | null;
    role: string;
    project_id?: string | null;
    week_start: string;
    hours?: number | null;
    notes?: string | null;
};

function TimesheetSection({
    week, summary, entries, projects, onAdd, onDelete, onRollup,
}: {
    week: string;
    summary?: {
        week_start: string; total_hours: number; total_fte: number;
        by_role: { role: string; hours: number; fte: number; entries: number }[];
    };
    entries: TEntry[];
    projects: { id: string; name: string }[];
    onAdd: (row: { role: string; project_id?: string; week_start: string; hours: number; user_name?: string; notes?: string }) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onRollup: () => Promise<void>;
}) {
    const t = useT();
    const [draft, setDraft] = useState({ role: "", project_id: "", hours: 8, user_name: "", notes: "" });
    const [busy, setBusy] = useState(false);
    const [rolling, setRolling] = useState(false);

    return (
        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
            <div className="rounded-2xl border border-black/[0.06] bg-white/60 backdrop-blur">
                <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-3">
                    <div>
                        <p className="text-[12px] font-semibold text-[#1d1d1f]">{t("capacity.entries_week", { w: week })}</p>
                        <p className="text-[11px] text-[#8e8e93]">{t(entries.length === 1 ? "capacity.entries_count_one" : "capacity.entries_count_other", { n: entries.length, h: (summary?.total_hours ?? 0).toFixed(1), f: (summary?.total_fte ?? 0).toFixed(2) })}</p>
                    </div>
                    <button
                        onClick={async () => { setRolling(true); try { await onRollup(); } finally { setRolling(false); } }}
                        disabled={rolling || (entries.length === 0)}
                        className="rounded-xl bg-gradient-to-br from-[#0891b2] to-[#0e7490] px-3 py-1.5 text-[12px] font-semibold text-white shadow-md hover:shadow-lg disabled:opacity-50"
                    >
                        {rolling ? t("capacity.btn_rolling") : t("capacity.btn_rollup")}
                    </button>
                </div>
                <table className="w-full text-[13px]">
                    <thead className="bg-black/[0.02] text-[11px] uppercase text-[#8e8e93]">
                        <tr>
                            <th className="px-4 py-2 text-left">{t("capacity.col_user")}</th>
                            <th className="px-4 py-2 text-left">{t("capacity.col_role")}</th>
                            <th className="px-4 py-2 text-left">{t("capacity.col_project")}</th>
                            <th className="px-4 py-2 text-right">{t("capacity.col_hours")}</th>
                            <th className="px-4 py-2"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.length === 0 && (
                            <tr><td colSpan={5} className="px-4 py-6 text-center text-[#8e8e93]">{t("capacity.empty_entries")}</td></tr>
                        )}
                        {entries.map(e => {
                            const proj = projects.find(p => p.id === e.project_id);
                            return (
                                <tr key={e.id} className="border-t border-black/[0.06]">
                                    <td className="px-4 py-2 text-[#1d1d1f]">{e.user_name ?? "—"}</td>
                                    <td className="px-4 py-2 text-[#1d1d1f]">{e.role}</td>
                                    <td className="px-4 py-2 text-[#636366]">{proj?.name ?? "—"}</td>
                                    <td className="px-4 py-2 text-right font-semibold text-[#1d1d1f]">{num(e.hours).toFixed(1)}</td>
                                    <td className="px-4 py-2 text-right">
                                        <button onClick={() => onDelete(e.id)} className="rounded-md bg-[#ff453a]/10 px-2 py-1 text-[11px] text-[#ff453a] hover:bg-[#ff453a]/20">×</button>
                                    </td>
                                </tr>
                            );
                        })}
                        <tr className="border-t border-black/[0.06] bg-[#f5f5f7]">
                            <td className="px-4 py-2"><input placeholder={t("capacity.ph_name")} className="w-full rounded-md border border-black/[0.08] bg-white px-2 py-1" value={draft.user_name} onChange={e => setDraft({ ...draft, user_name: e.target.value })} /></td>
                            <td className="px-4 py-2"><input placeholder={t("capacity.col_role")} className="w-full rounded-md border border-black/[0.08] bg-white px-2 py-1" value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value })} /></td>
                            <td className="px-4 py-2">
                                <select className="w-full rounded-md border border-black/[0.08] bg-white px-2 py-1" value={draft.project_id} onChange={e => setDraft({ ...draft, project_id: e.target.value })}>
                                    <option value="">{t("capacity.opt_none")}</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </td>
                            <td className="px-4 py-2 text-right"><input type="number" step="0.5" className="w-20 rounded-md border border-black/[0.08] bg-white px-2 py-1 text-right" value={draft.hours} onChange={e => setDraft({ ...draft, hours: num(e.target.value) })} /></td>
                            <td className="px-4 py-2 text-right">
                                <button
                                    disabled={busy || !draft.role.trim() || draft.hours <= 0}
                                    onClick={async () => {
                                        setBusy(true);
                                        try {
                                            await onAdd({
                                                role: draft.role.trim(),
                                                project_id: draft.project_id || undefined,
                                                week_start: week,
                                                hours: draft.hours,
                                                user_name: draft.user_name || undefined,
                                                notes: draft.notes || undefined,
                                            });
                                            setDraft({ role: "", project_id: "", hours: 8, user_name: "", notes: "" });
                                        } finally { setBusy(false); }
                                    }}
                                    className="rounded-md bg-[#0891b2] px-3 py-1 text-[12px] font-semibold text-white disabled:opacity-40"
                                >{t("capacity.btn_log")}</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="rounded-2xl border border-black/[0.06] bg-white/60 p-5 backdrop-blur">
                <h3 className="mb-3 text-[14px] font-semibold text-[#1d1d1f]">{t("capacity.by_role_title")}</h3>
                {!summary || summary.by_role.length === 0 ? (
                    <p className="py-6 text-center text-[12px] text-[#8e8e93]">{t("capacity.by_role_empty")}</p>
                ) : (
                    <div className="space-y-2">
                        {summary.by_role.map(r => (
                            <div key={r.role}>
                                <div className="mb-1 flex justify-between text-[12px]">
                                    <span className="font-medium text-[#1d1d1f]">{r.role}</span>
                                    <span className="text-[#8e8e93]">{t("capacity.by_role_unit", { h: r.hours.toFixed(1), f: r.fte.toFixed(2) })}</span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-black/[0.04]">
                                    <div className="h-full" style={{ width: `${Math.min(100, (r.hours / HOURS_PER_FTE) * 100)}%`, background: "#0891b2" }} />
                                </div>
                            </div>
                        ))}
                        <p className="mt-4 border-t border-black/[0.06] pt-3 text-[11px] text-[#8e8e93]">
                            {t("capacity.rollup_note", { n: HOURS_PER_FTE })}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─────────── KPI ─────────── */

function KPI({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
    return (
        <div className="rounded-2xl border border-black/[0.06] bg-white/60 p-4 backdrop-blur">
            <p className="text-[11px] font-medium text-[#8e8e93]">{label}</p>
            <p className="mt-1 text-[26px] font-bold" style={{ color }}>{value}</p>
            <p className="text-[11px] text-[#8e8e93]">{sub}</p>
        </div>
    );
}
