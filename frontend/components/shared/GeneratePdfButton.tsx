"use client";

import { useState } from "react";
import { generatePdf } from "@/lib/api";
import { useToast } from "@/components/shared/ToastProvider";
import { API_BASE_URL } from "@/lib/api/client";
import { useT } from "@/lib/i18n";

type Kind =
    | "quote" | "supplier_quote"
    | "proposal" | "sow" | "renewal_proposal" | "onepager"
    | "tech_brief" | "wbs_estimate" | "discovery_report" | "case_study"
    | "change_order" | "invoice" | "po" | "statement"
    | "contract" | "nda" | "msa" | "baa"
    | "minute" | "kickoff" | "internal_kickoff" | "qbr" | "postmortem"
    | "daily_standup" | "acceptance" | "pmo_review" | "uat_report"
    | "onboarding_pack"
    | "sprint_report" | "sprint_plan" | "sprint_retro" | "status_weekly"
    | "risk_register" | "compliance_audit"
    | "supplier_evaluation" | "health_card" | "bug_report"
    | "capacity_plan" | "timesheet" | "siop_weekly";

export function GeneratePdfButton({
    kind,
    sourceId,
    color,
    label,
}: {
    kind: Kind;
    sourceId: string;
    color?: string;
    label?: string;
}) {
    const t = useT();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const handleClick = async () => {
        setLoading(true);
        try {
            const doc = await generatePdf(kind, sourceId);
            toast({
                title: t("pdf.success_title"),
                description: `${doc.folio} v${doc.version} · ${Math.round((doc.pdf_size_bytes ?? 0) / 1024)} KB`,
                variant: "success",
            });
            // Open the PDF in a new tab
            window.open(`${API_BASE_URL}/documents/${doc.id}/pdf`, "_blank", "noopener,noreferrer");
        } catch (e) {
            toast({ title: t("pdf.error_title"), description: (e as Error).message, variant: "error" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleClick}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-[13px] font-semibold transition hover:bg-black/[0.03] disabled:opacity-50"
            style={color ? { color } : undefined}
        >
            {loading ? t("pdf.generating") : `📄 ${label ?? t("pdf.generate_default")}`}
        </button>
    );
}
