"use client";

const CONTROLS = [
    { id: "HIPAA-01", framework: "HIPAA", control: "PHI Data Encryption at Rest", status: "compliant" as const, owner: "CTO", last: "Jun 1", next: "Sep 1", risk: "low" as const },
    { id: "HIPAA-02", framework: "HIPAA", control: "BAA Signed with All Vendors", status: "compliant" as const, owner: "Compliance", last: "May 15", next: "Nov 15", risk: "low" as const },
    { id: "HIPAA-03", framework: "HIPAA", control: "Audit Log — Access Review", status: "expiring" as const, owner: "CTO", last: "Mar 1", next: "Jun 18", risk: "medium" as const },
    { id: "FHIR-01", framework: "FHIR R4", control: "Endpoint Compliance Validation", status: "compliant" as const, owner: "CTO", last: "Jun 8", next: "Sep 8", risk: "low" as const },
    { id: "COF-01", framework: "COFEPRIS", control: "Device Registration — AI Pathology", status: "in_review" as const, owner: "Compliance", last: "Apr 10", next: "Dec 10", risk: "medium" as const },
    { id: "GDPR-01", framework: "GDPR", control: "Data Processing Agreement — EU clients", status: "expiring" as const, owner: "Legal", last: "Dec 2023", next: "Jun 30", risk: "medium" as const },
    { id: "NOM-01", framework: "NOM-024", control: "Clinical Data System Certification", status: "compliant" as const, owner: "Compliance", last: "Jan 15", next: "Jul 15", risk: "low" as const },
    { id: "SEC-01", framework: "Internal", control: "Penetration Test — Annual", status: "gap" as const, owner: "CTO", last: "Jun 2023", next: "Overdue", risk: "high" as const },
];

const STATUS_STYLE = {
    compliant: { bg: "#D1FAE5", color: "#065F46", label: "Compliant" },
    expiring: { bg: "#FEF3C7", color: "#92400E", label: "Expiring Soon" },
    in_review: { bg: "#DBEAFE", color: "#1D4ED8", label: "In Review" },
    gap: { bg: "#FFE4E6", color: "#9F1239", label: "Gap" },
};
const RISK_STYLE = {
    low: { color: "var(--teal)" },
    medium: { color: "var(--amber)" },
    high: { color: "var(--rose)" },
};

export default function ContractsPage() {
    return (
        <div style={{ padding: "28px 32px 60px", background: "var(--surface)", minHeight: "100vh" }}>
            <div style={{ marginBottom: 26 }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", color: "#7c3aed", marginBottom: 6 }}>M-03 · Compliance &amp; Risk</div>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                    <div>
                        <h1 style={{ fontFamily: "var(--f-display)", fontSize: 32, fontWeight: 900, color: "var(--ink)", margin: 0 }}>
                            Compliance &amp; <em style={{ color: "#7c3aed", fontStyle: "normal" }}>Risk Center</em>
                        </h1>
                        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "5px 0 0" }}>HIPAA · COFEPRIS · FHIR R4 · GDPR · NOM-024 · End-to-end auditability</p>
                    </div>
                    <div style={{ background: "var(--rose-lt)", border: "1px solid var(--rose)", borderRadius: 10, padding: "8px 14px", fontSize: 11, fontWeight: 700, color: "var(--rose)" }}>⚠ 3 Controls Expiring in 14 days</div>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
                {[
                    { label: "Overall Compliance", value: "88%", delta: "3 controls expiring", warn: true },
                    { label: "Compliant Controls", value: "5/8", delta: "5 fully passing", warn: false },
                    { label: "High-Risk Gaps", value: "1", delta: "Pen test overdue", warn: true },
                    { label: "Frameworks Active", value: "5", delta: "HIPAA, FHIR, COFEPRIS, GDPR, NOM", warn: false },
                ].map((k) => (
                    <div key={k.label} style={{ background: "var(--white)", borderRadius: 14, padding: "18px 20px", border: `1px solid ${k.warn ? "var(--rose)" : "var(--line)"}`, boxShadow: "var(--shadow-sm)" }}>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>{k.label}</div>
                        <div style={{ fontFamily: "var(--f-display)", fontSize: 28, fontWeight: 700, color: k.warn ? "var(--rose)" : "var(--teal-dk)", lineHeight: 1 }}>{k.value}</div>
                        <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 5 }}>{k.delta}</div>
                    </div>
                ))}
            </div>

            <div style={{ background: "var(--white)", borderRadius: 16, border: "1px solid var(--line)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--line)" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>Compliance Controls Register</div>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ background: "var(--surface)" }}>
                            {["ID", "Framework", "Control Description", "Status", "Owner", "Last Review", "Next Due", "Risk"].map((h) => (
                                <th key={h} style={{ padding: "9px 16px", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", color: "var(--muted)", textAlign: "left" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {CONTROLS.map((c, i) => {
                            const ss = STATUS_STYLE[c.status];
                            const rs = RISK_STYLE[c.risk];
                            return (
                                <tr key={i} style={{ borderTop: "1px solid var(--line)", background: c.status === "gap" ? "#FFF5F5" : undefined }}>
                                    <td style={{ padding: "11px 16px", fontFamily: "var(--f-mono)", fontSize: 10.5, color: "var(--muted)" }}>{c.id}</td>
                                    <td style={{ padding: "11px 16px", fontSize: 11, fontWeight: 600, color: "#7c3aed" }}>{c.framework}</td>
                                    <td style={{ padding: "11px 16px", fontSize: 12, color: "var(--ink)", fontWeight: 500 }}>{c.control}</td>
                                    <td style={{ padding: "11px 16px" }}>
                                        <span style={{ background: ss.bg, color: ss.color, fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 20 }}>{ss.label}</span>
                                    </td>
                                    <td style={{ padding: "11px 16px", fontSize: 12, color: "var(--muted)" }}>{c.owner}</td>
                                    <td style={{ padding: "11px 16px", fontSize: 11, fontFamily: "var(--f-mono)", color: "var(--muted)" }}>{c.last}</td>
                                    <td style={{ padding: "11px 16px", fontSize: 11, fontFamily: "var(--f-mono)", color: c.status === "expiring" || c.status === "gap" ? "var(--rose)" : "var(--muted)", fontWeight: c.status === "expiring" ? 700 : 400 }}>{c.next}</td>
                                    <td style={{ padding: "11px 16px", fontSize: 11, fontWeight: 700, color: rs.color, textTransform: "uppercase" }}>{c.risk}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
