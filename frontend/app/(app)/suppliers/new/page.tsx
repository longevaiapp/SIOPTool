"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormShell, Section, Field, Row2, Input, Textarea, Select, CheckboxField } from "@/components/shared/FormShell";
import { useToast } from "@/components/shared/ToastProvider";
import { suppliersApi } from "@/lib/api";
import { useT } from "@/lib/i18n";

export default function NewSupplierPage() {
    const t = useT();
    const router = useRouter();
    const { toast } = useToast();
    const [name, setName] = useState("");
    const [category, setCategory] = useState("infrastructure");
    const [contact, setContact] = useState("");
    const [email, setEmail] = useState("");
    const [website, setWebsite] = useState("");
    const [services, setServices] = useState("");
    const [contractEnd, setContractEnd] = useState("");
    const [riskLevel, setRiskLevel] = useState("low");
    const [notes, setNotes] = useState("");
    const [hipaa, setHipaa] = useState(false);
    const [soc2, setSoc2] = useState(false);
    const [pen, setPen] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!name) {
            toast({ title: t("sup_new.toast_validation"), description: t("sup_new.toast_name_required"), variant: "warning" });
            return;
        }
        setIsSubmitting(true);
        try {
            const certs: string[] = [];
            if (hipaa) certs.push("HIPAA");
            if (soc2) certs.push("SOC2");
            if (pen) certs.push("PEN_TEST");
            await suppliersApi.create({
                name,
                category,
                status: "ACTIVE",
                contact_name: contact || undefined,
                contact_email: email || undefined,
                risk_level: riskLevel,
                compliance_certs: certs.length > 0 ? certs : undefined,
                notes: notes || undefined,
            });
            toast({ title: t("sup_new.toast_created"), description: t("sup_new.toast_added", { name }), variant: "success" });
            router.push("/suppliers");
        } catch (e) {
            toast({ title: "Error", description: (e as Error).message, variant: "error" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <FormShell
            moduleCode="M-08 · Suppliers"
            moduleColor="#4f46e5"
            backHref="/suppliers"
            backLabel={t("sup_new.title").replace(/^Nuevo |^New /, "") + ""}
            title={t("sup_new.title")}
            subtitle={t("sup_new.subtitle")}
            onSubmit={handleSubmit}
            submitLabel={t("sup_new.submit")}
            sidebar={
                <Section title={t("sup_new.section_onboarding")}>
                    <ul className="space-y-2 text-[12px]">
                        <li className="flex gap-2"><span className="text-[#30d158]">○</span> {t("sup_new.ob_1")}</li>
                        <li className="flex gap-2"><span className="text-[#30d158]">○</span> {t("sup_new.ob_2")}</li>
                        <li className="flex gap-2"><span className="text-[#30d158]">○</span> {t("sup_new.ob_3")}</li>
                        <li className="flex gap-2"><span className="text-[#30d158]">○</span> {t("sup_new.ob_4")}</li>
                        <li className="flex gap-2"><span className="text-[#30d158]">○</span> {t("sup_new.ob_5")}</li>
                    </ul>
                </Section>
            }
        >
            <Section title={t("sup_new.section_details")}>
                <Row2>
                    <Field label={t("sup_new.field_name")} required>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="AWS, OpenAI, Datadog..." />
                    </Field>
                    <Field label={t("sup_new.field_category")} required>
                        <Select value={category} onChange={e => setCategory(e.target.value)}>
                            <option value="infrastructure">{t("sup_new.opt_infrastructure")}</option>
                            <option value="ml_ops">{t("sup_new.opt_ml_ops")}</option>
                            <option value="consulting">{t("sup_new.opt_consulting")}</option>
                            <option value="data">{t("sup_new.opt_data")}</option>
                            <option value="security">{t("sup_new.opt_security")}</option>
                        </Select>
                    </Field>
                </Row2>
                <Field label={t("sup_new.field_services")} hint={t("sup_new.hint_services")}>
                    <Input value={services} onChange={e => setServices(e.target.value)} placeholder={t("sup_new.ph_services")} />
                </Field>
            </Section>

            <Section title={t("sup_new.field_contact")}>
                <Row2>
                    <Field label={t("sup_new.field_contact")}>
                        <Input value={contact} onChange={e => setContact(e.target.value)} placeholder={t("sup_new.ph_contact")} />
                    </Field>
                    <Field label={t("sup_new.field_email")}>
                        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ops@vendor.com" />
                    </Field>
                </Row2>
                <Field label={t("sup_new.field_website")}>
                    <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." />
                </Field>
            </Section>

            <Section title={t("sup_new.section_contract")}>
                <Row2>
                    <Field label={t("sup_new.field_contract_end")}>
                        <Input type="date" value={contractEnd} onChange={e => setContractEnd(e.target.value)} />
                    </Field>
                    <Field label={t("sup_new.field_risk")} required>
                        <Select value={riskLevel} onChange={e => setRiskLevel(e.target.value)}>
                            <option value="low">{t("sup_new.opt_low")}</option>
                            <option value="medium">{t("sup_new.opt_med")}</option>
                            <option value="high">{t("sup_new.opt_high")}</option>
                        </Select>
                    </Field>
                </Row2>
            </Section>

            <Section title={t("sup_new.section_compliance")}>
                <CheckboxField label={t("sup_new.cb_hipaa")} description={t("sup_new.cb_hipaa_desc")} checked={hipaa} onChange={setHipaa} />
                <CheckboxField label={t("sup_new.cb_soc2")} description={t("sup_new.cb_soc2_desc")} checked={soc2} onChange={setSoc2} />
                <CheckboxField label={t("sup_new.cb_pen")} description={t("sup_new.cb_pen_desc")} checked={pen} onChange={setPen} />
            </Section>

            <Section title={t("sup_new.section_notes")}>
                <Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
            </Section>
        </FormShell>
    );
}
