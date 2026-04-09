"use client";

const RFQS = [
    { id: "RFQ-2024-041", client: "LabCore Diagnostics", type: "Platform", status: "ai_scope" as const, aiScore: 87, secs: 8, est: "$320K", pm: "SC", date: "Jun 12" },
    { id: "RFQ-2024-040", client: "Hospita Group", type: "Integration", status: "review" as const, aiScore: 74, secs: 10, est: "$420K", pm: "MT", date: "Jun 10" },
    { id: "RFQ-2024-039", client: "HealthRx Corp", type: "Consulting", status: "intake" as const, aiScore: 0, secs: 4, est: "—", pm: "AR", date: "Jun 9" },
    { id: "RFQ-2024-038", client: "MedNet Labs", type: "AI Model", status: "approved" as const, aiScore: 91, secs: 10, est: "$245K", pm: "SC", date: "Jun 6" },
    { id: "RFQ-2024-037", client: "CliniFlow", type: "Analytics", status: "approved" as const, aiScore: 68, secs: 10, est: "$135K", pm: "DL", date: "Jun 2" },
];

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
    intake: { label: "Intake", bg: "#F3F4F6", color: "#374151" },
    ai_scope: { label: "AI Scope", bg: "#EDE9FE", color: "#5B21B6" },
    review: { label: "Review", bg: "#FEF3C7", color: "#92400E" },
    approved: { label: "Approved", bg: "#D1FAE5", color: "#065F46" },
};

const SECTIONS = [
    "Client Identification", "Project Type", "Regulatory Context",
    "Data & Datasets", "Technical Requirements", "Team & Roles",
    "Budget Expectations", "Timeline", "Success Criteria", "Special Conditions",
];

const AI_OUTPUT = {
    client: "LabCore Diagnostics",
    score: 87,
    sections: [
        { label: "Project Charter", preview: "NLP Clinical Suite — Phase 1: Data ingestion pipeline + model fine-tuning on LabCore's pathology report corpus. Deliverables: trained model, API endpoint, evaluation report." },
        { label: "Budget Estimate", preview: "$295,000–$345,000 (90-day range). Breakdown: 45% AI/ML engineering, 30% PM + Compliance, 15% Infrastructure, 10% QA + Documentation." },
        { label: "Timeline (14-week)", preview: "Week 1–2: Discovery. Week 3–6: Data pipeline. Week 7–10: Model training. Week 11–12: Integration. Week 13–14: UAT + Go-live." },
        { label: "Risk Register (top 3)", preview: "R1: Data quality issues in clinical corpus (High). R2: HIPAA audit delay (Medium). R3: Client-side API latency (Low)." },
        { label: "Backlog Seed", preview: "23 user stories pre-generated across 4 epics. Sprint 1 pre-populated with 8 stories ready for PM review." },
    ],
};

export default function RFQPage() {
    return (
        <div style={{ padding: "28px 32px 60px", background: "var(--surface)", minHeight: "100vh" }}>
            <div style={{ marginBottom: 26 }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", color: "#16a34a", marginBottom: 6 }}>M-02 · Demand Capture</div>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                    <div>
                        <h1 style={{ fontFamily: "var(--f-display)", fontSize: 32, fontWeight: 900, color: "var(--ink)", margin: 0 }}>
                            RFQ &amp; <em style={{ color: "#16a34a", fontStyle: "normal" }}>Intake Engine</em>
                        </h1>
                        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "5px 0 0" }}>60-question structured intake · AI-assisted scope generation · Q2 2026</p>
                    </div>
                    <button style={{ padding: "8px 18px", borderRadius: 9, border: "none", background: "#16a34a", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ New RFQ</button>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
                {[
                    { label: "Active RFQs", value: "5", sub: "3 awaiting AI scope" },
                    { label: "Avg Completion", value: "94%", sub: "of 60 questions" },
                    { label: "AI Scope Accuracy", value: "87%", sub: "confidence avg" },
                    { label: "Intake → Deal", value: "72%", sub: "conversion rate" },
                ].map((k) => (
                    <div key={k.label} style={{ background: "var(--white)", borderRadius: 14, padding: "18px 20px", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>{k.label}</div>
                        <div style={{ fontFamily: "var(--f-display)", fontSize: 28, fontWeight: 700, color: "var(--teal-dk)" }}>{k.value}</div>
                        <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 4 }}>{k.sub}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "5fr 5fr", gap: 18, marginBottom: 20 }}>
                {/* RFQ List */}
                <div style={{ background: "var(--white)", borderRadius: 16, border: "1px solid var(--line)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                    <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--line)" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>Recent RFQs</div>
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: "var(--surface)" }}>
                                {["ID", "Client", "Type", "Status", "AI Score", "Secs", "Est. Value", "PM"].map((h) => (
                                    <th key={h} style={{ padding: "9px 14px", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", color: "var(--muted)", textAlign: "left" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {RFQS.map((r) => {
                                const sl = STATUS_LABELS[r.status];
                                return (
                                    <tr key={r.id} style={{ borderTop: "1px solid var(--line)", cursor: "pointer" }}
                                        onMouseEnter={e => (e.currentTarget.style.background = "var(--surface)")}
                                        onMouseLeave={e => (e.currentTarget.style.background = "")}>
                                        <td style={{ padding: "10px 14px", fontSize: 10.5, fontFamily: "var(--f-mono)", color: "var(--muted)" }}>{r.id}</td>
                                        <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{r.client}</td>
                                        <td style={{ padding: "10px 14px", fontSize: 11, color: "var(--muted)" }}>{r.type}</td>
                                        <td style={{ padding: "10px 14px" }}>
                                            <span style={{ background: sl.bg, color: sl.color, borderRadius: 20, padding: "2px 9px", fontSize: 10, fontWeight: 600 }}>{sl.label}</span>
                                        </td>
                                        <td style={{ padding: "10px 14px", fontSize: 11, fontFamily: "var(--f-mono)", color: r.aiScore >= 80 ? "var(--teal)" : r.aiScore >= 60 ? "var(--amber)" : "var(--muted)", fontWeight: 700 }}>{r.aiScore > 0 ? r.aiScore : "—"}</td>
                                        <td style={{ padding: "10px 14px", fontSize: 11, color: "var(--muted)" }}>{r.secs}/10</td>
                                        <td style={{ padding: "10px 14px", fontSize: 11, fontFamily: "var(--f-mono)", color: "var(--ink)" }}>{r.est}</td>
                                        <td style={{ padding: "10px 14px" }}>
                                            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#16a34a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8.5, fontWeight: 700 }}>{r.pm}</div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Questionnaire sections */}
                <div style={{ background: "var(--white)", borderRadius: 16, border: "1px solid var(--line)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                    <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--line)" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>60-Question Intake — Sections</div>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>LabCore Diagnostics · RFQ-2024-041 · 8/10 sections complete</div>
                    </div>
                    <div style={{ padding: "14px 20px" }}>
                        {SECTIONS.map((s, i) => {
                            const done = i < 8;
                            return (
                                <div key={s} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < SECTIONS.length - 1 ? "1px solid var(--line)" : "none" }}>
                                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: done ? "var(--teal)" : "var(--line)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        {done ? <span style={{ color: "var(--ink)", fontSize: 10 }}>✓</span> : <span style={{ color: "var(--muted)", fontSize: 9 }}>{i + 1}</span>}
                                    </div>
                                    <span style={{ fontSize: 12, color: done ? "var(--ink)" : "var(--muted)", fontWeight: done ? 500 : 400 }}>Section {i + 1}: {s}</span>
                                    {!done && i === 8 && <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--amber)", fontWeight: 600 }}>In Progress</span>}
                                    {!done && i > 8 && <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--muted)" }}>Pending</span>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* AI Scope Output */}
            <div style={{ background: "var(--ink)", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: "18px 22px", borderBottom: "1px solid rgba(255,255,255,.08)", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--white)" }}>🤖 AI Scope Output — {AI_OUTPUT.client}</div>
                    <span style={{ background: "var(--teal)", color: "var(--ink)", borderRadius: 6, padding: "2px 8px", fontSize: 9.5, fontWeight: 700 }}>CONFIDENCE: {AI_OUTPUT.score}%</span>
                    <span style={{ marginLeft: "auto", fontSize: 10.5, color: "rgba(255,255,255,.4)" }}>Generated in 4.2s · Review before sending to client</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 0 }}>
                    {AI_OUTPUT.sections.map((s, i) => (
                        <div key={i} style={{ padding: "16px 18px", borderRight: i < AI_OUTPUT.sections.length - 1 ? "1px solid rgba(255,255,255,.07)" : "none" }}>
                            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px", color: "var(--teal)", marginBottom: 6 }}>{s.label}</div>
                            <p style={{ fontSize: 11, color: "rgba(255,255,255,.5)", lineHeight: 1.65, margin: 0 }}>{s.preview}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
