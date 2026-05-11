"use client";

import { useState } from "react";
import Link from "next/link";
import { useClients } from "@/lib/hooks/use-resources";
import { useT } from "@/lib/i18n";

export default function PortalIndex() {
    const t = useT();
    const { data: clients = [], isLoading } = useClients();
    const [q, setQ] = useState("");

    const filtered = clients.filter(c => c.name.toLowerCase().includes(q.toLowerCase()));

    return (
        <div className="mx-auto max-w-5xl p-8">
            <header className="mb-8">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#d97706]">{t("portal.eyebrow")}</p>
                <h1 className="text-[28px] font-bold tracking-tight text-[#1d1d1f]">{t("portal.pick_client")}</h1>
                <p className="mt-1 text-[13px] text-[#8e8e93]">{t("portal.demo_mode")}</p>
            </header>

            <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder={t("portal.search_clients")}
                className="mb-4 w-full rounded-xl border border-black/[0.08] bg-white px-4 py-2.5 text-[14px] outline-none focus:border-[#d97706]"
            />

            {isLoading && <p className="text-[13px] text-[#8e8e93]">{t("common.loading")}</p>}
            <div className="grid gap-3 md:grid-cols-2">
                {filtered.map(c => (
                    <Link
                        key={c.id}
                        href={`/portal/${c.id}`}
                        className="group flex items-center justify-between rounded-2xl border border-black/[0.06] bg-white/60 p-4 backdrop-blur transition hover:border-[#d97706]/30 hover:shadow-md"
                    >
                        <div>
                            <p className="text-[15px] font-semibold text-[#1d1d1f]">{c.name}</p>
                            <p className="text-[12px] text-[#8e8e93]">{c.industry ?? "—"} · {c.segment ?? "—"} · {c.status ?? "—"}</p>
                        </div>
                        <span className="text-[18px] text-[#d97706] opacity-50 group-hover:opacity-100">→</span>
                    </Link>
                ))}
            </div>
            {!isLoading && filtered.length === 0 && (
                <p className="py-8 text-center text-[13px] text-[#8e8e93]">{t("portal.no_match")}</p>
            )}
        </div>
    );
}
