"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ModuleHeader } from "@/components/shared";
import { useToast } from "@/components/shared/ToastProvider";
import { useProjects, useSprints } from "@/lib/hooks/use-resources";
import { tasksApi } from "@/lib/api";
import { useT } from "@/lib/i18n";

const TASK_TYPES = [
    { value: "FEATURE", label: "Feature" },
    { value: "BUG", label: "Bug" },
    { value: "INTEGRATION", label: "Integration" },
    { value: "COMPLIANCE", label: "Compliance" },
    { value: "SECURITY", label: "Security" },
    { value: "CLINICAL", label: "Clinical" },
    { value: "RESEARCH", label: "Research" },
    { value: "CHORE", label: "Chore" },
    { value: "BLOCKER", label: "Blocker" },
];
const PRIORITIES = ["low", "medium", "high", "critical"];
const STATUSES = ["backlog", "todo", "in_progress", "review", "blocked", "done"];

export default function NewTaskPage() {
    const t = useT();
    const router = useRouter();
    const { toast } = useToast();
    const { data: projects = [] } = useProjects();
    const { data: sprints = [] } = useSprints();
    const [submitting, setSubmitting] = useState(false);
    const [f, setF] = useState({
        project_id: "",
        sprint_id: "",
        title: "",
        description: "",
        task_type: "FEATURE",
        priority: "medium",
        status: "backlog",
        assignee: "",
        points: "3",
        is_clinical_safety: false,
    });

    const sprintsForProject = sprints.filter(s => s.project_id === f.project_id);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!f.project_id || !f.title.trim()) {
            toast({ title: t("pm_t_new.val_required"), variant: "error" });
            return;
        }
        setSubmitting(true);
        try {
            const created = await tasksApi.create({
                project_id: f.project_id,
                sprint_id: f.sprint_id || null,
                title: f.title.trim(),
                description: f.description || null,
                task_type: f.task_type,
                priority: f.priority,
                status: f.status,
                assignee: f.assignee || null,
                points: parseInt(f.points) || 0,
                is_clinical_safety: f.is_clinical_safety,
            });
            toast({ title: t("pm_t_new.toast_created"), variant: "success" });
            router.push(`/pm-tab/${created.project_id}`);
        } catch (err) {
            toast({ title: t("pm_t_new.toast_failed"), description: (err as Error).message, variant: "error" });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="mx-auto max-w-3xl p-6">
            <ModuleHeader title={t("pm_t_new.title")} subtitle={t("pm_t_new.subtitle")} color="#ea580c" />
            <Link href="/pm-tab" className="mb-4 inline-block text-[12px] text-[#0a84ff]">{t("pm_t_new.back")}</Link>

            <form onSubmit={submit} className="space-y-4 rounded-2xl border border-black/[0.06] bg-white/60 p-5 backdrop-blur">
                <Field label={t("pm_t_new.f_project")}>
                    <select required value={f.project_id} onChange={e => setF({ ...f, project_id: e.target.value, sprint_id: "" })} className="w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px]">
                        <option value="">{t("pm_t_new.f_proj_ph")}</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </Field>
                <Field label={t("pm_t_new.f_sprint")}>
                    <select value={f.sprint_id} onChange={e => setF({ ...f, sprint_id: e.target.value })} disabled={!f.project_id} className="w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px] disabled:bg-black/[0.03]">
                        <option value="">{t("pm_t_new.f_sprint_ph")}</option>
                        {sprintsForProject.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </Field>
                <Field label={t("pm_t_new.f_title")}>
                    <input required value={f.title} onChange={e => setF({ ...f, title: e.target.value })} className="w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px]" />
                </Field>
                <Field label={t("pm_t_new.f_desc")}>
                    <textarea rows={3} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} className="w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px]" />
                </Field>
                <div className="grid gap-4 md:grid-cols-3">
                    <Field label={t("pm_t_new.f_type")}><Select value={f.task_type} onChange={v => setF({ ...f, task_type: v })} options={TASK_TYPES.map(t => ({ value: t.value, label: t.label }))} /></Field>
                    <Field label={t("pm_t_new.f_priority")}><Select value={f.priority} onChange={v => setF({ ...f, priority: v })} options={PRIORITIES.map(p => ({ value: p, label: p }))} /></Field>
                    <Field label={t("pm_t_new.f_status")}><Select value={f.status} onChange={v => setF({ ...f, status: v })} options={STATUSES.map(s => ({ value: s, label: s }))} /></Field>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label={t("pm_t_new.f_assignee")}><input value={f.assignee} onChange={e => setF({ ...f, assignee: e.target.value })} placeholder={t("pm_t_new.f_assignee_ph")} className="w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px]" /></Field>
                    <Field label={t("pm_t_new.f_points")}><input type="number" min={0} max={21} value={f.points} onChange={e => setF({ ...f, points: e.target.value })} className="w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px]" /></Field>
                </div>
                <label className="flex items-center gap-2 text-[13px]">
                    <input type="checkbox" checked={f.is_clinical_safety} onChange={e => setF({ ...f, is_clinical_safety: e.target.checked })} />
                    {t("pm_t_new.f_clinical")}
                </label>
                <div className="flex justify-end gap-2 pt-2">
                    <Link href="/pm-tab" className="rounded-lg bg-black/[0.05] px-4 py-2 text-[13px] font-semibold">{t("pm_t_new.cancel")}</Link>
                    <button type="submit" disabled={submitting} className="rounded-lg bg-gradient-to-br from-[#ea580c] to-[#c2410c] px-5 py-2 text-[13px] font-semibold text-white disabled:opacity-50">
                        {submitting ? t("pm_t_new.submitting") : t("pm_t_new.submit")}
                    </button>
                </div>
            </form>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <div><label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#8e8e93]">{label}</label>{children}</div>;
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
    return (
        <select value={value} onChange={e => onChange(e.target.value)} className="w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px] capitalize">
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    );
}
