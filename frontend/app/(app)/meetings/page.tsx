"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { ModuleHeader } from "@/components/shared";
import { MEETING_TYPE_CONFIG, type MeetingType, type MeetingStatus } from "@/lib/types/meeting";
import { useMeetings, useClients } from "@/lib/hooks/use-resources";
import { useT } from "@/lib/i18n";

/* ══════════════════════════════════════════════════════════════════════════
   🎙️ MEETINGS MODULE — Record, Transcribe, Analyze
   ══════════════════════════════════════════════════════════════════════════ */

// Map mock meeting status → UI MeetingStatus
const STATUS_MAP: Record<string, MeetingStatus> = {
    scheduled: "draft",
    in_progress: "recording",
    completed: "processing",
    analyzed: "analyzed",
};

// Used as fallback only if mock layer is empty
const SAMPLE_MEETINGS_FALLBACK: Array<{
    id: string;
    title: string;
    meeting_type: MeetingType;
    status: MeetingStatus;
    scheduled_at: string;
    duration_minutes: number;
    client_name?: string;
    participants: { name: string; role: "internal" | "external" }[];
}> = [];

const STATUS_CONFIG: Record<MeetingStatus, { label: string; color: string; bg: string }> = {
    draft: { label: "Draft", color: "#8e8e93", bg: "rgba(142,142,147,0.15)" },
    recording: { label: "Recording", color: "#ff453a", bg: "rgba(255,69,58,0.15)" },
    processing: { label: "Processing", color: "#ff9f0a", bg: "rgba(255,159,10,0.15)" },
    analyzed: { label: "Analyzed", color: "#30d158", bg: "rgba(48,209,88,0.15)" },
    failed: { label: "Failed", color: "#ff453a", bg: "rgba(255,69,58,0.15)" },
};

function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDuration(minutes: number) {
    if (minutes < 60) return `${minutes}min`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

export default function MeetingsPage() {
    const t = useT();
    const [filter, setFilter] = useState<MeetingType | "all">("all");
    const [statusFilter, setStatusFilter] = useState<MeetingStatus | "all">("all");

    const { data: meetingsData } = useMeetings();
    const { data: clientsData } = useClients();

    const meetings = useMemo(() => {
        const clientMap = new Map((clientsData ?? []).map(c => [c.id, c.name]));
        const fromApi = (meetingsData ?? []).map(m => ({
            id: m.id,
            title: m.title,
            meeting_type: (m.meeting_type ?? "internal") as MeetingType,
            status: (STATUS_MAP[m.status ?? ""] ?? "analyzed") as MeetingStatus,
            scheduled_at: m.scheduled_at ?? m.created_at,
            duration_minutes: Number(m.duration_minutes ?? 0),
            client_name: m.client_id ? clientMap.get(m.client_id) : undefined,
            participants: (m.participants ?? []).map((raw) => {
                if (typeof raw === "string") {
                    return { name: raw, role: "external" as const };
                }
                if (raw && typeof raw === "object") {
                    const obj = raw as { name?: unknown; role?: unknown };
                    const name = String(obj.name ?? "");
                    const role = String(obj.role ?? "external").toLowerCase() === "internal"
                        ? ("internal" as const)
                        : ("external" as const);
                    return { name, role };
                }
                return { name: "", role: "external" as const };
            }).filter(p => p.name),
        }));
        return fromApi.length > 0 ? fromApi : SAMPLE_MEETINGS_FALLBACK;
    }, [meetingsData, clientsData]);

    const filteredMeetings = meetings.filter((m) => {
        if (filter !== "all" && m.meeting_type !== filter) return false;
        if (statusFilter !== "all" && m.status !== statusFilter) return false;
        return true;
    });

    return (
        <div className="p-6">
            <ModuleHeader
                title={t("meetings.title")}
                subtitle={t("meetings.subtitle")}
                color="#5856d6"
            />

            {/* Action Buttons */}
            <div className="mb-6 flex flex-wrap items-center gap-3">
                <Link
                    href="/meetings/new"
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#007aff] to-[#5856d6] px-5 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-[#007aff]/25 transition-all hover:shadow-xl"
                >
                    <span className="text-lg">+</span>
                    {t("page.new_meeting").replace(/^\+\s*/, "")}
                </Link>
            </div>

            {/* Filters */}
            <div className="mb-6 flex flex-wrap items-center gap-4">
                {/* Type Filter */}
                <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium text-[#8e8e93]">{t("page.filter_type")}</span>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as MeetingType | "all")}
                        className="rounded-lg border border-black/[0.08] bg-black/[0.02] px-3 py-1.5 text-[12px] text-[#1d1d1f] focus:border-[#007aff] focus:outline-none"
                    >
                        <option value="all">{t("page.filter_all_types")}</option>
                        {Object.entries(MEETING_TYPE_CONFIG).map(([key, config]) => (
                            <option key={key} value={key}>
                                {config.icon} {config.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium text-[#8e8e93]">{t("page.filter_status")}</span>
                    <div className="flex gap-1">
                        {(["all", "analyzed", "processing", "draft"] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
                                    statusFilter === status
                                        ? "bg-[#007aff] text-white"
                                        : "bg-black/[0.04] text-[#8e8e93] hover:bg-black/[0.08]"
                                }`}
                            >
                                {status === "all" ? t("page.filter_all") : STATUS_CONFIG[status].label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Count */}
                <span className="ml-auto text-[12px] text-[#8e8e93]">
                    {filteredMeetings.length} meetings
                </span>
            </div>

            {/* Meetings List */}
            <div className="space-y-3">
                {filteredMeetings.map((meeting) => {
                    const typeConfig = MEETING_TYPE_CONFIG[meeting.meeting_type] ?? MEETING_TYPE_CONFIG.discovery_rfq;
                    const statusConfig = STATUS_CONFIG[meeting.status] ?? STATUS_CONFIG.draft;

                    return (
                        <Link
                            key={meeting.id}
                            href={`/meetings/${meeting.id}`}
                            className="glass-card group flex items-center gap-4 p-4 transition-all hover:shadow-lg"
                        >
                            {/* Type Icon */}
                            <div
                                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-2xl"
                                style={{ backgroundColor: `${typeConfig.color}15` }}
                            >
                                {typeConfig.icon}
                            </div>

                            {/* Content */}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="truncate text-[14px] font-semibold text-[#1d1d1f] group-hover:text-[#007aff]">
                                        {meeting.title}
                                    </h3>
                                    <span
                                        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                                        style={{
                                            backgroundColor: statusConfig.bg,
                                            color: statusConfig.color,
                                        }}
                                    >
                                        {statusConfig.label}
                                    </span>
                                </div>
                                <div className="mt-1 flex items-center gap-3 text-[12px] text-[#8e8e93]">
                                    <span style={{ color: typeConfig.color }}>
                                        {typeConfig.label}
                                    </span>
                                    <span>•</span>
                                    <span>{formatDate(meeting.scheduled_at!)}</span>
                                    <span>•</span>
                                    <span>{formatDuration(meeting.duration_minutes!)}</span>
                                    {meeting.client_name && (
                                        <>
                                            <span>•</span>
                                            <span className="font-medium text-[#1d1d1f]">
                                                {meeting.client_name}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Participants */}
                            <div className="flex -space-x-2">
                                {meeting.participants.slice(0, 3).map((p, i) => (
                                    <div translate="no"
                                        key={i}
                                        className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[10px] font-semibold text-white"
                                        style={{
                                            backgroundColor: p.role === "internal" ? "#007aff" : "#ff9f0a",
                                        }}
                                        title={p.name}
                                    >
                                        {p.name.split(" ").map(n => n[0]).join("")}
                                    </div>
                                ))}
                                {meeting.participants.length > 3 && (
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#8e8e93] text-[10px] font-semibold text-white">
                                        +{meeting.participants.length - 3}
                                    </div>
                                )}
                            </div>

                            {/* Arrow */}
                            <svg
                                className="h-5 w-5 flex-shrink-0 text-[#c7c7cc] transition-transform group-hover:translate-x-1 group-hover:text-[#007aff]"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                    );
                })}
            </div>

            {/* Empty State */}
            {filteredMeetings.length === 0 && (
                <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
                    <div className="mb-4 text-5xl">🎙️</div>
                    <h3 className="text-[16px] font-semibold text-[#1d1d1f]">{t("meetings.empty")}</h3>
                    <p className="mt-1 text-[13px] text-[#8e8e93]">
                        {t("meetings.empty_hint")}
                    </p>
                    <Link
                        href="/meetings/new"
                        className="mt-4 rounded-xl bg-[#007aff] px-5 py-2.5 text-[13px] font-semibold text-white"
                    >
                        {t("page.new_meeting")}
                    </Link>
                </div>
            )}

            {/* Stats */}
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="glass-stat p-4">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-[#8e8e93]">
                        {t("meetings.kpi_week")}
                    </p>
                    <p className="mt-1 text-[28px] font-bold text-[#1d1d1f]">12</p>
                    <p className="text-[11px] text-[#30d158]">+3 from last week</p>
                </div>
                <div className="glass-stat p-4">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-[#8e8e93]">
                        {t("meetings.kpi_analyzed")}
                    </p>
                    <p className="mt-1 text-[28px] font-bold text-[#30d158]">89%</p>
                    <p className="text-[11px] text-[#8e8e93]">8 of 9 complete</p>
                </div>
                <div className="glass-stat p-4">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-[#8e8e93]">
                        {t("meetings.kpi_tasks")}
                    </p>
                    <p className="mt-1 text-[28px] font-bold text-[#007aff]">34</p>
                    <p className="text-[11px] text-[#8e8e93]">From AI extraction</p>
                </div>
                <div className="glass-stat p-4">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-[#8e8e93]">
                        {t("meetings.kpi_duration")}
                    </p>
                    <p className="mt-1 text-[28px] font-bold text-[#1d1d1f]">38m</p>
                    <p className="text-[11px] text-[#8e8e93]">Across all types</p>
                </div>
            </div>
        </div>
    );
}
