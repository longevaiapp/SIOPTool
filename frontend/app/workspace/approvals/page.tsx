"use client";

import { useState } from "react";
import { getApprovalsByProject, getProjectsByClient, getProject, formatDate, type Approval } from "@/lib/mock";
import { useToast } from "@/components/shared/ToastProvider";
import { useT } from "@/lib/i18n";

const DEMO_CLIENT_ID = "cli-genomics";

export default function WorkspaceApprovalsPage() {
    const t = useT();
    const projects = getProjectsByClient(DEMO_CLIENT_ID);
    const allApprovals = projects.flatMap(p => getApprovalsByProject(p.id));
    const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
    const [selected, setSelected] = useState<Approval | null>(null);
    const { toast } = useToast();

    const filtered = filter === "all" ? allApprovals : allApprovals.filter(a => a.status === filter);

    const handleAction = (a: Approval, action: "approve" | "reject") => {
        toast({
            title: action === "approve" ? t("ws.appr.toast_approved") : t("ws.appr.toast_rejected"),
            description: action === "approve" ? t("ws.appr.toast_signed", { title: a.title }) : t("ws.appr.toast_revisions", { title: a.title }),
            variant: action === "approve" ? "success" : "warning",
        });
        setSelected(null);
    };

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-[24px] font-bold text-[#1d1d1f]">{t("ws.appr.title")}</h1>
                <p className="text-[13px] text-[#8e8e93]">{t("ws.appr.sub")}</p>
            </div>

            <div className="mb-4 flex gap-2">
                {(["pending", "approved", "rejected", "all"] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`rounded-full px-4 py-1.5 text-[12px] font-medium capitalize transition-all ${
                            filter === f ? "bg-[#1d1d1f] text-white" : "bg-black/[0.04] text-[#636366] hover:bg-black/[0.06]"
                        }`}
                    >
                        {t(`ws.appr.f_${f}`)} ({f === "all" ? allApprovals.length : allApprovals.filter(a => a.status === f).length})
                    </button>
                ))}
            </div>

            <div className="space-y-3">
                {filtered.map(a => {
                    const project = getProject(a.project_id);
                    return (
                        <div key={a.id} className="rounded-2xl border border-black/[0.06] bg-white/60 p-5 backdrop-blur">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="mb-2 flex items-center gap-2">
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                            a.type === "milestone" ? "bg-[#ff9f0a]/15 text-[#c93400]" :
                                            a.type === "scope_change" ? "bg-[#ff453a]/15 text-[#c93400]" :
                                            a.type === "deliverable" ? "bg-[#30d158]/15 text-[#248a3d]" :
                                            "bg-[#5856d6]/15 text-[#5856d6]"
                                        }`}>{a.type === "milestone" ? t("ws.appr.t_milestone") : a.type === "scope_change" ? t("ws.appr.t_scope") : a.type === "deliverable" ? t("ws.appr.t_deliverable") : t("ws.appr.t_other")}</span>
                                        <span className="text-[10px] text-[#8e8e93]">{project?.name}</span>
                                    </div>
                                    <h3 className="text-[15px] font-semibold text-[#1d1d1f]">{a.title}</h3>
                                    <p className="mt-1 text-[12px] text-[#636366]">{a.description}</p>
                                    <p className="mt-2 text-[11px] text-[#8e8e93]">
                                        {t("ws.appr.requested", { by: a.requested_by, date: formatDate(a.requested_at), due: formatDate(a.due_date) })}
                                    </p>
                                </div>
                                {a.status === "pending" ? (
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => handleAction(a, "approve")}
                                            className="rounded-lg bg-[#30d158] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#248a3d]"
                                        >
                                            {t("ws.appr.btn_approve")}
                                        </button>
                                        <button
                                            onClick={() => handleAction(a, "reject")}
                                            className="rounded-lg border border-[#ff453a]/30 bg-white px-4 py-2 text-[12px] font-semibold text-[#ff453a] hover:bg-[#ff453a]/5"
                                        >
                                            {t("ws.appr.btn_reject")}
                                        </button>
                                    </div>
                                ) : (
                                    <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${
                                        a.status === "approved" ? "bg-[#30d158]/15 text-[#248a3d]" : "bg-[#ff453a]/15 text-[#c93400]"
                                    }`}>{a.status}</span>
                                )}
                            </div>
                        </div>
                    );
                })}
                {filtered.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-black/[0.08] p-8 text-center">
                        <p className="text-[13px] text-[#8e8e93]">{t("ws.appr.no_filter", { f: t(`ws.appr.f_${filter}`) })}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
