"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { generatePdf, getContractWizardData, type ContractWizardData } from "@/lib/api";
import { useToast } from "@/components/shared/ToastProvider";
import { API_BASE_URL } from "@/lib/api/client";

const CONTRACT_KINDS = new Set(["sow", "contract", "msa", "nda", "baa"]);
export const isContractKind = (k: string) => CONTRACT_KINDS.has(k);

const KIND_LABEL: Record<string, string> = {
    sow:      "Orden de Trabajo (SOW)",
    contract: "Contrato de Prestación de Servicios",
    msa:      "Acuerdo Marco (MSA)",
    nda:      "Acuerdo de Confidencialidad (NDA)",
    baa:      "Business Associate Agreement (BAA)",
};

type ClientForm = {
    legal_name?: string;
    rfc?: string;
    address?: string;
    rep_name?: string;
    rep_role?: string;
    email?: string;
    phone?: string;
};

type DevForm = {
    legal_name?: string;
    commercial_name?: string;
    rfc?: string;
    tax_regime?: string;
    address_street?: string;
    address_zip?: string;
    address_city?: string;
    address_state?: string;
    contact_email?: string;
    contact_phone?: string;
    bank_name?: string;
    bank_account?: string;
    bank_clabe?: string;
    bank_swift?: string;
    jurisdiction_city?: string;
    jurisdiction_state?: string;
};

export function ContractWizardModal({
    contractId,
    kind,
    onClose,
}: {
    contractId: string;
    kind: string;
    onClose: () => void;
}) {
    const { toast } = useToast();
    const [mounted, setMounted] = useState(false);
    const [data, setData] = useState<ContractWizardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState<1 | 2>(1);
    const [submitting, setSubmitting] = useState(false);

    // Step 1: Developer
    const [useStoredDev, setUseStoredDev] = useState(true);
    const [devForm, setDevForm] = useState<DevForm>({});

    // Step 2: Client
    const [clientForm, setClientForm] = useState<ClientForm>({});
    const [finalVersion, setFinalVersion] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        let cancel = false;
        getContractWizardData(contractId)
            .then(d => {
                if (cancel) return;
                setData(d);
                // Pre-fill dev form with stored values (in case user toggles edit)
                setDevForm({
                    legal_name:       d.developer.legal_name,
                    commercial_name:  d.developer.commercial_name,
                    rfc:              d.developer.rfc,
                    tax_regime:       d.developer.tax_regime,
                    address_street:   `${d.developer.address.street} ${d.developer.address.ext_number}`.trim(),
                    address_zip:      d.developer.address.zip,
                    address_city:     d.developer.address.city,
                    address_state:    d.developer.address.state,
                    contact_email:    d.developer.contact.email,
                    contact_phone:    d.developer.contact.phone,
                    bank_name:        d.developer.bank.bank_name,
                    bank_account:     d.developer.bank.account,
                    bank_clabe:       d.developer.bank.clabe,
                    bank_swift:       d.developer.bank.swift,
                    jurisdiction_city:  d.developer.jurisdiction_city,
                    jurisdiction_state: d.developer.jurisdiction_state,
                });
                // Pre-fill client form with defaults from missing-fields hints
                const cf: ClientForm = {
                    legal_name: (d.client.name as string) || "",
                    email:      (d.client.primary_contact_email as string) || "",
                    rep_name:   (d.client.primary_contact_name as string) || "",
                    rep_role:   (d.client.primary_contact_role as string) || "representante legal",
                };
                for (const f of d.missing_client_fields) {
                    if (f.default && !cf[f.key as keyof ClientForm]) {
                        (cf as Record<string, string>)[f.key] = f.default;
                    }
                }
                setClientForm(cf);
            })
            .catch(e => toast({ title: "Error", description: (e as Error).message, variant: "error" }))
            .finally(() => { if (!cancel) setLoading(false); });
        return () => { cancel = true; };
    }, [contractId, toast]);

    const submit = async () => {
        if (!clientForm.legal_name || !clientForm.rfc || !clientForm.address || !clientForm.email) {
            toast({ title: "Campos faltantes", description: "Razón social, RFC, domicilio y correo son obligatorios.", variant: "error" });
            return;
        }
        setSubmitting(true);
        try {
            const overrides: Record<string, unknown> = {
                client: {
                    legal_name: clientForm.legal_name,
                    rfc:        clientForm.rfc,
                    address:    clientForm.address,
                    rep_name:   clientForm.rep_name,
                    rep_role:   clientForm.rep_role,
                    email:      clientForm.email,
                    phone:      clientForm.phone,
                },
                final: finalVersion,
            };
            if (!useStoredDev) {
                overrides.developer = {
                    legal_name:      devForm.legal_name,
                    commercial_name: devForm.commercial_name,
                    rfc:             devForm.rfc,
                    tax_regime:      devForm.tax_regime,
                    address: {
                        street: devForm.address_street,
                        zip:    devForm.address_zip,
                        city:   devForm.address_city,
                        state:  devForm.address_state,
                    },
                    contact: { email: devForm.contact_email, phone: devForm.contact_phone },
                    bank:    {
                        bank_name: devForm.bank_name,
                        account:   devForm.bank_account,
                        clabe:     devForm.bank_clabe,
                        swift:     devForm.bank_swift,
                    },
                    jurisdiction_city:  devForm.jurisdiction_city,
                    jurisdiction_state: devForm.jurisdiction_state,
                };
            }
            const doc = await generatePdf(kind, contractId, overrides);
            toast({
                title: "PDF generado",
                description: `${doc.folio} v${doc.version}`,
                variant: "success",
            });
            window.open(`${API_BASE_URL}/documents/${doc.id}/pdf`, "_blank", "noopener,noreferrer");
            onClose();
        } catch (e) {
            toast({ title: "Error", description: (e as Error).message, variant: "error" });
        } finally {
            setSubmitting(false);
        }
    };

    if (!mounted) return null;

    return createPortal(
        <div
            className="fixed inset-0 flex items-center justify-center bg-black/50 p-4"
            style={{ zIndex: 10000 }}
        >
            <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-black/10 px-6 py-4">
                    <div>
                        <h2 className="text-base font-semibold text-[#1d1d1f]">
                            Generar {KIND_LABEL[kind] ?? "Documento"}
                        </h2>
                        <p className="mt-0.5 text-[12px] text-[#86868b]">
                            Paso {step} de 2 — {step === 1 ? "Datos del Desarrollador" : "Datos del Cliente"}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg px-2 py-1 text-[#86868b] hover:bg-black/[0.04]"
                        aria-label="Cerrar"
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto px-6 py-5">
                    {loading ? (
                        <div className="space-y-3">
                            <div className="h-4 w-3/4 animate-pulse rounded bg-black/[0.06]" />
                            <div className="h-4 w-1/2 animate-pulse rounded bg-black/[0.06]" />
                            <div className="h-4 w-2/3 animate-pulse rounded bg-black/[0.06]" />
                        </div>
                    ) : !data ? (
                        <p className="text-sm text-red-600">No se pudo cargar la información.</p>
                    ) : step === 1 ? (
                        <DeveloperStep
                            data={data}
                            useStored={useStoredDev}
                            setUseStored={setUseStoredDev}
                            form={devForm}
                            setForm={setDevForm}
                        />
                    ) : (
                        <ClientStep
                            form={clientForm}
                            setForm={setClientForm}
                            finalVersion={finalVersion}
                            setFinalVersion={setFinalVersion}
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-2 border-t border-black/10 bg-[#fafafa] px-6 py-3">
                    <button
                        onClick={onClose}
                        className="rounded-lg px-3 py-2 text-[13px] font-semibold text-[#1d1d1f] hover:bg-black/[0.04]"
                    >
                        Cancelar
                    </button>
                    <div className="flex gap-2">
                        {step === 2 && (
                            <button
                                onClick={() => setStep(1)}
                                className="rounded-lg border border-black/10 bg-white px-3 py-2 text-[13px] font-semibold text-[#1d1d1f] hover:bg-black/[0.03]"
                            >
                                ← Atrás
                            </button>
                        )}
                        {step === 1 ? (
                            <button
                                onClick={() => setStep(2)}
                                disabled={loading || !data}
                                className="rounded-lg bg-[#7c3aed] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#6d28d9] disabled:opacity-50"
                            >
                                Continuar →
                            </button>
                        ) : (
                            <button
                                onClick={submit}
                                disabled={submitting}
                                className="rounded-lg bg-[#7c3aed] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#6d28d9] disabled:opacity-50"
                            >
                                {submitting ? "Generando…" : "Generar PDF"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}

// ────────────────────────────── Step 1 ──────────────────────────────
function DeveloperStep({
    data, useStored, setUseStored, form, setForm,
}: {
    data: ContractWizardData;
    useStored: boolean;
    setUseStored: (v: boolean) => void;
    form: DevForm;
    setForm: (f: DevForm) => void;
}) {
    const set = <K extends keyof DevForm>(k: K, v: DevForm[K]) => setForm({ ...form, [k]: v });
    return (
        <div className="space-y-4">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/10 bg-[#f5f5f7] p-3">
                <input
                    type="checkbox"
                    checked={useStored}
                    onChange={e => setUseStored(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#7c3aed]"
                />
                <div className="flex-1">
                    <p className="text-[13px] font-semibold text-[#1d1d1f]">
                        Usar datos guardados del Desarrollador
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#86868b]">
                        {data.developer.legal_name} — {data.developer.commercial_name} —
                        RFC {data.developer.rfc}
                    </p>
                </div>
            </label>

            {useStored ? (
                <div className="space-y-2 rounded-xl border border-black/[0.06] bg-white p-4 text-[12px] text-[#1d1d1f]">
                    <Row label="Razón social"      value={data.developer.legal_name} />
                    <Row label="Nombre comercial"  value={data.developer.commercial_name} />
                    <Row label="RFC"               value={data.developer.rfc} />
                    <Row label="Régimen fiscal"    value={data.developer.tax_regime} />
                    <Row label="Domicilio fiscal"  value={`${data.developer.address.street} ${data.developer.address.ext_number}, Col. ${data.developer.address.neighborhood}, C.P. ${data.developer.address.zip}, ${data.developer.address.city}, ${data.developer.address.state}`} />
                    <Row label="Email notificaciones" value={data.developer.contact.email} />
                    <Row label="Teléfono"          value={data.developer.contact.phone} />
                    <Row label="Banco"             value={`${data.developer.bank.bank_name} — CLABE ${data.developer.bank.clabe}`} />
                    <Row label="Jurisdicción"      value={`${data.developer.jurisdiction_city}, ${data.developer.jurisdiction_state}`} />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Razón social"      value={form.legal_name}      onChange={v => set("legal_name", v)} />
                    <Field label="Nombre comercial"  value={form.commercial_name} onChange={v => set("commercial_name", v)} />
                    <Field label="RFC"               value={form.rfc}             onChange={v => set("rfc", v)} />
                    <Field label="Régimen fiscal"    value={form.tax_regime}      onChange={v => set("tax_regime", v)} />
                    <Field label="Calle y número"    value={form.address_street}  onChange={v => set("address_street", v)} className="sm:col-span-2" />
                    <Field label="C.P."              value={form.address_zip}     onChange={v => set("address_zip", v)} />
                    <Field label="Ciudad"            value={form.address_city}    onChange={v => set("address_city", v)} />
                    <Field label="Estado"            value={form.address_state}   onChange={v => set("address_state", v)} />
                    <Field label="Email"             value={form.contact_email}   onChange={v => set("contact_email", v)} />
                    <Field label="Teléfono"          value={form.contact_phone}   onChange={v => set("contact_phone", v)} />
                    <Field label="Banco"             value={form.bank_name}       onChange={v => set("bank_name", v)} />
                    <Field label="CLABE"             value={form.bank_clabe}      onChange={v => set("bank_clabe", v)} />
                    <Field label="Cuenta"            value={form.bank_account}    onChange={v => set("bank_account", v)} />
                    <Field label="SWIFT"             value={form.bank_swift}      onChange={v => set("bank_swift", v)} />
                    <Field label="Jurisdicción ciudad" value={form.jurisdiction_city}  onChange={v => set("jurisdiction_city", v)} />
                    <Field label="Jurisdicción estado" value={form.jurisdiction_state} onChange={v => set("jurisdiction_state", v)} />
                </div>
            )}
        </div>
    );
}

// ────────────────────────────── Step 2 ──────────────────────────────
function ClientStep({
    form, setForm, finalVersion, setFinalVersion,
}: {
    form: ClientForm;
    setForm: (f: ClientForm) => void;
    finalVersion: boolean;
    setFinalVersion: (v: boolean) => void;
}) {
    const set = <K extends keyof ClientForm>(k: K, v: ClientForm[K]) => setForm({ ...form, [k]: v });
    return (
        <div className="space-y-4">
            <p className="text-[12px] text-[#86868b]">
                Estos datos aparecerán en el contrato. Los marcados con <span className="text-red-600">*</span> son obligatorios.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Razón social del Cliente *" value={form.legal_name} onChange={v => set("legal_name", v)} className="sm:col-span-2" />
                <Field label="RFC *"                       value={form.rfc}        onChange={v => set("rfc", v)} />
                <Field label="Email de notificaciones *"   value={form.email}      onChange={v => set("email", v)} />
                <Field label="Domicilio fiscal completo *" value={form.address}    onChange={v => set("address", v)} className="sm:col-span-2" placeholder="Calle, núm, col, CP, ciudad, estado" />
                <Field label="Nombre del representante legal" value={form.rep_name} onChange={v => set("rep_name", v)} />
                <Field label="Cargo"                          value={form.rep_role} onChange={v => set("rep_role", v)} placeholder="ej. Administrador Único" />
                <Field label="Teléfono"                      value={form.phone}     onChange={v => set("phone", v)} />
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/10 bg-[#f5f5f7] p-3">
                <input
                    type="checkbox"
                    checked={finalVersion}
                    onChange={e => setFinalVersion(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#7c3aed]"
                />
                <div className="flex-1">
                    <p className="text-[13px] font-semibold text-[#1d1d1f]">
                        Generar como versión final (sin marca de BORRADOR)
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#86868b]">
                        Activa esta opción cuando el contrato esté listo para firma. No modifica el estado del expediente.
                    </p>
                </div>
            </label>
        </div>
    );
}

// ────────────────────────────── primitives ──────────────────────────────
function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-start justify-between gap-4 border-b border-black/[0.04] py-1.5 last:border-0">
            <span className="shrink-0 text-[#86868b]">{label}</span>
            <span className="text-right font-medium">{value}</span>
        </div>
    );
}

function Field({
    label, value, onChange, className = "", placeholder,
}: {
    label: string;
    value: string | undefined;
    onChange: (v: string) => void;
    className?: string;
    placeholder?: string;
}) {
    return (
        <label className={`block ${className}`}>
            <span className="mb-1 block text-[11px] font-semibold text-[#86868b]">{label}</span>
            <input
                type="text"
                value={value ?? ""}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-[13px] text-[#1d1d1f] outline-none transition focus:border-[#7c3aed]"
            />
        </label>
    );
}
