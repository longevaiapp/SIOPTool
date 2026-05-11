"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useClients, useDeals, useRfqs } from "@/lib/hooks/use-resources";
import { FormShell, Section, Field, Row2, Input, Textarea, Select } from "@/components/shared/FormShell";
import { useToast } from "@/components/shared/ToastProvider";
import { quotesApi } from "@/lib/api";
import { useT } from "@/lib/i18n";

export default function NewQuotePage() {
    const t = useT();
    const router = useRouter();
    const { toast } = useToast();
    const { data: clientsData } = useClients();
    const { data: dealsData } = useDeals();
    const { data: rfqsData } = useRfqs();

    const [clientId, setClientId] = useState("");
    const [dealId, setDealId] = useState("");
    const [rfqId, setRfqId] = useState("");
    const [currency, setCurrency] = useState("MXN");
    const [subtotal, setSubtotal] = useState("");
    const [taxRate, setTaxRate] = useState("16");
    const [validUntil, setValidUntil] = useState("");
    const [terms, setTerms] = useState("Validez: 30 días. Precios en MXN antes de IVA.");
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const sub = parseFloat(subtotal) || 0;
    const tr = parseFloat(taxRate) || 0;
    const tax = +(sub * tr / 100).toFixed(2);
    const total = +(sub + tax).toFixed(2);

    const handleSubmit = async () => {
        if (!sub) {
            toast({ title: t("co_form.toast_validation"), description: t("quote_new.toast_required"), variant: "warning" });
            return;
        }
        setSubmitting(true);
        try {
            const created = await quotesApi.create({
                client_id: clientId || undefined,
                deal_id: dealId || undefined,
                rfq_session_id: rfqId || undefined,
                currency,
                subtotal: sub as unknown as number,
                tax_rate: tr as unknown as number,
                tax: tax as unknown as number,
                total: total as unknown as number,
                valid_until: validUntil || undefined,
                terms: terms || undefined,
                notes: notes || undefined,
                status: "draft",
            });
            toast({ title: t("quote_new.toast_created"), description: t("quote_new.toast_folio", { folio: created.folio }), variant: "success" });
            router.push(`/quotes/${created.id}`);
        } catch (e) {
            toast({ title: "Error", description: (e as Error).message, variant: "error" });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <FormShell
            moduleCode={t("quote_new.module")}
            moduleColor="#34c759"
            backHref="/quotes"
            backLabel={t("quote_new.back")}
            title={t("quote_new.title")}
            subtitle={t("quote_new.subtitle")}
            onSubmit={handleSubmit}
            submitLabel={submitting ? t("quote_new.creating") : t("quote_new.submit")}
        >
            <Section title={t("quote_new.section_client")}>
                <Row2>
                    <Field label={t("quote_new.field_client")}>
                        <Select value={clientId} onChange={e => setClientId(e.target.value)}>
                            <option value="">{t("quote_new.opt_select_client")}</option>
                            {(clientsData ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </Select>
                    </Field>
                    <Field label={t("quote_new.field_deal")}>
                        <Select value={dealId} onChange={e => setDealId(e.target.value)}>
                            <option value="">{t("quote_new.opt_no_deal")}</option>
                            {(dealsData ?? []).map(d => <option key={d.id} value={d.id}>{d.client_name ?? d.id.slice(0, 8)}</option>)}
                        </Select>
                    </Field>
                </Row2>
                <Field label={t("quote_new.field_rfq")}>
                    <Select value={rfqId} onChange={e => setRfqId(e.target.value)}>
                        <option value="">{t("quote_new.opt_no_rfq")}</option>
                        {(rfqsData ?? []).map(r => <option key={r.id} value={r.id}>{r.id.slice(0, 8).toUpperCase()}</option>)}
                    </Select>
                </Field>
            </Section>

            <Section title={t("quote_new.section_amounts")}>
                <Row2>
                    <Field label={t("quote_new.field_currency")}>
                        <Select value={currency} onChange={e => setCurrency(e.target.value)}>
                            <option value="MXN">MXN — Pesos mexicanos</option>
                            <option value="USD">USD — Dólares</option>
                            <option value="EUR">EUR — Euros</option>
                        </Select>
                    </Field>
                    <Field label={t("quote_new.field_subtotal")} required>
                        <Input type="number" step="0.01" value={subtotal} onChange={e => setSubtotal(e.target.value)} placeholder="100000" />
                    </Field>
                </Row2>
                <Row2>
                    <Field label={t("quote_new.field_tax")}>
                        <Input type="number" step="0.01" value={taxRate} onChange={e => setTaxRate(e.target.value)} />
                    </Field>
                    <Field label={t("quote_new.field_valid")}>
                        <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
                    </Field>
                </Row2>
                <div className="rounded-xl border border-[#34c759]/20 bg-[#34c759]/5 p-4">
                    <div className="flex justify-between text-[13px]">
                        <span className="text-[#8e8e93]">{t("quote_new.field_subtotal")}:</span>
                        <span className="font-semibold">{sub.toFixed(2)} {currency}</span>
                    </div>
                    <div className="flex justify-between text-[13px]">
                        <span className="text-[#8e8e93]">{t("quote_new.tax_label")} ({tr}%):</span>
                        <span className="font-semibold">{tax.toFixed(2)} {currency}</span>
                    </div>
                    <div className="mt-2 flex justify-between border-t border-[#34c759]/20 pt-2 text-[16px] font-bold">
                        <span>{t("quote_new.total")}:</span>
                        <span className="text-[#34c759]">{total.toFixed(2)} {currency}</span>
                    </div>
                </div>
            </Section>

            <Section title={t("quote_new.section_terms")}>
                <Field label={t("quote_new.field_terms")}>
                    <Textarea rows={3} value={terms} onChange={e => setTerms(e.target.value)} />
                </Field>
                <Field label={t("quote_new.field_notes")}>
                    <Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder={t("quote_new.ph_notes")} />
                </Field>
            </Section>
        </FormShell>
    );
}
