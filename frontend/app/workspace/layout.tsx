"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import type { User } from "@/lib/types/user";

/* ══════════════════════════════════════════════════════════════════════════
   🏢 CLIENT WORKSPACE LAYOUT
   Separate layout for client role only — no internal sidebar.
   Top navigation with their own modules.
   ══════════════════════════════════════════════════════════════════════════ */

const NAV = [
    { nameKey: "ws.nav_overview", href: "/workspace", icon: "🏠" },
    { nameKey: "ws.nav_projects", href: "/workspace/projects", icon: "📁" },
    { nameKey: "ws.nav_approvals", href: "/workspace/approvals", icon: "✓" },
    { nameKey: "ws.nav_documents", href: "/workspace/documents", icon: "📄" },
    { nameKey: "ws.nav_invoices", href: "/workspace/invoices", icon: "💰" },
    { nameKey: "ws.nav_messages", href: "/workspace/messages", icon: "💬" },
    { nameKey: "ws.nav_support", href: "/workspace/support", icon: "🎫" },
];

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
    const t = useT();
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem("demo_user");
        if (!stored) {
            router.push("/login");
            return;
        }
        const u = JSON.parse(stored) as User;
        if (u.role !== "client") {
            // Non-clients don't belong here
            router.push("/overview");
            return;
        }
        setUser(u);
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem("demo_user");
        router.push("/login");
    };

    if (!user) return null;

    return (
        <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #f5f5f7 0%, #ffffff 50%, #fff5e6 100%)" }}>
            {/* Top Bar */}
            <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-white/70 backdrop-blur-xl">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3">
                    {/* Brand */}
                    <Link href="/workspace" className="flex items-center gap-3">
                        <div translate="no" className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff9f0a] to-[#ff453a] text-[14px] font-bold text-white shadow-lg">
                            {user.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div>
                            <p className="text-[13px] font-semibold text-[#1d1d1f]">{t("ws.brand_title")}</p>
                            <p className="text-[10px] text-[#8e8e93]">{t("ws.brand_sub")}</p>
                        </div>
                    </Link>

                    {/* User */}
                    <div className="flex items-center gap-3">
                        <LanguageSwitcher />
                        <div className="text-right">
                            <p className="text-[12px] font-semibold text-[#1d1d1f]">{user.name}</p>
                            <p className="text-[10px] text-[#8e8e93]">{user.email}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="rounded-lg p-2 text-[#8e8e93] hover:bg-black/[0.04] hover:text-[#1d1d1f]"
                            title={t("ws.logout")}
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Nav */}
                <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-6">
                    {NAV.map(item => {
                        const isActive = pathname === item.href || (item.href !== "/workspace" && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-[12px] font-medium transition-all",
                                    isActive
                                        ? "border-[#ff9f0a] text-[#ff453a]"
                                        : "border-transparent text-[#636366] hover:text-[#1d1d1f]"
                                )}
                            >
                                <span>{item.icon}</span>
                                {t(item.nameKey)}
                            </Link>
                        );
                    })}
                </nav>
            </header>

            {/* Content */}
            <main className="mx-auto max-w-7xl px-6 py-6">
                {children}
            </main>
        </div>
    );
}
