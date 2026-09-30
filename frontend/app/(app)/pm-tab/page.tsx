"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useProjects, useClients, useSprints } from "@/lib/hooks/use-resources";
import { formatMoney, initials } from "@/lib/format";
import { useListFilters, filterAndSort } from "@/components/shared/ListFilters";
import { LoadingSkeleton } from "@/components/shared";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";

/* ═══ Project Management ═══ */

const STATUS_STYLES = (t: (k: string) => string): Record<string, { bg: string; text: string; label: string }> => ({
    active: { bg: "rgba(48, 209, 88, 0.12)", text: "#248a3d", label: t("pm.status_active") },
    review: { bg: "rgba(191, 90, 242, 0.12)", text: "#8944ab", label: t("pm.status_review") },
    planning: { bg: "rgba(0, 122, 255, 0.12)", text: "#0040dd", label: t("pm.status_planning") },
    paused: { bg: "rgba(255, 159, 10, 0.12)", text: "#c93400", label: t("pm.status_paused") },
    complete: { bg: "rgba(142, 142, 147, 0.12)", text: "#636366", label: t("pm.status_complete") },
});

const HEALTH_COLORS: Record<string, string> = {
    green: "#30d158",
    yellow: "#ff9f0a",
    red: "#ff453a",
    gray: "#8e8e93",
};

function ProgressBar({ progress }: { progress: number }) {
    const color = progress >= 80 ? "#30d158" : progress >= 50 ? "#ff9f0a" : "#ff453a";
    return (
        <div className="flex items-center gap-2">
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-black/5">
                <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${progress}%`, background: color }}
                />
            </div>
            <span className="text-[11px] font-medium text-[#636366]">{progress}%</span>
        </div>
    );
}

function OwnerAvatar({ initials }: { initials: string }) {
    const colors: Record<string, string[]> = {
        SC: ["#007aff", "#5856d6"],
        MT: ["#30d158", "#64d2ff"],
        AO: ["#ff9f0a", "#ff453a"],
        DL: ["#bf5af2", "#ff2d55"],
    };
    const [start, end] = colors[initials] ?? ["#8e8e93", "#636366"];

    return (
        <div translate="no"
            className="avatar avatar--sm"
            style={{ "--avatar-start": start, "--avatar-end": end } as React.CSSProperties}
        >
            {initials}
        </div>
    );
}

export default function PMPage() {
    const t = useT();
    const { data: projectsData, isLoading } = useProjects();
    const { data: clientsData } = useClients();
    const { data: sprintsData } = useSprints();
    const router = useRouter();

    const PROJECTS = useMemo(() => {
        const clientMap = new Map((clientsData ?? []).map(c => [c.id, c.name]));
        const sprintsByProject = new Map<string, number>();
        (sprintsData ?? []).forEach(s => {
            sprintsByProject.set(s.project_id, (sprintsByProject.get(s.project_id) ?? 0) + 1);
        });
        return (projectsData ?? []).map(p => {
            const hs = Number(p.health_score ?? 0);
            return {
                id: p.id,
                displayId: p.id.slice(0, 8).toUpperCase(),
                name: p.name,
                client: (p.client_id && clientMap.get(p.client_id)) ?? p.client_name ?? "—",
                status: (p.status ?? "planning").toLowerCase(),
                progress: Number(p.progress ?? 0),
                budget: formatMoney(Number(p.budget ?? 0)),
                budgetNum: Number(p.budget ?? 0),
                health: hs >= 80 ? "green" : hs >= 60 ? "yellow" : hs > 0 ? "red" : "gray",
                healthScore: hs,
                pm: initials(p.pm_name, 2) || "PM",
                sprint: sprintsByProject.get(p.id) ?? 0,
            };
        });
    }, [projectsData, clientsData, sprintsData]);

    const totalBudget = PROJECTS.reduce((s, p) => s + p.budgetNum, 0);
    const onTrack = PROJECTS.filter(p => p.health === "green").length;
    const statusStyles = STATUS_STYLES(t);
    const KPI_CARDS = [
        { label: t("pm.kpi_active"), value: String(PROJECTS.filter(p => p.status === "active").length), delta: t("pm.total_count", { n: PROJECTS.length }), positive: true as boolean | null },
        { label: t("pm.kpi_ontrack"), value: PROJECTS.length ? `${Math.round((onTrack / PROJECTS.length) * 100)}%` : "—", delta: t("pm.healthy_count", { n: onTrack }), positive: true as boolean | null },
        { label: t("pm.kpi_budget"), value: formatMoney(totalBudget), delta: t("pm.projects_count", { n: PROJECTS.length }), positive: null as boolean | null },
        { label: t("pm.kpi_progress"), value: PROJECTS.length ? `${Math.round(PROJECTS.reduce((s, p) => s + p.progress, 0) / PROJECTS.length)}%` : "—", delta: t("pm.weighted"), positive: true as boolean | null },
    ];
    const filters = useListFilters({
        searchPlaceholder: t("pm.search_ph"),
        statusOptions: Object.entries(statusStyles).map(([v, s]) => ({ value: v, label: s.label })),
        sortOptions: [
            { value: "progress_desc", label: t("pm.sort_progress") },
            { value: "health_desc", label: t("pm.sort_health") },
            { value: "budget_desc", label: t("pm.sort_budget") },
        ],
    });
    const filtered = filterAndSort(PROJECTS, filters, {
        searchFields: ["name", "client", "pm", "displayId"],
        statusField: "status",
        sorters: {
            progress_desc: (a, b) => b.progress - a.progress,
            health_desc: (a, b) => b.healthScore - a.healthScore,
            budget_desc: (a, b) => b.budgetNum - a.budgetNum,
        },
    });
    return (
        <div className="p-6">
            {/* Header */}
            <header className="mb-6">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#ff453a]">
                    {t("pm.module_tag")}
                </p>
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-[28px] font-bold tracking-tight text-[#1d1d1f]">
                            {t("pm.title")}
                        </h1>
                        <p className="mt-0.5 text-[13px] text-[#8e8e93]">
                            {t("pm.subtitle")}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button className="btn btn--secondary">{t("page.roadmap")}</button>
                        <Link href="/pm-tab/sprints/new" className="btn btn--secondary">{t("page.new_sprint")}</Link>
                        <Link href="/pm-tab/tasks/new" className="btn btn--secondary">{t("page.new_task")}</Link>
                        <Link href="/pm-tab/new" className="btn btn--primary">{t("page.new_project")}</Link>
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

            {/* Projects Table */}
            <div className="glass-card overflow-hidden">
                <div className="flex items-center justify-between border-b border-black/[0.04] px-5 py-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-[15px] font-semibold text-[#1d1d1f]">{t("pm.portfolio")}</h2>
                        <span className="rounded-full bg-[#ff453a]/10 px-2.5 py-1 text-[11px] font-semibold text-[#ff453a]">
                            {filtered.length} projects
                        </span>
                    </div>
                </div>

                <table className="glass-table">
                    <thead>
                        <tr>
                            <th>{t("pm.col_project")}</th>
                            <th>{t("pm.col_client")}</th>
                            <th>{t("pm.col_status")}</th>
                            <th>{t("pm.col_progress")}</th>
                            <th>{t("pm.col_budget")}</th>
                            <th>{t("pm.col_health")}</th>
                            <th>{t("pm.col_pm")}</th>
                            <th>{t("pm.col_sprint")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && filtered.length === 0 && (
                            <tr><td colSpan={8} className="px-6 py-8"><LoadingSkeleton rows={4} type="text" /></td></tr>
                        )}
                        {!isLoading && filtered.length === 0 && (
                            <tr><td colSpan={8} className="py-12 text-center text-[13px] text-[#8e8e93]">{t("pm.empty")}</td></tr>
                        )}
                        {filtered.map((project) => {
                            const status = statusStyles[project.status] ?? statusStyles.planning;
                            return (
                                <tr key={project.id} className="cursor-pointer" onClick={() => router.push(`/pm-tab/${project.id}`)}>
                                    <td>
                                        <div>
                                            <span className="font-semibold text-[#1d1d1f] hover:text-[#ff453a]">
                                                {project.name}
                                            </span>
                                            <p className="text-[11px] text-[#8e8e93]">{project.displayId}</p>
                                        </div>
                                    </td>
                                    <td className="text-[#8e8e93]">{project.client}</td>
                                    <td>
                                        <span
                                            className="inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold"
                                            style={{ background: status.bg, color: status.text }}
                                        >
                                            {status.label}
                                        </span>
                                    </td>
                                    <td>
                                        <ProgressBar progress={project.progress} />
                                    </td>
                                    <td className="font-semibold text-[#1d1d1f]">{project.budget}</td>
                                    <td>
                                        <span
                                            className="inline-block h-2.5 w-2.5 rounded-full"
                                            style={{ background: HEALTH_COLORS[project.health] }}
                                        />
                                    </td>
                                    <td>
                                        <OwnerAvatar initials={project.pm} />
                                    </td>
                                    <td className="text-[#8e8e93]">S{project.sprint}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
