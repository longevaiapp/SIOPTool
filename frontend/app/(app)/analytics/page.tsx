import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { StatCard } from "@/components/shared/StatCard";

const COLOR = "#475569";

export default function AnalyticsPage() {
    return (
        <div className="flex flex-col">
            <ModuleHeader
                title="Analytics"
                description="Platform-wide insights & reporting"
                accentColor={COLOR}
            />
            <div className="p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard title="Active Users" value="—" accentColor={COLOR} isLoading />
                    <StatCard title="Events Today" value="—" accentColor={COLOR} isLoading />
                    <StatCard title="AI Calls This Month" value="—" accentColor={COLOR} isLoading />
                    <StatCard title="Avg. Response Time" value="—" accentColor={COLOR} isLoading />
                </div>
            </div>
        </div>
    );
}
