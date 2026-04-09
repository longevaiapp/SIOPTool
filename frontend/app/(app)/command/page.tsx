"use client";

import { cn } from "@/lib/utils";

// ─── Data ─────────────────────────────────────────────────────────────────────

const KPI_CARDS = [
    { label: "Total Pipeline", value: "$2.4M", delta: "+12% vs Q1", t: "teal" as const, icon: "📈" },
    { label: "Health Score", value: "82/100", delta: "↑ 4pts this week", t: "teal" as const, icon: "❤️" },
    { label: "Team Utilization", value: "84%", delta: "⚠ threshold: 85%", t: "amber" as const, icon: "⚙️" },
    { label: "SIOP Gap Q2", value: "−12%", delta: "Demand > Capacity", t: "rose" as const, icon: "🎯" },
    { label: "Win Rate", value: "68%", delta: "vs 65% target", t: "teal" as const, icon: "🏆" },
    { label: "Active Projects", value: "5", delta: "2 at risk", t: "amber" as const, icon: "📁" },
    { label: "Gross Margin", value: "62%", delta: "target ≥ 40%", t: "teal" as const, icon: "💰" },
    { label: "Compliance", value: "88%", delta: "3 controls expiring", t: "amber" as const, icon: "🛡️" },
];

const PROJECTS = [
    { name: "ClinAI NLP Batch", client: "LabCore", health: 88, budget: 72, phase: "Sprint 4", status: "teal" as const, statusLabel: "On track", team: ["SC", "MT", "AR"] },
    { name: "BioMetrics v2", client: "Amatista", health: 62, budget: 95, phase: "Sprint 6", status: "rose" as const, statusLabel: "At risk", team: ["LC", "MP"] },
    { name: "Pharma Portal", client: "HealthRx", health: 77, budget: 50, phase: "Sprint 2", status: "amber" as const, statusLabel: "Watch", team: ["SC", "AR", "DL"] },
    { name: "NLP Pipeline Ext.", client: "GenomicsCo", health: 91, budget: 40, phase: "Sprint 1", status: "teal" as const, statusLabel: "On track", team: ["MT"] },
    { name: "FHIR Gateway", client: "Hospita", health: 55, budget: 110, phase: "Sprint 7", status: "rose" as const, statusLabel: "At risk", team: ["AR", "CK"] },
];

const AI_INSIGHTS = [
    { priority: "critical" as const, title: "BioMetrics v2 budget exceeded by 19%", action: "Schedule scope review with client immediately. CFO notified.", ts: "2 min ago" },
    { priority: "critical" as const, title: "SIOP Gap: team at 84% — capacity limit in 8 days", action: "Defer FHIR Gateway Sprint 8 or activate contractor NDA.", ts: "17 min ago" },
    { priority: "high" as const, title: "LabCore deal stagnant for 12 days", action: "Recommend executive check-in. Win score dropped from 74→58.", ts: "1h ago" },
    { priority: "medium" as const, title: "3 compliance controls expire within 14 days", action: "Compliance Lead review scheduled automatically.", ts: "3h ago" },
    { priority: "opportunity" as const, title: "GenomicsCo shows upsell signal", action: "AI detected Phase 2 opportunity. Prepare expansion deck.", ts: "6h ago" },
];

const PIPELINE_STAGES = [
    { stage: "Lead Qualified", count: 4, value: 310000, pct: 8 },
    { stage: "Demo / Discovery", count: 3, value: 540000, pct: 14 },
    { stage: "RFQ Submitted", count: 5, value: 820000, pct: 22 },
    { stage: "Proposal Sent", count: 2, value: 490000, pct: 13 },
    { stage: "Negotiation", count: 2, value: 240000, pct: 6 },
];

const TEAM_CAP = [
    { name: "Solutions Arch.", util: 92, risk: "rose" as const },
    { name: "AI Engineer", util: 84, risk: "amber" as const },
    { name: "PMO Lead", util: 76, risk: "teal" as const },
    { name: "Data Scientist", util: 88, risk: "amber" as const },
    { name: "ML Engineer", util: 61, risk: "teal" as const },
    { name: "Compliance", util: 55, risk: "teal" as const },
];

const FINANCIALS = [
    { label: "MRR", value: "$195K", trend: "+11%", ok: true },
    { label: "Burn Rate / wk", value: "$24.5K", trend: "−3%", ok: true },
    { label: "Gross Margin", value: "62%", trend: "−2pts", ok: false },
    { label: "Revenue Q1 Actual", value: "$576K", trend: "vs $540K target", ok: true },
];

const MODULES_STATUS = [
    { icon: "📋", num: "M01", name: "RFQ", status: "teal" as const },
    { icon: "💼", num: "M02", name: "CRM", status: "teal" as const },
    { icon: "🤖", num: "M03", name: "AI Scope", status: "teal" as const },
    { icon: "🌐", num: "M04", name: "Portal", status: "amber" as const },
    { icon: "📁", num: "M05", name: "Projects", status: "amber" as const },
    { icon: "🏗️", num: "M06", name: "PMO", status: "teal" as const },
    { icon: "🎯", num: "M07", name: "SIOP", status: "rose" as const },
    { icon: "🏭", num: "M08", name: "Capacity", status: "amber" as const },
    { icon: "🤝", num: "M09", name: "Suppliers", status: "teal" as const },
    { icon: "💰", num: "M10", name: "Finance", status: "teal" as const },
    { icon: "🧠", num: "M11", name: "AI Layer", status: "teal" as const },
    { icon: "🛡️", num: "M12", name: "Compliance", status: "amber" as const },
    { icon: "📊", num: "M13", name: "Reports", status: "teal" as const },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_DOT = {
    teal: "#10B981",
    amber: "#F59E0B",
    rose: "#F43F5E",
};

const STATUS_BADGE_STYLE = {
    teal: { bg: "#D1FAE5", color: "#065F46" },
    amber: { bg: "#FEF3C7", color: "#92400E" },
    rose: { bg: "#FFE4E6", color: "#9F1239" },
};

const P_COLORS = {
    critical: { bg: "var(--rose-lt)", color: "var(--rose)", dot: "var(--rose)" },
    high: { bg: "#FFF7ED", color: "#C2410C", dot: "var(--amber)" },
    medium: { bg: "var(--blue-lt)", color: "var(--blue)", dot: "var(--blue)" },
    opportunity: { bg: "var(--teal-lt)", color: "var(--teal-dk)", dot: "var(--teal)" },
};

type StatusType = "teal" | "amber" | "rose";

function HealthBar({ pct, type }: { pct: number; type: StatusType }) {
    const colors = { teal: "var(--teal)", amber: "var(--amber)", rose: "var(--rose)" };
    return (
        <div style={{ height: 5, borderRadius: 999, background: "var(--line)", overflow: "hidden", width: 80 }}>
            <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: colors[type], borderRadius: 999, transition: "width .4s" }} />
        </div>
    );
}

function ScoreRing({ score }: { score: number }) {
    const size = 38;
    const r = 14;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - score / 100);
    const color = score >= 80 ? "var(--teal)" : score >= 65 ? "var(--amber)" : "var(--rose)";
    return (
        <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
            <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={3} />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3}
                    strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
            </svg>
            <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 700, color, fontFamily: "var(--f-mono)" }}>
                {score}
            </span>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CommandPage() {
    return (
        <div style={{ padding: "28px 32px 60px", background: "var(--surface)", minHeight: "100vh" }}>

            {/* Header */}
            <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", color: "var(--teal)", marginBottom: 6 }}>M-14 · Executive View</div>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                    <div>
                        <h1 style={{ fontFamily: "var(--f-display)", fontSize: 32, fontWeight: 900, color: "var(--ink)", margin: 0, lineHeight: 1 }}>
                            Command <em style={{ color: "var(--teal)", fontStyle: "normal" }}>Center</em>
                        </h1>
                        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "5px 0 0" }}>Real-time executive overview · All modules · Q2 2026</p>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                        <button style={{ padding: "8px 16px", borderRadius: 9, border: "1.5px solid var(--line)", background: "var(--white)", fontSize: 12, fontWeight: 500, color: "var(--text)", cursor: "pointer" }}>Export Board Pack</button>
                        <button style={{ padding: "8px 16px", borderRadius: 9, border: "none", background: "var(--teal)", color: "var(--ink)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✦ AI Summary</button>
                    </div>
                </div>
            </div>

            {/* KPI Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
                {KPI_CARDS.map((k) => {
                    const bg = k.t === "rose" ? "var(--rose-lt)" : k.t === "amber" ? "var(--amber-lt)" : "var(--white)";
                    const valColor = k.t === "rose" ? "var(--rose)" : k.t === "amber" ? "var(--amber)" : "var(--teal-dk)";
                    const borderColor = k.t === "rose" ? "var(--rose)" : k.t === "amber" ? "var(--amber)" : "var(--line)";
                    return (
                        <div key={k.label} style={{ background: bg, borderRadius: 14, padding: "18px 20px", border: `1px solid ${borderColor}`, boxShadow: "var(--shadow-sm)" }}>
                            <div style={{ fontSize: 18, marginBottom: 6 }}>{k.icon}</div>
                            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2, fontWeight: 500 }}>{k.label}</div>
                            <div style={{ fontFamily: "var(--f-display)", fontSize: 26, fontWeight: 700, color: valColor, lineHeight: 1 }}>{k.value}</div>
                            <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 5 }}>{k.delta}</div>
                        </div>
                    );
                })}
            </div>

            {/* Main 2-panel */}
            <div style={{ display: "grid", gridTemplateColumns: "6fr 4fr", gap: 18, marginBottom: 20 }}>

                {/* Project portfolio */}
                <div style={{ background: "var(--white)", borderRadius: 16, border: "1px solid var(--line)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                    <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>Project Portfolio</div>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>5 active · 2 at-risk</span>
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: "var(--surface)" }}>
                                {["Project", "Client", "Health", "Budget", "Phase", "Status", "Team"].map((h) => (
                                    <th key={h} style={{ padding: "9px 16px", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", color: "var(--muted)", textAlign: "left" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {PROJECTS.map((p) => {
                                const bs = STATUS_BADGE_STYLE[p.status];
                                const ht = p.health >= 80 ? "teal" as const : p.health >= 70 ? "amber" as const : "rose" as const;
                                return (
                                    <tr key={p.name} style={{ borderTop: "1px solid var(--line)", cursor: "pointer" }}
                                        onMouseEnter={e => (e.currentTarget.style.background = "var(--surface)")}
                                        onMouseLeave={e => (e.currentTarget.style.background = "")}>
                                        <td style={{ padding: "11px 16px", fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{p.name}</td>
                                        <td style={{ padding: "11px 16px", fontSize: 12, color: "var(--muted)" }}>{p.client}</td>
                                        <td style={{ padding: "11px 16px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                                <ScoreRing score={p.health} />
                                                <HealthBar pct={p.health} type={ht} />
                                            </div>
                                        </td>
                                        <td style={{ padding: "11px 16px" }}>
                                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                                <HealthBar pct={Math.min(p.budget, 100)} type={p.budget > 100 ? "rose" : p.budget > 85 ? "amber" : "teal"} />
                                                <span style={{ fontSize: 10, color: "var(--muted)", fontFamily: "var(--f-mono)" }}>{p.budget}%</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: "11px 16px", fontSize: 11, color: "var(--muted)" }}>{p.phase}</td>
                                        <td style={{ padding: "11px 16px" }}>
                                            <span style={{ background: bs.bg, color: bs.color, borderRadius: 20, padding: "2px 9px", fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                                                <span style={{ width: 5, height: 5, borderRadius: "50%", background: STATUS_DOT[p.status], display: "inline-block" }} />
                                                {p.statusLabel}
                                            </span>
                                        </td>
                                        <td style={{ padding: "11px 16px" }}>
                                            <div style={{ display: "flex", gap: -4 }}>
                                                {p.team.map((t) => (
                                                    <div key={t} style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--teal)", color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8.5, fontWeight: 700, border: "2px solid var(--white)" }}>{t}</div>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* AI insights panel */}
                <div style={{ background: "var(--ink)", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,.07)" }}>
                    <div style={{ padding: "18px 22px", borderBottom: "1px solid rgba(255,255,255,.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--white)" }}>🧠 AI Insights</div>
                        <span style={{ background: "var(--rose)", color: "#fff", borderRadius: 20, padding: "1px 7px", fontSize: 9.5, fontWeight: 700 }}>2 CRITICAL</span>
                    </div>
                    <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                        {AI_INSIGHTS.map((a, i) => {
                            const pc = P_COLORS[a.priority];
                            const isPLabel = a.priority === "critical" ? "CRITICAL" : a.priority === "high" ? "HIGH" : a.priority === "medium" ? "MEDIUM" : "OPPORTUNITY";
                            return (
                                <div key={i} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, padding: "12px 14px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                                        <span style={{ background: pc.bg, color: pc.color, fontSize: 8.5, fontWeight: 700, padding: "2px 6px", borderRadius: 5, textTransform: "uppercase", letterSpacing: ".8px" }}>{isPLabel}</span>
                                        <span style={{ fontSize: 10, color: "rgba(255,255,255,.3)" }}>{a.ts}</span>
                                    </div>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--white)", marginBottom: 4, lineHeight: 1.4 }}>{a.title}</div>
                                    <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.4)", lineHeight: 1.5 }}>{a.action}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Bottom row */}
            <div style={{ display: "grid", gridTemplateColumns: "4fr 3fr 3fr", gap: 18 }}>

                {/* Pipeline by stage */}
                <div style={{ background: "var(--white)", borderRadius: 16, border: "1px solid var(--line)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                    <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--line)" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>Pipeline by Stage</div>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Total: $2.4M weighted · 16 deals</div>
                    </div>
                    <div style={{ padding: "16px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
                        {PIPELINE_STAGES.map((s) => (
                            <div key={s.stage}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                    <div style={{ fontSize: 12, color: "var(--ink)" }}>{s.stage}</div>
                                    <div style={{ display: "flex", gap: 10, fontSize: 11 }}>
                                        <span style={{ color: "var(--muted)" }}>{s.count} deals</span>
                                        <span style={{ color: "var(--teal-dk)", fontWeight: 600, fontFamily: "var(--f-mono)" }}>
                                            ${(s.value / 1000).toFixed(0)}K
                                        </span>
                                    </div>
                                </div>
                                <div style={{ height: 6, borderRadius: 999, background: "var(--line)", overflow: "hidden" }}>
                                    <div style={{ height: "100%", width: `${s.pct * 4}%`, background: "var(--teal)", borderRadius: 999 }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Team Capacity */}
                <div style={{ background: "var(--white)", borderRadius: 16, border: "1px solid var(--line)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                    <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--line)" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>Team Capacity</div>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Avg utilization: 76%</div>
                    </div>
                    <div style={{ padding: "12px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
                        {TEAM_CAP.map((t) => {
                            const barColor = { teal: "var(--teal)", amber: "var(--amber)", rose: "var(--rose)" }[t.risk];
                            return (
                                <div key={t.name}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                        <span style={{ fontSize: 12, color: "var(--text)" }}>{t.name}</span>
                                        <span style={{ fontSize: 11, fontFamily: "var(--f-mono)", color: barColor, fontWeight: 600 }}>{t.util}%</span>
                                    </div>
                                    <div style={{ height: 6, borderRadius: 999, background: "var(--line)", overflow: "hidden" }}>
                                        <div style={{ height: "100%", width: `${t.util}%`, background: barColor, borderRadius: 999 }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Financials + Module status */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ background: "var(--white)", borderRadius: 16, border: "1px solid var(--line)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                        <div style={{ padding: "16px 22px 14px" }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", marginBottom: 12 }}>Financials Q2</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                {FINANCIALS.map((f) => (
                                    <div key={f.label}>
                                        <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 2 }}>{f.label}</div>
                                        <div style={{ fontFamily: "var(--f-display)", fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>{f.value}</div>
                                        <div style={{ fontSize: 9.5, color: f.ok ? "var(--teal)" : "var(--rose)", marginTop: 2 }}>{f.trend}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div style={{ background: "var(--ink2)", borderRadius: 16, padding: "16px 18px", flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--white)", marginBottom: 10 }}>System Status</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                            {MODULES_STATUS.map((m) => (
                                <div key={m.num} style={{ background: "rgba(255,255,255,.05)", borderRadius: 8, padding: "7px", textAlign: "center", border: "1px solid rgba(255,255,255,.08)" }}>
                                    <div style={{ fontSize: 14, marginBottom: 3 }}>{m.icon}</div>
                                    <div style={{ fontSize: 8, color: "rgba(255,255,255,.4)", marginBottom: 2 }}>{m.num}</div>
                                    <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: STATUS_DOT[m.status] }} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
