"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { generatePdf } from "@/lib/api";
import { useToast } from "@/components/shared/ToastProvider";
import { API_BASE_URL } from "@/lib/api/client";
import { useT } from "@/lib/i18n";
import { ContractWizardModal, isContractKind } from "./ContractWizardModal";

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

export type PdfKindOption = { kind: Kind; label: string; description?: string };

export function GeneratePdfMenu({
    sourceId,
    options,
    color,
    triggerLabel,
}: {
    sourceId: string;
    options: PdfKindOption[];
    color?: string;
    triggerLabel?: string;
}) {
    const t = useT();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState<string | null>(null);
    const [wizardKind, setWizardKind] = useState<Kind | null>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useLayoutEffect(() => {
        if (!open || !triggerRef.current) return;
        const update = () => {
            const r = triggerRef.current!.getBoundingClientRect();
            const menuWidth = 288; // w-72
            const left = Math.max(8, Math.min(r.right - menuWidth, window.innerWidth - menuWidth - 8));
            setPos({ top: r.bottom + 4, left, width: menuWidth });
        };
        update();
        window.addEventListener("scroll", update, true);
        window.addEventListener("resize", update);
        return () => {
            window.removeEventListener("scroll", update, true);
            window.removeEventListener("resize", update);
        };
    }, [open]);

    const run = async (kind: Kind) => {
        setOpen(false);
        // Contract-like kinds open the wizard first
        if (isContractKind(kind)) {
            setWizardKind(kind);
            return;
        }
        setLoading(kind);
        try {
            const doc = await generatePdf(kind, sourceId);
            toast({
                title: t("pdf.success_title"),
                description: `${doc.folio} v${doc.version} · ${Math.round((doc.pdf_size_bytes ?? 0) / 1024)} KB`,
                variant: "success",
            });
            window.open(`${API_BASE_URL}/documents/${doc.id}/pdf`, "_blank", "noopener,noreferrer");
        } catch (e) {
            toast({ title: t("pdf.error_title"), description: (e as Error).message, variant: "error" });
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="relative inline-block">
            <button
                ref={triggerRef}
                onClick={() => setOpen(!open)}
                disabled={loading !== null}
                className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-[13px] font-semibold transition hover:bg-black/[0.03] disabled:opacity-50"
                style={color ? { color } : undefined}
            >
                {loading ? t("pdf.generating") : `📄 ${triggerLabel ?? t("pdf.generate_default")}`}
                <span className="text-[10px] opacity-60">▾</span>
            </button>
            {open && mounted && pos && createPortal(
                <>
                    <div
                        className="fixed inset-0"
                        style={{ zIndex: 9998 }}
                        onClick={() => setOpen(false)}
                    />
                    <div
                        className="fixed overflow-hidden rounded-xl border border-black/10 bg-white shadow-xl"
                        style={{ top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
                    >
                        {options.map(opt => (
                            <button
                                key={opt.kind}
                                onClick={() => run(opt.kind)}
                                className="flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left text-[13px] transition hover:bg-black/[0.04]"
                            >
                                <span className="font-semibold text-[#1d1d1f]">{opt.label}</span>
                                {opt.description && (
                                    <span className="text-[11px] text-[#8e8e93]">{opt.description}</span>
                                )}
                            </button>
                        ))}
                    </div>
                </>,
                document.body
            )}
            {wizardKind && (
                <ContractWizardModal
                    contractId={sourceId}
                    kind={wizardKind}
                    onClose={() => setWizardKind(null)}
                />
            )}
        </div>
    );
}
