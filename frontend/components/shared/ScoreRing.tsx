import { cn } from "@/lib/utils";

type ScoreRingSize = "sm" | "md" | "lg";

interface ScoreRingProps {
    score: number;
    size?: ScoreRingSize;
}

function getColorClass(score: number) {
    if (score >= 80) return "border-[var(--teal)]  text-[var(--teal-dk)]  bg-[var(--teal-lt)]";
    if (score >= 65) return "border-[var(--amber)] text-[var(--amber)]    bg-[var(--amber-lt)]";
    return "border-[var(--rose)]  text-[var(--rose)]     bg-[var(--rose-lt)]";
}

const sizeMap: Record<ScoreRingSize, { outer: string; text: string; border: string }> = {
    sm: { outer: "w-10  h-10", text: "text-[13px]", border: "border-2" },
    md: { outer: "w-[52px] h-[52px]", text: "text-[15px]", border: "border-[2.5px]" },
    lg: { outer: "w-16  h-16", text: "text-[18px]", border: "border-[3px]" },
};

export function ScoreRing({ score, size = "md" }: ScoreRingProps) {
    const { outer, text, border } = sizeMap[size];
    const colorClass = getColorClass(score);

    return (
        <div
            className={cn(
                "flex flex-shrink-0 items-center justify-center rounded-full",
                "font-['Fraunces',serif] font-bold",
                outer,
                text,
                border,
                colorClass,
            )}
        >
            {score}
        </div>
    );
}
