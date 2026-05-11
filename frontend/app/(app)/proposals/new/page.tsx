"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useClients, useDeals, useRfqs, useQuotes } from "@/lib/hooks/use-resources";
import { FormShell, Section, Field, Row2, Input, Textarea, Select } from "@/components/shared/FormShell";
import { useToast } from "@/components/shared/ToastProvider";
import { proposalsApi } from "@/lib/api";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { useT } from "@/lib/i18n";

export default function NewProposalPage() {
    return (
        <Suspense fallback={<div className="p-6"><LoadingSkeleton rows={6} type="card" /></div>}>
            <NewProposalInner />
        </Suspense>
    );
}

function NewProposalInner() {
    const t = useT();
    const router = useRouter();
    const sp = useSearchParams();
    const { toast } = useToast();
    const { data: clients } = useClients();
    const { data: deals } = useDeals();
    const { data: rfqs } = useRfqs();
    const { data: quotes } = useQuotes();

    const [title, setTitle] = useState("");
    const [clientId, setClientId] = useState("");
    const [dealId, setDealId] = useState("");
    const [rfqId, setRfqId] = useState("");
    const [quoteId, setQuoteId] = useState(sp.get("from_quote") ?? "");
    const [model, setModel] = useState<"FIXED_PRICE" | "TM" | "RETAINER" | "VALUE_BASED">("FIXED_PRICE");
    const [summary, setSummary] = useState("");
    const [scope, setScope] = useState("");
    const [approach, setApproach] = useState("");
    const [timeline, setTimeline] = useState("");
    const [team, setTeam] = useState("");
    const [assumptions, setAssumptions] = useState("");
    const [terms, setTerms] = useState("");
    const [validUntil, setValidUntil] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!title) {
            toast({ title: t("co_form.toast_validation"), description: t("prop_new.toast_required"), variant: "warning" });
            return;
        }
        setSubmitting(true);
        try {
            const created = await proposalsApi.create({
                title,
                client_id: clientId || undefined,
                deal_id: dealId || undefined,
                rfq_session_id: rfqId || undefined,
                quote_id: quoteId || undefined,
                commercial_model: model,
                executive_summary: summary || undefined,
                scope_md: scope || undefined,
                approach_md: approach || undefined,
                timeline_md: timeline || undefined,
                team_md: team || undefined,
                assumptions_md: assumptions || undefined,
                terms_md: terms || undefined,
                valid_until: validUntil || undefined,
                status: "draft",
                version: 1,
            });
            toast({ title: t("prop_new.toast_created"), description: t("prop_new.toast_folio", { folio: created.folio }), variant: "success" });
            router.push(`/proposals/${created.id}`);
        } catch (e) {
            toast({ title: "Error", description: (e as Error).message, variant: "error" });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <FormShell
            moduleCode={t("prop_new.module")}
            moduleColor="#5e5ce6"
            backHref="/proposals"
            backLabel={t("prop_new.back")}
            title={t("prop_new.title")}
            subtitle={t("prop_new.subtitle")}
            onSubmit={handleSubmit}
            submitLabel={submitting ? t("prop_new.creating") : t("prop_new.submit")}
        >
            <Section title={t("prop_new.section_header")}>
                <Field label={t("prop_new.field_title")} required>
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t("prop_new.ph_title")} />
                </Field>
                <Row2>
                    <Field label={t("prop_new.field_client")}>
                        <Select value={clientId} onChange={e => setClientId(e.target.value)}>
                            <option value="">{t("prop_new.opt_select")}</option>
                            {(clients ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </Select>
                    </Field>
                    <Field label={t("prop_new.field_model")}>
                        <Select value={model} onChange={e => setModel(e.target.value as typeof model)}>
                            <option value="FIXED_PRICE">{t("prop_new.opt_fp")}</option>
                            <option value="TM">{t("prop_new.opt_tm")}</option>
                            <option value="RETAINER">{t("prop_new.opt_ret")}</option>
                            <option value="VALUE_BASED">{t("prop_new.opt_vb")}</option>
                        </Select>
                    </Field>
                </Row2>
                <Row2>
                    <Field label={t("prop_new.field_deal")}>
                        <Select value={dealId} onChange={e => setDealId(e.target.value)}>
                            <option value="">{t("prop_new.opt_no_deal")}</option>
                            {(deals ?? []).map(d => <option key={d.id} value={d.id}>{d.client_name ?? d.id.slice(0, 8)}</option>)}
                        </Select>
                    </Field>
                    <Field label={t("prop_new.field_rfq")}>
                        <Select value={rfqId} onChange={e => setRfqId(e.target.value)}>
                            <option value="">{t("prop_new.opt_no_rfq")}</option>
                            {(rfqs ?? []).map(r => <option key={r.id} value={r.id}>{r.id.slice(0, 8).toUpperCase()}</option>)}
                        </Select>
                    </Field>
                </Row2>
                <Row2>
                    <Field label={t("prop_new.field_quote")}>
                        <Select value={quoteId} onChange={e => setQuoteId(e.target.value)}>
                            <option value="">{t("prop_new.opt_no_quote")}</option>
                            {(quotes ?? []).map(q => <option key={q.id} value={q.id}>{q.folio}</option>)}
                        </Select>
                    </Field>
                    <Field label={t("prop_new.field_valid")}>
                        <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
                    </Field>
                </Row2>
            </Section>

            <Section title={t("prop_new.section_md")} description={t("prop_new.section_md_desc")}>
                <Field label={t("prop_new.field_summary")}>
                    <Textarea rows={3} value={summary} onChange={e => setSummary(e.target.value)} />
                </Field>
                <Field label={t("prop_new.field_scope")}>
                    <Textarea rows={5} value={scope} onChange={e => setScope(e.target.value)} placeholder="- Frontend Next.js&#10;- Backend FastAPI&#10;- Integraciones..." />
                </Field>
                <Field label={t("prop_new.field_approach")}>
                    <Textarea rows={4} value={approach} onChange={e => setApproach(e.target.value)} />
                </Field>
                <Row2>
                    <Field label={t("prop_new.field_timeline")}>
                        <Textarea rows={4} value={timeline} onChange={e => setTimeline(e.target.value)} placeholder="Fase 1 — 4 semanas..." />
                    </Field>
                    <Field label={t("prop_new.field_team")}>
                        <Textarea rows={4} value={team} onChange={e => setTeam(e.target.value)} placeholder="1 PM, 2 Sr Devs, 1 QA..." />
                    </Field>
                </Row2>
                <Field label={t("prop_new.field_assumptions")}>
                    <Textarea rows={3} value={assumptions} onChange={e => setAssumptions(e.target.value)} />
                </Field>
                <Field label={t("prop_new.field_terms")}>
                    <Textarea rows={3} value={terms} onChange={e => setTerms(e.target.value)} />
                </Field>
            </Section>
        </FormShell>
    );
}
