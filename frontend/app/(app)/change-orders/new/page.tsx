"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProjects, useContracts, useClients } from "@/lib/hooks/use-resources";
import { FormShell, Section, Field, Row2, Input, Textarea, Select } from "@/components/shared/FormShell";
import { useToast } from "@/components/shared/ToastProvider";
import { changeOrdersApi } from "@/lib/api";
import { useT } from "@/lib/i18n";

export default function NewChangeOrderPage() {
    const t = useT();
    const router = useRouter();
    const { toast } = useToast();
    const { data: projects } = useProjects();
    const { data: contracts } = useContracts();
    const { data: clients } = useClients();

    const [title, setTitle] = useState("");
    const [projectId, setProjectId] = useState("");
    const [contractId, setContractId] = useState("");
    const [clientId, setClientId] = useState("");
    const [reason, setReason] = useState("");
    const [description, setDescription] = useState("");
    const [scopeImpact, setScopeImpact] = useState("");
    const [timelineDays, setTimelineDays] = useState("");
    const [budget, setBudget] = useState("");
    const [currency, setCurrency] = useState("MXN");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!title) {
            toast({ title: t("co_form.toast_validation"), description: t("co_form.toast_title_required"), variant: "warning" });
            return;
        }
        setSubmitting(true);
        try {
            const created = await changeOrdersApi.create({
                title,
                project_id: projectId || undefined,
                contract_id: contractId || undefined,
                client_id: clientId || undefined,
                reason: reason || undefined,
                description: description || undefined,
                scope_impact: scopeImpact || undefined,
                timeline_impact_days: timelineDays ? parseInt(timelineDays) : undefined,
                budget_impact: budget ? (parseFloat(budget) as unknown as number) : undefined,
                currency,
                status: "proposed",
            });
            toast({ title: t("co_form.toast_created"), description: t("co_form.toast_folio", { folio: created.folio }), variant: "success" });
            router.push(`/change-orders/${created.id}`);
        } catch (e) {
            toast({ title: "Error", description: (e as Error).message, variant: "error" });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <FormShell
            moduleCode={t("co_form.module_code")}
            moduleColor="#ff6b35"
            backHref="/change-orders"
            backLabel={t("co_form.back")}
            title={t("co_form.title")}
            subtitle={t("co_form.subtitle")}
            onSubmit={handleSubmit}
            submitLabel={submitting ? t("co_form.creating") : t("co_form.submit")}
        >
            <Section title={t("co_form.section_id")}>
                <Field label={t("co_form.field_title")} required>
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t("co_form.ph_title")} />
                </Field>
                <Row2>
                    <Field label={t("co_form.field_project")}>
                        <Select value={projectId} onChange={e => setProjectId(e.target.value)}>
                            <option value="">{t("co_form.opt_select")}</option>
                            {(projects ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </Select>
                    </Field>
                    <Field label={t("co_form.field_contract")}>
                        <Select value={contractId} onChange={e => setContractId(e.target.value)}>
                            <option value="">{t("co_form.opt_no_contract")}</option>
                            {(contracts ?? []).map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </Select>
                    </Field>
                </Row2>
                <Field label={t("co_form.field_client")}>
                    <Select value={clientId} onChange={e => setClientId(e.target.value)}>
                        <option value="">{t("co_form.opt_select")}</option>
                        {(clients ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                </Field>
            </Section>

            <Section title={t("co_form.section_just")}>
                <Field label={t("co_form.field_reason")}>
                    <Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder={t("co_form.ph_reason")} />
                </Field>
                <Field label={t("co_form.field_description")}>
                    <Textarea rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder={t("co_form.ph_description")} />
                </Field>
            </Section>

            <Section title={t("co_form.section_impact")}>
                <Field label={t("co_form.field_scope")}>
                    <Textarea rows={3} value={scopeImpact} onChange={e => setScopeImpact(e.target.value)} />
                </Field>
                <Row2>
                    <Field label={t("co_form.field_timeline")} hint={t("co_form.field_timeline_hint")}>
                        <Input type="number" value={timelineDays} onChange={e => setTimelineDays(e.target.value)} placeholder="14" />
                    </Field>
                    <Field label={t("co_form.field_budget")}>
                        <Input type="number" step="0.01" value={budget} onChange={e => setBudget(e.target.value)} placeholder="50000" />
                    </Field>
                </Row2>
                <Field label={t("co_form.field_currency")}>
                    <Select value={currency} onChange={e => setCurrency(e.target.value)}>
                        <option value="MXN">MXN</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                    </Select>
                </Field>
            </Section>
        </FormShell>
    );
}
