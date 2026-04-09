import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
    rows?: number;
    type?: "card" | "table" | "text";
}

function Pulse({ className }: { className?: string }) {
    return (
        <div className={cn("animate-pulse rounded-md bg-[var(--line)]", className)} />
    );
}

export function LoadingSkeleton({ rows = 3, type = "card" }: LoadingSkeletonProps) {
    if (type === "card") {
        return (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: rows }).map((_, i) => (
                    <div
                        key={i}
                        className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--white)] p-4 shadow-[var(--shadow-sm)]"
                    >
                        <Pulse className="mb-3 h-3 w-1/3" />
                        <Pulse className="mb-3 h-8 w-1/2" />
                        <Pulse className="h-[3px] w-full" />
                    </div>
                ))}
            </div>
        );
    }

    if (type === "table") {
        return (
            <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--white)] shadow-[var(--shadow-sm)]">
                <Pulse className="h-10 w-full rounded-none opacity-20" />
                {Array.from({ length: rows }).map((_, i) => (
                    <div
                        key={i}
                        className="flex gap-4 border-b border-[var(--line)] px-4 py-3"
                    >
                        <Pulse className="h-4 w-1/4" />
                        <Pulse className="h-4 w-1/3" />
                        <Pulse className="h-4 w-1/5" />
                    </div>
                ))}
            </div>
        );
    }

    // text
    return (
        <div className="space-y-2">
            {Array.from({ length: rows }).map((_, i) => (
                <Pulse key={i} className={cn("h-4", i % 3 === 2 ? "w-2/3" : "w-full")} />
            ))}
        </div>
    );
}
