import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { StatCard } from "@/components/shared/StatCard";

const COLOR = "#2563eb";

export default function CRMPage() {
    return (
        <div className="flex flex-col">
            <ModuleHeader
                title="CRM"
                description="Customer Relationship Management"
                accentColor={COLOR}
            />
            <div className="p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard title="Active Accounts" value="—" accentColor={COLOR} isLoading />
                    <StatCard title="Open Opportunities" value="—" accentColor={COLOR} isLoading />
                    <StatCard title="Tasks Due Today" value="—" accentColor={COLOR} isLoading />
                    <StatCard title="Pipeline Value" value="—" accentColor={COLOR} isLoading />
                </div>
            </div>
        </div>
    );
}
