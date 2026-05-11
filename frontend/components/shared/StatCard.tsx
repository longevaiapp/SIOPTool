import { cn } from "@/lib/utils";

type StatCardColor = "teal" | "amber" | "rose" | "blue" | "violet" | "default";

interface StatCardProps {
    value: string | number;
    label: string;
    delta?: string;
    color?: StatCardColor;
    icon?: React.ReactNode;
}

const colorMap: Record<StatCardColor, string> = {
    teal: "#30d158",
    amber: "#ff9f0a",
    rose: "#ff453a",
    blue: "#0a84ff",
    violet: "#bf5af2",
    default: "#1d1d1f",
};

export function StatCard({ value, label, delta, color = "default", icon }: StatCardProps) {
    const accentColor = colorMap[color];

    return (
        <div className="glass-card p-5 transition-all hover:scale-[1.01]">
            <div className="mb-2 flex items-center justify-between">
                <p className="text-[12px] font-medium text-[#86868b]">
                    {label}
                </p>
                {icon && (
                    <span className="text-[16px] opacity-60">{icon}</span>
                )}
            </div>

            <p 
                className="mb-1 text-[32px] font-bold tracking-tight"
                style={{ color: accentColor }}
            >
                {value}
            </p>

            {delta && (
                <p className={cn(
                    "text-[12px] font-medium",
                    delta.startsWith("+") || delta.startsWith("▲") 
                        ? "text-[#30d158]" 
                        : delta.startsWith("-") || delta.startsWith("▼")
                        ? "text-[#ff453a]"
                        : "text-[#86868b]"
                )}>
                    {delta}
                </p>
            )}
        </div>
    );
}
