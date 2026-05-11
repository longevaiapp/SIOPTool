"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProjects } from "@/lib/hooks/use-resources";
import { FormShell, Section, Field, Row2, Input, Textarea, Select } from "@/components/shared/FormShell";
import { useToast } from "@/components/shared/ToastProvider";
import { programsApi } from "@/lib/api";
import { useT } from "@/lib/i18n";

export default function NewProgramPage() {
    const t = useT();
    const router = useRouter();
    const { toast } = useToast();
    const { data: projectsData } = useProjects();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [lead, setLead] = useState("");
    const [strategicPriority, setStrategicPriority] = useState<"P0" | "P1" | "P2">("P1");
    const [status, setStatus] = useState<"on_track" | "at_risk" | "delayed">("on_track");
    const [risk, setRisk] = useState<"low" | "medium" | "high">("low");
    const [progress, setProgress] = useState(0);
    const [portfolioValue, setPortfolioValue] = useState(0);
    const [projectIds, setProjectIds] = useState<string[]>([]);

    const toggleProject = (id: string) => {
        setProjectIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!name.trim() || !lead.trim()) {
            toast({ title: t("pmo_new.toast_validation"), description: t("pmo_new.toast_required"), variant: "warning" });
            return;
        }
        setIsSubmitting(true);
        try {
            await programsApi.create({
                name,
                description: description || undefined,
                owner: lead,
                strategic_priority: strategicPriority,
                status: status === "on_track" ? "ON_TRACK" : status === "at_risk" ? "AT_RISK" : "DELAYED",
                progress,
                portfolio_value: portfolioValue,
            });
            toast({ title: t("pmo_new.toast_created"), description: t("pmo_new.toast_added", { name }), variant: "success" });
            router.push("/pmo");
        } catch (e) {
            toast({ title: "Error", description: (e as Error).message, variant: "error" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <FormShell
            moduleCode={t("pmo_new.module")}
            moduleColor="#0d9488"
            backHref="/pmo"
            backLabel={t("pmo_new.back")}
            title={t("pmo_new.title")}
            subtitle={t("pmo_new.subtitle")}
            onSubmit={handleSubmit}
            submitLabel={t("pmo_new.submit")}
        >
            <Section title={t("pmo_new.section_details")}>
                <Field label={t("pmo_new.field_name")} required>
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder={t("pmo_new.ph_name")} />
                </Field>
                <Field label={t("pmo_new.field_description")}>
                    <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder={t("pmo_new.ph_description")} />
                </Field>
                <Row2>
                    <Field label={t("pmo_new.field_lead")} required>
                        <Input value={lead} onChange={e => setLead(e.target.value)} placeholder={t("pmo_new.ph_lead")} />
                    </Field>
                    <Field label={t("pmo_new.field_priority")}>
                        <Select value={strategicPriority} onChange={e => setStrategicPriority(e.target.value as "P0" | "P1" | "P2")}>
                            <option value="P0">{t("pmo_new.opt_p0")}</option>
                            <option value="P1">{t("pmo_new.opt_p1")}</option>
                            <option value="P2">{t("pmo_new.opt_p2")}</option>
                        </Select>
                    </Field>
                </Row2>
            </Section>

            <Section title={t("pmo_new.section_health")}>
                <Row2>
                    <Field label={t("pmo_new.field_status")}>
                        <Select value={status} onChange={e => setStatus(e.target.value as typeof status)}>
                            <option value="on_track">{t("pmo_new.opt_on_track")}</option>
                            <option value="at_risk">{t("pmo_new.opt_at_risk")}</option>
                            <option value="delayed">{t("pmo_new.opt_delayed")}</option>
                        </Select>
                    </Field>
                    <Field label={t("pmo_new.field_risk")}>
                        <Select value={risk} onChange={e => setRisk(e.target.value as typeof risk)}>
                            <option value="low">{t("sup_new.opt_low")}</option>
                            <option value="medium">{t("sup_new.opt_med")}</option>
                            <option value="high">{t("sup_new.opt_high")}</option>
                        </Select>
                    </Field>
                </Row2>
                <Row2>
                    <Field label={t("pmo_new.field_progress")}>
                        <Input type="number" min={0} max={100} value={progress} onChange={e => setProgress(Number(e.target.value))} />
                    </Field>
                    <Field label={t("pmo_new.field_value")}>
                        <Input type="number" min={0} value={portfolioValue} onChange={e => setPortfolioValue(Number(e.target.value))} />
                    </Field>
                </Row2>
            </Section>

            <Section title={t("pmo_new.section_projects")} description={t("pmo_new.section_projects_desc")}>
                <div className="grid gap-2 md:grid-cols-2">
                    {(projectsData ?? []).map(p => (
                        <label key={p.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-black/[0.06] bg-white/60 p-3 hover:bg-black/[0.02]">
                            <input
                                type="checkbox"
                                checked={projectIds.includes(p.id)}
                                onChange={() => toggleProject(p.id)}
                                className="mt-0.5 h-4 w-4 accent-[#0d9488]"
                            />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] font-semibold text-[#1d1d1f]">{p.name}</p>
                                <p className="text-[11px] text-[#8e8e93]">{p.id.slice(0, 8)} · {p.status}</p>
                            </div>
                        </label>
                    ))}
                </div>
            </Section>
        </FormShell>
    );
}
