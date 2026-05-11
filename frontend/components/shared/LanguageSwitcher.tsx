"use client";

/**
 * 🌐 LanguageSwitcher — globe dropdown to toggle ES / EN.
 *
 * Renders a small icon button; clicking opens a tiny menu with the two
 * supported locales.  The current locale is highlighted.  Persists via the
 * cookie set by `useI18n().setLocale`.
 */
import { useEffect, useRef, useState } from "react";
import { useI18n, type Locale } from "@/lib/i18n";

const LOCALE_LABELS: Record<Locale, { flag: string; native: string }> = {
    es: { flag: "🇪🇸", native: "Español" },
    en: { flag: "🇺🇸", native: "English" },
};

export function LanguageSwitcher() {
    const { locale, setLocale, t } = useI18n();
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Click-outside to close
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [open]);

    return (
        <div ref={menuRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-label={t("lang.switcher_label")}
                title={t("lang.switcher_label")}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[18px] transition-colors hover:bg-black/[0.05]"
            >
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#3c3c43]" fill="none" stroke="currentColor" strokeWidth={1.7}>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" strokeLinecap="round" />
                </svg>
            </button>

            {open && (
                <div className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-[0_10px_40px_rgba(0,0,0,0.12)]">
                    <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#8e8e93]">
                        {t("common.locale")}
                    </p>
                    {(Object.keys(LOCALE_LABELS) as Locale[]).map((code) => {
                        const meta = LOCALE_LABELS[code];
                        const active = code === locale;
                        return (
                            <button
                                key={code}
                                type="button"
                                onClick={() => { setLocale(code); setOpen(false); }}
                                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors ${
                                    active ? "bg-[#0a84ff]/10 text-[#0040dd] font-semibold" : "text-[#1d1d1f] hover:bg-black/[0.04]"
                                }`}
                            >
                                <span className="text-[16px]">{meta.flag}</span>
                                <span className="flex-1">{meta.native}</span>
                                {active && (
                                    <svg className="h-4 w-4 text-[#0040dd]" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
