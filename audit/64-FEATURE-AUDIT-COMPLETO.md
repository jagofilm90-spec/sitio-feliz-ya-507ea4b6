# Feature Audit Completo — ALMASA-OS

**Fecha:** 11 Mayo 2026

## Inventario total

| Categoría | Cantidad |
|-----------|----------|
| Páginas frontend | 62 |
| Rutas registradas | 64 |
| Hooks personalizados | 49 |
| Componentes React | 444 |
| Componentes >200 LoC | 246 |
| Edge functions | 75 |
| Utils/Helpers | 11 |
| Sidebar items | 32 |

---

## Capacidades por módulo

### M01 CLIENTES (4 páginas, ~2,294 LoC)
- Lista con búsqueda, filtros, paginación
- Detalle con tabs (contacto, facturas, pedidos, crédito)
- Crear/Editar con validación RFC
- Import catálogo Aspel (913 LoC parser)
- Sucursales con Google Maps (1,160 LoC)

### M02 PRODUCTOS (3 páginas, ~2,260 LoC)
- Catálogo con búsqueda, categorías
- Modo de cobro (admin only)
- Historial precios con gráficos
- Lista de precios exportable

### M04 PEDIDOS (1 página, 1,132 LoC + componentes)
- Crear pedido (993 LoC dialog)
- Autorización workflow (1,133 LoC)
- Solicitudes de venta
- Procesamiento desde correos (1,886 LoC)
- Pedidos acumulativos (1,255 LoC)

### M05 COMPRAS (4 páginas + 10 componentes >1,000 LoC)
- Wizard OC completo (3,021 LoC)
- Proveedores V3 con comparador precios
- Calendario entregas (1,146 LoC)
- Recepción mercancía (2,619 LoC almacén)
- Adeudos proveedores (822 LoC)
- Facturación proveedores (938 LoC)
- Pagos OC (1,143 LoC)

### CARTA PORTE 3.1 (2 páginas, 519 LoC)
- Wizard 4 pasos (mercancías, ubicaciones, autotransporte, operador)
- Validación 12 reglas SAT
- Timbrado PAC-agnostic
- Cancelación 4 motivos
- PDF borrador preview
- Tab auditoría

### LA CORONA ANTI-ROBO (3 páginas, 623 LoC)
- Dashboard 8 tabs (feed, hojas, discrepancias, scores, anomalías, alertas, desviaciones, geo-fences)
- Conteos ciegos (programa + realiza)
- Timeline 9 momentos
- Hoja Salida V4 enterprise con paginación
- IA Claude Vision OCR hojas selladas
- Score confianza 8 factores
- GPS geo-fence + desviaciones
- Alertas push realtime

### M07 CHOFER APP (3 páginas, 602 LoC)
- Mi ruta hoy (mobile-first)
- Detalle entrega + navegación Google Maps
- POD: sign on glass + foto + datos receptor
- Workflow: surtida → en_transito → entregada → IA procesa

### M08 FACTURACIÓN (3 páginas, 665 LoC)
- Facturas CFDI 4.0 tipo I (timbrar, cancelar, descargar)
- Notas de Crédito tipo E
- Complementos de Pago REP tipo P
- Remisiones con conversión a factura
- PAC adapter (Facturama implementado)
- Generar desde pedido o manual

### M09 COBRANZA (1 página, 167 LoC)
- Aging Report (5 buckets NetSuite-style)
- Cobros con aplicación a N facturas
- Workflow validación cobrador → secretaria
- Auto-generación REP cuando PPD

### M14 DASHBOARD (2 páginas, 455 LoC)
- Dashboard operativo (KPIs, gráficos ventas)
- Dashboard ejecutivo (consolidado + reportes)
- Reportes diarios automatizados
- Email HTML premium
- Historial reportes

### JOSAN AGENTE IA (1 página, 162 LoC)
- Chat conversacional español
- 10 tools enterprise (ventas, clientes, alertas, scores, inventario, aging)
- Tool use loop (Claude API)
- Historial conversaciones
- Floating widget (admin)

### ALMACÉN TABLET (3 páginas, 2,047 LoC)
- Dashboard almacén con tabs
- Carga scan QR (1,362 LoC)
- Surtir pedido touch-friendly (4 botones por producto)
- Asignar cuadrilla + generar hoja salida

### CORREOS (2 páginas, 724 LoC)
- Bandeja entrada Gmail (1,379 LoC component)
- Procesamiento pedidos desde email
- Configuración cuentas

### LECAROZ (3 páginas, 1,144 LoC)
- Cotizaciones con editor
- Bandeja especial Lecaroz

### RRHH (2 páginas, 3,211 LoC)
- Empleados completo (3,126 LoC monolito)
- Asistencia (85 LoC)

### OTROS
- Chat interno (1,295 LoC)
- Portal cliente B2C (423 LoC)
- Configuración (218 LoC + tabs)
- Landing page (389 LoC)
- Tarjeta digital (257 LoC)

---

## Features cross-cutting (transversales)

| Feature | Archivos | Estado |
|---------|----------|--------|
| Búsqueda Cmd+K | 1 (GlobalSearch) | **Funciona** — 24 páginas + clientes/productos/pedidos/facturas |
| Realtime Supabase | 26 archivos | **Activo** — alertas, presencia, chat, ubicaciones |
| Cámara/Foto | 9 archivos | **Activo** — POD chofer, hojas selladas, evidencias |
| GPS/Geolocation | 6 archivos | **Activo** — chofer tracking, geo-fences, cobros |
| QR/Barcode | 15 archivos | **Activo** — escaneo carga almacén, hojas |
| PDF Generation | 22 archivos | **Activo** — hoja salida, remisiones, OC, reportes |
| Firma digital | 23 archivos | **Activo** — chofer POD, almacén, entregas |
| Offline/Sync | 9 archivos | **Parcial** — useOfflineSync, useOnlineStatus, sync queue |
| WhatsApp | 16 archivos | **Parcial** — links wa.me, notificaciones planeadas |
| Voice/Speech | 11 archivos | **Existe** — dictado en notas/observaciones |
| PWA manifest | 1 archivo | **Básico** — manifest.json creado |
| Push notifications | múltiples | **Activo** — FCM integrado via Capacitor |

---

## Hooks destacados (top 10 por complejidad)

| Hook | LoC | Funcionalidad |
|------|-----|---------------|
| useCargaOperations | 567 | Operaciones carga almacén completas |
| useNotificaciones | 595 | Sistema notificaciones completo |
| useCartaPorteWizard | 403 | 10 hooks wizard Carta Porte |
| useCartasPorte | 401 | CRUD + timbrado + cancelación |
| useMonitoreoRutas | 380 | GPS tracking rutas en tiempo real |
| useSolicitudesDescuento | 369 | Workflow descuentos |
| useAlertasFlotilla | 364 | Alertas vehículos/documentos |
| useEstadoOperaciones | 414 | Estado operativo consolidado |
| useBodegaAutoDetect | 292 | Auto-detección bodega por ubicación |
| useHojaSalida | 279 | CRUD hojas salida + reconciliación |

---

## Capacidades ÚNICAS (diferenciadores mercado)

1. **IA Claude Vision OCR** — Lee observaciones manuscritas de clientes en hojas físicas
2. **Anti-robo 7 capas** — Score + GPS + conteos + IA en un solo sistema
3. **Sign on glass** — Firma digital touch en tablet/móvil
4. **JOSAN Chat IA** — Agente conversacional sobre 137 tablas BD
5. **Hoja Salida V4** — PDF enterprise con paginación dinámica
6. **Auto-REP fiscal** — Genera complemento de pago automático cuando cobro aplica a PPD
7. **Aging Report** — Cartera por antigüedad estilo NetSuite
8. **Carta Porte PAC-agnostic** — Cambia de PAC con 1 setting
9. **AlertasBell realtime** — Push en header con sonido para críticas
10. **Import Aspel** — Parser Excel catálogo clientes (740 LoC)

---

## Lo que NO existe (oportunidades)

| Feature | Impacto | Complejidad |
|---------|---------|-------------|
| POS Mostrador (venta directa) | Alto | Media |
| Portal Cliente B2B (catálogo + pedidos) | Alto | Alta |
| Forecast demanda IA | Alto | Alta |
| Ruteo automático (optimización entregas) | Medio | Media |
| EDI (intercambio electrónico con cadenas) | Medio | Alta |
| Nómina (cálculo IMSS/ISR) | Medio | Alta |
| CRM pipeline ventas | Medio | Media |
| Pólizas contables (export COI) | Medio | Media |

---

*ALMASA-OS: 62 páginas, 49 hooks, 444 componentes, 75 edge functions, 10 capacidades únicas.*
