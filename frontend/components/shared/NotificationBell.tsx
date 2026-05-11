"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/api/client";
import { useT } from "@/lib/i18n";

type NotifKind = "approval" | "insight" | "message";
type NotifSeverity = "critical" | "warning" | "info";

interface NotifItem {
    kind: NotifKind;
    id: string;
    title: string;
    subtitle: string;
    severity: NotifSeverity;
    href: string;
    project_id: string | null;
    client_id: string | null;
    created_at: string | null;
}

interface NotifFeed {
    total: number;
    counts: { approvals: number; insights: number; messages: number };
    items: NotifItem[];
}

const KIND_META: Record<NotifKind, { label: string; icon: string; color: string }> = {
    approval: { label: "Approval", icon: "✓", color: "#ff9f0a" },
    insight: { label: "Insight", icon: "✦", color: "#5856d6" },
    message: { label: "Message", icon: "✉", color: "#0a84ff" },
};

function timeAgo(iso: string | null): string {
    if (!iso) return "";
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return "";
    const diff = Math.max(0, Date.now() - then);
    const m = Math.floor(diff / 60_000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(iso).toLocaleDateString();
}

export function NotificationBell() {
    const t = useT();
    const { data } = useSWR<NotifFeed>("/notifications?limit=30", fetcher, {
        refreshInterval: 30_000,
        revalidateOnFocus: true,
    });
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const total = data?.total ?? 0;
    const items = data?.items ?? [];
    const counts = data?.counts ?? { approvals: 0, insights: 0, messages: 0 };

    useEffect(() => {
        if (!open) return;
        function onClick(e: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") setOpen(false);
        }
        document.addEventListener("mousedown", onClick);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onClick);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    return (
        <div ref={wrapperRef} className="relative">
            <button
                onClick={() => setOpen(o => !o)}
                aria-label={t("notif.title")}
                className="relative flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.03] text-[#1d1d1f] transition-colors hover:bg-black/[0.06]"
            >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .53-.21 1.04-.59 1.41L4 17h5m6 0a3 3 0 11-6 0" />
                </svg>
                {total > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-[#ff453a] px-1 text-[10px] font-bold text-white shadow">
                        {total > 99 ? "99+" : total}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-11 z-50 w-[380px] overflow-hidden rounded-2xl border border-black/[0.06] bg-white/95 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl">
                    <div className="flex items-center justify-between border-b border-black/[0.04] px-4 py-3">
                        <div>
                            <p className="text-[13px] font-bold text-[#1d1d1f]">{t("notif.inbox")}</p>
                            <p className="text-[11px] text-[#8e8e93]">
                                {counts.approvals} {t("notif.pending")} · {counts.insights} {t("notif.insights")} · {counts.messages} {t("notif.messages")}
                            </p>
                        </div>
                        <Link
                            href="/approvals"
                            onClick={() => setOpen(false)}
                            className="text-[11px] font-semibold text-[#5856d6] hover:underline"
                        >
                            {t("notif.view_approvals")}
                        </Link>
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto">
                        {items.length === 0 ? (
                            <div className="px-4 py-12 text-center text-[12px] text-[#8e8e93]">
                                <p className="text-[24px]">🎉</p>
                                <p className="mt-2 font-medium text-[#1d1d1f]">{t("notif.all_clear").replace(/^🎉\s*/, "")}</p>
                                <p>{t("notif.empty")}</p>
                            </div>
                        ) : (
                            <ul>
                                {items.map(item => {
                                    const meta = KIND_META[item.kind];
                                    return (
                                        <li key={`${item.kind}-${item.id}`}>
                                            <Link
                                                href={item.href}
                                                onClick={() => setOpen(false)}
                                                className="flex items-start gap-3 border-b border-black/[0.03] px-4 py-3 last:border-b-0 hover:bg-black/[0.02]"
                                            >
                                                <span
                                                    className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
                                                    style={{ background: meta.color }}
                                                >
                                                    {meta.icon}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="truncate text-[12px] font-semibold text-[#1d1d1f]">{item.title}</p>
                                                        <span className="flex-shrink-0 text-[10px] text-[#8e8e93]">{timeAgo(item.created_at)}</span>
                                                    </div>
                                                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[#636366]">{item.subtitle}</p>
                                                    <span
                                                        className="mt-1 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                                                        style={{ background: `${meta.color}15`, color: meta.color }}
                                                    >
                                                        {meta.label}
                                                    </span>
                                                </div>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
