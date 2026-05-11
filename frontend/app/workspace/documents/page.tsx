"use client";

import { useT } from "@/lib/i18n";
import { CONTRACTS, getProjectsByClient, getProject, formatDate } from "@/lib/mock";

const DEMO_CLIENT_ID = "cli-genomics";

export default function WorkspaceDocumentsPage() {
    const t = useT();
    const projects = getProjectsByClient(DEMO_CLIENT_ID);
    const contracts = CONTRACTS.filter(c => c.client_id === DEMO_CLIENT_ID);

    // Synthetic deliverable docs from projects
    const deliverableDocs = projects.flatMap(p =>
        p.deliverables.map((d, i) => ({
            id: `${p.id}-d${i}`,
            name: d,
            project: p.name,
            project_id: p.id,
            type: "deliverable" as const,
            status: i < p.deliverables.length * (p.progress / 100) ? "delivered" : "pending",
        }))
    );

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-[24px] font-bold text-[#1d1d1f]">{t("ws.doc_title")}</h1>
                <p className="text-[13px] text-[#8e8e93]">{t("ws.doc_sub")}</p>
            </div>

            <Section title={t("ws.doc_contracts")}>
                {contracts.length === 0 ? (
                    <p className="text-[12px] text-[#8e8e93]">{t("ws.doc_no_contracts")}</p>
                ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                        {contracts.map(c => (
                            <div key={c.id} className="rounded-2xl border border-black/[0.06] bg-white/60 p-4 backdrop-blur">
                                <div className="mb-2 flex items-start justify-between">
                                    <span className="rounded-full bg-[#5856d6]/15 px-2 py-0.5 text-[10px] font-bold uppercase text-[#5856d6]">{c.type}</span>
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                        c.status === "signed" ? "bg-[#30d158]/15 text-[#248a3d]" :
                                        c.status === "review" ? "bg-[#ff9f0a]/15 text-[#c93400]" :
                                        "bg-black/[0.05] text-[#636366]"
                                    }`}>{c.status}</span>
                                </div>
                                <h3 className="text-[14px] font-semibold text-[#1d1d1f]">{c.title}</h3>
                                {c.signed_date && <p className="mt-1 text-[11px] text-[#8e8e93]">{t("ws.doc_signed", { d: formatDate(c.signed_date) })}</p>}
                                {c.expiry_date && <p className="text-[11px] text-[#8e8e93]">{t("ws.doc_expires", { d: formatDate(c.expiry_date) })}</p>}
                                <button className="mt-3 text-[12px] font-semibold text-[#ff453a] hover:underline">{t("ws.doc_download")}</button>
                            </div>
                        ))}
                    </div>
                )}
            </Section>

            <Section title={t("ws.doc_deliverables")}>
                <div className="rounded-2xl border border-black/[0.06] bg-white/60 backdrop-blur">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-black/[0.06] text-left">
                                <th className="px-4 py-3 text-[11px] font-semibold uppercase text-[#8e8e93]">{t("ws.doc_col_doc")}</th>
                                <th className="px-4 py-3 text-[11px] font-semibold uppercase text-[#8e8e93]">{t("ws.doc_col_proj")}</th>
                                <th className="px-4 py-3 text-[11px] font-semibold uppercase text-[#8e8e93]">{t("ws.doc_col_status")}</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {deliverableDocs.map(d => (
                                <tr key={d.id} className="border-b border-black/[0.04] last:border-0">
                                    <td className="px-4 py-3 text-[13px] text-[#1d1d1f]">📄 {d.name}</td>
                                    <td className="px-4 py-3 text-[12px] text-[#636366]">{d.project}</td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                            d.status === "delivered" ? "bg-[#30d158]/15 text-[#248a3d]" : "bg-[#8e8e93]/15 text-[#636366]"
                                        }`}>{d.status === "delivered" ? t("ws.doc_status_delivered") : t("ws.doc_status_pending")}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {d.status === "delivered" && (
                                            <button className="text-[12px] font-semibold text-[#ff453a] hover:underline">{t("ws.doc_dl")}</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Section>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mb-8">
            <h2 className="mb-3 text-[15px] font-semibold text-[#1d1d1f]">{title}</h2>
            {children}
        </div>
    );
}
