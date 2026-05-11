# Diagnóstico MVP y Plan de Acción

> **Fecha:** 2026-05-02 17:45 (UTC-06:00, Mexico City)
> **Autor:** Auditoría técnica + plan ejecutivo
> **Alcance:** Estado de producción, gaps para MVP demo, foundation de documentos/PDFs

---

## 1. Estado actual en producción

**Host:** `187.77.3.106` (puerto SSH 2222)
**Despliegue:** `/var/www/sioptool/{backend,frontend,storage}`
**Procesos pm2:** `siop-backend` (id 18, :8007) · `siop-frontend` (id 17, :3007)
**Base de datos:** MariaDB local · DB `siop_demo` · usuario `siop_app`

### Health check (2026-05-02)
- Backend: 12/12 endpoints `200 OK` (clients, deals, meetings, projects, rfq, contracts, tasks, sprints, suppliers, programs, insights)
- Frontend: `307` (redirect normal de Next.js a `/overview`)
- Migración 006 aplicada: `deals.expected_close`, `next_action`, `notes` ✅
- Audit log activo: 70 entradas de demo ✅

### Tablas en `siop_demo` (29)
`action_items, ai_outputs, approvals, audit_log, clients, compliance_controls, contracts, deals, demand_forecast, insights, invoices, ju_files, meeting_analyses, meetings, messages, organizations, program_projects, programs, projects, rfq_sessions, risk_items, role_capacity, siop_scenarios, sprints, suppliers, support_tickets, tasks, users, workspaces`

### Datos demo activos
4 clients · 3 deals · 6 meetings · 1 project · 3 rfq · 1 contract · 17 tasks · 2 sprints · 1 supplier · 1 program · 1 insight

---

## 2. Pipeline audio → IA

19 analizadores cubren 14/16 etapas del ciclo de vida de software factory.

| Etapa | Analyzer | UI |
|---|---|---|
| Lead intake | `lead_qualification` | ✅ |
| Calificación | `sales_followup` | ✅ |
| RFQ / Discovery | `discovery_rfq` | ✅ |
| Kickoff | `project_kickoff` | ✅ |
| Sprint planning | `sprint_planning` | ✅ |
| Daily standup | `daily_standup` | 🔴 falta UI |
| Sprint review | `sprint_review` | 🔴 falta UI |
| Sprint retro | `sprint_retro` | 🔴 falta UI |
| UAT | `uat_session` | 🔴 falta UI |
| Change Request | `change_request` | 🔴 falta UI + tabla destino |
| Incident postmortem | `incident_postmortem` | 🔴 falta UI |
| QBR | `client_qbr` | ✅ |
| SIOP weekly | `siop_weekly` | ✅ |
| PMO portfolio | `pmo_review` | 🔴 falta dashboard |
| Status semanal cliente | `client_weekly_status` | ✅ |
| Compliance audit | `compliance_audit` | ✅ |
| Supplier negotiation | `supplier_negotiation` | ✅ |
| Internal kickoff | `internal_kickoff` | ✅ |
| Status update (fallback) | `status_update` | ✅ |

**Cobertura:** 13/19 con UI completa, 6/19 con analyzer listo pero sin pantalla.

---

## 3. Gaps detectados para MVP

### 3.1 Tablas faltantes (foundation)
- `documents` — repositorio universal de PDFs con folio, versión, status
- `quotes` + `quote_items` — cotizaciones con desglose
- `proposals` — propuesta comercial (puede contener quote)
- `change_orders` — destino del analyzer `change_request` (hoy huérfano)
- `document_sequences` — numeración secuencial atómica por workspace+kind+año

### 3.2 Mejoras a tablas existentes
- `invoices` — verificar columnas; falta router/UI

### 3.3 Documentos PDF a generar (catálogo completo)

**Tier 1 MVP (10):** Minuta, Cotización, Propuesta, SOW, Contrato, Acta de Kickoff, Sprint Report, Status Semanal, QBR, Postmortem.

**Tier 2 Post-MVP (10):** NDA, MSA, Change Order, Discovery Report, Sprint Plan, Sprint Retro, UAT Report, PMO Review, Risk Register, Renewal Proposal.

**Tier 3 Operación (20):** Invoice, PO, Timesheet, Case Study, Customer Health Card, Bug Report, Acta de aceptación, One-pager cliente, Brief técnico, Estimación WBS, Capacity Plan, Compliance Audit Report, Reporte evaluación proveedor, Estado de cuenta cliente, Onboarding Pack, Internal Kickoff, Daily Standup Summary, BAA, Quote a proveedor, Reporte SIOP semanal.

---

## 4. Bloqueadores diferidos (post-MVP, no MVP)

| Issue | Por qué se posterga |
|---|---|
| Auth real (JWT/SSO) | MVP usa `DEMO_PRINCIPAL`; suficiente para demo |
| Celery + Redis | `BackgroundTasks` aguanta volumen demo |
| Rate limiting | Demo controlada |
| Tests + CI | No bloquea demo |
| Sentry / observabilidad | Logs pm2 bastan |
| Migración audio a S3 | Disco local del VPS sirve |
| Cost tracking por workspace | Sin clientes reales aún |
| Rotación de secretos / `siop-db-pass.txt` fuera de git | Sí debería hacerse antes de cualquier cliente real |

---

## 5. Plan de acción — 3 semanas

### Semana 1 — Foundation (DB + Backend + UI mínima)
| Día | Entregable |
|---|---|
| 1 | Migración `007_documents_quotes_proposals.sql` + función `next_folio()` |
| 2 | Modelos Pydantic + servicios CRUD + routers para documents/quotes/proposals/change_orders |
| 3 | UIs `/quotes`, `/proposals`, `/change-orders`, `/documents` (listado + new + detalle) |
| 4 | Wiring analyzer `change_request` → `change_orders`; router/UI de invoices |
| 5 | Buffer + testing manual end-to-end |

### Semana 2 — Motor PDF + 10 plantillas Tier 1
| Día | Entregable |
|---|---|
| 6 | Stack PDF (WeasyPrint + Jinja2) + `_base.html` + `_styles.css` con branding LongevAI |
| 7 | `pdf_service.py` + endpoint `GET /api/documents/{id}/pdf` + auto-row en `documents` |
| 8 | Plantillas: minute, quote, proposal, sow |
| 9 | Plantillas: contract, kickoff, sprint_report, status_weekly |
| 10 | Plantillas: qbr, postmortem + botón "Generar PDF" en cada detalle |

### Semana 3 — UIs faltantes SIOP + pulido
| Día | Entregable |
|---|---|
| 11 | UIs Standup + Sprint Review + Sprint Retro |
| 12 | UIs UAT + Incident |
| 13 | Dashboard PMO Portfolio + onboarding/empty states |
| 14 | Seed demo enriquecido + retry/timeout en IA + error handler global |
| 15 | Ensayo end-to-end + branding final |

---

## 6. Por qué este orden es correcto

1. **Sin tablas no hay folio.** Generar PDFs primero deja archivos huérfanos sin versión ni listado.
2. **El analyzer `change_request` ya está esperando una tabla destino que no existe** — bug latente.
3. La tabla `documents` permite el flujo: aprobar análisis → registro con folio → PDF → listado en `/documents`. **Eso es lo que vende.**
4. Cuando lleguen los PDFs en semana 2, viven en una estructura sólida y se versionan solos.

---

## 7. Stack y convenciones acordadas

- **PDF engine:** WeasyPrint + Jinja2 (HTML→PDF)
- **Folio format:** `{KIND}-{YEAR}-{NNNN}` ej. `PRO-2026-0001`, `INV-2026-0042`
- **Numeración:** atómica vía `document_sequences` con `INSERT … ON DUPLICATE KEY UPDATE last_number=last_number+1`
- **Almacenamiento PDF:** `/var/www/sioptool/storage/documents/{workspace_id}/{folio}.pdf`
- **Versionado:** mismo `source_table+source_id` permite múltiples rows con `version` incremental

---

## 8. Métricas de éxito MVP

- ✅ Subir un audio de reunión → 5 PDFs distintos generados sin tocar formularios
- ✅ Folio único, secuencial, por workspace
- ✅ Listado `/documents` con búsqueda por kind/cliente/proyecto/folio
- ✅ Aprobar análisis IA crea registros en tablas correctas (incluyendo change_orders)
- ✅ Demo end-to-end de 15 min sin caídas: grabar → transcribir → analizar → aprobar → PDF firmable

---

*Última actualización: 2026-05-02 17:45 (UTC-06:00)*
