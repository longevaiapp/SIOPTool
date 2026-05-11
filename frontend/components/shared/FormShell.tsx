"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/* ══════════════════════════════════════════════════════════════════════════
   📝 FORM SHELL — shared wrapper for create/edit forms
   ══════════════════════════════════════════════════════════════════════════ */

interface FormShellProps {
    moduleCode: string;
    moduleColor: string;
    backHref: string;
    backLabel: string;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    onSubmit: () => void | Promise<void>;
    submitLabel?: string;
    sidebar?: React.ReactNode;
}

export function FormShell({
    moduleCode, moduleColor, backHref, backLabel, title, subtitle,
    children, onSubmit, submitLabel = "Save", sidebar,
}: FormShellProps) {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await onSubmit();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-6">
            <Link href={backHref} className="mb-4 inline-flex items-center gap-2 text-[13px] hover:underline" style={{ color: moduleColor }}>
                ← {backLabel}
            </Link>

            <header className="mb-6">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px]" style={{ color: moduleColor }}>{moduleCode}</p>
                <h1 className="text-[28px] font-bold tracking-tight text-[#1d1d1f]">{title}</h1>
                {subtitle && <p className="mt-0.5 text-[13px] text-[#8e8e93]">{subtitle}</p>}
            </header>

            <div className={sidebar ? "grid gap-6 lg:grid-cols-3" : ""}>
                <div className={sidebar ? "lg:col-span-2 space-y-4" : "space-y-4"}>
                    {children}
                </div>
                {sidebar && <aside className="space-y-4">{sidebar}</aside>}
            </div>

            <div className="mt-8 flex justify-end gap-2 border-t border-black/[0.06] pt-4">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="rounded-xl border border-black/[0.08] bg-white px-5 py-2 text-[13px] font-semibold text-[#636366] hover:bg-black/[0.02]"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl px-6 py-2 text-[13px] font-semibold text-white shadow-lg disabled:opacity-60"
                    style={{ background: `linear-gradient(135deg, ${moduleColor}, ${moduleColor}dd)` }}
                >
                    {submitting ? "Saving..." : submitLabel}
                </button>
            </div>
        </form>
    );
}

/* ─── Form primitives ─── */

export function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-black/[0.06] bg-white/60 p-5 backdrop-blur">
            <div className="mb-4">
                <h2 className="text-[14px] font-semibold text-[#1d1d1f]">{title}</h2>
                {description && <p className="text-[11px] text-[#8e8e93]">{description}</p>}
            </div>
            <div className="space-y-3">{children}</div>
        </div>
    );
}

export function Field({ label, hint, required, children, span }: { label: string; hint?: string; required?: boolean; children: React.ReactNode; span?: 1 | 2 }) {
    return (
        <div className={span === 2 ? "col-span-2" : ""}>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#8e8e93]">
                {label} {required && <span className="text-[#ff453a]">*</span>}
            </label>
            {children}
            {hint && <p className="mt-1 text-[10px] text-[#8e8e93]">{hint}</p>}
        </div>
    );
}

export function Row2({ children }: { children: React.ReactNode }) {
    return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            className={`w-full rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-[13px] text-[#1d1d1f] placeholder:text-[#8e8e93] focus:border-[#0a84ff] focus:outline-none focus:ring-2 focus:ring-[#0a84ff]/20 ${props.className ?? ""}`}
        />
    );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return (
        <textarea
            {...props}
            className={`w-full rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-[13px] text-[#1d1d1f] placeholder:text-[#8e8e93] focus:border-[#0a84ff] focus:outline-none focus:ring-2 focus:ring-[#0a84ff]/20 ${props.className ?? ""}`}
        />
    );
}

export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select
            {...props}
            className={`w-full rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-[13px] text-[#1d1d1f] focus:border-[#0a84ff] focus:outline-none focus:ring-2 focus:ring-[#0a84ff]/20 ${props.className ?? ""}`}
        >
            {children}
        </select>
    );
}

export function CheckboxField({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/[0.06] p-3 hover:bg-black/[0.02]">
            <input
                type="checkbox"
                checked={checked}
                onChange={e => onChange(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-black/[0.15]"
            />
            <div className="flex-1">
                <p className="text-[13px] font-medium text-[#1d1d1f]">{label}</p>
                {description && <p className="text-[11px] text-[#8e8e93]">{description}</p>}
            </div>
        </label>
    );
}
