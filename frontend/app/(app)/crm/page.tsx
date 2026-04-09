"use client";

// ─── Data ─────────────────────────────────────────────────────────────────────

const KPI_CARDS = [
    { label: "Total Pipeline", value: "$2.4M", delta: "+12% vs last quarter", t: "teal" as const },
    { label: "Win Rate (90d)", value: "68%", delta: "vs 65% target ↑", t: "teal" as const },
    { label: "Deals in Negotiation", value: "4", delta: "$730K combined value", t: "amber" as const },
    { label: "Avg Deal Size", value: "$148K", delta: "▲ $12K vs Q1", t: "teal" as const },
];

const DEALS = [
    { name: "NLP Clinical Suite", client: "LabCore Diagnostics", value: 320000, stage: "Negotiation", pb: 82, ai: 82, type: "Platform", owner: "SC", days: 28 },
    { name: "BioMetrics AI v3", client: "Amatista Internal", value: 180000, stage: "Proposal Sent", pb: 55, ai: 55, type: "Custom AI", owner: "SC", days: 12 },
    { name: "FHIR Integration Layer", client: "Hospita Group", value: 420000, stage: "Demo Done", pb: 73, ai: 73, type: "Integration", owner: "MT", days: 41 },
    { name: "Pharma Data Management", client: "HealthRx Corp", value: 95000, stage: "RFQ Submitted", pb: 44, ai: 44, type: "Consulting", owner: "AR", days: 9 },
    { name: "GenomicsCo Expansion", client: "GenomicsCo", value: 510000, stage: "Discovery", pb: 28, ai: 28, type: "Platform", owner: "SC", days: 5 },
    { name: "AI Pathology Review", client: "MedNet Labs", value: 245000, stage: "Qualified Lead", pb: 35, ai: 35, type: "AI Model", owner: "MT", days: 3 },
    { name: "Patient Journey Analytics", client: "CliniFlow", value: 135000, stage: "Proposal Sent", pb: 60, ai: 60, type: "Analytics", owner: "DL", days: 18 },
];

const STAGE_COLORS: Record<string, { bg: string; color: string }> = {
    "Negotiation": { bg: "#D1FAE5", color: "#065F46" },
    "Proposal Sent": { bg: "#FEF3C7", color: "#92400E" },
    "Demo Done": { bg: "#EDE9FE", color: "#5B21B6" },
    "Discovery": { bg: "#DBEAFE", color: "#1D4ED8" },
    "RFQ Submitted": { bg: "#FEF9C3", color: "#854D0E" },
    "Qualified Lead": { bg: "#F3F4F6", color: "#374151" },
};

const FORECAST_STAGES = [
    { stage: "Negotiation", count: 4, value: 730000, conv: 78 },
    { stage: "Proposal Sent", count: 5, value: 555000, conv: 42 },
    { stage: "Demo Done", count: 3, value: 680000, conv: 35 },
    { stage: "Discovery", count: 5, value: 920000, conv: 18 },
    { stage: "Qualified Lead", count: 8, value: 610000, conv: 8 },
];

const AI_ACTIONS = [
    { prio: "critical", title: "LabCore deal stagnant 12 days — AI score dropped 74→58", action: "Schedule exec call. Prepare competitive counter." },
    { prio: "high", title: "FHIR Integration at 41 days — longest deal in pipe", action: "Consider deadline offer. PM involvement recommended." },
    { prio: "medium", title: "GenomicsCo shows upsell signal: Phase 2 pattern detected", action: "Prepare expansion deck before next QBR." },
    { prio: "opportunity", title: "CliniFlow contract renewal due in 45 days", action: "AI suggests proactive expansion pitch." },
];

function ScoreBar({ pct }: { pct: number }) {
    const color = pct >= 70 ? "var(--teal)" : pct >= 45 ? "var(--amber)" : "var(--rose)";
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ flex: 1, height: 5, borderRadius: 999, background: "var(--line)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 999 }} />
            </div>
            <span style={{ fontSize: 10.5, fontFamily: "var(--f-mono)", color, fontWeight: 700, width: 24 }}>{pct}</span>
        </div>
    );
}

const P_COLORS: Record<string, { bg: string; color: string }> = {
    critical: { bg: "var(--rose-lt)", color: "var(--rose)" },
    high: { bg: "#FFF7ED", color: "#C2410C" },
    medium: { bg: "var(--blue-lt)", color: "var(--blue)" },
    opportunity: { bg: "var(--teal-lt)", color: "var(--teal-dk)" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CRMPage() {
    return (
        <div style={{ padding: "28px 32px 60px", background: "var(--surface)", minHeight: "100vh" }}>

            {/* Header */}
            <div style={{ marginBottom: 26 }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", color: "#2563eb", marginBottom: 6 }}>M-01 · Commercial Layer</div>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                    <div>
                        <h1 style={{ fontFamily: "var(--f-display)", fontSize: 32, fontWeight: 900, color: "var(--ink)", margin: 0 }}>
                            CRM &amp; <em style={{ color: "#2563eb", fontStyle: "normal" }}>Sales Pipeline</em>
                        </h1>
                        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "5px 0 0" }}>Intelligent commercial pipeline · AI-scored deals · Rolling forecast Q2 2026</p>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button style={{ padding: "8px 16px", borderRadius: 9, border: "1.5px solid var(--line)", background: "var(--white)", fontSize: 12, fontWeight: 500, color: "var(--text)", cursor: "pointer" }}>Add Deal</button>
                        <button style={{ padding: "8px 16px", borderRadius: 9, border: "none", background: "#2563eb", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✦ AI Forecast</button>
                    </div>
                </div>
            </div>

            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
                {KPI_CARDS.map((k) => (
                    <div key={k.label} style={{ background: "var(--white)", borderRadius: 14, padding: "18px 20px", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}>
                        <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500, marginBottom: 4 }}>{k.label}</div>
                        <div style={{ fontFamily: "var(--f-display)", fontSize: 28, fontWeight: 700, color: k.t === "teal" ? "var(--teal-dk)" : "var(--amber)", lineHeight: 1 }}>{k.value}</div>
                        <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 5 }}>{k.delta}</div>
                    </div>
                ))}
            </div>

            {/* Main 2-panel */}
            <div style={{ display: "grid", gridTemplateColumns: "7fr 3fr", gap: 18, marginBottom: 20 }}>

                {/* Pipeline table */}
                <div style={{ background: "var(--white)", borderRadius: 16, border: "1px solid var(--line)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                    <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>Active Pipeline — 16 deals · $2.4M</div>
                        <div style={{ display: "flex", gap: 8, fontSize: 11 }}>
                            <span style={{ color: "var(--muted)" }}>Sort by:</span>
                            <span style={{ color: "#2563eb", fontWeight: 600, cursor: "pointer" }}>AI Score ↓</span>
                        </div>
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: "var(--surface)" }}>
                                {["Deal", "Client", "Value", "Stage", "AI Score", "Type", "Owner", "Days"].map((h) => (
                                    <th key={h} style={{ padding: "9px 14px", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", color: "var(--muted)", textAlign: "left" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {DEALS.map((d) => {
                                const sc = STAGE_COLORS[d.stage] ?? { bg: "#F3F4F6", color: "#374151" };
                                return (
                                    <tr key={d.name} style={{ borderTop: "1px solid var(--line)", cursor: "pointer" }}
                                        onMouseEnter={e => (e.currentTarget.style.background = "var(--surface)")}
                                        onMouseLeave={e => (e.currentTarget.style.background = "")}>
                                        <td style={{ padding: "11px 14px", fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{d.name}</td>
                                        <td style={{ padding: "11px 14px", fontSize: 12, color: "var(--muted)" }}>{d.client}</td>
                                        <td style={{ padding: "11px 14px", fontSize: 12, fontWeight: 600, color: "var(--ink)", fontFamily: "var(--f-mono)" }}>${(d.value / 1000).toFixed(0)}K</td>
                                        <td style={{ padding: "11px 14px" }}>
                                            <span style={{ background: sc.bg, color: sc.color, borderRadius: 20, padding: "2px 9px", fontSize: 10, fontWeight: 600 }}>{d.stage}</span>
                                        </td>
                                        <td style={{ padding: "11px 14px", width: 120 }}><ScoreBar pct={d.ai} /></td>
                                        <td style={{ padding: "11px 14px", fontSize: 11, color: "var(--muted)" }}>{d.type}</td>
                                        <td style={{ padding: "11px 14px" }}>
                                            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700 }}>{d.owner}</div>
                                        </td>
                                        <td style={{ padding: "11px 14px", fontSize: 11, color: d.days > 30 ? "var(--rose)" : "var(--muted)", fontFamily: "var(--f-mono)" }}>{d.days}d</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* AI insights */}
                <div style={{ background: "var(--ink)", borderRadius: 16, overflow: "hidden" }}>
                    <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--white)" }}>🧠 AI Actions</div>
                    </div>
                    <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                        {AI_ACTIONS.map((a, i) => {
                            const pc = P_COLORS[a.prio];
                            return (
                                <div key={i} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, padding: "12px 14px" }}>
                                    <span style={{ background: pc.bg, color: pc.color, fontSize: 8.5, fontWeight: 700, padding: "2px 6px", borderRadius: 5, textTransform: "uppercase" }}>{a.prio}</span>
                                    <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--white)", margin: "6px 0 4px", lineHeight: 1.4 }}>{a.title}</div>
                                    <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.4)" }}>{a.action}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Forecast by stage */}
            <div style={{ background: "var(--white)", borderRadius: 16, border: "1px solid var(--line)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--line)" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>Forecast by Stage — Weighted Q2</div>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ background: "var(--surface)" }}>
                            {["Stage", "Deals", "Total Value", "Avg Conv. Rate", "Weighted Value", "Momentum"].map((h) => (
                                <th key={h} style={{ padding: "9px 16px", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", color: "var(--muted)", textAlign: "left" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {FORECAST_STAGES.map((s, i) => (
                            <tr key={i} style={{ borderTop: "1px solid var(--line)" }}>
                                <td style={{ padding: "11px 16px", fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{s.stage}</td>
                                <td style={{ padding: "11px 16px", fontSize: 12, color: "var(--muted)" }}>{s.count}</td>
                                <td style={{ padding: "11px 16px", fontSize: 12, fontFamily: "var(--f-mono)", color: "var(--ink)" }}>${(s.value / 1000).toFixed(0)}K</td>
                                <td style={{ padding: "11px 16px", fontSize: 12, color: s.conv >= 50 ? "var(--teal)" : s.conv >= 25 ? "var(--amber)" : "var(--rose)", fontFamily: "var(--f-mono)", fontWeight: 700 }}>{s.conv}%</td>
                                <td style={{ padding: "11px 16px", fontSize: 12, fontFamily: "var(--f-mono)", fontWeight: 700, color: "var(--teal-dk)" }}>${Math.round(s.value * s.conv / 100 / 1000)}K</td>
                                <td style={{ padding: "11px 16px" }}>
                                    <div style={{ height: 6, width: 120, borderRadius: 999, background: "var(--line)", overflow: "hidden" }}>
                                        <div style={{ height: "100%", width: `${s.conv * 1.2}%`, background: "#2563eb", borderRadius: 999 }} />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
