"use client";

const INSIGHTS = [
    {
        id: "INS-001", priority: "critical" as const, module: "SIOP Engine", ts: "2 min ago",
        title: "Capacity gap projected in 8 days — team at 84% utilization",
        body: "Current demand pipeline ($1.68M weighted) requires 5.8 FTE-weeks of additional capacity. Solutions Architect at 92% — primary bottleneck. If no action by Jun 18, 2 projects risk delay cascade.",
        action: "Open contractor RFQ for Solutions Architect. Estimated cost: $18K. Alternative: defer FHIR Gateway Sprint 8 by 3 weeks.",
        confidence: 91,
        tags: ["Capacity", "SIOP", "PMO"],
    },
    {
        id: "INS-002", priority: "critical" as const, module: "Finance", ts: "17 min ago",
        title: "BioMetrics v2 budget exceeded by 19% — no contingency remaining",
        body: "Project now at $186K vs $156K approved budget. Root cause: 2 undocumented scope additions (AI model retraining, FHIR R4 integration). CFO approval required before Sprint 7 can start.",
        action: "Formal change order required. Schedule CFO + PM + Client scope review by Jun 19. Adjust CRM deal value upward.",
        confidence: 98,
        tags: ["Finance", "Projects", "Risk"],
    },
    {
        id: "INS-003", priority: "high" as const, module: "CRM", ts: "1h ago",
        title: "LabCore deal stagnant 12 days — win probability dropped 74→58",
        body: "Last meaningful activity: Demo completed May 31. No contact in 12 days. AI model detects deal velocity pattern consistent with competitive displacement (78% historical match). Decision maker silent.",
        action: "CEO-level executive outreach recommended within 48h. Prepare competitive differentiation deck and timeline incentive.",
        confidence: 78,
        tags: ["CRM", "Sales", "Risk"],
    },
    {
        id: "INS-004", priority: "high" as const, module: "Compliance", ts: "3h ago",
        title: "3 compliance controls expiring within 14 days",
        body: "HIPAA-03 (Audit Log Review): expires Jun 18. GDPR-01 (DPA — EU clients): expires Jun 30. SEC-01 (Annual pen test): overdue since Jun 2023.",
        action: "Compliance Lead + CTO: schedule review by Jun 15. SEC-01 pen test vendor selection required immediately.",
        confidence: 100,
        tags: ["Compliance", "HIPAA", "GDPR"],
    },
    {
        id: "INS-005", priority: "medium" as const, module: "Projects", ts: "6h ago",
        title: "FHIR Gateway P1 blocker unresolved 3 days — client dependency",
        body: "Blocker B-052: Hospita Group client-side API endpoint returning 401 errors. Blocking Sprint 7 acceptance. PM has sent 2 follow-ups. No response from Hospita IT.",
        action: "Escalate to Hospita PM Director. Set 48h SLA deadline. If unresolved, activate workaround: mock endpoint for internal testing.",
        confidence: 85,
        tags: ["Projects", "PMO", "Client"],
    },
    {
        id: "INS-006", priority: "opportunity" as const, module: "CRM", ts: "Yesterday",
        title: "GenomicsCo expansion opportunity detected — Phase 2 signal",
        body: "AI model detected cross-sell pattern: 3 conversations about genomic variant annotation (outside current project scope). GenomicsCo PM asked about ML pipeline extension in last 2 check-ins.",
        action: "Prepare Phase 2 expansion proposal ($180K–$240K). Target: present at next QBR (Jun 25).",
        confidence: 73,
        tags: ["CRM", "Upsell", "Opportunity"],
    },
    {
        id: "INS-007", priority: "opportunity" as const, module: "Customer Health", ts: "2 days ago",
        title: "LabCore NPS spike to 72 — referral opportunity window open",
        body: "Post-Sprint 3 demo NPS jumped from 58 to 72. Client expressed strong satisfaction in async follow-up. Historical pattern: 68% of clients with NPS >70 provide referrals when asked within 14 days.",
        action: "Send referral request to LabCore PM this week. Provide referral incentive deck. Target: 1 qualified intro by Jun 30.",
        confidence: 68,
        tags: ["Customer Health", "Growth"],
    },
];

const PRIO_STYLE = {
    critical: { bg: "var(--rose)", color: "#fff", label: "CRITICAL" },
    high: { bg: "var(--amber)", color: "var(--ink)", label: "HIGH" },
    medium: { bg: "var(--blue)", color: "#fff", label: "MEDIUM" },
    opportunity: { bg: "var(--teal)", color: "var(--ink)", label: "OPPORTUNITY" },
};

const TAG_COLORS: Record<string, { bg: string; color: string }> = {
    SIOP: { bg: "#E0F2FE", color: "#0C4A6E" }, CRM: { bg: "#DBEAFE", color: "#1D4ED8" },
    Finance: { bg: "#FEF3C7", color: "#92400E" }, Compliance: { bg: "#EDE9FE", color: "#5B21B6" },
    Projects: { bg: "var(--teal-lt)", color: "var(--teal-dk)" }, PMO: { bg: "#F0FDF4", color: "#166534" },
    Sales: { bg: "#FFF7ED", color: "#C2410C" }, Risk: { bg: "var(--rose-lt)", color: "var(--rose)" },
    HIPAA: { bg: "#EDE9FE", color: "#5B21B6" }, GDPR: { bg: "#EDE9FE", color: "#5B21B6" },
    Client: { bg: "#F3F4F6", color: "#374151" }, Upsell: { bg: "var(--sage-lt)", color: "var(--sage)" },
    Opportunity: { bg: "var(--teal-lt)", color: "var(--teal-dk)" }, Growth: { bg: "var(--teal-lt)", color: "var(--teal-dk)" },
    Capacity: { bg: "#FEF3C7", color: "#92400E" },
};

export default function AIInsightsPage() {
    const counts = {
        critical: INSIGHTS.filter(i => i.priority === "critical").length,
        high: INSIGHTS.filter(i => i.priority === "high").length,
        opportunity: INSIGHTS.filter(i => i.priority === "opportunity").length,
        avgConf: Math.round(INSIGHTS.reduce((a, i) => a + i.confidence, 0) / INSIGHTS.length),
    };

    return (
        <div style={{ padding: "28px 32px 60px", background: "var(--surface)", minHeight: "100vh" }}>

            {/* Header */}
            <div style={{ marginBottom: 26 }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", color: "#7C5CFC", marginBottom: 6 }}>M-11 · Cross-Module Intelligence</div>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                    <div>
                        <h1 style={{ fontFamily: "var(--f-display)", fontSize: 32, fontWeight: 900, color: "var(--ink)", margin: 0 }}>
                            AI <em style={{ color: "#7C5CFC", fontStyle: "normal" }}>Insights</em>
                        </h1>
                        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "5px 0 0" }}>Anomalies · Predictions · Recommendations · Next best actions · Continuous monitoring</p>
                    </div>
                    <button style={{ padding: "8px 16px", borderRadius: 9, border: "none", background: "#7C5CFC", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✦ Ask AI Copilot</button>
                </div>
            </div>

            {/* Summary stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
                {[
                    { label: "Critical Alerts", value: counts.critical, color: "var(--rose)", bg: "var(--rose-lt)", border: "var(--rose)" },
                    { label: "High Priority", value: counts.high, color: "var(--amber)", bg: "var(--amber-lt)", border: "var(--amber)" },
                    { label: "Opportunities", value: counts.opportunity, color: "var(--teal-dk)", bg: "var(--teal-lt)", border: "var(--teal)" },
                    { label: "Avg Confidence", value: `${counts.avgConf}%`, color: "#7C5CFC", bg: "var(--violet-lt)", border: "#7C5CFC" },
                ].map((k) => (
                    <div key={k.label} style={{ background: k.bg, borderRadius: 14, padding: "18px 20px", border: `1.5px solid ${k.border}`, boxShadow: "var(--shadow-sm)" }}>
                        <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500, marginBottom: 4 }}>{k.label}</div>
                        <div style={{ fontFamily: "var(--f-display)", fontSize: 32, fontWeight: 900, color: k.color, lineHeight: 1 }}>{k.value}</div>
                    </div>
                ))}
            </div>

            {/* Insight cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {INSIGHTS.map((ins) => {
                    const p = PRIO_STYLE[ins.priority];
                    const isAlert = ins.priority === "critical" || ins.priority === "high";
                    return (
                        <div key={ins.id} style={{ background: "var(--white)", borderRadius: 16, border: `1.5px solid ${isAlert ? (ins.priority === "critical" ? "var(--rose)" : "var(--amber)") : "var(--line)"}`, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                            <div style={{ display: "flex", gap: 0, minHeight: 0 }}>
                                {/* Accent bar */}
                                <div style={{ width: 4, flexShrink: 0, background: ins.priority === "critical" ? "var(--rose)" : ins.priority === "high" ? "var(--amber)" : ins.priority === "opportunity" ? "var(--teal)" : "var(--blue)" }} />
                                <div style={{ flex: 1, padding: "18px 22px" }}>
                                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                                        <span style={{ background: p.bg, color: p.color, fontSize: 8.5, fontWeight: 700, padding: "3px 8px", borderRadius: 5, textTransform: "uppercase", letterSpacing: ".8px", flexShrink: 0, marginTop: 2 }}>{p.label}</span>
                                        <span style={{ fontSize: 10.5, color: "var(--muted)", background: "var(--surface)", padding: "2px 8px", borderRadius: 6, flexShrink: 0 }}>{ins.module}</span>
                                        <div style={{ flex: 1, fontSize: 15, fontWeight: 700, color: "var(--ink)", lineHeight: 1.3 }}>{ins.title}</div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                <div style={{ height: 4, width: 50, borderRadius: 999, background: "var(--line)", overflow: "hidden" }}>
                                                    <div style={{ height: "100%", width: `${ins.confidence}%`, background: "#7C5CFC", borderRadius: 999 }} />
                                                </div>
                                                <span style={{ fontSize: 10, color: "#7C5CFC", fontFamily: "var(--f-mono)", fontWeight: 700 }}>{ins.confidence}%</span>
                                            </div>
                                            <span style={{ fontFamily: "var(--f-mono)", fontSize: 9.5, color: "var(--muted)" }}>{ins.id}</span>
                                            <span style={{ fontSize: 10, color: "var(--muted)" }}>{ins.ts}</span>
                                        </div>
                                    </div>

                                    <p style={{ fontSize: 12.5, color: "var(--text)", lineHeight: 1.7, margin: "0 0 10px" }}>{ins.body}</p>

                                    <div style={{ background: isAlert ? (ins.priority === "critical" ? "#FFF5F5" : "#FFFBEB") : "var(--teal-lt)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "var(--ink)", lineHeight: 1.5 }}>
                                        <strong style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".8px", color: "var(--muted)", display: "block", marginBottom: 3 }}>Recommended Action</strong>
                                        {ins.action}
                                    </div>

                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        {ins.tags.map((t) => {
                                            const ts = TAG_COLORS[t] ?? { bg: "#F3F4F6", color: "#374151" };
                                            return (
                                                <span key={t} style={{ background: ts.bg, color: ts.color, fontSize: 9.5, fontWeight: 600, padding: "2px 8px", borderRadius: 6 }}>{t}</span>
                                            );
                                        })}
                                        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                                            <button style={{ padding: "5px 12px", borderRadius: 7, border: "1.5px solid var(--line)", background: "none", fontSize: 11, color: "var(--muted)", cursor: "pointer" }}>Dismiss</button>
                                            <button style={{ padding: "5px 12px", borderRadius: 7, border: "none", background: "var(--ink)", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Act Now →</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
