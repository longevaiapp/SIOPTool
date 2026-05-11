"use client";

import Link from "next/link";
import { getProjectsByClient, formatDate, daysBetween } from "@/lib/mock";
import { useT } from "@/lib/i18n";

const DEMO_CLIENT_ID = "cli-genomics";

export default function WorkspaceProjectsPage() {
    const t = useT();
    const projects = getProjectsByClient(DEMO_CLIENT_ID);

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-[24px] font-bold text-[#1d1d1f]">{t("ws.proj.title")}</h1>
                <p className="text-[13px] text-[#8e8e93]">{t("ws.proj.sub")}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {projects.map(p => (
                    <Link key={p.id} href={`/workspace/projects/${p.id}`} className="block rounded-2xl border border-black/[0.06] bg-white/60 p-5 backdrop-blur hover:shadow-lg">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff9f0a] to-[#ff453a] text-[18px] text-white">
                                📁
                            </div>
                            <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${
                                p.health === "green" ? "bg-[#30d158]/15 text-[#248a3d]" :
                                p.health === "yellow" ? "bg-[#ff9f0a]/15 text-[#c93400]" :
                                "bg-[#8e8e93]/15 text-[#636366]"
                            }`}>
                                {p.status}
                            </span>
                        </div>
                        <h3 className="text-[16px] font-semibold text-[#1d1d1f]">{p.name}</h3>
                        <p className="mt-1 text-[12px] text-[#8e8e93]">{p.description}</p>
                        <div className="mt-4">
                            <div className="mb-1 flex justify-between text-[11px]">
                                <span className="text-[#8e8e93]">{t("ws.proj.progress")}</span>
                                <span className="font-semibold text-[#1d1d1f]">{p.progress}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-black/[0.05]">
                                <div className="h-full bg-gradient-to-r from-[#ff9f0a] to-[#ff453a]" style={{ width: `${p.progress}%` }} />
                            </div>
                        </div>
                        <div className="mt-4 flex justify-between text-[11px] text-[#636366]">
                            <span>📅 {formatDate(p.start_date)}</span>
                            <span>🏁 {formatDate(p.end_date)}</span>
                            <span>{t("ws.proj.days_left", { n: daysBetween(new Date().toISOString(), p.end_date) })}</span>
                        </div>
                    </Link>
                ))}
                {projects.length === 0 && (
                    <p className="col-span-2 rounded-xl bg-black/[0.02] p-6 text-center text-[12px] text-[#8e8e93]">{t("ws.proj.empty")}</p>
                )}
            </div>
        </div>
    );
}
