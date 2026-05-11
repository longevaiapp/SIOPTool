"""LongevAI Pricing Catalog — fuente única de verdad para cotizaciones.

Filosofía: el LLM SOLO clasifica. Todos los precios y duraciones viven aquí
y se calculan en Python de forma determinística. Mismo input → mismo precio.

Todos los montos son MXN SIN IVA. El IVA 16% se aplica al final.
Días = días hábiles (5 días = 1 semana calendario).
"""
from __future__ import annotations

from typing import Any


# ─── A. TIPOS DE PROYECTO (precio base que ya incluye equipo + duración) ─
PROJECT_TYPES: dict[str, dict[str, Any]] = {
    "landing_simple":      {"label": "Landing simple",          "days": 2,  "price": 5000},
    "sitio_informativo":   {"label": "Sitio informativo",       "days": 5,  "price": 12000},
    "web_app_basica":      {"label": "Web app básica",          "days": 12, "price": 43000},
    "web_app_estandar":    {"label": "Web app estándar",        "days": 22, "price": 80000},
    "web_app_compleja":    {"label": "Web app compleja",        "days": 40, "price": 145000},
    "ecommerce_basico":    {"label": "Ecommerce básico",        "days": 12, "price": 22000},
    "ecommerce_avanzado":  {"label": "Ecommerce avanzado",      "days": 30, "price": 55000},
    "mobile_app_basica":   {"label": "Mobile app básica",       "days": 20, "price": 70000},
    "mobile_app_full":     {"label": "Mobile app full",         "days": 38, "price": 135000},
    "marketplace":         {"label": "Marketplace",             "days": 45, "price": 200000},
    "saas_multitenant":    {"label": "SaaS multi-tenant",       "days": 48, "price": 220000},
    "erp_interno":         {"label": "ERP interno",             "days": 55, "price": 250000},
    "integracion_only":    {"label": "Integración only",        "days": 6,  "price": 22000},
    "data_pipeline":       {"label": "Data pipeline + dashboard","days": 14,"price": 50000},
    "ai_agent_basico":     {"label": "AI agent básico (RAG)",   "days": 12, "price": 43000},
    "ai_agent_avanzado":   {"label": "AI agent avanzado",       "days": 28, "price": 125000},
    "chatbot_whatsapp":    {"label": "Chatbot WhatsApp",        "days": 8,  "price": 29000},
    "lms_cursos":          {"label": "LMS / plataforma cursos", "days": 32, "price": 115000},
    "crm_medida":          {"label": "CRM a la medida",         "days": 30, "price": 110000},
    "pos":                 {"label": "POS punto de venta",      "days": 18, "price": 65000},
}

# ─── B. ADD-ONS (precio fijo que se suma al base) ────────────────────────
ADDONS: dict[str, dict[str, Any]] = {
    "pasarela_pagos":         {"label": "Pasarela de pagos (Stripe/MP/Conekta)", "price": 7000},
    "facturacion_cfdi":       {"label": "Facturación CFDI 4.0",                  "price": 7000},
    "login_social_sso":       {"label": "Login social / SSO",                    "price": 1500},
    "2fa_otp":                {"label": "2FA / OTP",                             "price": 1500},
    "chatbot_wa_embebido":    {"label": "Chatbot WhatsApp embebido",             "price": 7000},
    "push_movil":             {"label": "Notificaciones push móvil",             "price": 2500},
    "email_transaccional":    {"label": "Email transaccional",                   "price": 1500},
    "sms_transaccional":      {"label": "SMS transaccional",                     "price": 1500},
    "export_pdf":             {"label": "Export PDF",                            "price": 2500},
    "export_excel":           {"label": "Export Excel",                          "price": 1500},
    "multi_idioma":           {"label": "Multi-idioma (i18n)",                   "price": 2500},
    "multi_moneda":           {"label": "Multi-moneda",                          "price": 1500},
    "admin_avanzado":         {"label": "Admin avanzado / backoffice",           "price": 11000},
    "carga_masiva_csv":       {"label": "Carga masiva CSV",                      "price": 1500},
    "mapas_geo":              {"label": "Mapas / geolocalización",               "price": 2500},
    "firma_electronica":      {"label": "Firma electrónica",                     "price": 5500},
    "videollamada":           {"label": "Videollamada embebida",                 "price": 7000},
    "app_movil_companion":    {"label": "App móvil companion",                   "price": 36000},
    "pwa_offline":            {"label": "PWA / modo offline",                    "price": 2500},
    "busqueda_avanzada":      {"label": "Búsqueda avanzada (Elastic/Algolia)",   "price": 5500},
    "recomendador_ml":        {"label": "Recomendador ML",                       "price": 18000},
    "ocr_docs":               {"label": "OCR de documentos",                     "price": 7000},
    "gen_documentos":         {"label": "Generación de documentos",              "price": 2500},
    "calendario_agenda":      {"label": "Calendario / agenda",                   "price": 5500},
    "tickets_soporte":        {"label": "Sistema de tickets / helpdesk",         "price": 5500},
    "auditoria_logs":         {"label": "Auditoría / activity logs",             "price": 1500},
    "rbac_granular":          {"label": "RBAC granular",                         "price": 5500},
    "realtime_websockets":    {"label": "Realtime / websockets",                 "price": 5500},
}

# ─── C. INTEGRACIONES EXTERNAS ───────────────────────────────────────────
INTEGRATIONS: dict[str, dict[str, Any]] = {
    "sap":                    {"label": "Integración SAP",                       "price": 65000},
    "odoo_sapb1_netsuite":    {"label": "Integración Odoo / SAP B1 / NetSuite",  "price": 36000},
    "hubspot":                {"label": "Integración HubSpot",                   "price": 11000},
    "salesforce":             {"label": "Integración Salesforce",                "price": 27000},
    "contabilidad_mx":        {"label": "Integración Contpaqi / Aspel / QB",     "price": 14000},
    "marketing_automation":   {"label": "Integración marketing automation",      "price": 4000},
    "analytics":              {"label": "Integración analytics (GA4/Mixpanel)",  "price": 2500},
    "paqueterias":            {"label": "Integración paqueterías (DHL/FedEx)",   "price": 9000},
    "api_gobierno":           {"label": "Integración API gobierno (SAT/IMSS)",   "price": 23000},
    "microsoft365_google":    {"label": "Integración M365 / Google Workspace",   "price": 4000},
    "zapier_make_n8n":        {"label": "Integración Zapier / Make / n8n",       "price": 1500},
    "api_custom_sin_docs":    {"label": "Integración API custom sin docs",       "price": 23000},
}

# ─── D. MULTIPLICADORES (factor sobre subtotal A+B+C) ───────────────────
MULTIPLIERS: dict[str, dict[str, Any]] = {
    "industria_salud":    {"label": "Industria salud (HIPAA/COFEPRIS)",  "factor": 1.25},
    "industria_finanzas": {"label": "Industria finanzas (CNBV/PCI-DSS)", "factor": 1.30},
    "sla_24_7":           {"label": "SLA 24/7",                          "factor": 1.20},
    "migracion_legacy":   {"label": "Migración de datos legacy",         "factor": 1.15},
    "ux_a_la_medida":     {"label": "UX a la medida",                    "factor": 1.15},
    "urgencia":           {"label": "Urgencia (<6 semanas)",             "factor": 1.30},
    "multi_region_ha":    {"label": "Multi-región / HA",                 "factor": 1.20},
    "iso27001_soc2":      {"label": "Cumplimiento ISO27001 / SOC2",      "factor": 1.25},
}

# ─── E. SOPORTE MENSUAL (recurrente) ─────────────────────────────────────
SUPPORT_TIERS: dict[str, dict[str, Any]] = {
    "basico":     {"label": "Soporte tier básico",     "price_month": 3500},
    "estandar":   {"label": "Soporte tier estándar",   "price_month": 9000},
    "premium":    {"label": "Soporte tier premium",    "price_month": 20000},
    "enterprise": {"label": "Soporte tier enterprise", "price_month": 45000},
}

# ─── F. SERVICIOS PROFESIONALES PUNTUALES ────────────────────────────────
PRO_SERVICES: dict[str, dict[str, Any]] = {
    "discovery_workshop":  {"label": "Discovery workshop",      "price": 3500},
    "consultoria_hora":    {"label": "Consultoría por hora",    "price": 500, "unit": "hora"},
    "capacitacion_sesion": {"label": "Capacitación (sesión 2h)","price": 500},
    "auditoria_seguridad": {"label": "Auditoría de seguridad",  "price": 14000},
    "performance_audit":   {"label": "Performance audit",       "price": 7000},
    "ux_research":         {"label": "UX research + report",    "price": 11000},
}

# ─── G. INFRAESTRUCTURA MENSUAL ──────────────────────────────────────────
INFRA: dict[str, dict[str, Any]] = {
    "hosting_basico":     {"label": "Hosting básico (VPS 1-2 vCPU)",  "price_month": 600},
    "hosting_medio":      {"label": "Hosting medio (VPS 4-8 vCPU)",   "price_month": 2500},
    "hosting_enterprise": {"label": "Hosting enterprise (K8s/HA)",    "price_month": 12000},
    "dominio_ssl":        {"label": "Dominio + SSL",                  "price_month": 80},
    "cdn":                {"label": "CDN",                            "price_month": 500},
}

# ─── H. PARÁMETROS GLOBALES ──────────────────────────────────────────────
GLOBALS = {
    "risk_buffer_pct": 15,
    "iva_pct": 16,
    "discount_prepay_pct": 5,    # si anticipo >= 50%
    "valid_days": 30,
}


# ════════════════════════════════════════════════════════════════════════
# CÁLCULO DETERMINÍSTICO
# ════════════════════════════════════════════════════════════════════════

def compute_estimate(classification: dict[str, Any]) -> dict[str, Any]:
    """Toma la clasificación del LLM y produce un objeto `estimate` listo
    para el writer existente (`_create_quote_from_estimate`).

    Estructura de `classification` esperada::

        {
          "project_type": "web_app_basica",
          "addons": ["pasarela_pagos", "login_social_sso"],
          "integrations": ["hubspot"],
          "multipliers": ["urgencia"],
          "support_tier": "estandar" | None,
          "support_months": 12,
          "infra": ["hosting_medio", "dominio_ssl"],
          "infra_months": 12,
          "pro_services": [{"slug": "discovery_workshop", "qty": 1}, ...],
          "scope_summary": "...",
          "deliverables": [...],
          "assumptions": [...],
          "exclusions": [...],
          "complexity_level": "MEDIUM",
          "confidence": "medium",
          "commercial_model": "FIXED_PRICE",
          "deadline_pressure": "NONE",
        }
    """
    cls = classification or {}

    # ── 1. Proyecto base ─────────────────────────────────────────────
    project_slug = cls.get("project_type")
    project = PROJECT_TYPES.get(project_slug) if project_slug else None
    third_party: list[dict[str, Any]] = []
    breakdown_lines: list[str] = []
    days_total = 0

    if project:
        third_party.append({
            "name": f"{project['label']} ({project['days']} días)",
            "amount_mxn": project["price"],
            "notes": f"Proyecto base: {project_slug}",
        })
        breakdown_lines.append(f"Base — {project['label']}: ${project['price']:,} MXN")
        days_total += int(project["days"])
    else:
        breakdown_lines.append("⚠️ Sin tipo de proyecto identificado.")

    # ── 2. Add-ons ───────────────────────────────────────────────────
    for slug in (cls.get("addons") or []):
        a = ADDONS.get(slug)
        if not a:
            continue
        third_party.append({
            "name": f"Add-on: {a['label']}",
            "amount_mxn": a["price"],
            "notes": slug,
        })
        breakdown_lines.append(f"+ Add-on {a['label']}: ${a['price']:,}")

    # ── 3. Integraciones ─────────────────────────────────────────────
    for slug in (cls.get("integrations") or []):
        ig = INTEGRATIONS.get(slug)
        if not ig:
            continue
        third_party.append({
            "name": ig["label"],
            "amount_mxn": ig["price"],
            "notes": f"Integración: {slug}",
        })
        breakdown_lines.append(f"+ {ig['label']}: ${ig['price']:,}")

    # ── 4. Servicios profesionales puntuales ─────────────────────────
    for ps in (cls.get("pro_services") or []):
        slug = ps.get("slug") if isinstance(ps, dict) else ps
        qty = int(ps.get("qty", 1)) if isinstance(ps, dict) else 1
        sv = PRO_SERVICES.get(slug)
        if not sv:
            continue
        amt = int(sv["price"]) * max(1, qty)
        unit = sv.get("unit", "")
        suffix = f" x{qty} {unit}" if qty > 1 or unit else ""
        third_party.append({
            "name": f"{sv['label']}{suffix}",
            "amount_mxn": amt,
            "notes": slug,
        })
        breakdown_lines.append(f"+ {sv['label']}{suffix}: ${amt:,}")

    # ── 5. Subtotal pre-multiplicadores ──────────────────────────────
    base_subtotal = sum(int(it["amount_mxn"]) for it in third_party)

    # ── 6. Multiplicadores (factor compuesto, lo añadido va como línea) ─
    applied_factor = 1.0
    multiplier_labels: list[str] = []
    for slug in (cls.get("multipliers") or []):
        m = MULTIPLIERS.get(slug)
        if not m:
            continue
        applied_factor *= float(m["factor"])
        multiplier_labels.append(f"{m['label']} ×{m['factor']}")

    if applied_factor > 1.0 and base_subtotal > 0:
        added = round(base_subtotal * (applied_factor - 1.0))
        third_party.append({
            "name": f"Ajuste por complejidad ({' · '.join(multiplier_labels)})",
            "amount_mxn": added,
            "notes": f"Factor compuesto ×{round(applied_factor, 3)}",
        })
        breakdown_lines.append(f"× Multiplicadores ({round(applied_factor,3)}x): +${added:,}")

    # ── 7. Infraestructura (recurrente) ──────────────────────────────
    infra_list: list[dict[str, Any]] = []
    infra_months = int(cls.get("infra_months") or 0)
    if infra_months > 0:
        for slug in (cls.get("infra") or []):
            inf = INFRA.get(slug)
            if not inf:
                continue
            infra_list.append({
                "name": inf["label"],
                "monthly_cost_mxn": inf["price_month"],
                "months": infra_months,
                "subtotal_mxn": inf["price_month"] * infra_months,
            })
            breakdown_lines.append(
                f"+ {inf['label']}: ${inf['price_month']:,}/mes × {infra_months}m = ${inf['price_month']*infra_months:,}"
            )

    # ── 8. Soporte mensual (recurrente, va como infra para que el writer lo cobre) ─
    support_slug = cls.get("support_tier")
    support_months = int(cls.get("support_months") or 0)
    if support_slug and support_months > 0:
        st = SUPPORT_TIERS.get(support_slug)
        if st:
            infra_list.append({
                "name": st["label"],
                "monthly_cost_mxn": st["price_month"],
                "months": support_months,
                "subtotal_mxn": st["price_month"] * support_months,
            })
            breakdown_lines.append(
                f"+ {st['label']}: ${st['price_month']:,}/mes × {support_months}m"
            )

    # ── 9. Buffer de riesgo: usa el global; +5 si TIGHT, +10 si UNREALISTIC ─
    buffer = GLOBALS["risk_buffer_pct"]
    pressure = (cls.get("deadline_pressure") or "NONE").upper()
    if pressure == "TIGHT":     buffer += 5
    if pressure == "UNREALISTIC": buffer += 10
    if (cls.get("confidence") or "").lower() == "low":
        buffer += 5
    buffer = min(40, buffer)

    # ── 10. Tier estimado (informativo) ──────────────────────────────
    tier = "MICRO"
    if days_total > 4:   tier = "SMALL"
    if days_total > 15:  tier = "MEDIUM"
    if days_total > 40:  tier = "LARGE"
    if days_total > 100: tier = "ENTERPRISE"

    weeks = max(1, round(days_total / 5))

    pricing_rationale = (
        f"Precio determinístico desde catálogo LongevAI. "
        f"Base {project['label'] if project else 'N/A'} + {len(cls.get('addons') or [])} add-ons "
        f"+ {len(cls.get('integrations') or [])} integraciones"
        + (f" × multiplicadores {round(applied_factor,2)}x" if applied_factor > 1 else "")
        + ". Mismo input → mismo precio."
    )

    estimate = {
        "scope_summary": cls.get("scope_summary") or (project["label"] if project else ""),
        "deliverables": list(cls.get("deliverables") or []),
        "feature_breakdown": [],   # ya no se usa (clasificación, no estimación libre)
        "total_person_weeks": weeks,
        "complexity_level": (cls.get("complexity_level") or "MEDIUM").upper(),
        "complexity_reasoning": " · ".join(multiplier_labels) or "Sin multiplicadores aplicados.",
        "estimated_dev_weeks": weeks,
        "size_tier": tier,
        "deadline_pressure": pressure,
        "deadline_reasoning": cls.get("deadline_reasoning") or "",
        "confidence": (cls.get("confidence") or "medium").lower(),
        "confidence_reasoning": cls.get("confidence_reasoning") or "",
        "team": [],   # vacío: el costo viene de third_party_costs (catálogo plano)
        "infrastructure": infra_list,
        "third_party_costs": third_party,
        "risk_buffer_pct": buffer,
        "subtotal_mxn": 0,   # writer recalcula
        "currency": "MXN",
        "tax_rate_pct": GLOBALS["iva_pct"],
        "valid_days": GLOBALS["valid_days"],
        "assumptions": list(cls.get("assumptions") or []),
        "exclusions": list(cls.get("exclusions") or []),
        "commercial_model": (cls.get("commercial_model") or "FIXED_PRICE").upper(),
        "pricing_rationale": pricing_rationale,
        "breakdown_lines": breakdown_lines,
        "alternative_options": [],
    }
    return estimate


def catalog_block_for_prompt() -> str:
    """Bloque legible que se inyecta al prompt del LLM con TODOS los slugs
    válidos del catálogo. El LLM debe escoger SOLO de esta lista."""
    def fmt(d: dict, key: str) -> str:
        return "\n".join(f"  - {slug}: {info['label']} (${info[key]:,})"
                         for slug, info in d.items())

    return (
        "═══ CATÁLOGO LONGEVAI (usa SOLO estos slugs) ═══\n\n"
        "## A. PROJECT_TYPES (escoge UNO):\n"
        + "\n".join(f"  - {slug}: {info['label']} — {info['days']} días — ${info['price']:,}"
                    for slug, info in PROJECT_TYPES.items())
        + "\n\n## B. ADDONS (lista 0..N):\n" + fmt(ADDONS, "price")
        + "\n\n## C. INTEGRATIONS (lista 0..N):\n" + fmt(INTEGRATIONS, "price")
        + "\n\n## D. MULTIPLIERS (lista 0..N, solo si claramente aplica):\n"
        + "\n".join(f"  - {slug}: {info['label']} (×{info['factor']})"
                    for slug, info in MULTIPLIERS.items())
        + "\n\n## E. SUPPORT_TIER (escoge 0 o 1):\n"
        + "\n".join(f"  - {slug}: {info['label']} (${info['price_month']:,}/mes)"
                    for slug, info in SUPPORT_TIERS.items())
        + "\n\n## G. INFRA (lista 0..N):\n"
        + "\n".join(f"  - {slug}: {info['label']} (${info['price_month']:,}/mes)"
                    for slug, info in INFRA.items())
        + "\n"
    )
