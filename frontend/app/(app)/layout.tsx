"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const systemViews = [
    { name: "Architecture", href: "/overview", icon: "📐", badge: null },
    { name: "Command Center", href: "/command", icon: "⚡", badge: "Live" },
    { name: "AI Insights", href: "/ai-insights", icon: "🧠", badge: "5" },
] as const;

const modules = [
    { name: "CRM", href: "/crm", color: "#2563eb", icon: "👥", num: "M01" },
    { name: "RFQ & Intake", href: "/rfq", color: "#16a34a", icon: "📋", num: "M02" },
    { name: "Compliance", href: "/contracts", color: "#7c3aed", icon: "🛡️", num: "M03" },
    { name: "Projects", href: "/pm-tab", color: "#ea580c", icon: "📁", num: "M04" },
    { name: "PMO", href: "/pmo", color: "#0d9488", icon: "🏗️", num: "M05" },
    { name: "Customer Health", href: "/customer-health", color: "#e11d48", icon: "❤️", num: "M06" },
    { name: "Client Portal", href: "/client-portal", color: "#d97706", icon: "🌐", num: "M07" },
    { name: "Suppliers", href: "/suppliers", color: "#4f46e5", icon: "🤝", num: "M08" },
    { name: "SIOP Engine", href: "/siop-engine", color: "#0891b2", icon: "🎯", num: "M09" },
    { name: "Finance & KPIs", href: "/analytics", color: "#475569", icon: "💰", num: "M10" },
] as const;

function Topbar({ moduleName }: { moduleName: string }) {
    return (
        <header
            style={{ height: "var(--topbar-h)", background: "var(--ink)", borderBottom: "1px solid var(--line-dk)" }}
            className="flex flex-shrink-0 items-center gap-3 px-4"
        >
            {/* Brand */}
            <div
                style={{ width: "var(--sidebar-w)", borderRight: "1px solid var(--line-dk)" }}
                className="flex flex-shrink-0 items-center gap-2.5 pr-4"
            >
                <div
                    style={{ background: "linear-gradient(135deg, var(--teal), var(--blue))" }}
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] text-sm font-bold text-white"
                >
                    L
                </div>
                <div className="leading-tight">
                    <p style={{ fontFamily: "var(--f-display)", color: "var(--white)", letterSpacing: "-.3px" }} className="text-[14.5px] font-bold">
                        Longe<span style={{ color: "var(--teal)" }}>vAI</span>
                    </p>
                    <p style={{ color: "rgba(255,255,255,.28)", letterSpacing: "1.8px" }} className="text-[9px] font-medium uppercase">
                        AIaaS · Juntify Platform
                    </p>
                </div>
            </div>

            {/* Breadcrumb */}
            <div className="flex flex-1 items-center gap-1.5 px-5">
                <span style={{ color: "rgba(255,255,255,.3)" }} className="text-[12px]">Platform</span>
                <span style={{ color: "rgba(255,255,255,.15)" }} className="text-[12px]">/</span>
                <span style={{ color: "rgba(255,255,255,.7)" }} className="text-[12px] font-medium">{moduleName}</span>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2">
                <div
                    style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.09)", borderRadius: "8px", color: "rgba(255,255,255,.45)" }}
                    className="flex items-center gap-1.5 px-3 py-[5px] text-[11px]"
                >
                    <span
                        style={{ background: "var(--teal)", boxShadow: "0 0 6px var(--teal)", animation: "blink 2.5s ease-in-out infinite" }}
                        className="h-1.5 w-1.5 rounded-full"
                    />
                    Live
                </div>
                <button
                    style={{ background: "linear-gradient(135deg,rgba(0,191,165,.22),rgba(0,191,165,.08))", border: "1px solid rgba(0,191,165,.3)", borderRadius: "9px", color: "var(--teal)", fontFamily: "var(--f-ui)" }}
                    className="flex items-center gap-1.5 px-3.5 py-[7px] text-[11.5px] font-semibold transition-colors hover:bg-[rgba(0,191,165,.28)]"
                >
                    ✦ AI Copilot
                </button>
                <div
                    style={{ background: "linear-gradient(135deg,#4F46E5,#7C5CFC)", borderRadius: "9px", fontFamily: "var(--f-ui)" }}
                    className="flex h-[34px] w-[34px] cursor-pointer items-center justify-center text-[12px] font-bold text-white"
                >
                    N
                </div>
            </div>
        </header>
    );
}

function Sidebar() {
    const pathname = usePathname();

    const navLink = (href: string, icon: string, label: string, badge?: string | null) => {
        const isActive = pathname === href || (href !== "/overview" && pathname.startsWith(href));
        return (
            <Link
                key={href}
                href={href}
                className={cn(
                    "relative mb-px flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-[7px]",
                    "text-[12px] font-medium transition-all duration-150 select-none",
                    isActive
                        ? "border border-[rgba(0,191,165,.15)] bg-[rgba(0,191,165,.1)] text-[var(--teal)]"
                        : "border border-transparent text-[rgba(255,255,255,.38)] hover:bg-[rgba(255,255,255,.06)] hover:text-[rgba(255,255,255,.75)]"
                )}
            >
                {isActive && (
                    <span
                        style={{ background: "var(--teal)", boxShadow: "0 0 8px var(--teal)" }}
                        className="absolute bottom-[20%] left-0 top-[20%] w-0.5 rounded-r-sm"
                    />
                )}
                <span className="w-4 flex-shrink-0 text-center text-[14px]">{icon}</span>
                <span className="flex-1">{label}</span>
                {badge && (
                    <span style={{ background: badge === "Live" ? "var(--teal)" : "var(--rose)", color: badge === "Live" ? "var(--ink)" : "var(--white)" }}
                        className="rounded-[10px] px-1.5 py-px text-[9px] font-bold">
                        {badge}
                    </span>
                )}
            </Link>
        );
    };

    return (
        <aside
            style={{ width: "var(--sidebar-w)", background: "var(--ink2)", borderRight: "1px solid var(--line-dk)" }}
            className="relative flex flex-shrink-0 flex-col overflow-y-auto"
        >
            <div
                style={{ background: "linear-gradient(180deg,var(--teal) 0%,transparent 40%)", opacity: .25 }}
                className="pointer-events-none absolute right-0 top-0 h-full w-px"
            />

            {/* System views */}
            <div className="pb-1 pt-4">
                <span style={{ color: "rgba(255,255,255,.2)", letterSpacing: "2px" }} className="block px-5 pb-1.5 text-[9px] font-bold uppercase">
                    System
                </span>
                <nav className="px-3">
                    {systemViews.map((v) => navLink(v.href, v.icon, v.name, v.badge))}
                </nav>
            </div>

            {/* Divider */}
            <div style={{ background: "rgba(255,255,255,.05)" }} className="mx-3 my-2 h-px" />

            {/* Module nav */}
            <div className="pb-2">
                <span style={{ color: "rgba(255,255,255,.2)", letterSpacing: "2px" }} className="block px-5 pb-1.5 text-[9px] font-bold uppercase">
                    Modules
                </span>
                <nav className="px-3">
                    {modules.map((mod) => navLink(mod.href, mod.icon, mod.name))}
                </nav>
            </div>

            {/* System status card */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,.05)" }} className="mt-auto flex-shrink-0 p-3">
                <div
                    style={{ background: "rgba(0,191,165,.06)", border: "1px solid rgba(0,191,165,.12)", borderRadius: "var(--radius-sm)" }}
                    className="px-3 py-2.5"
                >
                    <p style={{ color: "rgba(255,255,255,.25)", letterSpacing: "1.2px" }} className="mb-1.5 text-[9px] font-bold uppercase">
                        System Status
                    </p>
                    {[
                        { label: "API Gateway", status: "ok" },
                        { label: "Database", status: "ok" },
                        { label: "AI Engine", status: "ok" },
                    ].map(({ label, status }) => (
                        <div key={label} style={{ color: "rgba(255,255,255,.4)" }} className="mb-1 flex items-center gap-1.5 text-[10.5px]">
                            <span
                                style={{
                                    background: status === "ok" ? "var(--teal)" : status === "warn" ? "var(--amber)" : "var(--rose)",
                                    boxShadow: status === "ok" ? "0 0 5px var(--teal)" : "none",
                                }}
                                className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                            />
                            {label}
                        </div>
                    ))}
                </div>
            </div>
        </aside>
    );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const allNav = [...systemViews, ...modules];
    const active = allNav.find((m) => pathname === m.href || (m.href !== "/overview" && pathname.startsWith(m.href)));

    return (
        <div style={{ background: "var(--ink)" }} className="flex h-screen flex-col overflow-hidden">
            <Topbar moduleName={active?.name ?? "Dashboard"} />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main style={{ background: "var(--surface)" }} className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
