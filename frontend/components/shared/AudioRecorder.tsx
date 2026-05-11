"use client";

import { useState, useRef, useEffect } from "react";
import { API_BASE_URL } from "@/lib/api/client";
import { useT } from "@/lib/i18n";

/* ══════════════════════════════════════════════════════════════════════════
   🎙️ AudioRecorder — MediaRecorder capture + AssemblyAI upload
   ══════════════════════════════════════════════════════════════════════════ */

type Status = "idle" | "permission" | "recording" | "paused" | "stopped" | "uploading" | "done" | "error";

export interface AudioRecorderProps {
    /** When provided, the component uploads the recording (or a file) to
     *  POST /api/meetings/{meetingId}/upload-audio. Without it, runs in demo mode. */
    meetingId?: string;
    /** Fires after a successful upload (parent can re-fetch transcription state). */
    onUploaded?: () => void;
    onTranscriptReady?: (transcript: string, audioUrl: string, durationSec: number) => void;
    moduleColor?: string;
    simulatedTranscript?: string;
}

const DEFAULT_TRANSCRIPT = `[00:00] Speaker 1: Thanks for joining today's session. Let's run through the agenda.
[00:08] Speaker 2: Sounds good. I have the latest sprint metrics to walk through.
[00:15] Speaker 1: Perfect. Before that — any blockers from last week?
[00:22] Speaker 2: One open item on the integration tests. Should be unblocked by Wednesday.
[00:30] Speaker 1: Great. Let's move to status updates.`;

function fmt(sec: number) {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
}

export default function AudioRecorder({ meetingId, onUploaded, onTranscriptReady, moduleColor = "#5856d6", simulatedTranscript }: AudioRecorderProps) {
    const t = useT();
    const [status, setStatus] = useState<Status>("idle");
    const [error, setError] = useState<string | null>(null);
    const [seconds, setSeconds] = useState(0);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [transcript, setTranscript] = useState<string>("");
    const [transcribeProgress, setTranscribeProgress] = useState(0);
    const [levels, setLevels] = useState<number[]>(new Array(32).fill(0));
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            cleanup();
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const cleanup = () => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
        if (audioCtxRef.current && audioCtxRef.current.state !== "closed") { audioCtxRef.current.close().catch(() => { }); audioCtxRef.current = null; }
        analyserRef.current = null;
    };

    const tickLevels = () => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        // Downsample to 32 bars
        const step = Math.floor(data.length / 32) || 1;
        const bars: number[] = [];
        for (let i = 0; i < 32; i++) {
            let sum = 0;
            for (let j = 0; j < step; j++) sum += data[i * step + j] ?? 0;
            bars.push(Math.min(100, (sum / step) / 2.55));
        }
        setLevels(bars);
        rafRef.current = requestAnimationFrame(tickLevels);
    };

    const start = async () => {
        setError(null);
        setStatus("permission");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Setup audio analyser for visualization
            const Ctx = window.AudioContext || (window as any).webkitAudioContext;
            audioCtxRef.current = new Ctx();
            const source = audioCtxRef.current.createMediaStreamSource(stream);
            const analyser = audioCtxRef.current.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;
            tickLevels();

            // Setup recorder
            const mr = new MediaRecorder(stream);
            mediaRecorderRef.current = mr;
            chunksRef.current = [];
            mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            mr.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
                setAudioBlob(blob);
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
                setStatus("stopped");
            };
            mr.start();
            setSeconds(0);
            timerRef.current = window.setInterval(() => setSeconds(s => s + 1), 1000);
            setStatus("recording");
        } catch (err: any) {
            console.error(err);
            setError(err?.message ?? "Microphone access denied");
            setStatus("error");
            cleanup();
        }
    };

    const pause = () => {
        if (mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.pause();
            if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
            if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
            setStatus("paused");
        }
    };

    const resume = () => {
        if (mediaRecorderRef.current?.state === "paused") {
            mediaRecorderRef.current.resume();
            timerRef.current = window.setInterval(() => setSeconds(s => s + 1), 1000);
            tickLevels();
            setStatus("recording");
        }
    };

    const stop = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
        cleanup();
    };

    const transcribe = () => {
        setStatus("transcribing" as Status);
        setTranscribeProgress(0);
        const final = simulatedTranscript ?? DEFAULT_TRANSCRIPT;
        // Simulated streaming transcription
        let i = 0;
        const tick = window.setInterval(() => {
            i += Math.max(2, Math.floor(final.length / 60));
            const slice = final.slice(0, Math.min(i, final.length));
            setTranscript(slice);
            setTranscribeProgress(Math.min(100, Math.round((i / final.length) * 100)));
            if (i >= final.length) {
                clearInterval(tick);
                setStatus("done");
                onTranscriptReady?.(final, audioUrl ?? "", seconds);
            }
        }, 150);
    };

    const uploadToBackend = async (blob: Blob, filename: string) => {
        if (!meetingId) {
            setError("No meeting context — cannot upload");
            setStatus("error");
            return;
        }
        setStatus("uploading");
        setUploadProgress(0);
        try {
            const fd = new FormData();
            fd.append("file", blob, filename);
            const res = await new Promise<Response>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open("POST", `${API_BASE_URL}/meetings/${meetingId}/upload-audio`);
                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        setUploadProgress(Math.round((e.loaded / e.total) * 100));
                    }
                };
                xhr.onload = () => {
                    resolve(new Response(xhr.responseText, { status: xhr.status }));
                };
                xhr.onerror = () => reject(new Error("Network error"));
                xhr.send(fd);
            });
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`Upload failed: ${res.status} ${txt}`);
            }
            setStatus("done");
            onUploaded?.();
        } catch (e) {
            setError((e as Error).message);
            setStatus("error");
        }
    };

    const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setAudioBlob(f);
        const url = URL.createObjectURL(f);
        setAudioUrl(url);
        setSeconds(0);
        setStatus("stopped");
        // Auto-upload picked files
        uploadToBackend(f, f.name);
        e.target.value = "";
    };

    const reset = () => {
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        setAudioBlob(null);
        setTranscript("");
        setTranscribeProgress(0);
        setUploadProgress(0);
        setSeconds(0);
        setLevels(new Array(32).fill(0));
        setStatus("idle");
        setError(null);
    };

    return (
        <div className="glass-card p-5">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h3 className="flex items-center gap-2 text-[14px] font-semibold text-[#1d1d1f]">
                        <span className="text-[16px]">🎙️</span> Audio Capture
                    </h3>
                    <p className="text-[11px] text-[#8e8e93]">{meetingId ? t("audio.eyebrow") : t("audio.eyebrow_demo")}</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`inline-block h-2 w-2 rounded-full ${status === "recording" ? "animate-pulse" : ""}`} style={{ background: status === "recording" ? "#ff453a" : status === "paused" ? "#ff9f0a" : status === "done" ? "#30d158" : "#c7c7cc" }} />
                    <span className="font-mono text-[18px] font-semibold text-[#1d1d1f]">{fmt(seconds)}</span>
                </div>
            </div>

            {/* Visualizer */}
            <div className="mb-4 flex h-16 items-end gap-[2px] rounded-xl bg-black/[0.03] px-3 py-2">
                {levels.map((v, i) => (
                    <div
                        key={i}
                        className="flex-1 rounded-full transition-[height] duration-75"
                        style={{
                            height: `${Math.max(4, v)}%`,
                            background: status === "recording" ? `linear-gradient(180deg, ${moduleColor}, ${moduleColor}80)` : "#d2d2d7",
                        }}
                    />
                ))}
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2">
                {status === "idle" && (
                    <>
                        <button onClick={start} className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white" style={{ background: moduleColor }}>
                            ● Start Recording
                        </button>
                        {meetingId && (
                            <>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="audio/*,video/*,.mp3,.wav,.m4a,.webm,.ogg,.mp4,.mov"
                                    className="hidden"
                                    onChange={handleFilePicked}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="rounded-lg border border-black/[0.08] bg-white px-4 py-2 text-[13px] font-medium text-[#1d1d1f] hover:bg-black/[0.04]"
                                >
                                    📁 Upload Audio File
                                </button>
                            </>
                        )}
                    </>
                )}
                {status === "permission" && (
                    <span className="text-[12px] text-[#8e8e93]">{t("audio.requesting")}</span>
                )}
                {status === "recording" && (
                    <>
                        <button onClick={pause} className="rounded-lg border border-black/[0.08] px-4 py-2 text-[13px] font-medium text-[#1d1d1f] hover:bg-black/[0.04]">
                            ⏸ Pause
                        </button>
                        <button onClick={stop} className="rounded-lg bg-[#ff453a] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#d70015]">
                            ■ Stop
                        </button>
                    </>
                )}
                {status === "paused" && (
                    <>
                        <button onClick={resume} className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white" style={{ background: moduleColor }}>
                            ▶ Resume
                        </button>
                        <button onClick={stop} className="rounded-lg bg-[#ff453a] px-4 py-2 text-[13px] font-semibold text-white">
                            ■ Stop
                        </button>
                    </>
                )}
                {status === "stopped" && (
                    <>
                        {audioUrl && <audio controls src={audioUrl} className="h-9 max-w-[260px]" />}
                        {meetingId ? (
                            <button
                                onClick={() => audioBlob && uploadToBackend(audioBlob, `recording-${Date.now()}.webm`)}
                                className="rounded-lg bg-[#0a84ff] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#0066cc]"
                            >
                                ⬆ Upload & Transcribe
                            </button>
                        ) : (
                            <button onClick={transcribe} className="rounded-lg bg-[#0a84ff] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#0066cc]">
                                ✦ Transcribe (demo)
                            </button>
                        )}
                        <button onClick={reset} className="rounded-lg border border-black/[0.08] px-4 py-2 text-[13px] font-medium text-[#1d1d1f]">{t("audio.reset")}</button>
                    </>
                )}
                {status === "uploading" && (
                    <div className="flex items-center gap-2 text-[12px] text-[#8e8e93]">
                        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#0a84ff] border-t-transparent" />
                        Uploading… {uploadProgress}%
                    </div>
                )}
                {(status as Status) === "transcribing" && (
                    <div className="flex items-center gap-2 text-[12px] text-[#8e8e93]">
                        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#0a84ff] border-t-transparent" />
                        Transcribing… {transcribeProgress}%
                    </div>
                )}
                {status === "done" && (
                    <>
                        {audioUrl && <audio controls src={audioUrl} className="h-9 max-w-[260px]" />}
                        <button onClick={reset} className="rounded-lg border border-black/[0.08] px-4 py-2 text-[13px] font-medium text-[#1d1d1f]">{t("audio.new")}</button>
                    </>
                )}
                {status === "error" && (
                    <button onClick={reset} className="rounded-lg border border-black/[0.08] px-4 py-2 text-[13px] font-medium text-[#1d1d1f]">{t("audio.retry")}</button>
                )}
            </div>

            {error && (
                <div className="mt-3 rounded-lg border border-[#ff453a]/30 bg-[#ff453a]/8 p-3 text-[12px] text-[#ff453a]">
                    ⚠ {error}
                </div>
            )}

            {/* Transcript */}
            {(transcript || (status as Status) === "transcribing") && (
                <div className="mt-4 rounded-xl border border-black/[0.06] bg-black/[0.02] p-3">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8e8e93]">
                        Transcript {(status as Status) === "transcribing" && `(${transcribeProgress}%)`}
                    </p>
                    <pre className="whitespace-pre-wrap font-sans text-[12px] leading-relaxed text-[#1d1d1f]">{transcript}</pre>
                </div>
            )}
        </div>
    );
}
