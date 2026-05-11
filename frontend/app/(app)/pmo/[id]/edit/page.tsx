"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProgram, useProjects } from "@/lib/hooks/use-resources";
import { toMockProgram } from "@/lib/adapters";
import { FormShell, Section, Field, Row2, Input, Textarea, Select } from "@/components/shared/FormShell";
import { useToast } from "@/components/shared/ToastProvider";
import { programsApi } from "@/lib/api";
import { useT } from "@/lib/i18n";

export default function EditProgramPage() {
    const t = useT();
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const programId = params.id as string;
    const { data: rawProgram } = useProgram(programId);
    const { data: projectsData } = useProjects();
    const program = rawProgram ? toMockProgram(rawProgram) : null;

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [lead, setLead] = useState("");
    const [strategicPriority, setStrategicPriority] = useState<"P0" | "P1" | "P2">("P2");
    const [status, setStatus] = useState<"on_track" | "at_risk" | "delayed">("on_track");
    const [risk, setRisk] = useState<"low" | "medium" | "high">("medium");
    const [progress, setProgress] = useState(0);
    const [portfolioValue, setPortfolioValue] = useState(0);
    const [projectIds, setProjectIds] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!program) return;
        setName(program.name); setDescription(program.description); setLead(program.lead);
        setStrategicPriority(program.strategic_priority); setStatus(program.status);
        setRisk(program.risk); setProgress(program.progress);
        setPortfolioValue(program.portfolio_value); setProjectIds(program.project_ids);
    }, [program]);

    const toggleProject = (id: string) => {
        setProjectIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
    };

    const handleSubmit = async () => {
        if (!name.trim() || !lead.trim()) {
            toast({ title: t("pmo_e.val_title"), description: t("pmo_e.val_desc"), variant: "warning" });
            return;
        }
        setIsSubmitting(true);
        try {
            await programsApi.update(programId, {
                name,
                description: description || undefined,
                owner: lead,
                strategic_priority: strategicPriority,
                status: status === "on_track" ? "ON_TRACK" : status === "at_risk" ? "AT_RISK" : "DELAYED",
                progress,
                portfolio_value: portfolioValue,
            });
            toast({ title: t("pmo_e.toast_updated"), description: t("pmo_e.toast_updated_desc", { name }), variant: "success" });
            router.push(`/pmo/${programId}`);
        } catch (e) {
            toast({ title: t("pmo_e.toast_error"), description: (e as Error).message, variant: "error" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!program) return <div className="p-6 text-[13px] text-[#8e8e93]">{t("pmo_e.loading")}</div>;

    return (
        <FormShell
            moduleCode="M-05 · PMO"
            moduleColor="#0d9488"
            backHref={`/pmo/${program.id}`}
            backLabel={t("pmo_e.back")}
            title={t("pmo_e.title", { name: program.name })}
            subtitle={t("pmo_e.subtitle")}
            onSubmit={handleSubmit}
            submitLabel={t("pmo_e.submit")}
        >
            <Section title={t("pmo_e.s_details")}>
                <Field label={t("pmo_e.f_name")} required>
                    <Input value={name} onChange={e => setName(e.target.value)} />
                </Field>
                <Field label={t("pmo_e.f_desc")}>
                    <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
                </Field>
                <Row2>
                    <Field label={t("pmo_e.f_lead")} required>
                        <Input value={lead} onChange={e => setLead(e.target.value)} />
                    </Field>
                    <Field label={t("pmo_e.f_priority")}>
                        <Select value={strategicPriority} onChange={e => setStrategicPriority(e.target.value as "P0" | "P1" | "P2")}>
                            <option value="P0">{t("pmo_e.p_p0")}</option>
                            <option value="P1">{t("pmo_e.p_p1")}</option>
                            <option value="P2">{t("pmo_e.p_p2")}</option>
                        </Select>
                    </Field>
                </Row2>
            </Section>

            <Section title={t("pmo_e.s_health")}>
                <Row2>
                    <Field label={t("pmo_e.f_status")}>
                        <Select value={status} onChange={e => setStatus(e.target.value as typeof status)}>
                            <option value="on_track">{t("pmo_e.st_on_track")}</option>
                            <option value="at_risk">{t("pmo_e.st_at_risk")}</option>
                            <option value="delayed">{t("pmo_e.st_delayed")}</option>
                        </Select>
                    </Field>
                    <Field label={t("pmo_e.f_risk")}>
                        <Select value={risk} onChange={e => setRisk(e.target.value as typeof risk)}>
                            <option value="low">{t("pmo_e.r_low")}</option>
                            <option value="medium">{t("pmo_e.r_medium")}</option>
                            <option value="high">{t("pmo_e.r_high")}</option>
                        </Select>
                    </Field>
                </Row2>
                <Row2>
                    <Field label={t("pmo_e.f_progress")}>
                        <Input type="number" min={0} max={100} value={progress} onChange={e => setProgress(Number(e.target.value))} />
                    </Field>
                    <Field label={t("pmo_e.f_value")}>
                        <Input type="number" min={0} value={portfolioValue} onChange={e => setPortfolioValue(Number(e.target.value))} />
                    </Field>
                </Row2>
            </Section>

            <Section title={t("pmo_e.s_projects")}>
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
