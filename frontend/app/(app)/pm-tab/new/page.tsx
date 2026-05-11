"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ModuleHeader } from "@/components/shared";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { useToast } from "@/components/shared/ToastProvider";
import { useDeal, useClient } from "@/lib/hooks/use-resources";
import { toMockDeal, toMockClient } from "@/lib/adapters";
import { projectsApi } from "@/lib/api";
import { useT } from "@/lib/i18n";

/* ══════════════════════════════════════════════════════════════════════════
   📁 NEW PROJECT — Manual Entry Form
   ══════════════════════════════════════════════════════════════════════════ */

const PROJECT_TYPES = [
    { value: "platform", labelKey: "pm_new.type_platform", icon: "🏗️" },
    { value: "custom_ml", labelKey: "pm_new.type_ml", icon: "🤖" },
    { value: "integration", labelKey: "pm_new.type_integration", icon: "🔗" },
    { value: "consulting", labelKey: "pm_new.type_consulting", icon: "💼" },
    { value: "maintenance", labelKey: "pm_new.type_maintenance", icon: "🔧" },
];

const COMMERCIAL_MODELS = [
    { value: "fixed_price", labelKey: "pm_new.model_fp" },
    { value: "time_materials", labelKey: "pm_new.model_tm" },
    { value: "retainer", labelKey: "pm_new.model_ret" },
    { value: "value_based", labelKey: "pm_new.model_vb" },
];

const TEAM_ROLES = [
    "pm_new.role_pm",
    "pm_new.role_tl",
    "pm_new.role_sa",
    "pm_new.role_ml",
    "pm_new.role_be",
    "pm_new.role_fe",
    "pm_new.role_qa",
    "pm_new.role_devops",
];

export default function NewProjectPage() {
    return (
        <Suspense fallback={<div className="p-6"><LoadingSkeleton rows={6} type="card" /></div>}>
            <NewProjectInner />
        </Suspense>
    );
}

function NewProjectInner() {
    const t = useT();
    const router = useRouter();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const dealIdParam = searchParams.get("from_deal");
    const { data: rawDeal } = useDeal(dealIdParam);
    const { data: rawClient } = useClient(rawDeal?.client_id);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        // Basic Info
        name: "",
        client_name: "",
        deal_id: "", // Optional link to CRM deal
        project_type: "",
        
        // Team
        pm_name: "",
        tech_lead: "",
        team_members: [] as string[],
        
        // Commercial
        commercial_model: "fixed_price",
        budget: "",
        margin_target: "35",
        
        // Timeline
        start_date: "",
        end_date: "",
        sprint_length: "2",
        
        // Scope
        description: "",
        objectives: "",
        deliverables: "",
        out_of_scope: "",
        
        // Compliance
        hipaa_required: false,
        baa_signed: false,
        compliance_frameworks: [] as string[],
        
        // Notes
        notes: "",
    });

    const handleChange = (field: string, value: string | boolean | string[]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Prefill from deal (Convert to Project flow)
    useEffect(() => {
        if (!dealIdParam || !rawDeal) return;
        const deal = toMockDeal(rawDeal);
        const client = rawClient ? toMockClient(rawClient) : null;
        const typeMap: Record<string, string> = {
            "Platform": "platform",
            "Custom ML": "custom_ml",
            "Integration": "integration",
            "Consulting": "consulting",
            "AI Model": "custom_ml",
        };
        setFormData(prev => ({
            ...prev,
            name: deal.name,
            client_name: client?.name ?? "",
            deal_id: deal.id,
            project_type: typeMap[deal.type] ?? "",
            budget: String(deal.value),
            pm_name: deal.owner,
            notes: `Converted from deal ${deal.id}. Original notes: ${deal.notes}`,
            start_date: new Date().toISOString().slice(0, 10),
            end_date: deal.expected_close,
        }));
    }, [dealIdParam, rawDeal, rawClient]);

    const toggleTeamMember = (role: string) => {
        const current = formData.team_members;
        if (current.includes(role)) {
            handleChange("team_members", current.filter(r => r !== role));
        } else {
            handleChange("team_members", [...current, role]);
        }
    };

    const toggleCompliance = (framework: string) => {
        const current = formData.compliance_frameworks;
        if (current.includes(framework)) {
            handleChange("compliance_frameworks", current.filter(f => f !== framework));
        } else {
            handleChange("compliance_frameworks", [...current, framework]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await projectsApi.create({
                name: formData.name,
                client_name: formData.client_name,
                status: "PLANNING",
                health_score: 100,
                budget: parseFloat(formData.budget) || 0,
                start_date: formData.start_date || undefined,
                end_date: formData.end_date || undefined,
                project_type: formData.project_type || undefined,
                pm_name: formData.pm_name || undefined,
                tech_lead: formData.tech_lead || undefined,
                notes: formData.notes || undefined,
            });
            toast({ title: t("pm_new.toast_created"), description: t("pm_new.toast_added", { name: formData.name || "Project" }), variant: "success" });
            router.push("/pm-tab");
        } catch (e) {
            toast({ title: "Error", description: (e as Error).message, variant: "error" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6">
            <ModuleHeader
                title={t("pm_new.title")}
                subtitle={t("pm_new.subtitle")}
                color="#ff453a"
            />

            {dealIdParam && formData.deal_id && (
                <div className="mb-4 rounded-xl border border-[#ff9f0a]/30 bg-[#ff9f0a]/8 p-3 text-[12px] text-[#1d1d1f]">
                    {t("pm_new.converting", { id: dealIdParam })}
                </div>
            )}

            {/* Back Link */}
            <Link
                href="/pm-tab"
                className="mb-6 inline-flex items-center gap-2 text-[13px] text-[#ff453a] hover:underline"
            >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                {t("pm_new.back")}
            </Link>

            <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
                {/* Main Form */}
                <div className="space-y-6 lg:col-span-2">
                    {/* Basic Information */}
                    <div className="glass-card p-5">
                        <h3 className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-[#1d1d1f]">
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#ff453a]/10 text-[12px]">📋</span>
                            {t("pm_new.section_basic")}
                        </h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label className="mb-1.5 block text-[12px] font-medium text-[#1d1d1f]">
                                    {t("pm_new.field_name_label")} <span className="text-[#ff453a]">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => handleChange("name", e.target.value)}
                                    placeholder={t("pm_new.ph_name")}
                                    className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-2.5 text-[13px] text-[#1d1d1f] placeholder-[#c7c7cc] transition-all focus:border-[#ff453a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ff453a]/20"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[12px] font-medium text-[#1d1d1f]">
                                    {t("pm_new.field_client_label")} <span className="text-[#ff453a]">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.client_name}
                                    onChange={(e) => handleChange("client_name", e.target.value)}
                                    placeholder={t("pm_new.ph_client")}
                                    className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-2.5 text-[13px] text-[#1d1d1f] placeholder-[#c7c7cc] transition-all focus:border-[#ff453a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ff453a]/20"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[12px] font-medium text-[#1d1d1f]">
                                    {t("pm_new.field_link_deal")}
                                </label>
                                <select
                                    value={formData.deal_id}
                                    onChange={(e) => handleChange("deal_id", e.target.value)}
                                    className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-2.5 text-[13px] text-[#1d1d1f] focus:border-[#ff453a] focus:outline-none"
                                >
                                    <option value="">{t("pm_new.opt_no_deal")}</option>
                                    <option value="deal-1">{t("pm_new.opt_deal_1")}</option>
                                    <option value="deal-2">{t("pm_new.opt_deal_2")}</option>
                                    <option value="deal-3">{t("pm_new.opt_deal_3")}</option>
                                </select>
                            </div>
                        </div>

                        {/* Project Type */}
                        <div className="mt-4">
                            <label className="mb-2 block text-[12px] font-medium text-[#1d1d1f]">
                                {t("pm_new.field_type")} <span className="text-[#ff453a]">*</span>
                            </label>
                            <div className="grid gap-2 sm:grid-cols-5">
                                {PROJECT_TYPES.map(type => (
                                    <button
                                        key={type.value}
                                        type="button"
                                        onClick={() => handleChange("project_type", type.value)}
                                        className={`rounded-xl border p-3 text-center transition-all ${
                                            formData.project_type === type.value
                                                ? "border-[#ff453a] bg-[#ff453a]/10"
                                                : "border-black/[0.06] bg-black/[0.02] hover:border-black/[0.12]"
                                        }`}
                                    >
                                        <span className="block text-xl">{type.icon}</span>
                                        <span className="mt-1 block text-[11px] font-medium text-[#1d1d1f]">{t(type.labelKey)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Team */}
                    <div className="glass-card p-5">
                        <h3 className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-[#1d1d1f]">
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#007aff]/10 text-[12px]">👥</span>
                            {t("pm_new.section_team")}
                        </h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1.5 block text-[12px] font-medium text-[#1d1d1f]">
                                    {t("pm_new.field_pm")} <span className="text-[#ff453a]">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.pm_name}
                                    onChange={(e) => handleChange("pm_name", e.target.value)}
                                    placeholder={t("pm_new.ph_pm")}
                                    className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-2.5 text-[13px] text-[#1d1d1f] placeholder-[#c7c7cc] transition-all focus:border-[#ff453a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ff453a]/20"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[12px] font-medium text-[#1d1d1f]">
                                    {t("pm_new.field_lead")}
                                </label>
                                <input
                                    type="text"
                                    value={formData.tech_lead}
                                    onChange={(e) => handleChange("tech_lead", e.target.value)}
                                    placeholder={t("pm_new.ph_dev")}
                                    className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-2.5 text-[13px] text-[#1d1d1f] placeholder-[#c7c7cc] transition-all focus:border-[#ff453a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ff453a]/20"
                                />
                            </div>
                        </div>
                        <div className="mt-4">
                            <label className="mb-2 block text-[12px] font-medium text-[#1d1d1f]">
                                {t("pm_new.field_team_roles")}
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {TEAM_ROLES.map(roleKey => {
                                    const roleLabel = t(roleKey);
                                    return (
                                        <button
                                            key={roleKey}
                                            type="button"
                                            onClick={() => toggleTeamMember(roleLabel)}
                                            className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-all ${
                                                formData.team_members.includes(roleLabel)
                                                    ? "bg-[#007aff] text-white"
                                                    : "bg-black/[0.04] text-[#1d1d1f] hover:bg-black/[0.08]"
                                            }`}
                                        >
                                            {formData.team_members.includes(roleLabel) ? "✓ " : ""}
                                            {roleLabel}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Timeline & Commercial */}
                    <div className="glass-card p-5">
                        <h3 className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-[#1d1d1f]">
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#30d158]/10 text-[12px]">📅</span>
                            {t("pm_new.section_timeline")}
                        </h3>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                                <label className="mb-1.5 block text-[12px] font-medium text-[#1d1d1f]">
                                    {t("pm_new.field_start")}
                                </label>
                                <input
                                    type="date"
                                    value={formData.start_date}
                                    onChange={(e) => handleChange("start_date", e.target.value)}
                                    className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-2.5 text-[13px] text-[#1d1d1f] focus:border-[#ff453a] focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[12px] font-medium text-[#1d1d1f]">
                                    {t("pm_new.field_end")}
                                </label>
                                <input
                                    type="date"
                                    value={formData.end_date}
                                    onChange={(e) => handleChange("end_date", e.target.value)}
                                    className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-2.5 text-[13px] text-[#1d1d1f] focus:border-[#ff453a] focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[12px] font-medium text-[#1d1d1f]">
                                    {t("pm_new.field_sprint")}
                                </label>
                                <select
                                    value={formData.sprint_length}
                                    onChange={(e) => handleChange("sprint_length", e.target.value)}
                                    className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-2.5 text-[13px] text-[#1d1d1f] focus:border-[#ff453a] focus:outline-none"
                                >
                                    <option value="1">{t("pm_new.sprint_1w")}</option>
                                    <option value="2">{t("pm_new.sprint_2w")}</option>
                                    <option value="3">{t("pm_new.sprint_3w")}</option>
                                    <option value="4">{t("pm_new.sprint_4w")}</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[12px] font-medium text-[#1d1d1f]">
                                    {t("pm_new.field_model")}
                                </label>
                                <select
                                    value={formData.commercial_model}
                                    onChange={(e) => handleChange("commercial_model", e.target.value)}
                                    className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-2.5 text-[13px] text-[#1d1d1f] focus:border-[#ff453a] focus:outline-none"
                                >
                                    {COMMERCIAL_MODELS.map(m => (
                                        <option key={m.value} value={m.value}>{t(m.labelKey)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1.5 block text-[12px] font-medium text-[#1d1d1f]">
                                    {t("pm_new.field_budget")}
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] text-[#8e8e93]">$</span>
                                    <input
                                        type="number"
                                        value={formData.budget}
                                        onChange={(e) => handleChange("budget", e.target.value)}
                                        placeholder="0"
                                        className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] py-2.5 pl-8 pr-4 text-[13px] text-[#1d1d1f] placeholder-[#c7c7cc] focus:border-[#ff453a] focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[12px] font-medium text-[#1d1d1f]">
                                    {t("pm_new.field_margin")}
                                </label>
                                <input
                                    type="range"
                                    min="20"
                                    max="60"
                                    step="5"
                                    value={formData.margin_target}
                                    onChange={(e) => handleChange("margin_target", e.target.value)}
                                    className="w-full"
                                />
                                <div className="mt-1 flex justify-between text-[11px] text-[#8e8e93]">
                                    <span>20%</span>
                                    <span className="font-semibold text-[#30d158]">{formData.margin_target}%</span>
                                    <span>60%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Scope */}
                    <div className="glass-card p-5">
                        <h3 className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-[#1d1d1f]">
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#ff9f0a]/10 text-[12px]">🎯</span>
                            {t("pm_new.section_scope")}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="mb-1.5 block text-[12px] font-medium text-[#1d1d1f]">
                                    {t("pm_new.field_desc")}
                                </label>
                                <textarea
                                    rows={3}
                                    value={formData.description}
                                    onChange={(e) => handleChange("description", e.target.value)}
                                    placeholder={t("pm_new.ph_brief")}
                                    className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-2.5 text-[13px] text-[#1d1d1f] placeholder-[#c7c7cc] focus:border-[#ff453a] focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[12px] font-medium text-[#1d1d1f]">
                                    {t("pm_new.field_obj")}
                                </label>
                                <textarea
                                    rows={2}
                                    value={formData.objectives}
                                    onChange={(e) => handleChange("objectives", e.target.value)}
                                    placeholder={t("pm_new.ph_goals")}
                                    className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-2.5 text-[13px] text-[#1d1d1f] placeholder-[#c7c7cc] focus:border-[#ff453a] focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[12px] font-medium text-[#1d1d1f]">
                                    {t("pm_new.field_deliv")}
                                </label>
                                <textarea
                                    rows={2}
                                    value={formData.deliverables}
                                    onChange={(e) => handleChange("deliverables", e.target.value)}
                                    placeholder={t("pm_new.ph_deliverables")}
                                    className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-2.5 text-[13px] text-[#1d1d1f] placeholder-[#c7c7cc] focus:border-[#ff453a] focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[12px] font-medium text-[#1d1d1f]">
                                    {t("pm_new.field_oos")}
                                </label>
                                <textarea
                                    rows={2}
                                    value={formData.out_of_scope}
                                    onChange={(e) => handleChange("out_of_scope", e.target.value)}
                                    placeholder={t("pm_new.ph_oos")}
                                    className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-2.5 text-[13px] text-[#1d1d1f] placeholder-[#c7c7cc] focus:border-[#ff453a] focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Compliance */}
                    <div className="glass-card p-5">
                        <h3 className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-[#1d1d1f]">
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#8e8e93]/10 text-[12px]">🔒</span>
                            {t("pm_new.section_compliance")}
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.hipaa_required}
                                        onChange={(e) => handleChange("hipaa_required", e.target.checked)}
                                        className="h-4 w-4 rounded border-black/[0.15] text-[#ff453a] focus:ring-[#ff453a]"
                                    />
                                    <span className="text-[13px] text-[#1d1d1f]">{t("pm_new.cb_hipaa_required")}</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.baa_signed}
                                        onChange={(e) => handleChange("baa_signed", e.target.checked)}
                                        className="h-4 w-4 rounded border-black/[0.15] text-[#ff453a] focus:ring-[#ff453a]"
                                    />
                                    <span className="text-[13px] text-[#1d1d1f]">{t("pm_new.cb_baa_signed")}</span>
                                </label>
                            </div>
                            <div>
                                <label className="mb-2 block text-[12px] font-medium text-[#1d1d1f]">
                                    {t("pm_new.field_compliance")}
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {["HIPAA", "SOC 2", "GDPR", "FDA 21 CFR Part 11", "ISO 13485", "HITRUST"].map(f => (
                                        <button
                                            key={f}
                                            type="button"
                                            onClick={() => toggleCompliance(f)}
                                            className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-all ${
                                                formData.compliance_frameworks.includes(f)
                                                    ? "bg-[#ff9f0a] text-white"
                                                    : "bg-black/[0.04] text-[#1d1d1f] hover:bg-black/[0.08]"
                                            }`}
                                        >
                                            {formData.compliance_frameworks.includes(f) ? "✓ " : ""}
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-1">
                    <div className="glass-card sticky top-6 p-5">
                        <h3 className="mb-4 text-[14px] font-semibold text-[#1d1d1f]">
                            {t("pm_new.summary_title")}
                        </h3>

                        {/* Preview */}
                        <div className="mb-4 rounded-xl bg-gradient-to-br from-[#ff453a]/10 to-[#ff9f0a]/10 p-4">
                            <p className="text-[16px] font-bold text-[#1d1d1f]">
                                {formData.name || t("pm_new.summary_name_default")}
                            </p>
                            <p className="text-[12px] text-[#8e8e93]">
                                {formData.client_name || t("pm_new.summary_client_default")}
                            </p>
                            <div className="mt-2">
                                {formData.project_type && (
                                    <span className="inline-block rounded-full bg-[#ff453a]/15 px-2 py-0.5 text-[10px] font-medium text-[#ff453a]">
                                        {(() => { const pt = PROJECT_TYPES.find(x => x.value === formData.project_type); return pt ? t(pt.labelKey) : ""; })()}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[12px] text-[#8e8e93]">{t("pm_new.summary_budget")}</span>
                                <span className="text-[14px] font-semibold text-[#1d1d1f]">
                                    ${parseFloat(formData.budget || "0").toLocaleString()}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[12px] text-[#8e8e93]">{t("pm_new.summary_margin")}</span>
                                <span className="text-[14px] font-semibold text-[#30d158]">
                                    {formData.margin_target}%
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[12px] text-[#8e8e93]">{t("pm_new.summary_team_size")}</span>
                                <span className="text-[14px] font-semibold text-[#1d1d1f]">
                                    {formData.team_members.length + (formData.pm_name ? 1 : 0) + (formData.tech_lead ? 1 : 0)}
                                </span>
                            </div>
                            {formData.start_date && formData.end_date && (
                                <div className="flex items-center justify-between">
                                    <span className="text-[12px] text-[#8e8e93]">{t("pm_new.summary_duration_weeks")}</span>
                                    <span className="text-[14px] font-semibold text-[#1d1d1f]">
                                        {t("pm_new.summary_weeks", { n: Math.ceil((new Date(formData.end_date).getTime() - new Date(formData.start_date).getTime()) / (1000 * 60 * 60 * 24 * 7)) })}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Compliance badges */}
                        {formData.compliance_frameworks.length > 0 && (
                            <div className="mt-4 rounded-lg bg-black/[0.03] p-3">
                                <p className="mb-2 text-[11px] font-medium text-[#8e8e93]">{t("pm_new.summary_compliance")}</p>
                                <div className="flex flex-wrap gap-1">
                                    {formData.compliance_frameworks.map(f => (
                                        <span key={f} className="rounded bg-[#ff9f0a]/15 px-2 py-0.5 text-[9px] font-medium text-[#ff9f0a]">
                                            {f}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="mt-6 space-y-2">
                            <button
                                type="submit"
                                disabled={isSubmitting || !formData.name || !formData.client_name || !formData.pm_name}
                                className="w-full rounded-xl bg-gradient-to-r from-[#ff453a] to-[#ff9f0a] px-4 py-3 text-[13px] font-semibold text-white shadow-lg shadow-[#ff453a]/25 transition-all hover:shadow-xl disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                        {t("pm_new.btn_creating")}
                                    </span>
                                ) : (
                                    t("pm_new.btn_create")
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-3 text-[13px] font-medium text-[#1d1d1f] transition-all hover:bg-black/[0.04]"
                            >
                                {t("pm_new.btn_cancel")}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
