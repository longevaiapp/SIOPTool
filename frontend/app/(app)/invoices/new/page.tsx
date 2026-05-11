"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useClients, useProjects, useContracts } from "@/lib/hooks/use-resources";
import { FormShell, Section, Field, Row2, Input, Textarea, Select } from "@/components/shared/FormShell";
import { useToast } from "@/components/shared/ToastProvider";
import { invoicesApi } from "@/lib/api";
import { useT } from "@/lib/i18n";

export default function NewInvoicePage() {
    const t = useT();
    const router = useRouter();
    const { toast } = useToast();
    const { data: clients } = useClients();
    const { data: projects } = useProjects();
    const { data: contracts } = useContracts();

    const [clientId, setClientId] = useState("");
    const [projectId, setProjectId] = useState("");
    const [contractId, setContractId] = useState("");
    const [amount, setAmount] = useState("");
    const [currency, setCurrency] = useState("MXN");
    const [issue, setIssue] = useState(new Date().toISOString().slice(0, 10));
    const [due, setDue] = useState("");
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!clientId) {
            toast({ title: t("co_form.toast_validation"), description: t("inv_form.toast_client_required"), variant: "warning" });
            return;
        }
        if (!amount || parseFloat(amount) <= 0) {
            toast({ title: t("co_form.toast_validation"), description: t("inv_form.toast_amount_required"), variant: "warning" });
            return;
        }
        setSubmitting(true);
        try {
            const created = await invoicesApi.create({
                client_id: clientId,
                project_id: projectId || undefined,
                contract_id: contractId || undefined,
                amount: parseFloat(amount) as unknown as number,
                currency,
                issue_date: issue || undefined,
                due_date: due || undefined,
                notes: notes || undefined,
                status: "DRAFT",
            });
            toast({ title: t("inv_form.toast_created"), description: `Folio ${created.folio || created.number}`, variant: "success" });
            router.push(`/invoices/${created.id}`);
        } catch (e) {
            toast({ title: "Error", description: (e as Error).message, variant: "error" });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <FormShell
            moduleCode={t("inv_form.module_code")}
            moduleColor="#0a84ff"
            backHref="/invoices"
            backLabel={t("inv_form.back")}
            title={t("inv_form.title")}
            subtitle={t("inv_form.subtitle")}
            onSubmit={handleSubmit}
            submitLabel={submitting ? t("inv_form.creating") : t("inv_form.submit")}
        >
            <Section title={t("inv_form.section_client")}>
                <Field label={t("inv_form.field_client")} required>
                    <Select value={clientId} onChange={e => setClientId(e.target.value)}>
                        <option value="">{t("inv_form.opt_select")}</option>
                        {(clients ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                </Field>
                <Row2>
                    <Field label={t("inv_form.field_project")}>
                        <Select value={projectId} onChange={e => setProjectId(e.target.value)}>
                            <option value="">{t("inv_form.opt_no_project")}</option>
                            {(projects ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </Select>
                    </Field>
                    <Field label={t("inv_form.field_contract")}>
                        <Select value={contractId} onChange={e => setContractId(e.target.value)}>
                            <option value="">{t("inv_form.opt_no_contract")}</option>
                            {(contracts ?? []).map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </Select>
                    </Field>
                </Row2>
            </Section>

            <Section title={t("inv_form.section_amount")}>
                <Row2>
                    <Field label={t("inv_form.field_amount")} required>
                        <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="125000.00" />
                    </Field>
                    <Field label={t("inv_form.field_currency")}>
                        <Select value={currency} onChange={e => setCurrency(e.target.value)}>
                            <option value="MXN">MXN</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                        </Select>
                    </Field>
                </Row2>
            </Section>

            <Section title={t("inv_form.section_dates")}>
                <Row2>
                    <Field label={t("inv_form.field_issue")}>
                        <Input type="date" value={issue} onChange={e => setIssue(e.target.value)} />
                    </Field>
                    <Field label={t("inv_form.field_due")}>
                        <Input type="date" value={due} onChange={e => setDue(e.target.value)} />
                    </Field>
                </Row2>
            </Section>

            <Section title={t("inv_form.section_notes")}>
                <Field label={t("inv_form.field_notes")}>
                    <Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder={t("inv_form.ph_notes")} />
                </Field>
            </Section>
        </FormShell>
    );
}
