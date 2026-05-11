/**
 * Display helpers used across module pages. Kept independent from
 * lib/mock so we can delete the mock layer once the migration finishes.
 */

export function formatMoney(value: number | null | undefined): string {
    const n = Number(value ?? 0);
    if (!isFinite(n) || n === 0) return "$0";
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n.toFixed(0)}`;
}

export function formatDate(iso: string | null | undefined): string {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatRelativeDate(iso: string | null | undefined): string {
    if (!iso) return "—";
    const date = new Date(iso);
    if (isNaN(date.getTime())) return "—";
    const days = Math.floor((Date.now() - date.getTime()) / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function initials(name: string | null | undefined, max = 2): string {
    if (!name) return "—";
    return name
        .split(/\s+/)
        .map(p => p[0])
        .filter(Boolean)
        .slice(0, max)
        .join("")
        .toUpperCase();
}

export function daysBetween(from: string, to: string): number {
    return Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / 86400000);
}
