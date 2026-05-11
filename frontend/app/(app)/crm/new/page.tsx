"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ModuleHeader } from "@/components/shared";
import { useToast } from "@/components/shared/ToastProvider";
import { useClients } from "@/lib/hooks/use-resources";
import { dealsApi, clientsApi } from "@/lib/api";
import { useT } from "@/lib/i18n";

/* ══════════════════════════════════════════════════════════════════════════
   💼 NEW DEAL — Manual Entry Form for CRM
   ══════════════════════════════════════════════════════════════════════════ */

const STAGES = [
    { value: "prospect", label: "🎯 Prospect", description: "Initial contact" },
    { value: "qualified_lead", label: "✅ Qualified Lead", description: "BANT qualified" },
    { value: "discovery", label: "🔍 Discovery", description: "Understanding needs" },
    { value: "demo_done", label: "🎬 Demo Done", description: "Product demonstrated" },
    { value: "rfq_submitted", label: "📋 RFQ Submitted", description: "Formal proposal" },
    { value: "proposal_sent", label: "📤 Proposal Sent", description: "Pricing delivered" },
    { value: "negotiation", label: "🤝 Negotiation", description: "Terms discussion" },
    { value: "closed_won", label: "🏆 Closed Won", description: "Deal won!" },
    { value: "closed_lost", label: "❌ Closed Lost", description: "Deal lost" },
];

const DEAL_TYPES = [
    { value: "platform", label: "Platform", description: "Full platform implementation" },
    { value: "custom_ml", label: "Custom ML", description: "Custom ML/AI models" },
    { value: "integration", label: "Integration", description: "System integrations" },
    { value: "consulting", label: "Consulting", description: "Advisory services" },
    { value: "ai_model", label: "AI Model", description: "Pre-built AI models" },
    { value: "retainer", label: "Retainer", description: "Ongoing support" },
];

const COMMERCIAL_MODELS = [
    { value: "fixed_price", label: "Fixed Price" },
    { value: "time_materials", label: "Time & Materials" },
    { value: "retainer", label: "Retainer" },
    { value: "value_based", label: "Value-Based" },
];

const INDUSTRIES = [
    { value: "healthcare", label: "Healthcare" },
    { value: "biotech", label: "Biotech" },
    { value: "pharma", label: "Pharma" },
    { value: "medtech", label: "MedTech" },
    { value: "diagnostics", label: "Diagnostics" },
    { value: "life_sciences", label: "Life Sciences" },
    { value: "other", label: "Other" },
];

export default function NewDealPage() {
    const t = useT();
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        // Client Info
        client_name: "",
        contact_name: "",
        contact_email: "",
        contact_title: "",
        industry: "",
        company_size: "",
        
        // Deal Info
        deal_name: "",
        deal_type: "",
        stage: "prospect",
        commercial_model: "fixed_price",
        
        // Financials
        value: "",
        probability: "25",
        
        // Discovery
        pain_points: "",
        requirements: "",
        timeline: "",
        competition: "",
        decision_makers: "",
        
        // Notes
        notes: "",
    });

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.client_name.trim()) {
            toast({ title: "Error", description: t("deal_form.toast_company_required"), variant: "error" });
            return;
        }
        
        setIsSubmitting(true);

        try {
            // 1. Create client first (or find existing)
            const clientPayload = {
                name: formData.client_name,
                industry: formData.industry || null,
                contact_name: formData.contact_name || null,
                contact_email: formData.contact_email || null,
                status: "active",
                notes: formData.notes || null,
            };
            
            const client = await clientsApi.create(clientPayload);

            // 2. Create deal linked to the client
            const dealPayload = {
                client_id: client.id,
                client_name: formData.client_name,
                deal_type: formData.deal_type || null,
                stage: formData.stage || "prospect",
                value: parseFloat(formData.value) || 0,
                probability: parseInt(formData.probability) || 25,
                commercial_model: formData.commercial_model || null,
                notes: [
                    formData.pain_points && `Pain Points: ${formData.pain_points}`,
                    formData.requirements && `Requirements: ${formData.requirements}`,
                    formData.timeline && `Timeline: ${formData.timeline}`,
                    formData.competition && `Competition: ${formData.competition}`,
                    formData.decision_makers && `Decision Makers: ${formData.decision_makers}`,
                    formData.notes,
                ].filter(Boolean).join("\n\n") || null,
                next_action: "Schedule discovery call",
            };

            await dealsApi.create(dealPayload);

            toast({ 
                title: t("deal_form.toast_created"), 
                description: t("deal_form.toast_added", { name: formData.deal_name || formData.client_name }), 
                variant: "success" 
            });

            router.push("/crm");
        } catch (error) {
            console.error("Failed to create deal:", error);
            toast({ 
                title: "Error", 
                description: t("deal_form.toast_failed"), 
                variant: "error" 
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const estimatedValue = parseFloat(formData.value) || 0;
    const probability = parseInt(formData.probability) || 25;
    const weightedValue = (estimatedValue * probability) / 100;

    return (
        <div className="p-6">
            <ModuleHeader
                title={t("deal_form.title")}
                subtitle={t("deal_form.subtitle")}
                color="#007aff"
            />

            {/* Back Link */}
            <Link
                href="/crm"
                className="mb-6 inline-flex items-center gap-2 text-[13px] text-[#007aff] hover:underline"
            >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                {t("deal_form.back")}
            </Link>

            <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
                {/* Main Form */}
                <div className="space-y-6 lg:col-span-2">
                    {/* Client Information */}
                    <div className="glass-card p-5">
                        <h3 className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-[#1d1d1f]">
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#007aff]/10 text-[12px]">🏢</span>
                            {t("deal_form.section_client")}
                        </h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label className="mb-1.5 block text-[12px] font-medium text-[#1d1d1f]">
                                    {t("deal_form.field_company")} <span className="text-[#ff453a]">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.client_name}
                                    onChange={(e) => handleChange("client_name", e.target.value)}
                                    placeholder="e.g., GenomicsCo, HealthTech Labs"
                                    className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-2.5 text-[13px] text-[#1d1d1f] placeholder-[#c7c7cc] transition-all focus:border-[#007aff] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007aff]/20"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[12px] font-medium text-[#1d1d1f]">
                                    {t("deal_form.field_contact_name")} <span className="text-[#ff453a]">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.contact_name}
                                    onChange={(e) => handleChange("contact_name", e.target.value)}
                                    placeholder="Maria Chen"
                                    className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-2.5 text-[13px] text-[#1d1d1f] placeholder-[#c7c7cc] transition-all focus:border-[#007aff] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007aff]/20"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[12px] font-medium text-[#1d1d1f]">
                                    {t("deal_form.field_contact_email")}
                                </label>
                                <input
                                    type="email"
                                    value={formData.contact_email}
                                    onChange={(e) => handleChange("contact_email", e.target.value)}
                                    placeholder="maria@company.com"
                                    className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-2.5 text-[13px] text-[#1d1d1f] placeholder-[#c7c7cc] transition-all focus:border-[#007aff] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007aff]/20"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[12px] font-medium text-[#1d1d1f]">
                                    {t("deal_form.field_contact_title")}
                                </label>
                                <input
                                    type="text"
                                    value={formData.contact_title}
                                    onChange={(e) => handleChange("contact_title", e.target.value)}
                                    placeholder="VP Engineering"
                                    className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-2.5 text-[13px] text-[#1d1d1f] placeholder-[#c7c7cc] transition-all focus:border-[#007aff] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007aff]/20"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[12px] font-medium text-[#1d1d1f]">
                                    {t("deal_form.field_industry")}
                                </label>
                                <select
                                    value={formData.industry}
                                    onChange={(e) => handleChange("industry", e.target.value)}
                                    className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-2.5 text-[13px] text-[#1d1d1f] focus:border-[#007aff] focus:outline-none"
                                >
                                    <option value="">{t("deal_form.opt_select_industry")}</option>
                                    {INDUSTRIES.map(ind => (
                                        <option key={ind.value} value={ind.value}>{ind.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Deal Information */}
                    <div className="glass-card p-5">
                        <h3 className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-[#1d1d1f]">
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#30d158]/10 text-[12px]">💼</span>
                            {t("deal_form.section_deal")}
                        </h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label className="mb-1.5 block text-[12px] font-medium text-[#1d1d1f]">
                                    {t("deal_form.field_deal_name")} <span className="text-[#ff453a]">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.deal_name}
                                    onChange={(e) => handleChange("deal_name", e.target.value)}
                                    placeholder="e.g., NLP Clinical Suite, FHIR Integration"
                                    className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-2.5 text-[13px] text-[#1d1d1f] placeholder-[#c7c7cc] transition-all focus:border-[#007aff] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007aff]/20"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[12px] font-medium text-[#1d1d1f]">
                                    {t("deal_form.field_deal_type")}
                                </label>
                                <select
                                    value={formData.deal_type}
                                    onChange={(e) => handleChange("deal_type", e.target.value)}
                                    className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-2.5 text-[13px] text-[#1d1d1f] focus:border-[#007aff] focus:outline-none"
                                >
                                    <option value="">{t("deal_form.opt_select_type")}</option>
                                    {DEAL_TYPES.map(type => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[12px] font-medium text-[#1d1d1f]">
                                    {t("deal_form.field_commercial")}
                                </label>
                                <select
                                    value={formData.commercial_model}
                                    onChange={(e) => handleChange("commercial_model", e.target.value)}
                                    className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-2.5 text-[13px] text-[#1d1d1f] focus:border-[#007aff] focus:outline-none"
                                >
                                    {COMMERCIAL_MODELS.map(model => (
                                        <option key={model.value} value={model.value}>{model.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[12px] font-medium text-[#1d1d1f]">
                                    {t("deal_form.field_value")}
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] text-[#8e8e93]">$</span>
                                    <input
                                        type="number"
                                        value={formData.value}
                                        onChange={(e) => handleChange("value", e.target.value)}
                                        placeholder="0"
                                        className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] py-2.5 pl-8 pr-4 text-[13px] text-[#1d1d1f] placeholder-[#c7c7cc] transition-all focus:border-[#007aff] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007aff]/20"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[12px] font-medium text-[#1d1d1f]">
                                    {t("deal_form.field_probability")}
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="5"
                                    value={formData.probability}
                                    onChange={(e) => handleChange("probability", e.target.value)}
                                    className="w-full"
                                />
                                <div className="mt-1 flex justify-between text-[11px] text-[#8e8e93]">
                                    <span>0%</span>
                                    <span className="font-semibold text-[#007aff]">{formData.probability}%</span>
                                    <span>100%</span>
                                </div>
                            </div>
                        </div>

                        {/* Stage Selection */}
                        <div className="mt-4">
                            <label className="mb-2 block text-[12px] font-medium text-[#1d1d1f]">
                                {t("deal_form.field_stage")}
                            </label>
                            <div className="grid gap-2 sm:grid-cols-3">
                                {STAGES.slice(0, 6).map(stage => (
                                    <button
                                        key={stage.value}
                                        type="button"
                                        onClick={() => handleChange("stage", stage.value)}
                                        className={`rounded-xl border p-3 text-left transition-all ${
                                            formData.stage === stage.value
                                                ? "border-[#007aff] bg-[#007aff]/10"
                                                : "border-black/[0.06] bg-black/[0.02] hover:border-black/[0.12]"
                                        }`}
                                    >
                                        <p className="text-[12px] font-semibold text-[#1d1d1f]">{stage.label}</p>
                                        <p className="text-[10px] text-[#8e8e93]">{stage.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Discovery Information */}
                    <div className="glass-card p-5">
                        <h3 className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-[#1d1d1f]">
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#ff9f0a]/10 text-[12px]">🔍</span>
                            {t("deal_form.section_discovery_full")}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="mb-1.5 block text-[12px] font-medium text-[#1d1d1f]">
                                    {t("deal_form.field_pain")}
                                </label>
                                <textarea
                                    rows={3}
                                    value={formData.pain_points}
                                    onChange={(e) => handleChange("pain_points", e.target.value)}
                                    placeholder={t("deal_form.ph_pain")}
                                    className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-2.5 text-[13px] text-[#1d1d1f] placeholder-[#c7c7cc] transition-all focus:border-[#007aff] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007aff]/20"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[12px] font-medium text-[#1d1d1f]">
                                    {t("deal_form.field_reqs")}
                                </label>
                                <textarea
                                    rows={3}
                                    value={formData.requirements}
                                    onChange={(e) => handleChange("requirements", e.target.value)}
                                    placeholder={t("deal_form.ph_reqs")}
                                    className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-2.5 text-[13px] text-[#1d1d1f] placeholder-[#c7c7cc] transition-all focus:border-[#007aff] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007aff]/20"
                                />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1.5 block text-[12px] font-medium text-[#1d1d1f]">
                                        {t("deal_form.field_timeline")}
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.timeline}
                                        onChange={(e) => handleChange("timeline", e.target.value)}
                                        placeholder={t("deal_form.ph_timeline")}
                                        className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-2.5 text-[13px] text-[#1d1d1f] placeholder-[#c7c7cc] transition-all focus:border-[#007aff] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007aff]/20"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-[12px] font-medium text-[#1d1d1f]">
                                        {t("deal_form.field_competition")}
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.competition}
                                        onChange={(e) => handleChange("competition", e.target.value)}
                                        placeholder={t("deal_form.ph_competition")}
                                        className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-2.5 text-[13px] text-[#1d1d1f] placeholder-[#c7c7cc] transition-all focus:border-[#007aff] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007aff]/20"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[12px] font-medium text-[#1d1d1f]">
                                    {t("deal_form.field_decision")}
                                </label>
                                <input
                                    type="text"
                                    value={formData.decision_makers}
                                    onChange={(e) => handleChange("decision_makers", e.target.value)}
                                    placeholder={t("deal_form.ph_decision")}
                                    className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-2.5 text-[13px] text-[#1d1d1f] placeholder-[#c7c7cc] transition-all focus:border-[#007aff] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007aff]/20"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="glass-card p-5">
                        <h3 className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-[#1d1d1f]">
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#8e8e93]/10 text-[12px]">📝</span>
                            {t("deal_form.section_addnotes")}
                        </h3>
                        <textarea
                            rows={4}
                            value={formData.notes}
                            onChange={(e) => handleChange("notes", e.target.value)}
                            placeholder={t("deal_form.ph_notes")}
                            className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-2.5 text-[13px] text-[#1d1d1f] placeholder-[#c7c7cc] transition-all focus:border-[#007aff] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007aff]/20"
                        />
                    </div>
                </div>

                {/* Sidebar Summary */}
                <div className="lg:col-span-1">
                    <div className="glass-card sticky top-6 p-5">
                        <h3 className="mb-4 text-[14px] font-semibold text-[#1d1d1f]">
                            {t("deal_form.summary")}
                        </h3>

                        {/* Preview Card */}
                        <div className="mb-4 rounded-xl bg-gradient-to-br from-[#007aff]/10 to-[#5856d6]/10 p-4">
                            <p className="text-[11px] font-medium uppercase tracking-wider text-[#8e8e93]">
                                {t("deal_form.preview")}
                            </p>
                            <p className="mt-2 text-[16px] font-bold text-[#1d1d1f]">
                                {formData.deal_name || t("deal_form.ph_deal_name")}
                            </p>
                            <p className="text-[12px] text-[#8e8e93]">
                                {formData.client_name || t("deal_form.ph_client_name")}
                            </p>
                        </div>

                        {/* Value Summary */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[12px] text-[#8e8e93]">{t("deal_form.deal_value")}</span>
                                <span className="text-[14px] font-semibold text-[#1d1d1f]">
                                    ${estimatedValue.toLocaleString()}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[12px] text-[#8e8e93]">{t("deal_form.probability")}</span>
                                <span className="text-[14px] font-semibold text-[#007aff]">
                                    {probability}%
                                </span>
                            </div>
                            <div className="border-t border-black/[0.06] pt-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[12px] font-medium text-[#1d1d1f]">{t("deal_form.weighted")}</span>
                                    <span className="text-[16px] font-bold text-[#30d158]">
                                        ${weightedValue.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Stage Badge */}
                        <div className="mt-4 rounded-lg bg-black/[0.03] p-3">
                            <p className="text-[11px] font-medium uppercase tracking-wider text-[#8e8e93]">
                                {t("deal_form.stage_label")}
                            </p>
                            <p className="mt-1 text-[13px] font-semibold text-[#1d1d1f]">
                                {STAGES.find(s => s.value === formData.stage)?.label || "Prospect"}
                            </p>
                        </div>

                        {/* Tips */}
                        <div className="mt-4 rounded-lg bg-[#ff9f0a]/10 p-3">
                            <p className="text-[11px] font-medium text-[#ff9f0a]">{t("deal_form.tip_title")}</p>
                            <p className="mt-1 text-[11px] text-[#8e8e93]">
                                {t("deal_form.tip_body")}
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="mt-6 space-y-2">
                            <button
                                type="submit"
                                disabled={isSubmitting || !formData.client_name || !formData.deal_name}
                                className="w-full rounded-xl bg-gradient-to-r from-[#007aff] to-[#5856d6] px-4 py-3 text-[13px] font-semibold text-white shadow-lg shadow-[#007aff]/25 transition-all hover:shadow-xl disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                        {t("deal_form.creating")}
                                    </span>
                                ) : (
                                    t("deal_form.create")
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-3 text-[13px] font-medium text-[#1d1d1f] transition-all hover:bg-black/[0.04]"
                            >
                                {t("deal_form.cancel")}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
