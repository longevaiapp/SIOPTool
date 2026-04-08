import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { StatCard } from "@/components/shared/StatCard";

const COLOR = "#7c3aed";

export default function ContractsPage() {
    return (
        <div className="flex flex-col">
            <ModuleHeader
                title="Contracts"
                description="Contract lifecycle management"
                accentColor={COLOR}
            />
            <div className="p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard title="Active Contracts" value="—" accentColor={COLOR} isLoading />
                    <StatCard title="Expiring (30 days)" value="—" accentColor={COLOR} isLoading />
                    <StatCard title="Pending Signature" value="—" accentColor={COLOR} isLoading />
                    <StatCard title="Total Contract Value" value="—" accentColor={COLOR} isLoading />
                </div>
            </div>
        </div>
    );
}
