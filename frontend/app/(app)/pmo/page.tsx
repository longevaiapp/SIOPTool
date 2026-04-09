"use client";

const PORTFOLIO = [
    { name: "ClinAI NLP Batch", client: "LabCore", pm: "SC", health: 88, budget: 72, phase: "S4", sprints: 8, days: 14, status: "teal" as const, flags: [] },
    { name: "BioMetrics v2", client: "Amatista", pm: "LC", health: 62, budget: 95, phase: "S6", sprints: 10, days: -3, status: "rose" as const, flags: ["Budget exceeded", "Scope drift"] },
    { name: "Pharma Portal", client: "HealthRx", pm: "SC", health: 77, budget: 50, phase: "S2", sprints: 12, days: 30, status: "amber" as const, flags: ["Client approvals pending"] },
    { name: "NLP Pipeline Ext.", client: "GenomicsCo", pm: "MT", health: 91, budget: 40, phase: "S1", sprints: 6, days: 42, status: "teal" as const, flags: [] },
    { name: "FHIR Gateway", client: "Hospita", pm: "AR", health: 55, budget: 110, phase: "S7", sprints: 10, days: -18, status: "rose" as const, flags: ["Over budget 10%", "3 P1 blockers"] },
];

const PORTFOLIO_KPIs = [
    { label: "Portfolio Health", value: "74/100", delta: "↓ 8pts vs Q1", t: "amber" as const },
    { label: "On-Time Rate", value: "72%", delta: "Target: 80%", t: "amber" as const },
    { label: "Active Projects", value: "5", delta: "2 at risk", t: "rose" as const },
    { label: "Total Budget Health", value: "$1.2M", delta: "3 projects over plan", t: "amber" as const },
];

const PMO_RISKS = [
    { id: "R-001", project: "BioMetrics v2", desc: "Budget exceeded by 19% — scope change not formally approved", sev: "rose" as const, action: "CFO + PM scope review by Jun 19" },
    { id: "R-002", project: "FHIR Gateway", desc: "3 P1 blockers open > 5 days — client dependency unresolved", sev: "rose" as const, action: "CEO escalation call. Client escalation path activated." },
    { id: "R-003", project: "Pharma Portal", desc: "Client approval pending for Sprint 2 deliverables for 8 days", sev: "amber" as const, action: "PM: follow-up call. SLA reminder to client." },
    { id: "R-004", project: "FHIR Gateway", desc: "Team utilization at 92% — Solutions Architect bottleneck", sev: "amber" as const, action: "Re-allocate Sprint 8 or activate contractor by Jun 18." },
];

const STATUS_DOT = { teal: "#10B981", amber: "#F59E0B", rose: "#F43F5E" };
const STATUS_BG = { teal: "#D1FAE5", amber: "#FEF3C7", rose: "#FFE4E6" };
const STATUS_COL = { teal: "#065F46", amber: "#92400E", rose: "#9F1239" };
const SEV_STYLE = {
    rose: { bg: "var(--rose-lt)", border: "var(--rose)", color: "var(--rose)" },
    amber: { bg: "var(--amber-lt)", border: "var(--amber)", color: "#92400E" },
    teal: { bg: "var(--teal-lt)", border: "var(--teal)", color: "var(--teal-dk)" },
};

function HealthRing({ score }: { score: number }) {
    const size = 36; const r = 13; const c2 = 2 * Math.PI * r;
    const color = score >= 80 ? "var(--teal)" : score >= 65 ? "var(--amber)" : "var(--rose)";
    return (
        <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
            <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={3} />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3}
                    strokeDasharray={c2} strokeDashoffset={c2 * (1 - score / 100)} strokeLinecap="round" />
            </svg>
            <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color, fontFamily: "var(--f-mono)" }}>{score}</span>
        </div>
    );
}

export default function PMOPage() {
    return (
        <div style={{ padding: "28px 32px 60px", background: "var(--surface)", minHeight: "100vh" }}>
            <div style={{ marginBottom: 26 }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", color: "#0d9488", marginBottom: 6 }}>M-05 · Portfolio Governance</div>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                    <div>
                        <h1 style={{ fontFamily: "var(--f-display)", fontSize: 32, fontWeight: 900, color: "var(--ink)", margin: 0 }}>
                            PMO &amp; <em style={{ color: "#0d9488", fontStyle: "normal" }}>Portfolio</em>
                        </h1>
                        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "5px 0 0" }}>Multi-project governance · Aggregated health scoring · Executive reporting</p>
                    </div>
                    <button style={{ padding: "8px 16px", borderRadius: 9, border: "none", background: "#0d9488", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✦ AI Portfolio Review</button>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
                {PORTFOLIO_KPIs.map((k) => {
                    const c = k.t === "rose" ? "var(--rose)" : k.t === "amber" ? "var(--amber)" : "var(--teal-dk)";
                    return (
                        <div key={k.label} style={{ background: "var(--white)", borderRadius: 14, padding: "18px 20px", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}>
                            <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500, marginBottom: 4 }}>{k.label}</div>
                            <div style={{ fontFamily: "var(--f-display)", fontSize: 28, fontWeight: 700, color: c, lineHeight: 1 }}>{k.value}</div>
                            <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 5 }}>{k.delta}</div>
                        </div>
                    );
                })}
            </div>

            {/* Portfolio table */}
            <div style={{ background: "var(--white)", borderRadius: 16, border: "1px solid var(--line)", overflow: "hidden", boxShadow: "var(--shadow-sm)", marginBottom: 20 }}>
                <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--line)" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>Portfolio Health Matrix — All Active Projects</div>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ background: "var(--surface)" }}>
                            {["Project", "Client", "PM", "Health Score", "Budget Consumed", "Phase", "Sprints", "ETA", "Status", "Risk Flags"].map((h) => (
                                <th key={h} style={{ padding: "9px 14px", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".7px", color: "var(--muted)", textAlign: "left" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {PORTFOLIO.map((p) => (
                            <tr key={p.name} style={{ borderTop: "1px solid var(--line)", cursor: "pointer" }}
                                onMouseEnter={e => (e.currentTarget.style.background = "var(--surface)")}
                                onMouseLeave={e => (e.currentTarget.style.background = "")}>
                                <td style={{ padding: "11px 14px", fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{p.name}</td>
                                <td style={{ padding: "11px 14px", fontSize: 12, color: "var(--muted)" }}>{p.client}</td>
                                <td style={{ padding: "11px 14px" }}>
                                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#0d9488", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700 }}>{p.pm}</div>
                                </td>
                                <td style={{ padding: "11px 14px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <HealthRing score={p.health} />
                                        <div style={{ height: 5, width: 60, borderRadius: 999, background: "var(--line)", overflow: "hidden" }}>
                                            <div style={{ height: "100%", width: `${p.health}%`, background: p.health >= 80 ? "var(--teal)" : p.health >= 65 ? "var(--amber)" : "var(--rose)", borderRadius: 999 }} />
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: "11px 14px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <div style={{ height: 5, width: 60, borderRadius: 999, background: "var(--line)", overflow: "hidden" }}>
                                            <div style={{ height: "100%", width: `${Math.min(p.budget, 100)}%`, background: p.budget > 100 ? "var(--rose)" : p.budget > 80 ? "var(--amber)" : "var(--teal)", borderRadius: 999 }} />
                                        </div>
                                        <span style={{ fontSize: 10.5, fontFamily: "var(--f-mono)", color: p.budget > 100 ? "var(--rose)" : "var(--muted)" }}>{p.budget}%</span>
                                    </div>
                                </td>
                                <td style={{ padding: "11px 14px", fontSize: 11, color: "var(--muted)" }}>{p.phase}</td>
                                <td style={{ padding: "11px 14px", fontSize: 11, color: "var(--muted)" }}>{p.sprints} total</td>
                                <td style={{ padding: "11px 14px", fontSize: 11, fontFamily: "var(--f-mono)", color: p.days < 0 ? "var(--rose)" : "var(--muted)" }}>{p.days < 0 ? `${Math.abs(p.days)}d late` : `+${p.days}d`}</td>
                                <td style={{ padding: "11px 14px" }}>
                                    <span style={{ background: STATUS_BG[p.status], color: STATUS_COL[p.status], borderRadius: 20, padding: "2px 9px", fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: STATUS_DOT[p.status], display: "inline-block" }} />
                                        {p.status === "teal" ? "On track" : p.status === "amber" ? "Watch" : "At risk"}
                                    </span>
                                </td>
                                <td style={{ padding: "11px 14px" }}>
                                    {p.flags.length ? p.flags.map((f) => (
                                        <span key={f} style={{ background: "var(--rose-lt)", color: "var(--rose)", fontSize: 9.5, fontWeight: 600, padding: "2px 7px", borderRadius: 6, marginRight: 4 }}>{f}</span>
                                    )) : <span style={{ fontSize: 11, color: "var(--muted)" }}>—</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Risk register */}
            <div style={{ background: "var(--white)", borderRadius: 16, border: "1px solid var(--line)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--line)", display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>Portfolio Risk Register</div>
                    <span style={{ background: "var(--rose-lt)", color: "var(--rose)", borderRadius: 6, padding: "2px 8px", fontSize: 9.5, fontWeight: 700 }}>4 ACTIVE RISKS</span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ background: "var(--surface)" }}>
                            {["ID", "Project", "Risk Description", "Severity", "Action Required"].map((h) => (
                                <th key={h} style={{ padding: "9px 16px", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", color: "var(--muted)", textAlign: "left" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {PMO_RISKS.map((r, i) => {
                            const s = SEV_STYLE[r.sev];
                            return (
                                <tr key={i} style={{ borderTop: "1px solid var(--line)" }}>
                                    <td style={{ padding: "11px 16px", fontFamily: "var(--f-mono)", fontSize: 10.5, color: "var(--muted)" }}>{r.id}</td>
                                    <td style={{ padding: "11px 16px", fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{r.project}</td>
                                    <td style={{ padding: "11px 16px", fontSize: 12, color: "var(--text)" }}>{r.desc}</td>
                                    <td style={{ padding: "11px 16px" }}>
                                        <span style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color, fontSize: 9.5, fontWeight: 700, padding: "2px 8px", borderRadius: 6 }}>
                                            {r.sev === "rose" ? "Critical" : "High"}
                                        </span>
                                    </td>
                                    <td style={{ padding: "11px 16px", fontSize: 11.5, color: "var(--muted)", fontStyle: "italic" }}>{r.action}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
