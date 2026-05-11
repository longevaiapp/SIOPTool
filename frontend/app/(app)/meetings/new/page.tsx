"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";

import { ModuleHeader } from "@/components/shared";
import AudioRecorder from "@/components/shared/AudioRecorder";
import {
    MEETING_TYPE_CONFIG,
    MEETING_ROLE_GROUPS,
    type MeetingType,
} from "@/lib/types/meeting";
import { meetingsApi, meetingTranscriptionApi } from "@/lib/api";
import { useT } from "@/lib/i18n";

/* ══════════════════════════════════════════════════════════════════════════
   📝 NEW MEETING — Audio-first flow
   1. Pick meeting type
   2. We immediately create the meeting in DB → real meetingId
   3. AudioRecorder uploads real audio to backend (AssemblyAI)
   4. We poll transcription state. When completed, the backend has already
      auto-filled participants / notes / duration / meeting_type via the
      meeting_metadata analyzer.
   5. Show the auto-filled fields and offer "Open meeting" to continue.
   ══════════════════════════════════════════════════════════════════════════ */

type TranscriptionState = {
    transcription_status: "idle" | "queued" | "processing" | "completed" | "error";
    transcription_error?: string | null;
    transcript?: string | null;
    audio_duration_seconds?: number | null;
    language_detected?: string | null;
};

export default function NewMeetingPage() {
    const t = useT();
    const router = useRouter();
    const [selectedType, setSelectedType] = useState<MeetingType | null>(null);
    const [title, setTitle] = useState("");
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [meetingId, setMeetingId] = useState<string | null>(null);

    const handlePickType = (key: MeetingType) => {
        setSelectedType(key);
        const cfg = MEETING_TYPE_CONFIG[key];
        setTitle(`${cfg.label} — ${new Date().toLocaleDateString()}`);
    };

    const handleCreate = async () => {
        if (!selectedType || !title.trim()) return;
        setCreating(true);
        setCreateError(null);
        try {
            const m = await meetingsApi.create({
                title: title.trim(),
                meeting_type: selectedType,
                status: "SCHEDULED",
            } as Record<string, unknown>);
            setMeetingId((m as { id: string }).id);
        } catch (e) {
            setCreateError((e as Error).message);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="p-6">
            <ModuleHeader
                title={t("mt_new.title")}
                subtitle={t("mt_new.subtitle")}
                color="#5856d6"
            />

            <Link
                href="/meetings"
                className="mb-6 inline-flex items-center gap-2 text-[13px] text-[#007aff] hover:underline"
            >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                {t("mt_new.back")}
            </Link>

            {/* Step 1: pick type */}
            {!selectedType && (
                <div className="glass-card p-6">
                    <h2 className="mb-1 text-[16px] font-semibold text-[#1d1d1f]">
                        {t("mt_new.step1_title")}
                    </h2>
                    <p className="mb-5 text-[12px] text-[#8e8e93]">
                        {t("mt_new.step1_hint")}
                    </p>
                    <div className="space-y-6">
                        {MEETING_ROLE_GROUPS.map((group) => (
                            <div key={group.role}>
                                <div className="mb-2 flex items-baseline gap-2 border-b border-black/[0.06] pb-1">
                                    <h3 className="text-[12px] font-semibold uppercase tracking-[0.5px] text-[#1d1d1f]">
                                        {group.role}
                                    </h3>
                                    <span className="text-[11px] text-[#8e8e93]">{group.description}</span>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {group.types.map((key) => {
                                        const config = MEETING_TYPE_CONFIG[key];
                                        return (
                                            <button
                                                key={key}
                                                onClick={() => handlePickType(key)}
                                                className="group flex items-start gap-3 rounded-xl border border-black/[0.06] bg-black/[0.02] p-4 text-left transition-all hover:border-black/[0.12] hover:bg-black/[0.04] hover:shadow-md"
                                            >
                                                <span
                                                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-xl"
                                                    style={{ backgroundColor: `${config.color}15` }}
                                                >
                                                    {config.icon}
                                                </span>
                                                <div>
                                                    <p className="text-[13px] font-semibold text-[#1d1d1f] group-hover:text-[#007aff]">
                                                        {config.label}
                                                    </p>
                                                    <p className="mt-0.5 text-[11px] text-[#8e8e93]">
                                                        {config.description}
                                                    </p>
                                                    <div className="mt-2 flex flex-wrap gap-1">
                                                        {config.feeds.map((feed) => (
                                                            <span
                                                                key={feed}
                                                                className="rounded bg-black/[0.04] px-1.5 py-0.5 text-[9px] font-medium text-[#8e8e93]"
                                                            >
                                                                → {feed}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 2: title + create */}
            {selectedType && !meetingId && (
                <div className="glass-card p-6">
                    <div className="mb-4 flex items-center gap-3">
                        <span
                            className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
                            style={{ backgroundColor: `${MEETING_TYPE_CONFIG[selectedType].color}15` }}
                        >
                            {MEETING_TYPE_CONFIG[selectedType].icon}
                        </span>
                        <div className="flex-1">
                            <h2 className="text-[16px] font-semibold text-[#1d1d1f]">
                                {MEETING_TYPE_CONFIG[selectedType].label}
                            </h2>
                            <p className="text-[12px] text-[#8e8e93]">
                                {MEETING_TYPE_CONFIG[selectedType].description}
                            </p>
                        </div>
                        <button
                            onClick={() => setSelectedType(null)}
                            className="text-[12px] text-[#007aff] hover:underline"
                        >
                            {t("mt_new.change_type")}
                        </button>
                    </div>

                    <label className="mb-2 block text-[13px] font-medium text-[#1d1d1f]">
                        {t("mt_new.meeting_title")}
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="mb-4 w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-3 text-[14px] text-[#1d1d1f] focus:border-[#007aff] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007aff]/20"
                    />

                    {createError && (
                        <div className="mb-3 rounded-lg border border-[#ff453a]/30 bg-[#ff453a]/8 p-3 text-[12px] text-[#ff453a]">
                            ⚠ {createError}
                        </div>
                    )}

                    <button
                        onClick={handleCreate}
                        disabled={creating || !title.trim()}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#007aff] to-[#5856d6] px-6 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-[#007aff]/25 transition-all hover:shadow-xl disabled:opacity-50"
                    >
                        {creating ? (
                            <>
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                {t("mt_new.creating")}
                            </>
                        ) : (
                            <>
                                {t("mt_new.continue")}
                                <span>✦</span>
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Step 3: record + transcribe + show auto-fill */}
            {selectedType && meetingId && (
                <CapturePanel
                    meetingId={meetingId}
                    moduleColor={MEETING_TYPE_CONFIG[selectedType].color}
                    onContinue={() => router.push(`/meetings/${meetingId}`)}
                />
            )}
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════════════ */

function CapturePanel({
    meetingId,
    moduleColor,
    onContinue,
}: {
    meetingId: string;
    moduleColor: string;
    onContinue: () => void;
}) {
    const [uploaded, setUploaded] = useState(false);

    // Poll transcription state every 3s while not finished
    const { data: trState } = useSWR<TranscriptionState>(
        uploaded ? `/meetings/${meetingId}/transcription` : null,
        () => meetingTranscriptionApi.get(meetingId) as Promise<TranscriptionState>,
        { refreshInterval: (d) => (d?.transcription_status === "completed" || d?.transcription_status === "error" ? 0 : 3000) },
    );

    // Once transcription is done, fetch the (auto-filled) meeting row
    const completed = trState?.transcription_status === "completed";
    const { data: meeting } = useSWR<Record<string, unknown>>(
        completed ? `/meetings/${meetingId}` : null,
        () => meetingsApi.get(meetingId) as Promise<Record<string, unknown>>,
        { refreshInterval: 0 },
    );

    return (
        <div className="space-y-4">
            <AudioRecorder
                meetingId={meetingId}
                moduleColor={moduleColor}
                onUploaded={() => setUploaded(true)}
            />

            {uploaded && trState && (
                <div className="glass-card p-5">
                    <h3 className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-[#1d1d1f]">
                        <span>🤖</span> AssemblyAI + Auto-fill pipeline
                    </h3>
                    <PipelineStep
                        label="Audio uploaded"
                        state="done"
                    />
                    <PipelineStep
                        label="Transcribing with AssemblyAI"
                        state={
                            trState.transcription_status === "completed" ? "done"
                            : trState.transcription_status === "error" ? "error"
                            : "running"
                        }
                        detail={trState.language_detected ? `Language: ${trState.language_detected}` : undefined}
                    />
                    <PipelineStep
                        label="Auto-filling participants, summary, duration, meeting type"
                        state={completed && meeting ? "done" : completed ? "running" : "pending"}
                    />
                    <PipelineStep
                        label="Running specialized analyzer (extracts module recommendations)"
                        state={completed && meeting ? "done" : "pending"}
                    />
                    {trState.transcription_status === "error" && (
                        <p className="mt-2 rounded-lg border border-[#ff453a]/30 bg-[#ff453a]/8 p-2 text-[12px] text-[#ff453a]">
                            ⚠ {trState.transcription_error || "Transcription failed"}
                        </p>
                    )}
                </div>
            )}

            {completed && meeting && (
                <div className="glass-card p-5">
                    <h3 className="mb-4 text-[14px] font-semibold text-[#1d1d1f]">
                        ✨ Auto-filled by AI
                    </h3>
                    <AutoFilledFields meeting={meeting} transcript={trState?.transcript ?? undefined} />
                    <button
                        onClick={onContinue}
                        className="mt-4 flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#007aff] to-[#5856d6] px-6 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-[#007aff]/25 transition-all hover:shadow-xl"
                    >
                        Open meeting → review recommendations
                        <span>→</span>
                    </button>
                </div>
            )}
        </div>
    );
}

function PipelineStep({
    label, state, detail,
}: {
    label: string;
    state: "pending" | "running" | "done" | "error";
    detail?: string;
}) {
    const dot =
        state === "done" ? "bg-[#30d158]"
        : state === "error" ? "bg-[#ff453a]"
        : state === "running" ? "bg-[#0a84ff] animate-pulse"
        : "bg-[#c7c7cc]";
    const txt =
        state === "done" ? "text-[#1d1d1f]"
        : state === "error" ? "text-[#ff453a]"
        : state === "running" ? "text-[#0a84ff]"
        : "text-[#8e8e93]";
    const icon =
        state === "done" ? "✓"
        : state === "error" ? "✕"
        : state === "running" ? "…"
        : "○";
    return (
        <div className="flex items-center gap-3 py-1.5">
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white ${dot}`}>{icon}</span>
            <span className={`flex-1 text-[13px] ${txt}`}>{label}</span>
            {detail && <span className="text-[11px] text-[#8e8e93]">{detail}</span>}
        </div>
    );
}

function AutoFilledFields({
    meeting,
    transcript,
}: {
    meeting: Record<string, unknown>;
    transcript?: string;
}) {
    let participants: Array<{ name?: string; role?: string; title?: string; speaker_label?: string }> = [];
    const raw = meeting.participants;
    if (Array.isArray(raw)) participants = raw as typeof participants;
    else if (typeof raw === "string") {
        try { participants = JSON.parse(raw); } catch { /* noop */ }
    }
    const notes = (meeting.notes as string | undefined) ?? "";
    const duration = meeting.duration_minutes as number | undefined;
    const meetingType = meeting.meeting_type as string | undefined;

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Meeting type (refined)" value={meetingType ? MEETING_TYPE_CONFIG[meetingType as MeetingType]?.label ?? meetingType : "—"} />
            <Field label="Duration" value={duration ? `${duration} min` : "—"} />
            <Field
                label={`Participants (${participants.length})`}
                value={
                    participants.length === 0 ? "—" : (
                        <div className="flex flex-wrap gap-1.5">
                            {participants.map((p, i) => (
                                <span
                                    key={i}
                                    className={`rounded-full border px-2 py-0.5 text-[11px] ${p.role === "internal" ? "border-[#0a84ff]/30 bg-[#0a84ff]/10 text-[#0a84ff]" : "border-[#ff9f0a]/30 bg-[#ff9f0a]/10 text-[#c93400]"}`}
                                >
                                    {p.name || p.speaker_label || "Speaker"}
                                    {p.title ? ` · ${p.title}` : ""}
                                </span>
                            ))}
                        </div>
                    )
                }
                fullWidth
            />
            <Field label="AI summary" value={notes || "—"} fullWidth />
            {transcript && (
                <Field
                    label="Transcript preview"
                    value={
                        <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-black/[0.04] p-2 text-[11px] leading-relaxed">
                            {transcript.slice(0, 800)}{transcript.length > 800 ? "…" : ""}
                        </pre>
                    }
                    fullWidth
                />
            )}
        </div>
    );
}

function Field({
    label, value, fullWidth,
}: {
    label: string;
    value: React.ReactNode;
    fullWidth?: boolean;
}) {
    return (
        <div className={fullWidth ? "sm:col-span-2" : ""}>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8e8e93]">{label}</p>
            <div className="text-[13px] text-[#1d1d1f]">{value}</div>
        </div>
    );
}
