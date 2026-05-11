"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useProject, useClient, useDeal, useContract, useMeetings, useTasks, useSprints } from "@/lib/hooks/use-resources";
import { toMockProject, toMockClient, toMockDeal, toMockContract, toMockMeeting } from "@/lib/adapters";
import { tasksApi } from "@/lib/api";
import { formatMoney, formatDate, daysBetween } from "@/lib/format";
import { useToast } from "@/components/shared/ToastProvider";
import { GeneratePdfMenu, type PdfKindOption } from "@/components/shared";
import { useT } from "@/lib/i18n";

type TaskStatus = "todo" | "in_progress" | "review" | "done";
type TaskForm = {
    id?: string;
    title: string;
    assignee: string;
    priority: "low" | "medium" | "high";
    points: number;
    status: TaskStatus;
};
const EMPTY_TASK: TaskForm = { title: "", assignee: "", priority: "medium", points: 3, status: "todo" };

const PROJECT_STATUS_COLORS: Record<string, { bg: string; text: string; key: string }> = {
    active: { bg: "rgba(48, 209, 88, 0.12)", text: "#248a3d", key: "pm_d.status_active" },
    review: { bg: "rgba(191, 90, 242, 0.12)", text: "#8944ab", key: "pm_d.status_review" },
    planning: { bg: "rgba(0, 122, 255, 0.12)", text: "#0040dd", key: "pm_d.status_planning" },
    paused: { bg: "rgba(255, 159, 10, 0.12)", text: "#c93400", key: "pm_d.status_paused" },
    complete: { bg: "rgba(142, 142, 147, 0.12)", text: "#636366", key: "pm_d.status_complete" },
    // schema-default lowercase variants
    draft: { bg: "rgba(142, 142, 147, 0.12)", text: "#636366", key: "pm_d.status_draft" },
    on_hold: { bg: "rgba(255, 159, 10, 0.12)", text: "#c93400", key: "pm_d.status_on_hold" },
    completed: { bg: "rgba(142, 142, 147, 0.12)", text: "#636366", key: "pm_d.status_completed" },
    cancelled: { bg: "rgba(255, 69, 58, 0.12)", text: "#c93400", key: "pm_d.status_cancelled" },
};
const FALLBACK_PROJECT_STATUS = { bg: "rgba(142, 142, 147, 0.12)", text: "#636366", key: "" };

type Tab = "overview" | "sprints" | "team" | "budget" | "risks" | "documents";

export default function ProjectDetailPage() {
    const t = useT();
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const projectId = params.id as string;
    const { data: rawProject } = useProject(projectId);
    const project = rawProject ? toMockProject(rawProject) : null;
    const { data: rawClient } = useClient(project?.client_id);
    const { data: rawDeal } = useDeal(project?.deal_id ?? null);
    const { data: rawContract } = useContract(project?.contract_id ?? null);
    const { data: meetingsData } = useMeetings();
    const { data: tasksData, mutate: mutateTasks } = useTasks();
    const { data: sprintsData } = useSprints();
    const [activeTab, setActiveTab] = useState<Tab>("overview");
    const [taskModal, setTaskModal] = useState<TaskForm | null>(null);
    const [savingTask, setSavingTask] = useState(false);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
    if (!project) return <div className="p-6 text-[13px] text-[#8e8e93]">{t("det.loading_project")}</div>;

    const client = rawClient ? toMockClient(rawClient) : null;
    const deal = rawDeal ? toMockDeal(rawDeal) : null;
    const contract = rawContract ? toMockContract(rawContract) : null;
    const meetings = (meetingsData ?? []).filter(m => m.project_id === project.id).map(toMockMeeting);
    const allProjectTasks = (tasksData ?? []).filter(t => t.project_id === project.id);
    const projectSprints = (sprintsData ?? []).filter(s => s.project_id === project.id);
    // Active sprint = first ACTIVE, else first PLANNED, else null
    const activeSprint =
        projectSprints.find(s => (s.status ?? "").toUpperCase() === "ACTIVE") ??
        projectSprints.find(s => (s.status ?? "").toUpperCase() === "PLANNED") ??
        null;
    const tasks = activeSprint
        ? allProjectTasks.filter(t => t.sprint_id === activeSprint.id)
        : allProjectTasks.filter(t => !t.sprint_id);
    const status = PROJECT_STATUS_COLORS[project.status] ?? PROJECT_STATUS_COLORS[project.status?.toLowerCase()] ?? FALLBACK_PROJECT_STATUS;

    const totalDays = daysBetween(project.start_date, project.end_date);
    const elapsedDays = daysBetween(project.start_date, new Date().toISOString());
    const burnRate = project.spent / project.budget;

    const healthColors = { green: "#30d158", yellow: "#ff9f0a", red: "#ff453a", gray: "#8e8e93" };

    async function saveTask() {
        if (!taskModal || !taskModal.title.trim()) return;
        setSavingTask(true);
        try {
            const payload = {
                project_id: project!.id,
                title: taskModal.title.trim(),
                assignee: taskModal.assignee.trim() || null,
                priority: taskModal.priority,
                points: taskModal.points,
                status: taskModal.status,
            };
            if (taskModal.id) {
                await tasksApi.update(taskModal.id, payload);
                toast({ title: t("pm_d.toast_updated"), description: payload.title, variant: "success" });
            } else {
                await tasksApi.create(payload);
                toast({ title: t("pm_d.toast_created"), description: payload.title, variant: "success" });
            }
            await mutateTasks();
            setTaskModal(null);
        } catch (e) {
            toast({ title: "Error", description: (e as Error).message, variant: "error" });
        } finally {
            setSavingTask(false);
        }
    }

    async function deleteTask(id: string) {
        if (!window.confirm(t("pm_d.confirm_delete"))) return;
        setSavingTask(true);
        try {
            await tasksApi.remove(id);
            await mutateTasks();
            setTaskModal(null);
            toast({ title: t("pm_d.toast_deleted"), variant: "success" });
        } catch (e) {
            toast({ title: "Error", description: (e as Error).message, variant: "error" });
        } finally {
            setSavingTask(false);
        }
    }

    async function moveTask(taskId: string, newStatus: TaskStatus) {
        const t = tasks.find(x => x.id === taskId);
        if (!t || t.status === newStatus) return;
        // optimistic update
        const optimistic = (tasksData ?? []).map(x => x.id === taskId ? { ...x, status: newStatus } : x);
        await mutateTasks(optimistic, false);
        try {
            await tasksApi.update(taskId, { status: newStatus });
            await mutateTasks();
        } catch (e) {
            await mutateTasks();
            toast({ title: "Error", description: (e as Error).message, variant: "error" });
        }
    }

    return (
        <div className="p-6">
            <Link href="/pm-tab" className="mb-4 inline-flex items-center gap-2 text-[13px] text-[#ff453a] hover:underline">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                {t("pm_d.back")}
            </Link>

            {/* Header */}
            <div className="glass-card mb-6 p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div
                            className="flex h-14 w-14 items-center justify-center rounded-2xl text-[20px] font-bold text-white"
                            style={{ background: "linear-gradient(135deg, #ff453a, #ff9f0a)" }}
                        >
                            {project.id.split("-")[1]}
                        </div>
                        <div>
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#ff453a]">
                                {t("pm_d.project_id", { id: project.id })}
                            </p>
                            <h1 className="text-[28px] font-bold tracking-tight text-[#1d1d1f]">{project.name}</h1>
                            <p className="mt-0.5 text-[13px] text-[#8e8e93]">
                                {t("pm_d.subtitle", { client: client?.name ?? "", pm: project.pm_name, sprint: project.current_sprint })}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <span
                            className="status-badge"
                            style={{ "--badge-bg": status.bg, "--badge-color": status.text } as React.CSSProperties}
                        >
                            {status.key ? t(status.key) : "—"}
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ background: healthColors[project.health], boxShadow: `0 0 8px ${healthColors[project.health]}` }} />
                            <span className="text-[12px] font-medium text-[#636366]">{t("pm_d.health", { n: project.health_score })}</span>
                        </div>
                        <GeneratePdfMenu
                            sourceId={project.id}
                            color="#ea580c"
                            triggerLabel={t("pm_d.gen_pdf")}
                            options={[
                                { kind: "status_weekly", label: t("pm_d.pdf_status"), description: t("pm_d.pdf_status_desc") },
                                { kind: "risk_register", label: t("pm_d.pdf_risk") },
                                { kind: "compliance_audit", label: t("pm_d.pdf_compliance") },
                                { kind: "case_study", label: t("pm_d.pdf_case") },
                            ] as PdfKindOption[]}
                        />
                    </div>
                </div>

                {/* Progress + Stats Grid */}
                <div className="mt-6 grid grid-cols-4 gap-4">
                    <StatBox label={t("pm_d.stat_progress")} value={`${project.progress}%`} sub={t("pm_d.stat_progress_sub", { e: elapsedDays, t: totalDays })} color="#007aff" />
                    <StatBox label={t("pm_d.stat_budget")} value={formatMoney(project.budget)} sub={t("pm_d.stat_budget_sub", { n: formatMoney(project.spent) })} color="#30d158" />
                    <StatBox label={t("pm_d.stat_margin")} value={`${project.margin_actual}%`} sub={t("pm_d.stat_margin_sub", { n: project.margin_target })} color={project.margin_actual >= project.margin_target ? "#30d158" : "#ff9f0a"} />
                    <StatBox label={t("pm_d.stat_team")} value={`${project.team.length}`} sub={t("pm_d.stat_team_sub")} color="#bf5af2" />
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                    <div className="h-2 overflow-hidden rounded-full bg-black/[0.05]">
                        <div className="h-full bg-gradient-to-r from-[#ff453a] to-[#ff9f0a] transition-all" style={{ width: `${project.progress}%` }} />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="mb-4 flex gap-2 overflow-x-auto border-b border-black/[0.06]">
                {[
                    { id: "overview", label: t("pm_d.tab_overview") },
                    { id: "sprints", label: t("pm_d.tab_sprints", { n: projectSprints.length }) },
                    { id: "team", label: t("pm_d.tab_team") },
                    { id: "budget", label: t("pm_d.tab_budget") },
                    { id: "risks", label: t("pm_d.tab_risks") },
                    { id: "documents", label: t("pm_d.tab_documents") },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as Tab)}
                        className={`whitespace-nowrap px-4 py-2.5 text-[13px] font-medium transition-all ${
                            activeTab === tab.id ? "border-b-2 border-[#ff453a] text-[#ff453a]" : "text-[#8e8e93] hover:text-[#1d1d1f]"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                    {activeTab === "overview" && (
                        <>
                            <div className="glass-card p-5">
                                <h3 className="mb-3 text-[14px] font-semibold text-[#1d1d1f]">{t("pm_d.h_description")}</h3>
                                <p className="text-[13px] leading-relaxed text-[#1d1d1f]">{project.description}</p>
                                <h4 className="mt-4 mb-2 text-[12px] font-semibold text-[#1d1d1f]">{t("pm_d.h_objectives")}</h4>
                                <p className="text-[12px] leading-relaxed text-[#636366]">{project.objectives}</p>
                                <h4 className="mt-4 mb-2 text-[12px] font-semibold text-[#1d1d1f]">{t("pm_d.h_deliverables")}</h4>
                                <ul className="list-inside list-disc space-y-1 text-[12px] text-[#636366]">
                                    {project.deliverables.map(d => <li key={d}>{d}</li>)}
                                </ul>
                            </div>

                            <div className="glass-card p-5">
                                <h3 className="mb-3 text-[14px] font-semibold text-[#1d1d1f]">{t("pm_d.h_compliance")}</h3>
                                <div className="mb-3 flex flex-wrap gap-2">
                                    {project.compliance_frameworks.map(f => (
                                        <span key={f} className="rounded-full bg-[#ff9f0a]/15 px-3 py-1 text-[11px] font-medium text-[#ff9f0a]">{f}</span>
                                    ))}
                                    {project.compliance_frameworks.length === 0 && <span className="text-[12px] text-[#8e8e93]">{t("pm_d.no_frameworks")}</span>}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <ComplianceFlag label={t("pm_d.flag_hipaa")} active={project.hipaa_required} />
                                    <ComplianceFlag label={t("pm_d.flag_baa")} active={project.baa_signed} />
                                </div>
                                {project.hipaa_required && !project.baa_signed && (
                                    <div className="mt-3 rounded-lg border border-[#ff453a]/30 bg-[#ff453a]/5 p-3">
                                        <p className="text-[12px] font-medium text-[#ff453a]">{t("pm_d.baa_warn")}</p>
                                    </div>
                                )}
                            </div>

                            <div className="glass-card p-5">
                                <h3 className="mb-3 text-[14px] font-semibold text-[#1d1d1f]">{t("pm_d.h_linked")}</h3>
                                <div className="space-y-2">
                                    {client && <LinkRow icon="🏢" label={t("pm_d.link_client")} name={client.name} sub={client.industry} href={`/customer-health/${client.id}`} />}
                                    {deal && <LinkRow icon="💼" label={t("pm_d.link_deal")} name={deal.name} sub={`${deal.stage} · ${formatMoney(deal.value)}`} href={`/crm/${deal.id}`} />}
                                    {contract && <LinkRow icon="📄" label={t("pm_d.link_contract")} name={contract.title} sub={`${contract.type.toUpperCase()} · ${contract.status}`} href={`/contracts/${contract.id}`} />}
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === "sprints" && (
                        <div className="glass-card p-5">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-[14px] font-semibold text-[#1d1d1f]">
                                    {activeSprint ? `${activeSprint.name} · ${(activeSprint.status ?? "").toLowerCase()}` : t("pm_d.backlog_no_sprint")}
                                </h3>
                                <button
                                    onClick={() => setTaskModal({ ...EMPTY_TASK })}
                                    className="rounded-lg bg-[#ff453a] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#d63a30]"
                                >
                                    {t("pm_d.add_task")}
                                </button>
                            </div>
                            {/* Kanban */}
                            <div className="grid grid-cols-4 gap-3">
                                {(["todo", "in_progress", "review", "done"] as const).map(col => {
                                    const colTasks = tasks.filter(tk => tk.status === col);
                                    const labels = { todo: t("pm_d.col_todo"), in_progress: t("pm_d.col_in_progress"), review: t("pm_d.col_review"), done: t("pm_d.col_done") };
                                    const colors = { todo: "#8e8e93", in_progress: "#007aff", review: "#bf5af2", done: "#30d158" };
                                    const isOver = dragOverCol === col;
                                    return (
                                        <div
                                            key={col}
                                            onDragOver={(e) => { e.preventDefault(); setDragOverCol(col); }}
                                            onDragLeave={() => setDragOverCol(c => c === col ? null : c)}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                setDragOverCol(null);
                                                const id = e.dataTransfer.getData("text/plain") || draggingId;
                                                if (id) moveTask(id, col);
                                                setDraggingId(null);
                                            }}
                                            className={`rounded-xl p-3 transition-colors ${isOver ? "bg-[#ff453a]/10 ring-2 ring-[#ff453a]/40" : "bg-black/[0.02]"}`}
                                        >
                                            <div className="mb-3 flex items-center justify-between">
                                                <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: colors[col] }}>{labels[col]}</p>
                                                <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[10px] font-bold text-[#636366]">{colTasks.length}</span>
                                            </div>
                                            <div className="space-y-2">
                                                {colTasks.map(tk => (
                                                    <div
                                                        key={tk.id}
                                                        draggable
                                                        onDragStart={(e) => { setDraggingId(tk.id); e.dataTransfer.setData("text/plain", tk.id); e.dataTransfer.effectAllowed = "move"; }}
                                                        onDragEnd={() => { setDraggingId(null); setDragOverCol(null); }}
                                                        onClick={() => setTaskModal({
                                                            id: tk.id,
                                                            title: tk.title,
                                                            assignee: tk.assignee ?? "",
                                                            priority: ((tk.priority as TaskForm["priority"]) ?? "medium"),
                                                            points: tk.points ?? 0,
                                                            status: (tk.status as TaskStatus),
                                                        })}
                                                        className={`cursor-grab rounded-lg bg-white p-3 shadow-sm transition-all hover:shadow-md active:cursor-grabbing ${draggingId === tk.id ? "opacity-40" : ""}`}
                                                    >
                                                        <p className="text-[11px] font-medium text-[#1d1d1f]">{tk.title}</p>
                                                        <div className="mt-2 flex items-center justify-between">
                                                            <span className="text-[10px] text-[#8e8e93]">{tk.assignee || t("pm_d.unassigned")}</span>
                                                            <div className="flex items-center gap-1">
                                                                <span className={`h-1.5 w-1.5 rounded-full ${tk.priority === "high" ? "bg-[#ff453a]" : tk.priority === "medium" ? "bg-[#ff9f0a]" : "bg-[#30d158]"}`} />
                                                                <span className="rounded bg-black/[0.05] px-1.5 py-0.5 text-[9px] font-bold text-[#636366]">{tk.points ?? 0}pt</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {colTasks.length === 0 && <p className="py-4 text-center text-[10px] text-[#c7c7cc]">{t("pm_d.drop_here")}</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="mt-3 text-[10px] text-[#8e8e93]">{t("pm_d.tip_drag")}</p>
                        </div>
                    )}

                    {activeTab === "team" && (
                        <div className="glass-card p-5">
                            <h3 className="mb-4 text-[14px] font-semibold text-[#1d1d1f]">{t("pm_d.h_team")}</h3>
                            <div className="space-y-2">
                                <TeamRow name={project.pm_name} role={t("pm_d.role_pm")} lead />
                                {project.tech_lead !== "TBD" && <TeamRow name={project.tech_lead} role={t("pm_d.role_tech")} lead />}
                                {project.team.filter(r => !["Project Manager", "Tech Lead"].includes(r)).map((r, i) => (
                                    <TeamRow key={i} name={t("pm_d.team_member", { n: i + 1 })} role={r} />
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === "budget" && (
                        <div className="glass-card p-5">
                            <h3 className="mb-4 text-[14px] font-semibold text-[#1d1d1f]">{t("pm_d.h_budget")}</h3>
                            <div className="grid grid-cols-3 gap-3">
                                <StatBox label={t("pm_d.budget_total")} value={formatMoney(project.budget)} sub={t("pm_d.budget_approved")} color="#1d1d1f" />
                                <StatBox label={t("pm_d.budget_spent")} value={formatMoney(project.spent)} sub={t("pm_d.budget_burn", { n: (burnRate * 100).toFixed(0) })} color={burnRate > 0.85 ? "#ff453a" : "#007aff"} />
                                <StatBox label={t("pm_d.budget_remaining")} value={formatMoney(project.budget - project.spent)} sub={t("pm_d.budget_available")} color="#30d158" />
                            </div>
                            <div className="mt-6">
                                <div className="mb-2 flex justify-between text-[11px] font-medium text-[#8e8e93]">
                                    <span>{t("pm_d.budget_spend_progress")}</span>
                                    <span>{t("pm_d.budget_progress_label", { b: (burnRate * 100).toFixed(0), p: project.progress })}</span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-black/[0.05]">
                                    <div className="h-full" style={{ width: `${burnRate * 100}%`, background: burnRate > project.progress / 100 ? "#ff9f0a" : "#30d158" }} />
                                </div>
                                {burnRate > project.progress / 100 + 0.1 && (
                                    <p className="mt-2 text-[11px] text-[#ff9f0a]">{t("pm_d.budget_warn")}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === "risks" && (
                        <div className="glass-card p-5">
                            <h3 className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-[#1d1d1f]"><span>✦</span> {t("pm_d.h_risks")}</h3>
                            <div className="space-y-3">
                                {project.health === "yellow" && <Risk severity="warning" title={t("pm_d.risk_slip")} detail={t("pm_d.risk_slip_d")} />}
                                {project.margin_actual < project.margin_target && <Risk severity="warning" title={t("pm_d.risk_margin")} detail={t("pm_d.risk_margin_d", { a: project.margin_actual, t: project.margin_target })} />}
                                {project.hipaa_required && !project.baa_signed && <Risk severity="critical" title={t("pm_d.risk_compl")} detail={t("pm_d.risk_compl_d")} />}
                                {burnRate > project.progress / 100 + 0.15 && <Risk severity="warning" title={t("pm_d.risk_budget")} detail={t("pm_d.risk_budget_d")} />}
                                {project.health === "green" && burnRate <= project.progress / 100 && project.margin_actual >= project.margin_target && (
                                    <Risk severity="success" title={t("pm_d.risk_green")} detail={t("pm_d.risk_green_d")} />
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === "documents" && (
                        <div className="glass-card p-5">
                            <h3 className="mb-4 text-[14px] font-semibold text-[#1d1d1f]">{t("pm_d.h_documents")}</h3>
                            <div className="rounded-xl border border-dashed border-black/[0.08] p-8 text-center">
                                <p className="text-[12px] text-[#8e8e93]">{t("pm_d.no_docs")}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    <div className="glass-card p-5">
                        <h3 className="mb-3 text-[13px] font-semibold text-[#1d1d1f]">{t("pm_d.h_timeline")}</h3>
                        <div className="space-y-2 text-[12px]">
                            <div><span className="text-[#8e8e93]">{t("pm_d.tl_start")}</span> <span className="font-medium text-[#1d1d1f]">{formatDate(project.start_date)}</span></div>
                            <div><span className="text-[#8e8e93]">{t("pm_d.tl_end")}</span> <span className="font-medium text-[#1d1d1f]">{formatDate(project.end_date)}</span></div>
                            <div><span className="text-[#8e8e93]">{t("pm_d.tl_sprint")}</span> <span className="font-medium text-[#1d1d1f]">{t("pm_d.tl_weeks", { n: project.sprint_length })}</span></div>
                            <div><span className="text-[#8e8e93]">{t("pm_d.tl_current")}</span> <span className="font-medium text-[#1d1d1f]">#{project.current_sprint}</span></div>
                        </div>
                    </div>

                    <div className="glass-card p-5">
                        <h3 className="mb-3 text-[13px] font-semibold text-[#1d1d1f]">{t("pm_d.h_meetings", { n: meetings.length })}</h3>
                        <div className="space-y-2">
                            {meetings.slice(0, 3).map(m => (
                                <Link key={m.id} href={`/meetings/${m.id}`} className="block rounded-lg bg-black/[0.02] p-2 hover:bg-black/[0.04]">
                                    <p className="text-[11px] font-medium text-[#1d1d1f]">{m.title}</p>
                                    <p className="text-[10px] text-[#8e8e93]">{formatDate(m.date)}</p>
                                </Link>
                            ))}
                            {meetings.length === 0 && <p className="text-[11px] text-[#8e8e93]">{t("pm_d.no_meetings")}</p>}
                        </div>
                    </div>

                    <div className="glass-card p-5">
                        <h3 className="mb-3 text-[13px] font-semibold text-[#1d1d1f]">{t("pm_d.h_quick")}</h3>
                        <div className="space-y-2">
                            <button onClick={() => router.push("/meetings/new")} className="w-full rounded-lg bg-[#5856d6] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#4845b8]">{t("pm_d.q_meeting")}</button>
                            <button onClick={() => toast({ title: t("pm_d.toast_invoice"), description: t("pm_d.toast_invoice_desc", { name: project.name }), variant: "success" })} className="w-full rounded-lg bg-[#30d158] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#248a3d]">{t("pm_d.q_invoice")}</button>
                            <button className="w-full rounded-lg border border-black/[0.08] bg-black/[0.02] px-3 py-2 text-[12px] font-medium text-[#1d1d1f] hover:bg-black/[0.04]">{t("pm_d.q_status")}</button>
                            <Link href={`/pm-tab/${project.id}/edit`} className="flex items-center justify-center w-full rounded-lg bg-[#ea580c] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#c2410c]">{t("pm_d.q_edit")}</Link>
                        </div>
                    </div>
                </div>
            </div>

            {taskModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                    onClick={() => !savingTask && setTaskModal(null)}
                >
                    <div
                        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-[16px] font-semibold text-[#1d1d1f]">{taskModal.id ? t("pm_d.modal_edit") : t("pm_d.modal_new")}</h3>
                            <button onClick={() => setTaskModal(null)} className="text-[#8e8e93] hover:text-[#1d1d1f]">✕</button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#636366]">{t("pm_d.modal_title")}</label>
                                <input
                                    autoFocus
                                    value={taskModal.title}
                                    onChange={(e) => setTaskModal({ ...taskModal, title: e.target.value })}
                                    className="w-full rounded-lg border border-black/[0.1] bg-white px-3 py-2 text-[13px] text-[#1d1d1f] focus:border-[#ff453a] focus:outline-none"
                                    placeholder={t("pm_d.modal_title_ph")}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#636366]">{t("pm_d.modal_assignee")}</label>
                                <input
                                    value={taskModal.assignee}
                                    onChange={(e) => setTaskModal({ ...taskModal, assignee: e.target.value })}
                                    className="w-full rounded-lg border border-black/[0.1] bg-white px-3 py-2 text-[13px] text-[#1d1d1f] focus:border-[#ff453a] focus:outline-none"
                                    placeholder={t("pm_d.modal_assignee_ph")}
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#636366]">{t("pm_d.modal_status")}</label>
                                    <select
                                        value={taskModal.status}
                                        onChange={(e) => setTaskModal({ ...taskModal, status: e.target.value as TaskStatus })}
                                        className="w-full rounded-lg border border-black/[0.1] bg-white px-2 py-2 text-[13px] text-[#1d1d1f] focus:border-[#ff453a] focus:outline-none"
                                    >
                                        <option value="todo">{t("pm_d.col_todo")}</option>
                                        <option value="in_progress">{t("pm_d.col_in_progress")}</option>
                                        <option value="review">{t("pm_d.col_review")}</option>
                                        <option value="done">{t("pm_d.col_done")}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#636366]">{t("pm_d.modal_priority")}</label>
                                    <select
                                        value={taskModal.priority}
                                        onChange={(e) => setTaskModal({ ...taskModal, priority: e.target.value as TaskForm["priority"] })}
                                        className="w-full rounded-lg border border-black/[0.1] bg-white px-2 py-2 text-[13px] text-[#1d1d1f] focus:border-[#ff453a] focus:outline-none"
                                    >
                                        <option value="low">{t("pm_d.modal_low")}</option>
                                        <option value="medium">{t("pm_d.modal_medium")}</option>
                                        <option value="high">{t("pm_d.modal_high")}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#636366]">{t("pm_d.modal_points")}</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={taskModal.points}
                                        onChange={(e) => setTaskModal({ ...taskModal, points: Number(e.target.value) || 0 })}
                                        className="w-full rounded-lg border border-black/[0.1] bg-white px-2 py-2 text-[13px] text-[#1d1d1f] focus:border-[#ff453a] focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="mt-5 flex items-center justify-between gap-3">
                            <div>
                                {taskModal.id && (
                                    <button
                                        onClick={() => deleteTask(taskModal.id!)}
                                        disabled={savingTask}
                                        className="rounded-lg border border-[#ff453a]/30 bg-[#ff453a]/5 px-3 py-2 text-[12px] font-semibold text-[#ff453a] hover:bg-[#ff453a]/10 disabled:opacity-50"
                                    >
                                        {t("pm_d.modal_delete")}
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setTaskModal(null)}
                                    disabled={savingTask}
                                    className="rounded-lg border border-black/[0.1] bg-white px-4 py-2 text-[12px] font-semibold text-[#1d1d1f] hover:bg-black/[0.04] disabled:opacity-50"
                                >
                                    {t("pm_d.modal_cancel")}
                                </button>
                                <button
                                    onClick={saveTask}
                                    disabled={savingTask || !taskModal.title.trim()}
                                    className="rounded-lg bg-[#ff453a] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#d63a30] disabled:opacity-50"
                                >
                                    {savingTask ? t("pm_d.modal_saving") : taskModal.id ? t("pm_d.modal_save") : t("pm_d.modal_create")}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatBox({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
    return (
        <div className="rounded-xl bg-black/[0.02] p-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-[#8e8e93]">{label}</p>
            <p className="mt-1 text-[20px] font-bold" style={{ color }}>{value}</p>
            <p className="text-[10px] text-[#8e8e93]">{sub}</p>
        </div>
    );
}

function ComplianceFlag({ label, active }: { label: string; active: boolean }) {
    const t = useT();
    return (
        <div className="flex items-center gap-2 rounded-lg bg-black/[0.02] p-2.5">
            <span className={`h-3 w-3 rounded-full ${active ? "bg-[#30d158]" : "bg-[#ff453a]"}`} />
            <span className="text-[12px] font-medium text-[#1d1d1f]">{label}</span>
            <span className="ml-auto text-[11px] font-semibold" style={{ color: active ? "#30d158" : "#ff453a" }}>{active ? t("pm_d.flag_yes") : t("pm_d.flag_no")}</span>
        </div>
    );
}

function TeamRow({ name, role, lead }: { name: string; role: string; lead?: boolean }) {
    const t = useT();
    return (
        <div className="flex items-center gap-3 rounded-xl border border-black/[0.06] p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#007aff] to-[#5856d6] text-[12px] font-bold text-white">
                {name.split(" ").map(n => n[0]).slice(0, 2).join("")}
            </div>
            <div className="flex-1">
                <p className="text-[13px] font-medium text-[#1d1d1f]">{name}</p>
                <p className="text-[11px] text-[#8e8e93]">{role}</p>
            </div>
            {lead && <span className="rounded-full bg-[#ff9f0a]/15 px-2 py-0.5 text-[10px] font-bold text-[#ff9f0a]">{t("pm_d.lead")}</span>}
        </div>
    );
}

function LinkRow({ icon, label, name, sub, href }: { icon: string; label: string; name: string; sub: string; href: string }) {
    return (
        <Link href={href} className="flex items-center gap-3 rounded-xl border border-black/[0.06] p-3 transition-colors hover:bg-black/[0.02]">
            <span className="text-xl">{icon}</span>
            <div className="flex-1">
                <p className="text-[10px] font-medium uppercase tracking-wide text-[#8e8e93]">{label}</p>
                <p className="text-[13px] font-semibold text-[#1d1d1f]">{name}</p>
                <p className="text-[11px] text-[#8e8e93]">{sub}</p>
            </div>
            <svg className="h-4 w-4 text-[#c7c7cc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
        </Link>
    );
}

function Risk({ severity, title, detail }: { severity: "critical" | "warning" | "success" | "info"; title: string; detail: string }) {
    const styles = {
        critical: { bg: "rgba(255, 69, 58, 0.08)", text: "#ff453a", icon: "🔴" },
        warning: { bg: "rgba(255, 159, 10, 0.08)", text: "#ff9f0a", icon: "🟡" },
        info: { bg: "rgba(0, 122, 255, 0.08)", text: "#007aff", icon: "💡" },
        success: { bg: "rgba(48, 209, 88, 0.08)", text: "#30d158", icon: "✓" },
    }[severity];
    return (
        <div className="rounded-xl p-4" style={{ background: styles.bg }}>
            <div className="mb-1 flex items-center gap-2">
                <span>{styles.icon}</span>
                <p className="text-[13px] font-semibold" style={{ color: styles.text }}>{title}</p>
            </div>
            <p className="text-[12px] leading-relaxed text-[#1d1d1f]">{detail}</p>
        </div>
    );
}
