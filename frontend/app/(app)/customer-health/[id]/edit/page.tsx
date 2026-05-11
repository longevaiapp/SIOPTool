"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useClient } from "@/lib/hooks/use-resources";
import { toMockClient } from "@/lib/adapters";
import { FormShell, Section, Field, Row2, Input, Select } from "@/components/shared/FormShell";
import { useToast } from "@/components/shared/ToastProvider";
import { clientsApi } from "@/lib/api";
import { useT } from "@/lib/i18n";

export default function EditClientPage() {
    const t = useT();
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const id = params.id as string;
    const { data: rawClient } = useClient(id);
    const client = rawClient ? toMockClient(rawClient) : null;

    const [name, setName] = useState("");
    const [industry, setIndustry] = useState("");
    const [size, setSize] = useState("startup");
    const [tier, setTier] = useState("bronze");
    const [contactName, setContactName] = useState("");
    const [contactEmail, setContactEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [location, setLocation] = useState("");
    const [arr, setArr] = useState("0");
    const [healthScore, setHealthScore] = useState("0");
    const [nps, setNps] = useState("0");

    useEffect(() => {
        if (!client) return;
        setName(client.name); setIndustry(client.industry); setSize(client.size); setTier(client.tier);
        setContactName(client.contact_name); setContactEmail(client.contact_email);
        setPhone(client.phone); setLocation(client.location);
        setArr(String(client.arr)); setHealthScore(String(client.health_score));
        setNps(String(client.nps));
    }, [client]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const segmentMap: Record<string, "STRATEGIC" | "GROWTH" | "LONG_TAIL"> = {
                platinum: "STRATEGIC", gold: "STRATEGIC", silver: "GROWTH", bronze: "LONG_TAIL",
            };
            await clientsApi.update(id, {
                name,
                industry: industry || undefined,
                segment: segmentMap[tier] || "GROWTH",
                health_score: parseInt(healthScore) || undefined,
                arr: parseFloat(arr) || undefined,
                nps: parseInt(nps) || undefined,
                primary_contact_name: contactName || undefined,
                primary_contact_email: contactEmail || undefined,
                notes: location ? `Location: ${location}` : undefined,
            });
            toast({ title: t("ch_e.toast_updated"), description: t("ch_e.toast_saved", { n: name }), variant: "success" });
            router.push(`/customer-health/${id}`);
        } catch (e) {
            toast({ title: t("common.error"), description: (e as Error).message, variant: "error" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!client) return <div className="p-6 text-[13px] text-[#8e8e93]">{t("ch_e.loading")}</div>;

    return (
        <FormShell
            moduleCode={`M-06 · Client · ${client.id}`}
            moduleColor="#e11d48"
            backHref={`/customer-health/${client.id}`}
            backLabel={t("ch_e.back")}
            title={t("ch_e.title", { name: client.name })}
            onSubmit={handleSubmit}
            submitLabel={t("ch_e.save")}
        >
            <Section title={t("ch_e.sec_company")}>
                <Row2>
                    <Field label={t("ch_e.f_name")} required>
                        <Input value={name} onChange={e => setName(e.target.value)} />
                    </Field>
                    <Field label={t("ch_e.f_industry")}>
                        <Input value={industry} onChange={e => setIndustry(e.target.value)} />
                    </Field>
                </Row2>
                <Row2>
                    <Field label={t("ch_e.f_size")}>
                        <Select value={size} onChange={e => setSize(e.target.value)}>
                            <option value="startup">{t("ch_e.sz_startup")}</option>
                            <option value="mid">{t("ch_e.sz_mid")}</option>
                            <option value="enterprise">{t("ch_e.sz_enterprise")}</option>
                        </Select>
                    </Field>
                    <Field label={t("ch_e.f_tier")}>
                        <Select value={tier} onChange={e => setTier(e.target.value)}>
                            <option value="bronze">{t("ch_e.t_bronze")}</option>
                            <option value="silver">{t("ch_e.t_silver")}</option>
                            <option value="gold">{t("ch_e.t_gold")}</option>
                            <option value="platinum">{t("ch_e.t_platinum")}</option>
                        </Select>
                    </Field>
                </Row2>
                <Field label={t("ch_e.f_location")}>
                    <Input value={location} onChange={e => setLocation(e.target.value)} />
                </Field>
            </Section>

            <Section title={t("ch_e.sec_contact")}>
                <Row2>
                    <Field label={t("ch_e.f_name")} required>
                        <Input value={contactName} onChange={e => setContactName(e.target.value)} />
                    </Field>
                    <Field label={t("ch_e.f_email")}>
                        <Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
                    </Field>
                </Row2>
                <Field label={t("ch_e.f_phone")}>
                    <Input value={phone} onChange={e => setPhone(e.target.value)} />
                </Field>
            </Section>

            <Section title={t("ch_e.sec_health")}>
                <Row2>
                    <Field label={t("ch_e.f_score")}>
                        <Input type="number" min="0" max="100" value={healthScore} onChange={e => setHealthScore(e.target.value)} />
                    </Field>
                    <Field label={t("ch_e.f_nps")}>
                        <Input type="number" min="0" max="100" value={nps} onChange={e => setNps(e.target.value)} />
                    </Field>
                </Row2>
                <Field label={t("ch_e.f_arr")}>
                    <Input type="number" value={arr} onChange={e => setArr(e.target.value)} />
                </Field>
            </Section>
        </FormShell>
    );
}
