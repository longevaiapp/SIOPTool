"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ModuleHeader } from "@/components/shared";
import { useToast } from "@/components/shared/ToastProvider";
import { rfqApi } from "@/lib/api";
import { useT } from "@/lib/i18n";

/* ══════════════════════════════════════════════════════════════════════════
   📋 RFQ WIZARD — Step-by-step Requirements Gathering
   ══════════════════════════════════════════════════════════════════════════ */

const STEPS = [
    { id: 1, key: "step_1", icon: "🏢" },
    { id: 2, key: "step_2", icon: "🎯" },
    { id: 3, key: "step_3", icon: "⚙️" },
    { id: 4, key: "step_4", icon: "🔒" },
    { id: 5, key: "step_5", icon: "📅" },
    { id: 6, key: "step_6", icon: "✅" },
];

// Questions by step
const QUESTIONS: Record<number, { id: string; qkey: string; type: "text" | "textarea" | "select" | "multiselect" | "number" | "date"; options?: string[]; required?: boolean; placeholder?: string }[]> = {
    1: [
        { id: "company_name", qkey: "q_company_name", type: "text", required: true, placeholder: "e.g., GenomicsCo" },
        { id: "contact_name", qkey: "q_contact_name", type: "text", required: true, placeholder: "Maria Chen" },
        { id: "contact_role", qkey: "q_contact_role", type: "text", placeholder: "VP Engineering" },
        { id: "contact_email", qkey: "q_contact_email", type: "text", placeholder: "maria@company.com" },
        { id: "industry", qkey: "q_industry", type: "select", options: ["Healthcare", "Biotech", "Pharma", "MedTech", "Diagnostics", "Life Sciences", "Other"] },
        { id: "company_size", qkey: "q_company_size", type: "select", options: ["1-50", "51-200", "201-1000", "1001-5000", "5000+"] },
    ],
    2: [
        { id: "project_summary", qkey: "q_project_summary", type: "text", required: true, placeholder: "AI-powered genomic analysis platform" },
        { id: "problem_statement", qkey: "q_problem_statement", type: "textarea", required: true, placeholder: "Current analysis takes 48 hours per batch..." },
        { id: "success_criteria", qkey: "q_success_criteria", type: "textarea", placeholder: "Reduce processing time to <6 hours, maintain 95% accuracy..." },
        { id: "project_type", qkey: "q_project_type", type: "select", options: ["New Platform Build", "Custom ML/AI Models", "System Integration", "Data Pipeline", "Consulting/Advisory", "Maintenance/Support"] },
        { id: "in_scope", qkey: "q_in_scope", type: "textarea", placeholder: "NLP model training, API development, Dashboard..." },
        { id: "out_scope", qkey: "q_out_scope", type: "textarea", placeholder: "Mobile app, Real-time streaming, Hardware..." },
    ],
    3: [
        { id: "current_tech", qkey: "q_current_tech", type: "textarea", placeholder: "AWS, Python, PostgreSQL..." },
        { id: "integrations", qkey: "q_integrations", type: "textarea", placeholder: "EHR systems, LIMS, existing APIs..." },
        { id: "data_volume", qkey: "q_data_volume", type: "text", placeholder: "50,000 samples/month, 10TB/year..." },
        { id: "performance_reqs", qkey: "q_performance_reqs", type: "textarea", placeholder: "Response time <2s, 99.9% uptime..." },
        { id: "infrastructure", qkey: "q_infrastructure", type: "multiselect", options: ["AWS", "GCP", "Azure", "On-Premise", "Hybrid", "No Preference"] },
        { id: "ml_requirements", qkey: "q_ml_requirements", type: "textarea", placeholder: "NLP, Computer Vision, Predictive models..." },
    ],
    4: [
        { id: "compliance_frameworks", qkey: "q_compliance_frameworks", type: "multiselect", options: ["HIPAA", "SOC 2", "GDPR", "FDA 21 CFR Part 11", "ISO 13485", "HITRUST", "None"] },
        { id: "phi_handling", qkey: "q_phi_handling", type: "select", options: ["Yes - PHI/PII data", "No - Anonymized/de-identified only", "Unsure - needs assessment"] },
        { id: "baa_required", qkey: "q_baa_required", type: "select", options: ["Yes", "No", "To be determined"] },
        { id: "audit_requirements", qkey: "q_audit_requirements", type: "textarea", placeholder: "All data access logged, 7-year retention..." },
        { id: "security_requirements", qkey: "q_security_requirements", type: "textarea", placeholder: "SSO, MFA, encryption at rest..." },
    ],
    5: [
        { id: "start_date", qkey: "q_start_date", type: "date" },
        { id: "go_live_date", qkey: "q_go_live_date", type: "date" },
        { id: "duration_estimate", qkey: "q_duration_estimate", type: "select", options: ["1-3 months", "3-6 months", "6-12 months", "12+ months", "Ongoing retainer"] },
        { id: "budget_range", qkey: "q_budget_range", type: "select", options: ["Under $50K", "$50K - $100K", "$100K - $200K", "$200K - $500K", "$500K - $1M", "Over $1M", "Not disclosed"] },
        { id: "budget_approved", qkey: "q_budget_approved", type: "select", options: ["Yes - Board approved", "Yes - Department budget", "Pending approval", "Exploratory stage"] },
        { id: "payment_terms", qkey: "q_payment_terms", type: "select", options: ["Milestone-based", "Monthly", "Quarterly", "On completion", "Flexible"] },
    ],
};

export default function NewRFQPage() {
    const t = useT();
    const router = useRouter();
    const { toast } = useToast();
    const [currentStep, setCurrentStep] = useState(1);
    const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAnswer = (questionId: string, value: string | string[]) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const handleMultiSelect = (questionId: string, option: string) => {
        const current = (answers[questionId] as string[]) || [];
        if (current.includes(option)) {
            handleAnswer(questionId, current.filter(o => o !== option));
        } else {
            handleAnswer(questionId, [...current, option]);
        }
    };

    const currentQuestions = QUESTIONS[currentStep] || [];
    const canProceed = currentQuestions
        .filter(q => q.required)
        .every(q => answers[q.id] && (typeof answers[q.id] === "string" ? answers[q.id] : (answers[q.id] as string[]).length > 0));

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await rfqApi.create({
                responses: answers,
                completion_pct: 100,
                status: "complete",
            });
            toast({ title: t("rfq_new.toast_created"), description: t("rfq_new.toast_captured"), variant: "success" });
            router.push("/rfq");
        } catch (e) {
            toast({ title: "Error", description: (e as Error).message, variant: "error" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const completionPct = Math.round((currentStep / STEPS.length) * 100);

    return (
        <div className="p-6">
            <ModuleHeader
                title={t("rfq_new.title")}
                subtitle={t("rfq_new.subtitle")}
                color="#30d158"
            />

            {/* Back Link */}
            <Link
                href="/rfq"
                className="mb-6 inline-flex items-center gap-2 text-[13px] text-[#30d158] hover:underline"
            >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                {t("rfq_new.back")}
            </Link>

            <div className="grid gap-6 lg:grid-cols-4">
                {/* Sidebar - Progress */}
                <div className="lg:col-span-1">
                    <div className="glass-card sticky top-6 p-4">
                        <h3 className="mb-4 text-[13px] font-semibold text-[#1d1d1f]">{t("rfq_new.progress")}</h3>
                        
                        {/* Progress Bar */}
                        <div className="mb-4">
                            <div className="mb-1 flex justify-between text-[11px]">
                                <span className="text-[#8e8e93]">{t("rfq_new.completion")}</span>
                                <span className="font-medium text-[#30d158]">{completionPct}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-black/[0.06]">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-[#30d158] to-[#64d2ff] transition-all duration-300"
                                    style={{ width: `${completionPct}%` }}
                                />
                            </div>
                        </div>

                        {/* Steps */}
                        <div className="space-y-1">
                            {STEPS.map((step, i) => {
                                const isActive = currentStep === step.id;
                                const isComplete = currentStep > step.id;
                                const isPending = currentStep < step.id;

                                return (
                                    <button
                                        key={step.id}
                                        onClick={() => currentStep > step.id && setCurrentStep(step.id)}
                                        disabled={isPending}
                                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-all ${
                                            isActive
                                                ? "bg-[#30d158]/15 text-[#30d158]"
                                                : isComplete
                                                ? "text-[#1d1d1f] hover:bg-black/[0.04]"
                                                : "text-[#c7c7cc]"
                                        }`}
                                    >
                                        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] ${
                                            isActive
                                                ? "bg-[#30d158] text-white"
                                                : isComplete
                                                ? "bg-[#30d158]/20 text-[#30d158]"
                                                : "bg-black/[0.06]"
                                        }`}>
                                            {isComplete ? "✓" : step.icon}
                                        </span>
                                        <span className="text-[12px] font-medium">{t(`rfq_new.${step.key}`)}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Quick Stats */}
                        <div className="mt-4 rounded-lg bg-black/[0.03] p-3">
                            <p className="text-[11px] text-[#8e8e93]">
                                {t("rfq_new.questions_answered", { n: Object.keys(answers).length, total: Object.values(QUESTIONS).flat().length })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-3">
                    {currentStep <= 5 ? (
                        <div className="glass-card p-6">
                            {/* Step Header */}
                            <div className="mb-6 flex items-center gap-3">
                                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#30d158]/15 text-xl">
                                    {STEPS[currentStep - 1].icon}
                                </span>
                                <div>
                                    <p className="text-[11px] font-medium uppercase tracking-wider text-[#8e8e93]">
                                        {t("rfq_new.step_label", { n: currentStep, total: STEPS.length })}
                                    </p>
                                    <h2 className="text-[18px] font-bold text-[#1d1d1f]">
                                        {t(`rfq_new.${STEPS[currentStep - 1].key}`)}
                                    </h2>
                                </div>
                            </div>

                            {/* Questions */}
                            <div className="space-y-6">
                                {currentQuestions.map((q) => (
                                    <div key={q.id}>
                                        <label className="mb-2 block text-[13px] font-medium text-[#1d1d1f]">
                                            {t(`rfq_new.${q.qkey}`)}
                                            {q.required && <span className="ml-1 text-[#ff453a]">*</span>}
                                        </label>

                                        {q.type === "text" && (
                                            <input
                                                type="text"
                                                value={(answers[q.id] as string) || ""}
                                                onChange={(e) => handleAnswer(q.id, e.target.value)}
                                                placeholder={q.placeholder}
                                                className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-3 text-[14px] text-[#1d1d1f] placeholder-[#c7c7cc] transition-all focus:border-[#30d158] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#30d158]/20"
                                            />
                                        )}

                                        {q.type === "textarea" && (
                                            <textarea
                                                rows={3}
                                                value={(answers[q.id] as string) || ""}
                                                onChange={(e) => handleAnswer(q.id, e.target.value)}
                                                placeholder={q.placeholder}
                                                className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-3 text-[14px] text-[#1d1d1f] placeholder-[#c7c7cc] transition-all focus:border-[#30d158] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#30d158]/20"
                                            />
                                        )}

                                        {q.type === "select" && (
                                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                                {q.options?.map((option) => (
                                                    <button
                                                        key={option}
                                                        type="button"
                                                        onClick={() => handleAnswer(q.id, option)}
                                                        className={`rounded-xl border px-4 py-3 text-left text-[13px] transition-all ${
                                                            answers[q.id] === option
                                                                ? "border-[#30d158] bg-[#30d158]/10 text-[#30d158]"
                                                                : "border-black/[0.06] bg-black/[0.02] text-[#1d1d1f] hover:border-black/[0.12]"
                                                        }`}
                                                    >
                                                        {option}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {q.type === "multiselect" && (
                                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                                {q.options?.map((option) => {
                                                    const selected = ((answers[q.id] as string[]) || []).includes(option);
                                                    return (
                                                        <button
                                                            key={option}
                                                            type="button"
                                                            onClick={() => handleMultiSelect(q.id, option)}
                                                            className={`rounded-xl border px-4 py-3 text-left text-[13px] transition-all ${
                                                                selected
                                                                    ? "border-[#30d158] bg-[#30d158]/10 text-[#30d158]"
                                                                    : "border-black/[0.06] bg-black/[0.02] text-[#1d1d1f] hover:border-black/[0.12]"
                                                            }`}
                                                        >
                                                            <span className="mr-2">{selected ? "✓" : "○"}</span>
                                                            {option}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {q.type === "date" && (
                                            <input
                                                type="date"
                                                value={(answers[q.id] as string) || ""}
                                                onChange={(e) => handleAnswer(q.id, e.target.value)}
                                                className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-3 text-[14px] text-[#1d1d1f] transition-all focus:border-[#30d158] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#30d158]/20"
                                            />
                                        )}

                                        {q.type === "number" && (
                                            <input
                                                type="number"
                                                value={(answers[q.id] as string) || ""}
                                                onChange={(e) => handleAnswer(q.id, e.target.value)}
                                                placeholder={q.placeholder}
                                                className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-3 text-[14px] text-[#1d1d1f] placeholder-[#c7c7cc] transition-all focus:border-[#30d158] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#30d158]/20"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Navigation */}
                            <div className="mt-8 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                                    disabled={currentStep === 1}
                                    className="rounded-xl border border-black/[0.08] bg-black/[0.02] px-5 py-2.5 text-[13px] font-medium text-[#1d1d1f] transition-all hover:bg-black/[0.04] disabled:opacity-50"
                                >
                                    {t("rfq_new.btn_prev")}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setCurrentStep(prev => Math.min(STEPS.length, prev + 1))}
                                    disabled={!canProceed}
                                    className="rounded-xl bg-gradient-to-r from-[#30d158] to-[#64d2ff] px-6 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-[#30d158]/25 transition-all hover:shadow-xl disabled:opacity-50"
                                >
                                    {currentStep === 5 ? t("rfq_new.btn_review") : t("rfq_new.btn_next")}
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Review Step */
                        <div className="glass-card p-6">
                            <div className="mb-6 flex items-center gap-3">
                                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#30d158]/15 text-xl">
                                    ✅
                                </span>
                                <div>
                                    <p className="text-[11px] font-medium uppercase tracking-wider text-[#8e8e93]">
                                        {t("rfq_new.final_step")}
                                    </p>
                                    <h2 className="text-[18px] font-bold text-[#1d1d1f]">
                                        {t("rfq_new.review_submit")}
                                    </h2>
                                </div>
                            </div>

                            {/* Summary Cards */}
                            <div className="space-y-4">
                                {STEPS.slice(0, 5).map((step) => (
                                    <div key={step.id} className="rounded-xl border border-black/[0.06] bg-black/[0.02] p-4">
                                        <div className="mb-3 flex items-center justify-between">
                                            <h3 className="flex items-center gap-2 text-[13px] font-semibold text-[#1d1d1f]">
                                                <span>{step.icon}</span>
                                                {t(`rfq_new.${step.key}`)}
                                            </h3>
                                            <button
                                                onClick={() => setCurrentStep(step.id)}
                                                className="text-[11px] text-[#007aff] hover:underline"
                                            >
                                                {t("rfq_new.btn_edit")}
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {QUESTIONS[step.id]?.map((q) => {
                                                const answer = answers[q.id];
                                                if (!answer || (Array.isArray(answer) && answer.length === 0)) return null;
                                                return (
                                                    <div key={q.id} className="flex items-start gap-2 text-[12px]">
                                                        <span className="text-[#8e8e93]">{t(`rfq_new.${q.qkey}`)}</span>
                                                        <span className="font-medium text-[#1d1d1f]">
                                                            {Array.isArray(answer) ? answer.join(", ") : answer}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Submit */}
                            <div className="mt-8 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setCurrentStep(5)}
                                    className="rounded-xl border border-black/[0.08] bg-black/[0.02] px-5 py-2.5 text-[13px] font-medium text-[#1d1d1f] transition-all hover:bg-black/[0.04]"
                                >
                                    {t("rfq_new.btn_back_step")}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#30d158] to-[#007aff] px-8 py-3 text-[14px] font-semibold text-white shadow-lg shadow-[#30d158]/25 transition-all hover:shadow-xl disabled:opacity-50"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                            {t("rfq_new.btn_submitting")}
                                        </>
                                    ) : (
                                        <>
                                            {t("rfq_new.btn_submit")}
                                            <span>✦</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
