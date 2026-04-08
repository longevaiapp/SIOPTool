"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const modules = [
    { name: "CRM", href: "/crm", color: "#2563eb" },
    { name: "RFQ", href: "/rfq", color: "#16a34a" },
    { name: "Contracts", href: "/contracts", color: "#7c3aed" },
    { name: "Juntify PM", href: "/pm-tab", color: "#ea580c" },
    { name: "PMO", href: "/pmo", color: "#0d9488" },
    { name: "Customer Health", href: "/customer-health", color: "#e11d48" },
    { name: "Client Portal", href: "/client-portal", color: "#d97706" },
    { name: "Suppliers", href: "/suppliers", color: "#4f46e5" },
    { name: "SIOP Engine", href: "/siop-engine", color: "#0891b2" },
    { name: "Analytics", href: "/analytics", color: "#475569" },
] as const;

function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-6 py-5">
                <p className="text-lg font-bold text-gray-900">LongevAI</p>
                <p className="text-xs text-gray-500">SIOP Tool</p>
            </div>
            <nav className="flex-1 overflow-y-auto p-3">
                <ul className="space-y-0.5">
                    {modules.map((mod) => {
                        const isActive = pathname.startsWith(mod.href);
                        return (
                            <li key={mod.href}>
                                <Link
                                    href={mod.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-gray-100 text-gray-900"
                                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                    )}
                                >
                                    <span
                                        className="h-2 w-2 flex-shrink-0 rounded-full"
                                        style={{ backgroundColor: mod.color }}
                                    />
                                    {mod.name}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </aside>
    );
}

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen overflow-hidden bg-gray-50">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
    );
}
