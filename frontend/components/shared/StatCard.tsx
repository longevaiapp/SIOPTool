import { cn } from "@/lib/utils";

type StatCardColor = "teal" | "amber" | "rose" | "default";

interface StatCardProps {
    value: string | number;
    label: string;
    delta?: string;
    color?: StatCardColor;
}

const colorMap: Record<
    StatCardColor,
    { border: string; barFill: string; valColor: string }
> = {
    teal: { border: "border-[var(--teal)]", barFill: "bg-[var(--teal)]", valColor: "text-[var(--teal-dk)]" },
    amber: { border: "border-[var(--amber)]", barFill: "bg-[var(--amber)]", valColor: "text-[var(--amber)]" },
    rose: { border: "border-[var(--rose)]", barFill: "bg-[var(--rose)]", valColor: "text-[var(--rose)]" },
    default: { border: "border-[var(--line)]", barFill: "bg-[var(--muted)]", valColor: "text-[var(--ink)]" },
};

export function StatCard({ value, label, delta, color = "default" }: StatCardProps) {
    const { border, barFill, valColor } = colorMap[color];

    return (
        <div
            className={cn(
                "flex flex-col gap-2 rounded-[var(--radius)] border-2 bg-[var(--white)] p-4",
                "shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow)]",
                border,
            )}
        >
            <p className="text-[10.5px] font-semibold uppercase tracking-[.8px] text-[var(--muted)]">
                {label}
            </p>

            <p className={cn("font-['Fraunces',serif] text-[28px] font-bold leading-none", valColor)}>
                {value}
            </p>

            {delta && (
                <p className="text-[10.5px] text-[var(--muted)]">{delta}</p>
            )}

            {/* decorative bottom bar */}
            <div className="mt-1 h-[3px] overflow-hidden rounded-full bg-[var(--line)]">
                <div className={cn("h-full w-full rounded-full", barFill)} />
            </div>
        </div>
    );
}
