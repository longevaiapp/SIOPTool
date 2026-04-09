import { cn } from "@/lib/utils";

interface ModuleHeaderProps {
    moduleNum: string;
    title: string;
    description?: string;
    pbiCount?: number;
    platform?: "juntify" | "siop";
}

export function ModuleHeader({
    moduleNum,
    title,
    description,
    pbiCount,
    platform = "juntify",
}: ModuleHeaderProps) {
    return (
        <div className="flex items-start justify-between border-b border-[var(--line)] bg-[var(--white)] px-6 py-5">
            <div>
                <div className="mb-1.5 flex items-center gap-3">
                    <span className="text-[9.5px] font-bold uppercase tracking-[1px] text-[var(--muted)]">
                        {moduleNum}
                    </span>
                    <span
                        className={cn(
                            "inline-flex items-center rounded-[var(--radius-sm)] px-2 py-0.5",
                            "text-[9.5px] font-bold uppercase tracking-[.8px]",
                            platform === "juntify"
                                ? "bg-[var(--blue-lt)] text-[var(--blue)]"
                                : "bg-[var(--teal-lt)] text-[var(--teal-dk)]",
                        )}
                    >
                        {platform === "juntify" ? "Juntify" : "SIOP Tool"}
                    </span>
                </div>

                <h1 className="font-['Fraunces',serif] text-[26px] font-bold leading-tight text-[var(--ink)]">
                    {title}
                </h1>

                {description && (
                    <p className="mt-1 text-[12px] leading-relaxed text-[var(--muted)]">
                        {description}
                    </p>
                )}
            </div>

            {pbiCount !== undefined && (
                <div className="ml-4 flex-shrink-0 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-center">
                    <span className="font-['Fraunces',serif] block text-[20px] font-bold text-[var(--ink)]">
                        {pbiCount}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-[1px] text-[var(--muted)]">
                        PBIs
                    </span>
                </div>
            )}
        </div>
    );
}
