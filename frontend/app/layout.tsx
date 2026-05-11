import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { ToastProvider } from "@/components/shared/ToastProvider";
import { I18nProvider, type Locale } from "@/lib/i18n";

export const metadata: Metadata = {
    title: "LongevAI SIOP Tool",
    description: "AIaaS HealthTech Factory OS on the Juntify platform",
};

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Read locale from cookie on the server so first paint is already in the
    // user's preferred language (prevents flash of Spanish→English on EN users).
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
    const initialLocale: Locale = cookieLocale === "en" ? "en" : "es";

    return (
        <html lang={initialLocale}>
            <body>
                <I18nProvider initialLocale={initialLocale}>
                    <ToastProvider>{children}</ToastProvider>
                </I18nProvider>
            </body>
        </html>
    );
}
