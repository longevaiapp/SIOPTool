"""PDF generation service — pure ReportLab (no system deps).

Generates branded PDFs for all 40 document kinds. Each `build_<kind>`
function constructs a list of flowables; `generate_pdf` is the single
entry point that:
  1. Fetches the source row from the relevant table
  2. Calls the matching builder
  3. Writes the PDF to disk
  4. Upserts a row in `documents` (creates new on first call,
     bumps `version` on subsequent calls).

Files live at:
    {STORAGE_DIR}/pdfs/{workspace_id}/{folio}_v{version}.pdf

Environment:
    PDF_STORAGE_DIR  default: /var/www/sioptool/storage
"""
from __future__ import annotations

import json
import os
import uuid
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from typing import Any, Callable

from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from sqlalchemy import text
from sqlalchemy.orm import Session

from lib.audit import record_audit
from lib.db import SessionLocal


STORAGE_DIR = Path(os.getenv("PDF_STORAGE_DIR", "/var/www/sioptool/storage"))
PDF_DIR = STORAGE_DIR / "pdfs"

# ── Apple-inspired neutrals + tasteful accents ──
BRAND_PRIMARY = colors.HexColor("#0a84ff")
BRAND_DARK    = colors.HexColor("#0b0d12")
BRAND_INK     = colors.HexColor("#1d1d1f")
BRAND_MUTED   = colors.HexColor("#86868b")
BRAND_LINE    = colors.HexColor("#e5e5ea")
BRAND_BG      = colors.HexColor("#f5f5f7")
BRAND_PANEL   = colors.HexColor("#fafafa")
BRAND_GOLD    = colors.HexColor("#b08d57")

# Map kind → accent (frontend module colors)
ACCENTS = {
    "quote":               colors.HexColor("#0a84ff"),
    "supplier_quote":      colors.HexColor("#0a84ff"),
    "proposal":            colors.HexColor("#5e5ce6"),
    "sow":                 colors.HexColor("#5e5ce6"),
    "renewal_proposal":    colors.HexColor("#5e5ce6"),
    "onepager":            colors.HexColor("#5e5ce6"),
    "tech_brief":          colors.HexColor("#5e5ce6"),
    "wbs_estimate":        colors.HexColor("#5e5ce6"),
    "discovery_report":    colors.HexColor("#5e5ce6"),
    "case_study":          colors.HexColor("#5e5ce6"),
    "change_order":        colors.HexColor("#ff6b35"),
    "invoice":             colors.HexColor("#0b0d12"),
    "po":                  colors.HexColor("#0b0d12"),
    "statement":           colors.HexColor("#0b0d12"),
    "contract":            colors.HexColor("#7c3aed"),
    "nda":                 colors.HexColor("#7c3aed"),
    "msa":                 colors.HexColor("#7c3aed"),
    "baa":                 colors.HexColor("#7c3aed"),
    "minute":              colors.HexColor("#475569"),
    "kickoff":             colors.HexColor("#ea580c"),
    "internal_kickoff":    colors.HexColor("#ea580c"),
    "qbr":                 colors.HexColor("#0d9488"),
    "postmortem":          colors.HexColor("#dc2626"),
    "daily_standup":       colors.HexColor("#475569"),
    "acceptance":          colors.HexColor("#16a34a"),
    "pmo_review":          colors.HexColor("#0d9488"),
    "uat_report":          colors.HexColor("#16a34a"),
    "onboarding_pack":     colors.HexColor("#d97706"),
    "sprint_report":       colors.HexColor("#ea580c"),
    "sprint_plan":         colors.HexColor("#ea580c"),
    "sprint_retro":        colors.HexColor("#ea580c"),
    "status_weekly":       colors.HexColor("#2563eb"),
    "risk_register":       colors.HexColor("#dc2626"),
    "compliance_audit":    colors.HexColor("#0d9488"),
    "supplier_evaluation": colors.HexColor("#4f46e5"),
    "health_card":         colors.HexColor("#e11d48"),
    "bug_report":          colors.HexColor("#dc2626"),
    "capacity_plan":       colors.HexColor("#475569"),
    "timesheet":           colors.HexColor("#475569"),
    "siop_weekly":         colors.HexColor("#0891b2"),
}
DEEP = {
    "quote":               colors.HexColor("#0050b8"),
    "supplier_quote":      colors.HexColor("#0050b8"),
    "proposal":            colors.HexColor("#3a32b8"),
    "sow":                 colors.HexColor("#3a32b8"),
    "renewal_proposal":    colors.HexColor("#3a32b8"),
    "onepager":            colors.HexColor("#3a32b8"),
    "tech_brief":          colors.HexColor("#3a32b8"),
    "wbs_estimate":        colors.HexColor("#3a32b8"),
    "discovery_report":    colors.HexColor("#3a32b8"),
    "case_study":          colors.HexColor("#3a32b8"),
    "change_order":        colors.HexColor("#b8400f"),
    "invoice":             colors.HexColor("#000000"),
    "po":                  colors.HexColor("#000000"),
    "statement":           colors.HexColor("#000000"),
    "contract":            colors.HexColor("#4c1d95"),
    "nda":                 colors.HexColor("#4c1d95"),
    "msa":                 colors.HexColor("#4c1d95"),
    "baa":                 colors.HexColor("#4c1d95"),
    "minute":              colors.HexColor("#1e293b"),
    "kickoff":             colors.HexColor("#9a3412"),
    "internal_kickoff":    colors.HexColor("#9a3412"),
    "qbr":                 colors.HexColor("#0f766e"),
    "postmortem":          colors.HexColor("#991b1b"),
    "daily_standup":       colors.HexColor("#1e293b"),
    "acceptance":          colors.HexColor("#15803d"),
    "pmo_review":          colors.HexColor("#0f766e"),
    "uat_report":          colors.HexColor("#15803d"),
    "onboarding_pack":     colors.HexColor("#92400e"),
    "sprint_report":       colors.HexColor("#9a3412"),
    "sprint_plan":         colors.HexColor("#9a3412"),
    "sprint_retro":        colors.HexColor("#9a3412"),
    "status_weekly":       colors.HexColor("#1e40af"),
    "risk_register":       colors.HexColor("#991b1b"),
    "compliance_audit":    colors.HexColor("#0f766e"),
    "supplier_evaluation": colors.HexColor("#3730a3"),
    "health_card":         colors.HexColor("#9f1239"),
    "bug_report":          colors.HexColor("#991b1b"),
    "capacity_plan":       colors.HexColor("#1e293b"),
    "timesheet":           colors.HexColor("#1e293b"),
    "siop_weekly":         colors.HexColor("#0e7490"),
}
KIND_LABEL_ES = {
    "quote":               "Cotización",
    "supplier_quote":      "Cotización de Proveedor",
    "proposal":            "Propuesta",
    "sow":                 "Statement of Work",
    "renewal_proposal":    "Propuesta de Renovación",
    "onepager":            "One-Pager",
    "tech_brief":          "Tech Brief",
    "wbs_estimate":        "WBS y Estimación",
    "discovery_report":    "Reporte de Discovery",
    "case_study":          "Caso de Estudio",
    "change_order":        "Orden de Cambio",
    "invoice":             "Factura",
    "po":                  "Orden de Compra",
    "statement":           "Estado de Cuenta",
    "contract":            "Contrato",
    "nda":                 "NDA",
    "msa":                 "MSA",
    "baa":                 "BAA",
    "minute":              "Minuta",
    "kickoff":             "Kickoff",
    "internal_kickoff":    "Kickoff Interno",
    "qbr":                 "QBR",
    "postmortem":          "Postmortem",
    "daily_standup":       "Daily Standup",
    "acceptance":          "Aceptación",
    "pmo_review":          "Revisión PMO",
    "uat_report":          "Reporte UAT",
    "onboarding_pack":     "Pack de Onboarding",
    "sprint_report":       "Reporte de Sprint",
    "sprint_plan":         "Plan de Sprint",
    "sprint_retro":        "Retrospectiva",
    "status_weekly":       "Reporte Semanal",
    "risk_register":       "Registro de Riesgos",
    "compliance_audit":    "Auditoría de Cumplimiento",
    "supplier_evaluation": "Evaluación de Proveedor",
    "health_card":         "Health Card",
    "bug_report":          "Bug Report",
    "capacity_plan":       "Plan de Capacidad",
    "timesheet":           "Reporte de Horas",
    "siop_weekly":         "SIOP Weekly",
}

# Short prefix used to mint synthetic folios for tables without one
_KIND_PREFIX = {
    "minute": "MIN", "kickoff": "KIK", "internal_kickoff": "IKO",
    "qbr": "QBR", "postmortem": "PMT", "daily_standup": "DST",
    "acceptance": "ACC", "pmo_review": "PMR", "uat_report": "UAT",
    "onboarding_pack": "ONB", "discovery_report": "DSC",
    "contract": "CON", "nda": "NDA", "msa": "MSA", "baa": "BAA",
    "sow": "SOW", "renewal_proposal": "REN", "onepager": "ONE",
    "tech_brief": "TBR", "wbs_estimate": "WBS", "case_study": "CSE",
    "sprint_report": "SPR", "sprint_plan": "SPL", "sprint_retro": "RET",
    "status_weekly": "STW",
    "risk_register": "RSK", "compliance_audit": "AUD",
    "supplier_evaluation": "SUE", "supplier_quote": "SUQ", "po": "PO",
    "health_card": "HLT", "bug_report": "BUG",
    "capacity_plan": "CAP", "timesheet": "TIM", "siop_weekly": "SIO",
    "statement": "STM",
}

# ════════════════════════════════════════════════════════════════════════
# Paragraph styles
# ════════════════════════════════════════════════════════════════════════

_styles = getSampleStyleSheet()
S_DOC_KIND = ParagraphStyle("DocKind", parent=_styles["Normal"],
                            fontName="Helvetica-Bold", fontSize=9,
                            textColor=BRAND_MUTED, leading=12, spaceAfter=4)
S_TITLE = ParagraphStyle("Title", parent=_styles["Title"],
                         fontName="Helvetica-Bold", fontSize=26,
                         textColor=BRAND_DARK, spaceAfter=2, leading=30,
                         alignment=0)
S_SUBTITLE = ParagraphStyle("Subtitle", parent=_styles["Normal"],
                            fontName="Helvetica", fontSize=11,
                            textColor=BRAND_MUTED, spaceAfter=18, leading=15)
S_SECTION = ParagraphStyle("Section", parent=_styles["Heading2"],
                           fontName="Helvetica-Bold", fontSize=11,
                           textColor=BRAND_DARK, spaceBefore=18, spaceAfter=8,
                           leading=14)
S_BODY = ParagraphStyle("Body", parent=_styles["BodyText"],
                        fontName="Helvetica", fontSize=10,
                        textColor=BRAND_INK, leading=15, spaceAfter=4)
S_LABEL = ParagraphStyle("Label", parent=_styles["Normal"],
                         fontName="Helvetica-Bold", fontSize=7,
                         textColor=BRAND_MUTED, leading=9, spaceAfter=2)
S_VALUE = ParagraphStyle("Value", parent=_styles["Normal"],
                         fontName="Helvetica", fontSize=10,
                         textColor=BRAND_DARK, leading=13)
S_VALUE_BOLD = ParagraphStyle("ValueBold", parent=S_VALUE,
                              fontName="Helvetica-Bold")
S_TOTAL_BIG = ParagraphStyle("TotalBig", parent=_styles["Normal"],
                             fontName="Helvetica-Bold", fontSize=20,
                             textColor=BRAND_DARK, alignment=2, leading=24)
S_PILL = ParagraphStyle("Pill", parent=_styles["Normal"],
                        fontName="Helvetica-Bold", fontSize=8,
                        textColor=colors.white, leading=10, alignment=1)


# ════════════════════════════════════════════════════════════════════════
# Helpers
# ════════════════════════════════════════════════════════════════════════

def _money(v: Any, currency: str = "MXN") -> str:
    if v is None:
        return "—"
    try:
        d = Decimal(str(v))
    except Exception:
        return str(v)
    return f"${d:,.2f} {currency}"


def _date(v: Any) -> str:
    if not v:
        return "—"
    if isinstance(v, datetime):
        return v.strftime("%Y-%m-%d")
    if hasattr(v, "isoformat"):
        return v.isoformat()
    return str(v)[:10]


def _esc(v: Any) -> str:
    if v is None:
        return ""
    return (str(v)
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;"))


def _kv_grid(pairs: list[tuple[str, Any]], col_widths=(38 * mm, 127 * mm)) -> Table:
    rows = []
    for label, value in pairs:
        rows.append([
            Paragraph(_esc(label).upper(), S_LABEL),
            Paragraph(_esc(value if (value is not None and value != "") else "—"), S_VALUE),
        ])
    t = Table(rows, colWidths=list(col_widths))
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, BRAND_LINE),
    ]))
    return t


def _section_title(label: str, accent) -> Table:
    """Section heading with a small colored accent bar to its left."""
    cell = Paragraph(f"<b>{_esc(label).upper()}</b>", ParagraphStyle(
        "Sec", fontName="Helvetica-Bold", fontSize=10,
        textColor=BRAND_DARK, leading=12))
    t = Table([["", cell]], colWidths=[3 * mm, 162 * mm], rowHeights=[10])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), accent),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (1, 0), (1, 0), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return t


def _status_pill(status: str, accent) -> Table:
    txt = (status or "DRAFT").upper().replace("_", " ")
    p = Paragraph(_esc(txt), S_PILL)
    t = Table([[p]], colWidths=[max(20 * mm, len(txt) * 2.2 * mm)], rowHeights=[6 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), accent),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
    ]))
    return t


def _from_to_block(client: dict | None, meta_pairs: list[tuple[str, Any]],
                   issuer: dict | None = None) -> Table:
    """Two-column block: emisor (Desarrollador) on the left, cliente + meta on the right."""
    if issuer is None:
        try:
            from lib.developer_profile import get_developer_profile
            issuer = get_developer_profile()
        except Exception:
            issuer = {}
    name_top  = issuer.get("commercial_name") or issuer.get("legal_name") or "Desarrollador"
    name_sub  = (issuer.get("legal_name")
                 if issuer.get("commercial_name") and issuer.get("legal_name")
                    and issuer.get("legal_name") != issuer.get("commercial_name")
                 else (issuer.get("tax_regime") or ""))
    email     = (issuer.get("contact") or {}).get("email") or ""
    website   = (issuer.get("contact") or {}).get("website") or ""
    web_label = website.replace("https://", "").replace("http://", "").strip("/")
    issuer_lines = [
        Paragraph("DE", S_LABEL),
        Paragraph(f"<b>{_esc(name_top)}</b>", S_VALUE_BOLD),
    ]
    if name_sub:
        issuer_lines.append(Paragraph(_esc(name_sub), S_VALUE))
    if email:
        issuer_lines.append(Paragraph(_esc(email), S_VALUE))
    if web_label:
        issuer_lines.append(Paragraph(_esc(web_label), S_VALUE))
    issuer = issuer_lines  # reuse var for downstream Table construction
    cli_lines = [
        Paragraph("PARA", S_LABEL),
        Paragraph(f"<b>{_esc(client['name']) if client else '—'}</b>", S_VALUE_BOLD),
    ]
    if client and client.get("contact_email"):
        cli_lines.append(Paragraph(_esc(client["contact_email"]), S_VALUE))
    cli_lines.append(Spacer(1, 4))
    for label, value in meta_pairs:
        cli_lines.append(Paragraph(
            f"<font color='#86868b'><b>{_esc(label).upper()}</b></font>  "
            f"{_esc(value if (value is not None and value != '') else '—')}",
            ParagraphStyle("meta", fontName="Helvetica", fontSize=9,
                           textColor=BRAND_DARK, leading=13)))

    t = Table([[issuer, cli_lines]], colWidths=[80 * mm, 85 * mm])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("LINEAFTER", (0, 0), (0, 0), 0.4, BRAND_LINE),
        ("LEFTPADDING", (1, 0), (1, 0), 14),
    ]))
    return t


def _totals_panel(rows: list[tuple[str, str]], total_label: str, total_value: str,
                  accent) -> Table:
    """Right-aligned totals stack with a bold final TOTAL row in the accent color."""
    body = []
    for label, value in rows:
        body.append([
            Paragraph(f"<font color='#86868b'>{_esc(label).upper()}</font>",
                      ParagraphStyle("tl", fontName="Helvetica", fontSize=9,
                                     textColor=BRAND_MUTED, alignment=2, leading=12)),
            Paragraph(_esc(value), ParagraphStyle("tv", fontName="Helvetica",
                                                  fontSize=10, textColor=BRAND_DARK,
                                                  alignment=2, leading=13)),
        ])
    body.append([
        Paragraph(f"<b>{_esc(total_label).upper()}</b>",
                  ParagraphStyle("ttl", fontName="Helvetica-Bold", fontSize=11,
                                 textColor=BRAND_DARK, alignment=2, leading=14)),
        Paragraph(f"<b>{_esc(total_value)}</b>",
                  ParagraphStyle("ttv", fontName="Helvetica-Bold", fontSize=16,
                                 textColor=accent, alignment=2, leading=20)),
    ])
    inner = Table(body, colWidths=[40 * mm, 40 * mm])
    style = [
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("LINEABOVE", (0, -1), (-1, -1), 1.2, accent),
        ("TOPPADDING", (0, -1), (-1, -1), 8),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 6),
    ]
    inner.setStyle(TableStyle(style))

    # Wrap in outer 2-col table to right-align the panel
    outer = Table([["", inner]], colWidths=[85 * mm, 80 * mm])
    outer.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return outer


def _make_doc(path: Path, kind: str, *, draft: bool = False,
              folio: str = "", subtitle_right: str = "",
              issuer: dict | None = None) -> BaseDocTemplate:
    accent = ACCENTS.get(kind, BRAND_PRIMARY)
    deep = DEEP.get(kind, BRAND_DARK)
    label_es = KIND_LABEL_ES.get(kind, kind.replace("_", " ").title())
    if issuer is None:
        try:
            from lib.developer_profile import get_developer_profile
            issuer = get_developer_profile()
        except Exception:
            issuer = {}
    brand_name    = issuer.get("commercial_name") or issuer.get("legal_name") or "Desarrollador"
    brand_tagline = (issuer.get("tax_regime") or "PERSONA FÍSICA · DESARROLLO DE SOFTWARE").upper()
    web_url       = (issuer.get("contact") or {}).get("website") or ""
    web_label     = web_url.replace("https://", "").replace("http://", "").strip("/")
    footer_left   = f"{brand_name}  ·  {web_label}  ·  Confidencial" if web_label else f"{brand_name}  ·  Confidencial"
    doc = BaseDocTemplate(
        str(path),
        pagesize=LETTER,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=44 * mm,   # leave room for the dramatic header band
        bottomMargin=24 * mm,
        title=f"{brand_name} · {label_es} · {folio}",
        author=brand_name,
        subject=label_es,
    )

    def header_footer(canvas, _doc):
        canvas.saveState()
        W, H = _doc.pagesize

        # ──── HEADER BAND (32mm tall, gradient-feel via two stacked rects)
        band_h = 32 * mm
        # Deep band
        canvas.setFillColor(deep)
        canvas.rect(0, H - band_h, W, band_h, fill=1, stroke=0)
        # Lighter accent stripe at the top
        canvas.setFillColor(accent)
        canvas.rect(0, H - 6 * mm, W, 6 * mm, fill=1, stroke=0)
        # Subtle decorative circle (top-right) for visual richness
        canvas.setFillColor(accent)
        canvas.setFillAlpha(0.18)
        canvas.circle(W - 28 * mm, H - 22 * mm, 18 * mm, stroke=0, fill=1)
        canvas.setFillAlpha(1.0)

        # Wordmark left
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 16)
        canvas.drawString(20 * mm, H - 18 * mm, brand_name)
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#d1d1d6"))
        canvas.drawString(20 * mm, H - 24 * mm, brand_tagline[:60])

        # Doc kind + folio (right side, big)
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica", 8)
        canvas.drawRightString(W - 20 * mm, H - 14 * mm, label_es.upper())
        canvas.setFont("Helvetica-Bold", 18)
        canvas.drawRightString(W - 20 * mm, H - 24 * mm, folio or "—")
        if subtitle_right:
            canvas.setFont("Helvetica", 8)
            canvas.setFillColor(colors.HexColor("#d1d1d6"))
            canvas.drawRightString(W - 20 * mm, H - 29 * mm, subtitle_right[:60])

        # ──── DRAFT WATERMARK
        if draft:
            canvas.saveState()
            canvas.setFillColor(colors.HexColor("#000000"))
            canvas.setFillAlpha(0.05)
            canvas.setFont("Helvetica-Bold", 130)
            canvas.translate(W / 2, H / 2)
            canvas.rotate(30)
            canvas.drawCentredString(0, 0, "BORRADOR")
            canvas.restoreState()

        # ──── FOOTER
        canvas.setStrokeColor(BRAND_LINE)
        canvas.setLineWidth(0.4)
        canvas.line(20 * mm, 18 * mm, W - 20 * mm, 18 * mm)
        canvas.setFillColor(BRAND_MUTED)
        canvas.setFont("Helvetica", 7.5)
        canvas.drawString(20 * mm, 13 * mm, footer_left)
        canvas.drawCentredString(W / 2, 13 * mm,
                                 datetime.utcnow().strftime("Generado %Y-%m-%d %H:%M UTC"))
        canvas.setFont("Helvetica-Bold", 7.5)
        canvas.setFillColor(BRAND_DARK)
        canvas.drawRightString(W - 20 * mm, 13 * mm, f"Página {_doc.page}")
        canvas.restoreState()

    frame = Frame(doc.leftMargin, doc.bottomMargin,
                  doc.width, doc.height, id="main",
                  leftPadding=0, rightPadding=0,
                  topPadding=0, bottomPadding=0)
    doc.addPageTemplates([PageTemplate(id="default", frames=[frame], onPage=header_footer)])
    return doc


def _hr(color=BRAND_LINE, height=0.5) -> Table:
    t = Table([[""]], colWidths=[170 * mm], rowHeights=[height])
    t.setStyle(TableStyle([("LINEBELOW", (0, 0), (-1, -1), height, color)]))
    return t


# Backwards-compat alias used by builders
S_H2 = S_SECTION


def _md_inline(text: str) -> str:
    """Inline markdown: **bold** and *italic*. Escapes HTML first."""
    import re
    s = _esc(text)
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<i>\1</i>", s)
    return s


def _markdown_paragraphs(md: str | None) -> list:
    """Very lightweight markdown → flowables. Handles ##, -, **bold**, plain text."""
    if not md:
        return [Paragraph("<i>—</i>", S_BODY)]
    out: list = []
    for raw in str(md).splitlines():
        line = raw.rstrip()
        if not line:
            out.append(Spacer(1, 4))
            continue
        if line.startswith("### "):
            out.append(Paragraph(_md_inline(line[4:]), S_H2))
        elif line.startswith("## "):
            out.append(Paragraph(_md_inline(line[3:]), S_H2))
        elif line.startswith("# "):
            out.append(Paragraph(f"<b>{_md_inline(line[2:])}</b>", S_H2))
        elif line.startswith("- ") or line.startswith("* "):
            out.append(Paragraph(f"• {_md_inline(line[2:])}", S_BODY))
        else:
            out.append(Paragraph(_md_inline(line), S_BODY))
    return out


def _fetch_one(db: Session, table: str, row_id: str, workspace_id: str) -> dict[str, Any] | None:
    # workspaces is the tenant root: filter by id only
    if table == "workspaces":
        row = db.execute(
            text("SELECT * FROM workspaces WHERE id = :id AND is_deleted = FALSE"),
            {"id": row_id},
        ).mappings().first()
        if row:
            d = dict(row)
            # Ensure downstream code sees the right workspace_id
            d["workspace_id"] = workspace_id
            return d
        return None
    row = db.execute(
        text(f"SELECT * FROM {table} WHERE id = :id AND workspace_id = :ws AND is_deleted = FALSE"),
        {"id": row_id, "ws": workspace_id},
    ).mappings().first()
    return dict(row) if row else None


def _fetch_client(db: Session, client_id: str | None, workspace_id: str) -> dict[str, Any] | None:
    if not client_id:
        return None
    row = db.execute(
        text("SELECT id, name, primary_contact_email AS contact_email "
             "FROM clients WHERE id = :id AND workspace_id = :ws"),
        {"id": client_id, "ws": workspace_id},
    ).mappings().first()
    return dict(row) if row else None


def _fetch_project(db: Session, project_id: str | None, workspace_id: str) -> dict[str, Any] | None:
    if not project_id:
        return None
    row = db.execute(
        text("SELECT id, name FROM projects WHERE id = :id AND workspace_id = :ws"),
        {"id": project_id, "ws": workspace_id},
    ).mappings().first()
    return dict(row) if row else None


# ════════════════════════════════════════════════════════════════════════
# Builders
# ════════════════════════════════════════════════════════════════════════

def _hero(kind: str, title: str, subtitle: str, status: str | None) -> list:
    """Big document title block right under the header band."""
    accent = ACCENTS.get(kind, BRAND_PRIMARY)
    label_es = KIND_LABEL_ES.get(kind, kind.title())
    out: list = []
    out.append(Paragraph(label_es.upper(), S_DOC_KIND))
    out.append(Paragraph(_esc(title), S_TITLE))
    if subtitle:
        out.append(Paragraph(_esc(subtitle), S_SUBTITLE))
    if status:
        out.append(_status_pill(status, accent))
        out.append(Spacer(1, 8))
    return out


def _items_table(headers: list[str], rows: list[list], col_widths: list[float],
                 accent) -> Table:
    data = [headers] + rows
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        # Header row
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("ALIGN", (0, 0), (-1, 0), "LEFT"),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
        ("LEFTPADDING", (0, 0), (-1, 0), 8),
        ("RIGHTPADDING", (0, 0), (-1, 0), 8),
        # Body
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 9.5),
        ("TEXTCOLOR", (0, 1), (-1, -1), BRAND_DARK),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BRAND_PANEL]),
        ("LINEBELOW", (0, 1), (-1, -1), 0.3, BRAND_LINE),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 8),
        ("TOPPADDING", (0, 1), (-1, -1), 8),
        ("LEFTPADDING", (0, 1), (-1, -1), 8),
        ("RIGHTPADDING", (0, 1), (-1, -1), 8),
        # Right-align numeric cols (last 3)
        ("ALIGN", (-3, 1), (-1, -1), "RIGHT"),
        ("ALIGN", (-3, 0), (-1, 0), "RIGHT"),
    ]))
    return t


def build_quote(db: Session, row: dict[str, Any], kind: str = "quote") -> tuple[str, list]:
    client = _fetch_client(db, row.get("client_id"), row["workspace_id"])
    items = db.execute(
        text("SELECT description, qty, unit, unit_price, amount FROM quote_items "
             "WHERE quote_id = :qid AND is_deleted = FALSE ORDER BY position"),
        {"qid": row["id"]},
    ).mappings().all()

    accent = ACCENTS["quote"]
    cur = row.get("currency") or "MXN"
    title = f"Cotización {row['folio']}"
    status = str(row.get("status", "draft")).upper()
    story: list = []
    story += _hero("quote", title,
                    f"Preparada para {client['name']}" if client else "Propuesta económica",
                    status)

    # From / To meta
    story.append(_from_to_block(client, [
        ("Folio", row["folio"]),
        ("Válida hasta", _date(row.get("valid_until"))),
        ("Moneda", cur),
        ("Emitida", _date(row.get("created_at"))),
    ]))
    story.append(Spacer(1, 22))

    # Items
    if items:
        story.append(_section_title("Conceptos", accent))
        story.append(Spacer(1, 6))
        money_style = ParagraphStyle("m", fontName="Helvetica", fontSize=9.5,
                                     textColor=BRAND_DARK, leading=12, alignment=2)
        body_rows = []
        for it in items:
            qty_str = f"{it.get('qty') or '—'}"
            if it.get("unit"):
                qty_str += f" {it['unit']}"
            body_rows.append([
                Paragraph(_esc(it["description"]),
                          ParagraphStyle("d", fontName="Helvetica", fontSize=9.5,
                                         textColor=BRAND_DARK, leading=13)),
                qty_str,
                Paragraph(_esc(_money(it.get("unit_price"), cur)), money_style),
                Paragraph(_esc(_money(it.get("amount"), cur)), money_style),
            ])
        story.append(_items_table(
            ["DESCRIPCIÓN", "CANT.", "P.U.", "IMPORTE"],
            body_rows,
            [78 * mm, 18 * mm, 38 * mm, 38 * mm],
            accent,
        ))
        story.append(Spacer(1, 14))

    # Totals panel
    tax_rate = row.get("tax_rate") or 0
    story.append(_totals_panel(
        [("Subtotal", _money(row.get("subtotal"), cur)),
         (f"Impuestos ({tax_rate}%)", _money(row.get("tax"), cur))],
        "Total", _money(row.get("total"), cur),
        accent,
    ))

    if row.get("terms"):
        story.append(_section_title("Términos y condiciones", accent))
        story.append(Spacer(1, 4))
        story.append(Paragraph(_esc(row["terms"]), S_BODY))
    if row.get("notes"):
        story.append(_section_title("Notas", accent))
        story.append(Spacer(1, 4))
        story += _markdown_paragraphs(row["notes"])
    return title, story


def build_proposal(db: Session, row: dict[str, Any], kind: str = "proposal") -> tuple[str, list]:
    client = _fetch_client(db, row.get("client_id"), row["workspace_id"])
    project = _fetch_project(db, row.get("project_id"), row["workspace_id"])
    accent = ACCENTS.get(kind, ACCENTS["proposal"])
    label_es = KIND_LABEL_ES.get(kind, "Propuesta")
    title = row.get("title") or label_es
    status = str(row.get("status", "draft")).upper()
    story: list = []
    story += _hero(kind, title,
                    f"Para {client['name']}" if client else label_es,
                    status)

    cur = row.get("currency") or "MXN"
    story.append(_from_to_block(client, [
        ("Folio", row["folio"]),
        ("Proyecto", project["name"] if project else "—"),
        ("Válida hasta", _date(row.get("valid_until"))),
        ("Monto estimado", _money(row.get("estimated_value"), cur)),
    ]))
    story.append(Spacer(1, 22))

    sections = [
        ("Resumen ejecutivo", row.get("executive_summary")),
        ("Alcance", row.get("scope_md")),
        ("Enfoque", row.get("approach_md")),
        ("Timeline", row.get("timeline_md")),
        ("Equipo", row.get("team_md")),
        ("Supuestos", row.get("assumptions_md")),
        ("Términos comerciales", row.get("terms_md")),
    ]
    any_section = False
    for label, body in sections:
        if not body:
            continue
        any_section = True
        story.append(_section_title(label, accent))
        story.append(Spacer(1, 4))
        story += _markdown_paragraphs(body)
    if not any_section:
        story.append(_section_title("Resumen", accent))
        story.append(Spacer(1, 4))
        story.append(Paragraph("<i>Esta propuesta aún no tiene contenido detallado.</i>",
                                S_BODY))
    return title, story


def build_change_order(db: Session, row: dict[str, Any], kind: str = "change_order") -> tuple[str, list]:
    client = _fetch_client(db, row.get("client_id"), row["workspace_id"])
    project = _fetch_project(db, row.get("project_id"), row["workspace_id"])
    accent = ACCENTS["change_order"]
    title = row.get("title") or "Solicitud de cambio"
    status = str(row.get("status", "proposed")).upper()
    delta_days = row.get("timeline_impact_days")
    delta_budget = row.get("budget_impact")
    cur = row.get("currency") or "MXN"
    story: list = []
    story += _hero("change_order", title,
                    f"Para {client['name']}" if client else "Solicitud de cambio",
                    status)

    story.append(_from_to_block(client, [
        ("Folio", row["folio"]),
        ("Proyecto", project["name"] if project else "—"),
        ("Razón", row.get("reason")),
        ("Aprobado", _date(row.get("approved_at"))),
    ]))
    story.append(Spacer(1, 18))

    # Impact summary cards (2 columns)
    impact_time = f"{int(delta_days):+d} días" if delta_days else "Sin impacto"
    impact_money = _money(delta_budget, cur) if delta_budget else "Sin impacto"
    card_style = TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BRAND_PANEL),
        ("BOX", (0, 0), (-1, -1), 0.4, BRAND_LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ])
    big_num = ParagraphStyle("big", fontName="Helvetica-Bold", fontSize=18,
                             textColor=accent, leading=22)
    time_card = Table([[Paragraph("IMPACTO EN TIEMPO", S_LABEL)],
                       [Paragraph(_esc(impact_time), big_num)]],
                      colWidths=[80 * mm])
    time_card.setStyle(card_style)
    money_card = Table([[Paragraph("IMPACTO EN PRESUPUESTO", S_LABEL)],
                        [Paragraph(_esc(impact_money), big_num)]],
                       colWidths=[80 * mm])
    money_card.setStyle(card_style)
    cards = Table([[time_card, "", money_card]],
                  colWidths=[80 * mm, 5 * mm, 80 * mm])
    cards.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(cards)

    if row.get("description"):
        story.append(_section_title("Descripción", accent))
        story.append(Spacer(1, 4))
        story.append(Paragraph(_esc(row["description"]), S_BODY))
    if row.get("scope_impact"):
        story.append(_section_title("Impacto en el alcance", accent))
        story.append(Spacer(1, 4))
        story.append(Paragraph(_esc(row["scope_impact"]), S_BODY))

    # Signature block
    story.append(Spacer(1, 28))
    story.append(_section_title("Aprobaciones", accent))
    story.append(Spacer(1, 16))
    sig = Table([
        ["", ""],
        [Paragraph("<font color='#86868b'><b>POR EL CLIENTE</b></font>",
                   ParagraphStyle("s", fontName="Helvetica", fontSize=8,
                                  textColor=BRAND_MUTED, leading=10)),
         Paragraph("<font color='#86868b'><b>POR LONGEVAI</b></font>",
                   ParagraphStyle("s", fontName="Helvetica", fontSize=8,
                                  textColor=BRAND_MUTED, leading=10))],
    ], colWidths=[80 * mm, 80 * mm], rowHeights=[16 * mm, 8 * mm])
    sig.setStyle(TableStyle([
        ("LINEABOVE", (0, 1), (0, 1), 0.6, BRAND_DARK),
        ("LINEABOVE", (1, 1), (1, 1), 0.6, BRAND_DARK),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(sig)
    return title, story


def build_invoice(db: Session, row: dict[str, Any], kind: str = "invoice") -> tuple[str, list]:
    client = _fetch_client(db, row.get("client_id"), row["workspace_id"])
    project = _fetch_project(db, row.get("project_id"), row["workspace_id"])
    folio = row.get("folio") or row.get("number") or row["id"]
    cur = row.get("currency") or "MXN"
    accent = ACCENTS["invoice"]
    status = str(row.get("status", "DRAFT")).upper()
    title = f"Factura {folio}"
    story: list = []
    story += _hero("invoice", title,
                    f"Para {client['name']}" if client else "Factura",
                    status)

    story.append(_from_to_block(client, [
        ("Folio", folio),
        ("Proyecto", project["name"] if project else "—"),
        ("Emisión", _date(row.get("issue_date"))),
        ("Vencimiento", _date(row.get("due_date"))),
        ("Moneda", cur),
    ]))
    story.append(Spacer(1, 24))

    # AMOUNT DUE — hero panel
    amount = row.get("amount")
    panel = Table(
        [[
            Paragraph("<font color='#86868b'><b>MONTO A PAGAR</b></font>",
                      ParagraphStyle("al", fontName="Helvetica", fontSize=8,
                                     textColor=BRAND_MUTED, leading=12)),
        ], [
            Paragraph(f"<b>{_money(amount, cur)}</b>",
                      ParagraphStyle("av", fontName="Helvetica-Bold", fontSize=32,
                                     textColor=BRAND_DARK, leading=36)),
        ], [
            Paragraph(
                f"<font color='#86868b'>Vence el {_date(row.get('due_date'))}</font>",
                ParagraphStyle("ad", fontName="Helvetica", fontSize=9,
                               textColor=BRAND_MUTED, leading=12)),
        ]],
        colWidths=[165 * mm],
    )
    panel.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BRAND_PANEL),
        ("LINEABOVE", (0, 0), (-1, 0), 2, accent),
        ("LEFTPADDING", (0, 0), (-1, -1), 18),
        ("RIGHTPADDING", (0, 0), (-1, -1), 18),
        ("TOPPADDING", (0, 0), (0, 0), 14),
        ("BOTTOMPADDING", (0, 0), (0, 0), 0),
        ("TOPPADDING", (0, 1), (0, 1), 0),
        ("BOTTOMPADDING", (0, 1), (0, 1), 0),
        ("TOPPADDING", (0, 2), (0, 2), 4),
        ("BOTTOMPADDING", (0, 2), (0, 2), 14),
    ]))
    story.append(panel)
    story.append(Spacer(1, 14))

    # Payment instructions placeholder + notes
    story.append(_section_title("Instrucciones de pago", accent))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "Por favor realice el pago antes de la fecha de vencimiento. "
        "Referéncia: <b>" + _esc(folio) + "</b>. "
        "Para cualquier aclaración contacte a <b>billing@longevai.health</b>.",
        S_BODY))

    if row.get("notes"):
        story.append(_section_title("Notas", accent))
        story.append(Spacer(1, 4))
        story.append(Paragraph(_esc(row["notes"]), S_BODY))
    return title, story


# ════════════════════════════════════════════════════════════════════════
# Additional builders — meeting, contract, sprint, project status,
# risk register, compliance audit, supplier, capacity, bug report.
# ════════════════════════════════════════════════════════════════════════

def _meta_pairs_meeting(row: dict[str, Any]) -> list[tuple[str, Any]]:
    pairs = [
        ("Tipo", str(row.get("meeting_type") or "—").replace("_", " ").title()),
        ("Fecha", _date(row.get("scheduled_at"))),
    ]
    dur = row.get("duration_minutes")
    if dur:
        pairs.append(("Duración", f"{dur} min"))
    pairs.append(("Estado", str(row.get("status") or "—").upper()))
    return pairs


def build_meeting_doc(db: Session, row: dict[str, Any], kind: str = "minute") -> tuple[str, list]:
    """Generic builder for any meeting-derived document.

    Used for: minute, kickoff, qbr, postmortem, internal_kickoff,
    daily_standup, discovery_report, acceptance, pmo_review, uat_report.
    """
    accent = ACCENTS.get(kind, BRAND_PRIMARY)
    label_es = KIND_LABEL_ES.get(kind, "Minuta")
    client = _fetch_client(db, row.get("client_id"), row["workspace_id"])
    project = _fetch_project(db, row.get("project_id"), row["workspace_id"])
    title = row.get("title") or label_es
    status = str(row.get("status") or "ANALYZED").upper()
    story: list = []
    story += _hero(kind, title,
                    f"{label_es} · {_date(row.get('scheduled_at'))}",
                    status)

    meta = _meta_pairs_meeting(row)
    if project:
        meta.insert(2, ("Proyecto", project["name"]))
    story.append(_from_to_block(client, meta))
    story.append(Spacer(1, 18))

    # Participants
    participants = row.get("participants")
    if participants:
        try:
            plist = json.loads(participants) if isinstance(participants, str) else participants
        except Exception:
            plist = []
        if plist:
            story.append(_section_title("Participantes", accent))
            story.append(Spacer(1, 4))
            names = []
            for p in plist[:20]:
                if isinstance(p, dict):
                    nm = p.get("name") or p.get("email") or "—"
                    role = p.get("role") or p.get("title")
                    names.append(f"<b>{_esc(nm)}</b>" + (f" · <font color='#86868b'>{_esc(role)}</font>" if role else ""))
                else:
                    names.append(f"<b>{_esc(str(p))}</b>")
            story.append(Paragraph(" &nbsp;·&nbsp; ".join(names), S_BODY))

    # Action items linked to this meeting
    actions = db.execute(
        text("SELECT text AS title, assignee_name, due_date, accepted, priority "
             "FROM action_items "
             "WHERE meeting_id = :mid AND is_deleted = FALSE ORDER BY due_date"),
        {"mid": row["id"]},
    ).mappings().all()
    if actions:
        story.append(_section_title("Acuerdos y compromisos", accent))
        story.append(Spacer(1, 4))
        body_rows = []
        for a in actions:
            body_rows.append([
                Paragraph(_esc(a["title"]),
                          ParagraphStyle("d", fontName="Helvetica", fontSize=9.5,
                                         textColor=BRAND_DARK, leading=13)),
                str(a.get("priority") or "—").upper(),
                _date(a.get("due_date")),
                "ACEPTADO" if a.get("accepted") else "PENDIENTE",
            ])
        story.append(_items_table(
            ["COMPROMISO", "PRIORIDAD", "VENCE", "ESTADO"],
            body_rows,
            [85 * mm, 25 * mm, 25 * mm, 30 * mm],
            accent,
        ))

    # Notes
    if row.get("notes"):
        story.append(_section_title("Notas", accent))
        story.append(Spacer(1, 4))
        story += _markdown_paragraphs(row["notes"])

    # AI outputs (if any) — show short summary
    ai_outs = row.get("ai_outputs")
    if ai_outs:
        try:
            data = json.loads(ai_outs) if isinstance(ai_outs, str) else ai_outs
        except Exception:
            data = None
        if isinstance(data, dict):
            summary = data.get("summary") or data.get("executive_summary")
            if summary:
                story.append(_section_title("Resumen ejecutivo (IA)", accent))
                story.append(Spacer(1, 4))
                story.append(Paragraph(_esc(str(summary)[:1200]), S_BODY))

    if not actions and not row.get("notes") and not participants:
        story.append(_section_title("Contenido", accent))
        story.append(Spacer(1, 4))
        story.append(Paragraph("<i>Esta minuta aún no tiene contenido detallado.</i>", S_BODY))

    return title, story


def _fetch_quote_for_contract(db: Session, contract_row: dict) -> dict | None:
    """Locate the source quote for a contract: prefer folio in notes, fallback to deal_id."""
    notes = contract_row.get("notes") or ""
    ws = contract_row["workspace_id"]
    # Try folio match (e.g. "QUO-2026-0001")
    import re as _re
    m = _re.search(r"\b(QUO-\d{4}-\d{4,})\b", notes)
    if m:
        r = db.execute(
            text("SELECT id, folio, subtotal, tax, total, currency, terms, notes "
                 "FROM quotes WHERE folio = :f AND workspace_id = :ws "
                 "AND is_deleted = FALSE LIMIT 1"),
            {"f": m.group(1), "ws": ws},
        ).mappings().first()
        if r:
            return dict(r)
    # Fallback: same deal_id, latest accepted/sent
    if contract_row.get("deal_id"):
        r = db.execute(
            text("SELECT id, folio, subtotal, tax, total, currency, terms, notes "
                 "FROM quotes WHERE deal_id = :d AND workspace_id = :ws "
                 "AND is_deleted = FALSE ORDER BY created_at DESC LIMIT 1"),
            {"d": contract_row["deal_id"], "ws": ws},
        ).mappings().first()
        if r:
            return dict(r)
    return None


def _fetch_quote_items(db: Session, quote_id: str) -> list[dict]:
    rows = db.execute(
        text("SELECT description, qty, unit, unit_price, amount "
             "FROM quote_items WHERE quote_id = :q ORDER BY created_at ASC"),
        {"q": quote_id},
    ).mappings().all()
    return [dict(r) for r in rows]


_S_CLAUSE_H = ParagraphStyle(
    "clauseH", fontName="Helvetica-Bold", fontSize=11,
    textColor=colors.HexColor("#1d1d1f"), leading=14, spaceBefore=10, spaceAfter=4,
)
_S_CLAUSE_BODY = ParagraphStyle(
    "clauseB", fontName="Helvetica", fontSize=9.5,
    textColor=colors.HexColor("#1d1d1f"), leading=13.5, spaceAfter=4,
    alignment=4,  # justify
)
_S_RECITAL = ParagraphStyle(
    "rec", fontName="Helvetica-Oblique", fontSize=9.5,
    textColor=colors.HexColor("#3a3a3c"), leading=13.5, spaceAfter=3,
    alignment=4,
)


def _clauses(items: list[tuple[str, str]]) -> list:
    """items: list of (heading, body_html). Returns flowables."""
    out: list = []
    for i, (h, body) in enumerate(items, 1):
        out.append(Paragraph(f"<b>{_esc(f'{i}.')} {_esc(h.upper())}</b>", _S_CLAUSE_H))
        # split body on \n\n into paragraphs
        for para in body.strip().split("\n\n"):
            para = para.strip()
            if not para:
                continue
            out.append(Paragraph(para, _S_CLAUSE_BODY))
    return out


def _legal_clauses(kind: str, ctx: dict) -> list[tuple[str, str]]:
    """Build the clausulado list for each contract kind.

    Heavy "abogado mexicano litigante" style: definiciones formales en
    cláusula primera, sub-incisos romanos, fundamentos legales explícitos
    (CCF, LFDA, Cód. de Comercio, LFPDPPP, CFPC), redacción defensiva.

    ctx keys (all strings unless noted):
      client_name, client_legal_name, client_rfc, client_address,
      client_rep_name, client_rep_role, client_email, client_phone,
      dev_legal_name, dev_commercial_name, dev_rfc, dev_tax_regime,
      dev_address, dev_email, dev_phone, dev_id_doc,
      bank_name, bank_clabe, bank_account, bank_holder, bank_swift,
      value_str, currency, signed_date_str, expiry_date_str,
      scope_md, hipaa (bool), project_name, place,
      payment_schedule, late_pct_mo, warranty_days,
      confidentiality_yrs, liability_cap_months,
    """
    cn          = ctx.get("client_name") or "el Cliente"
    cln         = ctx.get("client_legal_name") or cn
    crfc        = ctx.get("client_rfc") or "[RFC pendiente]"
    cadd        = ctx.get("client_address") or "[domicilio pendiente]"
    crep        = ctx.get("client_rep_name") or "su representante legal"
    crep_role   = ctx.get("client_rep_role") or "representante legal"
    cemail      = ctx.get("client_email") or "el correo registrado"
    cphone      = ctx.get("client_phone") or "—"

    devl        = ctx.get("dev_legal_name") or "Luis Alejandro Saucedo Báez"
    devc        = ctx.get("dev_commercial_name") or "CERO UNO CERO"
    devrfc      = ctx.get("dev_rfc") or "SABL890620JH2"
    devreg      = ctx.get("dev_tax_regime") or "612 Personas Físicas con Actividades Empresariales y Profesionales"
    devadd      = ctx.get("dev_address") or "Callejón del Cariño No. 17, Col. Centro, C.P. 78000, San Luis Potosí, San Luis Potosí, México"
    devemail    = ctx.get("dev_email") or "alejandro@longevai.com"
    devphone    = ctx.get("dev_phone") or "+52 444 700 1387"
    dev_idd     = ctx.get("dev_id_doc") or "credencial para votar (INE) vigente"

    bank_name   = ctx.get("bank_name") or "BBVA México, S.A."
    bank_clabe  = ctx.get("bank_clabe") or "012700015256352717"
    bank_acct   = ctx.get("bank_account") or "1525635271"
    bank_holder = ctx.get("bank_holder") or devl
    bank_swift  = ctx.get("bank_swift") or "BCMRMXMMPYM"

    val         = ctx.get("value_str") or "[contraprestación pendiente]"
    cur         = ctx.get("currency") or "MXN"
    proj        = ctx.get("project_name") or "el proyecto descrito en el Anexo A"
    scope       = ctx.get("scope_md") or "Conforme al Anexo A — Alcance del Proyecto."
    place       = ctx.get("place") or "San Luis Potosí, S.L.P."
    sched       = ctx.get("payment_schedule") or "50/30/20"
    late_pct    = ctx.get("late_pct_mo") or 2.0
    warr_d      = ctx.get("warranty_days") or 60
    conf_yrs    = ctx.get("confidentiality_yrs") or 5
    cap_m       = ctx.get("liability_cap_months") or 12

    # Esquema de pago en texto
    sched_lines: list[str] = []
    if sched == "50/30/20":
        sched_lines = [
            "i) <b>50% (cincuenta por ciento)</b> del precio total, en concepto de anticipo, "
            "exigible y pagadero a la firma del presente instrumento, contra la emisión del "
            "Comprobante Fiscal Digital por Internet (CFDI) correspondiente;",
            "ii) <b>30% (treinta por ciento)</b> del precio total, exigible al momento en que "
            "el Desarrollador entregue al Cliente la versión funcional del software para "
            "pruebas de aceptación del usuario (UAT), contra la emisión del CFDI respectivo;",
            "iii) <b>20% (veinte por ciento)</b> del precio total, exigible contra la firma "
            "del Acta de Aceptación Final y la puesta en producción de los entregables, "
            "contra la emisión del CFDI respectivo.",
        ]
    elif sched == "100":
        sched_lines = [
            "i) <b>100% (cien por ciento)</b> del precio total, exigible y pagadero a la "
            "firma del presente instrumento, contra la emisión del CFDI correspondiente.",
        ]
    else:
        sched_lines = [f"i) Conforme al esquema convenido por las partes: <b>{_esc(sched)}</b>."]

    pay_block = "<br/>".join(sched_lines)

    # ── Declaraciones (comunes a todos los contratos sustantivos) ──
    decl_dev = (
        f"<b>I. DECLARA EL DESARROLLADOR, por conducto de quien al calce firma, que:</b><br/>"
        f"<b>I.1.</b> Es una persona física con actividad empresarial, de nacionalidad "
        f"mexicana, en pleno ejercicio de sus derechos, denominado <b>{_esc(devl)}</b>, quien "
        f"opera comercialmente bajo la denominación <b>«{_esc(devc)}»</b>.<br/>"
        f"<b>I.2.</b> Cuenta con Registro Federal de Contribuyentes <b>{_esc(devrfc)}</b>, "
        f"tributando bajo el régimen fiscal {_esc(devreg)}, conforme a la Ley del Impuesto "
        f"sobre la Renta y demás disposiciones fiscales aplicables.<br/>"
        f"<b>I.3.</b> Se identifica con {_esc(dev_idd)}, documento que tuvo a la vista la "
        f"contraparte y del cual se anexa copia simple al presente instrumento para constancia.<br/>"
        f"<b>I.4.</b> Tiene su domicilio fiscal y convencional para todos los efectos del "
        f"presente contrato en {_esc(devadd)}, mismo que señala como propio para oír y recibir "
        f"toda clase de notificaciones, así como el correo electrónico {_esc(devemail)} y el "
        f"teléfono {_esc(devphone)}.<br/>"
        f"<b>I.5.</b> Cuenta con la capacidad técnica, profesional, material y humana, así como "
        f"con la experiencia y los recursos necesarios para prestar los servicios objeto del "
        f"presente instrumento, manifestando bajo protesta de decir verdad que no se encuentra "
        f"impedido legal ni contractualmente para celebrarlo.<br/>"
        f"<b>I.6.</b> Es titular originario de los derechos patrimoniales y morales de autor "
        f"sobre las herramientas, librerías, <i>frameworks</i>, metodologías, plantillas, "
        f"código preexistente y, en general, sobre la <b>Tecnología Preexistente del "
        f"Desarrollador</b> que utilizará en la prestación de los servicios."
    )
    decl_cli = (
        f"<b>II. DECLARA EL CLIENTE, por conducto de quien al calce firma, que:</b><br/>"
        f"<b>II.1.</b> Es <b>{_esc(cln)}</b>, con Registro Federal de Contribuyentes "
        f"<b>{_esc(crfc)}</b>, con domicilio fiscal en {_esc(cadd)}, y con capacidad legal "
        f"suficiente para obligarse en los términos del presente instrumento.<br/>"
        f"<b>II.2.</b> Comparece a la celebración del presente contrato por conducto de "
        f"<b>{_esc(crep)}</b>, en su carácter de <b>{_esc(crep_role)}</b>, quien manifiesta "
        f"bajo protesta de decir verdad que las facultades con las que actúa no le han sido "
        f"revocadas, modificadas ni limitadas en forma alguna a la fecha de la firma.<br/>"
        f"<b>II.3.</b> Conoce, ha evaluado y aceptado libremente el alcance, los entregables, "
        f"el plazo y la contraprestación que se documentan en el presente instrumento y en su "
        f"Anexo A, los cuales derivan de la cotización aceptada por el Cliente, manifestando "
        f"que cuenta con los recursos económicos suficientes para cumplir las obligaciones de "
        f"pago aquí contraídas.<br/>"
        f"<b>II.4.</b> Para todos los efectos del presente instrumento, señala como su "
        f"domicilio convencional el indicado en el numeral II.1, y como medio idóneo de "
        f"notificación electrónica el correo {_esc(cemail)} y el teléfono {_esc(cphone)}."
    )
    decl_amb = (
        f"<b>III. DECLARAN AMBAS PARTES que:</b><br/>"
        f"<b>III.1.</b> Reconocen mutuamente la personalidad y capacidad jurídica con la que "
        f"comparecen, así como la veracidad y exactitud de las declaraciones que anteceden.<br/>"
        f"<b>III.2.</b> Es su libre voluntad celebrar el presente instrumento, sin que medie "
        f"vicio del consentimiento alguno (error, dolo, mala fe, lesión o violencia), en "
        f"términos de los artículos 1812, 1813, 1815, 1816, 1819, 1820 y demás relativos del "
        f"Código Civil Federal y sus correlativos en los códigos civiles de las entidades "
        f"federativas.<br/>"
        f"<b>III.3.</b> Convienen en sujetarse al tenor de las siguientes:"
    )

    if kind in ("sow", "contract"):
        return [
            ("Declaraciones",
             decl_dev + "<br/><br/>" + decl_cli + "<br/><br/>" + decl_amb),

            ("Definiciones",
             f"Para todos los efectos del presente contrato, los términos siguientes tendrán "
             f"el significado que a cada uno se atribuye, indistintamente en singular o plural, "
             f"masculino o femenino:<br/>"
             f"<b>i) «Contrato»:</b> el presente instrumento, sus Anexos y las órdenes de "
             f"cambio que en su caso lo modifiquen.<br/>"
             f"<b>ii) «Servicios»:</b> los servicios profesionales de análisis, arquitectura, "
             f"diseño, desarrollo, integración, pruebas, despliegue y, en su caso, soporte "
             f"que el Desarrollador prestará al Cliente conforme al Anexo A.<br/>"
             f"<b>iii) «Entregables»:</b> los productos, código objeto, código fuente, "
             f"documentación, configuraciones y demás bienes o información que el "
             f"Desarrollador deba poner a disposición del Cliente conforme al Anexo A.<br/>"
             f"<b>iv) «Tecnología Preexistente del Desarrollador»:</b> el conjunto de obras, "
             f"código, librerías, <i>frameworks</i>, plantillas, herramientas, metodologías y, "
             f"en general, todo elemento de propiedad intelectual creado por el Desarrollador "
             f"con anterioridad a, o de manera independiente respecto de, la ejecución del "
             f"presente Contrato.<br/>"
             f"<b>v) «Software del Proyecto»:</b> el resultado integral derivado de la "
             f"prestación de los Servicios, incluyendo todo código, configuración, "
             f"documentación y artefactos generados específicamente para el Cliente bajo el "
             f"presente Contrato.<br/>"
             f"<b>vi) «UAT»:</b> las pruebas de aceptación del usuario que realizará el "
             f"Cliente sobre los Entregables.<br/>"
             f"<b>vii) «Acta de Aceptación Final»:</b> el documento que firmen ambas Partes "
             f"haciendo constar la conformidad del Cliente respecto de los Entregables y la "
             f"conclusión sustancial del Proyecto.<br/>"
             f"<b>viii) «CFDI»:</b> el Comprobante Fiscal Digital por Internet emitido en "
             f"términos del Código Fiscal de la Federación y la Resolución Miscelánea Fiscal "
             f"vigente."),

            ("Objeto",
             f"<b>PRIMERA.</b> El Desarrollador se obliga a prestar al Cliente, y éste a su "
             f"vez se obliga a recibir y a pagar al Desarrollador, los Servicios "
             f"profesionales de desarrollo de software a la medida descritos en el presente "
             f"Contrato y en su Anexo A, relativos al proyecto denominado "
             f"<b>«{_esc(proj)}»</b> (el «<b>Proyecto</b>»).<br/><br/>"
             f"El presente Contrato se rige por lo aquí estipulado y, en lo no previsto, "
             f"supletoriamente por el Código Civil Federal (artículos 1792, 1793, 1796, "
             f"1832 a 1859, y 2606 a 2615 relativos a la prestación de servicios "
             f"profesionales), por el Código de Comercio (artículo 75, fracciones V, XI y "
             f"XXV) y por la Ley Federal del Derecho de Autor en lo relativo a los programas "
             f"de cómputo (artículos 101 a 114)."),

            ("Alcance, entregables y exclusiones",
             f"<b>SEGUNDA.</b> El alcance del Proyecto es <b>cerrado, taxativo y limitativo</b>, "
             f"y comprende única y exclusivamente los conceptos descritos en el Anexo A. "
             f"Cualquier requerimiento, modificación, ampliación, sustitución o reorientación "
             f"funcional o técnica que las Partes acuerden con posterioridad a la firma "
             f"deberá documentarse mediante una <i>Orden de Cambio</i> firmada por ambas "
             f"Partes, la cual podrá generar ajustes razonables al precio, plazo y/o alcance.<br/><br/>"
             f"Salvo pacto expreso en contrario contenido en el Anexo A, el Servicio "
             f"<b>NO</b> incluye:<br/>"
             f"i) la adquisición, configuración o pago de licencias de software o servicios "
             f"de terceros;<br/>"
             f"ii) la migración masiva de datos provenientes de sistemas legados;<br/>"
             f"iii) la operación, hospedaje, monitoreo, soporte o mantenimiento posteriores "
             f"a la fecha del Acta de Aceptación Final;<br/>"
             f"iv) la generación de contenidos editoriales, traducciones, fotografías, "
             f"diseños gráficos no funcionales o capacitación a usuarios finales;<br/>"
             f"v) cualquier desarrollo, integración o soporte sobre componentes o módulos no "
             f"listados expresamente en el Anexo A.<br/><br/>"
             f"<b>Descripción del alcance contratado:</b><br/>{scope}"),

            ("Plazo de ejecución",
             f"<b>TERCERA.</b> El Desarrollador iniciará la ejecución de los Servicios dentro "
             f"de los <b>5 (cinco) días hábiles</b> siguientes a aquél en que se actualice "
             f"<b>la última</b> de las siguientes condiciones: (i) firma del presente Contrato; "
             f"(ii) recepción del anticipo a que se refiere la cláusula QUINTA; y (iii) "
             f"entrega completa por el Cliente de la información, accesos, credenciales y "
             f"materiales necesarios para iniciar los trabajos.<br/><br/>"
             f"El plazo estimado de ejecución es el indicado en el Anexo A y se computará en "
             f"<b>días hábiles</b>, considerándose inhábiles los sábados, domingos y los días "
             f"señalados como festivos en el artículo 74 de la Ley Federal del Trabajo. Dicho "
             f"plazo se prorrogará automáticamente, sin necesidad de declaración judicial, "
             f"por: a) retrasos imputables al Cliente; b) Órdenes de Cambio aprobadas; c) "
             f"caso fortuito o fuerza mayor; o d) actos de autoridad. El Desarrollador "
             f"notificará por escrito tales prórrogas dentro de los 3 días hábiles siguientes "
             f"a su acaecimiento."),

            ("Contraprestación",
             f"<b>CUARTA.</b> Como contraprestación única, total y suficiente por los "
             f"Servicios, el Cliente pagará al Desarrollador la cantidad de <b>{val}</b> "
             f"({_esc(cur)}), <b>más</b> el Impuesto al Valor Agregado conforme a la tasa "
             f"aplicable y, en su caso, las retenciones fiscales que en derecho procedan.<br/><br/>"
             f"Dicha cantidad incluye la totalidad de los conceptos previstos en el Anexo A "
             f"salvo aquellos expresamente señalados como excluidos. Salvo pacto en contrario "
             f"y por escrito, el precio aquí pactado es <b>fijo</b> durante toda la vigencia "
             f"del Contrato y no estará sujeto a ajustes por inflación, tipo de cambio, "
             f"variación de costos del Desarrollador o cualquier otra causa."),

            ("Forma y condiciones de pago",
             f"<b>QUINTA.</b> El Cliente pagará la contraprestación mediante <b>transferencia "
             f"electrónica de fondos</b> a la siguiente cuenta del Desarrollador:<br/>"
             f"<b>Beneficiario:</b> {_esc(bank_holder)}<br/>"
             f"<b>Banco:</b> {_esc(bank_name)}<br/>"
             f"<b>Cuenta:</b> {_esc(bank_acct)} &nbsp;·&nbsp; <b>CLABE:</b> {_esc(bank_clabe)}<br/>"
             f"<b>SWIFT/BIC:</b> {_esc(bank_swift)}<br/><br/>"
             f"El pago se efectuará conforme al siguiente esquema:<br/>"
             f"{pay_block}<br/><br/>"
             f"Cada parcialidad será exigible al actualizarse el supuesto que la condiciona y "
             f"deberá ser cubierta dentro de los <b>5 (cinco) días hábiles</b> siguientes a "
             f"la fecha de emisión del CFDI correspondiente. La falta de pago oportuno "
             f"causará intereses moratorios a razón del <b>{late_pct}% mensual</b> sobre "
             f"saldos insolutos, sin necesidad de requerimiento previo, computados desde la "
             f"fecha de exigibilidad y hasta su total liquidación. La mora superior a 15 "
             f"(quince) días naturales facultará al Desarrollador, a su sola discreción y sin "
             f"responsabilidad alguna a su cargo, a (i) suspender la prestación de los "
             f"Servicios, (ii) retener los Entregables aún no entregados, y (iii) rescindir "
             f"el Contrato conforme a lo dispuesto por el artículo 1949 del Código Civil "
             f"Federal."),

            ("Propiedad intelectual y licencia de uso",
             f"<b>SEXTA.</b> Las Partes reconocen y aceptan expresamente que, en términos de "
             f"los artículos 11, 12, 13 fracción XI, 18, 19, 20, 21, 24, 83, 84, 101, 102, "
             f"103, 104, 105, 106, 107, 108, 110, 111, 112, 113 y 114 de la Ley Federal del "
             f"Derecho de Autor (LFDA), <b>la titularidad originaria y derivada de los "
             f"derechos patrimoniales y morales de autor sobre el Software del Proyecto, su "
             f"código fuente, código objeto, arquitectura, modelos de datos, scripts, "
             f"componentes, librerías, herramientas, <i>frameworks</i> y, en general, sobre "
             f"toda la Tecnología Preexistente del Desarrollador, corresponde y permanecerá "
             f"en todo momento, de manera plena y exclusiva, al Desarrollador</b>.<br/><br/>"
             f"<b>I. Negativa expresa de cesión.</b> El presente Contrato <b>no constituye "
             f"cesión de derechos patrimoniales</b> de autor en términos del artículo 30 de "
             f"la LFDA, ni transmisión a título alguno de la titularidad sobre el Software "
             f"del Proyecto. Toda interpretación en contrario será nula de pleno derecho.<br/>"
             f"<b>II. Otorgamiento de licencia.</b> Sujeto al pago íntegro y puntual de la "
             f"contraprestación, el Desarrollador otorga al Cliente una <b>licencia de uso "
             f"amplia, perpetua, no exclusiva, intransferible, no sublicenciable e indivisible</b>, "
             f"limitada al territorio mexicano (con extensión razonable a las jurisdicciones "
             f"donde el Cliente opere directamente), exclusivamente para los fines internos y "
             f"operativos propios del Cliente. La licencia comprenderá las facultades de:<br/>"
             f"&nbsp;&nbsp;<b>i)</b> instalar, ejecutar y utilizar el Software del Proyecto en la "
             f"infraestructura propia del Cliente;<br/>"
             f"&nbsp;&nbsp;<b>ii)</b> realizar respaldos con fines exclusivos de continuidad operativa;<br/>"
             f"&nbsp;&nbsp;<b>iii)</b> permitir el uso del software por empleados, contratistas y "
             f"usuarios finales propios del Cliente, siempre bajo la responsabilidad de éste.<br/>"
             f"<b>III. Restricciones y prohibiciones expresas.</b> Sin la autorización previa, "
             f"expresa y por escrito del Desarrollador, queda <b>terminantemente prohibido</b> "
             f"al Cliente y a cualquier tercero por su conducto:<br/>"
             f"&nbsp;&nbsp;a) la <b>comercialización, reventa, arrendamiento, sublicenciamiento, "
             f"licenciamiento cruzado, distribución, donación o cesión a cualquier título</b>, "
             f"oneroso o gratuito, del Software del Proyecto, su código fuente, su código objeto "
             f"o cualquier parte del mismo;<br/>"
             f"&nbsp;&nbsp;b) la <b>oferta del Software del Proyecto como servicio (SaaS)</b> a "
             f"terceros distintos del Cliente, ni en forma directa ni a través de marca propia "
             f"o ajena;<br/>"
             f"&nbsp;&nbsp;c) la <b>ingeniería inversa, descompilación, desensamble, traducción "
             f"o modificación</b> del código por sí o por interpósita persona, salvo en los "
             f"casos limitados expresamente permitidos por la LFDA;<br/>"
             f"&nbsp;&nbsp;d) la <b>creación de obras derivadas</b> con fines distintos al uso "
             f"interno del Cliente o con propósito comercial frente a terceros.<br/>"
             f"<b>IV. Consecuencias del incumplimiento.</b> El incumplimiento de cualquiera de "
             f"las restricciones anteriores constituirá una violación grave a este Contrato y "
             f"facultará al Desarrollador, sin perjuicio de otros derechos: (i) a rescindirlo "
             f"de pleno derecho conforme al artículo 1949 del Código Civil Federal; (ii) a "
             f"reclamar la pena convencional prevista en la cláusula DÉCIMA OCTAVA; (iii) a "
             f"ejercer las acciones civiles, mercantiles, administrativas y penales aplicables, "
             f"incluyendo las previstas en los artículos 215, 216, 216 bis, 231 y 232 de la "
             f"LFDA y 424 bis del Código Penal Federal; y (iv) a solicitar las medidas "
             f"precautorias que estime pertinentes ante autoridad judicial o administrativa."),

            ("Entrega del código fuente y depósito",
             f"<b>SÉPTIMA.</b> Concluido el Proyecto, firmada el Acta de Aceptación Final y "
             f"pagada íntegramente la contraprestación, el Desarrollador pondrá a disposición "
             f"del Cliente, mediante un repositorio privado de código fuente, una copia del "
             f"Software del Proyecto y de la documentación técnica esencial, exclusivamente "
             f"para los fines de la licencia otorgada en la cláusula SEXTA. La entrega del "
             f"código fuente <b>no constituye, en ningún caso, cesión de derechos patrimoniales "
             f"ni transmisión de titularidad alguna</b>, y se realiza bajo las restricciones "
             f"de uso previstas en este instrumento. El Cliente se obliga a mantener dicho "
             f"código bajo medidas razonables de seguridad y a no permitir el acceso al mismo "
             f"a personas distintas de su personal autorizado."),

            ("Garantía limitada",
             f"<b>OCTAVA.</b> El Desarrollador garantiza que los Entregables operarán "
             f"sustancialmente conforme a las especificaciones del Anexo A durante un plazo "
             f"de <b>{warr_d} ({_esc(str(warr_d))}) días naturales</b> contados a partir de la "
             f"firma del Acta de Aceptación Final. Durante dicho plazo, el Desarrollador "
             f"corregirá sin costo los defectos de funcionamiento reproducibles que sean "
             f"reportados por escrito por el Cliente.<br/><br/>"
             f"La garantía <b>no cubre</b>: (i) fallas derivadas del uso indebido, "
             f"modificación, intervención o manipulación de los Entregables por el Cliente o "
             f"por terceros; (ii) requerimientos no incluidos en el alcance contratado; (iii) "
             f"fallas atribuibles a software, servicios, infraestructura o redes de terceros; "
             f"(iv) fallas resultantes de la falta de aplicación de actualizaciones razonables "
             f"recomendadas por el Desarrollador. El Desarrollador no otorga ninguna garantía "
             f"distinta de la aquí prevista, ya sea expresa o implícita, incluyendo cualquier "
             f"garantía de comerciabilidad, idoneidad para un fin particular o no infracción."),

            ("Confidencialidad",
             f"<b>NOVENA.</b> Cada Parte se obliga a mantener bajo estricta confidencialidad "
             f"toda la información técnica, comercial, financiera, operativa, contractual, "
             f"legal, de clientes y de usuarios de la otra a la que tenga acceso con motivo "
             f"del presente Contrato (la «<b>Información Confidencial</b>»), durante toda la "
             f"vigencia de éste y por un plazo adicional de <b>{conf_yrs} ({_esc(str(conf_yrs))}) "
             f"años</b> contados a partir de su terminación, por cualquier causa.<br/><br/>"
             f"La Información Confidencial únicamente podrá ser utilizada para el cumplimiento "
             f"del presente Contrato y sólo podrá ser revelada al personal de la Parte "
             f"receptora que estrictamente la requiera y que esté sujeto a obligaciones de "
             f"confidencialidad equivalentes. La violación a esta cláusula generará "
             f"responsabilidad civil, mercantil, administrativa y, en su caso, penal, conforme "
             f"a la legislación aplicable, incluyendo la Ley Federal de Protección a la "
             f"Propiedad Industrial (LFPPI) en lo relativo a secretos industriales."),

            ("Tratamiento de datos personales",
             f"<b>DÉCIMA.</b> En la medida en que la prestación de los Servicios implique "
             f"el tratamiento de datos personales por cuenta del Cliente, el Desarrollador "
             f"actuará en su carácter de <b>encargado del tratamiento</b>, en términos de los "
             f"artículos 49, 50 y 51 de la Ley Federal de Protección de Datos Personales en "
             f"Posesión de los Particulares (LFPDPPP), su Reglamento y los Lineamientos del "
             f"Aviso de Privacidad. El Cliente, en su carácter de <b>responsable</b>, se "
             f"obliga a contar con los avisos de privacidad y consentimientos necesarios y a "
             f"cumplir con todas las obligaciones que la legislación aplicable le impone como "
             f"tal, eximiendo y manteniendo en paz y a salvo al Desarrollador de cualquier "
             f"reclamación derivada de su incumplimiento."),

            ("Limitación de responsabilidad",
             f"<b>DÉCIMA PRIMERA.</b> Sin perjuicio de las obligaciones de pago a cargo del "
             f"Cliente y del régimen de propiedad intelectual previsto en la cláusula SEXTA, "
             f"la responsabilidad total, directa, acumulada y agregada del Desarrollador "
             f"frente al Cliente, por cualquier causa relacionada con el presente Contrato "
             f"(incluyendo cualquier reclamación contractual, extracontractual, por dolo, "
             f"culpa, negligencia o cualquier otra), se limita expresamente a la "
             f"contraprestación efectivamente cobrada por el Desarrollador en los "
             f"<b>{cap_m} ({_esc(str(cap_m))}) meses</b> inmediatos anteriores al hecho que "
             f"origine la reclamación.<br/><br/>"
             f"En ningún caso el Desarrollador responderá por <b>daños indirectos, mediatos, "
             f"incidentales, especiales, punitivos o ejemplares</b>, ni por <b>lucro cesante, "
             f"pérdida de utilidades, pérdida de datos, pérdida de oportunidades de negocio, "
             f"pérdida de reputación o gastos de cobertura</b>, aun cuando hubiere sido "
             f"advertido de la posibilidad de su ocurrencia."),

            ("Caso fortuito y fuerza mayor",
             f"<b>DÉCIMA SEGUNDA.</b> Ninguna de las Partes será responsable por el "
             f"incumplimiento de obligaciones a su cargo cuando éste derive de caso fortuito "
             f"o fuerza mayor, en términos de los artículos 1847, 2017 fracción V, 2018 y "
             f"2111 del Código Civil Federal. Se considerarán supuestos de fuerza mayor, sin "
             f"limitación: actos u órdenes de autoridad, declaratorias de emergencia "
             f"sanitaria, fallas masivas de internet, ciberataques de gran escala fuera del "
             f"control razonable de la Parte afectada, conflictos armados, catástrofes "
             f"naturales, huelgas generales y suspensiones de servicios públicos. La Parte "
             f"afectada deberá notificar a la otra dentro de los 5 (cinco) días hábiles "
             f"siguientes al hecho. Si el evento se prolonga por más de 60 días, cualquiera "
             f"de las Partes podrá dar por terminado el Contrato sin responsabilidad."),

            ("Rescisión y terminación",
             f"<b>DÉCIMA TERCERA.</b> El presente Contrato podrá darse por terminado:<br/>"
             f"<b>i) De común acuerdo</b>, mediante convenio firmado por ambas Partes;<br/>"
             f"<b>ii) Por rescisión</b>, de pleno derecho y sin necesidad de declaración "
             f"judicial, en términos del artículo 1949 del Código Civil Federal, por "
             f"incumplimiento grave a cualquiera de las obligaciones aquí pactadas, no "
             f"subsanado dentro de los <b>15 (quince) días naturales</b> siguientes a la "
             f"notificación que la Parte cumplida haga a la incumplida;<br/>"
             f"<b>iii) Por concurso mercantil</b>, suspensión de pagos, insolvencia, "
             f"liquidación o disolución de cualquiera de las Partes;<br/>"
             f"<b>iv) Por imposibilidad sobrevenida</b> de cumplir el objeto del Contrato.<br/><br/>"
             f"La terminación, por cualquier causa, no liberará al Cliente de la obligación "
             f"de pagar al Desarrollador la totalidad de los Servicios efectivamente "
             f"prestados a la fecha de terminación, ni de los gastos comprometidos no "
             f"recuperables, ni le otorgará derecho a reclamar reembolso alguno por las "
             f"cantidades ya pagadas."),

            ("Pena convencional",
             f"<b>DÉCIMA CUARTA.</b> Las Partes pactan, en términos del artículo 1840 del "
             f"Código Civil Federal, una <b>pena convencional</b> a cargo de la Parte "
             f"incumplida y a favor de la Parte cumplida, equivalente al <b>20% (veinte por "
             f"ciento)</b> del valor total del Contrato, en caso de: (i) incumplimiento de "
             f"las restricciones de propiedad intelectual previstas en la cláusula SEXTA; "
             f"(ii) violación a la obligación de confidencialidad; (iii) cesión no "
             f"autorizada del Contrato; o (iv) cualquier otro incumplimiento grave que las "
             f"Partes califiquen como tal. La pena se causará con independencia de los daños "
             f"y perjuicios adicionales que la Parte cumplida pueda reclamar."),

            ("Notificaciones y domicilios convencionales",
             f"<b>DÉCIMA QUINTA.</b> Todas las notificaciones, comunicaciones o "
             f"requerimientos derivados del presente Contrato deberán realizarse por escrito "
             f"y dirigirse a los domicilios señalados en las declaraciones, o bien a los "
             f"correos electrónicos: el Cliente en {_esc(cemail)}; el Desarrollador en "
             f"{_esc(devemail)}. Las notificaciones electrónicas surtirán efectos al día "
             f"hábil siguiente a aquél en que se acuse recibo o se confirme su entrega "
             f"electrónica, en términos de los artículos 89 a 114 del Código de Comercio. "
             f"Cualquier cambio de domicilio o correo de notificaciones deberá comunicarse "
             f"a la contraparte con al menos 10 (diez) días naturales de anticipación; en "
             f"caso contrario, las notificaciones realizadas a los domicilios o correos "
             f"originalmente señalados surtirán plenos efectos legales."),

            ("Independencia de las Partes y relación laboral",
             f"<b>DÉCIMA SEXTA.</b> Las Partes son contratantes <b>independientes</b>. Nada "
             f"en el presente Contrato podrá interpretarse como la creación de una relación "
             f"laboral, sociedad, asociación en participación, agencia, mandato o "
             f"representación entre ellas. Cada Parte es y se considerará única responsable "
             f"de su personal, debiendo cubrir por su propia cuenta sus salarios, "
             f"prestaciones, cuotas obrero-patronales (IMSS, INFONAVIT, SAR), impuestos, "
             f"así como cualquier otra obligación laboral, fiscal o de seguridad social que "
             f"a ella corresponda, eximiendo y manteniendo en paz y a salvo a la otra "
             f"Parte de cualquier reclamación al respecto."),

            ("Cesión de derechos y subcontratación",
             f"<b>DÉCIMA SÉPTIMA.</b> El Cliente <b>no podrá ceder, transmitir, gravar ni de "
             f"manera alguna disponer</b> de los derechos y obligaciones derivados del "
             f"presente Contrato, en todo o en parte, sin el consentimiento previo, expreso y "
             f"por escrito del Desarrollador. El Desarrollador podrá subcontratar la totalidad "
             f"o parte de los Servicios, manteniéndose como único responsable directo frente "
             f"al Cliente del cumplimiento de las obligaciones aquí pactadas."),

            ("Encabezados, totalidad del acuerdo y modificaciones",
             f"<b>DÉCIMA OCTAVA.</b> Los encabezados de las cláusulas del presente Contrato "
             f"se incluyen únicamente con fines de referencia y no afectan su interpretación. "
             f"Este Contrato y sus Anexos constituyen el <b>acuerdo único, total e integral</b> "
             f"entre las Partes respecto del Proyecto y dejan sin efecto cualquier "
             f"comunicación, propuesta, cotización, presentación o acuerdo previo, verbal o "
             f"escrito, entre ellas. Cualquier modificación al presente Contrato deberá "
             f"constar por escrito y ser firmada por ambas Partes para surtir efectos. La "
             f"invalidez o ineficacia de alguna cláusula no afectará la validez de las "
             f"restantes, las cuales conservarán plena fuerza obligatoria."),

            ("Jurisdicción y legislación aplicable",
             f"<b>DÉCIMA NOVENA.</b> Para todo lo relativo a la interpretación, ejecución, "
             f"cumplimiento y, en su caso, controversia derivada del presente Contrato, las "
             f"Partes se someten expresamente a la legislación federal mexicana aplicable "
             f"y a la jurisdicción y competencia de los <b>Tribunales competentes con "
             f"residencia en {_esc(place)}</b>, renunciando expresamente a cualquier otro "
             f"fuero que pudiera corresponderles por razón de su domicilio actual o futuro o "
             f"por cualquier otra causa."),
        ]

    if kind == "msa":
        return [
            ("Declaraciones",
             decl_dev + "<br/><br/>" + decl_cli + "<br/><br/>" + decl_amb),

            ("Definiciones",
             f"<b>i) «MSA»:</b> el presente Acuerdo Marco de Prestación de Servicios.<br/>"
             f"<b>ii) «SOW» u «Orden de Trabajo»:</b> cada documento que las Partes celebren "
             f"para encargar un proyecto específico bajo este MSA, conteniendo cuando menos "
             f"objeto, alcance, plazo, contraprestación y forma de pago.<br/>"
             f"<b>iii) «Servicios»:</b> los servicios profesionales de desarrollo de software, "
             f"consultoría tecnológica e implementación que el Desarrollador preste al Cliente "
             f"bajo cada SOW.<br/>"
             f"<b>iv) «Tecnología Preexistente del Desarrollador», «Software del Proyecto», "
             f"«Información Confidencial» y «CFDI»:</b> tendrán el significado que les atribuye "
             f"este MSA y, en su caso, el SOW respectivo."),

            ("Objeto y orden de prelación",
             f"<b>PRIMERA.</b> El presente MSA establece los términos y condiciones generales "
             f"que regirán la prestación, por parte del Desarrollador a favor del Cliente, de "
             f"los Servicios profesionales de desarrollo de software, consultoría tecnológica "
             f"e implementación. Cada proyecto específico se documentará en una <b>Orden de "
             f"Trabajo (SOW)</b> que detallará el alcance, plazo, contraprestación y "
             f"condiciones particulares aplicables, y se regirá por las disposiciones del "
             f"presente MSA.<br/><br/>"
             f"En caso de conflicto entre el MSA y un SOW, prevalecerán las disposiciones del "
             f"<b>SOW</b> respectivo, salvo en lo relativo a propiedad intelectual, "
             f"confidencialidad, limitación de responsabilidad e indemnización, en cuyo caso "
             f"prevalecerá lo previsto por el presente MSA."),

            ("Servicios y modelos comerciales",
             f"<b>SEGUNDA.</b> Los Servicios podrán comprender, sin limitación: análisis de "
             f"requerimientos, arquitectura, diseño UX/UI, desarrollo, integración, pruebas, "
             f"despliegue, capacitación, soporte y mantenimiento. Cada SOW podrá adoptar el "
             f"modelo comercial que las Partes convengan, ya sea (i) precio fijo cerrado, "
             f"(ii) tiempo y materiales (T&amp;M) o (iii) retainer mensual."),

            ("Honorarios, facturación y pago",
             f"<b>TERCERA.</b> Los honorarios serán los pactados en cada SOW. El Desarrollador "
             f"emitirá el CFDI correspondiente conforme a la legislación fiscal vigente. Los "
             f"pagos se realizarán a más tardar dentro de los <b>15 (quince) días naturales</b> "
             f"siguientes a la recepción del CFDI, mediante transferencia electrónica a la "
             f"cuenta del Desarrollador: <b>{_esc(bank_name)}</b>, CLABE <b>{_esc(bank_clabe)}</b>, "
             f"titular <b>{_esc(bank_holder)}</b>. La mora generará intereses moratorios a "
             f"razón del <b>{late_pct}% mensual</b> sobre saldos insolutos, sin necesidad de "
             f"requerimiento previo, en términos del artículo 362 del Código de Comercio."),

            ("Propiedad intelectual y licencia de uso",
             f"<b>CUARTA.</b> Todo Software del Proyecto desarrollado por el Desarrollador "
             f"bajo este MSA y sus SOWs, así como su Tecnología Preexistente, sus librerías, "
             f"<i>frameworks</i>, herramientas y metodologías, son y permanecerán como "
             f"<b>propiedad exclusiva del Desarrollador</b>, en términos de los artículos 11, "
             f"12, 13 fracción XI, 18, 19, 20, 21, 24, 83, 101 y demás aplicables de la Ley "
             f"Federal del Derecho de Autor. Mediante el pago íntegro de cada SOW, el "
             f"Desarrollador otorgará al Cliente una <b>licencia de uso amplia, perpetua, no "
             f"exclusiva, intransferible y no sublicenciable</b>, exclusivamente para los "
             f"fines internos y operativos del Cliente.<br/><br/>"
             f"Quedan <b>terminantemente prohibidos</b> al Cliente, salvo autorización previa "
             f"y por escrito del Desarrollador: la comercialización, reventa, sublicenciamiento, "
             f"distribución a terceros, oferta como servicio (SaaS) a terceros, ingeniería "
             f"inversa, descompilación o cesión a cualquier título del Software del Proyecto."),

            ("Confidencialidad",
             f"<b>QUINTA.</b> Cada Parte mantendrá bajo estricta confidencialidad la "
             f"Información Confidencial de la otra a la que tenga acceso con motivo de este "
             f"MSA y de los SOWs derivados, durante toda su vigencia y por <b>{conf_yrs} "
             f"({_esc(str(conf_yrs))}) años</b> posteriores, en los mismos términos previstos "
             f"para los acuerdos de confidencialidad mexicanos."),

            ("Garantías limitadas y descargo",
             f"<b>SEXTA.</b> El Desarrollador garantiza que los entregables operarán "
             f"sustancialmente conforme a las especificaciones del SOW respectivo durante "
             f"<b>{warr_d} ({_esc(str(warr_d))}) días naturales</b> posteriores a su aceptación. "
             f"El Desarrollador <b>no otorga ninguna otra garantía</b>, expresa o implícita, "
             f"incluyendo cualesquiera garantías implícitas de comerciabilidad, idoneidad para "
             f"un fin particular o no infracción."),

            ("Indemnización por propiedad intelectual",
             f"<b>SÉPTIMA.</b> El Desarrollador defenderá e indemnizará al Cliente por "
             f"cualquier reclamación de tercero que sostenga que el Software del Proyecto, "
             f"según haya sido entregado, infringe derechos de propiedad intelectual válidos "
             f"en México, siempre que el Cliente: (i) notifique la reclamación al Desarrollador "
             f"dentro de los 5 días hábiles siguientes a su conocimiento; (ii) permita al "
             f"Desarrollador la dirección exclusiva de la defensa y de las negociaciones de "
             f"transacción; y (iii) coopere razonablemente con la defensa. Esta indemnización "
             f"está sujeta a la limitación prevista en la cláusula OCTAVA y no procede cuando "
             f"la reclamación derive de modificaciones realizadas por el Cliente o por "
             f"terceros, ni del uso del software fuera del alcance de la licencia."),

            ("Limitación de responsabilidad",
             f"<b>OCTAVA.</b> La responsabilidad total, agregada y acumulada del Desarrollador "
             f"bajo este MSA y todos sus SOWs se limita al monto efectivamente cobrado por el "
             f"Desarrollador en los <b>{cap_m} ({_esc(str(cap_m))}) meses</b> inmediatos "
             f"anteriores al hecho que origine la reclamación. En ningún caso responderá por "
             f"daños indirectos, incidentales, punitivos, lucro cesante, pérdida de datos o "
             f"pérdida de oportunidades de negocio."),

            ("Vigencia, terminación y supervivencia",
             f"<b>NOVENA.</b> El presente MSA tendrá vigencia <b>indefinida</b> y podrá darse "
             f"por terminado, sin causa, por cualquiera de las Partes mediante notificación "
             f"por escrito con al menos <b>30 (treinta) días naturales</b> de anticipación, sin "
             f"que ello afecte los SOWs en curso, los cuales se ejecutarán hasta su conclusión "
             f"natural bajo los términos de este MSA. La terminación con causa procederá ante "
             f"incumplimiento grave no subsanado dentro de los 15 (quince) días naturales "
             f"siguientes a la notificación. Las cláusulas de propiedad intelectual, "
             f"confidencialidad, limitación de responsabilidad, indemnización y jurisdicción "
             f"<b>sobrevivirán</b> indefinidamente a la terminación del MSA."),

            ("No solicitud de personal (no-poach)",
             f"<b>DÉCIMA.</b> Durante la vigencia de este MSA y por <b>12 (doce) meses</b> "
             f"posteriores a su terminación, el Cliente se obliga a no contratar, ni a "
             f"intentar contratar, directa o indirectamente, por cuenta propia o ajena, al "
             f"personal del Desarrollador que hubiere participado o esté participando en la "
             f"prestación de los Servicios, salvo consentimiento previo, expreso y por "
             f"escrito del Desarrollador. El incumplimiento generará, además de los daños y "
             f"perjuicios causados, una pena convencional equivalente a <b>seis meses</b> de "
             f"la última remuneración bruta percibida por dicho personal."),

            ("Cesión y subcontratación",
             f"<b>DÉCIMA PRIMERA.</b> El Cliente no podrá ceder este MSA ni los SOWs "
             f"derivados sin consentimiento previo y por escrito del Desarrollador. El "
             f"Desarrollador podrá subcontratar la totalidad o parte de los Servicios, "
             f"manteniéndose como único responsable directo frente al Cliente."),

            ("Notificaciones",
             f"<b>DÉCIMA SEGUNDA.</b> Las notificaciones se harán por escrito a los "
             f"domicilios señalados en las declaraciones, o bien al correo del Cliente "
             f"{_esc(cemail)} y al correo del Desarrollador {_esc(devemail)}, surtiendo "
             f"efectos al día hábil siguiente a su acuse o confirmación de entrega."),

            ("Jurisdicción y legislación aplicable",
             f"<b>DÉCIMA TERCERA.</b> Las Partes se someten a la legislación federal mexicana "
             f"y a la jurisdicción de los Tribunales competentes con residencia en "
             f"<b>{_esc(place)}</b>, renunciando expresamente a cualquier otro fuero."),
        ]

    if kind == "nda":
        return [
            ("Declaraciones",
             decl_dev + "<br/><br/>" + decl_cli + "<br/><br/>" + decl_amb),

            ("Antecedentes y propósito",
             f"<b>PRIMERA.</b> Las Partes han manifestado su mutuo interés en sostener "
             f"conversaciones, intercambiar información y, en su caso, evaluar la celebración "
             f"de una posible relación comercial relacionada con servicios de desarrollo de "
             f"software a la medida, consultoría tecnológica y/o licenciamiento de soluciones "
             f"propiedad del Desarrollador (en lo sucesivo, el «<b>Propósito</b>»). Para "
             f"efectos del Propósito, ambas Partes podrán intercambiar información "
             f"confidencial, motivo por el cual celebran el presente Acuerdo de "
             f"Confidencialidad de carácter <b>mutuo y recíproco</b>, en términos del artículo "
             f"82 de la Ley Federal de Protección a la Propiedad Industrial y demás "
             f"disposiciones aplicables."),

            ("Información confidencial",
             f"<b>SEGUNDA.</b> Para los efectos del presente acuerdo, se entenderá por "
             f"«<b>Información Confidencial</b>» toda aquella información, en cualquier "
             f"soporte, formato o medio (verbal, escrito, electrónico, visual o de cualquier "
             f"otra naturaleza), que cualquiera de las Partes (la «<b>Parte Reveladora</b>») "
             f"entregue, transmita, comunique, ponga a disposición o de alguna manera "
             f"divulgue a la otra (la «<b>Parte Receptora</b>»), ya sea identificada como "
             f"confidencial o que por su naturaleza, contexto o circunstancias deba "
             f"razonablemente considerarse como tal, incluyendo, sin limitación: información "
             f"técnica, código fuente, código objeto, arquitecturas, diagramas, modelos de "
             f"datos, planes de negocio, información financiera, estados financieros, "
             f"presupuestos, listas y datos de clientes, proveedores y empleados, estrategias "
             f"comerciales, datos personales, secretos industriales y comerciales, "
             f"<i>know-how</i>, fórmulas, procedimientos y metodologías."),

            ("Obligaciones de la Parte Receptora",
             f"<b>TERCERA.</b> La Parte Receptora se obliga, durante toda la vigencia del "
             f"presente acuerdo y por el plazo previsto en la cláusula SEXTA, a:<br/>"
             f"<b>i)</b> mantener la Información Confidencial bajo estricto resguardo y "
             f"absoluta reserva, aplicándole por lo menos el mismo grado de cuidado y "
             f"protección que aplica a su propia información confidencial de naturaleza "
             f"análoga, sin que en ningún caso ese estándar sea inferior al razonable;<br/>"
             f"<b>ii)</b> usar la Información Confidencial única y exclusivamente para el "
             f"Propósito;<br/>"
             f"<b>iii)</b> limitar el acceso a la Información Confidencial estrictamente a "
             f"aquellos socios, directivos, empleados, asesores externos y subcontratistas "
             f"que (a) requieran conocerla para el Propósito y (b) estén previamente sujetos "
             f"a obligaciones de confidencialidad de alcance equivalente o mayor, siendo la "
             f"Parte Receptora responsable solidaria por el cumplimiento de tales obligaciones "
             f"por dichas personas;<br/>"
             f"<b>iv)</b> abstenerse de copiar, reproducir, divulgar, publicar, transmitir, "
             f"sublicenciar, ceder, comercializar, descompilar, desensamblar o realizar "
             f"ingeniería inversa sobre la Información Confidencial, en forma total o parcial."),

            ("Excepciones a la confidencialidad",
             f"<b>CUARTA.</b> No se considerará Información Confidencial aquella que la Parte "
             f"Receptora pueda demostrar fehacientemente que: (i) era o se volvió de dominio "
             f"público sin culpa, dolo o negligencia de su parte; (ii) ya estaba lícitamente "
             f"en su posesión con anterioridad a su revelación por la Parte Reveladora, "
             f"libre de cualquier restricción de confidencialidad; (iii) le fue revelada "
             f"lícitamente por un tercero que tenía derecho a hacerlo y que no estaba sujeto "
             f"a obligaciones de confidencialidad respecto de la Parte Reveladora; o (iv) "
             f"fue desarrollada de manera independiente por la Parte Receptora sin uso ni "
             f"referencia a la Información Confidencial."),

            ("Divulgación obligatoria por mandato de autoridad",
             f"<b>QUINTA.</b> En caso de que la Parte Receptora se vea legítimamente "
             f"compelida a divulgar Información Confidencial por mandato de autoridad "
             f"competente o disposición legal, lo notificará a la Parte Reveladora con la "
             f"mayor anticipación legalmente posible para que ésta pueda ejercer las "
             f"acciones procesales o administrativas pertinentes para proteger sus derechos. "
             f"La Parte Receptora limitará la divulgación únicamente a lo estrictamente "
             f"requerido por la autoridad y procurará obtener tratamiento confidencial."),

            ("Vigencia y plazo de confidencialidad",
             f"<b>SEXTA.</b> El presente acuerdo entrará en vigor a partir de su firma. Las "
             f"obligaciones de confidencialidad permanecerán plenamente vigentes durante un "
             f"plazo de <b>{conf_yrs} ({_esc(str(conf_yrs))}) años</b> contados a partir de "
             f"dicha fecha, independientemente de que la relación comercial entre las Partes "
             f"se concrete o no, y sobrevivirán a la terminación del Propósito por cualquier "
             f"causa."),

            ("Devolución o destrucción",
             f"<b>SÉPTIMA.</b> A simple solicitud por escrito de la Parte Reveladora o, en "
             f"todo caso, al término de las conversaciones o de la relación derivada del "
             f"Propósito, la Parte Receptora deberá, a elección de la Parte Reveladora, "
             f"<b>devolver o destruir</b> la totalidad de la Información Confidencial en su "
             f"poder y en el de las personas a quienes ésta hubiere sido revelada, "
             f"certificándolo por escrito si así le fuere requerido, dentro de los 10 (diez) "
             f"días naturales siguientes a la solicitud."),

            ("No otorgamiento de derechos",
             f"<b>OCTAVA.</b> El presente acuerdo no otorga ni transmite derecho, título o "
             f"interés alguno sobre la Información Confidencial, salvo el limitadísimo "
             f"derecho de uso para el Propósito. Ningún elemento de este acuerdo podrá "
             f"interpretarse como una cesión o licencia de derechos de propiedad intelectual "
             f"o industrial, ni como una obligación de las Partes de celebrar contratos "
             f"futuros entre sí."),

            ("Daños, perjuicios y medidas precautorias",
             f"<b>NOVENA.</b> Las Partes reconocen y aceptan que la divulgación o uso no "
             f"autorizado de Información Confidencial es susceptible de causar a la Parte "
             f"Reveladora daños y perjuicios de naturaleza grave e irreparable, por lo que "
             f"ésta podrá reclamar, además de la pena convencional equivalente al "
             f"<b>20% (veinte por ciento) del valor de la operación o proyecto que motivó "
             f"el Propósito</b>, los daños y perjuicios adicionales que acredite haber sufrido, "
             f"así como solicitar y obtener las medidas cautelares y precautorias previstas "
             f"por la legislación aplicable, sin necesidad de otorgar fianza o caución."),

            ("Jurisdicción y legislación aplicable",
             f"<b>DÉCIMA.</b> Este acuerdo se rige por la legislación federal mexicana. Para "
             f"todo lo relativo a su interpretación y cumplimiento, las Partes se someten a "
             f"la jurisdicción de los Tribunales competentes con residencia en "
             f"<b>{_esc(place)}</b>, renunciando expresamente a cualquier otro fuero."),
        ]

    if kind == "baa":
        return [
            ("Declaraciones",
             decl_dev + "<br/><br/>" + decl_cli + "<br/><br/>" + decl_amb),

            ("Definiciones",
             f"<b>PRIMERA.</b> Para los efectos del presente Acuerdo de Asociado de Negocio "
             f"(en lo sucesivo, el «<b>BAA</b>»), los términos «<b>Información de Salud "
             f"Protegida</b>» o «<b>PHI</b>», «<b>Entidad Cubierta</b>», «<b>Asociado de "
             f"Negocio</b>», «<b>Brecha</b>» («Breach»), «<b>Reglas de Privacidad y de "
             f"Seguridad</b>» y «<b>Subcontratista</b>» tendrán el significado que les "
             f"atribuye la <i>Health Insurance Portability and Accountability Act of 1996</i> "
             f"(HIPAA) de los Estados Unidos de América, así como su normativa complementaria "
             f"(<i>HITECH Act</i>, Privacy Rule [45 C.F.R. Parts 160 y 164], Security Rule y "
             f"Breach Notification Rule). En lo aplicable, también se considerarán las "
             f"obligaciones derivadas de la Ley Federal de Protección de Datos Personales en "
             f"Posesión de los Particulares (LFPDPPP) y la NOM-024-SSA3-2012. Para todos los "
             f"efectos, el <b>Cliente actúa como Entidad Cubierta</b> y el <b>Desarrollador "
             f"como Asociado de Negocio</b>."),

            ("Usos y divulgaciones permitidas",
             f"<b>SEGUNDA.</b> El Asociado de Negocio podrá crear, recibir, mantener o "
             f"transmitir PHI por cuenta de la Entidad Cubierta única y exclusivamente para: "
             f"(i) prestar los servicios contratados conforme al SOW o contrato de prestación "
             f"de servicios respectivo; (ii) la administración propia y razonable del "
             f"Asociado, incluyendo sus obligaciones legales y de gestión; y (iii) cumplir "
             f"obligaciones impuestas por autoridad competente. El Asociado <b>no usará ni "
             f"divulgará la PHI de manera distinta</b> a la que estaría permitida si la "
             f"Entidad Cubierta lo hiciera directamente bajo HIPAA."),

            ("Salvaguardas administrativas, físicas y técnicas",
             f"<b>TERCERA.</b> El Asociado implementará y mantendrá medidas de seguridad "
             f"administrativas, físicas y técnicas razonables y apropiadas para proteger la "
             f"<b>confidencialidad, integridad y disponibilidad</b> de la PHI electrónica, "
             f"incluyendo, sin limitación: cifrado en tránsito y en reposo conforme a "
             f"estándares industria (TLS 1.2+ y AES-256 o superiores), control de accesos "
             f"basado en roles (RBAC), autenticación multifactor para accesos administrativos, "
             f"registros de auditoría inmutables, respaldos cifrados, gestión documentada de "
             f"incidentes y capacitación periódica al personal con acceso a PHI."),

            ("Subcontratistas",
             f"<b>CUARTA.</b> El Asociado se asegurará de que cualquier subcontratista que "
             f"reciba, cree, mantenga o transmita PHI por su cuenta, suscriba previamente un "
             f"acuerdo escrito que le imponga obligaciones de protección de la PHI <b>al "
             f"menos equivalentes</b> a las del presente BAA. El Asociado responderá frente a "
             f"la Entidad Cubierta por los actos y omisiones de sus subcontratistas como si "
             f"fueran propios."),

            ("Notificación de Brechas e incidentes",
             f"<b>QUINTA.</b> El Asociado notificará a la Entidad Cubierta, sin demora "
             f"indebida y a más tardar dentro de <b>5 (cinco) días hábiles</b>, cualquier "
             f"<i>Breach</i> de PHI no asegurada, uso o divulgación no autorizada, o "
             f"incidente de seguridad del que tenga conocimiento, proporcionando los detalles "
             f"que permitan a la Entidad Cubierta cumplir con sus obligaciones de "
             f"notificación bajo HIPAA: (i) identificación de la PHI afectada y de los "
             f"individuos involucrados; (ii) descripción del incidente y de las acciones "
             f"correctivas; (iii) cualquier otra información razonablemente solicitada."),

            ("Acceso, modificación y rendición de cuentas",
             f"<b>SEXTA.</b> El Asociado cooperará con la Entidad Cubierta para atender, en "
             f"los plazos y términos previstos por HIPAA, las solicitudes de los individuos "
             f"respecto del acceso, modificación, restricción de uso y rendición de cuentas "
             f"sobre su PHI, incluyendo la entrega de la PHI en su poder cuando ello sea "
             f"requerido por la Entidad Cubierta."),

            ("Vigencia y terminación",
             f"<b>SÉPTIMA.</b> El presente BAA permanecerá vigente mientras subsista "
             f"cualquier servicio que implique acceso, manejo o transmisión de PHI por parte "
             f"del Asociado. La Entidad Cubierta podrá rescindir este BAA <b>de inmediato</b>, "
             f"sin necesidad de declaración judicial, en caso de que el Asociado incurra en "
             f"una violación material a sus obligaciones que no sea subsanada dentro de los "
             f"<b>30 (treinta) días naturales</b> siguientes a la notificación que al efecto "
             f"se le formule."),

            ("Devolución o destrucción de PHI",
             f"<b>OCTAVA.</b> Al término del presente BAA, por cualquier causa, el Asociado "
             f"<b>devolverá o destruirá</b> toda la PHI en su poder y en el de sus "
             f"subcontratistas, sin retener copia alguna. Si la devolución o destrucción no "
             f"fuere factible (lo que el Asociado deberá justificar por escrito), las "
             f"protecciones del presente BAA continuarán aplicando indefinidamente a dicha "
             f"PHI mientras se mantenga en posesión del Asociado y se limitarán los usos y "
             f"divulgaciones a aquellos fines que hagan no factible la devolución o "
             f"destrucción."),

            ("Jurisdicción y legislación aplicable",
             f"<b>NOVENA.</b> El presente BAA se interpretará bajo HIPAA y, en lo no previsto "
             f"por dicha normativa, conforme a la legislación federal mexicana. Las "
             f"controversias se someterán a los Tribunales competentes con residencia en "
             f"<b>{_esc(place)}</b>, renunciando las Partes a cualquier otro fuero."),
        ]

    # Fallback (should not happen)
    return [("Términos", "Este instrumento se rige por los términos estándar del Desarrollador.")]


def build_contract(
    db: Session,
    row: dict[str, Any],
    kind: str = "contract",
    overrides: dict[str, Any] | None = None,
) -> tuple[str, list]:
    """Renders a full legal contract body (SOW / MSA / NDA / BAA / contract).

    Pulls the linked quote (by folio in notes or by deal_id) to dump line items
    as the project scope/Anexo A.

    `overrides` can supply per-document data:
      {
        "developer": { "legal_name": ..., "address": {...}, "bank": {...}, ... },
        "client":    { "legal_name": ..., "rfc": ..., "address": "...",
                        "rep_name": ..., "rep_role": ..., "email": ..., "phone": ... },
      }
    """
    from lib.developer_profile import (
        get_developer_profile, merge_overrides, format_address,
    )

    accent = ACCENTS.get(kind, ACCENTS["contract"])
    label_es = KIND_LABEL_ES.get(kind, "Contrato")
    client = _fetch_client(db, row.get("client_id"), row["workspace_id"]) or {}
    project = _fetch_project(db, row.get("project_id"), row["workspace_id"])
    title = row.get("title") or f"{label_es} {row.get('id', '')[:8]}"
    status = str(row.get("status") or "DRAFT").upper()

    quote = _fetch_quote_for_contract(db, row)
    items = _fetch_quote_items(db, quote["id"]) if quote else []

    # Resolve developer profile (defaults + env + per-doc override)
    overrides = overrides or {}
    dev = merge_overrides(get_developer_profile(), overrides.get("developer") or {})
    co = overrides.get("client") or {}

    # Build scope markdown from quote items
    if items:
        scope_lines = [
            "<b>Entregables y conceptos contratados:</b><br/>",
        ]
        for it in items:
            qty = it.get("qty") or 1
            unit = it.get("unit") or ""
            scope_lines.append(
                f"• <b>{_esc(it['description'])}</b> "
                f"<font color='#86868b'>({_esc(str(qty))} {_esc(unit)} — "
                f"{_money(it.get('amount'), quote.get('currency') or 'MXN')})</font>"
            )
        scope_md = "<br/>".join(scope_lines)
    elif row.get("notes"):
        scope_md = _esc(str(row["notes"])[:1500]).replace("\n", "<br/>")
    else:
        scope_md = ("Conforme a las especificaciones técnicas y funcionales que las partes "
                    "documenten en el Anexo A previo al inicio de los trabajos.")

    value_str = _money(row.get("value"), quote.get("currency") if quote else "MXN")

    # Resolve client display fields with overrides taking precedence
    client_legal_name = co.get("legal_name") or client.get("legal_name") or client.get("name") or "el Cliente"
    client_display    = client.get("name") or client_legal_name
    client_rfc        = co.get("rfc") or client.get("rfc") or ""
    # client address: override > composed from client row > empty
    if co.get("address"):
        client_address_str = co["address"] if isinstance(co["address"], str) else format_address(co["address"])
    else:
        client_address_str = client.get("address") or ""
    client_email      = co.get("email") or client.get("contact_email") or client.get("email") or ""
    client_phone      = co.get("phone") or client.get("phone") or ""
    client_rep_name   = co.get("rep_name") or client.get("primary_contact") or ""
    client_rep_role   = co.get("rep_role") or "representante legal"

    place = (
        co.get("place")
        or f"{dev.get('jurisdiction_city') or 'San Luis Potosí'}, {dev.get('jurisdiction_state') or 'San Luis Potosí'}"
    )

    addr = dev.get("address") or {}
    contact = dev.get("contact") or {}
    bank = dev.get("bank") or {}

    ctx = {
        # Cliente
        "client_name":        client_display,
        "client_legal_name":  client_legal_name,
        "client_rfc":         client_rfc,
        "client_address":     client_address_str,
        "client_email":       client_email,
        "client_phone":       client_phone,
        "client_rep_name":    client_rep_name,
        "client_rep_role":    client_rep_role,
        # Desarrollador
        "dev_legal_name":      dev.get("legal_name"),
        "dev_commercial_name": dev.get("commercial_name"),
        "dev_rfc":             dev.get("rfc"),
        "dev_tax_regime":      dev.get("tax_regime"),
        "dev_address":         format_address(addr) if addr else "",
        "dev_email":           contact.get("email") or dev.get("legal_notices_email"),
        "dev_phone":           contact.get("phone"),
        "dev_id_doc":          dev.get("id_doc"),
        # Bancarios
        "bank_name":    bank.get("bank_name"),
        "bank_clabe":   bank.get("clabe"),
        "bank_account": bank.get("account"),
        "bank_holder":  bank.get("holder"),
        "bank_swift":   bank.get("swift"),
        # Generales
        "value_str":      value_str,
        "currency":       (quote.get("currency") if quote else None) or "MXN",
        "signed_date":    _date(row.get("signed_date")),
        "expiry_date":    _date(row.get("expiry_date")),
        "scope_md":       scope_md,
        "hipaa":          bool(row.get("hipaa_required")),
        "project_name":   project["name"] if project else None,
        "place":          place,
        # Parámetros legales
        "payment_schedule":     dev.get("payment_schedule"),
        "late_pct_mo":          dev.get("late_interest_pct_mo"),
        "warranty_days":        dev.get("warranty_days"),
        "confidentiality_yrs":  dev.get("confidentiality_yrs"),
        "liability_cap_months": dev.get("liability_cap_months"),
    }

    story = _hero(kind, title,
                  f"Para {client.get('name')}" if client.get("name") else label_es,
                  None)

    story.append(_from_to_block(client or None, [
        ("Tipo", str(row.get("contract_type") or kind).upper()),
        ("Proyecto", project["name"] if project else "—"),
        ("Cotización origen", quote["folio"] if quote else "—"),
        ("Valor", value_str),
        ("Firmado", _date(row.get("signed_date"))),
        ("Vence", _date(row.get("expiry_date"))),
    ], issuer=dev) if kind in ("sow", "contract", "msa") else _from_to_block(client or None, [
        ("Tipo", kind.upper()),
        ("Proyecto", project["name"] if project else "—"),
        ("Firmado", _date(row.get("signed_date"))),
        ("Vence", _date(row.get("expiry_date"))),
    ], issuer=dev))
    story.append(Spacer(1, 14))

    # Document subtitle / preamble
    preamble_map = {
        "sow":      "ORDEN DE TRABAJO — STATEMENT OF WORK (SOW)",
        "contract": "CONTRATO DE PRESTACIÓN DE SERVICIOS DE DESARROLLO DE SOFTWARE",
        "msa":      "ACUERDO MARCO DE PRESTACIÓN DE SERVICIOS — MASTER SERVICES AGREEMENT (MSA)",
        "nda":      "ACUERDO DE CONFIDENCIALIDAD — NON-DISCLOSURE AGREEMENT (NDA)",
        "baa":      "ACUERDO DE ASOCIADO DE NEGOCIO — BUSINESS ASSOCIATE AGREEMENT (BAA)",
    }
    story.append(Paragraph(
        f"<b>{preamble_map.get(kind, label_es.upper())}</b>",
        ParagraphStyle("preamb", fontName="Helvetica-Bold", fontSize=10,
                       textColor=accent, alignment=1, leading=14, spaceAfter=8)))

    story.append(Paragraph(
        f"En la ciudad de <b>{_esc(ctx['place'])}</b>, a "
        f"{_date(row.get('signed_date')) or '___ de ___ de 20__'}, comparecen por una parte "
        f"<b>{_esc(ctx['dev_legal_name'])}</b>, persona física con actividad empresarial que "
        f"opera comercialmente bajo la denominación «<b>{_esc(ctx['dev_commercial_name'])}</b>», "
        f"por su propio derecho (en lo sucesivo, el «<b>Desarrollador</b>»); y por la otra "
        f"parte <b>{_esc(ctx['client_legal_name'])}</b>, representada en este acto por "
        f"<b>{_esc(ctx['client_rep_name'] or 'su representante legal')}</b>, en su carácter de "
        f"<b>{_esc(ctx['client_rep_role'])}</b> (en lo sucesivo, el «<b>Cliente</b>»); "
        f"quienes manifiestan tener la capacidad legal suficiente para obligarse en los "
        f"términos del presente instrumento, mismo que celebran al tenor de las siguientes "
        f"<b>declaraciones y cláusulas</b>:",
        _S_CLAUSE_BODY))
    story.append(Spacer(1, 8))

    # Clausulado
    story += _clauses(_legal_clauses(kind, ctx))

    # Quote items table as Anexo A (only for sow/contract)
    if kind in ("sow", "contract") and items:
        story.append(PageBreak())
        story.append(_section_title("Anexo A — Desglose de conceptos contratados", accent))
        story.append(Spacer(1, 8))
        body_rows = [[
            Paragraph("<b>DESCRIPCIÓN</b>", ParagraphStyle("h", fontName="Helvetica-Bold",
                                                            fontSize=8.5,
                                                            textColor=BRAND_MUTED, leading=11)),
            Paragraph("<b>CANT.</b>", ParagraphStyle("h", fontName="Helvetica-Bold",
                                                       fontSize=8.5, alignment=2,
                                                       textColor=BRAND_MUTED, leading=11)),
            Paragraph("<b>P.U.</b>", ParagraphStyle("h", fontName="Helvetica-Bold",
                                                       fontSize=8.5, alignment=2,
                                                       textColor=BRAND_MUTED, leading=11)),
            Paragraph("<b>IMPORTE</b>", ParagraphStyle("h", fontName="Helvetica-Bold",
                                                         fontSize=8.5, alignment=2,
                                                         textColor=BRAND_MUTED, leading=11)),
        ]]
        money_p = ParagraphStyle("mp", fontName="Helvetica", fontSize=9,
                                 textColor=BRAND_DARK, alignment=2, leading=12)
        for it in items:
            body_rows.append([
                Paragraph(_esc(it["description"]),
                          ParagraphStyle("d", fontName="Helvetica", fontSize=9,
                                         textColor=BRAND_DARK, leading=12)),
                Paragraph(f"{it.get('qty') or 1} {_esc(it.get('unit') or '')}", money_p),
                Paragraph(_money(it.get('unit_price'), ctx['currency']), money_p),
                Paragraph(_money(it.get('amount'), ctx['currency']), money_p),
            ])
        anexo = Table(body_rows, colWidths=[78 * mm, 18 * mm, 38 * mm, 38 * mm], repeatRows=1)
        anexo.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LINEBELOW", (0, 0), (-1, 0), 0.6, BRAND_DARK),
            ("LINEBELOW", (0, 1), (-1, -1), 0.3, BRAND_LINE),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(anexo)
        story.append(Spacer(1, 10))
        if quote:
            tot_rows = [
                ("Subtotal", _money(quote.get("subtotal"), ctx["currency"])),
                ("IVA / Impuestos", _money(quote.get("tax"), ctx["currency"])),
            ]
            story.append(_totals_panel(tot_rows, "Total", _money(quote.get("total"), ctx["currency"]), accent))

    # Notas adicionales del usuario
    extra_notes = (row.get("notes") or "").strip()
    if extra_notes and not _re_has_quote_only(extra_notes):
        story.append(Spacer(1, 12))
        story.append(_section_title("Notas adicionales", accent))
        story.append(Spacer(1, 4))
        story += _markdown_paragraphs(extra_notes)

    # Signers
    signers = row.get("signers")
    slist: list = []
    if signers:
        try:
            slist = json.loads(signers) if isinstance(signers, str) else (signers or [])
        except Exception:
            slist = []

    # Signature block
    story.append(Spacer(1, 30))
    story.append(_section_title("Firmas", accent))
    story.append(Spacer(1, 24))
    cli_label = _esc(ctx["client_legal_name"]).upper()
    dev_label = _esc(ctx.get("dev_legal_name") or "").upper()
    dev_role  = _esc(ctx.get("dev_commercial_name") or "")
    sig = Table([
        ["", ""],
        [Paragraph(f"<font color='#86868b'><b>POR EL CLIENTE</b></font><br/>"
                   f"<font size='8' color='#86868b'>{cli_label}</font><br/>"
                   f"<font size='7' color='#86868b'>{_esc(ctx.get('client_rep_name') or '')} — "
                   f"{_esc(ctx.get('client_rep_role') or '')}</font>",
                   ParagraphStyle("s", fontName="Helvetica", fontSize=8,
                                  textColor=BRAND_MUTED, leading=11)),
         Paragraph(f"<font color='#86868b'><b>POR EL DESARROLLADOR</b></font><br/>"
                   f"<font size='8' color='#86868b'>{dev_label}</font><br/>"
                   f"<font size='7' color='#86868b'>Persona física con actividad empresarial — "
                   f"«{dev_role}»</font>",
                   ParagraphStyle("s", fontName="Helvetica", fontSize=8,
                                  textColor=BRAND_MUTED, leading=11))],
    ], colWidths=[80 * mm, 80 * mm], rowHeights=[24 * mm, 16 * mm])
    sig.setStyle(TableStyle([
        ("LINEABOVE", (0, 1), (0, 1), 0.6, BRAND_DARK),
        ("LINEABOVE", (1, 1), (1, 1), 0.6, BRAND_DARK),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(sig)

    if slist:
        story.append(Spacer(1, 8))
        story.append(Paragraph("<b>Firmantes designados:</b>", S_BODY))
        for s in slist[:10]:
            if isinstance(s, dict):
                nm = s.get("name") or "—"
                role = s.get("role") or s.get("title") or ""
                story.append(Paragraph(
                    f"&nbsp;&nbsp;• <b>{_esc(nm)}</b> &nbsp; "
                    f"<font color='#86868b'>{_esc(role)}</font>",
                    S_BODY))
            else:
                story.append(Paragraph(f"&nbsp;&nbsp;• {_esc(str(s))}", S_BODY))

    return title, story


def _re_has_quote_only(text_blob: str) -> bool:
    """True if notes is just the auto-generated 'Generado desde cotización ...' line."""
    import re as _re
    s = text_blob.strip()
    if len(s) < 200 and "Generado desde cotización" in s:
        return True
    return False


def build_sprint_doc(db: Session, row: dict[str, Any], kind: str = "sprint_report") -> tuple[str, list]:
    """For sprint_report, sprint_plan, sprint_retro. Source: sprints."""
    accent = ACCENTS.get(kind, ACCENTS["sprint_report"])
    label_es = KIND_LABEL_ES.get(kind, "Reporte de Sprint")
    project = _fetch_project(db, row.get("project_id"), row["workspace_id"])
    title = f"{label_es}: {row.get('name') or '—'}"
    status = str(row.get("status") or "PLANNED").upper()
    story: list = []
    story += _hero(kind, title,
                    f"Proyecto: {project['name']}" if project else label_es,
                    status)

    sp_planned = row.get("story_points_planned") or 0
    sp_done = row.get("story_points_completed") or 0
    completion = int(round((sp_done / sp_planned) * 100)) if sp_planned else 0

    story.append(_from_to_block(None, [
        ("Sprint", row.get("name")),
        ("Proyecto", project["name"] if project else "—"),
        ("Inicio", _date(row.get("start_date"))),
        ("Fin", _date(row.get("end_date"))),
        ("Objetivo", row.get("goal")),
    ]))
    story.append(Spacer(1, 18))

    # KPI cards (3 columns)
    big = ParagraphStyle("big", fontName="Helvetica-Bold", fontSize=22,
                          textColor=accent, leading=26)
    card_style = TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BRAND_PANEL),
        ("BOX", (0, 0), (-1, -1), 0.4, BRAND_LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ])
    def card(label: str, value: str) -> Table:
        t = Table([[Paragraph(label, S_LABEL)],
                   [Paragraph(_esc(value), big)]], colWidths=[51 * mm])
        t.setStyle(card_style)
        return t
    cards = Table([[card("STORY POINTS PLANEADOS", str(sp_planned)),
                    "",
                    card("COMPLETADOS", str(sp_done)),
                    "",
                    card("COMPLETITUD", f"{completion}%")]],
                  colWidths=[51 * mm, 3 * mm, 51 * mm, 3 * mm, 51 * mm])
    cards.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0),
                                ("RIGHTPADDING", (0, 0), (-1, -1), 0)]))
    story.append(cards)

    # Tasks in sprint
    tasks = db.execute(
        text("SELECT title, status, task_type, story_points "
             "FROM tasks WHERE sprint_id = :sid AND is_deleted = FALSE "
             "ORDER BY status LIMIT 30"),
        {"sid": row["id"]},
    ).mappings().all()
    if tasks:
        story.append(_section_title("Tareas del sprint", accent))
        story.append(Spacer(1, 4))
        body_rows = []
        for t in tasks:
            body_rows.append([
                Paragraph(_esc(t["title"]),
                          ParagraphStyle("d", fontName="Helvetica", fontSize=9.5,
                                         textColor=BRAND_DARK, leading=13)),
                str(t.get("task_type") or "—").upper(),
                str(t.get("story_points") or "—"),
                str(t.get("status") or "—").upper(),
            ])
        story.append(_items_table(
            ["TAREA", "TIPO", "PTS", "ESTADO"],
            body_rows,
            [95 * mm, 25 * mm, 15 * mm, 30 * mm],
            accent,
        ))
    return title, story


def build_project_status(db: Session, row: dict[str, Any], kind: str = "status_weekly") -> tuple[str, list]:
    """For status_weekly, case_study, onboarding_pack. Source: projects."""
    accent = ACCENTS.get(kind, BRAND_PRIMARY)
    label_es = KIND_LABEL_ES.get(kind, "Reporte de Estado")
    client = _fetch_client(db, row.get("client_id"), row["workspace_id"])
    title = f"{label_es}: {row.get('name')}"
    status = str(row.get("status") or "draft").upper()
    story: list = []
    story += _hero(kind, title,
                    f"Cliente: {row.get('client_name') or (client['name'] if client else '—')}",
                    status)

    health = row.get("health_score")
    health_str = f"{float(health):.0f}/100" if health is not None else "—"

    story.append(_from_to_block(client, [
        ("Proyecto", row.get("name")),
        ("Fase", row.get("phase")),
        ("Metodología", str(row.get("methodology") or "—").upper()),
        ("Health", health_str),
        ("Presupuesto", _money(row.get("budget"))),
        ("PHI involucrado", "Sí" if row.get("phi_involved") else "No"),
    ]))
    story.append(Spacer(1, 18))

    # Open risks for this project
    risks = db.execute(
        text("SELECT title, score, status FROM risk_items "
             "WHERE project_id = :pid AND is_deleted = FALSE AND status != 'closed' "
             "ORDER BY score DESC LIMIT 8"),
        {"pid": row["id"]},
    ).mappings().all()
    if risks:
        story.append(_section_title("Riesgos abiertos", accent))
        story.append(Spacer(1, 4))
        body_rows = [[
            Paragraph(_esc(r["title"]),
                      ParagraphStyle("d", fontName="Helvetica", fontSize=9.5,
                                     textColor=BRAND_DARK, leading=13)),
            str(r.get("score") or "—"),
            str(r.get("status") or "—").upper(),
        ] for r in risks]
        story.append(_items_table(["RIESGO", "SCORE", "ESTADO"],
                                    body_rows,
                                    [110 * mm, 25 * mm, 30 * mm], accent))

    # Active sprints
    sprints = db.execute(
        text("SELECT name, status, story_points_planned, story_points_completed "
             "FROM sprints WHERE project_id = :pid AND is_deleted = FALSE "
             "ORDER BY start_date DESC LIMIT 5"),
        {"pid": row["id"]},
    ).mappings().all()
    if sprints:
        story.append(_section_title("Sprints recientes", accent))
        story.append(Spacer(1, 4))
        body_rows = []
        for s in sprints:
            planned = s.get("story_points_planned") or 0
            done = s.get("story_points_completed") or 0
            pct = f"{int(round(done/planned*100))}%" if planned else "—"
            body_rows.append([
                _esc(s["name"]), str(s.get("status") or "").upper(),
                f"{done}/{planned}", pct,
            ])
        story.append(_items_table(["SPRINT", "ESTADO", "PUNTOS", "AVANCE"],
                                    body_rows,
                                    [70 * mm, 30 * mm, 30 * mm, 35 * mm], accent))
    return title, story


def build_risk_register(db: Session, row: dict[str, Any], kind: str = "risk_register") -> tuple[str, list]:
    """Aggregate risks for a project. Source row is a project."""
    accent = ACCENTS.get(kind, colors.HexColor("#dc2626"))
    title = f"Registro de Riesgos: {row.get('name')}"
    story: list = []
    story += _hero(kind, title, f"Proyecto: {row.get('name')}", "ACTIVO")

    risks = db.execute(
        text("SELECT title, category, probability, impact, score, status, "
             "       response_strategy, trend "
             "FROM risk_items WHERE project_id = :pid AND is_deleted = FALSE "
             "ORDER BY score DESC, status"),
        {"pid": row["id"]},
    ).mappings().all()

    open_count = sum(1 for r in risks if (r.get("status") or "").lower() != "closed")
    high = sum(1 for r in risks if (r.get("score") or 0) >= 15)

    # KPI
    big = ParagraphStyle("big", fontName="Helvetica-Bold", fontSize=22,
                          textColor=accent, leading=26)
    card_style = TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BRAND_PANEL),
        ("BOX", (0, 0), (-1, -1), 0.4, BRAND_LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ])
    def card(label: str, val: str) -> Table:
        t = Table([[Paragraph(label, S_LABEL)],
                   [Paragraph(_esc(val), big)]], colWidths=[52 * mm])
        t.setStyle(card_style)
        return t
    cards = Table([[card("TOTAL", str(len(risks))), "",
                    card("ABIERTOS", str(open_count)), "",
                    card("SCORE ALTO (≥15)", str(high))]],
                  colWidths=[52 * mm, 3 * mm, 52 * mm, 3 * mm, 52 * mm])
    story.append(cards)
    story.append(Spacer(1, 14))

    if risks:
        story.append(_section_title("Detalle de riesgos", accent))
        story.append(Spacer(1, 4))
        body_rows = []
        for r in risks[:25]:
            body_rows.append([
                Paragraph(_esc(r["title"]),
                          ParagraphStyle("d", fontName="Helvetica", fontSize=9.5,
                                         textColor=BRAND_DARK, leading=13)),
                _esc(r.get("category") or "—"),
                str(r.get("probability") or "—"),
                str(r.get("impact") or "—"),
                str(r.get("score") or "—"),
                str(r.get("status") or "—").upper(),
            ])
        story.append(_items_table(
            ["RIESGO", "CATEGORÍA", "P", "I", "SCORE", "ESTADO"],
            body_rows,
            [70 * mm, 30 * mm, 12 * mm, 12 * mm, 18 * mm, 23 * mm],
            accent,
        ))
    else:
        story.append(Paragraph("<i>No hay riesgos registrados.</i>", S_BODY))
    return title, story


def build_compliance_audit(db: Session, row: dict[str, Any], kind: str = "compliance_audit") -> tuple[str, list]:
    """Compliance controls audit for a project."""
    accent = ACCENTS.get(kind, colors.HexColor("#0d9488"))
    title = f"Auditoría de Cumplimiento: {row.get('name')}"
    story: list = []
    story += _hero(kind, title, f"Proyecto: {row.get('name')}", "ACTIVO")

    controls = db.execute(
        text("SELECT framework, control_name, status, score, deadline "
             "FROM compliance_controls WHERE project_id = :pid AND is_deleted = FALSE "
             "ORDER BY framework, status"),
        {"pid": row["id"]},
    ).mappings().all()

    ok_count = sum(1 for c in controls if c.get("status") == "OK")
    crit = sum(1 for c in controls if c.get("status") == "CRITICAL")
    pct = int(round(ok_count / len(controls) * 100)) if controls else 0

    big = ParagraphStyle("big", fontName="Helvetica-Bold", fontSize=22,
                          textColor=accent, leading=26)
    card_style = TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BRAND_PANEL),
        ("BOX", (0, 0), (-1, -1), 0.4, BRAND_LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ])
    def card(label: str, val: str) -> Table:
        t = Table([[Paragraph(label, S_LABEL)],
                   [Paragraph(_esc(val), big)]], colWidths=[52 * mm])
        t.setStyle(card_style)
        return t
    cards = Table([[card("CONTROLES", str(len(controls))), "",
                    card("CONFORMES", f"{pct}%"), "",
                    card("CRÍTICOS", str(crit))]],
                  colWidths=[52 * mm, 3 * mm, 52 * mm, 3 * mm, 52 * mm])
    story.append(cards)
    story.append(Spacer(1, 14))

    if controls:
        story.append(_section_title("Controles", accent))
        story.append(Spacer(1, 4))
        body_rows = []
        for c in controls[:30]:
            body_rows.append([
                _esc(c.get("framework") or "—"),
                Paragraph(_esc(c["control_name"]),
                          ParagraphStyle("d", fontName="Helvetica", fontSize=9.5,
                                         textColor=BRAND_DARK, leading=13)),
                str(c.get("status") or "—"),
                str(c.get("score") or "—"),
                _date(c.get("deadline")),
            ])
        story.append(_items_table(
            ["MARCO", "CONTROL", "ESTADO", "SCORE", "VENCE"],
            body_rows,
            [25 * mm, 75 * mm, 25 * mm, 18 * mm, 22 * mm],
            accent,
        ))
    else:
        story.append(Paragraph("<i>No hay controles registrados.</i>", S_BODY))
    return title, story


def build_supplier_doc(db: Session, row: dict[str, Any], kind: str = "supplier_evaluation") -> tuple[str, list]:
    """For supplier_evaluation. Source: suppliers."""
    accent = ACCENTS.get(kind, colors.HexColor("#4f46e5"))
    label_es = KIND_LABEL_ES.get(kind, "Evaluación de Proveedor")
    title = f"{label_es}: {row.get('name')}"
    status = str(row.get("status") or "ACTIVE").upper()
    story: list = []
    story += _hero(kind, title, row.get("name") or "Proveedor", status)

    fake_client = {"name": row.get("name"), "contact_email": row.get("contact_email")}
    story.append(_from_to_block(fake_client, [
        ("Categoría", str(row.get("category") or "—")),
        ("Contacto", row.get("contact_name")),
        ("Spend YTD", _money(row.get("spend_ytd"))),
        ("Valor de contrato", _money(row.get("contract_value"))),
        ("Performance", f"{row.get('performance_score')}/100" if row.get("performance_score") else "—"),
        ("Riesgo", str(row.get("risk_level") or "—").upper()),
    ]))
    story.append(Spacer(1, 18))

    if row.get("notes"):
        story.append(_section_title("Observaciones", accent))
        story.append(Spacer(1, 4))
        story += _markdown_paragraphs(row["notes"])

    certs = row.get("compliance_certs")
    if certs:
        try:
            clist = json.loads(certs) if isinstance(certs, str) else certs
        except Exception:
            clist = []
        if clist:
            story.append(_section_title("Certificaciones", accent))
            story.append(Spacer(1, 4))
            story.append(Paragraph(
                " &nbsp;·&nbsp; ".join(f"<b>{_esc(str(c))}</b>" for c in clist[:10]),
                S_BODY))
    return title, story


def build_health_card(db: Session, row: dict[str, Any], kind: str = "health_card") -> tuple[str, list]:
    """Customer Health card. Source: clients."""
    accent = ACCENTS.get(kind, colors.HexColor("#e11d48"))
    label_es = KIND_LABEL_ES.get(kind, "Health Card")
    title = f"{label_es}: {row.get('name')}"
    status = str(row.get("status") or "ACTIVE").upper()
    story: list = []
    story += _hero(kind, title, row.get("name") or "Cliente", status)

    health = row.get("health_score")
    arr = row.get("arr") or row.get("contract_value")

    story.append(_from_to_block(
        {"name": row.get("name"), "contact_email": row.get("primary_contact_email")},
        [
            ("Industria", row.get("industry")),
            ("Segmento", str(row.get("segment") or "—")),
            ("Contacto", row.get("primary_contact_name")),
            ("Rol", row.get("primary_contact_role")),
        ],
    ))
    story.append(Spacer(1, 18))

    big = ParagraphStyle("big", fontName="Helvetica-Bold", fontSize=22,
                          textColor=accent, leading=26)
    card_style = TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BRAND_PANEL),
        ("BOX", (0, 0), (-1, -1), 0.4, BRAND_LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ])
    def card(label: str, val: str) -> Table:
        t = Table([[Paragraph(label, S_LABEL)],
                   [Paragraph(_esc(val), big)]], colWidths=[39 * mm])
        t.setStyle(card_style)
        return t
    cards = Table([[
        card("HEALTH", f"{int(health)}" if health is not None else "—"), "",
        card("ARR", _money(arr)), "",
        card("CSAT", f"{float(row.get('csat')):.1f}" if row.get("csat") else "—"), "",
        card("NPS", str(row.get("nps") if row.get("nps") is not None else "—")),
    ]], colWidths=[39 * mm, 3 * mm, 39 * mm, 3 * mm, 39 * mm, 3 * mm, 39 * mm])
    story.append(cards)

    # Recent tickets
    tickets = db.execute(
        text("SELECT title, priority, status FROM support_tickets "
             "WHERE client_id = :cid AND is_deleted = FALSE "
             "ORDER BY created_at DESC LIMIT 6"),
        {"cid": row["id"]},
    ).mappings().all()
    if tickets:
        story.append(_section_title("Tickets recientes", accent))
        story.append(Spacer(1, 4))
        body_rows = [[
            Paragraph(_esc(t["title"]),
                      ParagraphStyle("d", fontName="Helvetica", fontSize=9.5,
                                     textColor=BRAND_DARK, leading=13)),
            str(t.get("priority") or "").upper(),
            str(t.get("status") or "").upper(),
        ] for t in tickets]
        story.append(_items_table(["TICKET", "PRIORIDAD", "ESTADO"],
                                    body_rows,
                                    [110 * mm, 25 * mm, 30 * mm], accent))

    if row.get("notes"):
        story.append(_section_title("Notas", accent))
        story.append(Spacer(1, 4))
        story += _markdown_paragraphs(row["notes"])
    return title, story


def build_bug_report(db: Session, row: dict[str, Any], kind: str = "bug_report") -> tuple[str, list]:
    """For bug_report. Source: support_tickets."""
    accent = ACCENTS.get(kind, colors.HexColor("#dc2626"))
    title = f"Bug Report: {row.get('title')}"
    status = str(row.get("status") or "OPEN").upper()
    client = _fetch_client(db, row.get("client_id"), row["workspace_id"])
    project = _fetch_project(db, row.get("project_id"), row["workspace_id"])
    story: list = []
    story += _hero(kind, row.get("title") or "Bug Report",
                    f"Ticket #{row.get('number') or row['id'][:8]}", status)

    story.append(_from_to_block(client, [
        ("Ticket", row.get("number") or row["id"][:8]),
        ("Proyecto", project["name"] if project else "—"),
        ("Prioridad", str(row.get("priority") or "—").upper()),
        ("Resuelto", _date(row.get("resolved_at"))),
    ]))
    story.append(Spacer(1, 18))

    story.append(_section_title("Descripción", accent))
    story.append(Spacer(1, 4))
    if row.get("description"):
        story += _markdown_paragraphs(row["description"])
    else:
        story.append(Paragraph("<i>Sin descripción.</i>", S_BODY))
    return title, story


def build_capacity_plan(db: Session, row: dict[str, Any], kind: str = "capacity_plan") -> tuple[str, list]:
    """Aggregate role_capacity entries. Source row is workspace (or any sentinel)."""
    accent = ACCENTS.get(kind, colors.HexColor("#475569"))
    label_es = KIND_LABEL_ES.get(kind, "Plan de Capacidad")
    workspace_id = row["workspace_id"]
    title = f"{label_es} · {datetime.utcnow().strftime('%Y-%m-%d')}"
    story: list = []
    story += _hero(kind, title, "Vista de capacidad por rol", "ACTIVO")

    rows = db.execute(
        text("SELECT role, available_fte, committed_fte, forecast_demand, week_start "
             "FROM role_capacity WHERE workspace_id = :ws AND is_deleted = FALSE "
             "ORDER BY week_start DESC, role LIMIT 50"),
        {"ws": workspace_id},
    ).mappings().all()

    total_avail = sum(float(r.get("available_fte") or 0) for r in rows)
    total_cmtd = sum(float(r.get("committed_fte") or 0) for r in rows)
    util = int(round(total_cmtd / total_avail * 100)) if total_avail else 0

    big = ParagraphStyle("big", fontName="Helvetica-Bold", fontSize=22,
                          textColor=accent, leading=26)
    card_style = TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BRAND_PANEL),
        ("BOX", (0, 0), (-1, -1), 0.4, BRAND_LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ])
    def card(label: str, val: str) -> Table:
        t = Table([[Paragraph(label, S_LABEL)],
                   [Paragraph(_esc(val), big)]], colWidths=[52 * mm])
        t.setStyle(card_style)
        return t
    cards = Table([[card("FTE DISPONIBLE", f"{total_avail:.1f}"), "",
                    card("FTE COMPROMETIDO", f"{total_cmtd:.1f}"), "",
                    card("UTILIZACIÓN", f"{util}%")]],
                  colWidths=[52 * mm, 3 * mm, 52 * mm, 3 * mm, 52 * mm])
    story.append(cards)
    story.append(Spacer(1, 14))

    if rows:
        story.append(_section_title("Capacidad por rol y semana", accent))
        story.append(Spacer(1, 4))
        body_rows = []
        for r in rows[:30]:
            avail = float(r.get("available_fte") or 0)
            cmtd = float(r.get("committed_fte") or 0)
            u = int(round(cmtd/avail*100)) if avail else 0
            body_rows.append([
                _esc(r.get("role") or "—"),
                _date(r.get("week_start")),
                f"{avail:.1f}",
                f"{cmtd:.1f}",
                f"{u}%",
            ])
        story.append(_items_table(
            ["ROL", "SEMANA", "DISPONIBLE", "COMPROMETIDO", "USO"],
            body_rows,
            [50 * mm, 30 * mm, 30 * mm, 30 * mm, 25 * mm],
            accent,
        ))
    else:
        story.append(Paragraph("<i>Sin entradas de capacidad.</i>", S_BODY))
    return title, story


def build_invoice_statement(db: Session, row: dict[str, Any], kind: str = "statement") -> tuple[str, list]:
    """Statement of account — list invoices for a client. Source row is a client."""
    accent = ACCENTS.get(kind, ACCENTS["invoice"])
    label_es = KIND_LABEL_ES.get(kind, "Estado de Cuenta")
    title = f"{label_es}: {row.get('name')}"
    story: list = []
    story += _hero(kind, title, row.get("name") or "Cliente", "EMITIDO")

    fake_client = {"name": row.get("name"), "contact_email": row.get("primary_contact_email")}
    story.append(_from_to_block(fake_client, [
        ("Periodo", datetime.utcnow().strftime("%Y-%m")),
        ("Generado", _date(datetime.utcnow())),
    ]))
    story.append(Spacer(1, 14))

    invoices = db.execute(
        text("SELECT folio, number, issue_date, due_date, amount, currency, status "
             "FROM invoices WHERE client_id = :cid AND is_deleted = FALSE "
             "ORDER BY issue_date DESC LIMIT 50"),
        {"cid": row["id"]},
    ).mappings().all()

    total = sum(float(i.get("amount") or 0) for i in invoices)
    paid = sum(float(i.get("amount") or 0) for i in invoices
                if (i.get("status") or "").upper() == "PAID")
    outstanding = total - paid

    big = ParagraphStyle("big", fontName="Helvetica-Bold", fontSize=20,
                          textColor=accent, leading=24)
    card_style = TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BRAND_PANEL),
        ("BOX", (0, 0), (-1, -1), 0.4, BRAND_LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ])
    def card(label: str, val: str) -> Table:
        t = Table([[Paragraph(label, S_LABEL)],
                   [Paragraph(_esc(val), big)]], colWidths=[52 * mm])
        t.setStyle(card_style)
        return t
    cards = Table([[card("FACTURADO", _money(total)), "",
                    card("COBRADO", _money(paid)), "",
                    card("PENDIENTE", _money(outstanding))]],
                  colWidths=[52 * mm, 3 * mm, 52 * mm, 3 * mm, 52 * mm])
    story.append(cards)
    story.append(Spacer(1, 14))

    if invoices:
        story.append(_section_title("Facturas del periodo", accent))
        story.append(Spacer(1, 4))
        body_rows = []
        for i in invoices:
            body_rows.append([
                _esc(i.get("folio") or i.get("number") or "—"),
                _date(i.get("issue_date")),
                _date(i.get("due_date")),
                str(i.get("status") or "—").upper(),
                _money(i.get("amount"), i.get("currency") or "MXN"),
            ])
        story.append(_items_table(
            ["FOLIO", "EMITIDA", "VENCE", "ESTADO", "MONTO"],
            body_rows,
            [40 * mm, 25 * mm, 25 * mm, 30 * mm, 45 * mm],
            accent,
        ))
    return title, story


def build_siop_weekly(db: Session, row: dict[str, Any], kind: str = "siop_weekly") -> tuple[str, list]:
    """SIOP weekly review. Source: siop_scenarios."""
    accent = ACCENTS.get(kind, colors.HexColor("#0891b2"))
    title = f"SIOP Weekly: {row.get('name')}"
    story: list = []
    story += _hero(kind, title,
                    f"Horizonte {row.get('horizon_weeks') or 12} semanas",
                    "BASELINE" if row.get("is_baseline") else "ACTIVO")

    story.append(_from_to_block(None, [
        ("Escenario", row.get("name")),
        ("Horizonte", f"{row.get('horizon_weeks') or 12} semanas"),
        ("Tipo", "Baseline" if row.get("is_baseline") else "Alterno"),
        ("Generado", _date(row.get("created_at"))),
    ]))
    story.append(Spacer(1, 14))

    if row.get("description"):
        story.append(_section_title("Descripción", accent))
        story.append(Spacer(1, 4))
        story.append(Paragraph(_esc(row["description"]), S_BODY))

    for fld, label in [("assumptions", "Supuestos"), ("results", "Resultados")]:
        val = row.get(fld)
        if val:
            try:
                data = json.loads(val) if isinstance(val, str) else val
            except Exception:
                data = None
            if data:
                story.append(_section_title(label, accent))
                story.append(Spacer(1, 4))
                if isinstance(data, dict):
                    pairs = [(k.replace("_", " "),
                               json.dumps(v, default=str)[:80] if isinstance(v, (dict, list)) else str(v))
                              for k, v in list(data.items())[:12]]
                    story.append(_kv_grid(pairs))
                else:
                    story.append(Paragraph(_esc(json.dumps(data, default=str)[:1500]), S_BODY))
    return title, story


# Generic fallback for kinds without a dedicated builder
def build_generic(db: Session, row: dict[str, Any], kind: str) -> tuple[str, list]:
    title = row.get("title") or row.get("name") or f"{kind.title()} {row.get('folio', '')}"
    story: list = []
    story += _hero(kind, title, f"Workspace: {row['workspace_id']}",
                    str(row.get("status") or "").upper() or None)
    pairs = []
    skip = {"id", "workspace_id", "is_deleted", "deleted_at", "metadata_json"}
    for k, v in row.items():
        if k in skip or v is None:
            continue
        if isinstance(v, (dict, list)):
            v = json.dumps(v, default=str)[:200]
        if isinstance(v, str) and len(v) > 300:
            v = v[:300] + "…"
        pairs.append((k.replace("_", " "), str(v)))
    story.append(_kv_grid(pairs[:18]))
    return title, story


# ════════════════════════════════════════════════════════════════════════
# Registry + dispatch
# ════════════════════════════════════════════════════════════════════════

# kind → (table, builder)
KIND_BUILDERS: dict[str, tuple[str, Callable[[Session, dict[str, Any], str], tuple[str, list]]]] = {
    # ── Sales / commercial
    "quote":              ("quotes",         build_quote),
    "supplier_quote":     ("quotes",         build_quote),
    "proposal":           ("proposals",      build_proposal),
    "sow":                ("proposals",      build_proposal),
    "renewal_proposal":   ("proposals",      build_proposal),
    "onepager":           ("proposals",      build_proposal),
    "tech_brief":         ("proposals",      build_proposal),
    "wbs_estimate":       ("proposals",      build_proposal),
    "discovery_report":   ("proposals",      build_proposal),
    "case_study":         ("projects",       build_project_status),

    # ── Contracts
    "contract":           ("contracts",      build_contract),
    "nda":                ("contracts",      build_contract),
    "msa":                ("contracts",      build_contract),
    "baa":                ("contracts",      build_contract),

    # ── Change / billing
    "change_order":       ("change_orders",  build_change_order),
    "invoice":            ("invoices",       build_invoice),
    "po":                 ("invoices",       build_invoice),
    "statement":          ("clients",        build_invoice_statement),

    # ── Meetings
    "minute":             ("meetings",       build_meeting_doc),
    "kickoff":            ("meetings",       build_meeting_doc),
    "internal_kickoff":   ("meetings",       build_meeting_doc),
    "qbr":                ("meetings",       build_meeting_doc),
    "postmortem":         ("meetings",       build_meeting_doc),
    "daily_standup":      ("meetings",       build_meeting_doc),
    "acceptance":         ("meetings",       build_meeting_doc),
    "pmo_review":         ("meetings",       build_meeting_doc),
    "uat_report":         ("meetings",       build_meeting_doc),
    "onboarding_pack":    ("meetings",       build_meeting_doc),

    # ── Sprint / delivery
    "sprint_report":      ("sprints",        build_sprint_doc),
    "sprint_plan":        ("sprints",        build_sprint_doc),
    "sprint_retro":       ("sprints",        build_sprint_doc),
    "status_weekly":      ("projects",       build_project_status),

    # ── Risk / compliance
    "risk_register":      ("projects",       build_risk_register),
    "compliance_audit":   ("projects",       build_compliance_audit),

    # ── Suppliers
    "supplier_evaluation": ("suppliers",     build_supplier_doc),

    # ── Customer Health
    "health_card":        ("clients",        build_health_card),

    # ── Support
    "bug_report":         ("support_tickets", build_bug_report),

    # ── Capacity / SIOP
    "capacity_plan":      ("workspaces",     build_capacity_plan),
    "timesheet":          ("workspaces",     build_capacity_plan),
    "siop_weekly":        ("siop_scenarios", build_siop_weekly),
}


def _table_for_kind(kind: str) -> str:
    if kind in KIND_BUILDERS:
        return KIND_BUILDERS[kind][0]
    raise ValueError(f"Unsupported PDF kind: {kind}")


# ════════════════════════════════════════════════════════════════════════
# Public API
# ════════════════════════════════════════════════════════════════════════

class PdfGenerationError(Exception):
    pass


def generate_pdf(
    *,
    workspace_id: str,
    user_id: str,
    kind: str,
    source_id: str,
    overrides: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Generate a PDF for the given source row and upsert a documents record.

    Returns the documents row dict.
    """
    if kind not in KIND_BUILDERS:
        raise PdfGenerationError(f"Unsupported kind: {kind}")
    table, builder = KIND_BUILDERS[kind]

    with SessionLocal() as db:
        row = _fetch_one(db, table, source_id, workspace_id)
        if not row:
            raise PdfGenerationError(f"{table} row {source_id} not found")

        # If caller asks for a "final" version, swap the status so neither
        # the hero badge nor the BORRADOR watermark are rendered, without
        # mutating the underlying record.
        force_final = bool((overrides or {}).get("final"))
        if force_final:
            row = dict(row)
            row["status"] = overrides.get("status_label") or "EJECUTADO"

        # Builders that accept `overrides` (currently only build_contract).
        try:
            title, story = builder(db, row, kind, overrides=overrides)  # type: ignore[call-arg]
        except TypeError:
            title, story = builder(db, row, kind)
        # Derive a folio: use existing if present, else build a synthetic
        # one from the kind prefix and a short id slice for kinds whose
        # source table doesn't have a folio column (meetings, contracts, etc.)
        folio = row.get("folio") or row.get("number")
        if not folio:
            prefix = _KIND_PREFIX.get(kind, kind[:3].upper())
            year = datetime.utcnow().strftime("%Y")
            folio = f"{prefix}-{year}-{str(source_id)[:6].upper()}"

        # Look up existing documents row by (source_table, source_id) → bump version
        existing = db.execute(
            text("SELECT id, version FROM documents "
                 "WHERE workspace_id = :ws AND source_table = :st AND source_id = :sid "
                 "  AND is_deleted = FALSE ORDER BY version DESC LIMIT 1"),
            {"ws": workspace_id, "st": table, "sid": source_id},
        ).mappings().first()
        version = (existing["version"] + 1) if existing else 1

        # Resolve storage path
        ws_dir = PDF_DIR / workspace_id
        ws_dir.mkdir(parents=True, exist_ok=True)
        safe_folio = str(folio).replace("/", "_")
        out_path = ws_dir / f"{safe_folio}_v{version}.pdf"

        # Render
        status_lower = str(row.get("status") or "").lower()
        is_draft = (status_lower in ("", "draft", "borrador")) and not force_final
        client_for_subtitle = _fetch_client(db, row.get("client_id"), workspace_id)
        subtitle_right = client_for_subtitle["name"] if client_for_subtitle else ""
        # Compute effective issuer (dev profile + per-doc developer overrides)
        try:
            from lib.developer_profile import get_developer_profile, merge_overrides
            issuer_eff = merge_overrides(
                get_developer_profile(),
                (overrides or {}).get("developer") or {},
            )
        except Exception:
            issuer_eff = None
        doc = _make_doc(out_path, kind, draft=is_draft,
                        folio=str(folio), subtitle_right=subtitle_right,
                        issuer=issuer_eff)
        doc.build(story)
        size_bytes = out_path.stat().st_size

        # Upsert documents row
        now = datetime.utcnow()
        meta = {
            "source_folio": folio,
            "title": title,
            "regenerated_from_version": existing["version"] if existing else None,
        }
        new_doc_id = str(uuid.uuid4())
        if existing:
            # Soft-supersede prior version: keep prior, insert new version row
            pass

        # Folio for the documents row: append -vN when regenerating, since
        # there's a UNIQUE (workspace_id, folio) constraint.
        doc_folio = str(folio) if version == 1 else f"{folio}-v{version}"

        db.execute(
            text(
                "INSERT INTO documents "
                "(id, created_at, updated_at, workspace_id, is_deleted, "
                " folio, kind, source_table, source_id, "
                " client_id, project_id, deal_id, version, status, title, "
                " storage_path, pdf_size_bytes, metadata_json, generated_by) "
                "VALUES (:id, :now, :now, :ws, FALSE, "
                " :folio, :kind, :st, :sid, "
                " :cid, :pid, :did, :ver, 'draft', :title, "
                " :path, :sz, :meta, :gen)"
            ),
            {
                "id": new_doc_id, "now": now, "ws": workspace_id,
                "folio": doc_folio[:40], "kind": kind,
                "st": table, "sid": source_id,
                "cid": row.get("client_id"), "pid": row.get("project_id"),
                "did": row.get("deal_id"),
                "ver": version, "title": title[:255],
                "path": str(out_path), "sz": size_bytes,
                "meta": json.dumps(meta, default=str),
                "gen": user_id,
            },
        )
        record_audit(
            db, workspace_id=workspace_id, user_id=user_id,
            module="documents", action="generate.pdf",
            record_id=new_doc_id,
            payload_delta={"kind": kind, "source_id": source_id, "version": version,
                           "size_bytes": size_bytes, "folio": str(folio)},
        )
        db.commit()

        return {
            "id": new_doc_id,
            "folio": str(folio),
            "kind": kind,
            "version": version,
            "storage_path": str(out_path),
            "pdf_size_bytes": size_bytes,
            "title": title,
        }


def read_pdf_bytes(document_id: str, workspace_id: str) -> tuple[bytes, str, str]:
    """Return (bytes, filename, content_type) for a documents row."""
    with SessionLocal() as db:
        row = db.execute(
            text("SELECT folio, version, storage_path FROM documents "
                 "WHERE id = :id AND workspace_id = :ws AND is_deleted = FALSE"),
            {"id": document_id, "ws": workspace_id},
        ).mappings().first()
    if not row or not row["storage_path"]:
        raise PdfGenerationError("Document or PDF not found")
    p = Path(row["storage_path"])
    if not p.exists():
        raise PdfGenerationError("PDF file missing on disk")
    fname = f"{row['folio']}_v{row['version']}.pdf"
    return p.read_bytes(), fname, "application/pdf"
