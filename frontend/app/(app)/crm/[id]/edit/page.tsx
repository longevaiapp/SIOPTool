"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDeal, useClients } from "@/lib/hooks/use-resources";
import { dealsApi } from "@/lib/api";
import { toMockDeal } from "@/lib/adapters";
import { FormShell, Section, Field, Row2, Input, Textarea, Select } from "@/components/shared/FormShell";
import { useToast } from "@/components/shared/ToastProvider";
import { useT } from "@/lib/i18n";

export default function EditDealPage() {
    const t = useT();
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const id = params.id as string;
    const { data: rawDeal, mutate } = useDeal(id);
    const { data: clientsData } = useClients();
    const deal = rawDeal ? toMockDeal(rawDeal) : null;

    const [name, setName] = useState("");
    const [clientId, setClientId] = useState("");
    const [value, setValue] = useState("0");
    const [stage, setStage] = useState("Qualified Lead");
    const [type, setType] = useState("");
    const [owner, setOwner] = useState("");
    const [expectedClose, setExpectedClose] = useState("");
    const [notes, setNotes] = useState("");
    const [nextAction, setNextAction] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!deal) return;
        setName(deal.name); setClientId(deal.client_id); setValue(String(deal.value));
        setStage(deal.stage); setType(deal.type); setOwner(deal.owner);
        setExpectedClose(deal.expected_close); setNotes(deal.notes); setNextAction(deal.next_action);
    }, [deal]);

    const handleSubmit = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        
        try {
            await dealsApi.update(id, {
                client_id: clientId,
                client_name: name,
                deal_type: type || null,
                stage,
                value: parseFloat(value) || 0,
                owner: owner || null,
                expected_close: expectedClose || null,
                notes: notes || null,
                next_action: nextAction || null,
            });
            await mutate();
            toast({ title: t("crm_e.toast_updated"), description: t("crm_e.toast_saved", { n: name }), variant: "success" });
            router.push(`/crm/${id}`);
        } catch (error) {
            console.error("Failed to update deal:", error);
            toast({ title: t("common.error"), description: t("crm_e.toast_failed"), variant: "error" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!deal) return <div className="p-6 text-[13px] text-[#8e8e93]">{t("crm_e.loading")}</div>;

    return (
        <FormShell
            moduleCode={`M-01 · CRM · ${deal.id}`}
            moduleColor="#2563eb"
            backHref={`/crm/${deal.id}`}
            backLabel={t("crm_e.back")}
            title={t("crm_e.title", { name: deal.name })}
            subtitle={t("crm_e.subtitle")}
            onSubmit={handleSubmit}
            submitLabel={t("crm_e.save")}
        >
            <Section title={t("crm_e.sec_info")}>
                <Field label={t("crm_e.f_name")} required>
                    <Input value={name} onChange={e => setName(e.target.value)} />
                </Field>
                <Row2>
                    <Field label={t("crm_e.f_client")} required>
                        <Select value={clientId} onChange={e => setClientId(e.target.value)}>
                            {(clientsData ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </Select>
                    </Field>
                    <Field label={t("crm_e.f_type")}>
                        <Input value={type} onChange={e => setType(e.target.value)} />
                    </Field>
                </Row2>
                <Row2>
                    <Field label={t("crm_e.f_value")}>
                        <Input type="number" value={value} onChange={e => setValue(e.target.value)} />
                    </Field>
                    <Field label={t("crm_e.f_stage")}>
                        <Select value={stage} onChange={e => setStage(e.target.value)}>
                            {["Qualified Lead", "Discovery", "RFQ Submitted", "Demo Done", "Proposal Sent", "Negotiation", "Won", "Lost"].map(s => <option key={s} value={s}>{s}</option>)}
                        </Select>
                    </Field>
                </Row2>
                <Row2>
                    <Field label={t("crm_e.f_owner")}>
                        <Input value={owner} onChange={e => setOwner(e.target.value)} />
                    </Field>
                    <Field label={t("crm_e.f_close")}>
                        <Input type="date" value={expectedClose} onChange={e => setExpectedClose(e.target.value)} />
                    </Field>
                </Row2>
            </Section>

            <Section title={t("crm_e.sec_activity")}>
                <Field label={t("crm_e.f_next")}>
                    <Input value={nextAction} onChange={e => setNextAction(e.target.value)} />
                </Field>
                <Field label={t("crm_e.f_notes")}>
                    <Textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)} />
                </Field>
            </Section>
        </FormShell>
    );
}
