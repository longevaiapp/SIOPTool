import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { StatCard } from "@/components/shared/StatCard";

const COLOR = "#0891b2";

export default function SIOPEnginePage() {
    return (
        <div className="flex flex-col">
            <ModuleHeader
                title="SIOP Engine"
                description="Sales, Inventory & Operations Planning"
                accentColor={COLOR}
            />
            <div className="p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard title="Forecast Accuracy" value="—" accentColor={COLOR} isLoading />
                    <StatCard title="Supply Plans" value="—" accentColor={COLOR} isLoading />
                    <StatCard title="Demand Signals" value="—" accentColor={COLOR} isLoading />
                    <StatCard title="Inventory Turns" value="—" accentColor={COLOR} isLoading />
                </div>
            </div>
        </div>
    );
}
