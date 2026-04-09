import { cn } from "@/lib/utils";

export type TagBadgeColor =
    | "teal"
    | "amber"
    | "rose"
    | "violet"
    | "blue"
    | "sage"
    | "muted";

export type TagBadgeSize = "sm" | "md";

interface TagBadgeProps {
    label: string;
    color?: TagBadgeColor;
    size?: TagBadgeSize;
}

const colorMap: Record<TagBadgeColor, string> = {
    teal: "bg-[var(--teal-lt)]   text-[var(--teal-dk)]  border-[var(--teal)]",
    amber: "bg-[var(--amber-lt)]  text-[#92400E]         border-[var(--amber)]",
    rose: "bg-[var(--rose-lt)]   text-[#9F1239]         border-[var(--rose)]",
    violet: "bg-[var(--violet-lt)] text-[#5B21B6]         border-[var(--violet)]",
    blue: "bg-[var(--blue-lt)]   text-[var(--blue)]     border-[var(--blue)]",
    sage: "bg-[var(--sage-lt)]   text-[var(--sage)]     border-[var(--sage)]",
    muted: "bg-[var(--surface)]   text-[var(--muted)]    border-[var(--line)]",
};

const sizeMap: Record<TagBadgeSize, string> = {
    sm: "px-2 py-0.5 text-[9.5px] tracking-[.6px]",
    md: "px-2.5 py-1 text-[10.5px] tracking-[.4px]",
};

export function TagBadge({ label, color = "muted", size = "md" }: TagBadgeProps) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-[var(--radius-sm)] border font-semibold uppercase",
                colorMap[color],
                sizeMap[size],
            )}
        >
            {label}
        </span>
    );
}
