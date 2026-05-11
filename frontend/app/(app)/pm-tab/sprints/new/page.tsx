"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ModuleHeader } from "@/components/shared";
import { useToast } from "@/components/shared/ToastProvider";
import { useProjects } from "@/lib/hooks/use-resources";
import { sprintsApi } from "@/lib/api";
import { useT } from "@/lib/i18n";

const STATUSES = ["PLANNED", "ACTIVE", "COMPLETED", "CANCELLED"];

export default function NewSprintPage() {
    const t = useT();
    const router = useRouter();
    const { toast } = useToast();
    const { data: projects = [] } = useProjects();
    const [submitting, setSubmitting] = useState(false);
    const today = new Date().toISOString().slice(0, 10);
    const [f, setF] = useState({
        project_id: "",
        name: "",
        goal: "",
        status: "PLANNED",
        start_date: today,
        end_date: "",
        story_points_planned: "0",
    });

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!f.project_id || !f.name.trim()) {
            toast({ title: t("pm_s_new.val_required"), variant: "error" });
            return;
        }
        setSubmitting(true);
        try {
            const created = await sprintsApi.create({
                project_id: f.project_id,
                name: f.name.trim(),
                goal: f.goal || null,
                status: f.status,
                start_date: f.start_date || null,
                end_date: f.end_date || null,
                story_points_planned: parseInt(f.story_points_planned) || 0,
            });
            toast({ title: t("pm_s_new.toast_created"), variant: "success" });
            router.push(`/pm-tab/${created.project_id}`);
        } catch (err) {
            toast({ title: t("pm_s_new.toast_failed"), description: (err as Error).message, variant: "error" });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="mx-auto max-w-3xl p-6">
            <ModuleHeader title={t("pm_s_new.title")} subtitle={t("pm_s_new.subtitle")} color="#ea580c" />
            <Link href="/pm-tab" className="mb-4 inline-block text-[12px] text-[#0a84ff]">{t("pm_s_new.back")}</Link>

            <form onSubmit={submit} className="space-y-4 rounded-2xl border border-black/[0.06] bg-white/60 p-5 backdrop-blur">
                <Field label={t("pm_s_new.f_project")}>
                    <select required value={f.project_id} onChange={e => setF({ ...f, project_id: e.target.value })} className="w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px]">
                        <option value="">{t("pm_s_new.f_proj_ph")}</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </Field>
                <Field label={t("pm_s_new.f_name")}><input required value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder={t("pm_s_new.f_name_ph")} className="w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px]" /></Field>
                <Field label={t("pm_s_new.f_goal")}><textarea rows={2} value={f.goal} onChange={e => setF({ ...f, goal: e.target.value })} className="w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px]" /></Field>
                <div className="grid gap-4 md:grid-cols-3">
                    <Field label={t("pm_s_new.f_start")}><input type="date" value={f.start_date} onChange={e => setF({ ...f, start_date: e.target.value })} className="w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px]" /></Field>
                    <Field label={t("pm_s_new.f_end")}><input type="date" value={f.end_date} onChange={e => setF({ ...f, end_date: e.target.value })} className="w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px]" /></Field>
                    <Field label={t("pm_s_new.f_status")}>
                        <select value={f.status} onChange={e => setF({ ...f, status: e.target.value })} className="w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px]">
                            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </Field>
                </div>
                <Field label={t("pm_s_new.f_points")}><input type="number" min={0} value={f.story_points_planned} onChange={e => setF({ ...f, story_points_planned: e.target.value })} className="w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px]" /></Field>
                <div className="flex justify-end gap-2 pt-2">
                    <Link href="/pm-tab" className="rounded-lg bg-black/[0.05] px-4 py-2 text-[13px] font-semibold">{t("pm_s_new.cancel")}</Link>
                    <button type="submit" disabled={submitting} className="rounded-lg bg-gradient-to-br from-[#ea580c] to-[#c2410c] px-5 py-2 text-[13px] font-semibold text-white disabled:opacity-50">{submitting ? t("pm_s_new.submitting") : t("pm_s_new.submit")}</button>
                </div>
            </form>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <div><label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#8e8e93]">{label}</label>{children}</div>;
}
