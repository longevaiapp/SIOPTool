import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { StatCard } from "@/components/shared/StatCard";

const COLOR = "#0d9488";

export default function PMOPage() {
    return (
        <div className="flex flex-col">
            <ModuleHeader
                title="PMO"
                description="Project Management Office"
                accentColor={COLOR}
            />
            <div className="p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard title="Portfolio Projects" value="—" accentColor={COLOR} isLoading />
                    <StatCard title="On Track" value="—" accentColor={COLOR} isLoading />
                    <StatCard title="At Risk" value="—" accentColor={COLOR} isLoading />
                    <StatCard title="Budget Utilisation" value="—" accentColor={COLOR} isLoading />
                </div>
            </div>
        </div>
    );
}
