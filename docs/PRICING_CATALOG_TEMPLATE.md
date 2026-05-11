# LongevAI – Catálogo de Precios (plantilla)

**Instrucciones:**
- Todos los precios en **MXN sin IVA** (yo sumo 16% al final).
- **Días = días hábiles** (5 días = 1 semana).
- Llena los campos `dias:` y `precio:` después de los `=`.
- Si NO ofreces ese servicio, escribe `precio: NA` y lo elimino del catálogo.
- Si quieres aceptar la sugerencia tal cual, escribe `precio: ok` (uso el valor sugerido).
- En multiplicadores escribe el factor (ej. `1.25` = +25%). `NA` para descartar.
- En porcentajes escribe sólo el número (ej. `15` = 15%).

---

## A. TIPOS DE PROYECTO  (precio base que ya incluye equipo + duración)

```yaml
1_landing_simple:        # 1-3 secciones, form contacto, sin login
  dias: 2
  precio: 12000

2_sitio_informativo:     # 5-10 páginas, CMS básico, SEO básico
  dias: 5
  precio: 30000          # sugerencia

3_web_app_basica:        # CRUD + auth, 5-10 pantallas, 1 rol
  dias:                  # sugerencia 15
  precio:                # sugerencia 80000

4_web_app_estandar:      # 15-25 pantallas, roles, dashboards
  dias:                  # sugerencia 40
  precio:                # sugerencia 220000

5_web_app_compleja:      # multi-tenant, 30+ pantallas, integraciones
  dias:                  # sugerencia 70
  precio:                # sugerencia 480000

6_ecommerce_basico:      # Shopify-like, hasta 100 productos, 1 pasarela
  dias:                  # sugerencia 25
  precio:                # sugerencia 140000

7_ecommerce_avanzado:    # multi-tienda, B2B, custom checkout
  dias:                  # sugerencia 60
  precio:                # sugerencia 380000

8_mobile_app_basica:     # 1 plataforma, MVP, 5-10 pantallas
  dias:                  # sugerencia 35
  precio:                # sugerencia 180000

9_mobile_app_full:       # iOS+Android, push, pagos, offline
  dias:                  # sugerencia 65
  precio:                # sugerencia 420000

10_marketplace:          # 2 lados, comisiones, ratings
  dias:                  # sugerencia 75
  precio:                # sugerencia 520000

11_saas_multitenant:     # tenants, billing, plans
  dias:                  # sugerencia 80
  precio:                # sugerencia 580000

12_erp_interno:          # ERP a la medida, módulos varios
  dias:                  # sugerencia 90
  precio:                # sugerencia 650000

13_integracion_only:     # conectar 2+ sistemas, sin UI nueva
  dias:                  # sugerencia 10
  precio:                # sugerencia 60000

14_data_pipeline:        # ETL + dashboard analytics
  dias:                  # sugerencia 25
  precio:                # sugerencia 150000

15_ai_agent_basico:      # RAG sobre docs, 1 canal
  dias:                  # sugerencia 20
  precio:                # sugerencia 110000

16_ai_agent_avanzado:    # multi-tool, multi-canal, fine-tune
  dias:                  # sugerencia 50
  precio:                # sugerencia 320000

17_chatbot_whatsapp:     # WhatsApp standalone con IA
  dias:                  # sugerencia 15
  precio:                # sugerencia 80000

18_lms_cursos:           # plataforma de cursos online
  dias:                  # sugerencia 55
  precio:                # sugerencia 360000

19_crm_medida:           # CRM a la medida
  dias:                  # sugerencia 50
  precio:                # sugerencia 320000

20_pos:                  # punto de venta web/tablet
  dias:                  # sugerencia 35
  precio:                # sugerencia 200000
```

---

## B. ADD-ONS  (suman al precio base; precio fijo independiente del proyecto)

```yaml
21_pasarela_pagos:           # Stripe / MercadoPago / Conekta (1)
  precio:                    # sugerencia 35000
22_facturacion_cfdi:         # CFDI 4.0 México
  precio:                    # sugerencia 28000
23_login_social_sso:         # Google, Apple, Microsoft
  precio:                    # sugerencia 15000
24_2fa_otp:                  # OTP por SMS/email/app
  precio:                    # sugerencia 12000
25_chatbot_wa_embebido:      # widget WA embebido en otra app
  precio:                    # sugerencia 30000
26_push_movil:
  precio:                    # sugerencia 18000
27_email_transaccional:      # SendGrid/Resend setup
  precio:                    # sugerencia 10000
28_sms_transaccional:
  precio:                    # sugerencia 12000
29_export_pdf:
  precio:                    # sugerencia 15000
30_export_excel:
  precio:                    # sugerencia 12000
31_multi_idioma:
  precio:                    # sugerencia 18000
32_multi_moneda:
  precio:                    # sugerencia 15000
33_admin_avanzado:           # backoffice con métricas
  precio:                    # sugerencia 35000
34_carga_masiva_csv:
  precio:                    # sugerencia 12000
35_mapas_geo:                # Google Maps / Mapbox
  precio:                    # sugerencia 18000
36_firma_electronica:        # e-sign, Mifiel/DocuSign
  precio:                    # sugerencia 25000
37_videollamada:             # Twilio/Daily embebido
  precio:                    # sugerencia 30000
38_app_movil_companion:      # app además de la web (no full)
  precio:                    # sugerencia 90000
39_pwa_offline:
  precio:                    # sugerencia 20000
40_busqueda_avanzada:        # Elastic/Algolia
  precio:                    # sugerencia 25000
41_recomendador_ml:          # ML embebido
  precio:                    # sugerencia 50000
42_ocr_docs:
  precio:                    # sugerencia 30000
43_gen_documentos:           # PDF/Word desde plantilla
  precio:                    # sugerencia 18000
44_calendario_agenda:
  precio:                    # sugerencia 22000
45_tickets_soporte:
  precio:                    # sugerencia 25000
46_auditoria_logs:
  precio:                    # sugerencia 15000
47_rbac_granular:            # roles + permisos finos
  precio:                    # sugerencia 25000
48_realtime_websockets:      # notificaciones in-app live
  precio:                    # sugerencia 28000
```

---

## C. INTEGRACIONES EXTERNAS  (cada una; suma al precio base)

```yaml
49_sap:                      # ERP SAP
  precio:                    # sugerencia 120000
50_odoo_sapb1_netsuite:
  precio:                    # sugerencia 70000
51_hubspot:
  precio:                    # sugerencia 35000
52_salesforce:
  precio:                    # sugerencia 60000
53_contabilidad_mx:          # Contpaqi, Aspel, QuickBooks
  precio:                    # sugerencia 40000
54_marketing:                # Mailchimp, ActiveCampaign
  precio:                    # sugerencia 20000
55_analytics:                # GA4, Mixpanel, Amplitude
  precio:                    # sugerencia 12000
56_paqueterias:              # DHL, FedEx, Estafeta
  precio:                    # sugerencia 30000
57_api_gobierno:             # SAT, IMSS, etc.
  precio:                    # sugerencia 50000
58_microsoft365_google:
  precio:                    # sugerencia 18000
59_zapier_make_n8n:
  precio:                    # sugerencia 10000
60_api_custom_sin_docs:      # API del cliente sin documentación
  precio:                    # sugerencia 45000
```

---

## D. MULTIPLICADORES  (factor que multiplica el subtotal A+B+C)

```yaml
61_industria_salud:          # HIPAA / COFEPRIS
  factor:                    # sugerencia 1.25
62_industria_finanzas:       # CNBV / PCI-DSS
  factor:                    # sugerencia 1.30
63_sla_24_7:
  factor:                    # sugerencia 1.20
64_migracion_legacy:
  factor:                    # sugerencia 1.15
65_ux_a_la_medida:           # no usa templates
  factor:                    # sugerencia 1.15
66_urgencia:                 # entrega <6 semanas
  factor:                    # sugerencia 1.30
67_multi_region_ha:          # alta disponibilidad
  factor:                    # sugerencia 1.20
68_iso27001_soc2:
  factor:                    # sugerencia 1.25
```

---

## E. SOPORTE / MANTENIMIENTO  (mensual recurrente, MXN/mes)

```yaml
69_tier_basico:              # hosting + bugs críticos
  precio_mes:                # sugerencia 8000
70_tier_estandar:            # + 8h dev/mes + monitoreo
  precio_mes:                # sugerencia 18000
71_tier_premium:             # + 20h dev/mes + SLA 8h
  precio_mes:                # sugerencia 35000
72_tier_enterprise:          # equipo dedicado parcial
  precio_mes:                # sugerencia 70000
```

---

## F. SERVICIOS PROFESIONALES PUNTUALES

```yaml
73_discovery_workshop:       # 1 día consultoría
  precio:                    # sugerencia 18000
74_consultoria_hora:         # tarifa por hora
  precio_hora:               # sugerencia 1500
75_capacitacion_sesion:      # sesión 2h con usuarios
  precio:                    # sugerencia 6000
76_auditoria_seguridad:
  precio:                    # sugerencia 45000
77_performance_audit:
  precio:                    # sugerencia 30000
78_ux_research:              # entrevistas + report
  precio:                    # sugerencia 35000
```

---

## G. INFRAESTRUCTURA  (mensual; opcional cobrar al cliente)

```yaml
79_hosting_basico:           # VPS pequeño (1-2 vCPU, 2-4GB)
  precio_mes:                # sugerencia 600
80_hosting_medio:            # VPS grande (4-8 vCPU, 16GB)
  precio_mes:                # sugerencia 2500
81_hosting_enterprise:       # K8s / multi-AZ
  precio_mes:                # sugerencia 12000
82_dominio_ssl:              # anual prorrateado
  precio_mes:                # sugerencia 80
83_storage_gb:               # MXN por GB/mes
  precio_gb_mes:             # sugerencia 8
84_cdn:
  precio_mes:                # sugerencia 500
```

---

## H. PARÁMETROS GLOBALES

```yaml
85_risk_buffer_pct:          # buffer de riesgo sobre subtotal
  pct:                       # sugerencia 15
86_iva_pct:
  pct: 16
87_descuento_pronto_pago:    # si anticipo >50%
  pct:                       # sugerencia 5
88_markup_comercial:         # NO usar si precios A/B/C ya son comerciales
  factor: 1.0                # dejar 1.0 si ya pusiste precios finales
89_tipo_cambio_usd_mxn:      # solo si cotizas algo en USD
  rate:                      # sugerencia 18.5
```

---

## I. EXTRAS (dime si falta algo)

```yaml
# Agrega aquí cualquier servicio/add-on que ofrezcas y no esté arriba.
# Formato:
# nombre_descriptivo:
#   tipo: addon | proyecto | recurrente | multiplicador
#   precio: XXXX
#   nota: "..."
```
