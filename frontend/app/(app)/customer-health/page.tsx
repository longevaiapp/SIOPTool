"use client";

const CLIENTS = [
    { name: "LabCore Diagnostics", tier: "Enterprise", score: 91, nps: 72, arr: "$384K", renewal: "Dec 2026", signals: ["Upsell ready", "High engagement"], t: "teal" as const },
    { name: "Hospita Group", tier: "Enterprise", score: 63, nps: 41, arr: "$504K", renewal: "Aug 2026", signals: ["Delivery delay", "Approval slowdown"], t: "amber" as const },
    { name: "HealthRx Corp", tier: "Mid-Market", score: 78, nps: 58, arr: "$114K", renewal: "Feb 2027", signals: [], t: "teal" as const },
    { name: "Amatista Internal", tier: "Internal", score: 55, nps: 30, arr: "$216K", renewal: "Rolling", signals: ["Budget strained"], t: "rose" as const },
    { name: "GenomicsCo", tier: "Growth", score: 84, nps: 65, arr: "$612K", renewal: "Oct 2026", signals: ["Expansion signal"], t: "teal" as const },
    { name: "CliniFlow", tier: "Mid-Market", score: 76, nps: 52, arr: "$162K", renewal: "Jan 2027", signals: [], t: "teal" as const },
];

type StatusType = "teal" | "amber" | "rose";
const STATUS_DOT: Record<StatusType, string> = { teal: "#10B981", amber: "#F59E0B", rose: "#F43F5E" };

function Ring({ score }: { score: number }) {
    const size = 44; const r = 16; const circ = 2 * Math.PI * r;
    const color = score >= 80 ? "var(--teal)" : score >= 65 ? "var(--amber)" : "var(--rose)";
    return (
        <div style={{ position: "relative", width: size, height: size }}>
            <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={3} />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3}
                    strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)} strokeLinecap="round" />
            </svg>
            <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color, fontFamily: "var(--f-mono)" }}>{score}</span>
        </div>
    );
}

export default function CustomerHealthPage() {
    return (
        <div style={{ padding: "28px 32px 60px", background: "var(--surface)", minHeight: "100vh" }}>
            <div style={{ marginBottom: 26 }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", color: "#e11d48", marginBottom: 6 }}>M-06 · Client Success</div>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                    <div>
                        <h1 style={{ fontFamily: "var(--f-display)", fontSize: 32, fontWeight: 900, color: "var(--ink)", margin: 0 }}>
                            Customer <em style={{ color: "#e11d48", fontStyle: "normal" }}>Health</em>
                        </h1>
                        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "5px 0 0" }}>AI health scoring · NPS tracking · Churn prediction · Upsell signals</p>
                    </div>
                    <button style={{ padding: "8px 16px", borderRadius: 9, border: "none", background: "#e11d48", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✦ AI Health Summary</button>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
                {[
                    { label: "Avg Health Score", value: "74.5", delta: "Target ≥ 80", warn: true },
                    { label: "Portfolio NPS", value: "53", delta: "vs 50 target ↑", warn: false },
                    { label: "Churn Risk", value: "1 client", delta: "Amatista — monitor", warn: true },
                    { label: "Upsell Signals", value: "2", delta: "LabCore + GenomicsCo", warn: false },
                ].map((k) => (
                    <div key={k.label} style={{ background: "var(--white)", borderRadius: 14, padding: "18px 20px", border: `1px solid ${k.warn ? "var(--amber)" : "var(--line)"}`, boxShadow: "var(--shadow-sm)" }}>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>{k.label}</div>
                        <div style={{ fontFamily: "var(--f-display)", fontSize: 28, fontWeight: 700, color: k.warn ? "var(--amber)" : "#e11d48", lineHeight: 1 }}>{k.value}</div>
                        <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 5 }}>{k.delta}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
                {CLIENTS.map((c) => (
                    <div key={c.name} style={{ background: "var(--white)", borderRadius: 16, border: `1.5px solid ${STATUS_DOT[c.t]}40`, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                        <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--line)", display: "flex", gap: 14, alignItems: "flex-start" }}>
                            <Ring score={c.score} />
                            <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{c.name}</span>
                                    <span style={{ background: "var(--surface)", color: "var(--muted)", fontSize: 9.5, fontWeight: 600, padding: "1px 7px", borderRadius: 6, border: "1px solid var(--line)" }}>{c.tier}</span>
                                </div>
                                <div style={{ display: "flex", gap: 16, fontSize: 11, color: "var(--muted)" }}>
                                    <span>NPS: <strong style={{ color: "var(--ink)" }}>{c.nps}</strong></span>
                                    <span>ARR: <strong style={{ color: "var(--teal-dk)" }}>{c.arr}</strong></span>
                                    <span>Renewal: {c.renewal}</span>
                                </div>
                            </div>
                        </div>
                        <div style={{ padding: "12px 20px" }}>
                            {c.signals.length > 0 ? (
                                c.signals.map((sig) => (
                                    <div key={sig} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: sig.includes("Upsell") || sig.includes("Expansion") ? "var(--teal-dk)" : "var(--amber)", marginBottom: 4 }}>
                                        <span style={{ fontSize: 9 }}>{sig.includes("Upsell") || sig.includes("Expansion") ? "🚀" : "⚠"}</span>
                                        {sig}
                                    </div>
                                ))
                            ) : (
                                <span style={{ fontSize: 11, color: "var(--muted)" }}>No active signals</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
