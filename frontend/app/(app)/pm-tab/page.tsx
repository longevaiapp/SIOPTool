"use client";

const PROJECTS = [
    { name: "ClinAI NLP Batch", client: "LabCore", health: 88, phase: "Sprint 4 / 8", velocity: 36, blockers: 0, due: "Jul 28", t: "teal" as const },
    { name: "BioMetrics v2", client: "Amatista", health: 62, phase: "Sprint 6 / 10", velocity: 22, blockers: 3, due: "Aug 5", t: "rose" as const },
    { name: "Pharma Portal", client: "HealthRx", health: 77, phase: "Sprint 2 / 12", velocity: 30, blockers: 1, due: "Oct 12", t: "amber" as const },
    { name: "NLP Pipeline Ext.", client: "GenomicsCo", health: 91, phase: "Sprint 1 / 6", velocity: 40, blockers: 0, due: "Aug 18", t: "teal" as const },
    { name: "FHIR Gateway", client: "Hospita", health: 55, phase: "Sprint 7 / 10", velocity: 18, blockers: 3, due: "Jul 14", t: "rose" as const },
];

const ACTIVITY = [
    { project: "BioMetrics v2", actor: "LC", action: "Escalated blocker B-047 to CEO — client API down 18h", ts: "5m ago", t: "rose" as const },
    { project: "ClinAI NLP", actor: "SC", action: "Sprint 4 review completed. 36/40 story points delivered.", ts: "2h ago", t: "teal" as const },
    { project: "Pharma Portal", actor: "AR", action: "Client approval pending — sent reminder to HealthRx PM", ts: "3h ago", t: "amber" as const },
    { project: "FHIR Gateway", actor: "CK", action: "Risk R-009 updated: integration timeline shifted +5 days", ts: "5h ago", t: "rose" as const },
    { project: "GenomicsCo", actor: "MT", action: "Sprint 1 kickoff complete. Backlog groomed. 8 stories ready.", ts: "Yesterday", t: "teal" as const },
];

const STATUS_DOT = { teal: "#10B981", amber: "#F59E0B", rose: "#F43F5E" } as const;

function Ring({ score }: { score: number }) {
    const size = 38; const r = 14; const circ = 2 * Math.PI * r;
    const color = score >= 80 ? "var(--teal)" : score >= 65 ? "var(--amber)" : "var(--rose)";
    return (
        <div style={{ position: "relative", width: size, height: size }}>
            <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={3} />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3}
                    strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)} strokeLinecap="round" />
            </svg>
            <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 700, color, fontFamily: "var(--f-mono)" }}>{score}</span>
        </div>
    );
}

export default function PMTabPage() {
    return (
        <div style={{ padding: "28px 32px 60px", background: "var(--surface)", minHeight: "100vh" }}>
            <div style={{ marginBottom: 26 }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", color: "#ea580c", marginBottom: 6 }}>M-05 · Delivery Engine</div>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                    <div>
                        <h1 style={{ fontFamily: "var(--f-display)", fontSize: 32, fontWeight: 900, color: "var(--ink)", margin: 0 }}>
                            Projects &amp; <em style={{ color: "#ea580c", fontStyle: "normal" }}>Delivery</em>
                        </h1>
                        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "5px 0 0" }}>HealthTech project delivery · Sprint tracking · 5 active projects</p>
                    </div>
                    <button style={{ padding: "8px 16px", borderRadius: 9, border: "none", background: "#ea580c", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ New Project</button>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
                {[
                    { label: "Portfolio Health", value: "74/100", delta: "↓ 8pts Q1→Q2", warn: true },
                    { label: "On-Time Rate", value: "72%", delta: "vs 80% target", warn: true },
                    { label: "Open Blockers", value: "7", delta: "5 P1+P2 escalated", warn: true },
                    { label: "Avg Sprint Velocity", value: "34 pts", delta: "±12% variance", warn: false },
                ].map((k) => (
                    <div key={k.label} style={{ background: "var(--white)", borderRadius: 14, padding: "18px 20px", border: `1px solid ${k.warn ? "var(--amber)" : "var(--line)"}`, boxShadow: "var(--shadow-sm)" }}>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>{k.label}</div>
                        <div style={{ fontFamily: "var(--f-display)", fontSize: 28, fontWeight: 700, color: k.warn ? "var(--amber)" : "var(--teal-dk)", lineHeight: 1 }}>{k.value}</div>
                        <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 5 }}>{k.delta}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "6fr 4fr", gap: 18 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {PROJECTS.map((p) => (
                        <div key={p.name} style={{ background: "var(--white)", borderRadius: 16, border: `1.5px solid ${STATUS_DOT[p.t]}40`, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                            <div style={{ display: "flex", gap: 16, alignItems: "center", padding: "16px 20px" }}>
                                <Ring score={p.health} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3 }}>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{p.name}</span>
                                        <span style={{ fontSize: 10.5, color: "var(--muted)" }}>{p.client}</span>
                                        {p.blockers > 0 && (
                                            <span style={{ background: "var(--rose-lt)", color: "var(--rose)", fontSize: 9.5, fontWeight: 700, padding: "1px 7px", borderRadius: 20, marginLeft: "auto" }}>{p.blockers} BLOCKER{p.blockers > 1 ? "S" : ""}</span>
                                        )}
                                    </div>
                                    <div style={{ display: "flex", gap: 20, fontSize: 11, color: "var(--muted)" }}>
                                        <span>{p.phase}</span>
                                        <span>Velocity: <strong style={{ color: "var(--ink)" }}>{p.velocity} pts</strong></span>
                                        <span>Due: <strong style={{ color: "var(--ink)" }}>{p.due}</strong></span>
                                    </div>
                                </div>
                                <button style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px solid var(--line)", background: "none", fontSize: 11, color: "var(--muted)", cursor: "pointer" }}>Open →</button>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ background: "var(--ink2)", borderRadius: 16, overflow: "hidden" }}>
                    <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--white)" }}>Activity Feed</div>
                    </div>
                    <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                        {ACTIVITY.map((a, i) => (
                            <div key={i} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 10, padding: "10px 12px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: STATUS_DOT[a.t], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "var(--ink)" }}>{a.actor}</div>
                                    <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,.5)" }}>{a.project}</span>
                                    <span style={{ marginLeft: "auto", fontSize: 9.5, color: "rgba(255,255,255,.25)" }}>{a.ts}</span>
                                </div>
                                <p style={{ fontSize: 11, color: "rgba(255,255,255,.45)", margin: 0, lineHeight: 1.5 }}>{a.action}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
