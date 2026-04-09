"use client";

const PORTAL_PROJECTS = [
    { name: "ClinAI NLP Batch", client: "LabCore", progress: 60, pendingApprovals: 0, lastUpdate: "Today", msgs: 1 },
    { name: "FHIR Gateway", client: "Hospita", progress: 72, pendingApprovals: 2, lastUpdate: "Yesterday", msgs: 3 },
    { name: "Pharma Portal", client: "HealthRx", progress: 18, pendingApprovals: 1, lastUpdate: "Jun 10", msgs: 0 },
];

const APPROVALS = [
    { id: "APR-047", project: "FHIR Gateway", type: "Sprint 6 Demo Acceptance", client: "Hospita", due: "Jun 16", days: 2 },
    { id: "APR-048", project: "FHIR Gateway", type: "Risk Register Update — R-009", client: "Hospita", due: "Jun 18", days: 4 },
    { id: "APR-049", project: "Pharma Portal", type: "Sprint 2 Requirements Sign-off", client: "HealthRx", due: "Jun 20", days: 6 },
];

export default function ClientPortalPage() {
    return (
        <div style={{ padding: "28px 32px 60px", background: "var(--surface)", minHeight: "100vh" }}>
            <div style={{ marginBottom: 26 }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", color: "#d97706", marginBottom: 6 }}>M-07 · Client Experience</div>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                    <div>
                        <h1 style={{ fontFamily: "var(--f-display)", fontSize: 32, fontWeight: 900, color: "var(--ink)", margin: 0 }}>
                            Client <em style={{ color: "#d97706", fontStyle: "normal" }}>Portal</em>
                        </h1>
                        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "5px 0 0" }}>Client-facing visibility · Project approvals · Deliverables · Messaging</p>
                    </div>
                    <button style={{ padding: "8px 16px", borderRadius: 9, border: "none", background: "#d97706", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Invite Client</button>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
                {[
                    { label: "Active Client Portals", value: "3", delta: "5 clients total" },
                    { label: "Pending Approvals", value: "3", delta: "2 due this week", warn: true },
                    { label: "Avg Approval Time", value: "2.4 days", delta: "Target ≤ 2 days", warn: true },
                    { label: "Portal NPS", value: "68", delta: "vs 60 target" },
                ].map((k) => (
                    <div key={k.label} style={{ background: "var(--white)", borderRadius: 14, padding: "18px 20px", border: `1px solid ${'warn' in k && k.warn ? "var(--amber)" : "var(--line)"}`, boxShadow: "var(--shadow-sm)" }}>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>{k.label}</div>
                        <div style={{ fontFamily: "var(--f-display)", fontSize: 28, fontWeight: 700, color: 'warn' in k && k.warn ? "var(--amber)" : "#d97706", lineHeight: 1 }}>{k.value}</div>
                        <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 5 }}>{k.delta}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "6fr 4fr", gap: 18 }}>
                {/* Project tiles */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {PORTAL_PROJECTS.map((p) => (
                        <div key={p.name} style={{ background: "var(--white)", borderRadius: 16, border: "1px solid var(--line)", padding: "20px 22px", boxShadow: "var(--shadow-sm)" }}>
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                                <div>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{p.name}</div>
                                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Client: {p.client} · Last update: {p.lastUpdate}</div>
                                </div>
                                <div style={{ display: "flex", gap: 8 }}>
                                    {p.pendingApprovals > 0 && (
                                        <span style={{ background: "var(--amber-lt)", color: "#92400E", fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20 }}>{p.pendingApprovals} APPROVAL{p.pendingApprovals > 1 ? "S" : ""}</span>
                                    )}
                                    {p.msgs > 0 && (
                                        <span style={{ background: "var(--blue-lt)", color: "var(--blue)", fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20 }}>{p.msgs} MSG</span>
                                    )}
                                </div>
                            </div>
                            <div style={{ marginBottom: 6, display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)" }}>
                                <span>Project Progress</span>
                                <span style={{ fontFamily: "var(--f-mono)", fontWeight: 700, color: "var(--ink)" }}>{p.progress}%</span>
                            </div>
                            <div style={{ height: 8, borderRadius: 999, background: "var(--line)", overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${p.progress}%`, background: "#d97706", borderRadius: 999, transition: "width .4s" }} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pending approvals */}
                <div style={{ background: "var(--white)", borderRadius: 16, border: "1px solid var(--line)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                    <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>Pending Approvals</div>
                        <span style={{ background: "var(--amber-lt)", color: "#92400E", borderRadius: 20, padding: "2px 8px", fontSize: 9.5, fontWeight: 700 }}>3 OPEN</span>
                    </div>
                    <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                        {APPROVALS.map((a) => (
                            <div key={a.id} style={{ border: "1px solid var(--amber)", borderRadius: 10, padding: "12px 14px", background: "var(--amber-lt)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                    <span style={{ fontFamily: "var(--f-mono)", fontSize: 9.5, color: "var(--muted)" }}>{a.id}</span>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: a.days <= 2 ? "var(--rose)" : "#92400E" }}>Due in {a.days}d</span>
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 2 }}>{a.type}</div>
                                <div style={{ fontSize: 10.5, color: "var(--muted)" }}>{a.project} · {a.client}</div>
                                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                                    <button style={{ flex: 1, padding: "5px 0", borderRadius: 6, border: "none", background: "var(--teal)", color: "var(--ink)", fontSize: 10.5, fontWeight: 700, cursor: "pointer" }}>Approve</button>
                                    <button style={{ flex: 1, padding: "5px 0", borderRadius: 6, border: "1px solid var(--line)", background: "none", fontSize: 10.5, color: "var(--muted)", cursor: "pointer" }}>Review</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
