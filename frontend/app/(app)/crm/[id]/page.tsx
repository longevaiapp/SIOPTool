"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useDeal, useClient, useRfq, useProject, useMeetings, useInsights } from "@/lib/hooks/use-resources";
import { dealsApi, getDealRelated, type DealRelated } from "@/lib/api";
import { toMockDeal, toMockClient, toMockRFQ, toMockProject, toMockMeeting } from "@/lib/adapters";
import { formatMoney, formatDate } from "@/lib/format";
import { useToast } from "@/components/shared/ToastProvider";
import { PipelineTimeline } from "@/components/shared/PipelineTimeline";
import { useT } from "@/lib/i18n";

const DEAL_STAGE_COLORS: Record<string, { bg: string; text: string }> = {
    "Qualified Lead": { bg: "rgba(142, 142, 147, 0.12)", text: "#636366" },
    "Discovery": { bg: "rgba(0, 122, 255, 0.12)", text: "#0040dd" },
    "RFQ Submitted": { bg: "rgba(255, 204, 0, 0.12)", text: "#996f00" },
    "Demo Done": { bg: "rgba(191, 90, 242, 0.12)", text: "#8944ab" },
    "Proposal Sent": { bg: "rgba(255, 159, 10, 0.12)", text: "#c93400" },
    "Negotiation": { bg: "rgba(48, 209, 88, 0.12)", text: "#248a3d" },
    "Won": { bg: "rgba(48, 209, 88, 0.18)", text: "#0a7a30" },
    "Lost": { bg: "rgba(255, 69, 58, 0.12)", text: "#c93400" },
    // schema-default lowercase stages
    "prospect":    { bg: "rgba(142, 142, 147, 0.12)", text: "#636366" },
    "qualified":   { bg: "rgba(0, 122, 255, 0.12)", text: "#0040dd" },
    "proposal":    { bg: "rgba(255, 159, 10, 0.12)", text: "#c93400" },
    "negotiation": { bg: "rgba(48, 209, 88, 0.12)", text: "#248a3d" },
    "won":         { bg: "rgba(48, 209, 88, 0.18)", text: "#0a7a30" },
    "lost":        { bg: "rgba(255, 69, 58, 0.12)", text: "#c93400" },
};
const FALLBACK_STAGE_COLOR = { bg: "rgba(142, 142, 147, 0.12)", text: "#636366" };

export default function DealDetailPage() {
    const t = useT();
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const dealId = params.id as string;
    const { data: rawDeal, mutate: mutateDeal } = useDeal(dealId);
    const deal = rawDeal ? toMockDeal(rawDeal) : null;
    const { data: rawClient } = useClient(deal?.client_id);
    const [related, setRelated] = useState<DealRelated | null>(null);
    useEffect(() => {
        if (!dealId) return;
        let cancel = false;
        getDealRelated(dealId)
            .then(r => { if (!cancel) setRelated(r); })
            .catch(() => { /* non-fatal */ });
        return () => { cancel = true; };
    }, [dealId]);
    const { data: rawRfq } = useRfq(related?.rfq_id ?? deal?.rfq_id ?? null);
    const { data: rawProject } = useProject(related?.project_id ?? deal?.project_id ?? null);
    const { data: meetingsData } = useMeetings();
    const { data: insightsData } = useInsights();
    const [activeTab, setActiveTab] = useState<"overview" | "activity" | "documents" | "ai">("overview");
    const [isUpdating, setIsUpdating] = useState(false);
    if (!deal) return <div className="p-6 text-[13px] text-[#8e8e93]">{t("deal.loading")}</div>;

    const client = rawClient ? toMockClient(rawClient) : null;
    const rfq = rawRfq ? toMockRFQ(rawRfq) : null;
    const project = rawProject ? toMockProject(rawProject) : null;
    const meetings = (meetingsData ?? []).filter(m => m.deal_id === deal.id).map(toMockMeeting);
    const stage = DEAL_STAGE_COLORS[deal.stage] ?? DEAL_STAGE_COLORS[deal.stage?.toLowerCase()] ?? FALLBACK_STAGE_COLOR;
    
    // Filter insights related to this deal
    const dealInsights = (insightsData ?? []).filter(
        i => i.entity_type === "deal" && i.entity_id === deal.id
    );

    const handleStageChange = async (newStage: string) => {
        if (newStage === deal.stage || isUpdating) return;
        
        setIsUpdating(true);
        try {
            await dealsApi.update(dealId, { stage: newStage });
            await mutateDeal();
            toast({ title: t("deal.toast_stage_updated"), description: `Deal moved to "${newStage}"`, variant: "success" });
        } catch (error) {
            toast({ title: "Error", description: t("deal.toast_stage_failed"), variant: "error" });
            console.error("Stage update failed:", error);
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="p-6">
            {/* Back */}
            <Link href="/crm" className="mb-4 inline-flex items-center gap-2 text-[13px] text-[#007aff] hover:underline">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                {t("deal.back").replace(/^←\s*/, "")}
            </Link>

            {/* Pipeline timeline — director view of the account journey */}
            <div className="mb-6">
                <PipelineTimeline
                    deal={{ id: deal.id, stage: deal.stage, created_at: deal.created_at }}
                    rfqId={related?.rfq_id ?? deal.rfq_id ?? null}
                    projectId={related?.project_id ?? deal.project_id ?? null}
                    contractId={related?.contract_id ?? null}
                    meetings={(meetingsData ?? []).filter(m =>
                        m.deal_id === deal.id ||
                        (deal.client_id && m.client_id === deal.client_id) ||
                        (deal.project_id && m.project_id === deal.project_id)
                    )}
                />
            </div>

            {/* Header */}
            <div className="glass-card mb-6 p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div translate="no"
                            className="flex h-14 w-14 items-center justify-center rounded-2xl text-[20px] font-bold text-white"
                            style={{ background: `linear-gradient(135deg, ${client?.logo_color}, ${client?.logo_color}aa)` }}
                        >
                            {client?.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#007aff]">
                                {t("deal.eyebrow")} · {deal.id}
                            </p>
                            <h1 className="text-[28px] font-bold tracking-tight text-[#1d1d1f]">
                                {deal.name}
                            </h1>
                            <p className="mt-0.5 text-[13px] text-[#8e8e93]">
                                {client?.name} · {client?.industry}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <span
                            className="status-badge"
                            style={{ "--badge-bg": stage.bg, "--badge-color": stage.text } as React.CSSProperties}
                        >
                            {deal.stage}
                        </span>
                        <p className="text-[28px] font-bold text-[#1d1d1f]">{formatMoney(deal.value)}</p>
                    </div>
                </div>

                {/* Stage Progress Bar */}
                <div className="mt-6">
                    <div className="mb-2 flex justify-between text-[11px] font-medium text-[#8e8e93]">
                        <span>{t("deal.pipeline_progress")}</span>
                        <span>{t("deal.days_in_stage", { n: deal.days_in_stage })}</span>
                    </div>
                    <div className="flex gap-1">
                        {["Qualified Lead", "Discovery", "RFQ Submitted", "Demo Done", "Proposal Sent", "Negotiation", "Won"].map((s, i) => {
                            const stages = ["Qualified Lead", "Discovery", "RFQ Submitted", "Demo Done", "Proposal Sent", "Negotiation", "Won"];
                            const currentIdx = stages.indexOf(deal.stage);
                            const isPast = i <= currentIdx;
                            const isCurrent = i === currentIdx;
                            return (
                                <button
                                    key={s}
                                    onClick={() => handleStageChange(s)}
                                    className={`flex-1 rounded-full py-1.5 text-[10px] font-medium transition-all ${
                                        isCurrent
                                            ? "bg-[#007aff] text-white"
                                            : isPast
                                            ? "bg-[#30d158]/20 text-[#248a3d]"
                                            : "bg-black/[0.04] text-[#c7c7cc] hover:bg-black/[0.08]"
                                    }`}
                                >
                                    {s}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="mb-4 flex gap-2 border-b border-black/[0.06]">
                {[
                    { id: "overview", label: t("deal.tab_overview") },
                    { id: "activity", label: `${t("deal.tab_activity")} (${meetings.length})` },
                    { id: "documents", label: t("deal.tab_documents") },
                    { id: "ai", label: t("deal.tab_ai") },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                        className={`px-4 py-2.5 text-[13px] font-medium transition-all ${
                            activeTab === tab.id
                                ? "border-b-2 border-[#007aff] text-[#007aff]"
                                : "text-[#8e8e93] hover:text-[#1d1d1f]"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                    {activeTab === "overview" && (
                        <>
                            {/* Deal Info */}
                            <div className="glass-card p-5">
                                <h3 className="mb-4 text-[14px] font-semibold text-[#1d1d1f]">{t("deal.section_info")}</h3>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Field label={t("deal.field_type")} value={deal.type} />
                                    <Field label={t("deal.field_owner")} value={deal.owner} />
                                    <Field label={t("deal.field_created")} value={formatDate(deal.created_at)} />
                                    <Field label={t("deal.field_close")} value={formatDate(deal.expected_close)} />
                                    <Field label={t("deal.field_score")} value={`${deal.ai_score}/100`} highlight={deal.ai_score >= 70 ? "green" : deal.ai_score >= 45 ? "yellow" : "red"} />
                                    <Field label={t("deal.field_days")} value={`${deal.days_in_stage}d`} highlight={deal.days_in_stage > 30 ? "red" : undefined} />
                                </div>
                                <div className="mt-4 border-t border-black/[0.04] pt-4">
                                    <p className="mb-1 text-[11px] font-medium text-[#8e8e93]">Notes</p>
                                    <p className="text-[13px] leading-relaxed text-[#1d1d1f]">{deal.notes}</p>
                                </div>
                            </div>

                            {/* Next Action */}
                            <div className="glass-card p-5">
                                <h3 className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-[#1d1d1f]">
                                    <span className="text-[14px]">⚡</span> Next Action
                                </h3>
                                <div className="rounded-xl bg-gradient-to-br from-[#007aff]/10 to-[#5856d6]/10 p-4">
                                    <p className="text-[13px] font-medium text-[#1d1d1f]">{deal.next_action}</p>
                                    <button className="mt-3 rounded-lg bg-[#007aff] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#0040dd]">
                                        Mark Complete
                                    </button>
                                </div>
                            </div>

                            {/* Linked Records */}
                            <div className="glass-card p-5">
                                <h3 className="mb-3 text-[14px] font-semibold text-[#1d1d1f]">Linked Records</h3>
                                <div className="space-y-2">
                                    {client && (
                                        <LinkRow icon="🏢" label="Client" name={client.name} sub={client.industry} />
                                    )}
                                    {rfq && (
                                        <Link href={`/rfq/${rfq.id}`}>
                                            <LinkRow icon="📋" label="RFQ" name={rfq.name} sub={`${rfq.status} · ${rfq.budget_range}`} />
                                        </Link>
                                    )}
                                    {project && (
                                        <Link href={`/pm-tab/${project.id}`}>
                                            <LinkRow icon="📁" label="Project" name={project.name} sub={`${project.status} · ${project.progress}% complete`} />
                                        </Link>
                                    )}
                                    {!rfq && !project && (
                                        <p className="text-[12px] text-[#8e8e93]">No linked records yet.</p>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === "activity" && (
                        <div className="glass-card p-5">
                            <h3 className="mb-4 text-[14px] font-semibold text-[#1d1d1f]">Meeting Timeline</h3>
                            {meetings.length === 0 ? (
                                <p className="text-[12px] text-[#8e8e93]">No meetings logged yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {meetings.map(m => (
                                        <Link key={m.id} href={`/meetings/${m.id}`} className="block rounded-xl border border-black/[0.06] p-4 hover:bg-black/[0.02]">
                                            <div className="flex justify-between">
                                                <div>
                                                    <p className="text-[13px] font-semibold text-[#1d1d1f]">{m.title}</p>
                                                    <p className="mt-0.5 text-[11px] text-[#8e8e93]">{formatDate(m.date)} · {m.duration_min}min · {m.participants.length} participants</p>
                                                </div>
                                                <span className="rounded-full bg-[#5856d6]/15 px-2 py-0.5 text-[10px] font-medium text-[#5856d6]">
                                                    {m.status}
                                                </span>
                                            </div>
                                            {m.summary && <p className="mt-2 text-[12px] leading-relaxed text-[#636366]">{m.summary}</p>}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "documents" && (
                        <div className="glass-card p-5">
                            <h3 className="mb-4 text-[14px] font-semibold text-[#1d1d1f]">Documents</h3>
                            <div className="rounded-xl border border-dashed border-black/[0.08] p-8 text-center">
                                <p className="text-[12px] text-[#8e8e93]">No documents uploaded yet</p>
                                <button className="mt-3 rounded-lg bg-[#007aff] px-3 py-1.5 text-[11px] font-semibold text-white">
                                    + Upload Document
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === "ai" && (
                        <div className="glass-card p-5">
                            <h3 className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-[#1d1d1f]">
                                <span>✦</span> AI Insights for this Deal
                            </h3>
                            <div className="space-y-3">
                                <InsightCard severity="warning" title="Stagnant deal alert" detail={`${deal.days_in_stage} days in ${deal.stage}. Median for this stage: 14 days.`} />
                                <InsightCard severity="info" title="Win probability" detail={`Based on AI score of ${deal.ai_score}, win probability is ${Math.round(deal.ai_score * 0.85)}%.`} />
                                <InsightCard severity="success" title="Client signal" detail={`${client?.name} health score is ${client?.health_score}/100. Strong relationship.`} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    <div className="glass-card p-5">
                        <h3 className="mb-3 text-[13px] font-semibold text-[#1d1d1f]">Client Contact</h3>
                        {client && (
                            <div className="space-y-2 text-[12px]">
                                <div><span className="text-[#8e8e93]">Name:</span> <span className="font-medium text-[#1d1d1f]">{client.contact_name}</span></div>
                                <div><span className="text-[#8e8e93]">Email:</span> <a href={`mailto:${client.contact_email}`} className="text-[#007aff] hover:underline">{client.contact_email}</a></div>
                                <div><span className="text-[#8e8e93]">Phone:</span> <span className="text-[#1d1d1f]">{client.phone}</span></div>
                                <div><span className="text-[#8e8e93]">Location:</span> <span className="text-[#1d1d1f]">{client.location}</span></div>
                            </div>
                        )}
                    </div>

                    <div className="glass-card p-5">
                        <h3 className="mb-3 text-[13px] font-semibold text-[#1d1d1f]">Quick Actions</h3>
                        <div className="space-y-2">
                            <Link href={`/crm/${deal.id}/edit`} className="flex items-center justify-center w-full rounded-lg bg-[#2563eb] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#1d4ed8]">
                                ✏️ Edit Deal
                            </Link>
                            <button onClick={() => router.push("/meetings/new")} className="w-full rounded-lg bg-[#5856d6] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#4845b8]">
                                🎙️ Schedule Meeting
                            </button>
                            <button className="w-full rounded-lg border border-black/[0.08] bg-black/[0.02] px-3 py-2 text-[12px] font-medium text-[#1d1d1f] hover:bg-black/[0.04]">
                                ✉️ Send Email
                            </button>
                            <button className="w-full rounded-lg border border-black/[0.08] bg-black/[0.02] px-3 py-2 text-[12px] font-medium text-[#1d1d1f] hover:bg-black/[0.04]">
                                📋 Create RFQ
                            </button>
                            {!project && (deal.stage === "Won" || deal.stage === "Negotiation") && (
                                <button onClick={() => router.push(`/pm-tab/new?from_deal=${deal.id}`)} className="w-full rounded-lg bg-[#ff9f0a] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#cc7a00]">
                                    📁 Convert to Project
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Field({ label, value, highlight }: { label: string; value: string; highlight?: "green" | "yellow" | "red" }) {
    const color = highlight === "green" ? "#30d158" : highlight === "yellow" ? "#ff9f0a" : highlight === "red" ? "#ff453a" : "#1d1d1f";
    return (
        <div>
            <p className="mb-0.5 text-[11px] font-medium text-[#8e8e93]">{label}</p>
            <p className="text-[13px] font-semibold" style={{ color }}>{value}</p>
        </div>
    );
}

function LinkRow({ icon, label, name, sub }: { icon: string; label: string; name: string; sub: string }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-black/[0.06] p-3 transition-colors hover:bg-black/[0.02]">
            <span className="text-xl">{icon}</span>
            <div className="flex-1">
                <p className="text-[10px] font-medium uppercase tracking-wide text-[#8e8e93]">{label}</p>
                <p className="text-[13px] font-semibold text-[#1d1d1f]">{name}</p>
                <p className="text-[11px] text-[#8e8e93]">{sub}</p>
            </div>
            <svg className="h-4 w-4 text-[#c7c7cc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
        </div>
    );
}

function InsightCard({ severity, title, detail }: { severity: "critical" | "warning" | "info" | "success"; title: string; detail: string }) {
    const styles = {
        critical: { bg: "rgba(255, 69, 58, 0.08)", border: "rgba(255, 69, 58, 0.25)", text: "#ff453a", icon: "🔴" },
        warning: { bg: "rgba(255, 159, 10, 0.08)", border: "rgba(255, 159, 10, 0.25)", text: "#ff9f0a", icon: "🟡" },
        info: { bg: "rgba(0, 122, 255, 0.08)", border: "rgba(0, 122, 255, 0.25)", text: "#007aff", icon: "💡" },
        success: { bg: "rgba(48, 209, 88, 0.08)", border: "rgba(48, 209, 88, 0.25)", text: "#30d158", icon: "✓" },
    }[severity];
    return (
        <div className="rounded-xl border p-4" style={{ background: styles.bg, borderColor: styles.border }}>
            <div className="mb-1 flex items-center gap-2">
                <span>{styles.icon}</span>
                <p className="text-[13px] font-semibold" style={{ color: styles.text }}>{title}</p>
            </div>
            <p className="text-[12px] leading-relaxed text-[#1d1d1f]">{detail}</p>
        </div>
    );
}
