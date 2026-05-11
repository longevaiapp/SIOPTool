"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRfq, useClients } from "@/lib/hooks/use-resources";
import { toMockRFQ } from "@/lib/adapters";
import { FormShell, Section, Field, Row2, Input, Textarea, Select, CheckboxField } from "@/components/shared/FormShell";
import { useToast } from "@/components/shared/ToastProvider";
import { rfqApi } from "@/lib/api";
import { useT } from "@/lib/i18n";

export default function EditRFQPage() {
    const t = useT();
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const id = params.id as string;
    const { data: rawRfq } = useRfq(id);
    const { data: clientsData } = useClients();
    const rfq = rawRfq ? toMockRFQ(rawRfq) : null;

    const [name, setName] = useState("");
    const [clientId, setClientId] = useState("");
    const [status, setStatus] = useState("draft");
    const [projectType, setProjectType] = useState("");
    const [budgetRange, setBudgetRange] = useState("");
    const [timeline, setTimeline] = useState("0");
    const [scope, setScope] = useState("");
    const [criteria, setCriteria] = useState("");
    const [hipaa, setHipaa] = useState(false);
    const [soc2, setSoc2] = useState(false);
    const [hitrust, setHitrust] = useState(false);
    const [gdpr, setGdpr] = useState(false);

    useEffect(() => {
        if (!rfq) return;
        setName(rfq.name); setClientId(rfq.client_id); setStatus(rfq.status);
        setProjectType(rfq.project_type); setBudgetRange(rfq.budget_range);
        setTimeline(String(rfq.timeline_weeks));
        setScope((rfq.answers.project_scope as string) ?? "");
        setCriteria((rfq.answers.success_criteria as string) ?? "");
        setHipaa(rfq.compliance.includes("HIPAA"));
        setSoc2(rfq.compliance.includes("SOC 2"));
        setHitrust(rfq.compliance.includes("HITRUST"));
        setGdpr(rfq.compliance.includes("GDPR"));
    }, [rfq]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const compliance: string[] = [];
            if (hipaa) compliance.push("HIPAA");
            if (soc2) compliance.push("SOC 2");
            if (hitrust) compliance.push("HITRUST");
            if (gdpr) compliance.push("GDPR");
            await rfqApi.update(id, {
                client_id: clientId || undefined,
                status: status.toUpperCase(),
                responses: {
                    company_name: name,
                    project_type: projectType,
                    budget_range: budgetRange,
                    timeline_weeks: parseInt(timeline) || 0,
                    project_scope: scope,
                    success_criteria: criteria,
                    compliance_frameworks: compliance,
                },
                completion_pct: 100,
            });
            toast({ title: t("rfq_e.toast_updated"), description: t("rfq_e.toast_saved", { n: name }), variant: "success" });
            router.push(`/rfq/${id}`);
        } catch (e) {
            toast({ title: t("common.error"), description: (e as Error).message, variant: "error" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!rfq) return <div className="p-6 text-[13px] text-[#8e8e93]">{t("rfq_e.loading")}</div>;

    return (
        <FormShell
            moduleCode={`M-02 · RFQ · ${rfq.id}`}
            moduleColor="#16a34a"
            backHref={`/rfq/${rfq.id}`}
            backLabel={t("rfq_e.back")}
            title={t("rfq_e.title", { name: rfq.name })}
            onSubmit={handleSubmit}
            submitLabel={t("rfq_e.save")}
        >
            <Section title={t("rfq_e.sec_details")}>
                <Field label={t("rfq_e.f_name")} required>
                    <Input value={name} onChange={e => setName(e.target.value)} />
                </Field>
                <Row2>
                    <Field label={t("rfq_e.f_client")} required>
                        <Select value={clientId} onChange={e => setClientId(e.target.value)}>
                            {(clientsData ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </Select>
                    </Field>
                    <Field label={t("rfq_e.f_status")}>
                        <Select value={status} onChange={e => setStatus(e.target.value)}>
                            {["draft", "in_progress", "submitted", "awarded", "lost"].map(s => <option key={s} value={s}>{s}</option>)}
                        </Select>
                    </Field>
                </Row2>
                <Row2>
                    <Field label={t("rfq_e.f_type")}>
                        <Input value={projectType} onChange={e => setProjectType(e.target.value)} />
                    </Field>
                    <Field label={t("rfq_e.f_budget")}>
                        <Input value={budgetRange} onChange={e => setBudgetRange(e.target.value)} />
                    </Field>
                </Row2>
                <Field label={t("rfq_e.f_timeline")}>
                    <Input type="number" value={timeline} onChange={e => setTimeline(e.target.value)} />
                </Field>
            </Section>

            <Section title={t("rfq_e.sec_scope")}>
                <Field label={t("rfq_e.f_scope")}>
                    <Textarea rows={3} value={scope} onChange={e => setScope(e.target.value)} />
                </Field>
                <Field label={t("rfq_e.f_criteria")}>
                    <Textarea rows={3} value={criteria} onChange={e => setCriteria(e.target.value)} />
                </Field>
            </Section>

            <Section title={t("rfq_e.sec_compliance")}>
                <CheckboxField label="HIPAA" checked={hipaa} onChange={setHipaa} />
                <CheckboxField label="SOC 2" checked={soc2} onChange={setSoc2} />
                <CheckboxField label="HITRUST" checked={hitrust} onChange={setHitrust} />
                <CheckboxField label="GDPR" checked={gdpr} onChange={setGdpr} />
            </Section>
        </FormShell>
    );
}
