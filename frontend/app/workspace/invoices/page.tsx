"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import { getInvoicesByClient, getProject, formatDate, formatMoney, type Invoice } from "@/lib/mock";

const DEMO_CLIENT_ID = "cli-genomics";

export default function WorkspaceInvoicesPage() {
    const t = useT();
    const invoices = getInvoicesByClient(DEMO_CLIENT_ID);
    const [selected, setSelected] = useState<Invoice | null>(null);

    const totals = {
        paid: invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0),
        outstanding: invoices.filter(i => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + i.amount, 0),
        overdue: invoices.filter(i => i.status === "overdue").reduce((s, i) => s + i.amount, 0),
    };

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-[24px] font-bold text-[#1d1d1f]">{t("ws.inv_title")}</h1>
                <p className="text-[13px] text-[#8e8e93]">{t("ws.inv_sub")}</p>
            </div>

            {/* Summary */}
            <div className="mb-6 grid gap-4 md:grid-cols-3">
                <Summary label={t("ws.inv_paid")} value={formatMoney(totals.paid)} color="#30d158" />
                <Summary label={t("ws.inv_outstanding")} value={formatMoney(totals.outstanding)} color="#0a84ff" />
                <Summary label={t("ws.inv_overdue")} value={formatMoney(totals.overdue)} color="#ff453a" />
            </div>

            <div className="rounded-2xl border border-black/[0.06] bg-white/60 backdrop-blur">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-black/[0.06] text-left">
                            <th className="px-4 py-3 text-[11px] font-semibold uppercase text-[#8e8e93]">{t("ws.inv_col_number")}</th>
                            <th className="px-4 py-3 text-[11px] font-semibold uppercase text-[#8e8e93]">{t("ws.inv_col_project")}</th>
                            <th className="px-4 py-3 text-[11px] font-semibold uppercase text-[#8e8e93]">{t("ws.inv_col_issued")}</th>
                            <th className="px-4 py-3 text-[11px] font-semibold uppercase text-[#8e8e93]">{t("ws.inv_col_due")}</th>
                            <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase text-[#8e8e93]">{t("ws.inv_col_amount")}</th>
                            <th className="px-4 py-3 text-[11px] font-semibold uppercase text-[#8e8e93]">{t("ws.inv_col_status")}</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoices.map(inv => (
                            <tr key={inv.id} className="border-b border-black/[0.04] last:border-0 hover:bg-black/[0.02]">
                                <td className="px-4 py-3 text-[13px] font-semibold text-[#1d1d1f]">{inv.number}</td>
                                <td className="px-4 py-3 text-[12px] text-[#636366]">{inv.project_id ? getProject(inv.project_id)?.name : "—"}</td>
                                <td className="px-4 py-3 text-[12px] text-[#636366]">{formatDate(inv.issue_date)}</td>
                                <td className="px-4 py-3 text-[12px] text-[#636366]">{formatDate(inv.due_date)}</td>
                                <td className="px-4 py-3 text-right text-[13px] font-bold text-[#1d1d1f]">{formatMoney(inv.amount)}</td>
                                <td className="px-4 py-3">
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                        inv.status === "paid" ? "bg-[#30d158]/15 text-[#248a3d]" :
                                        inv.status === "overdue" ? "bg-[#ff453a]/15 text-[#c93400]" :
                                        inv.status === "sent" ? "bg-[#0a84ff]/15 text-[#0040dd]" :
                                        "bg-black/[0.05] text-[#636366]"
                                    }`}>{inv.status}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <button onClick={() => setSelected(inv)} className="text-[12px] font-semibold text-[#ff453a] hover:underline">{t("ws.inv_view")}</button>
                                </td>
                            </tr>
                        ))}
                        {invoices.length === 0 && (
                            <tr><td colSpan={7} className="px-4 py-8 text-center text-[12px] text-[#8e8e93]">{t("ws.inv_empty")}</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {selected && (
                <div onClick={() => setSelected(null)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
                    <div onClick={e => e.stopPropagation()} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="mb-4 flex items-start justify-between">
                            <div>
                                <h2 className="text-[20px] font-bold text-[#1d1d1f]">{selected.number}</h2>
                                <p className="text-[12px] text-[#8e8e93]">{selected.project_id ? getProject(selected.project_id)?.name : ""}</p>
                            </div>
                            <button onClick={() => setSelected(null)} className="text-[20px] text-[#8e8e93]">✕</button>
                        </div>
                        <div className="mb-4 grid grid-cols-2 gap-4 rounded-xl bg-black/[0.02] p-4 text-[12px]">
                            <div><p className="text-[10px] text-[#8e8e93]">{t("ws.inv_issued")}</p><p className="font-medium text-[#1d1d1f]">{formatDate(selected.issue_date)}</p></div>
                            <div><p className="text-[10px] text-[#8e8e93]">{t("ws.inv_due")}</p><p className="font-medium text-[#1d1d1f]">{formatDate(selected.due_date)}</p></div>
                            {selected.paid_date && <div><p className="text-[10px] text-[#8e8e93]">{t("ws.inv_paid_on")}</p><p className="font-medium text-[#30d158]">{formatDate(selected.paid_date)}</p></div>}
                            <div><p className="text-[10px] text-[#8e8e93]">{t("ws.inv_status_lbl")}</p><p className="font-bold uppercase">{selected.status}</p></div>
                        </div>
                        <h3 className="mb-2 text-[12px] font-semibold uppercase text-[#8e8e93]">{t("ws.inv_line_items")}</h3>
                        <div className="mb-4 space-y-2">
                            {selected.line_items.map((li, i) => (
                                <div key={i} className="flex justify-between border-b border-black/[0.04] pb-2 text-[13px]">
                                    <span className="text-[#1d1d1f]">{li.description}</span>
                                    <span className="font-semibold text-[#1d1d1f]">{formatMoney(li.amount)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between border-t border-black/[0.06] pt-3 text-[16px] font-bold">
                            <span>{t("ws.inv_total")}</span>
                            <span>{formatMoney(selected.amount)}</span>
                        </div>
                        {(selected.status === "sent" || selected.status === "overdue") && (
                            <button className="mt-4 w-full rounded-xl bg-[#30d158] py-2.5 text-[13px] font-semibold text-white hover:bg-[#248a3d]">
                                {t("ws.inv_pay_now")}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function Summary({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div className="rounded-2xl border border-black/[0.06] bg-white/60 p-4 backdrop-blur">
            <p className="text-[10px] font-semibold uppercase text-[#8e8e93]">{label}</p>
            <p className="mt-1 text-[24px] font-bold" style={{ color }}>{value}</p>
        </div>
    );
}
