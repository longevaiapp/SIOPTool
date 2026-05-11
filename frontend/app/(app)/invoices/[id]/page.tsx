"use client";

import { use } from "react";
import Link from "next/link";
import { useInvoice, useClients, useProjects, useContracts } from "@/lib/hooks/use-resources";
import { useToast } from "@/components/shared/ToastProvider";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { invoicesApi } from "@/lib/api";
import { GeneratePdfButton } from "@/components/shared/GeneratePdfButton";
import { formatDate, formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";

const STATUS_OPTIONS = ["DRAFT", "SENT", "PAID", "OVERDUE", "VOID"];

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const t = useT();
    const { id } = use(params);
    const { toast } = useToast();
    const { data: inv, mutate, isLoading } = useInvoice(id);
    const { data: clients } = useClients();
    const { data: projects } = useProjects();
    const { data: contracts } = useContracts();

    if (isLoading || !inv) return <div className="p-6"><LoadingSkeleton rows={6} type="card" /></div>;

    const client = clients?.find(c => c.id === inv.client_id)?.name ?? "—";
    const project = projects?.find(p => p.id === inv.project_id)?.name ?? "—";
    const contract = contracts?.find(c => c.id === inv.contract_id)?.title ?? "—";

    const updateStatus = async (status: string) => {
        try {
            const patch: Record<string, unknown> = { status };
            if (status === "PAID" && !inv.paid_date) patch.paid_date = new Date().toISOString().slice(0, 10);
            await invoicesApi.update(id, patch);
            toast({ title: t("inv.toast_status"), description: `Invoice → ${status}`, variant: "success" });
            mutate();
        } catch (e) {
            toast({ title: "Error", description: (e as Error).message, variant: "error" });
        }
    };

    return (
        <div className="p-6">
            <div className="mb-4">
                <Link href="/invoices" className="text-[12px] font-semibold text-[#0a84ff]">{t("inv.back")}</Link>
            </div>

            <div className="glass-card mb-6 p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#0a84ff]">{t("inv.eyebrow")}</p>
                        <h1 className="text-[28px] font-bold tracking-tight text-[#1d1d1f]">
                            {formatMoney(Number(inv.amount))} <span className="text-[16px] font-medium text-[#8e8e93]">{inv.currency}</span>
                        </h1>
                        <p className="mt-1 text-[13px] text-[#8e8e93]">
                            <span className="font-mono font-semibold text-[#0a84ff]">{inv.folio || inv.number}</span> · {client} · {project}
                        </p>
                    </div>
                    <select className="rounded-lg border border-black/10 bg-white px-3 py-2 text-[13px] font-semibold"
                        value={inv.status} onChange={e => updateStatus(e.target.value)}>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="mt-3 flex justify-end">
                    <GeneratePdfButton kind="invoice" sourceId={inv.id} color="#0a84ff" />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <Box label={t("inv.box_issue")}>{formatDate(inv.issue_date) ?? "—"}</Box>
                <Box label={t("inv.box_due")}>{formatDate(inv.due_date) ?? "—"}</Box>
                <Box label={t("inv.box_paid")}>{formatDate(inv.paid_date) ?? "—"}</Box>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="glass-card p-5">
                    <h3 className="mb-3 text-[14px] font-semibold">{t("inv.refs")}</h3>
                    <dl className="space-y-2 text-[13px]">
                        <div className="flex justify-between"><dt className="text-[#8e8e93]">{t("inv.client")}</dt><dd className="font-semibold">{client}</dd></div>
                        <div className="flex justify-between"><dt className="text-[#8e8e93]">{t("inv.project")}</dt><dd>{project}</dd></div>
                        <div className="flex justify-between"><dt className="text-[#8e8e93]">{t("inv.contract")}</dt><dd>{contract}</dd></div>
                    </dl>
                </div>
                <div className="glass-card p-5">
                    <h3 className="mb-2 text-[14px] font-semibold">{t("inv.notes")}</h3>
                    <p className="whitespace-pre-wrap text-[13px] text-[#1d1d1f]">{inv.notes || "—"}</p>
                </div>
            </div>
        </div>
    );
}

function Box({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="glass-card p-5">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#8e8e93]">{label}</p>
            <p className="text-[14px] font-semibold">{children}</p>
        </div>
    );
}
