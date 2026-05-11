"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import { getTicketsByClient, getProject, formatDate, type Ticket } from "@/lib/mock";
import { useToast } from "@/components/shared/ToastProvider";

const DEMO_CLIENT_ID = "cli-genomics";

export default function WorkspaceSupportPage() {
    const t = useT();
    const tickets = getTicketsByClient(DEMO_CLIENT_ID);
    const [creating, setCreating] = useState(false);
    const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");

    const filtered = tickets.filter(t => {
        if (filter === "all") return true;
        if (filter === "open") return t.status === "open" || t.status === "in_progress";
        return t.status === "resolved" || t.status === "closed";
    });

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-[24px] font-bold text-[#1d1d1f]">{t("ws.sup_title")}</h1>
                    <p className="text-[13px] text-[#8e8e93]">{t("ws.sup_sub")}</p>
                </div>
                <button
                    onClick={() => setCreating(true)}
                    className="rounded-xl bg-gradient-to-br from-[#ff9f0a] to-[#ff453a] px-5 py-2 text-[13px] font-semibold text-white shadow-lg"
                >
                    {t("ws.sup_new")}
                </button>
            </div>

            <div className="mb-4 flex gap-2">
                {((["open", "resolved", "all"] as const)).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`rounded-full px-4 py-1.5 text-[12px] font-medium capitalize ${
                            filter === f ? "bg-[#1d1d1f] text-white" : "bg-black/[0.04] text-[#636366]"
                        }`}
                    >
                        {f === "open" ? t("ws.sup_filter_open") : f === "resolved" ? t("ws.sup_filter_resolved") : t("ws.sup_filter_all")}
                    </button>
                ))}
            </div>

            <div className="space-y-3">
                {filtered.map(t2 => (
                    <TicketCard key={t2.id} ticket={t2} />
                ))}
                {filtered.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-black/[0.08] p-8 text-center">
                        <p className="text-[13px] text-[#8e8e93]">{t("ws.sup_no", { f: filter === "open" ? t("ws.sup_filter_open") : filter === "resolved" ? t("ws.sup_filter_resolved") : t("ws.sup_filter_all") })}</p>
                    </div>
                )}
            </div>

            {creating && <NewTicketModal onClose={() => setCreating(false)} />}
        </div>
    );
}

function TicketCard({ ticket }: { ticket: Ticket }) {
    const t = useT();
    const project = ticket.project_id ? getProject(ticket.project_id) : null;
    return (
        <div className="rounded-2xl border border-black/[0.06] bg-white/60 p-5 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                        <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[10px] font-mono text-[#636366]">{ticket.id}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            ticket.priority === "urgent" ? "bg-[#ff453a]/15 text-[#c93400]" :
                            ticket.priority === "high" ? "bg-[#ff9f0a]/15 text-[#c93400]" :
                            ticket.priority === "medium" ? "bg-[#0a84ff]/15 text-[#0040dd]" :
                            "bg-black/[0.05] text-[#636366]"
                        }`}>{ticket.priority}</span>
                        {project && <span className="text-[10px] text-[#8e8e93]">{project.name}</span>}
                    </div>
                    <h3 className="text-[14px] font-semibold text-[#1d1d1f]">{ticket.title}</h3>
                    <p className="mt-1 text-[12px] text-[#636366]">{ticket.description}</p>
                    <p className="mt-2 text-[11px] text-[#8e8e93]">{t("ws.sup_created", { d: formatDate(ticket.created_at) })}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${
                    ticket.status === "open" ? "bg-[#ff9f0a]/15 text-[#c93400]" :
                    ticket.status === "in_progress" ? "bg-[#0a84ff]/15 text-[#0040dd]" :
                    ticket.status === "resolved" ? "bg-[#30d158]/15 text-[#248a3d]" :
                    "bg-black/[0.05] text-[#636366]"
                }`}>{ticket.status.replace("_", " ")}</span>
            </div>
        </div>
    );
}

function NewTicketModal({ onClose }: { onClose: () => void }) {
    const t = useT();
    const [title, setTitle] = useState("");
    const [priority, setPriority] = useState("medium");
    const [description, setDescription] = useState("");
    const { toast } = useToast();

    const handleSubmit = () => {
        if (!title.trim()) {
            toast({ title: t("ws.sup_validation"), description: t("ws.sup_title_required"), variant: "warning" });
            return;
        }
        const pLabel = priority === "low" ? t("ws.sup_p_low") : priority === "medium" ? t("ws.sup_p_med") : priority === "high" ? t("ws.sup_p_high") : t("ws.sup_p_urgent");
        toast({ title: t("ws.sup_submitted"), description: t("ws.sup_submitted_desc", { title, p: pLabel }), variant: "success" });
        onClose();
    };

    return (
        <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
            <div onClick={e => e.stopPropagation()} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
                <h2 className="mb-4 text-[18px] font-bold text-[#1d1d1f]">{t("ws.sup_modal_title")}</h2>
                <div className="space-y-3">
                    <Field label={t("ws.sup_field_title")}>
                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder={t("ws.sup_ph_title")}
                            className="w-full rounded-xl border border-black/[0.08] px-3 py-2 text-[13px]"
                        />
                    </Field>
                    <Field label={t("ws.sup_field_priority")}>
                        <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full rounded-xl border border-black/[0.08] px-3 py-2 text-[13px]">
                            <option value="low">{t("ws.sup_p_low")}</option>
                            <option value="medium">{t("ws.sup_p_med")}</option>
                            <option value="high">{t("ws.sup_p_high")}</option>
                            <option value="urgent">{t("ws.sup_p_urgent")}</option>
                        </select>
                    </Field>
                    <Field label={t("ws.sup_field_desc")}>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={4}
                            placeholder={t("ws.sup_ph_desc")}
                            className="w-full rounded-xl border border-black/[0.08] px-3 py-2 text-[13px]"
                        />
                    </Field>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                    <button onClick={onClose} className="rounded-xl bg-black/[0.05] px-4 py-2 text-[13px] font-semibold">{t("ws.sup_cancel")}</button>
                    <button onClick={handleSubmit} className="rounded-xl bg-gradient-to-br from-[#ff9f0a] to-[#ff453a] px-5 py-2 text-[13px] font-semibold text-white">{t("ws.sup_submit")}</button>
                </div>
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-[#8e8e93]">{label}</label>
            {children}
        </div>
    );
}
