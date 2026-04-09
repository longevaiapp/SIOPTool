import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "LongevAI SIOP Tool",
    description: "AIaaS HealthTech Factory OS on the Juntify platform",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
