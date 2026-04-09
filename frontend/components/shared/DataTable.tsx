"use client";

import { cn } from "@/lib/utils";

export interface TableColumn<T> {
    key: string;
    header: string;
    render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T extends Record<string, unknown>> {
    columns: TableColumn<T>[];
    rows: T[];
    onRowClick?: (row: T) => void;
}

export function DataTable<T extends Record<string, unknown>>({
    columns,
    rows,
    onRowClick,
}: DataTableProps<T>) {
    return (
        <div className="w-full overflow-auto rounded-[var(--radius)] border border-[var(--line)] shadow-[var(--shadow-sm)]">
            <table className="w-full border-collapse text-[12px]">
                <thead className="sticky top-0 z-10 bg-[var(--ink)]">
                    <tr>
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                className="px-3 py-3 text-left text-[9.5px] font-bold uppercase tracking-[.8px] text-white/50"
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
                                "border-b border-[var(--line)] transition-colors hover:bg-[var(--teal-lt)]",
                                i % 2 === 1 && "bg-[var(--surface)]",
                                onRowClick && "cursor-pointer",
                            )}
                        >
                            {columns.map((col) => (
                                <td
                                    key={col.key}
                                    className="px-3 py-2.5 align-middle text-[var(--text)]"
                                >
                                    {col.render ? col.render(row) : String(row[col.key] ?? "")}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
