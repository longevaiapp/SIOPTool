"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ROLE_CONFIG, ROLE_MODULES, type UserRole, type User } from "@/lib/types/user";
import { CopilotPanel } from "@/components/shared/CopilotPanel";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { ComposeOmnibox } from "@/components/shared/ComposeOmnibox";

/* ══════════════════════════════════════════════════════════════════════════
   🍎 TRUE LIQUID GLASS LAYOUT — Floating Panel over Ambient Background
   ══════════════════════════════════════════════════════════════════════════ */

const systemViews = [
    { name: "Meetings", href: "/meetings", icon: "mic", moduleKey: "meetings", badge: "New" },
    { name: "Command Center", href: "/command", icon: "command", moduleKey: "command", badge: "Live" },
    { name: "AI Insights", href: "/ai-insights", icon: "sparkle", moduleKey: "ai-insights", badge: "5" },
    { name: "Approvals", href: "/approvals", icon: "check", moduleKey: "approvals" },
    { name: "Audit Log", href: "/audit-log", icon: "shield", moduleKey: "audit-log" },
] as const;

const modules = [
    { name: "CRM", href: "/crm", color: "#007aff", num: "01", moduleKey: "crm" },
    { name: "RFQ & Intake", href: "/rfq", color: "#30d158", num: "02", moduleKey: "rfq" },
    { name: "Quotes", href: "/quotes", color: "#34c759", num: "02b", moduleKey: "quotes" },
    { name: "Proposals", href: "/proposals", color: "#5e5ce6", num: "02c", moduleKey: "proposals" },
    { name: "Compliance", href: "/contracts", color: "#ff9f0a", num: "03", moduleKey: "contracts" },
    { name: "Change Orders", href: "/change-orders", color: "#ff6b35", num: "03b", moduleKey: "change-orders" },
    { name: "Projects", href: "/pm-tab", color: "#ff453a", num: "04", moduleKey: "pm-tab" },
    { name: "PMO", href: "/pmo", color: "#bf5af2", num: "05", moduleKey: "pmo" },
    { name: "Customer Health", href: "/customer-health", color: "#ff2d55", num: "06", moduleKey: "customer-health" },
    { name: "Client Portal", href: "/portal", color: "#d97706", num: "06b", moduleKey: "portal" },
    { name: "Suppliers", href: "/suppliers", color: "#64d2ff", num: "07", moduleKey: "suppliers" },
    { name: "SIOP Engine", href: "/siop-engine", color: "#30b0c7", num: "08", moduleKey: "siop-engine" },
    { name: "Capacity", href: "/capacity", color: "#0891b2", num: "08b", moduleKey: "capacity" },
    { name: "Documents", href: "/documents", color: "#5856d6", num: "09b", moduleKey: "documents" },
    { name: "Invoices", href: "/invoices", color: "#0a84ff", num: "09c", moduleKey: "invoices" },
    { name: "Finance & KPIs", href: "/analytics", color: "#8e8e93", num: "09", moduleKey: "analytics" },
] as const;

// Check if user has access to a module
function hasAccess(role: UserRole, moduleKey: string): boolean {
    const allowedModules = ROLE_MODULES[role];
    if (allowedModules.includes("*")) return true;
    return allowedModules.includes(moduleKey);
}

// Minimalist SF-style icons
function Icon({ name, className }: { name: string; className?: string }) {
    const paths: Record<string, JSX.Element> = {
        grid: <path d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />,
        mic: <><circle cx="12" cy="10" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M8 10v2a4 4 0 008 0v-2M12 18v3m-3 0h6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>,
        command: <path d="M4 12h16M12 4v16M7.5 4.5l9 15M16.5 4.5l-9 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />,
        sparkle: <path d="M12 2v4m0 12v4M4 12h4m8 0h4M6.34 6.34l2.83 2.83m5.66 5.66l2.83 2.83M17.66 6.34l-2.83 2.83m-5.66 5.66l-2.83 2.83" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />,
        shield: <path d="M12 3l8 3v6c0 4.5-3.4 8.4-8 9-4.6-.6-8-4.5-8-9V6l8-3z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />,
        check: <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />,
    };

    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            {paths[name] ?? paths.grid}
        </svg>
    );
}

/* ─────────────────────────────────────────────────────────────────────────
   Sidebar (Glass Dark - Translucent)
   ───────────────────────────────────────────────────────────────────────── */
function Sidebar({ user, onLogout }: { user: User | null; onLogout: () => void }) {
    const pathname = usePathname();
    const t = useT();
    const userRole = user?.role || "admin";
    const roleConfig = ROLE_CONFIG[userRole];

    // Filter navigation based on role
    const visibleSystemViews = systemViews.filter((item) => hasAccess(userRole, item.moduleKey));
    const visibleModules = modules.filter((mod) => hasAccess(userRole, mod.moduleKey));

    // Translate the hard-coded `name` field at render-time so we don't need
    // to refactor the systemViews / modules constants.
    const NAV_KEY_BY_HREF: Record<string, string> = {
        "/meetings": "nav.meetings",
        "/command": "nav.command",
        "/ai-insights": "nav.ai_insights",
        "/approvals": "nav.approvals",
        "/audit-log": "nav.audit",
        "/crm": "nav.crm",
        "/rfq": "nav.rfq",
        "/quotes": "nav.quotes",
        "/proposals": "nav.proposals",
        "/contracts": "nav.contracts",
        "/change-orders": "nav.change_orders",
        "/pm-tab": "nav.pm",
        "/pmo": "nav.pmo",
        "/customer-health": "nav.health",
        "/portal": "nav.portal",
        "/suppliers": "nav.suppliers",
        "/siop-engine": "nav.siop",
        "/capacity": "nav.capacity",
        "/analytics": "nav.analytics",
        "/documents": "nav.documents",
        "/invoices": "nav.invoices",
    };
    const navLabel = (href: string, fallback: string) => {
        const k = NAV_KEY_BY_HREF[href];
        if (!k) return fallback;
        const tr = t(k);
        return tr === k ? fallback : tr;
    };

    return (
        <aside className="sidebar-glass flex w-[220px] flex-shrink-0 flex-col">
            {/* Logo */}
            <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#30b0c7] to-[#007aff] shadow-lg shadow-[#007aff]/30">
                    <span className="text-[15px] font-bold text-white">L</span>
                </div>
                <div>
                    <p className="text-[14px] font-semibold text-white">
                        Longe<span className="text-[#5ac8fa]">vAI</span>
                    </p>
                    <p className="text-[9px] font-medium uppercase tracking-[1px] text-white/40">
                        AIaaS · Juntify Platform
                    </p>
                </div>
            </div>

            {/* User Info */}
            {user && (
                <div className="border-b border-white/[0.08] px-4 py-3">
                    <div className="flex items-center gap-2">
                        <div
                            className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white"
                            style={{ backgroundColor: roleConfig.color }}
                        >
                            {user.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="truncate text-[12px] font-medium text-white">{user.name}</p>
                            <p className="text-[10px] text-white/50">{t(roleConfig.labelKey)}</p>
                        </div>
                        <button
                            onClick={onLogout}
                            className="rounded-lg p-1.5 text-white/40 hover:bg-white/[0.08] hover:text-white/80"
                            title={t("layout.logout")}
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-2 py-3">
                {/* System */}
                <p className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[1.5px] text-white/30">
                    {(t("nav.system") === "nav.system" ? "System" : t("nav.system"))}
                </p>
                {visibleSystemViews.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "group relative mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2",
                                "text-[12px] font-medium transition-all",
                                isActive
                                    ? "bg-white/[0.12] text-white"
                                    : "text-white/60 hover:bg-white/[0.06] hover:text-white/90"
                            )}
                        >
                            <Icon name={item.icon} className="h-4 w-4 opacity-80" />
                            <span className="flex-1">{navLabel(item.href, item.name)}</span>
                            {item.badge && (
                                <span className={cn(
                                    "rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                                    item.badge === "Live"
                                        ? "bg-[#30d158]/25 text-[#30d158]"
                                        : item.badge === "New"
                                        ? "bg-[#5856d6]/25 text-[#5856d6]"
                                        : "bg-[#ff2d55]/25 text-[#ff2d55]"
                                )}>
                                    {item.badge}
                                </span>
                            )}
                        </Link>
                    );
                })}

                {/* Divider */}
                {visibleModules.length > 0 && <div className="mx-2 my-3 h-px bg-white/[0.08]" />}

                {/* Modules */}
                {visibleModules.length > 0 && (
                    <>
                        <p className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[1.5px] text-white/30">
                            {(t("nav.modules") === "nav.modules" ? "Modules" : t("nav.modules"))}
                        </p>
                        {visibleModules.map((mod) => {
                            const isActive = pathname === mod.href || pathname.startsWith(mod.href + "/");
                            return (
                                <Link
                                    key={mod.href}
                                    href={mod.href}
                                    className={cn(
                                        "group relative mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2",
                                        "text-[12px] font-medium transition-all",
                                        isActive
                                            ? "text-white"
                                            : "text-white/60 hover:bg-white/[0.06] hover:text-white/90"
                                    )}
                                    style={isActive ? {
                                        background: `linear-gradient(135deg, ${mod.color}30, ${mod.color}15)`,
                                    } : undefined}
                                >
                                    {/* Active indicator bar */}
                                    {isActive && (
                                        <span
                                            className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full"
                                            style={{ background: mod.color, boxShadow: `0 0 10px ${mod.color}` }}
                                        />
                                    )}

                                    {/* Module icon (colored dot) */}
                                    <span
                                        className="h-2 w-2 rounded-full flex-shrink-0"
                                        style={{
                                            background: mod.color,
                                            boxShadow: isActive ? `0 0 8px ${mod.color}` : undefined,
                                        }}
                                    />

                                    {/* Module number */}
                                    <span
                                        className="font-mono text-[9px] font-bold w-4"
                                        style={{ color: isActive ? mod.color : "rgba(255,255,255,0.25)" }}
                                    >
                                        {mod.num}
                                    </span>

                                    {/* Label */}
                                    <span className="flex-1 truncate">{navLabel(mod.href, mod.name)}</span>
                                </Link>
                            );
                        })}
                    </>
                )}
            </nav>

            {/* Status footer */}
            <div className="border-t border-white/[0.08] p-2" />
        </aside>
    );
}

/* ─────────────────────────────────────────────────────────────────────────
   Topbar (inside floating panel)
   ───────────────────────────────────────────────────────────────────────── */
function Topbar({ moduleName, moduleColor, user }: { moduleName: string; moduleColor?: string; user: User | null }) {
    const t = useT();
    const roleConfig = user ? ROLE_CONFIG[user.role] : null;
    
    return (
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-black/[0.04] px-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2">
                <span className="text-[13px] text-[#8e8e93]">{t("layout.platform")}</span>
                <span className="text-[13px] text-[#c7c7cc]">/</span>
                <span className="text-[13px] font-medium text-[#1d1d1f]">{moduleName}</span>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-3">
                {/* Role Badge */}
                {roleConfig && (
                    <div 
                        className="hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium sm:flex"
                        style={{ 
                            backgroundColor: `${roleConfig.color}15`,
                            color: roleConfig.color 
                        }}
                    >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: roleConfig.color }} />
                        {t(roleConfig.labelKey)}
                    </div>
                )}

                {/* Search */}
                <button className="flex h-8 items-center gap-2 rounded-lg bg-black/[0.03] px-3 text-[12px] text-[#8e8e93] transition-colors hover:bg-black/[0.05]">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                    </svg>
                    <span className="hidden sm:inline">{t("layout.search")}</span>
                    <kbd className="hidden rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-[10px] sm:inline">⌘K</kbd>
                </button>

                {/* Live status */}
                <div className="flex items-center gap-2 rounded-full bg-[#30d158]/10 px-3 py-1.5">
                    <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#30d158] opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#30d158]" />
                    </span>
                    <span className="text-[12px] font-medium text-[#30d158]">{t("layout.live")}</span>
                </div>

                {/* Notifications */}
                <NotificationBell />

                {/* Language */}
                <LanguageSwitcher />

                {/* Avatar */}
                <div 
                    className="flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-semibold text-white shadow-md"
                    style={{ 
                        background: user 
                            ? `linear-gradient(135deg, ${roleConfig?.color || '#5856d6'}, ${roleConfig?.color || '#bf5af2'}88)`
                            : 'linear-gradient(135deg, #5856d6, #bf5af2)'
                    }}
                >
                    {user ? user.name.split(" ").map(n => n[0]).join("") : "?"}
                </div>
            </div>
        </header>
    );
}

/* ─────────────────────────────────────────────────────────────────────────
   Main Layout
   ───────────────────────────────────────────────────────────────────────── */
export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load user from localStorage and redirect if not logged in
    useEffect(() => {
        const storedUser = localStorage.getItem("demo_user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        } else {
            // No user found, redirect to login
            router.push("/login");
            return;
        }
        setIsLoading(false);
    }, [router]);

    // Route protection: redirect if user doesn't have access to current module
    useEffect(() => {
        if (!user || isLoading) return;
        
        // Find which module the current path belongs to
        const allNav = [...systemViews, ...modules];
        const currentModule = allNav.find(
            (m) => pathname === m.href || pathname.startsWith(m.href + "/")
        );
        
        // If we're on a module page and user doesn't have access, redirect to overview
        if (currentModule && !hasAccess(user.role, currentModule.moduleKey)) {
            router.push("/overview");
        }
    }, [user, pathname, router, isLoading]);

    const handleLogout = () => {
        localStorage.removeItem("demo_user");
        setUser(null);
        router.push("/login");
    };

    const allNav = [...systemViews, ...modules];
    const active = allNav.find((m) => pathname === m.href || pathname.startsWith(m.href + "/"));
    const activeModule = modules.find((m) => pathname === m.href || pathname.startsWith(m.href + "/"));

    // Show loading skeleton while checking auth
    if (isLoading || !user) {
        return (
            <>
                <div className="ambient-bg" />
                <div className="relative flex h-screen items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                </div>
            </>
        );
    }

    return (
        <>
            {/* 🌈 Ambient background layer */}
            <div className="ambient-bg" />

            {/* App shell */}
            <div className="relative flex h-screen gap-3 p-4">
                {/* Glass sidebar - floating */}
                <Sidebar user={user} onLogout={handleLogout} />

                {/* Floating content panel */}
                <div className="flex flex-1 flex-col">
                    <div className="floating-panel flex flex-1 flex-col overflow-hidden">
                        <Topbar 
                            moduleName={active?.name ?? "Dashboard"} 
                            moduleColor={activeModule?.color}
                            user={user}
                        />
                        <main className="flex-1 overflow-y-auto">
                            {children}
                        </main>
                    </div>
                </div>
            </div>
            <CopilotPanel />
            <ComposeOmnibox />
        </>
    );
}
