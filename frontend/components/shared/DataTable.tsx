"use client";

import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

export interface TableColumn<T> {
    key: string;
    header: string;
    width?: string;
    align?: "left" | "center" | "right";
    render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T extends Record<string, unknown>> {
    columns: TableColumn<T>[];
    rows: T[];
    title?: string;
    subtitle?: string;
    onRowClick?: (row: T) => void;
    actions?: React.ReactNode;
}

export function DataTable<T extends Record<string, unknown>>({
    columns,
    rows,
    title,
    subtitle,
    onRowClick,
    actions,
}: DataTableProps<T>) {
    const t = useT();
    return (
        <div className="glass-card overflow-hidden">
            {/* Header */}
            {(title || actions) && (
                <div className="flex items-center justify-between border-b border-black/[0.04] px-6 py-4">
                    <div className="flex items-center gap-3">
                        {title && (
                            <h2 className="text-[16px] font-semibold text-[#1d1d1f]">{title}</h2>
                        )}
                        {subtitle && (
                            <span className="rounded-full bg-[#0a84ff]/10 px-3 py-1 text-[12px] font-medium text-[#0a84ff]">
                                {subtitle}
                            </span>
                        )}
                    </div>
                    {actions}
                </div>
            )}

            {/* Table */}
            <table className="w-full">
                <thead>
                    <tr className="border-b border-black/[0.04] bg-black/[0.02]">
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                className={cn(
                                    "px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#86868b]",
                                    col.align === "center" && "text-center",
                                    col.align === "right" && "text-right",
                                    !col.align && "text-left"
                                )}
                                style={{ width: col.width }}
                            >
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {rows.map((row, i) => (
                        <tr
                            key={i}
                            onClick={() => onRowClick?.(row)}
                            className={cn(
                                "group border-b border-black/[0.03] transition-colors",
                                "hover:bg-black/[0.02]",
                                onRowClick && "cursor-pointer",
                            )}
                        >
                            {columns.map((col) => (
                                <td
                                    key={col.key}
                                    className={cn(
                                        "px-4 py-3.5 text-[13px]",
                                        col.align === "center" && "text-center",
                                        col.align === "right" && "text-right"
                                    )}
                                >
                                    {col.render ? col.render(row) : String(row[col.key] ?? "")}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Empty state */}
            {rows.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="text-[14px] font-medium text-[#86868b]">{t("table.empty")}</p>
                </div>
            )}
        </div>
    );
}
