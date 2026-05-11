"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ModuleHeader } from "@/components/shared";
import { GeneratePdfMenu, type PdfKindOption } from "@/components/shared";
import AudioRecorder from "@/components/shared/AudioRecorder";
import { MEETING_TYPE_CONFIG, type MeetingType } from "@/lib/types/meeting";
import {
    useMeeting,
    useClient,
    useMeetingTranscription,
    useMeetingAnalyses,
    useProjects,
} from "@/lib/hooks/use-resources";
import { meetingTranscriptionApi, meetingsApi, clientsApi, dealsApi, projectsApi } from "@/lib/api";
import { toMockMeeting, toMockClient } from "@/lib/adapters";
import { useToast } from "@/components/shared/ToastProvider";
import { useT } from "@/lib/i18n";

/* ══════════════════════════════════════════════════════════════════════════
   📝 MEETING DETAIL — Live AssemblyAI transcript + OpenAI analyzer
   ══════════════════════════════════════════════════════════════════════════ */

function fmtSec(seconds: number | null | undefined): string {
    if (!seconds) return "—";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function MeetingDetailPage() {
    const t = useT();
    const params = useParams();
    const meetingId = params.id as string;
    const { toast } = useToast();

    const { data: rawMeeting, mutate: mutateMeeting } = useMeeting(meetingId);
    const meeting = rawMeeting ? toMockMeeting(rawMeeting) : null;
    const { data: rawClient } = useClient(meeting?.client_id ?? null);
    const client = rawClient ? toMockClient(rawClient) : null;

    const { data: tx, mutate: mutateTx } = useMeetingTranscription(meetingId, 5000);
    const isProcessing = tx?.transcription_status === "processing" || tx?.transcription_status === "queued";

    const { data: analyses, mutate: mutateAnalyses } = useMeetingAnalyses(meetingId);
    const latestAnalysis = (analyses ?? []).find(a => a.status === "completed");

    const [activeTab, setActiveTab] = useState<"transcript" | "analysis" | "actions">("transcript");
    const [analyzing, setAnalyzing] = useState(false);
    const [approvingIdx, setApprovingIdx] = useState<number | null>(null);
    const [approvedIndices, setApprovedIndices] = useState<Set<number>>(new Set());
    const [draftNames, setDraftNames] = useState<Record<string, string>>({});
    const [savingSpeakers, setSavingSpeakers] = useState(false);
    const [applyingKey, setApplyingKey] = useState<string | null>(null);

    if (!rawMeeting) {
        return <div className="p-6 text-[13px] text-[#8e8e93]">{t("meet.loading")}</div>;
    }
    if (!meeting) return null;

    const typeConfig = MEETING_TYPE_CONFIG[meeting.type as MeetingType] ?? MEETING_TYPE_CONFIG.discovery_rfq;

    const runAnalyzer = async () => {
        setAnalyzing(true);
        try {
            await meetingTranscriptionApi.analyze(meetingId);
            await mutateAnalyses();
            toast({ title: t("meet.toast_analysis_ok"), description: t("meet_d.toast_analysis_desc"), variant: "success" });
            setActiveTab("analysis");
        } catch (e) {
            toast({ title: t("meet.toast_analyzer_failed"), description: (e as Error).message, variant: "error" });
        } finally {
            setAnalyzing(false);
        }
    };

    const approveAction = async (idx: number) => {
        if (!latestAnalysis) return;
        if (!rawMeeting.project_id) {
            toast({ title: t("meet_d.toast_no_project"), description: t("meet_d.toast_no_project_desc"), variant: "error" });
            return;
        }
        setApprovingIdx(idx);
        try {
            const res = await meetingTranscriptionApi.approve(meetingId, latestAnalysis.id, [idx]) as { count: number };
            setApprovedIndices(prev => new Set(prev).add(idx));
            toast({ title: t("meet.toast_task_created"), description: t("meet_d.toast_task_desc", { n: res.count }), variant: "success" });
        } catch (e) {
            toast({ title: t("meet_d.toast_approve_failed"), description: (e as Error).message, variant: "error" });
        } finally {
            setApprovingIdx(null);
        }
    };

    const txStatus = tx?.transcription_status ?? "idle";
    const utterances = tx?.utterances ?? [];
    const transcriptText = tx?.transcript ?? "";
    const rawActionItems = latestAnalysis?.output?.action_items ?? [];
    // Unified Action Items: include task-like extractions from any analyzer
    type UnifiedAction = { text: string; assignee?: string; priority?: string; points?: number; due_date?: string; source?: string; sourceIdx?: number };
    const extracted = (latestAnalysis?.output as Record<string, unknown> | undefined)?.extracted as Record<string, unknown> | undefined;
    const newTasks = (extracted?.new_tasks as Array<Record<string, unknown>> | undefined) ?? [];
    const initialTasks = (extracted?.initial_tasks as Array<Record<string, unknown>> | undefined) ?? [];
    const taskAssignments = (extracted?.task_assignments as Array<Record<string, unknown>> | undefined) ?? [];
    const bugs = (extracted?.bugs_found as Array<Record<string, unknown>> | undefined) ?? [];
    const actionItems: UnifiedAction[] = [
        ...rawActionItems.map((a, i) => ({ ...a, source: "action_item", sourceIdx: i })),
        ...newTasks.map((t, i) => ({ text: String(t.title ?? t.text ?? ""), assignee: t.assignee as string | undefined, priority: t.priority as string | undefined, points: t.story_points as number | undefined ?? t.points as number | undefined, due_date: t.due_date as string | undefined, source: "new_task", sourceIdx: i })),
        ...initialTasks.map((t, i) => ({ text: String(t.title ?? t.text ?? ""), assignee: t.assignee as string | undefined, priority: t.priority as string | undefined, points: t.story_points as number | undefined ?? t.points as number | undefined, due_date: t.due_date as string | undefined, source: "initial_task", sourceIdx: i })),
        ...taskAssignments.map((t, i) => ({ text: String(t.title_match ?? t.title ?? `Task ${t.task_id}`), assignee: t.assignee as string | undefined, points: t.story_points as number | undefined, source: "task_assignment", sourceIdx: i })),
        ...bugs.map((b, i) => ({ text: String(b.title ?? b.text ?? ""), assignee: b.assignee as string | undefined, priority: (b.severity as string | undefined) ?? "high", source: "bug", sourceIdx: i })),
    ].filter((a) => a.text);

    const applyOne = async (source: string, idx: number) => {
        if (!latestAnalysis) return;
        const keyMap: Record<string, string> = {
            new_task: "new_tasks",
            initial_task: "initial_tasks",
            task_assignment: "task_assignments",
            bug: "bugs_found",
        };
        const selKey = keyMap[source];
        if (!selKey) return;
        const k = `${source}-${idx}`;
        setApplyingKey(k);
        try {
            const res = await meetingTranscriptionApi.apply(meetingId, latestAnalysis.id, { [selKey]: [idx] }) as { count: number };
            if (res.count === 0) {
                toast({ title: t("meet_d.toast_already_applied"), description: t("meet_d.toast_already_applied_desc"), variant: "info" });
            } else {
                toast({ title: t("meet_d.toast_applied"), description: t("meet_d.toast_applied_desc", { n: res.count }), variant: "success" });
            }
            await mutateAnalyses();
        } catch (e) {
            toast({ title: t("meet_d.toast_apply_failed"), description: (e as Error).message, variant: "error" });
        } finally {
            setApplyingKey(null);
        }
    };

    // Read applied_selections from analysis output for idempotence UI
    const appliedSelections = (latestAnalysis?.output as Record<string, unknown> | undefined)?.applied_selections as Record<string, unknown> | undefined;
    const isApplied = (source: string, idx: number): boolean => {
        if (!appliedSelections) return false;
        const keyMap: Record<string, string> = {
            new_task: "new_tasks",
            initial_task: "initial_tasks",
            task_assignment: "task_assignments",
            bug: "bugs_found",
        };
        const selKey = keyMap[source];
        if (!selKey) return false;
        const arr = appliedSelections[selKey];
        return Array.isArray(arr) && arr.includes(idx);
    };

    // ── Speaker name mapping ────────────────────────────────────────────────
    const distinctSpeakers = Array.from(new Set(utterances.map(u => u.speaker).filter(Boolean))) as string[];
    type ParticipantRecord = { name?: string; speaker_label?: string | null; role?: string; email?: string | null };
    const savedParticipants: ParticipantRecord[] = (Array.isArray(rawMeeting.participants) ? rawMeeting.participants : [])
        .filter((p): p is ParticipantRecord => !!p && typeof p === "object");
    const speakerNameMap: Record<string, string> = {};
    for (const p of savedParticipants) {
        if (p.speaker_label && p.name) speakerNameMap[p.speaker_label] = p.name;
    }
    const labelFor = (s: string) => speakerNameMap[s] || `Speaker ${s}`;

    const saveSpeakerNames = async () => {
        setSavingSpeakers(true);
        try {
            const byLabel = new Map<string, ParticipantRecord>();
            for (const p of savedParticipants) {
                if (p.speaker_label) byLabel.set(p.speaker_label, { ...p });
            }
            for (const s of distinctSpeakers) {
                const newName = (draftNames[s] ?? speakerNameMap[s] ?? "").trim();
                if (!newName) continue;
                const existing = byLabel.get(s) ?? { speaker_label: s };
                existing.name = newName;
                byLabel.set(s, existing);
            }
            const merged = Array.from(byLabel.values());
            await meetingsApi.update(meetingId, { participants: merged } as Partial<typeof rawMeeting>);
            toast({ title: t("meet_d.toast_speakers_ok"), description: t("meet_d.toast_speakers_desc"), variant: "success" });
            setDraftNames({});
        } catch (e) {
            toast({ title: t("meet_d.toast_save_failed"), description: (e as Error).message, variant: "error" });
        } finally {
            setSavingSpeakers(false);
        }
    };

    return (
        <div className="p-6">
            <ModuleHeader title={t("meet.title_chrome")} subtitle={t("meet.subtitle")} color="#5856d6" />

            <div className="mb-6 flex items-center justify-between">
                <Link href="/meetings" className="inline-flex items-center gap-2 text-[13px] text-[#007aff] hover:underline">
                    {t("meet.back")}
                </Link>
                <div className="flex items-center gap-2">
                    <GeneratePdfMenu
                        sourceId={meetingId}
                        color="#5856d6"
                        triggerLabel={t("meet.gen_doc")}
                        options={[
                            { kind: "minute", label: t("meet_d.pdf_minute"), description: t("meet_d.pdf_minute_desc") },
                            { kind: "kickoff", label: t("meet_d.pdf_kickoff"), description: t("meet_d.pdf_kickoff_desc") },
                            { kind: "internal_kickoff", label: t("meet_d.pdf_internal") },
                            { kind: "qbr", label: t("meet_d.pdf_qbr"), description: t("meet_d.pdf_qbr_desc") },
                            { kind: "pmo_review", label: t("meet_d.pdf_pmo") },
                            { kind: "uat_report", label: t("meet_d.pdf_uat") },
                            { kind: "acceptance", label: t("meet_d.pdf_acceptance") },
                            { kind: "postmortem", label: t("meet_d.pdf_postmortem") },
                            { kind: "daily_standup", label: t("meet_d.pdf_standup") },
                            { kind: "onboarding_pack", label: t("meet_d.pdf_onboarding") },
                        ] as PdfKindOption[]}
                    />
                    <Link href={`/meetings/${meetingId}/edit`} className="rounded-lg border border-[#5856d6]/30 bg-[#5856d6]/10 px-3 py-1.5 text-[12px] font-semibold text-[#5856d6] hover:bg-[#5856d6]/15">
                        {t("meet.edit")}
                    </Link>
                </div>
            </div>

            {/* Header card */}
            <div className="glass-card mb-6 p-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-3xl" style={{ backgroundColor: `${typeConfig.color}15` }}>
                            {typeConfig.icon}
                        </span>
                        <div>
                            <h1 className="text-[20px] font-bold text-[#1d1d1f]">{meeting.title}</h1>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-[13px] text-[#8e8e93]">
                                <span style={{ color: typeConfig.color }}>{typeConfig.label}</span>
                                {client && <><span>•</span><span>{client.name}</span></>}
                                {meeting.date && <><span>•</span><span>{new Date(meeting.date).toLocaleDateString()}</span></>}
                                {meeting.duration_min ? <><span>•</span><span>{meeting.duration_min} min</span></> : null}
                                {tx?.audio_duration_seconds ? <><span>•</span><span>{t("meet_d.audio_label")}: {fmtSec(tx.audio_duration_seconds)}</span></> : null}
                                {tx?.language_detected ? <><span>•</span><span>{t("meet_d.lang_label")}: {tx.language_detected}</span></> : null}
                            </div>
                        </div>
                    </div>
                    <TranscriptionBadge status={txStatus} />
                </div>
            </div>

            {/* Audio recorder / uploader */}
            <div className="mb-6">
                <AudioRecorder
                    moduleColor="#5856d6"
                    meetingId={meetingId}
                    onUploaded={() => mutateTx()}
                />
            </div>

            {/* Transcription error */}
            {txStatus === "error" && tx?.transcription_error && (
                <div className="glass-card mb-6 border border-[#ff453a]/40 bg-[#ff453a]/5 p-4">
                    <p className="text-[13px] font-semibold text-[#ff453a]">{t("meet_d.tx_error")}</p>
                    <p className="mt-1 font-mono text-[11px] text-[#ff453a]/80">{tx.transcription_error}</p>
                </div>
            )}

            {/* Processing banner */}
            {isProcessing && (
                <div className="glass-card mb-6 flex items-center gap-3 p-4">
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#5856d6] border-t-transparent" />
                    <p className="text-[13px] text-[#1d1d1f]">{t("meet_d.tx_processing")}</p>
                </div>
            )}

            {/* Run analyzer CTA */}
            {txStatus === "completed" && (
                <div className="glass-card mb-6 flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                        <p className="text-[13px] font-semibold text-[#1d1d1f]">
                            {latestAnalysis ? t("meet_d.analysis_available") : t("meet_d.run_ai")}
                        </p>
                        <p className="text-[11px] text-[#8e8e93]">
                            {latestAnalysis
                                ? t("meet_d.actions_count", { n: actionItems.length })
                                : t("meet_d.run_hint")}
                        </p>
                    </div>
                    <button
                        onClick={runAnalyzer}
                        disabled={analyzing}
                        className="rounded-lg bg-[#5856d6] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#4845b8] disabled:opacity-50"
                    >
                        {analyzing ? t("meet_d.analyzing") : latestAnalysis ? t("meet_d.rerun") : t("meet_d.run")}
                    </button>
                </div>
            )}

            {/* Tabs */}
            <div className="mb-4 flex gap-1 rounded-xl bg-black/[0.04] p-1">
                {[
                    { id: "transcript", label: t("meet_d.tab_transcript"), icon: "📜" },
                    { id: "analysis", label: t("meet_d.tab_analysis"), icon: "✦" },
                    { id: "actions", label: t("meet_d.tab_actions", { n: actionItems.length }), icon: "✅" },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                        className={`flex-1 rounded-lg px-4 py-2.5 text-[13px] font-medium transition-all ${
                            activeTab === tab.id ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#8e8e93] hover:text-[#1d1d1f]"
                        }`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Transcript tab */}
            {activeTab === "transcript" && (
                <div className="space-y-4">
                    {distinctSpeakers.length > 0 && (
                        <div className="glass-card p-5">
                            <div className="mb-3 flex items-center justify-between">
                                <div>
                                    <h3 className="text-[14px] font-semibold text-[#1d1d1f]">{t("meet_d.speakers_title")}</h3>
                                    <p className="text-[11px] text-[#8e8e93]">{t("meet_d.speakers_hint")}</p>
                                </div>
                                <button
                                    onClick={saveSpeakerNames}
                                    disabled={savingSpeakers}
                                    className="rounded-lg bg-[#5856d6] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#4845b8] disabled:opacity-50"
                                >
                                    {savingSpeakers ? t("meet_d.saving") : t("meet_d.save_names")}
                                </button>
                            </div>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {distinctSpeakers.map(s => (
                                    <div key={s} className="flex items-center gap-2 rounded-lg border border-black/5 bg-white/60 p-2">
                                        <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#5856d6]/15 text-[11px] font-bold text-[#5856d6]">
                                            {s}
                                        </span>
                                        <input
                                            type="text"
                                            value={draftNames[s] ?? speakerNameMap[s] ?? ""}
                                            onChange={e => setDraftNames(prev => ({ ...prev, [s]: e.target.value }))}
                                            placeholder={`Speaker ${s}`}
                                            className="flex-1 rounded-md border border-black/10 bg-white px-2 py-1 text-[12px] text-[#1d1d1f] focus:border-[#5856d6] focus:outline-none"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="glass-card p-5">
                    <h3 className="mb-4 text-[14px] font-semibold text-[#1d1d1f]">{t("meet_d.full_transcript")}</h3>
                    {utterances.length > 0 ? (
                        <div className="max-h-[600px] space-y-3 overflow-y-auto">
                            {utterances.map((u, i) => (
                                <div key={i} className="flex gap-3">
                                    <div className="flex-shrink-0">
                                        <span className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-[#5856d6]/15 px-2 text-[11px] font-bold text-[#5856d6]" title={`Speaker ${u.speaker}`}>
                                            {speakerNameMap[u.speaker] ? speakerNameMap[u.speaker].split(" ")[0] : u.speaker}
                                        </span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-mono text-[10px] text-[#8e8e93]">{labelFor(u.speaker)} · {fmtSec(Math.round(u.start / 1000))}</p>
                                        <p className="text-[13px] leading-relaxed text-[#1d1d1f]">{u.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : transcriptText ? (
                        <pre className="max-h-[600px] overflow-y-auto whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-[#3c3c43]">
                            {transcriptText}
                        </pre>
                    ) : (
                        <p className="py-8 text-center text-[13px] text-[#8e8e93]">
                            {txStatus === "idle"
                                ? t("meet_d.no_audio")
                                : isProcessing
                                    ? t("meet_d.tx_in_progress")
                                    : t("meet_d.no_transcript")}
                        </p>
                    )}
                    </div>
                </div>
            )}

            {/* Analysis tab */}
            {activeTab === "analysis" && (
                <div className="space-y-4">
                    {!latestAnalysis ? (
                        <div className="glass-card p-5 text-center text-[13px] text-[#8e8e93]">
                            {t("meet_d.no_analysis")}
                        </div>
                    ) : (
                        <>
                            <div className="glass-card p-5">
                                <h3 className="mb-3 text-[14px] font-semibold text-[#1d1d1f]">{t("meet_d.summary")}</h3>
                                <p className="text-[13px] leading-relaxed text-[#3c3c43]">
                                    {latestAnalysis.output?.summary}
                                </p>
                            </div>
                            {latestAnalysis.output?.key_decisions && latestAnalysis.output.key_decisions.length > 0 && (
                                <div className="glass-card p-5">
                                    <h3 className="mb-3 text-[14px] font-semibold text-[#1d1d1f]">{t("meet_d.key_decisions")}</h3>
                                    <ul className="space-y-2">
                                        {latestAnalysis.output.key_decisions.map((d, i) => (
                                            <li key={i} className="flex items-start gap-2 text-[13px] text-[#3c3c43]">
                                                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#007aff]" />
                                                {d}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {latestAnalysis.output?.risks && latestAnalysis.output.risks.length > 0 && (
                                <div className="glass-card p-5">
                                    <h3 className="mb-3 text-[14px] font-semibold text-[#1d1d1f]">{t("meet_d.risks")}</h3>
                                    <div className="space-y-3">
                                        {latestAnalysis.output.risks.map((r, i) => (
                                            <div key={i} className="rounded-xl p-4" style={{ background: r.severity === "critical" ? "rgba(255, 69, 58, 0.08)" : "rgba(255, 159, 10, 0.08)" }}>
                                                <p className="text-[13px] font-semibold" style={{ color: r.severity === "critical" ? "#ff453a" : "#ff9f0a" }}>
                                                    {r.severity === "critical" ? "🔴" : "🟡"} {r.title}
                                                </p>
                                                <p className="mt-1 text-[12px] text-[#3c3c43]">{r.detail}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {latestAnalysis.output?.next_steps && latestAnalysis.output.next_steps.length > 0 && (
                                <div className="glass-card p-5">
                                    <h3 className="mb-3 text-[14px] font-semibold text-[#1d1d1f]">{t("meet_d.next_steps")}</h3>
                                    <ul className="space-y-2">
                                        {latestAnalysis.output.next_steps.map((s, i) => (
                                            <li key={i} className="flex items-start gap-2 text-[13px] text-[#3c3c43]">
                                                <span className="font-mono text-[12px] text-[#8e8e93]">{i + 1}.</span>
                                                {s}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            <ExtractedPanel
                                meetingId={meetingId}
                                meetingClientId={rawMeeting.client_id ?? null}
                                meetingDealId={rawMeeting.deal_id ?? null}
                                meetingProjectId={rawMeeting.project_id ?? null}
                                meetingTitle={meeting.title}
                                analysis={latestAnalysis}
                                onApplied={async () => { await mutateAnalyses(); await mutateMeeting(); }}
                            />
                        </>
                    )}
                </div>
            )}

            {/* Actions tab */}
            {activeTab === "actions" && (
                <div className="glass-card p-5">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-[14px] font-semibold text-[#1d1d1f]">{t("meet_d.action_items")}</h3>
                        <span className="text-[11px] text-[#8e8e93]">
                            {t("meet_d.approved_count", { n: approvedIndices.size, total: actionItems.length })}
                        </span>
                    </div>
                    {actionItems.length === 0 ? (
                        <p className="py-8 text-center text-[13px] text-[#8e8e93]">
                            {latestAnalysis
                                ? t("meet_d.no_action_items_analyzer", { type: latestAnalysis.analyzer_type })
                                : t("meet_d.no_action_items")}
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {actionItems.map((a, i) => {
                                const isLegacyAction = a.source === "action_item";
                                const legacyIdx = isLegacyAction ? rawActionItems.findIndex((r) => r.text === a.text) : -1;
                                const legacyApproved = legacyIdx >= 0 && approvedIndices.has(legacyIdx);
                                const newApplied = !isLegacyAction && a.source && a.sourceIdx !== undefined && isApplied(a.source, a.sourceIdx);
                                const approved = legacyApproved || newApplied;
                                return (
                                    <div key={i} className={`rounded-xl border p-4 ${approved ? "border-[#30d158]/40 bg-[#30d158]/5" : "border-black/[0.06] bg-black/[0.02]"}`}>
                                        <p className={`text-[13px] font-medium ${approved ? "text-[#248a3d]" : "text-[#1d1d1f]"}`}>
                                            {approved && "\u2713 "}{a.text}
                                        </p>
                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[#8e8e93]">
                                            {a.assignee && <span>@{a.assignee}</span>}
                                            {a.priority && (
                                                <span className={`rounded px-1.5 py-0.5 font-bold ${a.priority === "high" ? "bg-[#ff453a]/15 text-[#ff453a]" : a.priority === "medium" ? "bg-[#ff9f0a]/15 text-[#ff9f0a]" : "bg-[#30d158]/15 text-[#30d158]"}`}>
                                                    {a.priority}
                                                </span>
                                            )}
                                            {typeof a.points === "number" && <span className="rounded bg-black/[0.05] px-1.5 py-0.5">{a.points} pts</span>}
                                            {a.due_date && <span>{t("meet_d.due", { date: a.due_date })}</span>}
                                            {a.source && a.source !== "action_item" && (
                                                <span className="rounded bg-[#5856d6]/10 px-1.5 py-0.5 font-mono text-[10px] text-[#5856d6]">{a.source}</span>
                                            )}
                                        </div>
                                        {!approved && isLegacyAction && legacyIdx >= 0 && (
                                            <div className="mt-3 flex gap-2">
                                                <button
                                                    onClick={() => approveAction(legacyIdx)}
                                                    disabled={approvingIdx === legacyIdx}
                                                    className="rounded-lg bg-[#30d158] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#28b84d] disabled:opacity-50"
                                                >
                                                    {approvingIdx === legacyIdx ? "Creating\u2026" : "Approve & create task"}
                                                </button>
                                            </div>
                                        )}
                                        {!approved && !isLegacyAction && a.source && a.sourceIdx !== undefined && (
                                            <div className="mt-3 flex gap-2">
                                                <button
                                                    onClick={() => applyOne(a.source!, a.sourceIdx!)}
                                                    disabled={applyingKey === `${a.source}-${a.sourceIdx}`}
                                                    className="rounded-lg bg-[#5856d6] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#4845b8] disabled:opacity-50"
                                                >
                                                    {applyingKey === `${a.source}-${a.sourceIdx}` ? "Applying\u2026" : "Apply"}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {!rawMeeting.project_id && actionItems.length > 0 && (
                        <ProjectLinker
                            meetingId={meetingId}
                            clientId={rawMeeting.client_id ?? null}
                            onLinked={async () => { await mutateMeeting(); }}
                        />
                    )}
                </div>
            )}
        </div>
    );
}

function ProjectLinker({ meetingId, clientId, onLinked }: { meetingId: string; clientId: string | null; onLinked: () => Promise<void> | void }) {
    const t = useT();
    const { data: projects } = useProjects();
    const [picking, setPicking] = useState<string>("");
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();
    const candidates = (projects ?? []).filter(p => !clientId || p.client_id === clientId);
    const others = (projects ?? []).filter(p => clientId && p.client_id !== clientId);
    const link = async () => {
        if (!picking) return;
        setSaving(true);
        try {
            await meetingsApi.update(meetingId, { project_id: picking } as Partial<ApiMeetingPatch>);
            await onLinked();
            toast({ title: t("meet_d.linker_ok"), description: t("meet_d.linker_ok_desc"), variant: "success" });
        } catch (e) {
            toast({ title: t("meet_d.linker_failed"), description: (e as Error).message, variant: "error" });
        } finally {
            setSaving(false);
        }
    };
    return (
        <div className="mt-4 rounded-lg border border-[#ff9f0a]/30 bg-[#ff9f0a]/10 p-3">
            <p className="text-[12px] font-semibold text-[#c93400]">{t("meet_d.linker_warn")}</p>
            <p className="mt-1 text-[11px] text-[#8e8e93]">{t("meet_d.linker_hint")}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                    value={picking}
                    onChange={(e) => setPicking(e.target.value)}
                    className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-[12px]"
                >
                    <option value="">{t("meet_d.linker_select")}</option>
                    {candidates.length > 0 && (
                        <optgroup label={clientId ? t("meet_d.linker_same_client") : t("meet_d.linker_all")}>
                            {candidates.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </optgroup>
                    )}
                    {others.length > 0 && (
                        <optgroup label={t("meet_d.linker_other")}>
                            {others.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </optgroup>
                    )}
                </select>
                <button
                    onClick={link}
                    disabled={!picking || saving}
                    className="rounded-lg bg-[#ff9f0a] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#e88a00] disabled:opacity-50"
                >
                    {saving ? t("meet_d.linker_linking") : t("meet_d.linker_link")}
                </button>
                <Link href={`/meetings/${meetingId}/edit`} className="text-[12px] text-[#007aff] hover:underline">
                    {t("meet_d.linker_or_edit")}
                </Link>
            </div>
        </div>
    );
}

type ApiMeetingPatch = { project_id?: string | null; client_id?: string | null; deal_id?: string | null; participants?: unknown };

function TranscriptionBadge({ status }: { status: string }) {
    const t = useT();
    const map: Record<string, { bg: string; text: string; labelKey: string }> = {
        idle: { bg: "rgba(142, 142, 147, 0.15)", text: "#636366", labelKey: "meet_d.tx_idle" },
        queued: { bg: "rgba(255, 159, 10, 0.15)", text: "#c93400", labelKey: "meet_d.tx_queued" },
        processing: { bg: "rgba(0, 122, 255, 0.15)", text: "#0040dd", labelKey: "meet_d.tx_transcribing" },
        completed: { bg: "rgba(48, 209, 88, 0.15)", text: "#248a3d", labelKey: "meet_d.tx_completed" },
        error: { bg: "rgba(255, 69, 58, 0.15)", text: "#ff453a", labelKey: "meet_d.tx_error_badge" },
    };
    const cfg = map[status] ?? map.idle;
    return (
        <span className="rounded-full px-3 py-1 text-[11px] font-semibold" style={{ background: cfg.bg, color: cfg.text }}>
            {t(cfg.labelKey)}
        </span>
    );
}

/* ════════════════════════════════════════════════════════════════════════
   Extracted recommendations panel — renders analyzer-specific structured
   output and lets the user apply pieces back to the target modules.
   ════════════════════════════════════════════════════════════════════════ */

function ExtractedPanel({
    meetingId,
    meetingClientId,
    meetingDealId,
    meetingProjectId,
    meetingTitle,
    analysis,
    onApplied,
}: {
    meetingId: string;
    meetingClientId: string | null;
    meetingDealId: string | null;
    meetingProjectId: string | null;
    meetingTitle: string;
    analysis: { id: string; analyzer_type: string; output: Record<string, unknown> | null };
    onApplied: () => Promise<void> | void;
}) {
    const { toast } = useToast();
    const [busy, setBusy] = useState<string | null>(null);
    const [showQuoteWizard, setShowQuoteWizard] = useState(false);
    const extracted = (analysis.output?.extracted ?? {}) as Record<string, unknown>;
    const atype = analysis.analyzer_type;

    if (!extracted || Object.keys(extracted).length === 0) return null;

    const apply = async (label: string, selections: Record<string, unknown>) => {
        setBusy(label);
        try {
            const res = await meetingTranscriptionApi.apply(meetingId, analysis.id, selections) as { count: number };
            toast({ title: "Applied", description: `${res.count} record(s) created/updated`, variant: "success" });
            await onApplied();
        } catch (e) {
            toast({ title: "Apply failed", description: (e as Error).message, variant: "error" });
        } finally {
            setBusy(null);
        }
    };

    const Btn = ({ label, sel }: { label: string; sel: Record<string, unknown> }) => (
        <button
            onClick={() => apply(label, sel)}
            disabled={busy === label}
            className="rounded-lg bg-[#5856d6] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#4845b8] disabled:opacity-50"
        >
            {busy === label ? "Applying…" : label}
        </button>
    );

    const KV = ({ data }: { data: Record<string, unknown> }) => (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
            {Object.entries(data).map(([k, v]) => (
                <div key={k} className="contents">
                    <dt className="text-[#8e8e93]">{k}</dt>
                    <dd className="text-[#1d1d1f]">{v === null || v === undefined ? "—" : Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : String(v)}</dd>
                </div>
            ))}
        </dl>
    );

    return (
        <div className="glass-card p-5">
            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[14px] font-semibold text-[#1d1d1f]">🎯 Recommended for {atype.replace(/_/g, " ")}</h3>
                <span className="rounded bg-[#5856d6]/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-[#5856d6]">{atype}</span>
            </div>

            <div className="space-y-4">
                {/* lead_qualification */}
                {atype === "lead_qualification" && (
                    <>
                        {Boolean(extracted.client) && (
                            <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                                <div className="mb-2 flex items-center justify-between">
                                    <p className="text-[13px] font-semibold text-[#1d1d1f]">New Client</p>
                                    <Btn label="Create client" sel={{ create_client: true }} />
                                </div>
                                <KV data={extracted.client as Record<string, unknown>} />
                            </div>
                        )}
                        {Boolean(extracted.deal) && (
                            <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                                <div className="mb-2 flex items-center justify-between">
                                    <p className="text-[13px] font-semibold text-[#1d1d1f]">New Deal</p>
                                    <div className="flex gap-2">
                                        <Btn label="Create client + deal" sel={{ create_client: true, create_deal: true }} />
                                        <Btn label="Create deal only" sel={{ create_deal: true }} />
                                    </div>
                                </div>
                                <KV data={extracted.deal as Record<string, unknown>} />
                            </div>
                        )}
                    </>
                )}

                {/* discovery_rfq */}
                {atype === "discovery_rfq" && Boolean(extracted.rfq) && (
                    <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-[13px] font-semibold text-[#1d1d1f]">RFQ Session</p>
                            <Btn label="Create RFQ session" sel={{ create_rfq: true }} />
                        </div>
                        <KV data={extracted.rfq as Record<string, unknown>} />
                    </div>
                )}

                {/* sales_followup */}
                {atype === "sales_followup" && Boolean(extracted.deal_update) && (
                    <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-[13px] font-semibold text-[#1d1d1f]">Deal Update</p>
                            <Btn label="Apply update" sel={{ update_deal: true }} />
                        </div>
                        <KV data={extracted.deal_update as Record<string, unknown>} />
                    </div>
                )}

                {/* project_kickoff */}
                {atype === "project_kickoff" && (
                    <>
                        {Boolean(extracted.project_update) && (
                            <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                                <div className="mb-2 flex items-center justify-between">
                                    <p className="text-[13px] font-semibold text-[#1d1d1f]">Project Setup</p>
                                    <Btn label="Apply project update" sel={{ update_project: true }} />
                                </div>
                                <KV data={extracted.project_update as Record<string, unknown>} />
                            </div>
                        )}
                        {Array.isArray(extracted.initial_tasks) && (extracted.initial_tasks as unknown[]).length > 0 && (
                            <ListWithApply
                                title="Initial backlog"
                                items={extracted.initial_tasks as Array<{ text: string; assignee?: string; priority?: string; points?: number; task_type?: string }>}
                                renderItem={(t) => (
                                    <>
                                        <p className="text-[13px] text-[#1d1d1f]">{t.text}</p>
                                        <p className="text-[11px] text-[#8e8e93]">{t.task_type ?? "FEATURE"} · {t.priority ?? "medium"} · {t.points ?? 3} pts {t.assignee ? `· @${t.assignee}` : ""}</p>
                                    </>
                                )}
                                onApply={(idxs) => apply("initial_tasks", { initial_tasks: idxs })}
                                busy={busy === "initial_tasks"}
                            />
                        )}
                    </>
                )}

                {/* sprint_review */}
                {atype === "sprint_review" && (
                    <>
                        {Boolean(extracted.sprint_update) && (
                            <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                                <div className="mb-2 flex items-center justify-between">
                                    <p className="text-[13px] font-semibold text-[#1d1d1f]">Sprint Outcome</p>
                                    <Btn label="Apply to active sprint" sel={{ update_sprint: true }} />
                                </div>
                                <KV data={extracted.sprint_update as Record<string, unknown>} />
                            </div>
                        )}
                        {Array.isArray(extracted.next_sprint_tasks) && (extracted.next_sprint_tasks as unknown[]).length > 0 && (
                            <ListWithApply
                                title="Next-sprint backlog"
                                items={extracted.next_sprint_tasks as Array<{ text: string; assignee?: string; priority?: string; points?: number; task_type?: string }>}
                                renderItem={(t) => (
                                    <>
                                        <p className="text-[13px] text-[#1d1d1f]">{t.text}</p>
                                        <p className="text-[11px] text-[#8e8e93]">{t.task_type ?? "FEATURE"} · {t.priority ?? "medium"} · {t.points ?? 3} pts</p>
                                    </>
                                )}
                                onApply={(idxs) => apply("next_sprint_tasks", { next_sprint_tasks: idxs })}
                                busy={busy === "next_sprint_tasks"}
                            />
                        )}
                    </>
                )}

                {/* client_qbr */}
                {atype === "client_qbr" && Boolean(extracted.client_update) && (
                    <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-[13px] font-semibold text-[#1d1d1f]">Client Health Update</p>
                            <Btn label="Apply to client" sel={{ update_client: true }} />
                        </div>
                        <KV data={extracted.client_update as Record<string, unknown>} />
                        {Array.isArray(extracted.expansion_signals) && (extracted.expansion_signals as unknown[]).length > 0 && (
                            <div className="mt-3">
                                <p className="text-[11px] font-semibold uppercase text-[#8e8e93]">Expansion signals</p>
                                <ul className="mt-1 space-y-1 text-[12px]">
                                    {(extracted.expansion_signals as string[]).map((s, i) => <li key={i}>• {s}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* siop_weekly / pmo_review — insights */}
                {(atype === "siop_weekly" || atype === "pmo_review") && Array.isArray(extracted.insights) && (extracted.insights as unknown[]).length > 0 && (
                    <ListWithApply
                        title="AI Insights"
                        items={extracted.insights as Array<{ title: string; description?: string; severity?: string; module?: string }>}
                        renderItem={(ins) => (
                            <>
                                <p className="text-[13px] font-semibold text-[#1d1d1f]">{ins.title}</p>
                                <p className="text-[11px] text-[#8e8e93]">{ins.module ?? ""} · {ins.severity ?? "INFO"}</p>
                                <p className="mt-1 text-[12px] text-[#3c3c43]">{ins.description}</p>
                            </>
                        )}
                        onApply={(idxs) => apply("insights", { insights: idxs })}
                        busy={busy === "insights"}
                    />
                )}

                {/* pmo_review cross-project risks */}
                {atype === "pmo_review" && Array.isArray(extracted.cross_project_risks) && (extracted.cross_project_risks as unknown[]).length > 0 && (
                    <ListWithApply
                        title="Cross-project risks"
                        items={extracted.cross_project_risks as Array<{ title: string; category?: string; probability?: number; impact?: number; response_strategy?: string }>}
                        renderItem={(r) => (
                            <>
                                <p className="text-[13px] font-semibold text-[#1d1d1f]">{r.title}</p>
                                <p className="text-[11px] text-[#8e8e93]">{r.category ?? "general"} · P{r.probability ?? "?"} × I{r.impact ?? "?"}</p>
                                <p className="mt-1 text-[12px] text-[#3c3c43]">{r.response_strategy}</p>
                            </>
                        )}
                        onApply={(idxs) => apply("cross_project_risks", { cross_project_risks: idxs })}
                        busy={busy === "cross_project_risks"}
                    />
                )}

                {/* compliance_audit */}
                {atype === "compliance_audit" && (
                    <>
                        {Array.isArray(extracted.compliance_findings) && (extracted.compliance_findings as unknown[]).length > 0 && (
                            <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                                <p className="mb-2 text-[13px] font-semibold text-[#1d1d1f]">Compliance Findings</p>
                                <ul className="space-y-2">
                                    {(extracted.compliance_findings as Array<{ control: string; status: string; gap: string }>).map((f, i) => (
                                        <li key={i} className="text-[12px]">
                                            <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${f.status === "fail" ? "bg-[#ff453a]/15 text-[#ff453a]" : f.status === "partial" ? "bg-[#ff9f0a]/15 text-[#ff9f0a]" : "bg-[#30d158]/15 text-[#30d158]"}`}>{f.status}</span>
                                            {" "}<strong>{f.control}</strong>: {f.gap}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {Array.isArray(extracted.compliance_tasks) && (extracted.compliance_tasks as unknown[]).length > 0 && (
                            <ListWithApply
                                title="Remediation tasks"
                                items={extracted.compliance_tasks as Array<{ text: string; assignee?: string; priority?: string; points?: number }>}
                                renderItem={(t) => (
                                    <>
                                        <p className="text-[13px] text-[#1d1d1f]">{t.text}</p>
                                        <p className="text-[11px] text-[#8e8e93]">COMPLIANCE · {t.priority ?? "medium"} · {t.points ?? 3} pts</p>
                                    </>
                                )}
                                onApply={(idxs) => apply("compliance_tasks", { compliance_tasks: idxs })}
                                busy={busy === "compliance_tasks"}
                            />
                        )}
                    </>
                )}

                {/* supplier_negotiation */}
                {atype === "supplier_negotiation" && Boolean(extracted.supplier_update) && (
                    <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-[13px] font-semibold text-[#1d1d1f]">Supplier</p>
                            <Btn label="Create supplier" sel={{ create_supplier: true }} />
                        </div>
                        <KV data={extracted.supplier_update as Record<string, unknown>} />
                    </div>
                )}

                {/* daily_standup */}
                {atype === "daily_standup" && (
                    <>
                        {Array.isArray(extracted.task_status_updates) && (extracted.task_status_updates as unknown[]).length > 0 && (
                            <ListWithApply
                                title="Task status updates"
                                items={extracted.task_status_updates as Array<{ task_id?: string; title_match?: string; new_status: string; progress_note?: string; blocker_reason?: string }>}
                                renderItem={(u) => (
                                    <>
                                        <p className="text-[13px] text-[#1d1d1f]">
                                            <span className={`mr-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${u.new_status === "blocked" ? "bg-[#ff453a]/15 text-[#ff453a]" : u.new_status === "done" ? "bg-[#30d158]/15 text-[#30d158]" : "bg-[#0a84ff]/15 text-[#0a84ff]"}`}>{u.new_status}</span>
                                            {u.task_id ? <code className="text-[11px]">#{u.task_id}</code> : u.title_match}
                                        </p>
                                        <p className="text-[11px] text-[#3c3c43]">{u.progress_note}</p>
                                        {u.blocker_reason && <p className="text-[11px] text-[#ff453a]">⛔ {u.blocker_reason}</p>}
                                    </>
                                )}
                                onApply={(idxs) => apply("task_status_updates", { task_status_updates: idxs })}
                                busy={busy === "task_status_updates"}
                            />
                        )}
                        {Array.isArray(extracted.new_tasks) && (extracted.new_tasks as unknown[]).length > 0 && (
                            <ListWithApply
                                title="New tasks discovered"
                                items={extracted.new_tasks as Array<{ text: string; assignee?: string; priority?: string; points?: number; task_type?: string }>}
                                renderItem={(t) => (
                                    <>
                                        <p className="text-[13px] text-[#1d1d1f]">{t.text}</p>
                                        <p className="text-[11px] text-[#8e8e93]">{t.task_type ?? "FEATURE"} · {t.priority ?? "medium"} · {t.points ?? 3} pts {t.assignee ? `· @${t.assignee}` : ""}</p>
                                    </>
                                )}
                                onApply={(idxs) => apply("new_tasks", { new_tasks: idxs })}
                                busy={busy === "new_tasks"}
                            />
                        )}
                    </>
                )}

                {/* sprint_planning */}
                {atype === "sprint_planning" && (
                    <>
                        {Boolean(extracted.sprint_plan) && (
                            <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                                <div className="mb-2 flex items-center justify-between">
                                    <p className="text-[13px] font-semibold text-[#1d1d1f]">Sprint plan</p>
                                    <Btn label="Create / update sprint" sel={{ plan_sprint: true }} />
                                </div>
                                <KV data={extracted.sprint_plan as Record<string, unknown>} />
                            </div>
                        )}
                        {Array.isArray(extracted.task_assignments) && (extracted.task_assignments as unknown[]).length > 0 && (
                            <ListWithApply
                                title="Backlog → Sprint assignments"
                                items={extracted.task_assignments as Array<{ task_id?: string; title_match?: string; assignee?: string; story_points?: number }>}
                                renderItem={(a) => (
                                    <>
                                        <p className="text-[13px] text-[#1d1d1f]">{a.task_id ? <code className="text-[11px]">#{a.task_id}</code> : a.title_match} → <strong>@{a.assignee}</strong></p>
                                        <p className="text-[11px] text-[#8e8e93]">{a.story_points ?? 3} pts</p>
                                    </>
                                )}
                                onApply={(idxs) => apply("task_assignments", { task_assignments: idxs })}
                                busy={busy === "task_assignments"}
                            />
                        )}
                        {Array.isArray(extracted.new_tasks) && (extracted.new_tasks as unknown[]).length > 0 && (
                            <ListWithApply
                                title="New tasks (added during planning)"
                                items={extracted.new_tasks as Array<{ text: string; assignee?: string; priority?: string; points?: number; task_type?: string }>}
                                renderItem={(t) => (
                                    <>
                                        <p className="text-[13px] text-[#1d1d1f]">{t.text}</p>
                                        <p className="text-[11px] text-[#8e8e93]">{t.task_type ?? "FEATURE"} · {t.priority ?? "medium"} · {t.points ?? 3} pts</p>
                                    </>
                                )}
                                onApply={(idxs) => apply("new_tasks", { new_tasks: idxs })}
                                busy={busy === "new_tasks"}
                            />
                        )}
                    </>
                )}

                {/* client_weekly_status */}
                {atype === "client_weekly_status" && (
                    <>
                        {Boolean(extracted.client_pulse) && (
                            <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                                <p className="mb-2 text-[13px] font-semibold text-[#1d1d1f]">Client pulse</p>
                                <KV data={extracted.client_pulse as Record<string, unknown>} />
                            </div>
                        )}
                        {Array.isArray(extracted.insights) && (extracted.insights as unknown[]).length > 0 && (
                            <ListWithApply
                                title="Client signals → insights"
                                items={extracted.insights as Array<{ title: string; description?: string; severity?: string; module?: string }>}
                                renderItem={(ins) => (
                                    <>
                                        <p className="text-[13px] font-semibold text-[#1d1d1f]">{ins.title}</p>
                                        <p className="text-[11px] text-[#8e8e93]">{ins.module ?? "PMO"} · {ins.severity ?? "INFO"}</p>
                                        <p className="mt-1 text-[12px] text-[#3c3c43]">{ins.description}</p>
                                    </>
                                )}
                                onApply={(idxs) => apply("insights", { insights: idxs })}
                                busy={busy === "insights"}
                            />
                        )}
                    </>
                )}

                {/* internal_kickoff */}
                {atype === "internal_kickoff" && (
                    <>
                        {Boolean(extracted.tech_stack) && (
                            <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                                <p className="mb-2 text-[13px] font-semibold text-[#1d1d1f]">Tech stack</p>
                                <KV data={extracted.tech_stack as Record<string, unknown>} />
                            </div>
                        )}
                        {Array.isArray(extracted.team_assignments) && (extracted.team_assignments as unknown[]).length > 0 && (
                            <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                                <p className="mb-2 text-[13px] font-semibold text-[#1d1d1f]">Team assignments</p>
                                <ul className="space-y-1 text-[12px]">
                                    {(extracted.team_assignments as Array<{ name: string; role: string; responsibilities: string }>).map((a, i) => (
                                        <li key={i}><strong>{a.name}</strong> ({a.role}) — {a.responsibilities}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {Boolean(extracted.first_sprint) && (
                            <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                                <div className="mb-2 flex items-center justify-between">
                                    <p className="text-[13px] font-semibold text-[#1d1d1f]">Sprint 1</p>
                                    <Btn label="Create Sprint 1" sel={{ create_first_sprint: true }} />
                                </div>
                                <KV data={extracted.first_sprint as Record<string, unknown>} />
                            </div>
                        )}
                        {Array.isArray(extracted.initial_tasks) && (extracted.initial_tasks as unknown[]).length > 0 && (
                            <ListWithApply
                                title="Bootstrap backlog"
                                items={extracted.initial_tasks as Array<{ text: string; assignee?: string; priority?: string; points?: number; task_type?: string }>}
                                renderItem={(t) => (
                                    <>
                                        <p className="text-[13px] text-[#1d1d1f]">{t.text}</p>
                                        <p className="text-[11px] text-[#8e8e93]">{t.task_type ?? "FEATURE"} · {t.priority ?? "medium"} · {t.points ?? 3} pts {t.assignee ? `· @${t.assignee}` : ""}</p>
                                    </>
                                )}
                                onApply={(idxs) => apply("initial_tasks", { initial_tasks: idxs })}
                                busy={busy === "initial_tasks"}
                            />
                        )}
                    </>
                )}

                {/* sprint_retro */}
                {atype === "sprint_retro" && (
                    <>
                        {Boolean(extracted.retro) && (
                            <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                                <p className="mb-2 text-[13px] font-semibold text-[#1d1d1f]">Retro snapshot</p>
                                <KV data={extracted.retro as Record<string, unknown>} />
                            </div>
                        )}
                        {Array.isArray(extracted.improvement_actions) && (extracted.improvement_actions as unknown[]).length > 0 && (
                            <ListWithApply
                                title="Improvement actions"
                                items={extracted.improvement_actions as Array<{ text: string; assignee?: string; priority?: string; points?: number; task_type?: string }>}
                                renderItem={(t) => (
                                    <>
                                        <p className="text-[13px] text-[#1d1d1f]">{t.text}</p>
                                        <p className="text-[11px] text-[#8e8e93]">{t.task_type ?? "CHORE"} · {t.priority ?? "medium"} · {t.points ?? 3} pts</p>
                                    </>
                                )}
                                onApply={(idxs) => apply("improvement_actions", { improvement_actions: idxs })}
                                busy={busy === "improvement_actions"}
                            />
                        )}
                        {Array.isArray(extracted.insights) && (extracted.insights as unknown[]).length > 0 && (
                            <ListWithApply
                                title="Retro insights"
                                items={extracted.insights as Array<{ title: string; description?: string; severity?: string; module?: string }>}
                                renderItem={(ins) => (<><p className="text-[13px] font-semibold">{ins.title}</p><p className="text-[12px] text-[#3c3c43]">{ins.description}</p></>)}
                                onApply={(idxs) => apply("insights", { insights: idxs })}
                                busy={busy === "insights"}
                            />
                        )}
                    </>
                )}

                {/* uat_session */}
                {atype === "uat_session" && (
                    <>
                        {Boolean(extracted.uat_result) && (
                            <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                                <div className="mb-2 flex items-center justify-between">
                                    <p className="text-[13px] font-semibold text-[#1d1d1f]">UAT result</p>
                                    <Btn label="Update project phase" sel={{ update_project_phase: true }} />
                                </div>
                                <KV data={extracted.uat_result as Record<string, unknown>} />
                            </div>
                        )}
                        {Array.isArray(extracted.bugs_found) && (extracted.bugs_found as unknown[]).length > 0 && (
                            <ListWithApply
                                title="Bugs found"
                                items={extracted.bugs_found as Array<{ text: string; priority?: string; points?: number }>}
                                renderItem={(b) => (
                                    <>
                                        <p className="text-[13px] text-[#1d1d1f]">{b.text}</p>
                                        <p className="text-[11px] text-[#8e8e93]">BUG · {b.priority ?? "medium"} · {b.points ?? 3} pts</p>
                                    </>
                                )}
                                onApply={(idxs) => apply("bugs_found", { bugs_found: idxs })}
                                busy={busy === "bugs_found"}
                            />
                        )}
                    </>
                )}

                {/* incident_postmortem */}
                {atype === "incident_postmortem" && (
                    <>
                        {Boolean(extracted.incident) && (
                            <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                                <p className="mb-2 text-[13px] font-semibold text-[#1d1d1f]">Incident summary</p>
                                <KV data={extracted.incident as Record<string, unknown>} />
                                {Array.isArray((extracted.incident as { five_whys?: string[] }).five_whys) && (
                                    <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-[12px]">
                                        {(extracted.incident as { five_whys: string[] }).five_whys.map((w, i) => <li key={i}>{w}</li>)}
                                    </ol>
                                )}
                            </div>
                        )}
                        {Array.isArray(extracted.preventive_actions) && (extracted.preventive_actions as unknown[]).length > 0 && (
                            <ListWithApply
                                title="Preventive actions"
                                items={extracted.preventive_actions as Array<{ text: string; assignee?: string; priority?: string; points?: number; task_type?: string }>}
                                renderItem={(t) => (
                                    <>
                                        <p className="text-[13px] text-[#1d1d1f]">{t.text}</p>
                                        <p className="text-[11px] text-[#8e8e93]">{t.task_type ?? "CHORE"} · {t.priority ?? "high"} · {t.points ?? 3} pts</p>
                                    </>
                                )}
                                onApply={(idxs) => apply("preventive_actions", { preventive_actions: idxs })}
                                busy={busy === "preventive_actions"}
                            />
                        )}
                        {Array.isArray(extracted.insights) && (extracted.insights as unknown[]).length > 0 && (
                            <ListWithApply
                                title="Postmortem insights"
                                items={extracted.insights as Array<{ title: string; description?: string }>}
                                renderItem={(ins) => (<><p className="text-[13px] font-semibold">{ins.title}</p><p className="text-[12px] text-[#3c3c43]">{ins.description}</p></>)}
                                onApply={(idxs) => apply("insights", { insights: idxs })}
                                busy={busy === "insights"}
                            />
                        )}
                    </>
                )}

                {/* change_request */}
                {atype === "change_request" && (
                    <>
                        {Boolean(extracted.change_request) && (
                            <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                                <p className="mb-2 text-[13px] font-semibold text-[#1d1d1f]">Change request</p>
                                <KV data={extracted.change_request as Record<string, unknown>} />
                            </div>
                        )}
                        {Boolean(extracted.deal_update) && (
                            <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                                <div className="mb-2 flex items-center justify-between">
                                    <p className="text-[13px] font-semibold text-[#1d1d1f]">Deal impact</p>
                                    <Btn label="Apply to deal" sel={{ apply_change_deal_update: true }} />
                                </div>
                                <KV data={extracted.deal_update as Record<string, unknown>} />
                            </div>
                        )}
                        {Boolean(extracted.project_update) && (
                            <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                                <div className="mb-2 flex items-center justify-between">
                                    <p className="text-[13px] font-semibold text-[#1d1d1f]">Project impact</p>
                                    <Btn label="Apply to project" sel={{ apply_change_project_update: true }} />
                                </div>
                                <KV data={extracted.project_update as Record<string, unknown>} />
                            </div>
                        )}
                        {Array.isArray(extracted.new_tasks) && (extracted.new_tasks as unknown[]).length > 0 && (
                            <ListWithApply
                                title="Tasks generated by the change"
                                items={extracted.new_tasks as Array<{ text: string; assignee?: string; priority?: string; points?: number; task_type?: string }>}
                                renderItem={(t) => (
                                    <>
                                        <p className="text-[13px] text-[#1d1d1f]">{t.text}</p>
                                        <p className="text-[11px] text-[#8e8e93]">{t.task_type ?? "FEATURE"} · {t.priority ?? "medium"} · {t.points ?? 3} pts</p>
                                    </>
                                )}
                                onApply={(idxs) => apply("new_tasks", { new_tasks: idxs })}
                                busy={busy === "new_tasks"}
                            />
                        )}
                    </>
                )}

                {/* proposal_review */}
                {atype === "proposal_review" && (
                    <>
                        {Boolean(extracted.proposal) && (
                            <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                                <div className="mb-2 flex items-center justify-between">
                                    <p className="text-[13px] font-semibold text-[#1d1d1f]">Proposal walkthrough</p>
                                    <Btn label="Create proposal draft" sel={{ create_proposal: true }} />
                                </div>
                                <KV data={extracted.proposal as Record<string, unknown>} />
                            </div>
                        )}
                        {Boolean(extracted.deal_update) && (
                            <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                                <div className="mb-2 flex items-center justify-between">
                                    <p className="text-[13px] font-semibold text-[#1d1d1f]">Deal stage update</p>
                                    <Btn label="Apply to deal" sel={{ apply_proposal_deal_update: true }} />
                                </div>
                                <KV data={extracted.deal_update as Record<string, unknown>} />
                            </div>
                        )}
                    </>
                )}

                {/* contract_review */}
                {atype === "contract_review" && Boolean(extracted.contract_update) && (
                    <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-[13px] font-semibold text-[#1d1d1f]">Contract</p>
                            <Btn label="Create contract" sel={{ create_contract: true }} />
                        </div>
                        <KV data={extracted.contract_update as Record<string, unknown>} />
                        {Array.isArray(extracted.compliance_flags) && (extracted.compliance_flags as unknown[]).length > 0 && (
                            <div className="mt-3">
                                <p className="text-[11px] font-semibold uppercase text-[#8e8e93]">Compliance flags</p>
                                <div className="mt-1 flex flex-wrap gap-1">
                                    {(extracted.compliance_flags as string[]).map((f, i) => (
                                        <span key={i} className="rounded bg-[#7c3aed]/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#7c3aed]">{f}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* cs_checkin */}
                {atype === "cs_checkin" && Boolean(extracted.cs_pulse) && (
                    <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-[13px] font-semibold text-[#1d1d1f]">Client pulse</p>
                            <Btn label="Apply pulse to client" sel={{ apply_cs_pulse: true }} />
                        </div>
                        <KV data={extracted.cs_pulse as Record<string, unknown>} />
                        {Array.isArray(extracted.expansion_signals) && (extracted.expansion_signals as unknown[]).length > 0 && (
                            <div className="mt-3">
                                <p className="text-[11px] font-semibold uppercase text-[#8e8e93]">Expansion signals</p>
                                <ul className="mt-1 space-y-1 text-[12px]">
                                    {(extracted.expansion_signals as string[]).map((s, i) => <li key={i}>• {s}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* supplier_review */}
                {atype === "supplier_review" && Boolean(extracted.supplier_review) && (
                    <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-[13px] font-semibold text-[#1d1d1f]">Supplier scorecard</p>
                            <Btn label="Apply review" sel={{ apply_supplier_review: true }} />
                        </div>
                        <KV data={extracted.supplier_review as Record<string, unknown>} />
                    </div>
                )}

                {/* one_on_one */}
                {atype === "one_on_one" && Boolean(extracted.one_on_one) && (
                    <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-[13px] font-semibold text-[#1d1d1f]">1:1 summary</p>
                            <Btn label="Log to People insights" sel={{ apply_one_on_one: true }} />
                        </div>
                        <KV data={extracted.one_on_one as Record<string, unknown>} />
                    </div>
                )}

                {/* ─── Day 24 — role-coverage analyzers ─── */}

                {/* backlog_refinement: task_estimates + new_tasks reuse generic blocks */}
                {atype === "backlog_refinement" && Array.isArray(extracted.task_estimates) && (extracted.task_estimates as unknown[]).length > 0 && (
                    <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-[13px] font-semibold text-[#1d1d1f]">Re-estimates</p>
                            <Btn label="Apply estimates" sel={{ apply_task_estimates: true }} />
                        </div>
                        <ul className="space-y-1.5 text-[12px]">
                            {(extracted.task_estimates as Array<{ task_id?: string; title_match?: string; story_points: number; ready_for_sprint: boolean }>).map((e, i) => (
                                <li key={i}>
                                    <span className="rounded bg-[#22d3ee]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#0e7490]">{e.story_points} pts</span>
                                    {" "}{e.task_id ? <code>#{e.task_id}</code> : e.title_match}
                                    {e.ready_for_sprint && <span className="ml-2 text-[10px] text-[#30d158]">✓ ready</span>}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* architecture_review */}
                {atype === "architecture_review" && Boolean(extracted.adr) && (
                    <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-[13px] font-semibold text-[#1d1d1f]">Architecture Decision Record</p>
                            <Btn label="Log ADR" sel={{ apply_adr: true }} />
                        </div>
                        <KV data={extracted.adr as Record<string, unknown>} />
                    </div>
                )}

                {/* bug_triage */}
                {atype === "bug_triage" && (
                    <>
                        {Boolean(extracted.queue_health) && (
                            <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                                <p className="mb-2 text-[13px] font-semibold text-[#1d1d1f]">Queue health</p>
                                <KV data={extracted.queue_health as Record<string, unknown>} />
                            </div>
                        )}
                        {Array.isArray(extracted.triaged_bugs) && (extracted.triaged_bugs as unknown[]).length > 0 && (
                            <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                                <div className="mb-2 flex items-center justify-between">
                                    <p className="text-[13px] font-semibold text-[#1d1d1f]">Triaged bugs</p>
                                    <Btn label="Apply triage" sel={{ apply_bug_triage: true }} />
                                </div>
                                <ul className="space-y-1 text-[12px]">
                                    {(extracted.triaged_bugs as Array<{ task_id?: string; title_match?: string; new_priority: string; new_status: string; assignee?: string; decision_note: string }>).map((b, i) => (
                                        <li key={i}>
                                            <span className={`mr-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${b.new_priority === "critical" ? "bg-[#ff453a]/15 text-[#ff453a]" : b.new_priority === "high" ? "bg-[#ff9f0a]/15 text-[#ff9f0a]" : "bg-black/10 text-[#1d1d1f]"}`}>{b.new_priority}</span>
                                            {b.task_id ? <code>#{b.task_id}</code> : b.title_match}
                                            <span className="text-[#8e8e93]"> · {b.decision_note}{b.assignee ? ` · ${b.assignee}` : ""}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </>
                )}

                {/* steering_committee */}
                {atype === "steering_committee" && (
                    <>
                        {Boolean(extracted.stage_gate) && (
                            <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                                <div className="mb-2 flex items-center justify-between">
                                    <p className="text-[13px] font-semibold text-[#1d1d1f]">Stage-gate decision</p>
                                    <Btn label="Apply gate" sel={{ apply_stage_gate: true }} />
                                </div>
                                <KV data={extracted.stage_gate as Record<string, unknown>} />
                            </div>
                        )}
                        {Array.isArray(extracted.escalations) && (extracted.escalations as unknown[]).length > 0 && (
                            <div className="rounded-xl border border-[#ff453a]/30 bg-[#ff453a]/5 p-4">
                                <p className="mb-2 text-[13px] font-semibold text-[#ff453a]">Escalations</p>
                                <ul className="space-y-2 text-[12px]">
                                    {(extracted.escalations as Array<{ title: string; owner: string; severity: string; decision_required: string }>).map((e, i) => (
                                        <li key={i}>
                                            <strong>{e.title}</strong> — {e.owner}
                                            <p className="text-[11px] text-[#3c3c43]">{e.decision_required}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </>
                )}

                {/* capacity_planning */}
                {atype === "capacity_planning" && (
                    <>
                        {Array.isArray(extracted.capacity_signals) && (extracted.capacity_signals as unknown[]).length > 0 && (
                            <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                                <div className="mb-2 flex items-center justify-between">
                                    <p className="text-[13px] font-semibold text-[#1d1d1f]">Capacity signals</p>
                                    <Btn label="Log all to insights" sel={{ apply_capacity_signals: true }} />
                                </div>
                                <table className="w-full text-[12px]">
                                    <thead><tr className="text-left text-[10px] uppercase text-[#8e8e93]"><th>Role</th><th>Current</th><th>Needed</th><th>Gap</th><th>Action</th></tr></thead>
                                    <tbody>
                                        {(extracted.capacity_signals as Array<{ role: string; current_fte: number; needed_fte: number; gap_severity: string; action: string }>).map((c, i) => (
                                            <tr key={i} className="border-t border-black/[0.04]">
                                                <td className="py-1">{c.role}</td>
                                                <td>{c.current_fte}</td>
                                                <td>{c.needed_fte}</td>
                                                <td><span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${c.gap_severity === "high" ? "bg-[#ff453a]/15 text-[#ff453a]" : c.gap_severity === "medium" ? "bg-[#ff9f0a]/15 text-[#ff9f0a]" : "bg-black/10 text-[#1d1d1f]"}`}>{c.gap_severity}</span></td>
                                                <td>{c.action}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {Array.isArray(extracted.hiring_requests) && (extracted.hiring_requests as unknown[]).length > 0 && (
                            <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                                <p className="mb-2 text-[13px] font-semibold text-[#1d1d1f]">Hiring requests</p>
                                <ul className="space-y-1 text-[12px]">
                                    {(extracted.hiring_requests as Array<{ role: string; level: string; headcount: number; urgency: string }>).map((h, i) => (
                                        <li key={i}>{h.headcount}× {h.level} {h.role} <span className="text-[#8e8e93]">({h.urgency})</span></li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </>
                )}

                {/* onboarding_call */}
                {atype === "onboarding_call" && (
                    <>
                        {Array.isArray(extracted.onboarding_checklist) && (extracted.onboarding_checklist as unknown[]).length > 0 && (
                            <ListWithApply
                                title="Onboarding checklist"
                                items={extracted.onboarding_checklist as Array<{ text: string; assignee?: string; priority?: string; points?: number; task_type?: string }>}
                                renderItem={(t) => (
                                    <>
                                        <p className="text-[13px] text-[#1d1d1f]">{t.text}</p>
                                        <p className="text-[11px] text-[#8e8e93]">{t.task_type ?? "CHORE"} · {t.priority ?? "medium"} · {t.points ?? 3} pts</p>
                                    </>
                                )}
                                onApply={(idxs) => apply("onboarding_checklist", { onboarding_checklist: idxs })}
                                busy={busy === "onboarding_checklist"}
                            />
                        )}
                        {Array.isArray(extracted.access_requests) && (extracted.access_requests as unknown[]).length > 0 && (
                            <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                                <p className="mb-2 text-[13px] font-semibold text-[#1d1d1f]">Access requests</p>
                                <ul className="space-y-1 text-[12px]">
                                    {(extracted.access_requests as Array<{ system: string; needed_for: string; owner_client?: string }>).map((a, i) => (
                                        <li key={i}><strong>{a.system}</strong> — {a.needed_for}{a.owner_client ? ` (${a.owner_client})` : ""}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </>
                )}

                {/* renewal_call */}
                {atype === "renewal_call" && (
                    <>
                        {Boolean(extracted.renewal) && (
                            <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                                <div className="mb-2 flex items-center justify-between">
                                    <p className="text-[13px] font-semibold text-[#1d1d1f]">Renewal posture</p>
                                    <Btn label="Log renewal" sel={{ apply_renewal: true }} />
                                </div>
                                <KV data={extracted.renewal as Record<string, unknown>} />
                            </div>
                        )}
                        {Boolean(extracted.deal_update) && (
                            <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                                <div className="mb-2 flex items-center justify-between">
                                    <p className="text-[13px] font-semibold text-[#1d1d1f]">Deal update</p>
                                    <Btn label="Apply to deal" sel={{ apply_renewal_deal_update: true }} />
                                </div>
                                <KV data={extracted.deal_update as Record<string, unknown>} />
                            </div>
                        )}
                    </>
                )}

                {/* win_loss_review */}
                {atype === "win_loss_review" && Boolean(extracted.win_loss) && (
                    <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-[13px] font-semibold text-[#1d1d1f]">Win / Loss</p>
                            <Btn label="Log to CRM insights" sel={{ apply_win_loss: true }} />
                        </div>
                        <KV data={extracted.win_loss as Record<string, unknown>} />
                    </div>
                )}

                {/* hiring_panel */}
                {atype === "hiring_panel" && Boolean(extracted.panel) && (
                    <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-[13px] font-semibold text-[#1d1d1f]">Panel decision</p>
                            <Btn label="Log to People insights" sel={{ apply_hiring_panel: true }} />
                        </div>
                        <KV data={extracted.panel as Record<string, unknown>} />
                    </div>
                )}

                {/* performance_review */}
                {atype === "performance_review" && Boolean(extracted.performance_review) && (
                    <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-[13px] font-semibold text-[#1d1d1f]">Performance review</p>
                            <Btn label="Log to People insights" sel={{ apply_performance_review: true }} />
                        </div>
                        <KV data={extracted.performance_review as Record<string, unknown>} />
                    </div>
                )}

                {/* cost_estimation → cotización en MXN */}
                {atype === "cost_estimation" && Boolean(extracted.estimate) && (() => {
                    const est = extracted.estimate as {
                        scope_summary?: string;
                        deliverables?: string[];
                        feature_breakdown?: Array<{ feature?: string; complexity?: string; person_weeks?: number; primary_role?: string; rationale?: string }>;
                        total_person_weeks?: number;
                        complexity_level?: string;
                        complexity_reasoning?: string;
                        estimated_dev_weeks?: number;
                        size_tier?: string;
                        deadline_pressure?: string;
                        deadline_reasoning?: string;
                        confidence?: string;
                        confidence_reasoning?: string;
                        team?: Array<{ role?: string; role_label?: string; count?: number; weeks?: number; allocation_pct?: number; weekly_rate_mxn?: number; subtotal_mxn?: number; notes?: string }>;
                        infrastructure?: Array<{ name?: string; monthly_cost_mxn?: number; months?: number; subtotal_mxn?: number }>;
                        third_party_costs?: Array<{ name?: string; amount_mxn?: number; notes?: string }>;
                        risk_buffer_pct?: number;
                        subtotal_mxn?: number;
                        currency?: string;
                        tax_rate_pct?: number;
                        valid_days?: number;
                        assumptions?: string[];
                        exclusions?: string[];
                        commercial_model?: string;
                        pricing_rationale?: string;
                        alternative_options?: Array<{ name?: string; scope?: string; weeks?: number; total_mxn?: number }>;
                    };
                    const fmtMXN = (n?: number) => typeof n === "number"
                        ? new Intl.NumberFormat("es-MX", { style: "currency", currency: est.currency ?? "MXN", maximumFractionDigits: 0 }).format(n)
                        : "—";
                    const teamTotal = (est.team ?? []).reduce((a, m) => {
                        const alloc = (m.allocation_pct ?? 100) / 100;
                        const computed = (m.count ?? 1) * (m.weeks ?? 0) * (m.weekly_rate_mxn ?? 0) * alloc;
                        return a + (m.subtotal_mxn && m.subtotal_mxn > 0 ? m.subtotal_mxn : computed);
                    }, 0);
                    const infraTotal = (est.infrastructure ?? []).reduce((a, m) => {
                        const computed = (m.monthly_cost_mxn ?? 0) * (m.months ?? 0);
                        return a + (m.subtotal_mxn && m.subtotal_mxn > 0 ? m.subtotal_mxn : computed);
                    }, 0);
                    const tpTotal = (est.third_party_costs ?? []).reduce((a, m) => a + (m.amount_mxn ?? 0), 0);
                    const baseTotal = teamTotal + infraTotal + tpTotal;
                    const bufferPct = est.risk_buffer_pct ?? 15;
                    const buffer = Math.round(baseTotal * (bufferPct / 100));
                    const subtotal = baseTotal + buffer;
                    const taxPct = est.tax_rate_pct ?? 16;
                    const tax = Math.round(subtotal * (taxPct / 100));
                    const total = subtotal + tax;
                    const deadlineColor = est.deadline_pressure === "UNREALISTIC" ? "text-[#ff453a]"
                        : est.deadline_pressure === "TIGHT" ? "text-[#ff9f0a]" : "text-[#30d158]";
                    return (
                        <div className="rounded-xl border border-[#34c759]/30 bg-[#34c759]/5 p-4">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <p className="text-[13px] font-semibold text-[#1d1d1f]">💸 Cotización estimada</p>
                                    <p className="text-[11px] text-[#8e8e93]">
                                        {est.size_tier && <><strong>{est.size_tier}</strong>{" · "}</>}
                                        Complejidad: <strong>{est.complexity_level ?? "—"}</strong>
                                        {" · "}Confianza: <strong>{est.confidence ?? "—"}</strong>
                                        {" · "}{est.estimated_dev_weeks ?? 0} sem cal
                                        {est.total_person_weeks ? ` (${est.total_person_weeks} pw)` : ""}
                                        {" · "}{est.commercial_model ?? "FIXED_PRICE"}
                                    </p>
                                    {est.deadline_pressure && est.deadline_pressure !== "NONE" && (
                                        <p className={`mt-1 text-[11px] font-semibold ${deadlineColor}`}>
                                            ⏱ Plazo {est.deadline_pressure}{est.deadline_reasoning ? ` — ${est.deadline_reasoning}` : ""}
                                        </p>
                                    )}
                                </div>
                                {meetingClientId && meetingDealId ? (
                                    <Btn label="Crear cotización en MXN" sel={{ create_quote_from_estimate: true }} />
                                ) : (
                                    <button
                                        onClick={() => setShowQuoteWizard(true)}
                                        className="rounded-lg bg-[#34c759] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#28a745]"
                                    >
                                        🪄 Crear cliente + deal + cotización
                                    </button>
                                )}
                            </div>

                            {est.scope_summary && (
                                <p className="mb-3 text-[12px] text-[#3c3c43]">{est.scope_summary}</p>
                            )}

                            {Array.isArray(est.feature_breakdown) && est.feature_breakdown.length > 0 && (
                                <div className="mb-3">
                                    <p className="mb-1 text-[11px] font-semibold uppercase text-[#8e8e93]">Desglose de features</p>
                                    <table className="w-full text-[12px]">
                                        <thead><tr className="text-left text-[10px] uppercase text-[#8e8e93]"><th>Feature</th><th>Talla</th><th>PW</th><th>Rol</th></tr></thead>
                                        <tbody>
                                            {est.feature_breakdown.map((f, i) => (
                                                <tr key={i} className="border-t border-black/[0.04] align-top">
                                                    <td className="py-1">{f.feature}{f.rationale && <span className="block text-[10px] text-[#8e8e93]">{f.rationale}</span>}</td>
                                                    <td><span className="rounded bg-black/[0.06] px-1.5 py-0.5 text-[10px] font-bold">{f.complexity}</span></td>
                                                    <td>{f.person_weeks}</td>
                                                    <td className="text-[10px] text-[#8e8e93]">{f.primary_role}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {Array.isArray(est.deliverables) && est.deliverables.length > 0 && (
                                <div className="mb-3">
                                    <p className="mb-1 text-[11px] font-semibold uppercase text-[#8e8e93]">Entregables</p>
                                    <ul className="space-y-0.5 text-[12px] text-[#1d1d1f]">
                                        {est.deliverables.map((d, i) => <li key={i}>• {d}</li>)}
                                    </ul>
                                </div>
                            )}

                            {Array.isArray(est.team) && est.team.length > 0 && (
                                <div className="mb-3">
                                    <p className="mb-1 text-[11px] font-semibold uppercase text-[#8e8e93]">Equipo</p>
                                    <table className="w-full text-[12px]">
                                        <thead><tr className="text-left text-[10px] uppercase text-[#8e8e93]"><th>Rol</th><th>#</th><th>Sem</th><th>Alloc</th><th>Tarifa</th><th className="text-right">Subtotal</th></tr></thead>
                                        <tbody>
                                            {est.team.map((m, i) => {
                                                const alloc = m.allocation_pct ?? 100;
                                                const computed = (m.count ?? 1) * (m.weeks ?? 0) * (m.weekly_rate_mxn ?? 0) * alloc / 100;
                                                const sub = m.subtotal_mxn && m.subtotal_mxn > 0 ? m.subtotal_mxn : computed;
                                                return (
                                                    <tr key={i} className="border-t border-black/[0.04]">
                                                        <td className="py-1">{m.role_label ?? m.role}{m.notes && <span className="block text-[10px] text-[#8e8e93]">{m.notes}</span>}</td>
                                                        <td>{m.count ?? 1}</td>
                                                        <td>{m.weeks ?? 0}</td>
                                                        <td>{alloc}%</td>
                                                        <td>{fmtMXN(m.weekly_rate_mxn)}</td>
                                                        <td className="text-right font-mono">{fmtMXN(sub)}</td>
                                                    </tr>
                                                );
                                            })}
                                            <tr className="border-t border-black/10 font-semibold"><td colSpan={5}>Total equipo</td><td className="text-right font-mono">{fmtMXN(teamTotal)}</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {Array.isArray(est.infrastructure) && est.infrastructure.length > 0 && (
                                <div className="mb-3">
                                    <p className="mb-1 text-[11px] font-semibold uppercase text-[#8e8e93]">Infraestructura</p>
                                    <ul className="space-y-0.5 text-[12px]">
                                        {est.infrastructure.map((m, i) => {
                                            const computed = (m.monthly_cost_mxn ?? 0) * (m.months ?? 0);
                                            const sub = m.subtotal_mxn && m.subtotal_mxn > 0 ? m.subtotal_mxn : computed;
                                            return (
                                                <li key={i} className="flex justify-between">
                                                    <span>{m.name} <span className="text-[#8e8e93]">({m.months ?? 0} meses × {fmtMXN(m.monthly_cost_mxn)})</span></span>
                                                    <span className="font-mono">{fmtMXN(sub)}</span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}

                            {Array.isArray(est.third_party_costs) && est.third_party_costs.length > 0 && (
                                <div className="mb-3">
                                    <p className="mb-1 text-[11px] font-semibold uppercase text-[#8e8e93]">Terceros</p>
                                    <ul className="space-y-0.5 text-[12px]">
                                        {est.third_party_costs.map((m, i) => (
                                            <li key={i} className="flex justify-between">
                                                <span>{m.name}{m.notes && <span className="text-[#8e8e93]"> — {m.notes}</span>}</span>
                                                <span className="font-mono">{fmtMXN(m.amount_mxn)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="mt-3 space-y-1 border-t border-black/10 pt-3 text-[12px]">
                                <div className="flex justify-between text-[#8e8e93]"><span>Base (equipo + infra + terceros)</span><span className="font-mono">{fmtMXN(baseTotal)}</span></div>
                                <div className="flex justify-between"><span>Buffer de riesgo ({bufferPct}%)</span><span className="font-mono">{fmtMXN(buffer)}</span></div>
                                <div className="flex justify-between font-semibold"><span>Subtotal</span><span className="font-mono">{fmtMXN(subtotal)}</span></div>
                                <div className="flex justify-between"><span>IVA ({taxPct}%)</span><span className="font-mono">{fmtMXN(tax)}</span></div>
                                <div className="flex justify-between border-t border-black/10 pt-1 text-[14px] font-bold text-[#34c759]"><span>TOTAL</span><span className="font-mono">{fmtMXN(total)}</span></div>
                                <p className="pt-1 text-[10px] text-[#8e8e93]">Vigencia: {est.valid_days ?? 30} días</p>
                            </div>

                            {est.pricing_rationale && (
                                <p className="mt-3 rounded bg-[#34c759]/10 p-2 text-[11px] italic text-[#1d1d1f]">
                                    💡 {est.pricing_rationale}
                                </p>
                            )}

                            {Array.isArray(est.alternative_options) && est.alternative_options.length > 0 && (
                                <div className="mt-3 rounded-lg border border-[#0a84ff]/30 bg-[#0a84ff]/5 p-3">
                                    <p className="mb-2 text-[11px] font-semibold uppercase text-[#0a84ff]">Opciones alternativas</p>
                                    <ul className="space-y-1 text-[12px]">
                                        {est.alternative_options.map((opt, i) => (
                                            <li key={i} className="flex justify-between gap-3">
                                                <span><strong>{opt.name}</strong>{opt.scope && <span className="text-[#8e8e93]"> — {opt.scope}</span>}{opt.weeks ? <span className="text-[10px] text-[#8e8e93]"> ({opt.weeks} sem)</span> : ""}</span>
                                                <span className="font-mono font-semibold text-[#0a84ff]">{fmtMXN(opt.total_mxn)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {Array.isArray(est.assumptions) && est.assumptions.length > 0 && (
                                <div className="mt-3">
                                    <p className="mb-1 text-[11px] font-semibold uppercase text-[#8e8e93]">Supuestos</p>
                                    <ul className="space-y-0.5 text-[11px] text-[#3c3c43]">
                                        {est.assumptions.map((a, i) => <li key={i}>• {a}</li>)}
                                    </ul>
                                </div>
                            )}

                            {Array.isArray(est.exclusions) && est.exclusions.length > 0 && (
                                <div className="mt-2">
                                    <p className="mb-1 text-[11px] font-semibold uppercase text-[#8e8e93]">No incluido</p>
                                    <ul className="space-y-0.5 text-[11px] text-[#3c3c43]">
                                        {est.exclusions.map((x, i) => <li key={i}>• {x}</li>)}
                                    </ul>
                                </div>
                            )}

                            {(est.complexity_reasoning || est.confidence_reasoning) && (
                                <div className="mt-3 space-y-1 rounded bg-black/[0.03] p-2 text-[11px] italic text-[#3c3c43]">
                                    {est.complexity_reasoning && <p>🧩 {est.complexity_reasoning}</p>}
                                    {est.confidence_reasoning && <p>🎯 {est.confidence_reasoning}</p>}
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* project_kickoff initial risks via global risks list */}
                {Array.isArray((analysis.output as Record<string, unknown>)?.risks) && ((analysis.output as Record<string, unknown>).risks as unknown[]).length > 0 && ["project_kickoff", "pmo_review", "compliance_audit"].includes(atype) && (
                    <ListWithApply
                        title="Risks → risk register"
                        items={(analysis.output as { risks: Array<{ title: string; severity?: string; detail?: string; category?: string; probability?: number; impact?: number }> }).risks}
                        renderItem={(r) => (
                            <>
                                <p className="text-[13px] font-semibold text-[#1d1d1f]">{r.title}</p>
                                <p className="text-[11px] text-[#8e8e93]">{r.category ?? "general"} · sev {r.severity ?? "warning"}</p>
                                <p className="mt-1 text-[12px] text-[#3c3c43]">{r.detail}</p>
                            </>
                        )}
                        onApply={(idxs) => apply("risks", { risks: idxs })}
                        busy={busy === "risks"}
                    />
                )}
            </div>
            {showQuoteWizard && (
                <BootstrapQuoteWizard
                    meetingId={meetingId}
                    meetingTitle={meetingTitle}
                    analysisId={analysis.id}
                    extracted={extracted}
                    onClose={() => setShowQuoteWizard(false)}
                    onDone={async () => {
                        setShowQuoteWizard(false);
                        toast({ title: "Listo", description: "Cliente, deal y cotización creados.", variant: "success" });
                        await onApplied();
                    }}
                    onError={(e) => toast({ title: "Falló el wizard", description: (e as Error).message, variant: "error" })}
                />
            )}
        </div>
    );
}

function ListWithApply<T>({
    title, items, renderItem, onApply, busy,
}: {
    title: string;
    items: T[];
    renderItem: (item: T) => React.ReactNode;
    onApply: (indices: number[]) => void;
    busy: boolean;
}) {
    const [selected, setSelected] = useState<Set<number>>(new Set(items.map((_, i) => i)));
    const toggle = (i: number) => {
        const next = new Set(selected);
        if (next.has(i)) next.delete(i); else next.add(i);
        setSelected(next);
    };
    return (
        <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
            <div className="mb-3 flex items-center justify-between">
                <p className="text-[13px] font-semibold text-[#1d1d1f]">{title}</p>
                <button
                    disabled={busy || selected.size === 0}
                    onClick={() => onApply([...selected])}
                    className="rounded-lg bg-[#30d158] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#28b84d] disabled:opacity-50"
                >
                    {busy ? "Applying…" : `✓ Apply ${selected.size} selected`}
                </button>
            </div>
            <ul className="space-y-2">
                {items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 rounded-lg bg-white/60 p-2">
                        <input
                            type="checkbox"
                            checked={selected.has(i)}
                            onChange={() => toggle(i)}
                            className="mt-1"
                        />
                        <div className="flex-1">{renderItem(item)}</div>
                    </li>
                ))}
            </ul>
        </div>
    );
}


/* ------------------------------------------------------------------------
   BootstrapQuoteWizard - modal that creates client + deal (+ project)
   when the meeting was not pre-linked, then triggers the quote-from-estimate
   apply. Pre-fills from extracted.prospective_client / deal_update.
   ---------------------------------------------------------------------- */

function BootstrapQuoteWizard({
    meetingId, meetingTitle, analysisId, extracted, onClose, onDone, onError,
}: {
    meetingId: string;
    meetingTitle: string;
    analysisId: string;
    extracted: Record<string, unknown>;
    onClose: () => void;
    onDone: () => Promise<void> | void;
    onError: (e: unknown) => void;
}) {
    const est = (extracted.estimate ?? {}) as Record<string, unknown>;
    const pc = (extracted.prospective_client ?? {}) as Record<string, unknown>;
    const dealUpd = (extracted.deal_update ?? {}) as Record<string, unknown>;
    const totalGuess = (() => {
        const team = (est.team as Array<Record<string, unknown>> | undefined) ?? [];
        const teamSum = team.reduce((acc, m) => {
            const c = Number(m.count ?? 1);
            const w = Number(m.weeks ?? 0);
            const r = Number(m.weekly_rate_mxn ?? 0);
            const a = Number(m.allocation_pct ?? 100) / 100;
            const computed = c * w * r * a;
            const sub = Number(m.subtotal_mxn ?? 0);
            return acc + (sub > 0 ? sub : computed);
        }, 0);
        const buf = teamSum * (Number(est.risk_buffer_pct ?? 15) / 100);
        return Math.round((teamSum + buf) * (1 + Number(est.tax_rate_pct ?? 16) / 100));
    })();

    const [clientName, setClientName] = useState(String(pc.name ?? "").trim());
    const [industry, setIndustry] = useState(String(pc.industry ?? "").trim());
    const [contactName, setContactName] = useState(String(pc.contact_name ?? "").trim());
    const [contactEmail, setContactEmail] = useState(String(pc.contact_email ?? "").trim());
    const [contactPhone, setContactPhone] = useState(String(pc.contact_phone ?? "").trim());
    const [dealTitle, setDealTitle] = useState(
        String(dealUpd.deal_title ?? `Cotizacion - ${meetingTitle}`).trim().slice(0, 200)
    );
    const [dealType, setDealType] = useState(String(dealUpd.deal_type ?? "platform"));
    const [createProject, setCreateProject] = useState(true);
    const [projectName, setProjectName] = useState(String(dealUpd.deal_title ?? meetingTitle).trim().slice(0, 200));
    const [submitting, setSubmitting] = useState(false);

    const submit = async () => {
        if (!clientName.trim()) { onError(new Error("Nombre del cliente es obligatorio")); return; }
        setSubmitting(true);
        try {
            const client = await clientsApi.create({
                name: clientName.trim(),
                industry: industry.trim() || undefined,
                primary_contact_name: contactName.trim() || undefined,
                primary_contact_email: contactEmail.trim() || undefined,
                status: "PROSPECT",
                segment: "GROWTH",
            } as Parameters<typeof clientsApi.create>[0]);

            const deal = await dealsApi.create({
                client_id: client.id,
                client_name: clientName.trim(),
                title: dealTitle,
                deal_type: dealType,
                stage: "discovery",
                value: totalGuess || undefined,
                probability: 40,
                commercial_model: (est.commercial_model as string) ?? "FIXED_PRICE",
            } as Parameters<typeof dealsApi.create>[0]);

            let projectId: string | null = null;
            if (createProject) {
                const proj = await projectsApi.create({
                    client_id: client.id,
                    deal_id: deal.id,
                    client_name: clientName.trim(),
                    name: projectName.trim() || dealTitle,
                    status: "draft",
                    methodology: "agile",
                    phase: "discovery",
                    phi_involved: false,
                    baa_confirmed: false,
                } as Parameters<typeof projectsApi.create>[0]);
                projectId = proj.id;
            }

            await meetingsApi.update(meetingId, {
                client_id: client.id,
                deal_id: deal.id,
                ...(projectId ? { project_id: projectId } : {}),
            } as Parameters<typeof meetingsApi.update>[1]);

            await meetingTranscriptionApi.apply(meetingId, analysisId, { create_quote_from_estimate: true });
            await onDone();
        } catch (e) {
            onError(e);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-3 border-b border-black/5 p-5">
                    <div>
                        <h3 className="text-[15px] font-semibold text-[#1d1d1f]">Crear cliente, deal y cotizacion</h3>
                        <p className="mt-0.5 text-[12px] text-[#8e8e93]">Confirma los datos extraidos de la junta. La cotizacion se enlazara al cliente y deal recien creados.</p>
                    </div>
                    <button onClick={onClose} className="text-[#8e8e93] hover:text-[#1d1d1f]" aria-label="Cerrar">X</button>
                </div>

                <div className="space-y-4 p-5 text-[13px] text-[#1d1d1f] max-h-[70vh] overflow-y-auto">
                    <section>
                        <p className="mb-2 text-[11px] font-semibold uppercase text-[#8e8e93]">Cliente</p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <label className="space-y-1">
                                <span className="text-[11px] text-[#8e8e93]">Nombre / empresa *</span>
                                <input value={clientName} onChange={e => setClientName(e.target.value)} className="w-full rounded-lg border border-black/10 px-2 py-1.5 focus:border-[#5856d6] focus:outline-none" placeholder="Restaurante La Casa" />
                            </label>
                            <label className="space-y-1">
                                <span className="text-[11px] text-[#8e8e93]">Industria</span>
                                <input value={industry} onChange={e => setIndustry(e.target.value)} className="w-full rounded-lg border border-black/10 px-2 py-1.5 focus:border-[#5856d6] focus:outline-none" placeholder="Restaurantes" />
                            </label>
                            <label className="space-y-1">
                                <span className="text-[11px] text-[#8e8e93]">Contacto</span>
                                <input value={contactName} onChange={e => setContactName(e.target.value)} className="w-full rounded-lg border border-black/10 px-2 py-1.5 focus:border-[#5856d6] focus:outline-none" placeholder="Nombre del cliente" />
                            </label>
                            <label className="space-y-1">
                                <span className="text-[11px] text-[#8e8e93]">Email</span>
                                <input value={contactEmail} onChange={e => setContactEmail(e.target.value)} type="email" className="w-full rounded-lg border border-black/10 px-2 py-1.5 focus:border-[#5856d6] focus:outline-none" placeholder="cliente@empresa.mx" />
                            </label>
                            <label className="space-y-1">
                                <span className="text-[11px] text-[#8e8e93]">Telefono</span>
                                <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="w-full rounded-lg border border-black/10 px-2 py-1.5 focus:border-[#5856d6] focus:outline-none" placeholder="+52 ..." />
                            </label>
                        </div>
                    </section>

                    <section>
                        <p className="mb-2 text-[11px] font-semibold uppercase text-[#8e8e93]">Oportunidad (Deal)</p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <label className="space-y-1 sm:col-span-2">
                                <span className="text-[11px] text-[#8e8e93]">Titulo del deal *</span>
                                <input value={dealTitle} onChange={e => setDealTitle(e.target.value)} className="w-full rounded-lg border border-black/10 px-2 py-1.5 focus:border-[#5856d6] focus:outline-none" />
                            </label>
                            <label className="space-y-1">
                                <span className="text-[11px] text-[#8e8e93]">Tipo</span>
                                <select value={dealType} onChange={e => setDealType(e.target.value)} className="w-full rounded-lg border border-black/10 px-2 py-1.5 focus:border-[#5856d6] focus:outline-none">
                                    <option value="platform">Platform</option>
                                    <option value="integration">Integration</option>
                                    <option value="consulting">Consulting</option>
                                    <option value="maintenance">Maintenance</option>
                                </select>
                            </label>
                            <div className="space-y-1">
                                <span className="text-[11px] text-[#8e8e93]">Valor estimado (MXN)</span>
                                <p className="rounded-lg bg-black/[0.04] px-2 py-1.5 font-mono">
                                    {totalGuess ? new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(totalGuess) : "-"}
                                </p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <label className="flex items-center gap-2 text-[12px]">
                            <input type="checkbox" checked={createProject} onChange={e => setCreateProject(e.target.checked)} />
                            <span>Tambien crear proyecto en M04 PM</span>
                        </label>
                        {createProject && (
                            <input value={projectName} onChange={e => setProjectName(e.target.value)} className="mt-2 w-full rounded-lg border border-black/10 px-2 py-1.5 focus:border-[#5856d6] focus:outline-none" placeholder="Nombre del proyecto" />
                        )}
                    </section>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-black/5 p-4">
                    <button onClick={onClose} disabled={submitting} className="rounded-lg px-3 py-1.5 text-[12px] text-[#8e8e93] hover:text-[#1d1d1f] disabled:opacity-50">Cancelar</button>
                    <button onClick={submit} disabled={submitting || !clientName.trim()} className="rounded-lg bg-[#34c759] px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-[#28a745] disabled:opacity-50">
                        {submitting ? "Creando..." : "Crear todo y generar cotizacion"}
                    </button>
                </div>
            </div>
        </div>
    );
}
