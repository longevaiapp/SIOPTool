"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { useT } from "@/lib/i18n";

/* ══════════════════════════════════════════════════════════════════════════
   🔔 ToastProvider — global toast notifications (Apple liquid glass style)
   ══════════════════════════════════════════════════════════════════════════ */

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface Toast {
    id: string;
    title: string;
    description?: string;
    variant: ToastVariant;
    duration: number;
}

interface ToastContextValue {
    toast: (opts: { title: string; description?: string; variant?: ToastVariant; duration?: number }) => void;
    dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<ToastVariant, { bg: string; border: string; icon: string; iconBg: string }> = {
    success: { bg: "rgba(48, 209, 88, 0.10)", border: "rgba(48, 209, 88, 0.35)", icon: "✓", iconBg: "#30d158" },
    error:   { bg: "rgba(255, 69, 58, 0.10)", border: "rgba(255, 69, 58, 0.35)", icon: "✕", iconBg: "#ff453a" },
    info:    { bg: "rgba(10, 132, 255, 0.10)", border: "rgba(10, 132, 255, 0.35)", icon: "i", iconBg: "#0a84ff" },
    warning: { bg: "rgba(255, 159, 10, 0.10)", border: "rgba(255, 159, 10, 0.35)", icon: "!", iconBg: "#ff9f0a" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
    const t = useT();
    const [toasts, setToasts] = useState<Toast[]>([]);

    const dismiss = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const toast = useCallback<ToastContextValue["toast"]>((opts) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const t: Toast = {
            id,
            title: opts.title,
            description: opts.description,
            variant: opts.variant ?? "info",
            duration: opts.duration ?? 4000,
        };
        setToasts(prev => [...prev, t]);
        if (t.duration > 0) {
            window.setTimeout(() => dismiss(id), t.duration);
        }
    }, [dismiss]);

    return (
        <ToastContext.Provider value={{ toast, dismiss }}>
            {children}
            {/* Toast container */}
            <div className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex w-full max-w-sm flex-col gap-2">
                {toasts.map(item => {
                    const v = VARIANT_STYLES[item.variant];
                    return (
                        <div
                            key={item.id}
                            className="pointer-events-auto flex items-start gap-3 rounded-2xl border bg-white/95 p-3 shadow-[0_10px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl"
                            style={{ background: `linear-gradient(135deg, ${v.bg}, rgba(255,255,255,0.92))`, borderColor: v.border, animation: "toastIn 240ms cubic-bezier(0.16, 1, 0.3, 1)" }}
                        >
                            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white" style={{ background: v.iconBg }}>
                                {v.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold text-[#1d1d1f]">{item.title}</p>
                                {item.description && <p className="mt-0.5 text-[12px] leading-snug text-[#3c3c43]">{item.description}</p>}
                            </div>
                            <button
                                onClick={() => dismiss(item.id)}
                                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[#8e8e93] hover:bg-black/[0.06] hover:text-[#1d1d1f]"
                                aria-label={t("tp.dismiss")}
                            >
                                ✕
                            </button>
                        </div>
                    );
                })}
            </div>
            <style jsx global>{`
                @keyframes toastIn {
                    from { opacity: 0; transform: translateY(12px) scale(0.96); }
                    to   { opacity: 1; transform: translateY(0)    scale(1); }
                }
            `}</style>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
    return ctx;
}
