"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useSupplier, useProjects } from "@/lib/hooks/use-resources";
import { toMockSupplier, toMockProject } from "@/lib/adapters";
import { formatMoney } from "@/lib/format";
import { GeneratePdfButton } from "@/components/shared";
import { useT } from "@/lib/i18n";

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
    active: { bg: "rgba(48, 209, 88, 0.12)", text: "#248a3d" },
    evaluation: { bg: "rgba(0, 122, 255, 0.12)", text: "#0040dd" },
    inactive: { bg: "rgba(142, 142, 147, 0.12)", text: "#636366" },
};

const RISK_STYLES: Record<string, { color: string; label: string }> = {
    low: { color: "#30d158", label: "LOW RISK" },
    medium: { color: "#ff9f0a", label: "MEDIUM RISK" },
    high: { color: "#ff453a", label: "HIGH RISK" },
};

export default function SupplierDetailPage() {
    const t = useT();
    const params = useParams();
    const id = params.id as string;
    const { data: rawSupplier } = useSupplier(id);
    const { data: projectsData } = useProjects();
    const supplier = rawSupplier ? toMockSupplier(rawSupplier) : null;
    if (!supplier) return <div className="p-6 text-[13px] text-[#8e8e93]">{t("det.loading_supplier")}</div>;
    const status = STATUS_STYLES[supplier.status] ?? STATUS_STYLES.active;
    const risk = RISK_STYLES[supplier.risk_level] ?? RISK_STYLES.low;
    const usedProjects = supplier.used_in_projects
        .map(pid => (projectsData ?? []).find(p => p.id === pid))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .map(toMockProject);

    return (
        <div className="p-6">
            <Link href="/suppliers" className="mb-4 inline-flex items-center gap-2 text-[13px] text-[#4f46e5] hover:underline">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Suppliers
            </Link>

            <div className="glass-card mb-6 p-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                        <div translate="no" className="flex h-14 w-14 items-center justify-center rounded-2xl text-[20px] font-bold text-white" style={{ background: "linear-gradient(135deg, #4f46e5, #5856d6)" }}>
                            {supplier.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#4f46e5]">
                                Supplier · {supplier.id}
                            </p>
                            <h1 className="text-[28px] font-bold tracking-tight text-[#1d1d1f]">{supplier.name}</h1>
                            <p className="mt-0.5 text-[13px] text-[#8e8e93]">
                                {supplier.category.replace("_", " ")} · {supplier.contact}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <span className="status-badge" style={{ "--badge-bg": status.bg, "--badge-color": status.text } as React.CSSProperties}>
                            {supplier.status.toUpperCase()}
                        </span>
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ color: risk.color, background: `${risk.color}20` }}>
                            {risk.label}
                        </span>
                        <GeneratePdfButton kind="supplier_evaluation" sourceId={supplier.id} color="#4f46e5" label="Evaluación PDF" />
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-4 gap-4">
                    <div className="rounded-xl bg-black/[0.02] p-3">
                        <p className="text-[10px] font-medium uppercase text-[#8e8e93]">{t("det.rating")}</p>
                        <p className="mt-1 text-[24px] font-bold text-[#1d1d1f]">{supplier.rating}<span className="text-[12px] text-[#8e8e93]">/5</span></p>
                    </div>
                    <div className="rounded-xl bg-black/[0.02] p-3">
                        <p className="text-[10px] font-medium uppercase text-[#8e8e93]">{t("det.spend_ytd")}</p>
                        <p className="mt-1 text-[24px] font-bold text-[#1d1d1f]">{formatMoney(supplier.spend_ytd)}</p>
                    </div>
                    <div className="rounded-xl bg-black/[0.02] p-3">
                        <p className="text-[10px] font-medium uppercase text-[#8e8e93]">{t("det.contract_ends")}</p>
                        <p className="mt-1 text-[16px] font-bold text-[#1d1d1f]">{supplier.contract_end}</p>
                    </div>
                    <div className="rounded-xl bg-black/[0.02] p-3">
                        <p className="text-[10px] font-medium uppercase text-[#8e8e93]">{t("det.used_in")}</p>
                        <p className="mt-1 text-[24px] font-bold text-[#1d1d1f]">{usedProjects.length}<span className="text-[12px] text-[#8e8e93]"> {t("det.projects_lc")}</span></p>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                    <div className="glass-card p-5">
                        <h3 className="mb-3 text-[14px] font-semibold text-[#1d1d1f]">{t("det.services_provided")}</h3>
                        <div className="flex flex-wrap gap-2">
                            {supplier.services.map(s => (
                                <span key={s} className="rounded-full bg-[#4f46e5]/15 px-3 py-1 text-[12px] font-medium text-[#4f46e5]">{s}</span>
                            ))}
                        </div>
                    </div>

                    <div className="glass-card p-5">
                        <h3 className="mb-4 text-[14px] font-semibold text-[#1d1d1f]">{t("det.used_in_projects", { x: usedProjects.length })}</h3>
                        {usedProjects.length === 0 ? (
                            <p className="text-[12px] text-[#8e8e93]">{t("det.no_active_project")}</p>
                        ) : (
                            <div className="space-y-2">
                                {usedProjects.map(p => (
                                    <Link key={p.id} href={`/pm-tab/${p.id}`} className="flex items-center justify-between rounded-xl border border-black/[0.06] p-3 hover:bg-black/[0.02]">
                                        <div>
                                            <p className="text-[13px] font-semibold text-[#1d1d1f]">{p.name}</p>
                                            <p className="text-[11px] text-[#8e8e93]">{p.status} · {t("det.percent_complete", { p: p.progress })}</p>
                                        </div>
                                        <p className="text-[12px] font-medium text-[#1d1d1f]">{formatMoney(p.budget)}</p>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="glass-card p-5">
                        <h3 className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-[#1d1d1f]"><span>✦</span> {t("det.ai_supplier_insights").replace(/^✦ /, "")}</h3>
                        <div className="space-y-2">
                            {supplier.rating >= 4.5 && <Insight positive title={t("sup_d.top")} detail={t("sup_d.top_detail", { x: supplier.rating })} />}
                            {supplier.spend_ytd > 100000 && <Insight title={t("sup_d.high_spend")} detail={t("det.high_spend_detail", { m: formatMoney(supplier.spend_ytd) })} />}
                            {supplier.contract_end !== "-" && new Date(supplier.contract_end) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) && (
                                <Insight title={t("sup_d.renewal")} detail={t("det.renewal_detail", { d: supplier.contract_end })} />
                            )}
                            {supplier.risk_level === "high" && <Insight title={t("sup_d.high_risk")} detail={t("sup_d.high_risk_detail")} />}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="glass-card p-5">
                        <h3 className="mb-3 text-[13px] font-semibold text-[#1d1d1f]">{t("det.quick_actions")}</h3>
                        <div className="space-y-2">
                            <button className="w-full rounded-lg bg-[#4f46e5] px-3 py-2 text-[12px] font-semibold text-white">{t("det.contact_mgr")}</button>
                            <button className="w-full rounded-lg border border-black/[0.08] bg-black/[0.02] px-3 py-2 text-[12px] font-medium text-[#1d1d1f]">{t("det.view_contract")}</button>
                            <button className="w-full rounded-lg border border-black/[0.08] bg-black/[0.02] px-3 py-2 text-[12px] font-medium text-[#1d1d1f]">{t("det.update_rating")}</button>
                            <Link href={`/suppliers/${supplier.id}/edit`} className="flex items-center justify-center w-full rounded-lg border border-black/[0.08] bg-black/[0.02] px-3 py-2 text-[12px] font-medium text-[#1d1d1f]">⚙️ {t("det.edit")}</Link>
                        </div>
                    </div>

                    <div className="glass-card p-5">
                        <h3 className="mb-3 text-[13px] font-semibold text-[#1d1d1f]">{t("det.performance")}</h3>
                        <div className="flex items-center justify-center py-4">
                            <div className="text-center">
                                <p className="text-[48px] font-bold" style={{ color: supplier.rating >= 4.5 ? "#30d158" : supplier.rating >= 4 ? "#ff9f0a" : "#ff453a" }}>
                                    {supplier.rating}
                                </p>
                                <p className="text-[10px] uppercase text-[#8e8e93]">{t("det.out_of_5")}</p>
                            </div>
                        </div>
                        <div className="mt-4 space-y-1 text-[11px]">
                            <Row label={t("det.reliability")} value={`${Math.round(supplier.rating * 20)}%`} />
                            <Row label={t("det.quality")} value={`${Math.round(supplier.rating * 19)}%`} />
                            <Row label={t("det.cost")} value={`${Math.round(supplier.rating * 18)}%`} />
                            <Row label={t("det.support")} value={`${Math.round(supplier.rating * 21)}%`} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Insight({ title, detail, positive }: { title: string; detail: string; positive?: boolean }) {
    return (
        <div className="rounded-xl p-3" style={{ background: positive ? "rgba(48, 209, 88, 0.08)" : "rgba(255, 159, 10, 0.08)" }}>
            <p className="text-[12px] font-semibold" style={{ color: positive ? "#30d158" : "#ff9f0a" }}>{positive ? "✓" : "⚠"} {title}</p>
            <p className="mt-0.5 text-[11px] text-[#1d1d1f]">{detail}</p>
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return <div className="flex justify-between"><span className="text-[#8e8e93]">{label}:</span><span className="font-medium text-[#1d1d1f]">{value}</span></div>;
}
