import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            {/* Ambient background */}
            <div className="ambient-bg" />

            {/* Language */}
            <div className="fixed right-4 top-4 z-50">
                <LanguageSwitcher />
            </div>
            
            {/* Content */}
            <div className="relative flex min-h-screen items-center justify-center p-4">
                {children}
            </div>
        </>
    );
}
