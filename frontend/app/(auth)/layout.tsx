export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            {/* Ambient background */}
            <div className="ambient-bg" />
            
            {/* Content */}
            <div className="relative flex min-h-screen items-center justify-center p-4">
                {children}
            </div>
        </>
    );
}
