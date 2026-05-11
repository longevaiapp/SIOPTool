"use client";

/**
 * 🛤️ PipelineTimeline — director-view of an account journey.
 *
 * Renders the 8 canonical stages of a deal+project lifecycle as a
 * horizontal timeline.  Each node lights up if there's evidence the stage
 * happened (a deal field, a related meeting, an RFQ, a contract,
 * a project, …) — otherwise it's shown as "pending / pegar reunión aquí".
 *
 * Stages:
 *   1. Lead          — deal exists
 *   2. Discovery     — RFQ exists OR meetings of type discovery_rfq
 *   3. Proposal      — proposal_review meetings OR proposal folio
 *   4. Contract      — contract_review meetings OR contract row
 *   5. Won / Lost    — deal.stage = Won|Lost
 *   6. Kickoff       — project exists OR project_kickoff meetings
 *   7. Delivery      — sprints / standups
 *   8. Renewal       — renewal_call meetings
 */
import Link from "next/link";
import { useT } from "@/lib/i18n";

interface Meeting {
    id: string;
    meeting_type?: string;
    title?: string;
    occurred_at?: string;
    created_at?: string;
}

export interface PipelineTimelineProps {
    deal: { id: string; stage?: string; created_at?: string } | null;
    rfqId?: string | null;
    projectId?: string | null;
    contractId?: string | null;
    meetings: Meeting[];
}

interface Stage {
    id: string;
    label: string;
    icon: string;
    /** completed = solid, pending = dashed */
    state: "completed" | "current" | "pending" | "skipped";
    href?: string | null;
    note?: string;
    color: string;
}

function fmtDate(s?: string | null) {
    if (!s) return "";
    try {
        return new Date(s).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
    } catch {
        return "";
    }
}

export function PipelineTimeline({
    deal,
    rfqId,
    projectId,
    contractId,
    meetings,
}: PipelineTimelineProps) {
    const t = useT();
    const has = (type: string) => meetings.find(m => m.meeting_type === type);
    const dealStage = (deal?.stage || "").toLowerCase();
    const dealClosed = dealStage === "won" || dealStage === "lost";

    const stages: Stage[] = [
        {
            id: "lead",
            label: t("pipeline.stage_lead"),
            icon: "🎯",
            state: deal ? "completed" : "pending",
            note: fmtDate(deal?.created_at),
            color: "#007aff",
        },
        {
            id: "discovery",
            label: t("pipeline.stage_discovery"),
            icon: "🔍",
            state: rfqId || has("discovery_rfq") || has("lead_qualification")
                ? "completed"
                : (deal ? "current" : "pending"),
            href: rfqId ? `/rfq/${rfqId}` : null,
            note: has("discovery_rfq") ? fmtDate(has("discovery_rfq")!.occurred_at || has("discovery_rfq")!.created_at) : undefined,
            color: "#30d158",
        },
        {
            id: "proposal",
            label: t("pipeline.stage_proposal"),
            icon: "📄",
            state: has("proposal_review")
                ? "completed"
                : (rfqId ? "current" : "pending"),
            note: has("proposal_review") ? fmtDate(has("proposal_review")!.occurred_at || has("proposal_review")!.created_at) : undefined,
            color: "#5e5ce6",
        },
        {
            id: "contract",
            label: t("pipeline.stage_contract"),
            icon: "✍️",
            state: contractId || has("contract_review")
                ? "completed"
                : "pending",
            href: contractId ? `/contracts/${contractId}` : null,
            color: "#ff9f0a",
        },
        {
            id: "close",
            label: dealStage === "lost" ? t("pipeline.stage_lost") : t("pipeline.stage_won"),
            icon: dealStage === "lost" ? "❌" : "🏆",
            state: dealClosed ? "completed" : "pending",
            color: dealStage === "lost" ? "#ff453a" : "#30d158",
        },
        {
            id: "kickoff",
            label: t("pipeline.stage_kickoff"),
            icon: "🚀",
            state: projectId || has("project_kickoff") ? "completed" : "pending",
            href: projectId ? `/pm-tab/${projectId}` : null,
            color: "#ff453a",
        },
        {
            id: "delivery",
            label: t("pipeline.stage_delivery"),
            icon: "⚙️",
            state: has("sprint_review") || has("daily_standup") || has("sprint_planning")
                ? "completed"
                : (projectId ? "current" : "pending"),
            note: projectId ? t("pipeline.delivery_active") : undefined,
            color: "#5856d6",
        },
        {
            id: "renewal",
            label: t("pipeline.stage_renewal"),
            icon: "🔁",
            state: has("renewal_call")
                ? "completed"
                : "pending",
            color: "#ff2d55",
        },
    ];

    return (
        <div className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <p className="text-[13px] font-semibold text-[#1d1d1f]">{t("pipeline.title")}</p>
                    <p className="text-[11px] text-[#8e8e93]">
                        {t("pipeline.subtitle")}
                    </p>
                </div>
                <span className="rounded-full bg-[#5856d6]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#5856d6]">
                    {t("pipeline.director_view")}
                </span>
            </div>

            {/* Horizontal timeline */}
            <div className="relative overflow-x-auto pb-2">
                <div className="flex min-w-max items-start gap-1">
                    {stages.map((s, idx) => {
                        const isLast = idx === stages.length - 1;
                        const isDone = s.state === "completed";
                        const isCur = s.state === "current";
                        const isPending = s.state === "pending";

                        const node = (
                            <div className="flex flex-col items-center" style={{ minWidth: 96 }}>
                                <div
                                    className="flex h-10 w-10 items-center justify-center rounded-full text-[15px] transition-transform hover:scale-110"
                                    style={{
                                        background: isDone
                                            ? `linear-gradient(135deg, ${s.color}, ${s.color}cc)`
                                            : isCur
                                            ? `${s.color}22`
                                            : "rgba(0,0,0,0.04)",
                                        boxShadow: isDone
                                            ? `0 4px 12px ${s.color}33`
                                            : "none",
                                        border: isCur ? `2px dashed ${s.color}` : "none",
                                        opacity: isPending ? 0.45 : 1,
                                    }}
                                >
                                    <span style={{ filter: isDone ? "grayscale(0)" : "grayscale(0.6)" }}>{s.icon}</span>
                                </div>
                                <p
                                    className="mt-1.5 text-[11px] font-semibold"
                                    style={{ color: isDone ? "#1d1d1f" : isCur ? s.color : "#8e8e93" }}
                                >
                                    {s.label}
                                </p>
                                {s.note && (
                                    <p className="text-[9px] text-[#8e8e93]">{s.note}</p>
                                )}
                                {isCur && (
                                    <span className="mt-0.5 rounded-full bg-[#ff9f0a]/15 px-1.5 py-[1px] text-[8px] font-bold uppercase text-[#ff9f0a]">
                                        {t("pipeline.current_badge")}
                                    </span>
                                )}
                            </div>
                        );

                        return (
                            <div key={s.id} className="flex flex-1 items-start">
                                {s.href ? <Link href={s.href}>{node}</Link> : node}
                                {!isLast && (
                                    <div
                                        className="mt-5 h-[2px] flex-1"
                                        style={{
                                            background: isDone
                                                ? `linear-gradient(to right, ${s.color}, ${stages[idx + 1].color}66)`
                                                : "repeating-linear-gradient(to right, rgba(0,0,0,0.1), rgba(0,0,0,0.1) 4px, transparent 4px, transparent 8px)",
                                        }}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="mt-3 flex items-center gap-3 border-t border-black/[0.04] pt-3 text-[10px] text-[#8e8e93]">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#1d1d1f]" /> {t("pipeline.legend_done")}</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full border-2 border-dashed border-[#ff9f0a]" /> {t("pipeline.legend_current")}</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-black/10" /> {t("pipeline.legend_pending")}</span>
                <span className="ml-auto">{t("pipeline.legend_hint")}</span>
            </div>
        </div>
    );
}
