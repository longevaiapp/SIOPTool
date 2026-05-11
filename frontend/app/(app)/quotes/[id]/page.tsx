"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuote, useClients } from "@/lib/hooks/use-resources";
import { useToast } from "@/components/shared/ToastProvider";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { quotesApi, createContractFromQuote } from "@/lib/api";
import { GeneratePdfButton } from "@/components/shared/GeneratePdfButton";
import { formatDate, formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";

const STATUS_OPTIONS = ["draft", "sent", "accepted", "rejected", "expired", "void"] as const;

export default function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const t = useT();
    const { id } = use(params);
    const router = useRouter();
    const { toast } = useToast();
    const { data: quote, mutate, isLoading } = useQuote(id);
    const { data: clientsData } = useClients();

    if (isLoading || !quote) return <div className="p-6"><LoadingSkeleton rows={6} type="card" /></div>;

    const clientName = clientsData?.find(c => c.id === quote.client_id)?.name ?? "—";

    const updateStatus = async (status: string) => {
        try {
            await quotesApi.update(id, { status });
            toast({ title: t("quote.toast_status"), description: `Quote → ${status}`, variant: "success" });
            mutate();
        } catch (e) {
            toast({ title: "Error", description: (e as Error).message, variant: "error" });
        }
    };

    const handleGenerateContract = async () => {
        try {
            const contract = await createContractFromQuote(id, { contract_type: "SOW" });
            toast({
                title: t("quote.contract_created_title"),
                description: t("quote.contract_created_desc", { title: contract.title }),
                variant: "success",
            });
            router.push(`/contracts/${contract.id}`);
        } catch (e) {
            toast({ title: "Error", description: (e as Error).message, variant: "error" });
        }
    };

    return (
        <div className="p-6">
            <div className="mb-4">
                <Link href="/quotes" className="text-[12px] font-semibold text-[#34c759]">{t("quote.back")}</Link>
            </div>

            <div className="glass-card mb-6 p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#34c759]">{t("quote.eyebrow")}</p>
                        <h1 className="font-mono text-[32px] font-bold tracking-tight text-[#1d1d1f]">{quote.folio}</h1>
                        <p className="mt-1 text-[13px] text-[#8e8e93]">{t("quote.client")}: <span className="font-semibold text-[#1d1d1f]">{clientName}</span></p>
                    </div>
                    <div className="flex flex-col gap-2">
                        <select className="rounded-lg border border-black/10 bg-white px-3 py-2 text-[13px] font-semibold"
                            value={quote.status} onChange={e => updateStatus(e.target.value)}>
                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                        </select>
                        <GeneratePdfButton kind="quote" sourceId={quote.id} color="#34c759" />
                        <button className="btn btn--primary" onClick={() => router.push(`/proposals/new?from_quote=${quote.id}`)}>
                            {t("quote.convert")}
                        </button>
                        <button
                            className="btn"
                            style={{ background: "#7c3aed", color: "white" }}
                            onClick={handleGenerateContract}
                            title={t("quote.generate_contract_hint")}
                        >
                            {t("quote.generate_contract")}
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="glass-card p-5">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#8e8e93]">{t("quote.subtotal")}</p>
                    <p className="text-[24px] font-bold">{formatMoney(Number(quote.subtotal))} {quote.currency}</p>
                </div>
                <div className="glass-card p-5">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#8e8e93]">{t("quote.tax")} ({String(quote.tax_rate)}%)</p>
                    <p className="text-[24px] font-bold">{formatMoney(Number(quote.tax))} {quote.currency}</p>
                </div>
                <div className="glass-card p-5" style={{ borderColor: "#34c759" }}>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#34c759]">{t("quote.total")}</p>
                    <p className="text-[24px] font-bold text-[#34c759]">{formatMoney(Number(quote.total))} {quote.currency}</p>
                </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="glass-card p-5">
                    <h3 className="mb-3 text-[14px] font-semibold">{t("quote.info")}</h3>
                    <dl className="space-y-2 text-[13px]">
                        <div className="flex justify-between"><dt className="text-[#8e8e93]">{t("quote.valid_until")}</dt><dd className="font-semibold">{formatDate(quote.valid_until)}</dd></div>
                        <div className="flex justify-between"><dt className="text-[#8e8e93]">{t("quote.created")}</dt><dd className="font-semibold">{formatDate(quote.created_at)}</dd></div>
                        <div className="flex justify-between"><dt className="text-[#8e8e93]">{t("quote.sent_at")}</dt><dd className="font-semibold">{formatDate(quote.sent_at)}</dd></div>
                        <div className="flex justify-between"><dt className="text-[#8e8e93]">{t("quote.accepted_at")}</dt><dd className="font-semibold">{formatDate(quote.accepted_at)}</dd></div>
                    </dl>
                </div>
                <div className="glass-card p-5">
                    <h3 className="mb-3 text-[14px] font-semibold">{t("quote.terms")}</h3>
                    <p className="whitespace-pre-wrap text-[13px] text-[#1d1d1f]">{quote.terms || "—"}</p>
                    {quote.notes && (
                        <>
                            <h4 className="mt-4 mb-2 text-[12px] font-semibold uppercase tracking-[1px] text-[#8e8e93]">{t("quote.notes")}</h4>
                            <p className="whitespace-pre-wrap text-[13px] text-[#1d1d1f]">{quote.notes}</p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
