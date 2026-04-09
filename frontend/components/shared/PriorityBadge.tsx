import { cn } from "@/lib/utils";

type Priority = "Critical" | "High" | "Medium" | "Low";

interface PriorityBadgeProps {
    priority: Priority;
}

const priorityMap: Record<Priority, { bg: string; text: string; dot: string }> = {
    Critical: { bg: "bg-[var(--rose-lt)]", text: "text-[#9F1239]", dot: "bg-[var(--rose)]" },
    High: { bg: "bg-[var(--amber-lt)]", text: "text-[#92400E]", dot: "bg-[var(--amber)]" },
    Medium: { bg: "bg-[var(--blue-lt)]", text: "text-[var(--blue)]", dot: "bg-[var(--blue)]" },
    Low: { bg: "bg-[var(--sage-lt)]", text: "text-[var(--sage)]", dot: "bg-[var(--sage)]" },
};

export function PriorityBadge({ priority }: PriorityBadgeProps) {
    const { bg, text, dot } = priorityMap[priority];

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-[20px] px-2.5 py-1 text-[10.5px] font-bold",
                bg,
                text,
            )}
        >
            <span className={cn("h-[5px] w-[5px] flex-shrink-0 rounded-full", dot)} />
            {priority}
        </span>
    );
}
