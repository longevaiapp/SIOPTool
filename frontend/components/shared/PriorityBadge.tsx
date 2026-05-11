type Priority = "Critical" | "High" | "Medium" | "Low" | "critical" | "high" | "medium" | "low";

interface PriorityBadgeProps {
    priority: Priority;
    size?: "sm" | "md";
}

const priorityStyles: Record<string, { bg: string; text: string }> = {
    critical: { bg: "rgba(255, 69, 58, 0.12)", text: "#ff453a" },
    high: { bg: "rgba(255, 159, 10, 0.12)", text: "#ff9f0a" },
    medium: { bg: "rgba(10, 132, 255, 0.12)", text: "#0a84ff" },
    low: { bg: "rgba(48, 209, 88, 0.12)", text: "#30d158" },
};

export function PriorityBadge({ priority, size = "md" }: PriorityBadgeProps) {
    const key = priority.toLowerCase();
    const style = priorityStyles[key] || priorityStyles.medium;
    
    const sizeClasses = size === "sm" 
        ? "px-2 py-0.5 text-[9px]" 
        : "px-2.5 py-1 text-[10px]";

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wide ${sizeClasses}`}
            style={{ background: style.bg, color: style.text }}
        >
            <span 
                className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                style={{ 
                    background: style.text,
                    boxShadow: `0 0 4px ${style.text}60`
                }}
            />
            {priority}
        </span>
    );
}
