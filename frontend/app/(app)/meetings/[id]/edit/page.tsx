"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMeeting, useClients, useDeals, useProjects } from "@/lib/hooks/use-resources";
import { toMockMeeting, toMockDeal } from "@/lib/adapters";
import { FormShell, Section, Field, Row2, Input, Textarea, Select } from "@/components/shared/FormShell";
import { useToast } from "@/components/shared/ToastProvider";
import { MEETING_TYPE_CONFIG } from "@/lib/types/meeting";
import { meetingsApi } from "@/lib/api";
import { useT } from "@/lib/i18n";

export default function EditMeetingPage() {
    const t = useT();
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const meetingId = params.id as string;
    const { data: rawMeeting } = useMeeting(meetingId);
    const { data: clientsData } = useClients();
    const { data: dealsData } = useDeals();
    const { data: projectsData } = useProjects();
    const meeting = rawMeeting ? toMockMeeting(rawMeeting) : null;

    const [title, setTitle] = useState("");
    const [type, setType] = useState("kickoff");
    const [date, setDate] = useState("");
    const [durationMin, setDurationMin] = useState(60);
    const [status, setStatus] = useState<"scheduled" | "in_progress" | "completed" | "analyzed">("scheduled");
    const [clientId, setClientId] = useState("");
    const [dealId, setDealId] = useState("");
    const [projectId, setProjectId] = useState("");
    const [participantsRaw, setParticipantsRaw] = useState("");
    const [summary, setSummary] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!meeting) return;
        setTitle(meeting.title); setType(meeting.type); setDate(meeting.date);
        setDurationMin(meeting.duration_min);
        setStatus(meeting.status as typeof status);
        setClientId(meeting.client_id ?? ""); setDealId(meeting.deal_id ?? "");
        setProjectId(meeting.project_id ?? "");
        setParticipantsRaw(meeting.participants.join(", "));
        setSummary(meeting.summary ?? "");
    }, [meeting]);

    const handleSubmit = async () => {
        if (!title.trim()) {
            toast({ title: t("mt_e.val"), description: t("mt_e.val_required"), variant: "warning" });
            return;
        }
        setIsSubmitting(true);
        try {
            await meetingsApi.update(meetingId, {
                title,
                meeting_type: type,
                scheduled_at: date ? new Date(date).toISOString() : undefined,
                duration_min: durationMin,
                status: status.toUpperCase(),
                client_id: clientId || undefined,
                deal_id: dealId || undefined,
                project_id: projectId || undefined,
                participants: participantsRaw ? participantsRaw.split(",").map(p => p.trim()).filter(Boolean) : undefined,
                summary: summary || undefined,
            });
            toast({ title: t("mt_e.toast_updated"), description: t("mt_e.toast_saved", { n: title }), variant: "success" });
            router.push(`/meetings/${meetingId}`);
        } catch (e) {
            toast({ title: t("common.error"), description: (e as Error).message, variant: "error" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!meeting) return <div className="p-6 text-[13px] text-[#8e8e93]">{t("mt_e.loading")}</div>;

    return (
        <FormShell
            moduleCode="MEETINGS"
            moduleColor="#5856d6"
            backHref={`/meetings/${meeting.id}`}
            backLabel={t("mt_e.back")}
            title={t("mt_e.title", { name: meeting.title })}
            subtitle={t("mt_e.subtitle")}
            onSubmit={handleSubmit}
            submitLabel={t("mt_e.save")}
        >
            <Section title={t("mt_e.sec_details")}>
                <Field label={t("mt_e.f_title")} required>
                    <Input value={title} onChange={e => setTitle(e.target.value)} />
                </Field>
                <Row2>
                    <Field label={t("mt_e.f_type")}>
                        <Select value={type} onChange={e => setType(e.target.value)}>
                            {Object.entries(MEETING_TYPE_CONFIG).map(([key, cfg]) => (
                                <option key={key} value={key}>{cfg.icon} {cfg.label}</option>
                            ))}
                        </Select>
                    </Field>
                    <Field label={t("mt_e.f_status")}>
                        <Select value={status} onChange={e => setStatus(e.target.value as typeof status)}>
                            <option value="scheduled">{t("mt_e.s_scheduled")}</option>
                            <option value="in_progress">{t("mt_e.s_in_progress")}</option>
                            <option value="completed">{t("mt_e.s_completed")}</option>
                            <option value="analyzed">{t("mt_e.s_analyzed")}</option>
                        </Select>
                    </Field>
                </Row2>
                <Row2>
                    <Field label={t("mt_e.f_date")}>
                        <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                    </Field>
                    <Field label={t("mt_e.f_duration")}>
                        <Input type="number" min={1} value={durationMin} onChange={e => setDurationMin(Number(e.target.value))} />
                    </Field>
                </Row2>
            </Section>

            <Section title={t("mt_e.sec_part")} description={t("mt_e.sec_part_desc")}>
                <Field label={t("mt_e.f_names")}>
                    <Textarea value={participantsRaw} onChange={e => setParticipantsRaw(e.target.value)} rows={2} placeholder={t("mt_e.f_names_ph")} />
                </Field>
            </Section>

            <Section title={t("mt_e.sec_linked")} description={t("mt_e.sec_linked_desc")}>
                <Row2>
                    <Field label={t("mt_e.f_client")}>
                        <Select value={clientId} onChange={e => setClientId(e.target.value)}>
                            <option value="">{t("mt_e.none")}</option>
                            {(clientsData ?? []).map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </Select>
                    </Field>
                    <Field label={t("mt_e.f_deal")}>
                        <Select value={dealId} onChange={e => setDealId(e.target.value)}>
                            <option value="">{t("mt_e.none")}</option>
                            {(dealsData ?? []).map(d => {
                                const m = toMockDeal(d);
                                return <option key={m.id} value={m.id}>{m.name}</option>;
                            })}
                        </Select>
                    </Field>
                </Row2>
                <Field label={t("mt_e.f_project")}>
                    <Select value={projectId} onChange={e => setProjectId(e.target.value)}>
                        <option value="">{t("mt_e.none")}</option>
                        {(projectsData ?? []).map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </Select>
                </Field>
            </Section>

            <Section title={t("mt_e.sec_summary")}>
                <Field label={t("mt_e.f_summary")}>
                    <Textarea value={summary} onChange={e => setSummary(e.target.value)} rows={4} placeholder={t("mt_e.f_summary_ph")} />
                </Field>
            </Section>
        </FormShell>
    );
}
