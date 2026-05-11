interface ProgressBarProps {
    value: number;
    color?: string;
    height?: number;
    showValue?: boolean;
    animated?: boolean;
}

function getAutoColor(value: number): string {
    if (value >= 70) return "#30d158";
    if (value >= 40) return "#ff9f0a";
    return "#ff453a";
}

export function ProgressBar({ 
    value, 
    color, 
    height = 6, 
    showValue = false,
    animated = true 
}: ProgressBarProps) {
    const clamped = Math.min(100, Math.max(0, value));
    const barColor = color || getAutoColor(clamped);

    return (
        <div className="flex items-center gap-2">
            <div
                className="relative flex-1 overflow-hidden rounded-full"
                style={{ 
                    height,
                    background: "rgba(0, 0, 0, 0.06)"
                }}
            >
                <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ 
                        width: `${clamped}%`,
                        background: `linear-gradient(90deg, ${barColor}90, ${barColor})`,
                        boxShadow: `0 0 8px ${barColor}40`,
                        transition: animated ? "width 0.6s ease-out" : "none"
                    }}
                />
            </div>
            {showValue && (
                <span 
                    className="min-w-[28px] font-mono text-[11px] font-bold"
                    style={{ color: barColor }}
                >
                    {clamped}
                </span>
            )}
        </div>
    );
}
