# Inventario Actual vs Blueprint — ALMASA-OS

**Versión:** v1.0  
**Fecha:** 10 de Mayo 2026  
**Origen:** Auditoría técnica exhaustiva del codebase vs 39 documentos /audit  
**Estado:** Referencia para transición FASE A (diseño) → FASE B (construcción)  
**Tagline:** Qué está construido, qué falta, y en qué orden atacar.

---

## 1. Métricas del Codebase Actual

| Métrica | Valor |
|---------|-------|
| Archivos .tsx | 493 |
| Archivos .ts (sin .tsx) | 95 |
| Total TypeScript | 588 |
| Tablas BD | ~100 |
| Views | 4 (empleados_segura, gmail_segura, profiles_chat, stock_bajo) |
| RPCs / Functions SQL | 19 expuestas + 80 PL/pgSQL |
| Triggers | 72 |
| Migraciones SQL | 343 |
| RLS statements | 117 |
| Policies | 428 |
| Edge Functions | 53 |
| Hooks custom | 37 |
| Rutas/páginas | 53 (42 protegidas, 8 públicas) |
| Roles definidos | 7 (admin, secretaria, vendedor, chofer, almacen, gerente_almacen, contadora) + cliente |
| Tests E2E | **0** (cero) |
| PDF generators | 5+ |
| Storage buckets usados | 7 |

---

## 2. Status por Módulo

### Módulos CORE (ya construidos)

| # | Módulo | Status | Archivos | Tablas | Notas |
|---|--------|--------|----------|--------|-------|
| 1 | Autenticación + Roles | ✅ | Auth.tsx, ProtectedRoute, useUserRoles | profiles, user_roles | 7 roles, 3 capas permisos, redirect inteligente |
| 2 | Dashboard / KPIs | ✅ | 22 widgets, useDashboardData (351 lín) | queries 27+ tablas | 34 KPIs, 11 alertas, auto-refresh 60s, 4 periodos |
| 3 | Productos | ✅ | Productos.tsx (1,281), SecretariaProductosTab (919) | productos (39 cols), categorias_productos | Form v4, IA normalización, anti-dup Levenshtein |
| 4 | Lista Precios | ✅ | AdminListaPreciosTab (636), 3 vistas rol | productos_historial_precios, revision_precio, precios_proveedor | Workflow CPP→revisión, calculadora margen, PDF+Excel |
| 5 | Clientes | ✅ | 21 componentes (~9,615 lín), 4 pages | clientes (42 cols), sucursales (27 cols), contactos, correos, créditos, frecuentes | Grupo→RS→PDE, IA detecta grupos, import Aspel, geo |
| 6 | Pedidos | ✅ | 15+ componentes, wizard 5 pasos | pedidos (38 cols), detalles (17 cols), historial_cambios | 9 estados, 4 canales, offline IndexedDB, alertas precio |
| 7 | Rutas | ✅ | 26 componentes (~10,691 lín) | rutas (39 cols), entregas (21 cols), carga_productos | IA suggest, GPS live, multi-persona, sellos |
| 8 | Inventario | ✅ | Inventario.tsx (1,299), 4+ tabs | inventario_lotes, inventario_movimientos, bodegas | Realtime, FEFO, triggers stock/CPP |
| 9 | Compras/OC | ✅ | 45 componentes, wizard legacy+v3 | ordenes_compra (14 estados), detalles, entregas | Folio atómico, conciliación, pagos, créditos proveedor |
| 10 | Facturación | 🟡 | Facturas.tsx (496), GenerarFacturaDialog | facturas (23 cols) | CFDI timbrar/cancelar/descargar. BUG #2: boolean facturado desincronizado |
| 11 | Cobranza/CxC | ✅ | 5 componentes (~2,025 lín) | cobros_pedido, pagos_cliente, pagos_cliente_detalle | creditoUtils 5 plazos 6 estados, dashboard morosos |
| 12 | Flota/Vehículos | ✅ | VehiculosTab (1,460), checkup (745), daños (875) | vehiculos (44 cols), checkups, verificaciones, mantenimientos | IA OCR docs, diagrama daños visual ÚNICO |
| 13 | RH/Empleados | ✅ | 17 componentes (~4,431 lín), Empleados.tsx (3,126) | empleados (42 cols), actas, vacaciones, historial_sueldo, docs_pendientes | Wizard alta, contrato PDF 987 lín, firma digital, IA expediente |
| 14 | Asistencia ZKTeco | ✅ | 7 componentes (~1,552 lín) | asistencia, zk_mapeo | Biométrico integrado, 3 reportes, premio asistencia |
| 15 | Chat | ✅ | Chat.tsx (1,295) | conversaciones, mensajes, participantes | Realtime, 4 tipos, presencia online |
| 16 | Correos/Gmail | ✅ | 15+4 componentes (~9,292 lín) | gmail_cuentas, correos_enviados, pedidos_acumulativos | OAuth multi-cuenta, IA parser email+Excel, inbox unificado |
| 17 | Fumigaciones | 🟡 | 3 componentes (922 lín) | Solo campos en productos | Flag+fecha, 4 estados. SIN historial (se sobreescribe) |
| 18 | Configuración | ✅ | 11 componentes (~3,595 lín) | configuracion_empresa, configuracion_flotilla, module_permissions | 7 tabs, 6 integraciones, permisos módulos |
| 19 | Rentabilidad | 🟡 | Rentabilidad.tsx (345) | queries pedidos+productos | Básico, sin utilidad 3 niveles |
| 20 | Almacén Tablet | ✅ | 40 componentes (~19,631 lín), 14 tabs | Usa inventario_lotes, carga_productos, etc. | Módulo MÁS GRANDE. QR, POS, auto-bodega WiFi/GPS |
| 21 | Chofer | ✅ | 6 componentes (~1,242 lín) | Usa rutas, entregas, chofer_ubicaciones | Firma digital, GPS background, QR scanner |
| 22 | Vendedor | ✅ | 40 componentes | Usa pedidos, clientes, productos | Offline queue, comisiones, cobranza, saldos |
| 23 | Secretaria | ✅ | 19 componentes | Multi-módulo | Panel dedicado con rutas, pedidos, inventario |
| 24 | Cotizaciones | ✅ | 11 componentes (~5,700 lín) | cotizaciones, detalles, envios | 4 patrones, conversión a pedido, Gmail envío |
| 25 | Lecaroz | ✅ | 6 componentes | cotizaciones_lecaroz, tandas | Mini-módulo vertical cliente grande |
| 26 | Portal Cliente | 🟡 | 4 componentes (~1,734 lín) | Usa clientes, pedidos, facturas | SIN ProtectedRoute explícito (bug seguridad) |
| 27 | Respaldos | ✅ | Respaldos.tsx (341) | Export 6 entidades | Export manual Excel/CSV |
| 28 | Proveedores v3 | ✅ | 32 componentes | proveedores, proveedor_productos, eventos, contactos | Score, KPIs 360, timeline, comparador precios |
| 29 | Devoluciones | 🟡 | 5 componentes (~2,290 lín) | devoluciones_proveedor, evidencias, créditos | RPC atómica creada. Bug #1B (cliente) NO implementado |
| 30 | Faltantes | 🟡 | 2 componentes (~702 lín) | Usa ordenes_compra_entregas + faltantes_proveedor | Trigger sync creado, pero modelos aún no 100% unificados |
| 31 | Conciliación | 🟡 | 4 componentes (~2,107 lín) | proveedor_facturas, factura_detalles | 3 paths (full/rápida/ajuste). CPP nunca llamado desde frontend |

### Módulos EDGE FUNCTIONS (53 funciones)

| Categoría | Funciones | Status |
|-----------|-----------|--------|
| Auth | create-user, delete-user, reset-user-password, create-client-user, lookup-login-user | ✅ |
| CFDI | timbrar-cfdi, cancelar-cfdi, descargar-cfdi, parse-cfdi-xml | ✅ |
| Gmail | gmail-api, gmail-auth, gmail-callback | ✅ |
| IA/OCR | analyze-employee-file-bundle, extract-factura-vehiculo, extract-license-expiry, extract-placas-vehiculo, extract-tarjeta-circulacion, normalize-product, suggest-routes, generate-truck-design | ✅ |
| Parsers | parse-order-email, parse-excel-order, parse-csf | ✅ |
| Email envío | send-invoice, send-order-authorized, send-delivery-confirmation, send-welcome, send-client-notification, send-secretary-notification, send-checkup-report, send-chofer-route-email | ✅ |
| Notificaciones | notificar-pedidos-programados, notificar-entregas-programadas, notificar-faltante-oc, notificar-cierre-oc, notificar-faltante-anticipado, notificar-solicitud-deposito, notificar-cancelacion-descarga, notificar-entrega-vendedor | ✅ |
| Push | send-push-notification | ✅ |
| Maps | geocode-addresses, get-place-details, get-route-directions, google-places-autocomplete | ✅ |
| Otros | auto-reschedule-deliveries, check-vehicle-documents-expiry, check-invoice-expiry-reminders, lookup-postal-code, resumen-diario, enviar-pedido-interno, check-caducidad-fumigacion, zk-attendance | ✅ |

---

## 3. Mapeo contra los 40 Gaps del Blueprint

### Gaps /audit/36 — Gestión Empresarial (8 gaps)

| Gap | Nombre | Status | Qué existe | Qué falta | Esfuerzo |
|-----|--------|--------|-----------|-----------|----------|
| A | Chat + WhatsApp Bridge | 🟡 | Chat básico funciona (1,295 lín). Sin WhatsApp API. | WhatsApp Business API, vincular mensajes a entidades, IA suggest | M |
| B | OKRs + Balanced Scorecard | 🔴 | Nada | Todo: tablas, UI, check-ins, vinculación datos | L |
| C | Project Management / Tasks | 🔴 | Nada | Todo: proyectos, tareas, Kanban, dependencias | L |
| D | Knowledge Base / Wiki | 🔴 | Nada | Todo: wiki, pgvector, SOPs, onboarding | M |
| E | Helpdesk / Tickets | 🔴 | Nada | Todo: tickets, SLA, categorías, asignación | M |
| H | Governance / Compliance | 🔴 | Nada | Todo: políticas, firmas, auditorías internas | M |
| CC | Gastos / Viáticos (Concur) | 🔴 | Nada | Todo: reportes gastos, OCR, CFDI, políticas | L |
| LL | Portal Contadora Externa | 🔴 | Nada | Todo: login contadora, exportaciones, workflow | M |

### Gaps /audit/37 — Operación Avanzada MX (18 gaps)

| Gap | Nombre | Status | Qué existe | Qué falta | Esfuerzo |
|-----|--------|--------|-----------|-----------|----------|
| F | WMS Móvil + Barcode | 🟡 | Almacén Tablet existe (40 componentes). Sin barcode scanner nativo, sin bin locations. | GS1 scanner, bin tracking, picking dirigido, geofencing | L |
| O | Complex Pricing & Rebates | 🟡 | Lista precios con descuento máximo. Sin tier pricing, vendor rebates. | Escalones volumen, rebates proveedor, effective dating | M |
| P | Backorder Management | 🔴 | Nada | Todo: tabla backorders, auto-asignación, notificación | S |
| Q | Wave/Batch Picking | 🔴 | Nada | Todo: consolidación picking, ruta óptima bodega | M |
| R | EDI Integration | 🔴 | Nada | Todo: ANSI X12, AS2/SFTP, trading partners | XL |
| S | B2B Portal Live Inventory | 🟡 | Portal cliente existe (4 componentes). Sin stock real-time. | Catálogo live, carrito, stock disponible | M |
| T | Shipping API (DHL/FedEx) | 🔴 | Nada | Todo: multi-carrier, rate shopping, labels | M |
| U | Multi-Warehouse Optimization | 🟡 | 3 bodegas modeladas. Sin transfer orders ni balanceo IA. | Transfer orders, fulfillment óptimo, stock balancing | M |
| V | **Carta Porte 3.1** | 🔴 | **NADA. Riesgo multas HOY.** | Todo: XML 3.1, catálogos SAT, timbrado, validación | **L** ⚠️ |
| W | Complementos SAT 2026 | 🟡 | Pagos 2.0 parcial en timbrar-cfdi. Sin hidrocarburos ni cambios ene-2026. | Auto-actualización catálogos, validación previa | M |
| Z | PLD / Antilavado | 🔴 | Nada | Todo: KYC, umbrales, reportes SSPLD | L |
| AA | GS1 / GTIN | 🔴 | Nada | Todo: membresía, códigos, migración 2D | S |
| DD | ANTAD Ready | 🔴 | Nada. Requiere EDI (R) + GS1 (AA) primero. | Compliance checklist, catálogo electrónico | M |
| HH | Cadena Frío + COFEPRIS | 🔴 | Nada | Todo: sensores IoT, bitácoras, certificación | XL |
| II | Mermas / Desperdicio IA | 🟡 | Baja caducidad existe (RPC). Sin predicción IA ni dashboard. | Predicción IA, FIFO/FEFO mejorado, dashboard | M |
| KK | **Contabilidad Electrónica SAT** | 🔴 | **NADA.** | Todo: catálogo cuentas, balanza XML, pólizas, Buzón Tributario | **L** ⚠️ |
| MM | **APIs Bancarias** | 🔴 | **NADA.** Solo dato BBVA en companyData.ts. | Todo: BBVA API, Banco Base, conciliación auto, webhooks | **L** ⚠️ |
| NN | Tesorería Multi-Bank | 🔴 | Pagos OC existen en compras. Sin tesorería formal. | Cuentas bancarias, movimientos, flujo caja, caja chica | L |

### Gaps /audit/38 — IA/Data/ESG/Seguridad (13 gaps)

| Gap | Nombre | Status | Qué existe | Qué falta | Esfuerzo |
|-----|--------|--------|-----------|-----------|----------|
| I | Multi-Agent Orchestration | 🔴 | Nada | Todo: agentes, orquestación, MCP, traces | XL |
| J | Agent Memory Bank | 🔴 | Nada | Todo: pgvector memoria, recall, olvido selectivo | L |
| K | Demand Forecasting ML | 🔴 | Nada | Todo: modelos LSTM/XGBoost, features, training | XL |
| L | Customer Data Platform | 🔴 | Datos dispersos en clientes/pedidos. Sin perfil unificado. | CDP profiles, RFM, identity resolution, next best action | L |
| M | Workflow No-Code | 🔴 | Nada | Todo: visual builder, templates, ejecución | XL |
| N | Process Mining | 🔴 | Nada | Todo: event logs, analysis, bottlenecks | L |
| G/FF | ESG NIIF S1+S2 | 🔴 | Nada | Todo: emisiones, reportes, métricas sociales | L |
| Y | App Tendero | 🔴 | Nada | Todo: app móvil tenderos, catálogo, pedidos | XL |
| BB | Big Data Demand Sensing | 🔴 | Nada | Todo: data warehouse, external data, signals | XL |
| GG | Ciberseguridad Enterprise | 🟡 | MFA no existe. RLS sí (428 policies). verify_jwt configurado. | MFA, WAF, SIEM, pentest, DLP, training | L |
| JJ | BCP/DRP | 🟡 | Backups parciales (Respaldos.tsx). Sin BCP/DRP formal. | Runbooks, RTO/RPO, simulacros, failover | M |
| — | Data Governance | 🔴 | Nada | Todo: MDM, lineage, quality, LFPDPPP | M |
| — | IA Responsable | 🔴 | Nada | Todo: ethics audits, bias, explainability | S |

### Otros gaps de /audit/26-35

| Gap | Nombre | Status | Qué existe | Qué falta | Esfuerzo |
|-----|--------|--------|-----------|-----------|----------|
| — | Anti-robo 7 capas (LA CORONA) | 🟡 | Firmas existen. GPS existe. Sin conciliación 9 momentos, sin score confianza, sin inventario ciego, sin verificación QR cliente. | Conciliación completa, hoja salida digital, score empleado | XL |
| — | Agente IA JOSAN | 🔴 | Nada | Todo: conversacional, tool use, UI flotante | L |
| — | WhatsApp Business pedidos | 🔴 | Solo wa.me links manuales | Todo: webhook, parser, confirmación | L |
| — | Voz a Pedido | 🔴 | Nada | Todo: Whisper, Claude parser | M |
| — | Reconocimiento Imagen | 🔴 | Nada | Todo: Claude Vision, inventario visual | M |
| — | Multi-Moneda/Divisas | 🔴 | Solo MXN en todo. campo cuenta_bancaria existe. | Tipos cambio, multi-moneda docs, G/L cambiario, Banxico | L |
| — | Importaciones | 🔴 | Nada | Todo: pedimentos, embarques, prorrateo, INCOTERMS | L |
| — | Exportaciones | 🔴 | Nada (preparado en diseño) | Todo cuando se active | XL |
| — | Anticipos/Préstamos | 🔴 | Solo campos periodo_comision, porcentaje_comision en empleados | Todo: tablas, workflow, LFT, pagaré | L |
| — | Cierres Contables | 🔴 | Nada formal. Solo cierre de caja manual. | Todo: periodos, checklist 20 pasos, lock, FCV | L |
| — | Seguros/Riesgos | 🟡 | Póliza seguro URL+vencimiento en vehiculos. Sin módulo. | Todo: aseguradoras, siniestros, coverage, primas | M |
| — | Portales VIP (Cliente+Proveedor) | 🟡 | Portal cliente existe sin ProtectedRoute. Sin portal proveedor. | Seguridad portal, proveedor sube CFDI, tracking Uber | L |
| — | Innovaciones MOAT | 🔴 | Nada | Todo: marketplace, blockchain, gamificación, churn, digital twin | XXL |

---

## 4. Resumen Ejecutivo de Gaps

| Categoría | Total | ✅ Construido | 🟡 Parcial | 🔴 No existe |
|-----------|-------|--------------|-----------|-------------|
| Gestión Empresarial (/audit/36) | 8 | 0 | 1 (chat) | 7 |
| Operación Avanzada MX (/audit/37) | 18 | 0 | 6 | 12 |
| IA/Data/ESG/Seguridad (/audit/38) | 13 | 0 | 2 | 11 |
| Otros (26-35) | ~15 | 0 | 3 | 12 |
| **TOTAL** | **~54** | **0** | **12** | **42** |

**Conclusión: De los 40+ gaps identificados, CERO están 100% construidos. 12 tienen base parcial. 42 son greenfield.**

---

## 5. Lo que SÍ está BIEN construido (fortalezas)

1. **Almacén Tablet** — 40 componentes, 19,631 líneas. Módulo más completo.
2. **Compras/OC** — 45 componentes, 14 estados, folio atómico, wizard completo.
3. **Clientes** — 21 componentes, 9,615 líneas, jerarquía Grupo→RS→PDE.
4. **Correos/Gmail** — 15+4 componentes, 9,292 líneas, IA parser email+Excel.
5. **Rutas** — 26 componentes, 10,691 líneas, IA suggest, GPS live.
6. **RH/Empleados** — 17 componentes + 3,126 lín page, contrato PDF, ZKTeco.
7. **Dashboard** — 22 widgets, 34 KPIs, 11 alertas, auto-refresh.
8. **Seguridad RLS** — 428 policies, 117 tablas con RLS, 3 capas permisos.
9. **Edge Functions** — 53 funciones cubriendo auth, CFDI, Gmail, IA, maps, push.
10. **Flota** — 44 campos vehículo, checkup 15+ items, diagrama daños visual.

---

## 6. Deuda Técnica y Bugs

### Bugs Conocidos

| # | Bug | Severidad | Documento |
|---|-----|-----------|-----------|
| 1 | Boolean `facturado` desincronizado con CFDI real | ALTA | /audit/07 |
| 2 | Portal cliente sin ProtectedRoute (seguridad) | ALTA | /audit/02 |
| 3 | `PedidosPorAutorizarTab` posible dead code (1,133 lín) | MEDIA | /audit/02 |
| 4 | `documentos` state sin setter en Empleados.tsx:185 | MEDIA | /audit/04 |
| 5 | Folio cotización→pedido usa query manual (no RPC atómica) | MEDIA | /audit/04 |
| 6 | `renderStats()` en AlmacenTablet definida nunca renderizada | BAJA | /audit/04 |
| 7 | Dual status schema rutas (en_curso vs en_ruta vs en_camino) | BAJA | /audit/04 |

### Deuda Técnica

| Métrica | Valor | Severidad |
|---------|-------|-----------|
| `console.log` en producción | 126 | Media |
| Uso de `any` TypeScript | 1,154 | Alta |
| Componentes > 500 líneas | 45+ | Media |
| Componente más grande | 3,126 lín (Empleados.tsx) | Alta |
| Tests E2E | **0** | **Crítica** |
| npm vulnerabilities | 12 (1 critical) | Alta |
| types.ts desactualizado | Raíz de ~60% de `any` | Alta |

---

## 7. Orden Óptimo de Construcción

### NIVEL 1 — URGENTE LEGAL (Semanas 1-4)

| Prioridad | Gap | Esfuerzo | Justificación |
|-----------|-----|----------|---------------|
| 🔴 #1 | **Carta Porte 3.1** (V) | L (3-4 sem) | Multas $19K-$112K/traslado HOY |
| 🔴 #2 | **Contabilidad SAT** (KK) | L (3-4 sem) | Obligatorio CFF Art. 28 |
| 🔴 #3 | Fix Bug boolean facturado | S (3-5 días) | Datos financieros incorrectos |
| 🔴 #4 | Fix Portal Cliente seguridad | XS (1 día) | Acceso sin auth |

### NIVEL 2 — FOUNDATION OPERATIVA (Semanas 5-12)

| Prioridad | Gap | Esfuerzo | Justificación |
|-----------|-----|----------|---------------|
| #5 | APIs Bancarias (MM) | L | Reduce cierre mes 5-10d → 1-2d |
| #6 | Tesorería/Caja Chica (NN) | L | "Mayor caos operativo" Biblia v1 |
| #7 | Multi-Moneda (audit/29) | L | ALMASA paga USD vía Banco Base |
| #8 | PLD/Antilavado (Z) | L | Compliance obligatorio |
| #9 | Anticipos/Préstamos (audit/32) | L | Frecuentes, hoy en Excel |

### NIVEL 3 — QUICK WINS (Semanas 8-16, paralelo con Nivel 2)

| Prioridad | Gap | Esfuerzo | Justificación |
|-----------|-----|----------|---------------|
| #10 | Chat extendido (A) | M | Ya funciona, solo extender |
| #11 | Wiki/Knowledge Base (D) | M | Reduce "conocimiento tribal" |
| #12 | Portal Contadora (LL) | M | Cierre mes más rápido |
| #13 | Backorder Management (P) | S | Quick win alto valor |
| #14 | GS1/GTIN (AA) | S | Base para WMS y ANTAD |
| #15 | Fumigaciones historial | S | Fix sobreescritura (bug) |
| #16 | Cierres contables (audit/33) | L | Lock periodos, checklist |

### NIVEL 4 — ESTRATÉGICO ALTO VALOR (Meses 4-8)

| Prioridad | Gap | Esfuerzo | Justificación |
|-----------|-----|----------|---------------|
| #17 | Anti-robo completo (LA CORONA) | XL | Problema #1 de Jose |
| #18 | WMS Móvil + Barcode (F) | L | Extiende almacén tablet |
| #19 | OKRs + BSC (B) | L | Dirigir la empresa |
| #20 | Gastos/Viáticos (CC) | L | Vendedores externos |
| #21 | ESG NIIF S1+S2 (FF) | L | Obligatorio MX 2026 |
| #22 | Ciberseguridad (GG) | L | MFA + protecciones |
| #23 | Importaciones (audit/30) | L | ALMASA importa USD |

### NIVEL 5 — DIFERENCIADORES (Meses 8-18)

| Prioridad | Gap | Esfuerzo | Justificación |
|-----------|-----|----------|---------------|
| #24 | JOSAN Agente IA | L | AI-FIRST |
| #25 | Complex Pricing (O) | M | Tier pricing + rebates |
| #26 | Tasks/Project Mgmt (C) | L | Asana nativo |
| #27 | Helpdesk/Tickets (E) | M | Soporte interno |
| #28 | Governance/GRC (H) | M | Compliance formal |
| #29 | BCP/DRP (JJ) | M | Continuidad negocio |
| #30 | Seguros completo (audit/34) | M | Más que solo vehículos |

### NIVEL 6 — FASE 3 / PRODUCTO (Meses 12-24)

| Prioridad | Gap | Esfuerzo | Justificación |
|-----------|-----|----------|---------------|
| #31 | Multi-Agent Orchestration (I) | XL | Enterprise IA |
| #32 | Memory Bank (J) | L | Personalización |
| #33 | Demand Forecast ML (K) | XL | Predicciones serias |
| #34 | CDP Cliente 360 (L) | L | Segmentación |
| #35 | Wave Picking (Q) | M | Eficiencia bodega |
| #36 | EDI Integration (R) | XL | Walmart/Soriana |
| #37 | App Tendero (Y) | XL | 987K tienditas |
| #38 | Workflow No-Code (M) | XL | Citizen dev |
| #39 | Shipping API (T) | M | Multi-carrier |
| #40 | B2B Portal Live (S) | M | Stock real-time |
| #41+ | MOAT (blockchain, gamificación, etc.) | XXL | Año 2-3 |

---

## 8. Dependencias Críticas

```
Carta Porte 3.1 ──→ requiere vehiculos + rutas (✅ existen)
Contabilidad SAT ──→ requiere catálogo cuentas (🔴 crear)
APIs Bancarias ──→ requiere cuentas_bancarias (🔴 crear)
Tesorería ──→ requiere APIs bancarias + caja chica (🔴)
Multi-Moneda ──→ requiere tipos_cambio + Banxico API (🔴)
PLD ──→ requiere KYC clientes (🔴)
Anticipos ──→ requiere empleados (✅) + nómina export (🔴)
WMS Barcode ──→ requiere GS1/GTIN (🔴) + bin_locations (🔴)
EDI ──→ requiere GS1 (🔴) + productos normalizados
ANTAD ──→ requiere EDI + GS1 + catálogo verificado
Anti-robo completo ──→ requiere WMS + hoja salida digital
OKRs ──→ requiere datos operativos (✅ existen)
ESG ──→ requiere flota (✅) + electricidad bodegas (🔴)
```

---

## 9. Recomendación Final

**Estado real:** ALMASA-OS tiene base operativa sólida (82% construido, 100 tablas, 53 edge functions, 493 componentes). Pero los 40+ gaps del blueprint son 100% greenfield.

**Prioridad absoluta semana 1:**
1. Carta Porte 3.1 (evitar multas legales HOY)
2. Fix boolean facturado (datos financieros incorrectos)
3. Fix Portal Cliente seguridad (acceso sin auth)

**Lo que NO tocar:** Almacén Tablet, Compras, Clientes, Correos, Rutas. Funcionan bien. No refactorear sin necesidad.

**Lo que SÍ construir primero:** Carta Porte → Contabilidad SAT → APIs bancarias → Tesorería. Son los foundations que desbloquean todo lo demás.

---

*ALMASA-OS · Inventario Actual vs Blueprint · v1.0*  
*10 de mayo de 2026*  
*Transición FASE A (diseño) → FASE B (construcción)*
