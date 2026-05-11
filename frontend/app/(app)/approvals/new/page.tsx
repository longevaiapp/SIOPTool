"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ModuleHeader } from "@/components/shared";
import { useToast } from "@/components/shared/ToastProvider";
import { useClients, useProjects } from "@/lib/hooks/use-resources";
import { approvalsApi } from "@/lib/api";
import { useT } from "@/lib/i18n";

const TYPES = [
    { v: "scope_change", lk: "appr_new.type_scope_change" },
    { v: "budget_increase", lk: "appr_new.type_budget_increase" },
    { v: "deliverable_signoff", lk: "appr_new.type_deliverable_signoff" },
    { v: "phi_access", lk: "appr_new.type_phi_access" },
    { v: "deployment", lk: "appr_new.type_deployment" },
    { v: "vendor_change", lk: "appr_new.type_vendor_change" },
    { v: "other", lk: "appr_new.type_other" },
];

export default function NewApprovalPage() {
    const t = useT();
    const router = useRouter();
    const { toast } = useToast();
    const { data: clients = [] } = useClients();
    const { data: projects = [] } = useProjects();
    const [submitting, setSubmitting] = useState(false);
    const [f, setF] = useState({
        title: "",
        description: "",
        approval_type: "scope_change",
        client_id: "",
        project_id: "",
        requested_by: "",
        due_date: "",
    });

    const projectsForClient = f.client_id ? projects.filter(p => p.client_id === f.client_id) : projects;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!f.title.trim()) {
            toast({ title: t("appr_new.toast_title_required"), variant: "error" });
            return;
        }
        setSubmitting(true);
        try {
            await approvalsApi.create({
                title: f.title.trim(),
                description: f.description || null,
                approval_type: f.approval_type,
                client_id: f.client_id || null,
                project_id: f.project_id || null,
                requested_by: f.requested_by || null,
                due_date: f.due_date || null,
                status: "PENDING",
            });
            toast({ title: t("appr_new.toast_requested"), variant: "success" });
            router.push("/approvals");
        } catch (err) {
            toast({ title: t("appr_new.toast_failed"), description: (err as Error).message, variant: "error" });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="mx-auto max-w-3xl p-6">
            <ModuleHeader title={t("appr_new.title")} subtitle={t("appr_new.subtitle")} color="#d97706" />
            <Link href="/approvals" className="mb-4 inline-block text-[12px] text-[#0a84ff]">← {t("approvals.title")}</Link>

            <form onSubmit={submit} className="space-y-4 rounded-2xl border border-black/[0.06] bg-white/60 p-5 backdrop-blur">
                <Field label={t("appr_new.field_title")}><input required value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder={t("appr_new.ph_title")} className="w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px]" /></Field>
                <Field label={t("appr_new.field_type")}>
                    <select value={f.approval_type} onChange={e => setF({ ...f, approval_type: e.target.value })} className="w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px]">
                        {TYPES.map(opt => <option key={opt.v} value={opt.v}>{t(opt.lk)}</option>)}
                    </select>
                </Field>
                <Field label={t("appr_new.field_description")}><textarea rows={3} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} className="w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px]" /></Field>
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label={t("appr_new.field_client")}>
                        <select value={f.client_id} onChange={e => setF({ ...f, client_id: e.target.value, project_id: "" })} className="w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px]">
                            <option value="">{t("appr_new.opt_optional")}</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </Field>
                    <Field label={t("appr_new.field_project")}>
                        <select value={f.project_id} onChange={e => setF({ ...f, project_id: e.target.value })} className="w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px]">
                            <option value="">{t("appr_new.opt_optional")}</option>
                            {projectsForClient.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label={t("appr_new.field_requested_by")}><input value={f.requested_by} onChange={e => setF({ ...f, requested_by: e.target.value })} placeholder={t("appr_new.ph_your_name")} className="w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px]" /></Field>
                    <Field label={t("appr_new.field_due_date")}><input type="date" value={f.due_date} onChange={e => setF({ ...f, due_date: e.target.value })} className="w-full rounded-lg border border-black/[0.08] px-3 py-2 text-[13px]" /></Field>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <Link href="/approvals" className="rounded-lg bg-black/[0.05] px-4 py-2 text-[13px] font-semibold">{t("form.cancel")}</Link>
                    <button type="submit" disabled={submitting} className="rounded-lg bg-gradient-to-br from-[#d97706] to-[#b45309] px-5 py-2 text-[13px] font-semibold text-white disabled:opacity-50">{submitting ? t("form.saving") : t("page.request_approval")}</button>
                </div>
            </form>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <div><label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#8e8e93]">{label}</label>{children}</div>;
}
