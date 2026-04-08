import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { StatCard } from "@/components/shared/StatCard";

const COLOR = "#4f46e5";

export default function SuppliersPage() {
    return (
        <div className="flex flex-col">
            <ModuleHeader
                title="Suppliers"
                description="Supplier management & compliance"
                accentColor={COLOR}
            />
            <div className="p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard title="Active Suppliers" value="—" accentColor={COLOR} isLoading />
                    <StatCard title="Pending Onboarding" value="—" accentColor={COLOR} isLoading />
                    <StatCard title="Compliance Issues" value="—" accentColor={COLOR} isLoading />
                    <StatCard title="Spend YTD" value="—" accentColor={COLOR} isLoading />
                </div>
            </div>
        </div>
    );
}
