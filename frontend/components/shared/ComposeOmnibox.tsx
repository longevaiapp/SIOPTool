"use client";

/**
 * 🪄 ComposeOmnibox — global "say anything" entry point
 *
 * Floating FAB → modal with 3 input modes:
 *   1. 🎙️  Record (MediaRecorder → upload to /upload-audio → transcribe)
 *   2. 📁  Upload audio file (same path, skips recording)
 *   3. ⌨️   Paste / type free text (treated as a manual transcript)
 *
 * After we have a transcript snippet (or a text body), we POST to
 * /api/compose/classify which returns a meeting_type + entity hints.
 * The user reviews, edits, and clicks "Create meeting" — we then create
 * a meeting row and (when audio is available) enqueue transcription.
 *
 * Voice and manual paths share the SAME final create payload, so the
 * downstream analyzer pipeline doesn't care how data got in.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import useSWR from "swr";
import { api, ApiError, API_BASE_URL } from "@/lib/api/client";
import { clientsApi, dealsApi, projectsApi } from "@/lib/api";
import type { ApiClient, ApiDeal, ApiProject } from "@/lib/types/api";
import { MEETING_TYPE_CONFIG, type MeetingType } from "@/lib/types/meeting";
import { useToast } from "./ToastProvider";
import { useT } from "@/lib/i18n";

function useFlash() {
    const { toast } = useToast();
    return {
        error: (msg: string) => toast({ title: msg, variant: "error" }),
        success: (msg: string) => toast({ title: msg, variant: "success" }),
    };
}

type Mode = "idle" | "record" | "upload" | "text";
type Phase = "compose" | "classifying" | "review" | "creating";

interface ClassifyResult {
    suggestion: {
        meeting_type: string;
        confidence: "low" | "medium" | "high";
        rationale: string;
        title_suggestion: string | null;
        client_hint: string | null;
        deal_hint: string | null;
        project_hint: string | null;
    };
    matched_client_id: string | null;
    matched_client_name: string | null;
    matched_deal_id: string | null;
    matched_deal_title: string | null;
    matched_project_id: string | null;
    matched_project_name: string | null;
    available_types: string[];
}

interface CreatedMeeting { id: string }

function fmtSec(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const ss = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${ss}`;
}

const CONFIDENCE_CLS: Record<string, string> = {
    high:   "bg-[#30d158]/15 text-[#30d158]",
    medium: "bg-[#ff9f0a]/15 text-[#ff9f0a]",
    low:    "bg-[#ff453a]/15 text-[#ff453a]",
};

export function ComposeOmnibox() {
    const router = useRouter();
    const pathname = usePathname();
    const toast = useFlash();
    const t = useT();
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<Mode>("idle");
    const [phase, setPhase] = useState<Phase>("compose");

    // Lazy-load lists only when the modal is open (don't pay the cost on every page).
    const { data: clients } = useSWR<ApiClient[]>(
        open ? "/clients" : null,
        () => clientsApi.list(),
    );
    const { data: deals } = useSWR<ApiDeal[]>(
        open ? "/deals" : null,
        () => dealsApi.list(),
    );
    const { data: projects } = useSWR<ApiProject[]>(
        open ? "/projects" : null,
        () => projectsApi.list(),
    );

    // text/paste mode
    const [textBody, setTextBody] = useState("");

    // record mode
    const [recSeconds, setRecSeconds] = useState(0);
    const [recBlob, setRecBlob] = useState<Blob | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);

    // upload mode
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // classification result
    const [classifyResult, setClassifyResult] = useState<ClassifyResult | null>(null);
    const [editType, setEditType] = useState<MeetingType>("status_update" as MeetingType);
    const [editTitle, setEditTitle] = useState("");
    const [editClientId, setEditClientId] = useState("");
    const [editDealId, setEditDealId] = useState("");
    const [editProjectId, setEditProjectId] = useState("");

    // close + reset
    const reset = () => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
        mediaRecorderRef.current = null;
        chunksRef.current = [];
        setMode("idle");
        setPhase("compose");
        setTextBody("");
        setRecSeconds(0);
        setRecBlob(null);
        setUploadFile(null);
        setClassifyResult(null);
        setEditType("status_update" as MeetingType);
        setEditTitle("");
        setEditClientId("");
        setEditDealId("");
        setEditProjectId("");
    };
    const close = () => { reset(); setOpen(false); };

    // ── Cmd/Ctrl + . shortcut ─────────────────────────────────
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === ".") {
                e.preventDefault();
                setOpen(o => !o);
            }
            if (e.key === "Escape" && open) close();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // ── Context-aware prefill ─────────────────────────────────
    // If the user opens the omnibox while standing on a CRM deal page or a
    // PM project page, pre-link those records so they don't have to re-pick.
    useEffect(() => {
        if (!open || !pathname) return;
        const dealMatch = pathname.match(/^\/crm\/([\w-]{6,})/);
        const projMatch = pathname.match(/^\/(?:pm-tab|projects)\/([\w-]{6,})/);
        if (dealMatch && deals) {
            const d = deals.find(x => x.id === dealMatch[1]);
            if (d) {
                setEditDealId(d.id);
                const client = clients?.find(c => c.name === d.client_name);
                if (client) setEditClientId(client.id);
            }
        }
        if (projMatch && projects) {
            const p = projects.find(x => x.id === projMatch[1]);
            if (p) {
                setEditProjectId(p.id);
                if (p.client_id) setEditClientId(p.client_id);
                else if (p.client_name && clients) {
                    const c = clients.find(c => c.name === p.client_name);
                    if (c) setEditClientId(c.id);
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, pathname, deals, projects, clients]);

    // ── Recording controls ────────────────────────────────────
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const mr = new MediaRecorder(stream);
            mediaRecorderRef.current = mr;
            chunksRef.current = [];
            mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            mr.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
                setRecBlob(blob);
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(t => t.stop());
                    streamRef.current = null;
                }
            };
            mr.start();
            setRecSeconds(0);
            timerRef.current = window.setInterval(() => setRecSeconds(s => s + 1), 1000);
            setMode("record");
        } catch (err) {
            toast.error(t("omnibox.error_mic"));
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };

    // ── Classify text snippet (only used in text mode for preview) ──
    const classifyText = async (snippet: string) => {
        setPhase("classifying");
        try {
            const result = await api.post<ClassifyResult>("/compose/classify", { snippet });
            setClassifyResult(result);
            const t = (result.suggestion.meeting_type || "status_update") as MeetingType;
            setEditType(t);
            setEditTitle(result.suggestion.title_suggestion ?? "");
            setEditClientId(result.matched_client_id ?? "");
            setEditDealId(result.matched_deal_id ?? "");
            setEditProjectId(result.matched_project_id ?? "");
            setPhase("review");
        } catch (err) {
            const msg = err instanceof ApiError ? `${t("omnibox.error_classifier")} (${err.status})` : t("omnibox.error_classifier");
            toast.error(msg);
            setPhase("compose");
        }
    };

    // ── Submit handlers per mode ──────────────────────────────
    const submitTextMode = async () => {
        const snippet = textBody.trim();
        if (snippet.length < 10) {
            toast.error(t("omnibox.error_min_chars"));
            return;
        }
        await classifyText(snippet);
    };

    // ── Inline create-client (when classifier hinted but DB miss) ─────
    const [creatingClient, setCreatingClient] = useState(false);
    const createClientFromHint = async () => {
        const hint = classifyResult?.suggestion.client_hint?.trim();
        if (!hint || creatingClient) return;
        setCreatingClient(true);
        try {
            const created = await clientsApi.create({
                name: hint,
                status: "active",
                notes: "Auto-creado desde Compose",
            });
            setEditClientId(created.id);
            // Patch the classifyResult so the UI reflects the new link.
            setClassifyResult(prev => prev ? {
                ...prev,
                matched_client_id: created.id,
                matched_client_name: created.name,
            } : prev);
            toast.success(t("omnibox.client_created", { name: created.name }));
        } catch (err) {
            const msg = err instanceof ApiError ? `${t("omnibox.error_create_client")} (${err.status})` : t("omnibox.error_create_client");
            toast.error(msg);
        } finally {
            setCreatingClient(false);
        }
    };

    const submitAudioMode = async () => {
        // For audio modes we DON'T classify yet — we just need a few quick
        // fields from the user (we'll classify after the transcript exists).
        setPhase("review");
    };

    // ── Final: create the meeting row, then route to it ──────
    const createMeeting = async () => {
        setPhase("creating");
        try {
            // 1. Create meeting
            const created = await api.post<CreatedMeeting>("/meetings", {
                title: editTitle || "Compose: untitled",
                meeting_type: editType,
                client_id: editClientId || null,
                deal_id: editDealId || null,
                project_id: editProjectId || null,
                participants: [],
                ...(mode === "text" ? { transcript: textBody, transcription_status: "completed" } : {}),
            });
            const meetingId = created.id;

            // 2. Upload audio if present
            const audioBlob = recBlob ?? uploadFile ?? null;
            if (audioBlob) {
                const fd = new FormData();
                const fname = uploadFile?.name ?? `recording-${Date.now()}.webm`;
                fd.append("file", audioBlob, fname);
                const res = await fetch(`${API_BASE_URL}/meetings/${meetingId}/upload-audio`, {
                    method: "POST",
                    body: fd,
                });
                if (!res.ok) {
                    const txt = await res.text();
                    throw new Error(`upload-audio → ${res.status} ${txt.slice(0, 120)}`);
                }
            }

            toast.success(mode === "text"
                ? t("omnibox.created_text")
                : t("omnibox.created_audio"));
            close();
            router.push(`/meetings/${meetingId}`);
        } catch (err) {
            const msg = err instanceof ApiError
                ? `${t("omnibox.error_create")} (${err.status})`
                : err instanceof Error ? err.message : t("omnibox.error_create");
            toast.error(msg);
            setPhase("review");
        }
    };

    // ─────────────────────────── Render ───────────────────────────
    // Filter deal/project options by selected client (so the picker doesn't
    // dump 200 unrelated rows on the user once we link a client).
    const selectedClientName = useMemo(
        () => clients?.find(c => c.id === editClientId)?.name ?? null,
        [clients, editClientId],
    );
    const dealOptions = useMemo(() => {
        const all = deals ?? [];
        return selectedClientName
            ? all.filter(d => d.client_name === selectedClientName)
            : all;
    }, [deals, selectedClientName]);
    const projectOptions = useMemo(() => {
        const all = projects ?? [];
        return selectedClientName
            ? all.filter(p =>
                p.client_name === selectedClientName ||
                (p.client_id && p.client_id === editClientId))
            : all;
    }, [projects, selectedClientName, editClientId]);

    return (
        <>
            {/* Floating Action Button */}
            <button
                onClick={() => setOpen(true)}
                aria-label={t("omnibox.fab_label")}
                title={t("omnibox.fab_tooltip")}
                className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#5856d6] to-[#bf5af2] text-white shadow-2xl shadow-[#5856d6]/40 transition-transform hover:scale-105 active:scale-95"
            >
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 4v16m8-8H4" strokeLinecap="round" />
                </svg>
            </button>

            {/* Modal */}
            {open && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm pt-16 sm:pt-24">
                    <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl mx-4 max-h-[80vh] overflow-y-auto">
                        {/* header */}
                        <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4">
                            <div>
                                <p className="text-[15px] font-semibold text-[#1d1d1f]">{t("omnibox.title")}</p>
                                <p className="text-[12px] text-[#8e8e93]">
                                    {t("omnibox.subtitle")}
                                </p>
                            </div>
                            <button onClick={close} className="rounded-lg p-2 text-[#8e8e93] hover:bg-black/[0.05]">
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                                </svg>
                            </button>
                        </div>

                        <div className="px-5 py-5">
                            {/* ───── Phase: compose ───── */}
                            {phase === "compose" && (
                                <>
                                    {/* Mode switcher */}
                                    {mode === "idle" && (
                                        <div className="grid grid-cols-3 gap-3">
                                            <button onClick={startRecording} className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-[#5856d6]/30 bg-[#5856d6]/5 p-5 text-[#5856d6] hover:bg-[#5856d6]/10 transition">
                                                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                                                    <rect x="9" y="2" width="6" height="13" rx="3" />
                                                    <path d="M5 11a7 7 0 0014 0M12 18v4" strokeLinecap="round" />
                                                </svg>
                                                <span className="text-[12px] font-semibold">{t("omnibox.mode_record")}</span>
                                            </button>
                                            <button onClick={() => { setMode("upload"); fileInputRef.current?.click(); }} className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-[#30d158]/30 bg-[#30d158]/5 p-5 text-[#30d158] hover:bg-[#30d158]/10 transition">
                                                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                                                    <path d="M3 16v3a2 2 0 002 2h14a2 2 0 002-2v-3M12 3v13m-5-5l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                                <span className="text-[12px] font-semibold">{t("omnibox.mode_upload")}</span>
                                            </button>
                                            <button onClick={() => setMode("text")} className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-[#0a84ff]/30 bg-[#0a84ff]/5 p-5 text-[#0a84ff] hover:bg-[#0a84ff]/10 transition">
                                                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                                                    <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />
                                                </svg>
                                                <span className="text-[12px] font-semibold">{t("omnibox.mode_text")}</span>
                                            </button>
                                        </div>
                                    )}

                                    {/* Recording UI */}
                                    {mode === "record" && (
                                        <div className="flex flex-col items-center gap-4 py-6">
                                            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[#ff453a]">
                                                <span className="absolute inset-0 animate-ping rounded-full bg-[#ff453a] opacity-50" />
                                                <svg className="relative h-10 w-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                                                    <rect x="9" y="3" width="6" height="13" rx="3" />
                                                    <path d="M5 11a7 7 0 0014 0M12 18v4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                                                </svg>
                                            </div>
                                            <p className="font-mono text-3xl font-bold text-[#1d1d1f]">{fmtSec(recSeconds)}</p>
                                            <p className="text-[12px] text-[#8e8e93]">{t("omnibox.recording")}</p>
                                            <button onClick={stopRecording} className="mt-2 rounded-full bg-[#1d1d1f] px-6 py-2 text-[13px] font-semibold text-white hover:bg-black">
                                                {t("omnibox.stop")}
                                            </button>
                                        </div>
                                    )}
                                    {mode === "record" && recBlob && (
                                        <div className="mt-4 flex items-center justify-between rounded-xl bg-[#30d158]/10 p-4">
                                            <div>
                                                <p className="text-[13px] font-semibold text-[#1d1d1f]">✓ {t("omnibox.recording_done")} ({fmtSec(recSeconds)})</p>
                                                <p className="text-[11px] text-[#8e8e93]">{t("omnibox.recording_done_hint")}</p>
                                            </div>
                                            <button onClick={submitAudioMode} className="rounded-lg bg-[#30d158] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#28b948]">
                                                {t("omnibox.continue")}
                                            </button>
                                        </div>
                                    )}

                                    {/* Upload UI */}
                                    {mode === "upload" && (
                                        <div className="py-4">
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="audio/*,video/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const f = e.target.files?.[0] ?? null;
                                                    setUploadFile(f);
                                                }}
                                            />
                                            {uploadFile ? (
                                                <div className="flex items-center justify-between rounded-xl bg-[#30d158]/10 p-4">
                                                    <div>
                                                        <p className="text-[13px] font-semibold text-[#1d1d1f]">📁 {uploadFile.name}</p>
                                                        <p className="text-[11px] text-[#8e8e93]">{(uploadFile.size / 1024 / 1024).toFixed(1)} MB</p>
                                                    </div>
                                                    <button onClick={submitAudioMode} className="rounded-lg bg-[#30d158] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#28b948]">
                                                        {t("omnibox.continue")}
                                                    </button>
                                                </div>
                                            ) : (
                                                <button onClick={() => fileInputRef.current?.click()} className="w-full rounded-xl border-2 border-dashed border-[#30d158]/40 p-8 text-center text-[#30d158] hover:bg-[#30d158]/5">
                                                    {t("omnibox.choose_file")}
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Text mode */}
                                    {mode === "text" && (
                                        <div className="space-y-3">
                                            <textarea
                                                autoFocus
                                                value={textBody}
                                                onChange={(e) => setTextBody(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && textBody.trim().length >= 10) {
                                                        e.preventDefault();
                                                        void submitTextMode();
                                                    }
                                                }}
                                                rows={8}
                                                placeholder={t("omnibox.text_placeholder")}
                                                className="w-full rounded-xl border border-black/[0.08] bg-white p-3 text-[13px] text-[#1d1d1f] outline-none focus:border-[#0a84ff]"
                                            />
                                            <div className="flex items-center justify-between text-[11px] text-[#8e8e93]">
                                                <span>{t("omnibox.text_chars", { n: textBody.length })} · <kbd className="rounded border border-black/10 bg-black/[0.03] px-1.5 py-0.5 text-[10px]">{t("omnibox.text_shortcut")}</kbd></span>
                                                <button
                                                    onClick={submitTextMode}
                                                    disabled={textBody.trim().length < 10}
                                                    className="rounded-lg bg-[#0a84ff] px-4 py-2 text-[12px] font-semibold text-white disabled:bg-[#0a84ff]/30"
                                                >
                                                    {t("omnibox.classify")}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {mode !== "idle" && (
                                        <button onClick={() => { setMode("idle"); setUploadFile(null); setRecBlob(null); }} className="mt-4 text-[11px] text-[#8e8e93] hover:text-[#1d1d1f]">
                                            {t("omnibox.change_mode")}
                                        </button>
                                    )}
                                </>
                            )}

                            {/* ───── Phase: classifying ───── */}
                            {phase === "classifying" && (
                                <div className="flex flex-col items-center justify-center gap-3 py-12">
                                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0a84ff]/20 border-t-[#0a84ff]" />
                                    <p className="text-[13px] text-[#1d1d1f]">{t("omnibox.classifying")}</p>
                                </div>
                            )}

                            {/* ───── Phase: review ───── */}
                            {phase === "review" && (
                                <div className="space-y-4">
                                    {classifyResult && (
                                        <div className="rounded-xl bg-black/[0.02] p-4">
                                            <div className="mb-2 flex items-center gap-2">
                                                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8e8e93]">{t("omnibox.ai_suggestion")}</span>
                                                <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${CONFIDENCE_CLS[classifyResult.suggestion.confidence] ?? ""}`}>
                                                    {t(`omnibox.confidence_${classifyResult.suggestion.confidence}`)}
                                                </span>
                                            </div>
                                            <p className="text-[12px] text-[#3c3c43]">{classifyResult.suggestion.rationale}</p>
                                        </div>
                                    )}

                                    {/* Type picker */}
                                    <div>
                                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#8e8e93]">{t("omnibox.field_meeting_type")}</label>
                                        <select
                                            value={editType}
                                            onChange={(e) => setEditType(e.target.value as MeetingType)}
                                            className="w-full rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-[13px] text-[#1d1d1f] outline-none focus:border-[#0a84ff]"
                                        >
                                            {Object.entries(MEETING_TYPE_CONFIG).map(([k, v]) => (
                                                <option key={k} value={k}>{v.icon} {v.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Title */}
                                    <div>
                                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#8e8e93]">{t("omnibox.field_title")}</label>
                                        <input
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            placeholder={t("omnibox.field_title_placeholder")}
                                            className="w-full rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-[13px] text-[#1d1d1f] outline-none focus:border-[#0a84ff]"
                                        />
                                    </div>

                                    {/* Linked entities — searchable pickers */}
                                    <div className="space-y-3 rounded-xl bg-[#0a84ff]/5 p-3">
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#0a84ff]">
                                            {t("omnibox.linkages")}
                                        </p>

                                        {/* CLIENT */}
                                        <div>
                                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#8e8e93]">
                                                {t("omnibox.field_client")}
                                            </label>
                                            <select
                                                value={editClientId}
                                                onChange={(e) => {
                                                    setEditClientId(e.target.value);
                                                    // Reset deal/project if user changes client
                                                    setEditDealId(""); setEditProjectId("");
                                                }}
                                                className="w-full rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-[12px] text-[#1d1d1f] outline-none focus:border-[#0a84ff]"
                                            >
                                                <option value="">{t("omnibox.field_client_none")}</option>
                                                {(clients ?? []).map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                            {classifyResult?.suggestion.client_hint && !editClientId && (
                                                <button
                                                    type="button"
                                                    onClick={createClientFromHint}
                                                    disabled={creatingClient}
                                                    className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-[#30d158]/10 px-2 py-1 text-[11px] font-semibold text-[#30d158] hover:bg-[#30d158]/20 disabled:opacity-40"
                                                >
                                                    {creatingClient
                                                        ? t("omnibox.creating_client")
                                                        : t("omnibox.create_client_btn", { name: classifyResult.suggestion.client_hint })}
                                                </button>
                                            )}
                                        </div>

                                        {/* DEAL */}
                                        <div>
                                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#8e8e93]">
                                                {t("omnibox.field_deal")}
                                            </label>
                                            <select
                                                value={editDealId}
                                                onChange={(e) => setEditDealId(e.target.value)}
                                                className="w-full rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-[12px] text-[#1d1d1f] outline-none focus:border-[#0a84ff]"
                                            >
                                                <option value="">{t("omnibox.field_deal_none")}</option>
                                                {dealOptions.map(d => (
                                                    <option key={d.id} value={d.id}>
                                                        {d.client_name}{d.deal_type ? ` — ${d.deal_type}` : ""} · {d.stage}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* PROJECT */}
                                        <div>
                                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#8e8e93]">
                                                {t("omnibox.field_project")}
                                            </label>
                                            <select
                                                value={editProjectId}
                                                onChange={(e) => setEditProjectId(e.target.value)}
                                                className="w-full rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-[12px] text-[#1d1d1f] outline-none focus:border-[#0a84ff]"
                                            >
                                                <option value="">{t("omnibox.field_project_none")}</option>
                                                {projectOptions.map(p => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.name}{p.client_name ? ` · ${p.client_name}` : ""}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end gap-2 border-t border-black/[0.06] pt-4">
                                        <button onClick={() => setPhase("compose")} className="rounded-lg px-4 py-2 text-[12px] font-semibold text-[#8e8e93] hover:bg-black/[0.04]">
                                            {t("common.back")}
                                        </button>
                                        <button onClick={createMeeting} className="rounded-lg bg-[#1d1d1f] px-5 py-2 text-[12px] font-semibold text-white hover:bg-black">
                                            {t("omnibox.create_meeting")}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ───── Phase: creating ───── */}
                            {phase === "creating" && (
                                <div className="flex flex-col items-center justify-center gap-3 py-12">
                                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1d1d1f]/20 border-t-[#1d1d1f]" />
                                    <p className="text-[13px] text-[#1d1d1f]">{t("omnibox.creating")}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
