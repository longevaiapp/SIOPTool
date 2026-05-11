"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useContract, useClients, useProjects } from "@/lib/hooks/use-resources";
import { toMockContract } from "@/lib/adapters";
import { FormShell, Section, Field, Row2, Input, Textarea, Select, CheckboxField } from "@/components/shared/FormShell";
import { useToast } from "@/components/shared/ToastProvider";
import { contractsApi } from "@/lib/api";
import { useT } from "@/lib/i18n";

export default function EditContractPage() {
    const t = useT();
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const id = params.id as string;
    const { data: rawContract } = useContract(id);
    const { data: clientsData } = useClients();
    const { data: projectsData } = useProjects();
    const ctr = rawContract ? toMockContract(rawContract) : null;

    const [type, setType] = useState("msa");
    const [title, setTitle] = useState("");
    const [clientId, setClientId] = useState("");
    const [projectId, setProjectId] = useState("");
    const [status, setStatus] = useState("draft");
    const [value, setValue] = useState("0");
    const [signedDate, setSignedDate] = useState("");
    const [expiryDate, setExpiryDate] = useState("");
    const [signers, setSigners] = useState("");
    const [notes, setNotes] = useState("");
    const [hipaa, setHipaa] = useState(false);
    const [soc2, setSoc2] = useState(false);
    const [hitrust, setHitrust] = useState(false);

    useEffect(() => {
        if (!ctr) return;
        setType(ctr.type); setTitle(ctr.title); setClientId(ctr.client_id);
        setProjectId(ctr.project_id ?? ""); setStatus(ctr.status);
        setValue(String(ctr.value)); setSignedDate(ctr.signed_date ?? "");
        setExpiryDate(ctr.expiry_date ?? ""); setSigners(ctr.signers.join(", "));
        setNotes(ctr.notes);
        setHipaa(ctr.compliance_controls.some(c => c.includes("HIPAA")));
        setSoc2(ctr.compliance_controls.some(c => c.includes("SOC2")));
        setHitrust(ctr.compliance_controls.some(c => c.includes("HITRUST")));
    }, [ctr]);

    const projectsForClient = clientId ? (projectsData ?? []).filter(p => p.client_id === clientId) : [];
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const compliance: string[] = [];
            if (hipaa) compliance.push("HIPAA");
            if (soc2) compliance.push("SOC2");
            if (hitrust) compliance.push("HITRUST");
            await contractsApi.update(id, {
                contract_type: type.toUpperCase(),
                title,
                client_id: clientId || undefined,
                project_id: projectId || undefined,
                status: status.toUpperCase(),
                value: parseFloat(value) || 0,
                signed_date: signedDate || undefined,
                expiry_date: expiryDate || undefined,
                signers: signers ? signers.split(",").map(s => s.trim()) : undefined,
                compliance_controls: compliance.length > 0 ? compliance : undefined,
            });
            toast({ title: t("ctr_e.toast_updated"), description: t("ctr_e.toast_saved", { n: title }), variant: "success" });
            router.push(`/contracts/${id}`);
        } catch (e) {
            toast({ title: t("common.error"), description: (e as Error).message, variant: "error" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!ctr) return <div className="p-6 text-[13px] text-[#8e8e93]">{t("ctr_e.loading")}</div>;

    return (
        <FormShell
            moduleCode={`M-03 · Contracts · ${ctr.id}`}
            moduleColor="#7c3aed"
            backHref={`/contracts/${ctr.id}`}
            backLabel={t("ctr_e.back")}
            title={t("ctr_e.title", { name: ctr.title })}
            onSubmit={handleSubmit}
            submitLabel={t("ctr_e.save")}
        >
            <Section title={t("ctr_e.sec_details")}>
                <Row2>
                    <Field label={t("ctr_e.f_type")} required>
                        <Select value={type} onChange={e => setType(e.target.value)}>
                            <option value="msa">MSA</option>
                            <option value="sow">SOW</option>
                            <option value="baa">BAA</option>
                            <option value="nda">NDA</option>
                            <option value="amendment">Amendment</option>
                        </Select>
                    </Field>
                    <Field label={t("ctr_e.f_status")}>
                        <Select value={status} onChange={e => setStatus(e.target.value)}>
                            <option value="draft">{t("ctr_e.s_draft")}</option>
                            <option value="review">{t("ctr_e.s_review")}</option>
                            <option value="signed">{t("ctr_e.s_signed")}</option>
                            <option value="expired">{t("ctr_e.s_expired")}</option>
                        </Select>
                    </Field>
                </Row2>
                <Field label={t("ctr_e.f_title")} required>
                    <Input value={title} onChange={e => setTitle(e.target.value)} />
                </Field>
                <Field label={t("ctr_e.f_value")}>
                    <Input type="number" value={value} onChange={e => setValue(e.target.value)} />
                </Field>
            </Section>

            <Section title={t("ctr_e.sec_parties")}>
                <Row2>
                    <Field label={t("ctr_e.f_client")} required>
                        <Select value={clientId} onChange={e => { setClientId(e.target.value); setProjectId(""); }}>
                            {(clientsData ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </Select>
                    </Field>
                    <Field label={t("ctr_e.f_project")}>
                        <Select value={projectId} onChange={e => setProjectId(e.target.value)}>
                            <option value="">{t("ctr_e.f_no_project")}</option>
                            {projectsForClient.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </Select>
                    </Field>
                </Row2>
                <Field label={t("ctr_e.f_signers")}>
                    <Input value={signers} onChange={e => setSigners(e.target.value)} />
                </Field>
            </Section>

            <Section title={t("ctr_e.sec_dates")}>
                <Row2>
                    <Field label={t("ctr_e.f_signed")}>
                        <Input type="date" value={signedDate} onChange={e => setSignedDate(e.target.value)} />
                    </Field>
                    <Field label={t("ctr_e.f_expiry")}>
                        <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
                    </Field>
                </Row2>
            </Section>

            <Section title={t("ctr_e.sec_compliance")}>
                <CheckboxField label="HIPAA" checked={hipaa} onChange={setHipaa} />
                <CheckboxField label="SOC 2 Type II" checked={soc2} onChange={setSoc2} />
                <CheckboxField label="HITRUST CSF" checked={hitrust} onChange={setHitrust} />
            </Section>

            <Section title={t("ctr_e.sec_notes")}>
                <Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
            </Section>
        </FormShell>
    );
}
