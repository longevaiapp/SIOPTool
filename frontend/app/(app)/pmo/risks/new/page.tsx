"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ModuleHeader } from "@/components/shared";
import { useToast } from "@/components/shared/ToastProvider";
import { useProjects } from "@/lib/hooks/use-resources";
import { risksApi } from "@/lib/api";
import { useT } from "@/lib/i18n";

const SEVERITIES = ["low", "medium", "high", "critical"];
const LIKELIHOODS = ["unlikely", "possible", "likely", "almost_certain"];
const STATUSES = ["open", "mitigating", "closed", "accepted"];

export default function NewRiskPage() {
    const t = useT();
    const router = useRouter();
    const { toast } = useToast();
    const { data: projects = [] } = useProjects();
    const [submitting, setSubmitting] = useState(false);
    const [f, setF] = useState({
        project_id: "",
        title: "",
        description: "",
        severity: "medium",
        likelihood: "possible",
        status: "open",
        owner: "",
        mitigation: "",
    });

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!f.title.trim()) {
            toast({ title: t("pmo_r.val_title"), variant: "error" });
            return;
        }
        setSubmitting(true);
        try {
            await risksApi.create({
                project_id: f.project_id || null,
                title: f.title.trim(),
                description: f.description || null,
                severity: f.severity,
                likelihood: f.likelihood,
                status: f.status,
                owner: f.owner || null,
                mitigation: f.mitigation || null,
            });
            toast({ title: t("pmo_r.toast_logged"), variant: "success" });
            router.push("/pmo");
        } catch (err) {
            toast({ title: t("pmo_r.toast_failed"), description: (err as Error).message, variant: "error" });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="mx-auto max-w-3xl p-6">
            <ModuleHeader title={t("pmo_r.title")} subtitle={t("pmo_r.subtitle")} color="#0d9488" />
            <Link href="/pmo" className="mb-4 inline-block text-[12px] text-[#0a84ff]">{t("pmo_r.back")}</Link>

            <form onSubmit={submit} className="space-y-4 rounded-2xl border border-black/[0.06] bg-white/60 p-5 backdrop-blur">
                <Field label={t("pmo_r.f_project")}>
                    <select value={f.project_id} onChange={e => setF({ ...f, project_id: e.target.value })} className="w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px]">
                        <option value="">{t("pmo_r.f_proj_ph")}</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </Field>
                <Field label={t("pmo_r.f_title")}><input required value={f.title} onChange={e => setF({ ...f, title: e.target.value })} className="w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px]" /></Field>
                <Field label={t("pmo_r.f_desc")}><textarea rows={3} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} className="w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px]" /></Field>
                <div className="grid gap-4 md:grid-cols-3">
                    <Field label={t("pmo_r.f_severity")}>
                        <select value={f.severity} onChange={e => setF({ ...f, severity: e.target.value })} className="w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px] capitalize">
                            {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </Field>
                    <Field label={t("pmo_r.f_likelihood")}>
                        <select value={f.likelihood} onChange={e => setF({ ...f, likelihood: e.target.value })} className="w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px] capitalize">
                            {LIKELIHOODS.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                        </select>
                    </Field>
                    <Field label={t("pmo_r.f_status")}>
                        <select value={f.status} onChange={e => setF({ ...f, status: e.target.value })} className="w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px] capitalize">
                            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </Field>
                </div>
                <Field label={t("pmo_r.f_owner")}><input value={f.owner} onChange={e => setF({ ...f, owner: e.target.value })} placeholder={t("pmo_r.f_owner_ph")} className="w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px]" /></Field>
                <Field label={t("pmo_r.f_mitigation")}><textarea rows={2} value={f.mitigation} onChange={e => setF({ ...f, mitigation: e.target.value })} className="w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px]" /></Field>
                <div className="flex justify-end gap-2 pt-2">
                    <Link href="/pmo" className="rounded-lg bg-black/[0.05] px-4 py-2 text-[13px] font-semibold">{t("pmo_r.cancel")}</Link>
                    <button type="submit" disabled={submitting} className="rounded-lg bg-gradient-to-br from-[#0d9488] to-[#0f766e] px-5 py-2 text-[13px] font-semibold text-white disabled:opacity-50">{submitting ? t("pmo_r.submitting") : t("pmo_r.submit")}</button>
                </div>
            </form>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <div><label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#8e8e93]">{label}</label>{children}</div>;
}
