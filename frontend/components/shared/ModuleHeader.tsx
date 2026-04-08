interface ModuleHeaderProps {
    title: string;
    description?: string;
    accentColor: string;
    children?: React.ReactNode;
}

export function ModuleHeader({
    title,
    description,
    accentColor,
    children,
}: ModuleHeaderProps) {
    return (
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
            <div>
                <h1 className="text-2xl font-bold" style={{ color: accentColor }}>
                    {title}
                </h1>
                {description && (
                    <p className="mt-1 text-sm text-gray-500">{description}</p>
                )}
            </div>
            {children && (
                <div className="flex items-center gap-3">{children}</div>
            )}
        </div>
    );
}
