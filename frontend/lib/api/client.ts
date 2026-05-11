/**
 * Thin fetch wrapper for the FastAPI backend.
 *
 * Configure with NEXT_PUBLIC_API_BASE in .env.local (defaults to the
 * deployed siop.juntify.com API for convenience during local dev).
 */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "https://siop.juntify.com/api";

export class ApiError extends Error {
    constructor(public status: number, public body: unknown, message: string) {
        super(message);
    }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        cache: "no-store",
    });
    if (!res.ok) {
        const text = await res.text();
        let parsed: unknown = text;
        try { parsed = JSON.parse(text); } catch {}
        throw new ApiError(res.status, parsed, `${method} ${path} → ${res.status}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
}

export const api = {
    get: <T>(path: string) => request<T>("GET", path),
    post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
    patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
    put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
    delete: <T>(path: string) => request<T>("DELETE", path),
};

export const fetcher = (path: string) => api.get(path);
export const API_BASE_URL = API_BASE;
