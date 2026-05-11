"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useContract, useClient, useProject } from "@/lib/hooks/use-resources";
import { toMockContract, toMockClient, toMockProject } from "@/lib/adapters";
import { formatMoney, formatDate, daysBetween } from "@/lib/format";
import { GeneratePdfMenu, type PdfKindOption } from "@/components/shared";
import { useToast } from "@/components/shared/ToastProvider";
import { projectsApi } from "@/lib/api";
import { useT } from "@/lib/i18n";

const TYPE_LABELS: Record<string, string> = {
    msa: "Master Services Agreement",
    sow: "Statement of Work",
    baa: "Business Associate Agreement",
    nda: "Non-Disclosure Agreement",
    amendment: "Amendment",
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
    draft: { bg: "rgba(142, 142, 147, 0.12)", text: "#636366" },
    review: { bg: "rgba(255, 159, 10, 0.12)", text: "#c93400" },
    signed: { bg: "rgba(48, 209, 88, 0.12)", text: "#248a3d" },
    expired: { bg: "rgba(255, 69, 58, 0.12)", text: "#c93400" },
};

export default function ContractDetailPage() {
    const t = useT();
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const id = params.id as string;
    const { data: rawContract, mutate: mutateContract } = useContract(id);
    const contract = rawContract ? toMockContract(rawContract) : null;
    const { data: rawClient } = useClient(contract?.client_id);
    const { data: rawProject, mutate: mutateProject } = useProject(contract?.project_id ?? null);
    const [creatingProject, setCreatingProject] = useState(false);
    if (!contract) return <div className="p-6 text-[13px] text-[#8e8e93]">{t("det.loading_contract")}</div>;
    const client = rawClient ? toMockClient(rawClient) : null;
    const project = rawProject ? toMockProject(rawProject) : null;
    const status = STATUS_STYLES[contract.status] ?? STATUS_STYLES.draft;
    const isReady = ["signed", "active", "executed"].includes((contract.status || "").toLowerCase());

    const handleCreateProject = async () => {
        if (creatingProject || !rawContract) return;
        setCreatingProject(true);
        try {
            const created = await projectsApi.create({
                name: contract.title || `Proyecto ${contract.id.slice(0, 8)}`,
                client_id: contract.client_id,
                client_name: client?.name,
                deal_id: rawContract.deal_id ?? null,
                contract_id: contract.id,
                status: "active",
                phi_involved: false,
                baa_confirmed: true,
                methodology: "agile",
                health_score: 100,
                budget: contract.value || 0,
                phase: "kickoff",
            } as Partial<import("@/lib/types/api").ApiProject>);
            await mutateContract();
            await mutateProject();
            toast({
                title: "Proyecto creado",
                description: `${created.name} listo para arrancar`,
                variant: "success",
            });
            router.push(`/pm-tab/${created.id}`);
        } catch (e) {
            toast({
                title: "Error",
                description: (e as Error).message,
                variant: "error",
            });
        } finally {
            setCreatingProject(false);
        }
    };

    const daysToExpiry = contract.expiry_date ? daysBetween(new Date().toISOString(), contract.expiry_date) : null;

    return (
        <div className="p-6">
            <Link href="/contracts" className="mb-4 inline-flex items-center gap-2 text-[13px] text-[#7c3aed] hover:underline">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                {t("contract_d.back")}
            </Link>

            <div className="glass-card mb-6 p-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-[24px] text-white" style={{ background: "linear-gradient(135deg, #7c3aed, #bf5af2)" }}>
                            📄
                        </div>
                        <div>
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#7c3aed]">
                                {TYPE_LABELS[contract.type]} · {contract.id}
                            </p>
                            <h1 className="text-[28px] font-bold tracking-tight text-[#1d1d1f]">{contract.title}</h1>
                            <p className="mt-0.5 text-[13px] text-[#8e8e93]">
                                {client?.name}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <span className="status-badge" style={{ "--badge-bg": status.bg, "--badge-color": status.text } as React.CSSProperties}>
                            {contract.status.toUpperCase()}
                        </span>
                        {contract.value > 0 && <p className="text-[20px] font-bold text-[#1d1d1f]">{formatMoney(contract.value)}</p>}
                        <div className="flex items-center gap-2">
                            <GeneratePdfMenu
                                sourceId={contract.id}
                                color="#7c3aed"
                                triggerLabel="Generar PDF"
                                options={[
                                    { kind: "contract", label: "Contrato", description: "Documento principal" },
                                    { kind: "msa", label: "MSA", description: "Master Services Agreement" },
                                    { kind: "sow", label: "SOW", description: "Statement of Work" },
                                    { kind: "nda", label: "NDA" },
                                    { kind: "baa", label: "BAA", description: "Business Associate Agreement" },
                                ] as PdfKindOption[]}
                            />
                            <Link href={`/contracts/${contract.id}/edit`} className="inline-flex items-center gap-1 rounded-lg bg-[#7c3aed] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#6d28d9]">✏️ {t("det.edit")}</Link>
                        </div>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-4 gap-4">
                    <Stat label={t("det.type")} value={contract.type.toUpperCase()} />
                    <Stat label={t("det.signed")} value={contract.signed_date ? formatDate(contract.signed_date) : "—"} />
                    <Stat label={t("det.expires")} value={contract.expiry_date ? formatDate(contract.expiry_date) : "—"} highlight={daysToExpiry !== null && daysToExpiry < 60 ? "red" : undefined} />
                    <Stat label={t("rfq_d.compliance")} value={t("det.controls_count", { x: contract.compliance_controls.length })} />
                </div>

                {daysToExpiry !== null && daysToExpiry < 90 && daysToExpiry > 0 && (
                    <div className="mt-4 rounded-xl border border-[#ff9f0a]/30 bg-[#ff9f0a]/5 p-3">
                        <p className="text-[12px] font-semibold text-[#ff9f0a]">⏰ {t("contract_d.renewal_alert")}</p>
                        <p className="mt-1 text-[12px] text-[#1d1d1f]">{t("det.expires_in", { x: daysToExpiry })}</p>
                    </div>
                )}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                    <div className="glass-card p-5">
                        <h3 className="mb-3 text-[14px] font-semibold text-[#1d1d1f]">{t("contract_d.notes")}</h3>
                        <p className="text-[13px] leading-relaxed text-[#1d1d1f]">{contract.notes}</p>
                    </div>

                    <div className="glass-card p-5">
                        <h3 className="mb-4 text-[14px] font-semibold text-[#1d1d1f]">{t("contract_d.compliance")} ({contract.compliance_controls.length})</h3>
                        {contract.compliance_controls.length === 0 ? (
                            <p className="text-[12px] text-[#8e8e93]">{t("contract_d.compliance_empty")}</p>
                        ) : (
                            <div className="space-y-2">
                                {contract.compliance_controls.map(c => (
                                    <div key={c} className="flex items-center justify-between rounded-xl border border-black/[0.06] bg-[#7c3aed]/5 p-3">
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7c3aed]/15 text-[12px]">🔒</span>
                                            <p className="text-[12px] font-semibold text-[#1d1d1f]">{c}</p>
                                        </div>
                                        <span className="rounded-full bg-[#30d158]/15 px-2 py-0.5 text-[10px] font-bold text-[#248a3d]">{t("det.active")}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="glass-card p-5">
                        <h3 className="mb-3 text-[14px] font-semibold text-[#1d1d1f]">{t("contract_d.signers")}</h3>
                        {contract.signers.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-black/[0.08] p-4 text-center">
                                <p className="text-[12px] text-[#8e8e93]">{t("contract_d.awaiting")}</p>
                                <button className="mt-2 rounded-lg bg-[#7c3aed] px-3 py-1.5 text-[11px] font-semibold text-white">{t("det.send_signature")}</button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {contract.signers.map((s, i) => (
                                    <div key={i} className="flex items-center justify-between rounded-xl border border-black/[0.06] p-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#bf5af2] text-[12px] font-bold text-white">
                                                {s.split(" ").map(n => n[0]).slice(0, 2).join("")}
                                            </div>
                                            <p className="text-[13px] font-medium text-[#1d1d1f]">{s}</p>
                                        </div>
                                        <span className="rounded-full bg-[#30d158]/15 px-2 py-0.5 text-[10px] font-bold text-[#248a3d]">✓ SIGNED</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="glass-card p-5">
                        <h3 className="mb-3 text-[13px] font-semibold text-[#1d1d1f]">{t("det.linked_records")}</h3>
                        <div className="space-y-2">
                            {client && <LinkRow icon="🏢" label={t("det.client")} name={client.name} href={`/customer-health/${client.id}`} />}
                            {project && <LinkRow icon="📁" label={t("det.project")} name={project.name} href={`/pm-tab/${project.id}`} />}
                        </div>
                    </div>

                    <div className="glass-card p-5">
                        <h3 className="mb-3 text-[13px] font-semibold text-[#1d1d1f]">{t("det.document")}</h3>
                        <button className="flex w-full items-center justify-between rounded-xl border border-black/[0.06] bg-black/[0.02] p-3 hover:bg-black/[0.04]">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">📄</span>
                                <p className="text-[12px] font-medium text-[#1d1d1f]">{contract.id}.pdf</p>
                            </div>
                            <span className="text-[11px] text-[#7c3aed]">{t("det.download")}</span>
                        </button>
                    </div>

                    <div className="glass-card p-5">
                        <h3 className="mb-3 text-[13px] font-semibold text-[#1d1d1f]">{t("det.actions")}</h3>
                        <div className="space-y-2">
                            {isReady && !project && (
                                <button
                                    onClick={handleCreateProject}
                                    disabled={creatingProject}
                                    className="w-full rounded-lg bg-gradient-to-r from-[#7c3aed] to-[#bf5af2] px-3 py-2 text-[12px] font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
                                >
                                    {creatingProject ? "Creando…" : "🚀 Crear Proyecto desde este Contrato"}
                                </button>
                            )}
                            {isReady && project && (
                                <Link
                                    href={`/pm-tab/${project.id}`}
                                    className="block w-full rounded-lg border border-[#7c3aed]/30 bg-[#7c3aed]/5 px-3 py-2 text-center text-[12px] font-semibold text-[#7c3aed] hover:bg-[#7c3aed]/10"
                                >
                                    📁 Ver proyecto vinculado
                                </Link>
                            )}
                            {contract.status === "draft" && <button className="w-full rounded-lg bg-[#7c3aed] px-3 py-2 text-[12px] font-semibold text-white">{t("det.send_review")}</button>}
                            {contract.status === "review" && <button className="w-full rounded-lg bg-[#30d158] px-3 py-2 text-[12px] font-semibold text-white">{t("det.mark_signed")}</button>}
                            {contract.status === "signed" && <button className="w-full rounded-lg bg-[#7c3aed] px-3 py-2 text-[12px] font-semibold text-white">{t("det.create_amendment")}</button>}
                            <button className="w-full rounded-lg border border-black/[0.08] bg-black/[0.02] px-3 py-2 text-[12px] font-medium text-[#1d1d1f]">{t("det.generate_pdf")}</button>
                            <button className="w-full rounded-lg border border-black/[0.08] bg-black/[0.02] px-3 py-2 text-[12px] font-medium text-[#1d1d1f]">⚙️ {t("det.edit")}</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: "red" | "green" }) {
    const color = highlight === "red" ? "#ff453a" : highlight === "green" ? "#30d158" : "#1d1d1f";
    return (
        <div className="rounded-xl bg-black/[0.02] p-3">
            <p className="text-[10px] font-medium uppercase text-[#8e8e93]">{label}</p>
            <p className="mt-1 text-[14px] font-bold" style={{ color }}>{value}</p>
        </div>
    );
}

function LinkRow({ icon, label, name, href }: { icon: string; label: string; name: string; href: string }) {
    return (
        <Link href={href} className="flex items-center gap-3 rounded-xl border border-black/[0.06] p-3 hover:bg-black/[0.02]">
            <span className="text-xl">{icon}</span>
            <div className="flex-1">
                <p className="text-[10px] font-medium uppercase tracking-wide text-[#8e8e93]">{label}</p>
                <p className="text-[12px] font-semibold text-[#1d1d1f]">{name}</p>
            </div>
        </Link>
    );
}
