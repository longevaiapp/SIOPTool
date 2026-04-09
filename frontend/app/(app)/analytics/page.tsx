"use client";

const PROJECT_PL = [
    { name: "ClinAI NLP Batch", client: "LabCore", revenue: 320000, cost: 198000, margin: 38, status: "teal" as const },
    { name: "BioMetrics v2", client: "Amatista", revenue: 180000, cost: 186000, margin: -3, status: "rose" as const },
    { name: "Pharma Portal", client: "HealthRx", revenue: 95000, cost: 52000, margin: 45, status: "teal" as const },
    { name: "NLP Pipeline Ext.", client: "GenomicsCo", revenue: 510000, cost: 290000, margin: 43, status: "teal" as const },
    { name: "FHIR Gateway", client: "Hospita", revenue: 420000, cost: 462000, margin: -10, status: "rose" as const },
];

const CONSOLIDATED = [
    { label: "Gross Revenue Q2", value: "$1,525,000", ok: true },
    { label: "Total COGS", value: "$1,188,000", ok: true },
    { label: "Gross Profit", value: "$337,000", ok: true },
    { label: "Gross Margin", value: "22.1%", ok: false },
    { label: "Operating Expenses", value: "$195,000", ok: true },
    { label: "EBITDA", value: "$142,000", ok: true },
    { label: "EBITDA Margin", value: "9.3%", ok: false },
    { label: "MRR (recurring)", value: "$195K", ok: true },
];

const AI_ANOMALIES = [
    { title: "BioMetrics v2 margin negative", severity: "critical" as const, detail: "Cost overrun $6K. Scope additions not billed. CFO review required." },
    { title: "FHIR Gateway budget 110% consumed", severity: "critical" as const, detail: "Sprint 7 of 10. No budget contingency remaining. Change order needed." },
    { title: "Gross margin below 40% target", severity: "high" as const, detail: "Portfolio margin at 22.1% vs 40% target. 2 loss-making projects driving gap." },
    { title: "MRR growth slowed to +8%", severity: "medium" as const, detail: "Was +15% in Q1. Forecast model showing Q3 recovery if 2 deals close." },
];

const SEV_STYLE = {
    critical: { bg: "var(--rose-lt)", color: "var(--rose)" },
    high: { bg: "var(--amber-lt)", color: "#92400E" },
    medium: { bg: "var(--blue-lt)", color: "var(--blue)" },
};

export default function AnalyticsPage() {
    return (
        <div style={{ padding: "28px 32px 60px", background: "var(--surface)", minHeight: "100vh" }}>
            <div style={{ marginBottom: 26 }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", color: "#475569", marginBottom: 6 }}>M-10 · Financial Intelligence</div>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                    <div>
                        <h1 style={{ fontFamily: "var(--f-display)", fontSize: 32, fontWeight: 900, color: "var(--ink)", margin: 0 }}>
                            Finance &amp; <em style={{ color: "var(--amber)", fontStyle: "normal" }}>KPI Intelligence</em>
                        </h1>
                        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "5px 0 0" }}>Per-project P&amp;L · Consolidated financials · Anomaly detection · Q2 2026</p>
                    </div>
                    <button style={{ padding: "8px 16px", borderRadius: 9, border: "none", background: "var(--amber)", color: "var(--ink)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✦ AI Forecast</button>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
                {[
                    { label: "MRR", value: "$195K", delta: "+8% (slowing)", warn: true },
                    { label: "Gross Margin", value: "22.1%", delta: "Target ≥40%", warn: true },
                    { label: "Burn Rate / wk", value: "$24.5K", delta: "−3% vs Q1", warn: false },
                    { label: "ARR Forecast", value: "$2.34M", delta: "Base scenario", warn: false },
                ].map((k) => (
                    <div key={k.label} style={{ background: "var(--white)", borderRadius: 14, padding: "18px 20px", border: `1px solid ${k.warn ? "var(--amber)" : "var(--line)"}`, boxShadow: "var(--shadow-sm)" }}>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>{k.label}</div>
                        <div style={{ fontFamily: "var(--f-display)", fontSize: 28, fontWeight: 700, color: k.warn ? "var(--amber)" : "var(--teal-dk)", lineHeight: 1 }}>{k.value}</div>
                        <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 5 }}>{k.delta}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "6fr 4fr", gap: 18, marginBottom: 20 }}>
                {/* P&L per project */}
                <div style={{ background: "var(--white)", borderRadius: 16, border: "1px solid var(--line)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                    <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--line)" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>P&amp;L by Project — Q2 2026</div>
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: "var(--surface)" }}>
                                {["Project", "Client", "Revenue", "Cost", "Gross Profit", "Margin", "Status"].map((h) => (
                                    <th key={h} style={{ padding: "9px 16px", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", color: "var(--muted)", textAlign: "left" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {PROJECT_PL.map((p) => (
                                <tr key={p.name} style={{ borderTop: "1px solid var(--line)" }}>
                                    <td style={{ padding: "11px 16px", fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{p.name}</td>
                                    <td style={{ padding: "11px 16px", fontSize: 12, color: "var(--muted)" }}>{p.client}</td>
                                    <td style={{ padding: "11px 16px", fontSize: 12, fontFamily: "var(--f-mono)", color: "var(--ink)" }}>${(p.revenue / 1000).toFixed(0)}K</td>
                                    <td style={{ padding: "11px 16px", fontSize: 12, fontFamily: "var(--f-mono)", color: "var(--text)" }}>${(p.cost / 1000).toFixed(0)}K</td>
                                    <td style={{ padding: "11px 16px", fontSize: 12, fontFamily: "var(--f-mono)", color: p.revenue - p.cost < 0 ? "var(--rose)" : "var(--teal-dk)", fontWeight: 700 }}>
                                        {p.revenue - p.cost < 0 ? "-" : "+"}${Math.abs((p.revenue - p.cost) / 1000).toFixed(0)}K
                                    </td>
                                    <td style={{ padding: "11px 16px" }}>
                                        <span style={{ background: p.margin < 0 ? "var(--rose-lt)" : p.margin < 30 ? "var(--amber-lt)" : "var(--teal-lt)", color: p.margin < 0 ? "var(--rose)" : p.margin < 30 ? "#92400E" : "var(--teal-dk)", fontFamily: "var(--f-mono)", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6 }}>{p.margin}%</span>
                                    </td>
                                    <td style={{ padding: "11px 16px" }}>
                                        <span style={{ background: p.status === "teal" ? "#D1FAE5" : "#FFE4E6", color: p.status === "teal" ? "#065F46" : "#9F1239", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>
                                            {p.status === "teal" ? "Profitable" : "Loss"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Consolidated P&L */}
                <div style={{ background: "var(--ink)", borderRadius: 16, overflow: "hidden" }}>
                    <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--white)" }}>Consolidated P&amp;L</div>
                    </div>
                    <div style={{ padding: "14px 16px" }}>
                        {CONSOLIDATED.map((c) => (
                            <div key={c.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
                                <span style={{ fontSize: 11.5, color: "rgba(255,255,255,.5)" }}>{c.label}</span>
                                <span style={{ fontFamily: "var(--f-mono)", fontSize: 12, fontWeight: 700, color: c.ok ? "var(--teal)" : "var(--amber)" }}>{c.value}</span>
                            </div>
                        ))}

                        {/* AI Anomalies */}
                        <div style={{ marginTop: 16 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.6)", marginBottom: 8 }}>AI Anomalies</div>
                            {AI_ANOMALIES.map((a, i) => {
                                const s = SEV_STYLE[a.severity];
                                return (
                                    <div key={i} style={{ background: "rgba(255,255,255,.04)", borderRadius: 8, padding: "10px 12px", marginBottom: 6 }}>
                                        <span style={{ background: s.bg, color: s.color, fontSize: 8.5, fontWeight: 700, padding: "1px 6px", borderRadius: 4, textTransform: "uppercase" }}>{a.severity}</span>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--white)", margin: "5px 0 3px", lineHeight: 1.3 }}>{a.title}</div>
                                        <p style={{ fontSize: 10.5, color: "rgba(255,255,255,.35)", margin: 0 }}>{a.detail}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
