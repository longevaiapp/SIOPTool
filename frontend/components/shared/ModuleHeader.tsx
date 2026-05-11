interface ModuleHeaderProps {
    moduleNum: string;
    title: string;
    subtitle?: string;
    description?: string;
    color?: string;
    actions?: React.ReactNode;
}

export function ModuleHeader({
    moduleNum,
    title,
    subtitle,
    description,
    color = "#0a84ff",
    actions,
}: ModuleHeaderProps) {
    return (
        <div className="mb-8">
            <div className="mb-2 flex items-center gap-2">
                <span 
                    className="text-[11px] font-bold uppercase tracking-[2px]"
                    style={{ color }}
                >
                    {moduleNum}
                </span>
            </div>
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-[36px] font-bold tracking-tight text-[#1d1d1f]">
                        {subtitle ? (
                            <>
                                {title} <span style={{ color }}>{subtitle}</span>
                            </>
                        ) : (
                            title
                        )}
                    </h1>
                    {description && (
                        <p className="mt-1 text-[14px] text-[#86868b]">
                            {description}
                        </p>
                    )}
                </div>
                {actions && (
                    <div className="flex gap-3">
                        {actions}
                    </div>
                )}
            </div>
        </div>
    );
}
