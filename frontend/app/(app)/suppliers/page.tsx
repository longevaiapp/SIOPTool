"use client";

const SUPPLIERS = [
    { name: "DataBridge Analytics", cat: "Data Partner", score: 91, sla: 98, cost: "$12K/mo", status: "active" as const, tags: ["HIPAA", "FHIR", "Preferred"] },
    { name: "CloudAI Infrastructure", cat: "Cloud/Infra", score: 87, sla: 99.9, cost: "$8.4K/mo", status: "active" as const, tags: ["AWS BAA", "HIPAA"] },
    { name: "MedAnnotate Pro", cat: "Annotation", score: 78, sla: 94, cost: "$6.2K/proj", status: "active" as const, tags: ["PHI approved"] },
    { name: "Regulatory Advisors LLC", cat: "Compliance", score: 84, sla: 100, cost: "$4.8K/mo", status: "active" as const, tags: ["COFEPRIS", "HIPAA"] },
    { name: "SprintContract Dev", cat: "Contractor", score: 72, sla: 88, cost: "$125/hr", status: "trial" as const, tags: ["NDA signed"] },
    { name: "BioData Exchange", cat: "Dataset Marketplace", score: 65, sla: 91, cost: "$2.1K/ds", status: "review" as const, tags: ["Evaluation"] },
];

const STATUS_STYLE = {
    active: { bg: "#D1FAE5", color: "#065F46", dot: "#10B981" },
    trial: { bg: "#FEF3C7", color: "#92400E", dot: "#F59E0B" },
    review: { bg: "#DBEAFE", color: "#1D4ED8", dot: "#3B82F6" },
};

export default function SuppliersPage() {
    return (
        <div style={{ padding: "28px 32px 60px", background: "var(--surface)", minHeight: "100vh" }}>
            <div style={{ marginBottom: 26 }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", color: "#4f46e5", marginBottom: 6 }}>M-09 · Partners Network</div>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                    <div>
                        <h1 style={{ fontFamily: "var(--f-display)", fontSize: 32, fontWeight: 900, color: "var(--ink)", margin: 0 }}>
                            Suppliers &amp; <em style={{ color: "#4f46e5", fontStyle: "normal" }}>Partners</em>
                        </h1>
                        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "5px 0 0" }}>AI-scored supplier marketplace · Contracts · SLA monitoring</p>
                    </div>
                    <button style={{ padding: "8px 16px", borderRadius: 9, border: "none", background: "#4f46e5", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Add Supplier</button>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
                {[
                    { label: "Active Suppliers", value: "6", delta: "4 preferred tier" },
                    { label: "Avg AI Score", value: "79.5", delta: "Target ≥75" },
                    { label: "Avg SLA Compliance", value: "95.2%", delta: "1 below threshold" },
                    { label: "Monthly Supplier Spend", value: "$31.4K", delta: "vs $28K budget" },
                ].map((k) => (
                    <div key={k.label} style={{ background: "var(--white)", borderRadius: 14, padding: "18px 20px", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>{k.label}</div>
                        <div style={{ fontFamily: "var(--f-display)", fontSize: 28, fontWeight: 700, color: "var(--teal-dk)", lineHeight: 1 }}>{k.value}</div>
                        <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 5 }}>{k.delta}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
                {SUPPLIERS.map((s) => {
                    const st = STATUS_STYLE[s.status];
                    const scoreColor = s.score >= 85 ? "var(--teal)" : s.score >= 70 ? "var(--amber)" : "var(--rose)";
                    return (
                        <div key={s.name} style={{ background: "var(--white)", borderRadius: 16, border: "1px solid var(--line)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                            <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--line)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{s.name}</div>
                                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{s.cat}</div>
                                    </div>
                                    <span style={{ background: st.bg, color: st.color, borderRadius: 20, padding: "2px 9px", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: st.dot, display: "inline-block" }} />
                                        {s.status}
                                    </span>
                                </div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                    {s.tags.map((t) => (
                                        <span key={t} style={{ background: "var(--blue-lt)", color: "var(--blue)", fontSize: 9.5, fontWeight: 600, padding: "2px 7px", borderRadius: 6 }}>{t}</span>
                                    ))}
                                </div>
                            </div>
                            <div style={{ padding: "14px 20px", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                                <div>
                                    <div style={{ fontSize: 9, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 3 }}>AI Score</div>
                                    <div style={{ fontFamily: "var(--f-display)", fontSize: 22, fontWeight: 700, color: scoreColor }}>{s.score}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 9, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 3 }}>SLA %</div>
                                    <div style={{ fontFamily: "var(--f-display)", fontSize: 22, fontWeight: 700, color: s.sla >= 95 ? "var(--teal-dk)" : "var(--amber)" }}>{s.sla}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 9, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 3 }}>Cost</div>
                                    <div style={{ fontFamily: "var(--f-mono)", fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{s.cost}</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
