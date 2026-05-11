"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProject, useClients } from "@/lib/hooks/use-resources";
import { toMockProject } from "@/lib/adapters";
import { FormShell, Section, Field, Row2, Input, Textarea, Select, CheckboxField } from "@/components/shared/FormShell";
import { useToast } from "@/components/shared/ToastProvider";
import { projectsApi } from "@/lib/api";
import { useT } from "@/lib/i18n";

export default function EditProjectPage() {
    const t = useT();
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const id = params.id as string;
    const { data: rawProject } = useProject(id);
    const { data: clientsData } = useClients();
    const project = rawProject ? toMockProject(rawProject) : null;

    const [name, setName] = useState("");
    const [clientId, setClientId] = useState("");
    const [status, setStatus] = useState("planning");
    const [progress, setProgress] = useState("0");
    const [pmName, setPmName] = useState("");
    const [techLead, setTechLead] = useState("");
    const [budget, setBudget] = useState("0");
    const [marginTarget, setMarginTarget] = useState("35");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [description, setDescription] = useState("");
    const [objectives, setObjectives] = useState("");
    const [hipaa, setHipaa] = useState(false);
    const [baa, setBaa] = useState(false);

    useEffect(() => {
        if (!project) return;
        setName(project.name); setClientId(project.client_id); setStatus(project.status);
        setProgress(String(project.progress)); setPmName(project.pm_name); setTechLead(project.tech_lead);
        setBudget(String(project.budget)); setMarginTarget(String(project.margin_target));
        setStartDate(project.start_date); setEndDate(project.end_date);
        setDescription(project.description); setObjectives(project.objectives);
        setHipaa(project.hipaa_required); setBaa(project.baa_signed);
    }, [project]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (hipaa && !baa && status === "active") {
            toast({ title: t("pm_e.toast_baa_title"), description: t("pm_e.toast_baa_desc"), variant: "error" });
            return;
        }
        setIsSubmitting(true);
        try {
            await projectsApi.update(id, {
                name,
                client_id: clientId || undefined,
                status: status.toUpperCase(),
                health_score: parseInt(progress) || 0,
                budget: parseFloat(budget) || 0,
                start_date: startDate || undefined,
                end_date: endDate || undefined,
                pm_name: pmName || undefined,
                tech_lead: techLead || undefined,
                notes: description || undefined,
            });
            toast({ title: t("pm_e.toast_updated"), description: t("pm_e.toast_updated_desc", { name }), variant: "success" });
            router.push(`/pm-tab/${id}`);
        } catch (e) {
            toast({ title: t("pm_e.toast_error"), description: (e as Error).message, variant: "error" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!project) return <div className="p-6 text-[13px] text-[#8e8e93]">{t("pm_e.loading")}</div>;

    return (
        <FormShell
            moduleCode={`M-04 · ${t("pm_e.code_project")} · ${project.id}`}
            moduleColor="#ea580c"
            backHref={`/pm-tab/${project.id}`}
            backLabel={t("pm_e.back")}
            title={t("pm_e.title", { name: project.name })}
            onSubmit={handleSubmit}
            submitLabel={t("pm_e.submit")}
        >
            <Section title={t("pm_e.s_basic")}>
                <Field label={t("pm_e.f_name")} required>
                    <Input value={name} onChange={e => setName(e.target.value)} />
                </Field>
                <Row2>
                    <Field label={t("pm_e.f_client")} required>
                        <Select value={clientId} onChange={e => setClientId(e.target.value)}>
                            {(clientsData ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </Select>
                    </Field>
                    <Field label={t("pm_e.f_status")}>
                        <Select value={status} onChange={e => setStatus(e.target.value)}>
                            <option value="planning">{t("pm_e.st_planning")}</option>
                            <option value="active">{t("pm_e.st_active")}</option>
                            <option value="review">{t("pm_e.st_review")}</option>
                            <option value="paused">{t("pm_e.st_paused")}</option>
                            <option value="complete">{t("pm_e.st_complete")}</option>
                        </Select>
                    </Field>
                </Row2>
                <Field label={t("pm_e.f_progress")}>
                    <Input type="number" min="0" max="100" value={progress} onChange={e => setProgress(e.target.value)} />
                </Field>
            </Section>

            <Section title={t("pm_e.s_team")}>
                <Row2>
                    <Field label={t("pm_e.f_pm")}>
                        <Input value={pmName} onChange={e => setPmName(e.target.value)} />
                    </Field>
                    <Field label={t("pm_e.f_techlead")}>
                        <Input value={techLead} onChange={e => setTechLead(e.target.value)} />
                    </Field>
                </Row2>
            </Section>

            <Section title={t("pm_e.s_fin")}>
                <Row2>
                    <Field label={t("pm_e.f_budget")}>
                        <Input type="number" value={budget} onChange={e => setBudget(e.target.value)} />
                    </Field>
                    <Field label={t("pm_e.f_margin")}>
                        <Input type="number" value={marginTarget} onChange={e => setMarginTarget(e.target.value)} />
                    </Field>
                </Row2>
            </Section>

            <Section title={t("pm_e.s_timeline")}>
                <Row2>
                    <Field label={t("pm_e.f_start")}>
                        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </Field>
                    <Field label={t("pm_e.f_end")}>
                        <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </Field>
                </Row2>
            </Section>

            <Section title={t("pm_e.s_scope")}>
                <Field label={t("pm_e.f_desc")}>
                    <Textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} />
                </Field>
                <Field label={t("pm_e.f_objectives")}>
                    <Textarea rows={3} value={objectives} onChange={e => setObjectives(e.target.value)} />
                </Field>
            </Section>

            <Section title={t("pm_e.s_compliance")} description={t("pm_e.s_compliance_d")}>
                <CheckboxField label={t("pm_e.f_hipaa")} description={t("pm_e.f_hipaa_d")} checked={hipaa} onChange={setHipaa} />
                <CheckboxField label={t("pm_e.f_baa")} description={t("pm_e.f_baa_d")} checked={baa} onChange={setBaa} />
            </Section>
        </FormShell>
    );
}
