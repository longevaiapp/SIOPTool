interface ScoreRingProps {
    score: number;
    size?: number;
    color?: string;
    showLabel?: boolean;
    label?: string;
}

function getColor(score: number): string {
    if (score >= 80) return "#30d158";
    if (score >= 60) return "#ff9f0a";
    return "#ff453a";
}

export function ScoreRing({ 
    score, 
    size = 80, 
    color, 
    showLabel = true,
    label = "/100"
}: ScoreRingProps) {
    const radius = (size - 12) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const ringColor = color || getColor(score);

    return (
        <div className="relative inline-flex" style={{ width: size, height: size }}>
            <svg className="absolute inset-0" viewBox={`0 0 ${size} ${size}`}>
                {/* Background ring */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="rgba(0, 0, 0, 0.06)"
                    strokeWidth="6"
                />
                {/* Score ring with glow */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={ringColor}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{ 
                        transform: "rotate(-90deg)", 
                        transformOrigin: "center",
                        filter: `drop-shadow(0 0 6px ${ringColor}50)`,
                        transition: "stroke-dashoffset 0.6s ease-out"
                    }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span 
                    className="font-bold leading-none"
                    style={{ 
                        fontSize: size * 0.28,
                        color: "#1d1d1f"
                    }}
                >
                    {score}
                </span>
                {showLabel && (
                    <span 
                        className="text-[#86868b]"
                        style={{ fontSize: size * 0.12 }}
                    >
                        {label}
                    </span>
                )}
            </div>
        </div>
    );
}
