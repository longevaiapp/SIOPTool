// Shared TypeScript interfaces used across all modules
// Module-specific types go in lib/types/<module>.ts

export interface BaseRecord {
    id: string;
    created_at: string;
    updated_at: string;
    workspace_id: string;
    deleted_at?: string | null;
    is_deleted: boolean;
}

export interface AuditLog {
    id: string;
    table_name: string;
    record_id: string;
    action: "INSERT" | "UPDATE" | "DELETE";
    changed_by: string;
    changed_at: string;
    workspace_id: string;
}

export interface ApiResponse<T> {
    data: T;
    message?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    page_size: number;
}
