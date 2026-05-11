"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormShell, Section, Field, Row2, Input, Textarea, Select } from "@/components/shared/FormShell";
import { useToast } from "@/components/shared/ToastProvider";
import { clientsApi } from "@/lib/api";
import { useT } from "@/lib/i18n";

export default function NewClientPage() {
    const t = useT();
    const router = useRouter();
    const { toast } = useToast();
    const [name, setName] = useState("");
    const [industry, setIndustry] = useState("");
    const [size, setSize] = useState("mid");
    const [tier, setTier] = useState("silver");
    const [contactName, setContactName] = useState("");
    const [contactEmail, setContactEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [location, setLocation] = useState("");
    const [arr, setArr] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!name || !contactName) {
            toast({ title: t("co_form.toast_validation"), description: t("ch_new.toast_required"), variant: "warning" });
            return;
        }
        setIsSubmitting(true);
        try {
            const segmentMap: Record<string, "STRATEGIC" | "GROWTH" | "LONG_TAIL"> = {
                platinum: "STRATEGIC", gold: "STRATEGIC", silver: "GROWTH", bronze: "LONG_TAIL",
            };
            await clientsApi.create({
                name,
                industry: industry || undefined,
                segment: segmentMap[tier] || "GROWTH",
                status: "ACTIVE",
                health_score: 75,
                arr: arr ? parseFloat(arr) : undefined,
                primary_contact_name: contactName,
                primary_contact_email: contactEmail || undefined,
                notes: location ? `Location: ${location}` : undefined,
            });
            toast({ title: t("ch_new.toast_added"), description: t("ch_new.toast_onboarded", { name }), variant: "success" });
            router.push("/customer-health");
        } catch (e) {
            toast({ title: "Error", description: (e as Error).message, variant: "error" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <FormShell
            moduleCode="M-06 · Customer Health"
            moduleColor="#e11d48"
            backHref="/customer-health"
            backLabel="Customer Health"
            title={t("ch_new.title")}
            subtitle={t("ch_new.subtitle")}
            onSubmit={handleSubmit}
            submitLabel={t("ch_new.submit")}
            sidebar={
                <Section title={t("ch_new.section_next")}>
                    <ol className="space-y-2 text-[12px] text-[#1d1d1f]">
                        <li>1. {t("ch_new.next_1")}</li>
                        <li>2. {t("ch_new.next_2")}</li>
                        <li>3. {t("ch_new.next_3")}</li>
                        <li>4. {t("ch_new.next_4")}</li>
                        <li>5. {t("ch_new.next_5")}</li>
                    </ol>
                </Section>
            }
        >
            <Section title={t("ch_new.section_company")}>
                <Row2>
                    <Field label={t("ch_new.field_company")} required>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Acme Health Corp" />
                    </Field>
                    <Field label={t("ch_new.field_industry")}>
                        <Input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="Hospital Network, Pharma..." />
                    </Field>
                </Row2>
                <Row2>
                    <Field label={t("ch_new.field_size")}>
                        <Select value={size} onChange={e => setSize(e.target.value)}>
                            <option value="startup">{t("ch_new.opt_startup")}</option>
                            <option value="mid">{t("ch_new.opt_mid")}</option>
                            <option value="enterprise">{t("ch_new.opt_ent")}</option>
                        </Select>
                    </Field>
                    <Field label={t("ch_new.field_tier")} hint="">
                        <Select value={tier} onChange={e => setTier(e.target.value)}>
                            <option value="bronze">Bronze</option>
                            <option value="silver">Silver</option>
                            <option value="gold">Gold</option>
                            <option value="platinum">Platinum</option>
                        </Select>
                    </Field>
                </Row2>
                <Field label={t("ch_new.field_location")}>
                    <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="San Francisco, CA" />
                </Field>
            </Section>

            <Section title={t("ch_new.section_contact")}>
                <Row2>
                    <Field label={t("sup_new.field_name")} required>
                        <Input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Dr. Jane Smith" />
                    </Field>
                    <Field label={t("sup_new.field_email")} required>
                        <Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="jsmith@company.com" />
                    </Field>
                </Row2>
                <Field label={t("ch_new.field_phone")}>
                    <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 415 555 0100" />
                </Field>
            </Section>

            <Section title={t("ch_new.section_commercial")}>
                <Field label={t("ch_new.field_arr")} hint={t("ch_new.field_arr_hint")}>
                    <Input type="number" value={arr} onChange={e => setArr(e.target.value)} placeholder="0" />
                </Field>
            </Section>
        </FormShell>
    );
}
