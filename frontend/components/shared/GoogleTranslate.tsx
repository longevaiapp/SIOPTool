"use client";

/**
 * 🌐 GoogleTranslate — free fallback translator for everything the i18n
 * dictionary does not cover (hard-coded strings, DB content, AI output).
 *
 * How it works:
 *   - Only mounted when the locale is "en" (Spanish users never load it).
 *   - Loads Google's free website-translator widget (no API key) and forces
 *     ES → EN through the `googtrans` cookie, so it kicks in automatically.
 *   - Text already translated by the dictionary is English, so Google leaves
 *     it untouched; content fetched later (SWR) is picked up by Google's own
 *     DOM observer.
 *   - Google's toolbar/tooltips are hidden in globals.css.
 *
 * Add `translate="no"` or className="notranslate" to anything that must never
 * be translated (folios, brand names, code, etc.).
 */
import Script from "next/script";
import { useEffect, useState } from "react";

const GT_COOKIE = "googtrans";

declare global {
    interface Window {
        googleTranslateElementInit?: () => void;
        google?: any;
    }
}

/** Every domain level the widget may have written the cookie to. */
function cookieDomains(): (string | null)[] {
    const parts = window.location.hostname.split(".");
    const domains: (string | null)[] = [null];
    for (let i = 0; i < parts.length - 1; i++) {
        domains.push("." + parts.slice(i).join("."));
    }
    return domains;
}

/** Point Google Translate at `locale` (sets or clears the googtrans cookie). */
export function setGoogleTranslateLocale(locale: "es" | "en") {
    if (typeof document === "undefined") return;
    for (const d of cookieDomains()) {
        const domain = d ? `; domain=${d}` : "";
        document.cookie = locale === "en"
            ? `${GT_COOKIE}=/es/en; path=/${domain}`
            : `${GT_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT${domain}`;
    }
}

/**
 * Google Translate swaps text nodes for <font> wrappers behind React's back,
 * which makes React throw "Failed to execute 'removeChild' on 'Node'" on the
 * next re-render. Make those two DOM calls tolerant of foreign nodes.
 * (Known workaround: https://github.com/facebook/react/issues/11538)
 */
function patchDomForTranslation() {
    if (typeof Node !== "function" || (Node.prototype as any).__gtPatched) return;
    (Node.prototype as any).__gtPatched = true;

    const originalRemoveChild = Node.prototype.removeChild;
    Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
        if (child.parentNode !== this) {
            return child;
        }
        return originalRemoveChild.call(this, child) as T;
    };

    const originalInsertBefore = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function <T extends Node>(this: Node, newNode: T, ref: Node | null): T {
        if (ref && ref.parentNode !== this) {
            return originalInsertBefore.call(this, newNode, null) as T;
        }
        return originalInsertBefore.call(this, newNode, ref) as T;
    };
}

export function GoogleTranslate() {
    // The script must load only after the cookie + callback exist.
    const [ready, setReady] = useState(false);

    useEffect(() => {
        patchDomForTranslation();
        setGoogleTranslateLocale("en");
        window.googleTranslateElementInit = () => {
            if (!window.google?.translate?.TranslateElement) return;
            new window.google.translate.TranslateElement(
                { pageLanguage: "es", includedLanguages: "en", autoDisplay: false },
                "google_translate_element",
            );
        };
        setReady(true);
    }, []);

    return (
        <>
            <div id="google_translate_element" className="hidden" aria-hidden />
            {ready && (
                <Script
                    src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
                    strategy="afterInteractive"
                />
            )}
        </>
    );
}
