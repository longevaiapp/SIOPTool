import { cn } from "@/lib/utils";
import { LoadingSkeleton } from "./LoadingSkeleton";

interface StatCardProps {
    title: string;
    value: string | number;
    description?: string;
    accentColor?: string;
    isLoading?: boolean;
    className?: string;
}

export function StatCard({
    title,
    value,
    description,
    accentColor,
    isLoading,
    className,
}: StatCardProps) {
    if (isLoading) {
        return <LoadingSkeleton className={cn("h-28", className)} />;
    }

    return (
        <div
            className={cn(
                "rounded-lg border border-gray-200 bg-white p-6 shadow-sm",
                className
            )}
        >
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                {title}
            </p>
            <p
                className="text-3xl font-bold text-gray-900"
                style={accentColor ? { color: accentColor } : undefined}
            >
                {value}
            </p>
            {description && (
                <p className="mt-1 text-sm text-gray-500">{description}</p>
            )}
        </div>
    );
}
