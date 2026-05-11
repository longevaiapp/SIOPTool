"use client";

import { useInsights, useProjects, useTasks } from "@/lib/hooks/use-resources";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { useT } from "@/lib/i18n";

/* ══════════════════════════════════════════════════════════════════════════
   🍎 COMMAND CENTER — True Liquid Glass Design
   ══════════════════════════════════════════════════════════════════════════ */

const ALERT_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
    critical: { bg: "rgba(255, 69, 58, 0.12)", text: "#ff453a", icon: "⚠" },
    warning: { bg: "rgba(255, 159, 10, 0.12)", text: "#c93400", icon: "⚡" },
    info: { bg: "rgba(0, 122, 255, 0.12)", text: "#0040dd", icon: "ℹ" },
    success: { bg: "rgba(48, 209, 88, 0.12)", text: "#248a3d", icon: "✓" },
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    open: { bg: "rgba(255, 69, 58, 0.12)", text: "#ff453a", label: "Open" },
    acknowledged: { bg: "rgba(255, 159, 10, 0.12)", text: "#c93400", label: "Acknowledged" },
    resolved: { bg: "rgba(48, 209, 88, 0.12)", text: "#248a3d", label: "Resolved" },
};

const MODULE_COLORS: Record<string, string> = {
    SIOP: "#30b0c7", Contracts: "#ff9f0a", Health: "#ff2d55", RFQ: "#30d158",
    PM: "#ff453a", CRM: "#007aff", PMO: "#0d9488", Analytics: "#475569",
};

function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? "s" : ""} ago`;
}

export default function CommandCenterPage() {
    const t = useT();
    const { data: insights, isLoading: insightsLoading } = useInsights();
    const { data: projects } = useProjects();
    const { data: tasks } = useTasks();

    // Calculate KPIs from real data
    const activeAlerts = (insights ?? []).filter(i => !i.acknowledged).length;
    const criticalCount = (insights ?? []).filter(i => i.severity === "critical" && !i.acknowledged).length;
    const warningCount = (insights ?? []).filter(i => i.severity === "warning" && !i.acknowledged).length;
    const healthyProjects = (projects ?? []).filter(p => (p.health_score ?? 80) >= 70).length;
    const totalProjects = (projects ?? []).length;
    const systemHealth = totalProjects > 0 ? Math.round((healthyProjects / totalProjects) * 100) : 100;
    const todayTasks = (tasks ?? []).filter(t => {
        const created = new Date(t.created_at);
        const today = new Date();
        return created.toDateString() === today.toDateString();
    }).length;
    const completedTasks = (tasks ?? []).filter(t => t.status === "done" || t.status === "DONE").length;

    const KPI_CARDS = [
        { label: t("command.kpi_active"), value: String(activeAlerts), delta: `${criticalCount} ${t("command.critical")}, ${warningCount} ${t("command.warning")}`, positive: activeAlerts === 0 },
        { label: t("command.kpi_health"), value: `${systemHealth}%`, delta: t("command.kpi_health_hint"), positive: systemHealth >= 80 },
        { label: t("command.kpi_tasks"), value: String(todayTasks || tasks?.length || 0), delta: `${completedTasks} ${t("command.completed")}`, positive: true },
        { label: t("command.kpi_projects"), value: String(totalProjects), delta: `${healthyProjects} ${t("command.healthy")}`, positive: null },
    ];

    // Convert insights to alerts format
    const ALERTS = (insights ?? [])
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10)
        .map(ins => ({
            id: ins.id,
            type: ins.severity === "critical" ? "critical" : ins.severity === "warning" ? "warning" : "info",
            title: ins.title,
            module: ins.module ?? "System",
            time: formatTimeAgo(new Date(ins.created_at)),
            status: ins.acknowledged ? "resolved" : "open",
        }));

    if (insightsLoading) {
        return <div className="p-6"><LoadingSkeleton rows={6} type="card" /></div>;
    }

    return (
        <div className="p-6">
            {/* Header */}
            <header className="mb-6">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#30d158]">{t("command.title")}</p>
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-[28px] font-bold tracking-tight text-[#1d1d1f]">{t("command.title")}</h1>
                        <p className="mt-0.5 text-[13px] text-[#8e8e93]">{t("command.subtitle")}</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="btn btn--secondary">{t("page.settings")}</button>
                        <button className="btn btn--primary"><span>●</span> {t("page.live_mode")}</button>
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

            {/* Alerts Table */}
            <div className="glass-card overflow-hidden">
                <div className="flex items-center justify-between border-b border-black/[0.04] px-5 py-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-[15px] font-semibold text-[#1d1d1f]">{t("command.alerts")}</h2>
                        {criticalCount > 0 && (
                            <span className="rounded-full bg-[#ff453a]/10 px-2.5 py-1 text-[11px] font-semibold text-[#ff453a]">
                                {criticalCount} {t("command.critical")}
                            </span>
                        )}
                    </div>
                </div>

                {ALERTS.length === 0 ? (
                    <div className="py-12 text-center text-[13px] text-[#8e8e93]">
                        {t("command.no_alerts")}
                    </div>
                ) : (
                    <table className="glass-table">
                        <thead>
                            <tr>
                                <th>{t("command.col_alert")}</th>
                                <th>{t("command.col_type")}</th>
                                <th>{t("command.col_module")}</th>
                                <th>{t("command.col_time")}</th>
                                <th>{t("command.col_status")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ALERTS.map((alert) => {
                                const alertStyle = ALERT_STYLES[alert.type] || ALERT_STYLES.info;
                                const statusStyle = STATUS_STYLES[alert.status] || STATUS_STYLES.open;
                                const moduleColor = MODULE_COLORS[alert.module] || "#8e8e93";
                                return (
                                    <tr key={alert.id} className="cursor-pointer">
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <span className="flex h-6 w-6 items-center justify-center rounded-full text-[12px]"
                                                    style={{ background: alertStyle.bg, color: alertStyle.text }}>{alertStyle.icon}</span>
                                                <span className="font-semibold text-[#1d1d1f]">{alert.title}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize"
                                                style={{ background: alertStyle.bg, color: alertStyle.text }}>{alert.type}</span>
                                        </td>
                                        <td>
                                            <span className="inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold"
                                                style={{ background: `${moduleColor}20`, color: moduleColor }}>{alert.module}</span>
                                        </td>
                                        <td className="text-[#8e8e93]">{alert.time}</td>
                                        <td>
                                            <span className="inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold"
                                                style={{ background: statusStyle.bg, color: statusStyle.text }}>{statusStyle.label}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
