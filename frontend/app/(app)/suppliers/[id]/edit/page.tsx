"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSupplier } from "@/lib/hooks/use-resources";
import { toMockSupplier } from "@/lib/adapters";
import { FormShell, Section, Field, Row2, Input, Select } from "@/components/shared/FormShell";
import { useToast } from "@/components/shared/ToastProvider";
import { suppliersApi } from "@/lib/api";
import { useT } from "@/lib/i18n";

export default function EditSupplierPage() {
    const t = useT();
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const id = params.id as string;
    const { data: rawSup } = useSupplier(id);
    const sup = rawSup ? toMockSupplier(rawSup) : null;

    const [name, setName] = useState("");
    const [category, setCategory] = useState("infrastructure");
    const [status, setStatus] = useState("active");
    const [rating, setRating] = useState("0");
    const [contact, setContact] = useState("");
    const [services, setServices] = useState("");
    const [contractEnd, setContractEnd] = useState("");
    const [riskLevel, setRiskLevel] = useState("low");
    const [spend, setSpend] = useState("0");

    useEffect(() => {
        if (!sup) return;
        setName(sup.name); setCategory(sup.category); setStatus(sup.status);
        setRating(String(sup.rating)); setContact(sup.contact);
        setServices(sup.services.join(", "));
        setContractEnd(sup.contract_end === "-" ? "" : sup.contract_end);
        setRiskLevel(sup.risk_level); setSpend(String(sup.spend_ytd));
    }, [sup]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await suppliersApi.update(id, {
                name,
                category,
                status: status.toUpperCase(),
                risk_level: riskLevel,
                contact_name: contact || undefined,
                spend_ytd: parseFloat(spend) || undefined,
                performance_score: parseFloat(rating) || undefined,
            });
            toast({ title: t("sup_e.toast_updated"), description: t("sup_e.toast_saved", { n: name }), variant: "success" });
            router.push(`/suppliers/${id}`);
        } catch (e) {
            toast({ title: t("common.error"), description: (e as Error).message, variant: "error" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!sup) return <div className="p-6 text-[13px] text-[#8e8e93]">{t("sup_e.loading")}</div>;

    return (
        <FormShell
            moduleCode={`M-08 · Supplier · ${sup.id}`}
            moduleColor="#4f46e5"
            backHref={`/suppliers/${sup.id}`}
            backLabel={t("sup_e.back")}
            title={t("sup_e.title", { name: sup.name })}
            onSubmit={handleSubmit}
            submitLabel={t("sup_e.save")}
        >
            <Section title={t("sup_e.sec_details")}>
                <Row2>
                    <Field label={t("sup_e.f_name")} required>
                        <Input value={name} onChange={e => setName(e.target.value)} />
                    </Field>
                    <Field label={t("sup_e.f_category")}>
                        <Select value={category} onChange={e => setCategory(e.target.value)}>
                            <option value="infrastructure">{t("sup_e.c_infra")}</option>
                            <option value="ml_ops">{t("sup_e.c_ml")}</option>
                            <option value="consulting">{t("sup_e.c_consulting")}</option>
                            <option value="data">{t("sup_e.c_data")}</option>
                            <option value="security">{t("sup_e.c_security")}</option>
                        </Select>
                    </Field>
                </Row2>
                <Row2>
                    <Field label={t("sup_e.f_status")}>
                        <Select value={status} onChange={e => setStatus(e.target.value)}>
                            <option value="active">{t("sup_e.s_active")}</option>
                            <option value="evaluation">{t("sup_e.s_eval")}</option>
                            <option value="inactive">{t("sup_e.s_inactive")}</option>
                        </Select>
                    </Field>
                    <Field label={t("sup_e.f_risk")}>
                        <Select value={riskLevel} onChange={e => setRiskLevel(e.target.value)}>
                            <option value="low">{t("sup_e.r_low")}</option>
                            <option value="medium">{t("sup_e.r_medium")}</option>
                            <option value="high">{t("sup_e.r_high")}</option>
                        </Select>
                    </Field>
                </Row2>
                <Field label={t("sup_e.f_services")} hint={t("sup_e.f_services_hint")}>
                    <Input value={services} onChange={e => setServices(e.target.value)} />
                </Field>
            </Section>

            <Section title={t("sup_e.sec_perf")}>
                <Row2>
                    <Field label={t("sup_e.f_rating")}>
                        <Input type="number" step="0.1" min="0" max="5" value={rating} onChange={e => setRating(e.target.value)} />
                    </Field>
                    <Field label={t("sup_e.f_spend")}>
                        <Input type="number" value={spend} onChange={e => setSpend(e.target.value)} />
                    </Field>
                </Row2>
                <Row2>
                    <Field label={t("sup_e.f_contract_end")}>
                        <Input type="date" value={contractEnd} onChange={e => setContractEnd(e.target.value)} />
                    </Field>
                    <Field label={t("sup_e.f_contact")}>
                        <Input value={contact} onChange={e => setContact(e.target.value)} />
                    </Field>
                </Row2>
            </Section>
        </FormShell>
    );
}
