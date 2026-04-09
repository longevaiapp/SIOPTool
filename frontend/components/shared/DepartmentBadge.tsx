import { cn } from "@/lib/utils";

interface DepartmentBadgeProps {
    department: string;
    side: "internal" | "client";
}

export function DepartmentBadge({ department, side }: DepartmentBadgeProps) {
    const isInternal = side === "internal";

    return (
        <span
            className={cn(
                "inline-flex items-center rounded-[var(--radius-sm)] border px-2.5 py-1 text-[10.5px] font-medium",
                isInternal
                    ? "border-[var(--teal)]   bg-[var(--teal-lt)]   text-[var(--teal-dk)]"
                    : "border-[var(--violet)] bg-[var(--violet-lt)] text-[#5B21B6]",
            )}
        >
            {department}
        </span>
    );
}
