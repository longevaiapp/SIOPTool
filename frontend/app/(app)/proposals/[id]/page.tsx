"use client";

import { use } from "react";
import Link from "next/link";
import { useProposal, useClients } from "@/lib/hooks/use-resources";
import { useToast } from "@/components/shared/ToastProvider";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { proposalsApi } from "@/lib/api";
import { GeneratePdfButton } from "@/components/shared/GeneratePdfButton";
import { formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n";

const STATUS_OPTIONS = ["draft", "sent", "accepted", "rejected", "withdrawn", "expired"];

export default function ProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const t = useT();
    const { id } = use(params);
    const { toast } = useToast();
    const { data: p, mutate, isLoading } = useProposal(id);
    const { data: clients } = useClients();

    if (isLoading || !p) return <div className="p-6"><LoadingSkeleton rows={6} type="card" /></div>;
    const clientName = clients?.find(c => c.id === p.client_id)?.name ?? "—";

    const updateStatus = async (status: string) => {
        try {
            await proposalsApi.update(id, { status });
            toast({ title: t("prop.toast_status"), description: `Proposal → ${status}`, variant: "success" });
            mutate();
        } catch (e) {
            toast({ title: "Error", description: (e as Error).message, variant: "error" });
        }
    };

    return (
        <div className="p-6">
            <div className="mb-4">
                <Link href="/proposals" className="text-[12px] font-semibold text-[#5e5ce6]">{t("prop.back")}</Link>
            </div>

            <div className="glass-card mb-6 p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#5e5ce6]">{t("prop.eyebrow")} · v{p.version}</p>
                        <h1 className="text-[28px] font-bold tracking-tight text-[#1d1d1f]">{p.title}</h1>
                        <p className="mt-1 text-[13px] text-[#8e8e93]">
                            <span className="font-mono font-semibold text-[#5e5ce6]">{p.folio}</span> · {clientName} · <span className="uppercase">{p.commercial_model}</span>
                        </p>
                    </div>
                    <select className="rounded-lg border border-black/10 bg-white px-3 py-2 text-[13px] font-semibold"
                        value={p.status} onChange={e => updateStatus(e.target.value)}>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                    </select>
                </div>
                <div className="mt-3 flex justify-end">
                    <GeneratePdfButton kind="proposal" sourceId={p.id} color="#5e5ce6" />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <Box label={t("prop.box_created")}>{formatDate(p.created_at)}</Box>
                <Box label={t("prop.box_valid")}>{formatDate(p.valid_until)}</Box>
                <Box label={t("prop.box_sent")}>{formatDate(p.sent_at)}</Box>
            </div>

            <div className="mt-6 space-y-4">
                <SectionView title={t("prop.section_summary")} body={p.executive_summary} />
                <SectionView title={t("prop.section_scope")} body={p.scope_md} />
                <SectionView title={t("prop.section_approach")} body={p.approach_md} />
                <SectionView title={t("prop.section_timeline")} body={p.timeline_md} />
                <SectionView title={t("prop.section_team")} body={p.team_md} />
                <SectionView title={t("prop.section_assumptions")} body={p.assumptions_md} />
                <SectionView title={t("prop.section_terms")} body={p.terms_md} />
            </div>
        </div>
    );
}

function Box({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="glass-card p-5">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#8e8e93]">{label}</p>
            <p className="text-[16px] font-semibold">{children}</p>
        </div>
    );
}

function SectionView({ title, body }: { title: string; body?: string | null }) {
    if (!body) return null;
    return (
        <div className="glass-card p-5">
            <h3 className="mb-2 text-[14px] font-semibold text-[#1d1d1f]">{title}</h3>
            <p className="whitespace-pre-wrap text-[13px] text-[#1d1d1f]">{body}</p>
        </div>
    );
}
