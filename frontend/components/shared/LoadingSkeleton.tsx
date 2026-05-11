import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
    rows?: number;
    type?: "card" | "table" | "text";
}

function Shimmer({ className }: { className?: string }) {
    return (
        <div 
            className={cn(
                "rounded-lg",
                "bg-gradient-to-r from-black/[0.04] via-black/[0.08] to-black/[0.04]",
                "bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite]",
                className
            )} 
        />
    );
}

export function LoadingSkeleton({ rows = 3, type = "card" }: LoadingSkeletonProps) {
    if (type === "card") {
        return (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: rows }).map((_, i) => (
                    <div
                        key={i}
                        className="glass-card p-5"
                    >
                        <Shimmer className="mb-3 h-3 w-1/3" />
                        <Shimmer className="mb-2 h-8 w-1/2" />
                        <Shimmer className="h-3 w-2/3" />
                    </div>
                ))}
            </div>
        );
    }

    if (type === "table") {
        return (
            <div className="glass-card overflow-hidden">
                <div className="border-b border-black/[0.04] px-6 py-4">
                    <Shimmer className="h-5 w-1/4" />
                </div>
                <div className="bg-black/[0.02] px-6 py-3">
                    <div className="flex gap-4">
                        <Shimmer className="h-3 w-16" />
                        <Shimmer className="h-3 w-20" />
                        <Shimmer className="h-3 w-14" />
                        <Shimmer className="h-3 w-18" />
                    </div>
                </div>
                {Array.from({ length: rows }).map((_, i) => (
                    <div
                        key={i}
                        className="flex gap-4 border-t border-black/[0.04] px-6 py-4"
                    >
                        <Shimmer className="h-4 w-1/4" />
                        <Shimmer className="h-4 w-1/5" />
                        <Shimmer className="h-4 w-16" />
                        <Shimmer className="h-6 w-20 rounded-full" />
                    </div>
                ))}
            </div>
        );
    }

    // text
    return (
        <div className="space-y-3">
            {Array.from({ length: rows }).map((_, i) => (
                <Shimmer key={i} className={cn("h-4", i % 3 === 2 ? "w-2/3" : "w-full")} />
            ))}
        </div>
    );
}
