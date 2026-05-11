"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { API_BASE_URL } from "@/lib/api/client";
import { useT } from "@/lib/i18n";

type Msg = { role: "user" | "assistant"; content: string };

type EntityHint = { type: string; id: string } | null;

/**
 * Infer { entity_type, entity_id } from the current route.
 * Routes look like /clients/abc, /pm-tab/xyz, /meetings/.../...
 */
function inferEntity(pathname: string): EntityHint {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const map: Record<string, string> = {
        "customer-health": "client",
        "crm": "deal",
        "pm-tab": "project",
        "projects": "project",
        "meetings": "meeting",
        "suppliers": "supplier",
        "pmo": "program",
        "contracts": "contract",
        "deals": "deal",
        "clients": "client",
    };
    const seg = parts[0];
    const id = parts[1];
    if (!map[seg]) return null;
    if (id === "new" || id === "edit") return null;
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) return null;
    return { type: map[seg], id };
}

const SUGGESTION_KEYS = [
    "copilot.suggest_summary",
    "copilot.suggest_risks",
    "copilot.suggest_next",
    "copilot.suggest_compliance",
] as const;

export function CopilotPanel() {
    const t = useT();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Msg[]>([]);
    const [input, setInput] = useState("");
    const [streaming, setStreaming] = useState(false);
    const abortRef = useRef<AbortController | null>(null);
    const scrollRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, streaming]);

    // Reset when route changes
    useEffect(() => {
        setMessages([]);
    }, [pathname]);

    const send = async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || streaming) return;
        const entity = inferEntity(pathname);
        const newMessages: Msg[] = [...messages, { role: "user", content: trimmed }];
        setMessages(newMessages);
        setInput("");
        setStreaming(true);

        // Add placeholder for assistant
        setMessages([...newMessages, { role: "assistant", content: "" }]);

        const ctl = new AbortController();
        abortRef.current = ctl;
        try {
            const res = await fetch(`${API_BASE_URL}/copilot/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                signal: ctl.signal,
                body: JSON.stringify({
                    messages: newMessages.map(m => ({ role: m.role, content: m.content })),
                    entity_type: entity?.type ?? null,
                    entity_id: entity?.id ?? null,
                    route: pathname,
                }),
            });
            if (!res.ok || !res.body) {
                throw new Error(`HTTP ${res.status}`);
            }
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let assistantText = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";
                for (const line of lines) {
                    if (!line.startsWith("data:")) continue;
                    const payload = line.slice(5).trim();
                    if (!payload) continue;
                    try {
                        const evt = JSON.parse(payload);
                        if (evt.type === "delta" && evt.text) {
                            assistantText += evt.text;
                            setMessages(prev => {
                                const copy = [...prev];
                                copy[copy.length - 1] = { role: "assistant", content: assistantText };
                                return copy;
                            });
                        } else if (evt.type === "error") {
                            assistantText = `⚠️ Error: ${evt.error}`;
                            setMessages(prev => {
                                const copy = [...prev];
                                copy[copy.length - 1] = { role: "assistant", content: assistantText };
                                return copy;
                            });
                        }
                    } catch {
                        // ignore malformed line
                    }
                }
            }
        } catch (e) {
            if ((e as Error).name !== "AbortError") {
                setMessages(prev => {
                    const copy = [...prev];
                    copy[copy.length - 1] = { role: "assistant", content: `⚠️ ${(e as Error).message}` };
                    return copy;
                });
            }
        } finally {
            setStreaming(false);
            abortRef.current = null;
        }
    };

    const stop = () => abortRef.current?.abort();

    return (
        <>
            {/* Floating launcher */}
            <button
                onClick={() => setOpen(o => !o)}
                title={t("copilot.title")}
                className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white shadow-2xl transition hover:scale-105"
                style={{ background: "linear-gradient(135deg, #5856d6, #007aff)" }}
            >
                {open ? "×" : "✨"}
            </button>

            {open && (
                <aside
                    className="fixed bottom-24 right-6 z-40 flex h-[640px] w-[420px] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl"
                >
                    <header
                        className="flex items-center justify-between px-4 py-3 text-white"
                        style={{ background: "linear-gradient(135deg, #5856d6, #007aff)" }}
                    >
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[2px] opacity-80">{t("copilot.brand")}</p>
                            <p className="text-[14px] font-bold">
                                {inferEntity(pathname)
                                    ? `${t("copilot.context_label")} ${inferEntity(pathname)?.type}`
                                    : t("copilot.context_global")}
                            </p>
                        </div>
                        <button onClick={() => setOpen(false)} className="text-[20px] opacity-80 hover:opacity-100">×</button>
                    </header>

                    <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-[#fafafa] px-4 py-3">
                        {messages.length === 0 && (
                            <div className="space-y-3">
                                <p className="text-[12px] text-[#8e8e93]">
                                    {t("copilot.placeholder")}
                                </p>
                                <div className="space-y-1.5">
                                    {SUGGESTION_KEYS.map(key => {
                                        const text = t(key);
                                        return (
                                        <button
                                            key={key}
                                            onClick={() => send(text)}
                                            className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-left text-[12px] hover:bg-black/[0.03]"
                                        >
                                            {text}
                                        </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        {messages.map((m, i) => (
                            <div
                                key={i}
                                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${m.role === "user"
                                        ? "bg-[#007aff] text-white"
                                        : "bg-white text-[#1d1d1f] shadow-sm border border-black/[0.06]"
                                        }`}
                                >
                                    {m.content || <span className="opacity-50">…</span>}
                                </div>
                            </div>
                        ))}
                    </div>

                    <form
                        onSubmit={e => {
                            e.preventDefault();
                            send(input);
                        }}
                        className="flex items-center gap-2 border-t border-black/[0.06] bg-white px-3 py-2"
                    >
                        <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder={streaming ? t("copilot.generating") : t("copilot.input_placeholder")}
                            disabled={streaming}
                            className="flex-1 rounded-full border border-black/10 px-3 py-2 text-[13px] focus:border-[#5856d6] focus:outline-none focus:ring-2 focus:ring-[#5856d6]/20 disabled:opacity-60"
                        />
                        {streaming ? (
                            <button
                                type="button"
                                onClick={stop}
                                className="rounded-full bg-[#ff453a] px-3 py-2 text-[12px] font-semibold text-white"
                            >
                                {t("copilot.stop")}
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={!input.trim()}
                                className="rounded-full bg-[#5856d6] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-40"
                            >
                                {t("copilot.send")}
                            </button>
                        )}
                    </form>
                </aside>
            )}
        </>
    );
}
