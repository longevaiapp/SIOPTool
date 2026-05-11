/**
 * 🌐 i18n — minimal locale system for the SIOP frontend.
 *
 * Why custom (no next-intl, no react-i18next):
 *   1. We're on Next 15 App Router with mixed RSC/CSR; route-based locales
 *      would force us to restructure every (app)/* route into [locale]/(app)/*.
 *   2. Our scope is just ES + EN; we don't need ICU plural rules, gender
 *      agreement, fancy date formatters, etc.
 *   3. A 60-line context + cookie is auditable, dependency-free, and SSR-safe.
 *
 * Flow:
 *   - <I18nProvider initialLocale={cookieLocale}> wraps the app
 *   - The very first server render reads `NEXT_LOCALE` cookie via Next's
 *     `cookies()` helper inside RootLayout; if absent, falls back to "es".
 *   - Client mutations via `setLocale()` write the cookie + update state.
 *   - `useT()` returns a t(key, vars?) function. Missing keys log a warning
 *     in dev and fall back to the key itself (so we never render `undefined`).
 */
"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { es as ES } from "./dict/es";
import { en as EN } from "./dict/en";

export type Locale = "es" | "en";

const DICTS: Record<Locale, Record<string, string>> = { es: ES, en: EN };

interface I18nContextValue {
    locale: Locale;
    setLocale: (l: Locale) => void;
    t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const COOKIE_NAME = "NEXT_LOCALE";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function interpolate(tpl: string, vars?: Record<string, string | number>) {
    if (!vars) return tpl;
    return tpl.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export function I18nProvider({
    initialLocale = "es",
    children,
}: {
    initialLocale?: Locale;
    children: ReactNode;
}) {
    const [locale, setLocaleState] = useState<Locale>(initialLocale);

    // Hydrate from cookie on the client in case the SSR default got out of sync
    // (e.g. user opened a fresh tab where the cookie already exists).
    useEffect(() => {
        if (typeof document === "undefined") return;
        const m = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=(es|en)/);
        if (m && m[1] !== locale) setLocaleState(m[1] as Locale);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setLocale = useCallback((l: Locale) => {
        setLocaleState(l);
        if (typeof document !== "undefined") {
            document.cookie = `${COOKIE_NAME}=${l}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
            document.documentElement.lang = l;
        }
    }, []);

    const t = useCallback<I18nContextValue["t"]>((key, vars) => {
        const dict = DICTS[locale] ?? DICTS.es;
        const raw = dict[key];
        if (raw === undefined) {
            // Fallback chain: requested locale → ES → key
            const fallback = DICTS.es[key];
            if (fallback === undefined) {
                if (process.env.NODE_ENV !== "production") {
                    // eslint-disable-next-line no-console
                    console.warn(`[i18n] missing key: "${key}"`);
                }
                return key;
            }
            return interpolate(fallback, vars);
        }
        return interpolate(raw, vars);
    }, [locale]);

    const value = useMemo<I18nContextValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
    const ctx = useContext(I18nContext);
    if (!ctx) throw new Error("useI18n must be used within <I18nProvider>");
    return ctx;
}

/** Shortcut for `useI18n().t` — most components only need translation. */
export function useT() {
    return useI18n().t;
}
