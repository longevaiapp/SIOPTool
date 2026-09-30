"use client";

import Link from "next/link";
import {
    useDeals, useProjects, useClients, useInsights,
    useRoleCapacity, useDemandForecast, useScenarios,
} from "@/lib/hooks/use-resources";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { useT, useI18n } from "@/lib/i18n";

/* ══════════════════════════════════════════════════════════════════════════
   🍎 OVERVIEW DASHBOARD — Apple Liquid Glass Design
   ══════════════════════════════════════════════════════════════════════════ */

const ALERT_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
    critical: { bg: "rgba(255, 69, 58, 0.12)", text: "#ff453a", icon: "🔴" },
    warning: { bg: "rgba(255, 159, 10, 0.12)", text: "#ff9f0a", icon: "🟡" },
    info: { bg: "rgba(10, 132, 255, 0.12)", text: "#0a84ff", icon: "🔵" },
    success: { bg: "rgba(48, 209, 88, 0.12)", text: "#30d158", icon: "🟢" },
};

const QUICK_ACTIONS = [
    { icon: "➕", labelKey: "overview.qa_new_deal", color: "#0a84ff", href: "/crm/new" },
    { icon: "📋", labelKey: "overview.qa_start_rfq", color: "#30d158", href: "/rfq/new" },
    { icon: "📁", labelKey: "overview.qa_create_project", color: "#ff9f0a", href: "/pm-tab/new" },
    { icon: "🎙️", labelKey: "overview.qa_new_meeting", color: "#5856d6", href: "/meetings/new" },
];

// ─── Components ───────────────────────────────────────────────────────────────

function ScoreRing({ score, color, size = 120 }: { score: number; color: string; size?: number }) {
    const radius = (size - 16) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    
    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg className="absolute inset-0" viewBox={`0 0 ${size} ${size}`}>
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="8" />
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="8"
                    strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
                    style={{ transform: "rotate(-90deg)", transformOrigin: "center", filter: `drop-shadow(0 0 8px ${color}40)` }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[32px] font-bold text-[#1d1d1f]">{score}</span>
                <span className="text-[12px] text-[#86868b]">/100</span>
            </div>
        </div>
    );
}

function ModuleStatusDot({ status }: { status: string }) {
    const colors: Record<string, string> = { healthy: "#30d158", warning: "#ff9f0a", critical: "#ff453a" };
    return <span className="status-dot" style={{ background: colors[status] || colors.healthy }} />;
}

function getModuleStatus(score: number): string {
    if (score >= 80) return "healthy";
    if (score >= 60) return "warning";
    return "critical";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OverviewPage() {
    const t = useT();
    const { locale } = useI18n();
    const { data: deals, isLoading: dealsLoading } = useDeals();
    const { data: projects, isLoading: projectsLoading } = useProjects();
    const { data: clients, isLoading: clientsLoading } = useClients();
    const { data: insights, isLoading: insightsLoading } = useInsights();
    const { data: capacity } = useRoleCapacity();
    const { data: scenarios } = useScenarios();

    const isLoading = dealsLoading || projectsLoading || clientsLoading;

    // Calculate stats from real data — coerce decimals (API returns DECIMAL as string)
    const num = (v: unknown, fallback = 0): number => {
        const n = typeof v === "string" ? parseFloat(v) : (v as number);
        return Number.isFinite(n) ? n : fallback;
    };
    const clamp100 = (n: number) => Math.min(100, Math.max(0, n));

    const pipelineValue = (deals ?? [])
        .filter(d => !["closed_won", "closed_lost"].includes(d.stage))
        .reduce((sum, d) => sum + num(d.value), 0);
    const activeProjects = (projects ?? []).filter(p => {
        const s = (p.status ?? "").toLowerCase();
        return s === "active" || s === "in_progress" || s === "planning";
    }).length;
    const avgHealth = (projects ?? []).length > 0
        ? clamp100(Math.round((projects ?? []).reduce((sum, p) => sum + num(p.health_score, 80), 0) / projects!.length))
        : 85;
    const totalCapacity = (capacity ?? []).reduce((sum, c) => sum + num(c.available_hours), 0);
    const totalAllocated = (capacity ?? []).reduce((sum, c) => sum + num(c.allocated_hours), 0);
    const utilization = totalCapacity > 0 ? clamp100(Math.round((totalAllocated / totalCapacity) * 100)) : 80;

    const STATS = [
        { label: t("overview.kpi_siop"), value: String(avgHealth), unit: "/100", trend: "", color: "#30d158" },
        { label: t("overview.kpi_pipeline"), value: `$${(pipelineValue / 1000).toFixed(0)}K`, unit: "", trend: "", color: "#0a84ff" },
        { label: t("overview.kpi_utilization"), value: `${utilization}%`, unit: "", trend: "", color: "#ff9f0a" },
        { label: t("overview.kpi_projects"), value: String(activeProjects), unit: "", trend: "", color: "#bf5af2" },
    ];

    // Calculate module health from real data
    const crmScore = clamp100(Math.round(((deals ?? []).length / 10) * 100));
    const projectScore = avgHealth;
    const clientScore = (clients ?? []).length > 0
        ? clamp100(Math.round((clients ?? []).reduce((sum, c) => sum + num(c.health_score, 80), 0) / clients!.length))
        : 85;

    const MODULES = [
        { name: t("overview.mod_crm"), status: getModuleStatus(crmScore), score: crmScore, color: "#0a84ff", href: "/crm" },
        { name: t("overview.mod_rfq"), status: "healthy", score: 88, color: "#30d158", href: "/rfq" },
        { name: t("overview.mod_compliance"), status: "warning", score: 74, color: "#bf5af2", href: "/contracts" },
        { name: t("overview.mod_projects"), status: getModuleStatus(projectScore), score: clamp100(projectScore), color: "#ff9f0a", href: "/pm-tab" },
        { name: t("overview.mod_pmo"), status: "healthy", score: 91, color: "#64d2ff", href: "/pmo" },
        { name: t("overview.mod_health"), status: getModuleStatus(clientScore), score: clamp100(clientScore), color: "#ff375f", href: "/customer-health" },
        { name: t("overview.mod_siop"), status: getModuleStatus(avgHealth), score: clamp100(avgHealth), color: "#00c7be", href: "/siop-engine" },
        { name: t("overview.mod_finance"), status: "healthy", score: 94, color: "#8e8e93", href: "/analytics" },
    ];

    // Get recent AI insights
    const recentInsights = (insights ?? [])
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 4)
        .map(ins => ({
            type: ins.severity === "critical" ? "critical" : ins.severity === "warning" ? "warning" : ins.severity === "info" ? "info" : "success",
            module: ins.module ?? "AI",
            title: ins.title,
            time: formatTimeAgo(new Date(ins.created_at), t),
        }));

    if (isLoading) {
        return (
            <div className="p-6">
                <LoadingSkeleton rows={8} type="card" />
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Header */}
            <header className="mb-6">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#30b0c7]">{t("overview.title")}</p>
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-[28px] font-bold tracking-tight text-[#1d1d1f]">{t("overview.welcome")}</h1>
                        <p className="mt-0.5 text-[13px] text-[#8e8e93]">
                            {t("overview.subtitle")} · {new Date().toLocaleDateString(locale === "es" ? "es-ES" : "en-US", { month: "short", year: "numeric" })}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {QUICK_ACTIONS.map((action) => (
                            <Link key={action.labelKey} href={action.href} className="btn btn--glass">
                                <span>{action.icon}</span>
                                {t(action.labelKey)}
                            </Link>
                        ))}
                    </div>
                </div>
            </header>

            {/* Main Grid */}
            <div className="grid grid-cols-12 gap-6">
                {/* Left Column - Stats & Modules */}
                <div className="col-span-8 space-y-6">
                    {/* Stats Row */}
                    <div className="grid grid-cols-4 gap-4">
                        {STATS.map((stat) => (
                            <div key={stat.label} className="glass-stat">
                                <p className="mb-1 text-[11px] font-medium text-[#8e8e93]">{stat.label}</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-[28px] font-bold tracking-tight" style={{ color: stat.color }}>{stat.value}</span>
                                    <span className="text-[13px] text-[#8e8e93]">{stat.unit}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Module Health Grid */}
                    <div className="glass-card overflow-hidden">
                        <div className="border-b border-black/[0.04] px-5 py-4">
                            <h2 className="text-[15px] font-semibold text-[#1d1d1f]">{t("overview.module_health")}</h2>
                        </div>
                        <div className="grid grid-cols-4 gap-px bg-black/[0.03]">
                            {MODULES.map((mod) => (
                                <a key={mod.name} href={mod.href}
                                    className="group flex flex-col gap-3 bg-white/40 p-4 transition-all hover:bg-white/60">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[12px] font-semibold text-[#1d1d1f] group-hover:text-[#007aff]">{mod.name}</span>
                                        <ModuleStatusDot status={mod.status} />
                                    </div>
                                    <div className="relative h-1.5 overflow-hidden rounded-full bg-black/[0.04]">
                                        <div className="absolute inset-y-0 left-0 rounded-full transition-all"
                                            style={{ width: `${mod.score}%`, background: mod.color, boxShadow: `0 0 6px ${mod.color}50` }} />
                                    </div>
                                    <span className="text-[10px] font-bold" style={{ color: mod.color }}>{mod.score}%</span>
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Recent Deals */}
                    <div className="glass-card overflow-hidden">
                        <div className="border-b border-black/[0.04] px-6 py-4">
                            <h2 className="text-[16px] font-semibold text-[#1d1d1f]">{t("overview.recent_pipeline")}</h2>
                        </div>
                        <div className="divide-y divide-black/[0.04]">
                            {(deals ?? []).slice(0, 4).map((deal) => (
                                <Link key={deal.id} href={`/crm/${deal.id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-black/[0.02]">
                                    <div translate="no" className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#0a84ff] text-[12px] font-bold text-white">
                                        {(deal.client_name ?? "?").slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[13px] text-[#1d1d1f]">{deal.client_name} — {deal.stage}</p>
                                        <p className="text-[11px] text-[#86868b]">{t("overview.deal_sub", { value: (num(deal.value) / 1000).toFixed(0), prob: num(deal.probability) })}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column - SIOP Score & AI Insights */}
                <div className="col-span-4 space-y-6">
                    {/* SIOP Score Card */}
                    <div className="glass-card p-6">
                        <h3 className="mb-6 text-center text-[14px] font-semibold text-[#1d1d1f]">{t("overview.health_score")}</h3>
                        <div className="flex justify-center">
                            <ScoreRing score={avgHealth} color="#00c7be" size={160} />
                        </div>
                        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-[20px] font-bold text-[#0a84ff]" translate="no">S</p>
                                <p className="text-[10px] text-[#86868b]">{t("overview.demand")}</p>
                                <p className="text-[14px] font-semibold text-[#1d1d1f]">{Math.min(100, (deals ?? []).length * 10)}</p>
                            </div>
                            <div>
                                <p className="text-[20px] font-bold text-[#ff9f0a]" translate="no">I</p>
                                <p className="text-[10px] text-[#86868b]">{t("overview.capacity")}</p>
                                <p className="text-[14px] font-semibold text-[#1d1d1f]">{100 - utilization + 50}</p>
                            </div>
                            <div>
                                <p className="text-[20px] font-bold text-[#30d158]" translate="no">OP</p>
                                <p className="text-[10px] text-[#86868b]">{t("overview.operations")}</p>
                                <p className="text-[14px] font-semibold text-[#1d1d1f]">{avgHealth}</p>
                            </div>
                        </div>
                    </div>

                    {/* AI Insights */}
                    <div className="glass-dark overflow-hidden rounded-[20px]">
                        <div className="border-b border-white/[0.06] px-5 py-4">
                            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-white">
                                <span className="text-[18px]">✦</span>
                                {t("overview.ai_insights")}
                            </h2>
                        </div>
                        <div className="space-y-2 p-4">
                            {recentInsights.length === 0 ? (
                                <p className="py-4 text-center text-[12px] text-white/50">{t("overview.no_insights")}</p>
                            ) : (
                                recentInsights.map((insight, i) => {
                                    const style = ALERT_STYLES[insight.type] ?? ALERT_STYLES.info;
                                    return (
                                        <div key={i} className="rounded-xl bg-white/[0.04] p-4 ring-1 ring-inset ring-white/[0.06] transition-all hover:bg-white/[0.06]">
                                            <div className="mb-2 flex items-center gap-2">
                                                <span>{style.icon}</span>
                                                <span className="rounded-md px-2 py-0.5 text-[9px] font-bold uppercase"
                                                    style={{ background: style.bg, color: style.text }}>{insight.module}</span>
                                                <span className="ml-auto text-[10px] text-white/30">{insight.time}</span>
                                            </div>
                                            <p className="text-[12px] leading-snug text-white/80">{insight.title}</p>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function formatTimeAgo(date: Date, t: (k: string, v?: Record<string, string|number>) => string): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return t("overview.time_just_now");
    if (minutes < 60) return t("overview.time_min_ago", { n: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t("overview.time_hour_ago", { n: hours });
    const days = Math.floor(hours / 24);
    return t("overview.time_day_ago", { n: days });
}
