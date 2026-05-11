"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useRfq, useClient, useDeal } from "@/lib/hooks/use-resources";
import { toMockRFQ, toMockClient, toMockDeal } from "@/lib/adapters";
import { formatDate } from "@/lib/format";
import { GeneratePdfButton } from "@/components/shared";
import { useT } from "@/lib/i18n";

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    draft: { bg: "rgba(142, 142, 147, 0.12)", text: "#636366", label: "Draft" },
    in_progress: { bg: "rgba(0, 122, 255, 0.12)", text: "#0040dd", label: "In Progress" },
    submitted: { bg: "rgba(255, 159, 10, 0.12)", text: "#c93400", label: "Submitted" },
    awarded: { bg: "rgba(48, 209, 88, 0.12)", text: "#248a3d", label: "Awarded" },
    lost: { bg: "rgba(255, 69, 58, 0.12)", text: "#c93400", label: "Lost" },
};

export default function RFQDetailPage() {
    const t = useT();
    const params = useParams();
    const rfqId = params.id as string;
    const { data: rawRfq } = useRfq(rfqId);
    const rfq = rawRfq ? toMockRFQ(rawRfq) : null;
    const { data: rawClient } = useClient(rfq?.client_id);
    const { data: rawDeal } = useDeal(rfq?.deal_id);
    if (!rfq) return <div className="p-6 text-[13px] text-[#8e8e93]">{t("det.loading_rfq")}</div>;
    const client = rawClient ? toMockClient(rawClient) : null;
    const deal = rawDeal ? toMockDeal(rawDeal) : null;
    const status = STATUS_STYLES[rfq.status] ?? STATUS_STYLES.draft;

    return (
        <div className="p-6">
            <Link href="/rfq" className="mb-4 inline-flex items-center gap-2 text-[13px] text-[#16a34a] hover:underline">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                {t("rfq_d.back")}
            </Link>

            {/* Header */}
            <div className="glass-card mb-6 p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#16a34a]">
                            RFQ · {rfq.id}
                        </p>
                        <h1 className="text-[28px] font-bold tracking-tight text-[#1d1d1f]">{rfq.name}</h1>
                        <p className="mt-0.5 text-[13px] text-[#8e8e93]">
                            {client?.name} · {rfq.project_type}
                        </p>
                    </div>
                    <div className="text-right">
                        <span
                            className="status-badge"
                            style={{ "--badge-bg": status.bg, "--badge-color": status.text } as React.CSSProperties}
                        >
                            {status.label}
                        </span>
                        <p className="mt-2 text-[24px] font-bold text-[#1d1d1f]">{rfq.score}<span className="text-[14px] text-[#8e8e93]">/100</span></p>
                        <p className="text-[10px] text-[#8e8e93]">{t("rfq_d.quality_score")}</p>
                        <Link href={`/rfq/${rfq.id}/edit`} className="mt-3 inline-flex items-center gap-1 rounded-lg bg-[#16a34a] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#15803d]">✏️ {t("det.edit")}</Link>
                        <div className="mt-2 flex justify-end">
                            <GeneratePdfButton kind="discovery_report" sourceId={rfq.id} color="#16a34a" label={t("rfq_d.discovery_pdf")} />
                        </div>
                    </div>
                </div>

                {/* Stats grid */}
                <div className="mt-6 grid grid-cols-4 gap-4">
                    <div className="rounded-xl bg-black/[0.02] p-3">
                        <p className="text-[10px] font-medium uppercase text-[#8e8e93]">{t("rfq_d.budget")}</p>
                        <p className="mt-1 text-[16px] font-bold text-[#1d1d1f]">{rfq.budget_range}</p>
                    </div>
                    <div className="rounded-xl bg-black/[0.02] p-3">
                        <p className="text-[10px] font-medium uppercase text-[#8e8e93]">{t("rfq_d.timeline")}</p>
                        <p className="mt-1 text-[16px] font-bold text-[#1d1d1f]">{rfq.timeline_weeks} weeks</p>
                    </div>
                    <div className="rounded-xl bg-black/[0.02] p-3">
                        <p className="text-[10px] font-medium uppercase text-[#8e8e93]">{t("rfq_d.submitted")}</p>
                        <p className="mt-1 text-[16px] font-bold text-[#1d1d1f]">{rfq.submitted_at ? formatDate(rfq.submitted_at) : "-"}</p>
                    </div>
                    <div className="rounded-xl bg-black/[0.02] p-3">
                        <p className="text-[10px] font-medium uppercase text-[#8e8e93]">{t("rfq_d.compliance")}</p>
                        <p className="mt-1 text-[16px] font-bold text-[#1d1d1f]">{rfq.compliance.length} frameworks</p>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                    {/* Answers */}
                    <div className="glass-card p-5">
                        <h3 className="mb-4 text-[14px] font-semibold text-[#1d1d1f]">{t("rfq_d.responses")}</h3>
                        <div className="space-y-4">
                            {Object.entries(rfq.answers).map(([key, value]) => (
                                <div key={key}>
                                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#16a34a]">
                                        {key.replace(/_/g, " ")}
                                    </p>
                                    <p className="text-[13px] leading-relaxed text-[#1d1d1f]">
                                        {Array.isArray(value) ? value.join(", ") : value}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Compliance */}
                    <div className="glass-card p-5">
                        <h3 className="mb-3 text-[14px] font-semibold text-[#1d1d1f]">{t("rfq_d.required_compliance")}</h3>
                        <div className="flex flex-wrap gap-2">
                            {rfq.compliance.map(c => (
                                <span key={c} className="rounded-full bg-[#16a34a]/15 px-3 py-1 text-[12px] font-medium text-[#16a34a]">{c}</span>
                            ))}
                        </div>
                    </div>

                    {/* AI Recommendations */}
                    <div className="glass-card p-5">
                        <h3 className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-[#1d1d1f]"><span>✦</span> {t("rfq_d.ai_reco").replace(/^✦ /, "")}</h3>
                        <div className="space-y-2">
                            <div className="rounded-xl bg-[#16a34a]/8 p-3">
                                <p className="text-[12px] font-semibold text-[#16a34a]">{t("rfq_d.win_prob", { x: Math.round(rfq.score * 0.9) })}</p>
                                <p className="text-[11px] text-[#1d1d1f]">{t("det.win_prob_basis")}</p>
                            </div>
                            <div className="rounded-xl bg-[#007aff]/8 p-3">
                                <p className="text-[12px] font-semibold text-[#007aff]">{t("det.team_suggested")}</p>
                            </div>
                            <div className="rounded-xl bg-[#ff9f0a]/8 p-3">
                                <p className="text-[12px] font-semibold text-[#ff9f0a]">{t("rfq_d.risk", { risk: rfq.compliance.includes("HITRUST") ? t("det.risk_hitrust") : t("det.risk_tight") })}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    <div className="glass-card p-5">
                        <h3 className="mb-3 text-[13px] font-semibold text-[#1d1d1f]">{t("det.linked_records")}</h3>
                        <div className="space-y-2">
                            {client && <LinkRow icon="🏢" label={t("det.client")} name={client.name} sub={client.industry} href={`/customer-health/${client.id}`} />}
                            {deal && <LinkRow icon="💼" label={t("det.deal")} name={deal.name} sub={deal.stage} href={`/crm/${deal.id}`} />}
                        </div>
                    </div>

                    <div className="glass-card p-5">
                        <h3 className="mb-3 text-[13px] font-semibold text-[#1d1d1f]">{t("det.actions")}</h3>
                        <div className="space-y-2">
                            {rfq.status === "in_progress" && (
                                <button className="w-full rounded-lg bg-[#16a34a] px-3 py-2 text-[12px] font-semibold text-white">{t("det.submit_rfq")}</button>
                            )}
                            {rfq.status === "submitted" && (
                                <>
                                    <button className="w-full rounded-lg bg-[#30d158] px-3 py-2 text-[12px] font-semibold text-white">{t("det.mark_awarded")}</button>
                                    <button className="w-full rounded-lg bg-[#ff453a] px-3 py-2 text-[12px] font-semibold text-white">{t("det.mark_lost")}</button>
                                </>
                            )}
                            {rfq.status === "awarded" && (
                                <>
                                    <Link href={`/contracts/new?from_rfq=${rfq.id}`} className="flex items-center justify-center w-full rounded-lg bg-[#7c3aed] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#6d28d9]">{t("det.gen_contract")}</Link>
                                    <Link href={`/pm-tab/new?from_deal=${rfq.deal_id ?? ""}`} className="flex items-center justify-center w-full rounded-lg bg-[#ff9f0a] px-3 py-2 text-[12px] font-semibold text-white">{t("det.convert_project")}</Link>
                                </>
                            )}
                            <button className="w-full rounded-lg border border-black/[0.08] bg-black/[0.02] px-3 py-2 text-[12px] font-medium text-[#1d1d1f]">{t("det.export_pdf")}</button>
                            <Link href={`/rfq/${rfq.id}/edit`} className="flex items-center justify-center w-full rounded-lg border border-black/[0.08] bg-black/[0.02] px-3 py-2 text-[12px] font-medium text-[#1d1d1f]">⚙️ {t("det.edit")}</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function LinkRow({ icon, label, name, sub, href }: { icon: string; label: string; name: string; sub: string; href: string }) {
    return (
        <Link href={href} className="flex items-center gap-3 rounded-xl border border-black/[0.06] p-3 hover:bg-black/[0.02]">
            <span className="text-xl">{icon}</span>
            <div className="flex-1">
                <p className="text-[10px] font-medium uppercase tracking-wide text-[#8e8e93]">{label}</p>
                <p className="text-[12px] font-semibold text-[#1d1d1f]">{name}</p>
                <p className="text-[10px] text-[#8e8e93]">{sub}</p>
            </div>
        </Link>
    );
}
