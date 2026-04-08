import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { StatCard } from "@/components/shared/StatCard";

const COLOR = "#d97706";

export default function ClientPortalPage() {
    return (
        <div className="flex flex-col">
            <ModuleHeader
                title="Client Portal"
                description="Self-service client workspace"
                accentColor={COLOR}
            />
            <div className="p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard title="Active Portals" value="—" accentColor={COLOR} isLoading />
                    <StatCard title="Open Tickets" value="—" accentColor={COLOR} isLoading />
                    <StatCard title="Pending Approvals" value="—" accentColor={COLOR} isLoading />
                    <StatCard title="Logins This Week" value="—" accentColor={COLOR} isLoading />
                </div>
            </div>
        </div>
    );
}
