"""Hardcoded developer profile (LongevAI / CERO UNO CERO).

Single source of truth for all contract templates, invoices, proposals
and any document where the developer's identity must appear.

Override at runtime via env vars (DEV_PROFILE_*), or per-document via
the `overrides` dict passed to `generate_pdf` / `build_contract`.
"""
from __future__ import annotations

import os
from copy import deepcopy
from typing import Any


# ── Default profile (Luis Alejandro Saucedo Báez — CERO UNO CERO) ──
_DEFAULT_DEVELOPER: dict[str, Any] = {
    # Identidad legal
    "legal_name":      "Luis Alejandro Saucedo Báez",
    "commercial_name": "CERO UNO CERO",
    "person_type":     "PFAE",  # Persona Física con Actividad Empresarial
    "rfc":             "SABL890620JH2",
    "tax_regime":      "612 — Personas Físicas con Actividades Empresariales y Profesionales",
    "id_doc":          "credencial para votar (INE) vigente",

    # Domicilio fiscal
    "address": {
        "street":       "Callejón del Cariño",
        "ext_number":   "17",
        "int_number":   "",
        "neighborhood": "Centro",
        "zip":          "78000",
        "city":         "San Luis Potosí",
        "state":        "San Luis Potosí",
        "country":      "México",
    },

    # Contacto
    "contact": {
        "email":   "alejandro@longevai.com",
        "phone":   "+52 444 700 1387",
        "website": "https://cerounocero.online",
    },

    # Datos bancarios
    "bank": {
        "bank_name": "BBVA México, S.A.",
        "holder":    "Luis Alejandro Saucedo Báez",
        "account":   "1525635271",
        "clabe":     "012700015256352717",
        "swift":     "BCMRMXMMPYM",
        "currency":  "MXN",
    },

    # Jurisdicción / parámetros legales default
    "jurisdiction_city":  "San Luis Potosí",
    "jurisdiction_state": "San Luis Potosí",

    # Parámetros comerciales default
    "payment_schedule":     "50/30/20",   # 50% anticipo, 30% UAT, 20% entrega
    "late_interest_pct_mo": 2.0,
    "warranty_days":        60,
    "confidentiality_yrs":  5,
    "liability_cap_months": 12,

    # Notificaciones legales
    "legal_notices_email": "alejandro@longevai.com",
}


def _env_override(profile: dict[str, Any]) -> dict[str, Any]:
    """Override top-level scalar fields via env vars (DEV_PROFILE_LEGAL_NAME, etc.)."""
    p = deepcopy(profile)
    for k in (
        "legal_name", "commercial_name", "rfc", "tax_regime",
        "jurisdiction_city", "jurisdiction_state",
        "legal_notices_email",
    ):
        env_key = f"DEV_PROFILE_{k.upper()}"
        if os.getenv(env_key):
            p[k] = os.environ[env_key]
    return p


def get_developer_profile() -> dict[str, Any]:
    """Return the active developer profile (default + env overrides)."""
    return _env_override(_DEFAULT_DEVELOPER)


def merge_overrides(base: dict[str, Any], overrides: dict[str, Any] | None) -> dict[str, Any]:
    """Deep-merge user overrides on top of base profile."""
    if not overrides:
        return base
    out = deepcopy(base)
    for k, v in overrides.items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = merge_overrides(out[k], v)
        elif v is not None and v != "":
            out[k] = v
    return out


def format_address(addr: dict[str, Any]) -> str:
    """Single-line formatted address."""
    parts: list[str] = []
    s = (addr.get("street") or "").strip()
    ext = (addr.get("ext_number") or "").strip()
    intn = (addr.get("int_number") or "").strip()
    line1 = " ".join(p for p in [s, f"No. {ext}" if ext else "", f"Int. {intn}" if intn else ""] if p)
    if line1:
        parts.append(line1)
    nb = (addr.get("neighborhood") or "").strip()
    if nb:
        parts.append(f"Col. {nb}")
    z = (addr.get("zip") or "").strip()
    city = (addr.get("city") or "").strip()
    state = (addr.get("state") or "").strip()
    country = (addr.get("country") or "").strip()
    tail = ", ".join(p for p in [
        f"C.P. {z}" if z else "",
        city, state, country,
    ] if p)
    if tail:
        parts.append(tail)
    return ", ".join(parts)


# ── Client profile defaults / required fields ──
CLIENT_FIELDS = [
    ("legal_name",     "Razón social / Nombre legal completo", True),
    ("rfc",            "RFC", True),
    ("tax_regime",     "Régimen fiscal", False),
    ("address",        "Domicilio fiscal", True),
    ("legal_rep",      "Representante legal (nombre y cargo)", False),
    ("contact_email",  "Correo de notificaciones", True),
    ("phone",          "Teléfono", False),
]


def detect_missing_client_fields(client_row: dict[str, Any] | None) -> list[dict[str, Any]]:
    """Given a clients row, list which fields the wizard must collect.

    The `clients` table only stores: name, primary_contact_*, industry, etc.
    Legal fields (RFC, fiscal address, legal rep, etc.) are NOT stored, so
    they will always appear as missing and the wizard collects them per-doc.
    """
    out: list[dict[str, Any]] = []
    if not client_row:
        client_row = {}
    # Legal name: fallback to display name
    if not (client_row.get("legal_name") or client_row.get("name")):
        out.append({"key": "legal_name", "label": "Razón social / Nombre legal", "required": True})
    # RFC — never stored, always missing
    out.append({"key": "rfc", "label": "RFC", "required": True})
    # Fiscal address — never stored, always missing
    out.append({"key": "address", "label": "Domicilio fiscal completo", "required": True})
    # Legal rep — fall back to primary_contact_name
    out.append({
        "key": "rep_name",
        "label": "Nombre del representante legal",
        "required": False,
        "default": client_row.get("primary_contact_name") or "",
    })
    out.append({
        "key": "rep_role",
        "label": "Cargo del representante legal",
        "required": False,
        "default": client_row.get("primary_contact_role") or "representante legal",
    })
    # Email — fallback to primary_contact_email
    if not client_row.get("primary_contact_email"):
        out.append({"key": "email", "label": "Correo de notificaciones", "required": True})
    # Phone (optional, never stored)
    out.append({"key": "phone", "label": "Teléfono", "required": False})
    return out
