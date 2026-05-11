"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import { getProjectsByClient, getMessagesByProject, getProject, MESSAGES } from "@/lib/mock";
import { useToast } from "@/components/shared/ToastProvider";

const DEMO_CLIENT_ID = "cli-genomics";

export default function WorkspaceMessagesPage() {
    const t = useT();
    const projects = getProjectsByClient(DEMO_CLIENT_ID);
    const [activeProjectId, setActiveProjectId] = useState(projects[0]?.id ?? "");
    const [draft, setDraft] = useState("");
    const { toast } = useToast();

    const messages = activeProjectId ? getMessagesByProject(activeProjectId) : [];
    const project = activeProjectId ? getProject(activeProjectId) : null;

    const handleSend = () => {
        if (!draft.trim()) return;
        toast({ title: t("ws.msg_sent"), description: draft.length > 60 ? draft.slice(0, 60) + "…" : draft, variant: "success" });
        setDraft("");
    };

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-[24px] font-bold text-[#1d1d1f]">{t("ws.msg_title")}</h1>
                <p className="text-[13px] text-[#8e8e93]">{t("ws.msg_sub")}</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                {/* Project list */}
                <div className="rounded-2xl border border-black/[0.06] bg-white/60 p-2 backdrop-blur">
                    {projects.map(p => {
                        const projMsgs = getMessagesByProject(p.id);
                        const lastMsg = projMsgs[projMsgs.length - 1];
                        const unread = projMsgs.filter(m => !m.read && m.from_role !== "client").length;
                        return (
                            <button
                                key={p.id}
                                onClick={() => setActiveProjectId(p.id)}
                                className={`w-full rounded-xl p-3 text-left transition-all ${
                                    activeProjectId === p.id ? "bg-[#ff9f0a]/10" : "hover:bg-black/[0.03]"
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <p className="text-[13px] font-semibold text-[#1d1d1f]">{p.name}</p>
                                    {unread > 0 && (
                                        <span className="rounded-full bg-[#ff453a] px-2 py-0.5 text-[10px] font-bold text-white">{unread}</span>
                                    )}
                                </div>
                                {lastMsg && (
                                    <p className="mt-1 line-clamp-1 text-[11px] text-[#8e8e93]">
                                        <span className="font-medium">{lastMsg.from_name}:</span> {lastMsg.text}
                                    </p>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Conversation */}
                <div className="flex h-[calc(100vh-220px)] flex-col rounded-2xl border border-black/[0.06] bg-white/60 backdrop-blur">
                    {project ? (
                        <>
                            <div className="border-b border-black/[0.06] p-4">
                                <p className="text-[14px] font-semibold text-[#1d1d1f]">{project.name}</p>
                                <p className="text-[11px] text-[#8e8e93]">{t("ws.msg_pm", { pm: project.pm_name })}</p>
                            </div>

                            <div className="flex-1 space-y-3 overflow-y-auto p-4">
                                {messages.map(m => {
                                    const isMine = m.from_role === "client";
                                    return (
                                        <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                                            <div className={`max-w-[70%] rounded-2xl p-3 ${
                                                isMine ? "bg-gradient-to-br from-[#ff9f0a] to-[#ff453a] text-white" : "bg-black/[0.04] text-[#1d1d1f]"
                                            }`}>
                                                {!isMine && <p className="mb-1 text-[10px] font-semibold opacity-70">{m.from_name}</p>}
                                                <p className="text-[13px]">{m.text}</p>
                                                <p className={`mt-1 text-[9px] ${isMine ? "text-white/70" : "text-[#8e8e93]"}`}>
                                                    {new Date(m.sent_at).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                                {messages.length === 0 && (
                                    <p className="text-center text-[12px] text-[#8e8e93]">{t("ws.msg_empty")}</p>
                                )}
                            </div>

                            <div className="border-t border-black/[0.06] p-3">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={draft}
                                        onChange={e => setDraft(e.target.value)}
                                        onKeyDown={e => e.key === "Enter" && handleSend()}
                                        placeholder={t("ws.msg_ph")}
                                        className="flex-1 rounded-xl border border-black/[0.08] bg-white px-4 py-2 text-[13px] focus:border-[#ff9f0a] focus:outline-none"
                                    />
                                    <button
                                        onClick={handleSend}
                                        className="rounded-xl bg-gradient-to-br from-[#ff9f0a] to-[#ff453a] px-5 py-2 text-[13px] font-semibold text-white"
                                    >
                                        {t("ws.msg_send")}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-1 items-center justify-center">
                            <p className="text-[12px] text-[#8e8e93]">{t("ws.msg_select")}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
