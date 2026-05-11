"use client";

import { use } from "react";
import Link from "next/link";
import { useChangeOrder, useProjects, useClients } from "@/lib/hooks/use-resources";
import { useToast } from "@/components/shared/ToastProvider";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { changeOrdersApi } from "@/lib/api";
import { GeneratePdfButton } from "@/components/shared/GeneratePdfButton";
import { formatDate, formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";

const STATUS_OPTIONS = ["proposed", "approved", "rejected", "applied", "void"];

export default function ChangeOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const t = useT();
    const { id } = use(params);
    const { toast } = useToast();
    const { data: co, mutate, isLoading } = useChangeOrder(id);
    const { data: projects } = useProjects();
    const { data: clients } = useClients();

    if (isLoading || !co) return <div className="p-6"><LoadingSkeleton rows={6} type="card" /></div>;

    const project = projects?.find(p => p.id === co.project_id)?.name ?? "—";
    const client = clients?.find(c => c.id === co.client_id)?.name ?? "—";

    const updateStatus = async (status: string) => {
        try {
            const patch: Record<string, unknown> = { status };
            if (status === "approved") patch.approved_at = new Date().toISOString();
            if (status === "rejected") patch.rejected_at = new Date().toISOString();
            if (status === "applied") patch.applied_at = new Date().toISOString();
            await changeOrdersApi.update(id, patch);
            toast({ title: t("co.toast_status"), description: `CO → ${status}`, variant: "success" });
            mutate();
        } catch (e) {
            toast({ title: "Error", description: (e as Error).message, variant: "error" });
        }
    };

    return (
        <div className="p-6">
            <div className="mb-4">
                <Link href="/change-orders" className="text-[12px] font-semibold text-[#ff6b35]">{t("co.back")}</Link>
            </div>

            <div className="glass-card mb-6 p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#ff6b35]">{t("co.eyebrow")}</p>
                        <h1 className="text-[28px] font-bold tracking-tight text-[#1d1d1f]">{co.title}</h1>
                        <p className="mt-1 text-[13px] text-[#8e8e93]">
                            <span className="font-mono font-semibold text-[#ff6b35]">{co.folio}</span> · {project} · {client}
                        </p>
                    </div>
                    <select className="rounded-lg border border-black/10 bg-white px-3 py-2 text-[13px] font-semibold"
                        value={co.status} onChange={e => updateStatus(e.target.value)}>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                    </select>
                </div>
                <div className="mt-3 flex justify-end">
                    <GeneratePdfButton kind="change_order" sourceId={co.id} color="#ff6b35" />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="glass-card p-5">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#8e8e93]">{t("co.dt_timeline")}</p>
                    <p className="text-[24px] font-bold">{co.timeline_impact_days ? `${co.timeline_impact_days > 0 ? "+" : ""}${co.timeline_impact_days} ${t("co.days")}` : "—"}</p>
                </div>
                <div className="glass-card p-5">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#8e8e93]">{t("co.dt_budget")}</p>
                    <p className="text-[24px] font-bold">
                        {co.budget_impact ? `${Number(co.budget_impact) > 0 ? "+" : ""}${formatMoney(Number(co.budget_impact))} ${co.currency}` : "—"}
                    </p>
                </div>
                <div className="glass-card p-5">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#8e8e93]">{t("co.decision")}</p>
                    <p className="text-[14px] font-semibold">
                        {co.approved_at ? t("co.approved", { date: formatDate(co.approved_at) ?? "" }) :
                         co.rejected_at ? t("co.rejected", { date: formatDate(co.rejected_at) ?? "" }) :
                         co.applied_at ? t("co.applied", { date: formatDate(co.applied_at) ?? "" }) : t("co.pending")}
                    </p>
                </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
                <SectionView title={t("co.reason")} body={co.reason} />
                <SectionView title={t("co.description")} body={co.description} />
                <SectionView title={t("co.scope")} body={co.scope_impact} />
            </div>
        </div>
    );
}

function SectionView({ title, body }: { title: string; body?: string | null }) {
    return (
        <div className="glass-card p-5">
            <h3 className="mb-2 text-[14px] font-semibold text-[#1d1d1f]">{title}</h3>
            <p className="whitespace-pre-wrap text-[13px] text-[#1d1d1f]">{body || "—"}</p>
        </div>
    );
}
