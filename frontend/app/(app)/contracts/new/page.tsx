"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useClients, useProjects, useRfq, useClient } from "@/lib/hooks/use-resources";
import { toMockRFQ, toMockClient } from "@/lib/adapters";
import { FormShell, Section, Field, Row2, Input, Textarea, Select, CheckboxField } from "@/components/shared/FormShell";
import { useToast } from "@/components/shared/ToastProvider";
import { contractsApi } from "@/lib/api";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { useT } from "@/lib/i18n";

export default function NewContractPage() {
    return (
        <Suspense fallback={<div className="p-6"><LoadingSkeleton rows={6} type="card" /></div>}>
            <NewContractInner />
        </Suspense>
    );
}

function NewContractInner() {
    const t = useT();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const fromRfq = searchParams.get("from_rfq");
    const { data: clientsData } = useClients();
    const { data: projectsData } = useProjects();
    const { data: rawRfq } = useRfq(fromRfq);
    const { data: rawRfqClient } = useClient(rawRfq?.client_id);
    const [type, setType] = useState("sow");
    const [title, setTitle] = useState("");
    const [clientId, setClientId] = useState("");
    const [projectId, setProjectId] = useState("");
    const [value, setValue] = useState("");
    const [signedDate, setSignedDate] = useState("");
    const [expiryDate, setExpiryDate] = useState("");
    const [signers, setSigners] = useState("");
    const [notes, setNotes] = useState("");
    const [hipaa, setHipaa] = useState(false);
    const [soc2, setSoc2] = useState(false);
    const [hitrust, setHitrust] = useState(false);

    useEffect(() => {
        if (!fromRfq || !rawRfq) return;
        const rfq = toMockRFQ(rawRfq);
        const client = rawRfqClient ? toMockClient(rawRfqClient) : null;
        setTitle(`SOW — ${rfq.name}`);
        setClientId(rfq.client_id);
        setType("sow");
        const match = rfq.budget_range.match(/\$(\d+)K\s*-\s*\$(\d+)K/);
        if (match) setValue(String(((+match[1] + +match[2]) / 2) * 1000));
        setHipaa(rfq.compliance.includes("HIPAA"));
        setSoc2(rfq.compliance.includes("SOC 2"));
        setHitrust(rfq.compliance.includes("HITRUST"));
        setNotes(`Generated from RFQ ${rfq.id} (${client?.name ?? ""}). Scope: ${rfq.answers.project_scope ?? ""}`);
        const start = new Date();
        const expiry = new Date();
        expiry.setDate(start.getDate() + rfq.timeline_weeks * 7);
        setSignedDate(start.toISOString().slice(0, 10));
        setExpiryDate(expiry.toISOString().slice(0, 10));
    }, [fromRfq, rawRfq, rawRfqClient]);

    const projectsForClient = clientId ? (projectsData ?? []).filter(p => p.client_id === clientId) : [];

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!title || !clientId) {
            toast({ title: t("co_form.toast_validation"), description: t("con_new.toast_required"), variant: "warning" });
            return;
        }
        setIsSubmitting(true);
        try {
            const compliance: string[] = [];
            if (hipaa) compliance.push("HIPAA");
            if (soc2) compliance.push("SOC2");
            if (hitrust) compliance.push("HITRUST");
            await contractsApi.create({
                contract_type: type.toUpperCase(),
                title,
                client_id: clientId,
                project_id: projectId || undefined,
                status: "DRAFT",
                value: parseFloat(value) || 0,
                signed_date: signedDate || undefined,
                expiry_date: expiryDate || undefined,
                signers: signers ? signers.split(",").map(s => s.trim()) : undefined,
                compliance_controls: compliance.length > 0 ? compliance : undefined,
            });
            toast({ title: t("con_new.toast_created"), description: t("con_new.toast_drafted", { title }), variant: "success" });
            router.push("/contracts");
        } catch (e) {
            toast({ title: "Error", description: (e as Error).message, variant: "error" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <FormShell
            moduleCode={t("con_new.module")}
            moduleColor="#7c3aed"
            backHref="/contracts"
            backLabel={t("con_new.back")}
            title={t("con_new.title")}
            subtitle={fromRfq ? t("con_new.subtitle_rfq", { id: fromRfq }) : t("con_new.subtitle")}
            onSubmit={handleSubmit}
            submitLabel={t("con_new.submit")}
            sidebar={
                <Section title={t("con_new.ai_title")}>
                    <div className="space-y-2 text-[12px]">
                        <p className="rounded-xl bg-[#7c3aed]/8 p-3 text-[#1d1d1f]">
                            {t("con_new.ai_1")}
                        </p>
                        <p className="rounded-xl bg-[#0a84ff]/8 p-3 text-[#1d1d1f]">
                            {t("con_new.ai_2", { type: type.toUpperCase() })}
                        </p>
                    </div>
                </Section>
            }
        >
            <Section title={t("con_new.section_details")}>
                <Row2>
                    <Field label={t("con_new.field_type")} required>
                        <Select value={type} onChange={e => setType(e.target.value)}>
                            <option value="msa">{t("con_new.opt_msa")}</option>
                            <option value="sow">{t("con_new.opt_sow")}</option>
                            <option value="baa">{t("con_new.opt_baa")}</option>
                            <option value="nda">{t("con_new.opt_nda")}</option>
                            <option value="amendment">{t("con_new.opt_amendment")}</option>
                        </Select>
                    </Field>
                    <Field label={t("con_new.field_value")}>
                        <Input type="number" value={value} onChange={e => setValue(e.target.value)} placeholder="0" />
                    </Field>
                </Row2>
                <Field label={t("con_new.field_title")} required>
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="GenomicsCo Phase 2 SOW" />
                </Field>
            </Section>

            <Section title={t("con_new.section_parties")}>
                <Row2>
                    <Field label={t("con_new.field_client")} required>
                        <Select value={clientId} onChange={e => { setClientId(e.target.value); setProjectId(""); }}>
                            <option value="">{t("con_new.opt_select_client")}</option>
                            {(clientsData ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </Select>
                    </Field>
                    <Field label={t("con_new.field_project")} hint={t("con_new.field_project_hint")}>
                        <Select value={projectId} onChange={e => setProjectId(e.target.value)} disabled={!clientId}>
                            <option value="">{t("con_new.opt_no_project")}</option>
                            {projectsForClient.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </Select>
                    </Field>
                </Row2>
                <Field label={t("con_new.field_signers")} hint={t("con_new.field_signers_hint")}>
                    <Input value={signers} onChange={e => setSigners(e.target.value)} placeholder="Dr. Sarah Chen, LongevAI CEO" />
                </Field>
            </Section>

            <Section title={t("con_new.section_dates")}>
                <Row2>
                    <Field label={t("con_new.field_signed")}>
                        <Input type="date" value={signedDate} onChange={e => setSignedDate(e.target.value)} />
                    </Field>
                    <Field label={t("con_new.field_expiry")}>
                        <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
                    </Field>
                </Row2>
            </Section>

            <Section title={t("con_new.section_compliance")}>
                <CheckboxField label="HIPAA" description={t("con_new.cb_hipaa_desc")} checked={hipaa} onChange={setHipaa} />
                <CheckboxField label="SOC 2 Type II" description={t("con_new.cb_soc2_desc")} checked={soc2} onChange={setSoc2} />
                <CheckboxField label="HITRUST CSF" description={t("con_new.cb_hitrust_desc")} checked={hitrust} onChange={setHitrust} />
            </Section>

            <Section title={t("con_new.section_notes")}>
                <Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder={t("con_new.ph_notes")} />
            </Section>
        </FormShell>
    );
}
