import { ModuleHeader } from "@/components/shared/ModuleHeader";
import { StatCard } from "@/components/shared/StatCard";

const COLOR = "#16a34a";

export default function RFQPage() {
    return (
        <div className="flex flex-col">
            <ModuleHeader
                title="RFQ"
                description="Request for Quotation"
                accentColor={COLOR}
            />
            <div className="p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard title="Open RFQs" value="—" accentColor={COLOR} isLoading />
                    <StatCard title="Awaiting Quotes" value="—" accentColor={COLOR} isLoading />
                    <StatCard title="Awarded This Month" value="—" accentColor={COLOR} isLoading />
                    <StatCard title="Total Quote Value" value="—" accentColor={COLOR} isLoading />
                </div>
            </div>
        </div>
    );
}
