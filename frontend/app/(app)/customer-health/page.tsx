import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { StatCard } from "@/components/shared/StatCard";

const COLOR = "#e11d48";

export default function CustomerHealthPage() {
    return (
        <div className="flex flex-col">
            <ModuleHeader
                title="Customer Health"
                description="Client health scoring & monitoring"
                accentColor={COLOR}
            />
            <div className="p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard title="Healthy Accounts" value="—" accentColor={COLOR} isLoading />
                    <StatCard title="At Risk" value="—" accentColor={COLOR} isLoading />
                    <StatCard title="Churning" value="—" accentColor={COLOR} isLoading />
                    <StatCard title="Avg. Health Score" value="—" accentColor={COLOR} isLoading />
                </div>
            </div>
        </div>
    );
}
