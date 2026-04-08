import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { StatCard } from "@/components/shared/StatCard";

const COLOR = "#ea580c";

export default function PMTabPage() {
    return (
        <div className="flex flex-col">
            <ModuleHeader
                title="Juntify PM"
                description="Project Management"
                accentColor={COLOR}
            />
            <div className="p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard title="Active Projects" value="—" accentColor={COLOR} isLoading />
                    <StatCard title="Open Stories" value="—" accentColor={COLOR} isLoading />
                    <StatCard title="Blocked Items" value="—" accentColor={COLOR} isLoading />
                    <StatCard title="Sprint Velocity" value="—" accentColor={COLOR} isLoading />
                </div>
            </div>
        </div>
    );
}
