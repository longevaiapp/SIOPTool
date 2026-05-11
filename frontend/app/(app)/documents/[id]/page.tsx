"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useDocument, useClients, useProjects } from "@/lib/hooks/use-resources";
import { useToast } from "@/components/shared/ToastProvider";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { documentsApi, generatePdf } from "@/lib/api";
import { API_BASE_URL } from "@/lib/api/client";
import { formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n";

const STATUS_OPTIONS = ["draft", "sent", "signed", "accepted", "rejected", "void"];

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const t = useT();
    const { id } = use(params);
    const { toast } = useToast();
    const { data: doc, mutate, isLoading } = useDocument(id);
    const { data: clients } = useClients();
    const { data: projects } = useProjects();
    const [regenBusy, setRegenBusy] = useState(false);

    if (isLoading || !doc) return <div className="p-6"><LoadingSkeleton rows={6} type="card" /></div>;

    const client = clients?.find(c => c.id === doc.client_id)?.name ?? "—";
    const project = projects?.find(p => p.id === doc.project_id)?.name ?? "—";

    const updateStatus = async (status: string) => {
        try {
            const patch: Record<string, unknown> = { status };
            if (status === "sent") patch.sent_at = new Date().toISOString();
            if (status === "signed") patch.signed_at = new Date().toISOString();
            if (status === "accepted") patch.accepted_at = new Date().toISOString();
            if (status === "rejected") patch.rejected_at = new Date().toISOString();
            if (status === "void") patch.voided_at = new Date().toISOString();
            await documentsApi.update(id, patch);
            toast({ title: t("docs_d.status_updated"), description: t("docs_d.status_to", { s: status }), variant: "success" });
            mutate();
        } catch (e) {
            toast({ title: "Error", description: (e as Error).message, variant: "error" });
        }
    };

    const regenerate = async () => {
        if (!doc.source_id) {
            toast({ title: t("docs_d.no_origin_title"), description: t("docs_d.no_origin_desc"), variant: "error" });
            return;
        }
        setRegenBusy(true);
        try {
            const fresh = await generatePdf(doc.kind, doc.source_id);
            toast({ title: t("docs_d.pdf_regen"), description: `${fresh.folio} v${fresh.version}`, variant: "success" });
            mutate();
        } catch (e) {
            toast({ title: "Error", description: (e as Error).message, variant: "error" });
        } finally {
            setRegenBusy(false);
        }
    };

    return (
        <div className="p-6">
            <div className="mb-4">
                <Link href="/documents" className="text-[12px] font-semibold text-[#5856d6]">{t("docs_d.back")}</Link>
            </div>

            <div className="glass-card mb-6 p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#5856d6]">{doc.kind} · v{doc.version}</p>
                        <h1 className="text-[28px] font-bold tracking-tight text-[#1d1d1f]">{doc.title}</h1>
                        <p className="mt-1 text-[13px] text-[#8e8e93]">
                            <span className="font-mono font-semibold text-[#5856d6]">{doc.folio}</span> · {client} · {project}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <select className="rounded-lg border border-black/10 bg-white px-3 py-2 text-[13px] font-semibold"
                            value={doc.status} onChange={e => updateStatus(e.target.value)}>
                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                        </select>
                        <button
                            onClick={regenerate}
                            disabled={regenBusy || !doc.source_id}
                            className="rounded-lg border border-black/10 bg-white px-3 py-2 text-[13px] font-semibold hover:bg-black/[0.04] disabled:opacity-40"
                            title={doc.source_id ? t("docs_d.regen_title") : t("docs_d.no_origin_title")}
                        >{regenBusy ? t("docs_d.regenerating") : t("docs_d.regenerate")}</button>
                        {doc.storage_path && (
                            <a href={`${API_BASE_URL}/documents/${doc.id}/pdf`} target="_blank" rel="noreferrer" className="btn btn--primary">
                                {t("docs_d.open_pdf")}
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {doc.storage_path && (
                <div className="mb-6 overflow-hidden rounded-2xl border border-black/10 bg-[#525659]" style={{ height: "70vh" }}>
                    <iframe
                        src={`${API_BASE_URL}/documents/${doc.id}/pdf#toolbar=1&view=FitH`}
                        title={doc.title}
                        className="h-full w-full border-0"
                    />
                </div>
            )}

            <div className="grid grid-cols-3 gap-4">
                <Box label={t("docs_d.source")}>{doc.source_table ?? "—"}{doc.source_id ? ` / ${doc.source_id.slice(0, 8)}` : ""}</Box>
                <Box label={t("docs_d.created")}>{formatDate(doc.created_at)}</Box>
                <Box label={t("docs_d.pdf_size")}>{doc.pdf_size_bytes ? `${Math.round(doc.pdf_size_bytes / 1024)} KB` : "—"}</Box>
            </div>

            {doc.metadata_json && (
                <div className="mt-6 glass-card p-5">
                    <h3 className="mb-2 text-[14px] font-semibold">{t("docs_d.metadata")}</h3>
                    <pre className="overflow-auto rounded-lg bg-black/[0.03] p-3 text-[11px] text-[#1d1d1f]">{JSON.stringify(doc.metadata_json, null, 2)}</pre>
                </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="glass-card p-5">
                    <h3 className="mb-3 text-[14px] font-semibold">{t("docs_d.lifecycle")}</h3>
                    <dl className="space-y-2 text-[13px]">
                        <div className="flex justify-between"><dt className="text-[#8e8e93]">{t("docs_d.sent")}</dt><dd>{formatDate(doc.sent_at)}</dd></div>
                        <div className="flex justify-between"><dt className="text-[#8e8e93]">{t("docs_d.signed")}</dt><dd>{formatDate(doc.signed_at)}</dd></div>
                        <div className="flex justify-between"><dt className="text-[#8e8e93]">{t("docs_d.accepted")}</dt><dd>{formatDate(doc.accepted_at)}</dd></div>
                        <div className="flex justify-between"><dt className="text-[#8e8e93]">{t("docs_d.rejected")}</dt><dd>{formatDate(doc.rejected_at)}</dd></div>
                        <div className="flex justify-between"><dt className="text-[#8e8e93]">{t("docs_d.voided")}</dt><dd>{formatDate(doc.voided_at)}</dd></div>
                    </dl>
                </div>
                <div className="glass-card p-5">
                    <h3 className="mb-3 text-[14px] font-semibold">{t("docs_d.storage")}</h3>
                    <p className="break-all text-[12px] text-[#8e8e93]">{doc.storage_path || t("docs_d.storage_empty")}</p>
                </div>
            </div>
        </div>
    );
}

function Box({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="glass-card p-5">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#8e8e93]">{label}</p>
            <p className="text-[14px] font-semibold">{children}</p>
        </div>
    );
}
