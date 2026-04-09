"use client";

// ─── Data ─────────────────────────────────────────────────────────────────────

const SIOP_BLOCKS = [
    {
        tag: "S — Sales / Demand",
        title: "Demand Signal",
        color: "#2563EB",
        items: [
            { label: "Pipeline (qualified)", value: "$2.4M", trend: "+12%", ok: true },
            { label: "Deals in negotiation", value: "4 deals", trend: "$730K", ok: true },
            { label: "Weighted forecast Q2", value: "$1.68M", trend: "68% accuracy", ok: true },
            { label: "New RFQs this month", value: "7", trend: "+3 vs avg", ok: true },
            { label: "Avg deal size", value: "$148K", trend: "▲ $12K", ok: true },
            { label: "Win rate (trailing 90d)", value: "68%", trend: "vs 65% target", ok: true },
        ],
    },
    {
        tag: "I — Inventory / Capacity",
        title: "Capacity State",
        color: "#F5A623",
        items: [
            { label: "Available FTE capacity", value: "18%", trend: "→ 3.2 FTE-weeks", ok: false },
            { label: "Team utilization avg", value: "84%", trend: "⚠ 85% limit", ok: false },
            { label: "Critical over-capacity", value: "2 roles", trend: "Solutions+Data", ok: false },
            { label: "Datasets available", value: "12 licensed", trend: "3 expiring Q3", ok: true },
            { label: "Infra headroom (GPU)", value: "71%", trend: "29% free", ok: true },
            { label: "Active contractor pool", value: "3 qualified", trend: "NDAs signed", ok: true },
        ],
    },
    {
        tag: "OP — Operations",
        title: "Operational State",
        color: "#00BFA5",
        items: [
            { label: "Active projects", value: "5", trend: "2 at-risk", ok: false },
            { label: "Portfolio health score", value: "74/100", trend: "↓ 8pts Q1→Q2", ok: false },
            { label: "On-time delivery rate", value: "72%", trend: "target: 80%", ok: false },
            { label: "Avg sprint velocity", value: "34 pts", trend: "±12% (target 15%)", ok: false },
            { label: "Open blockers (P1+P2)", value: "5 active", trend: "2 escalated CEO", ok: false },
            { label: "Compliance status", value: "88%", trend: "3 controls expiring", ok: false },
        ],
    },
];

const GAPS = [
    { dimension: "Revenue Demand vs Capacity", gap: "−$380K shortfall", severity: "rose" as const, detail: "Current utilization projects only $1.3M deliverable vs $1.68M forecast", action: "Activate 2 contractors or defer 1 project to Q3" },
    { dimension: "Team Utilization", gap: "+2 FTEs needed", severity: "amber" as const, detail: "Solutions Arch. at 92% — blocking 2 projects. Data Scientist at 88%", action: "Post contractor RFQ within 7 days. Re-prioritize sprint allocation" },
    { dimension: "Portfolio Delivery Rate", gap: "−8% vs target", severity: "amber" as const, detail: "72% on-time vs 80% target. BioMetrics v2 and FHIR Gateway behind", action: "PMO: escalate blockers. CEO: client expectation reset call" },
    { dimension: "SIOP Overall Score", gap: "61 / 100", severity: "rose" as const, detail: "Combined demand-capacity-operations score. Alert triggered at < 65", action: "Weekly SIOP review escalated to CEO this cycle" },
];

const SCENARIOS = [
    {
        type: "optimistic" as const,
        title: "Scenario A — Optimistic",
        prob: "28%",
        desc: "Close 2 pending deals in 30 days + activate 1 contractor by Week 2.",
        metrics: [
            { label: "Revenue Q2", value: "$1.95M", ok: true },
            { label: "Utilization", value: "88%", ok: false },
            { label: "Portfolio health", value: "82/100", ok: true },
            { label: "Risk exposure", value: "Low", ok: true },
        ],
        reqs: ["Close LabCore + HealthRx deals by June 15", "Contractor NDA signed Week 2", "No new scope changes in BioMetrics"],
    },
    {
        type: "base" as const,
        title: "Scenario B — Base Plan",
        prob: "54%",
        desc: "Close 1 deal, defer 1 project phase, monitor utilization weekly.",
        metrics: [
            { label: "Revenue Q2", value: "$1.55M", ok: true },
            { label: "Utilization", value: "84%", ok: false },
            { label: "Portfolio health", value: "74/100", ok: false },
            { label: "Risk exposure", value: "Medium", ok: false },
        ],
        reqs: ["LabCore deal closed", "FHIR Gateway Phase 7 deferred 3 weeks", "PMO weekly reviews enforced"],
    },
    {
        type: "pessimistic" as const,
        title: "Scenario C — Pessimistic",
        prob: "18%",
        desc: "No new deals closed, utilization peaks, delivery delays cascade.",
        metrics: [
            { label: "Revenue Q2", value: "$1.1M", ok: false },
            { label: "Utilization", value: "~91%", ok: false },
            { label: "Portfolio health", value: "58/100", ok: false },
            { label: "Risk exposure", value: "High", ok: false },
        ],
        reqs: ["Defer Pharma Portal to Q3", "Hire freeze review with CFO", "Client escalation plan activated"],
    },
];

const DECISIONS = [
    { id: "D-001", title: "Open contractor RFQ for Solutions Architect", owner: "PMO Lead", due: "Jun 18", priority: "critical" as const },
    { id: "D-002", title: "CEO call with LabCore — deal at risk since Day 12", owner: "CEO", due: "Jun 15", priority: "critical" as const },
    { id: "D-003", title: "Defer FHIR Gateway Phase 8 by 3 weeks", owner: "PMO + Client", due: "Jun 20", priority: "high" as const },
    { id: "D-004", title: "Compliance controls renewal — 3 expiring in 14 days", owner: "Compliance Lead", due: "Jun 22", priority: "high" as const },
    { id: "D-005", title: "BioMetrics v2 scope review (budget +19%)", owner: "PM + CFO", due: "Jun 19", priority: "medium" as const },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEV_STYLE = {
    rose: { bg: "var(--rose-lt)", border: "var(--rose)", color: "var(--rose)" },
    amber: { bg: "var(--amber-lt)", border: "var(--amber)", color: "#92400E" },
    teal: { bg: "var(--teal-lt)", border: "var(--teal)", color: "var(--teal-dk)" },
};

const PRIO_LABELS = {
    critical: { bg: "var(--rose)", color: "#fff" },
    high: { bg: "var(--amber)", color: "var(--ink)" },
    medium: { bg: "var(--blue-lt)", color: "var(--blue)" },
};

const SCENARIO_COLORS = {
    optimistic: { accent: "var(--teal)", probBg: "var(--teal-lt)", probColor: "var(--teal-dk)" },
    base: { accent: "var(--amber)", probBg: "var(--amber-lt)", probColor: "#92400E" },
    pessimistic: { accent: "var(--rose)", probBg: "var(--rose-lt)", probColor: "var(--rose)" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SIOPEnginePage() {
    return (
        <div style={{ padding: "28px 32px 60px", background: "var(--surface)", minHeight: "100vh" }}>

            {/* Header */}
            <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", color: "#0891b2", marginBottom: 6 }}>M-07 · Core Engine · Weekly SIOP Cycle</div>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                    <div>
                        <h1 style={{ fontFamily: "var(--f-display)", fontSize: 32, fontWeight: 900, color: "var(--ink)", margin: 0, lineHeight: 1 }}>
                            SIOP <em style={{ color: "#0891b2", fontStyle: "normal" }}>Planning Engine</em>
                        </h1>
                        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "5px 0 0" }}>Sales · Inventory/Capacity · Operations · Week of Jun 12–18, 2026</p>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <div style={{ background: "var(--rose-lt)", border: "1px solid var(--rose)", borderRadius: 10, padding: "8px 14px", display: "flex", alignItems: "center", gap: 7 }}>
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--rose)", display: "block" }} />
                            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--rose)" }}>SIOP ALERT — Score: 61/100</span>
                        </div>
                        <button style={{ padding: "8px 16px", borderRadius: 9, border: "none", background: "#0891b2", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✦ AI Scenarios</button>
                    </div>
                </div>
            </div>

            {/* S · I · OP blocks */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 }}>
                {SIOP_BLOCKS.map((block) => (
                    <div key={block.tag} style={{ background: "var(--white)", borderRadius: 16, border: "1px solid var(--line)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                        <div style={{ background: block.color, padding: "14px 18px" }}>
                            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.5px", color: "rgba(255,255,255,.7)", marginBottom: 3 }}>{block.tag}</div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{block.title}</div>
                        </div>
                        <div style={{ padding: "14px 18px" }}>
                            {block.items.map((item) => (
                                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 9, marginBottom: 9, borderBottom: "1px solid var(--line)" }}>
                                    <span style={{ fontSize: 12, color: "var(--muted)" }}>{item.label}</span>
                                    <div style={{ textAlign: "right" }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: item.ok ? "var(--ink)" : "var(--rose)", fontFamily: "var(--f-mono)" }}>{item.value}</div>
                                        <div style={{ fontSize: 10, color: item.ok ? "var(--teal)" : "#C2410C", marginTop: 1 }}>{item.trend}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Gap analysis */}
            <div style={{ background: "var(--white)", borderRadius: 16, border: "1px solid var(--line)", overflow: "hidden", boxShadow: "var(--shadow-sm)", marginBottom: 24 }}>
                <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>Gap Analysis — AI Detection</div>
                    <span style={{ background: "var(--rose-lt)", color: "var(--rose)", borderRadius: 6, padding: "2px 8px", fontSize: 9.5, fontWeight: 700 }}>4 GAPS DETECTED</span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ background: "var(--surface)" }}>
                            {["Dimension", "Gap Detected", "Supporting Data", "AI Recommendation"].map((h) => (
                                <th key={h} style={{ padding: "9px 16px", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", color: "var(--muted)", textAlign: "left" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {GAPS.map((g, i) => {
                            const s = SEV_STYLE[g.severity];
                            return (
                                <tr key={i} style={{ borderTop: "1px solid var(--line)" }}>
                                    <td style={{ padding: "11px 16px", fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{g.dimension}</td>
                                    <td style={{ padding: "11px 16px" }}>
                                        <span style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color, fontSize: 10.5, fontWeight: 700, padding: "2px 9px", borderRadius: 6, whiteSpace: "nowrap" }}>{g.gap}</span>
                                    </td>
                                    <td style={{ padding: "11px 16px", fontSize: 11.5, color: "var(--muted)", maxWidth: 300 }}>{g.detail}</td>
                                    <td style={{ padding: "11px 16px", fontSize: 11.5, color: "var(--text)", fontStyle: "italic" }}>{g.action}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Scenarios + Decisions */}
            <div style={{ display: "grid", gridTemplateColumns: "6fr 4fr", gap: 18 }}>

                {/* Scenarios */}
                <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 12 }}>AI-Generated Scenarios — Q2 2026</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {SCENARIOS.map((sc) => {
                            const c = SCENARIO_COLORS[sc.type];
                            return (
                                <div key={sc.type} style={{ background: "var(--white)", border: `1.5px solid ${c.accent}`, borderRadius: 14, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: "1px solid var(--line)" }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{sc.title}</div>
                                            <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3 }}>{sc.desc}</div>
                                        </div>
                                        <span style={{ background: c.probBg, color: c.probColor, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 8 }}>P = {sc.prob}</span>
                                    </div>
                                    <div style={{ padding: "12px 18px", display: "grid", gridTemplateColumns: "repeat(4,1fr) 3fr", gap: 12 }}>
                                        {sc.metrics.map((m) => (
                                            <div key={m.label}>
                                                <div style={{ fontSize: 9, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 2 }}>{m.label}</div>
                                                <div style={{ fontSize: 13, fontWeight: 700, color: m.ok ? "var(--teal-dk)" : "var(--rose)", fontFamily: "var(--f-mono)" }}>{m.value}</div>
                                            </div>
                                        ))}
                                        <div>
                                            <div style={{ fontSize: 9, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 4 }}>Requirements</div>
                                            {sc.reqs.map((r) => (
                                                <div key={r} style={{ fontSize: 10.5, color: "var(--muted)", display: "flex", alignItems: "flex-start", gap: 5, marginBottom: 3 }}>
                                                    <span style={{ color: c.accent, fontSize: 8, flexShrink: 0 }}>●</span> {r}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Required Decisions */}
                <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 12 }}>Required Decisions This Week</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {DECISIONS.map((d) => {
                            const p = PRIO_LABELS[d.priority];
                            return (
                                <div key={d.id} style={{ background: "var(--white)", border: "1px solid var(--line)", borderRadius: 12, padding: "14px 16px", boxShadow: "var(--shadow-sm)" }}>
                                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                                        <span style={{ background: p.bg, color: p.color, fontSize: 8.5, fontWeight: 700, padding: "2px 7px", borderRadius: 5, textTransform: "uppercase", letterSpacing: ".5px", flexShrink: 0 }}>{d.priority}</span>
                                        <span style={{ fontFamily: "var(--f-mono)", fontSize: 9.5, color: "var(--muted)", marginLeft: "auto" }}>{d.id}</span>
                                    </div>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", lineHeight: 1.4, marginBottom: 6 }}>{d.title}</div>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5 }}>
                                        <span style={{ color: "var(--muted)" }}>{d.owner}</span>
                                        <span style={{ color: d.priority === "critical" ? "var(--rose)" : "var(--muted)", fontWeight: 600 }}>Due: {d.due}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
