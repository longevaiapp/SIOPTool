import { cn } from "@/lib/utils";

interface ProgressBarProps {
    value: number;
    color?: "teal" | "amber" | "rose";
    height?: "sm" | "md";
}

const fillColor = {
    teal: "bg-[var(--teal)]",
    amber: "bg-[var(--amber)]",
    rose: "bg-[var(--rose)]",
} as const;

const heightClass = {
    sm: "h-[3px]",
    md: "h-[5px]",
} as const;

export function ProgressBar({ value, color = "teal", height = "md" }: ProgressBarProps) {
    const clamped = Math.min(100, Math.max(0, value));

    return (
        <div
            className={cn(
                "w-full overflow-hidden rounded-full bg-[var(--line)]",
                heightClass[height],
            )}
        >
            <div
                className={cn("h-full rounded-full transition-[width] duration-1000", fillColor[color])}
                style={{ width: `${clamped}%` }}
            />
        </div>
    );
}
