# ORDEN DE MADUREZ REAL — ALMASA-OS (Criterio Operativo Estricto)
**Fecha:** 23 abril 2026 | **Criterio: "¿Opera sin Jose?"**

---

## ⚠️ ADVERTENCIA

Este documento califica con criterio OPERATIVO, no técnico. La pregunta no es "¿existe el código?" sino "¿puede operarlo la persona adecuada sin ayuda de Jose?". El reporte anterior (orden-madurez-operativa.md) dio 87% promedio. Este reporte corrige.

## MATRIZ DE DISPOSITIVOS POR ROL

| Rol | Dispositivo | Ubicación | Responsive requerido |
|-----|-------------|-----------|---------------------|
| Admin | Todo | Cualquiera | Sí, todos los breakpoints |
| Secretaria | Laptop | Oficina | NO (desktop only) |
| Contadora | Laptop | Oficina | NO (desktop only) |
| Vendedor | Todo | Campo + oficina | Sí, todos los breakpoints |
| Almacén | iPad + laptop | Oficina + fuera | Sí (tablet + desktop) |
| Chofer | Celular + tablet | Camioneta | Sí (mobile + tablet) |
| Cliente portal | Todo | Cualquiera | Sí, todos los breakpoints |

## CRITERIOS DE PRODUCTO ALMASA-OS

Los siguientes NO son requisitos y NO se consideran deuda técnica:

1. **Responsive en paneles de oficina** (secretaria, contadora): NO es requisito. Solo usan laptop en oficina.
2. **Dark mode:** NO. Light mode only.
3. **Multi-idioma (i18n):** NO. ALMASA opera en español México.
4. **Screen reader:** NO prioridad. Revisar si hay necesidad real.
5. **Navegadores legacy (IE, Safari <14):** NO. Chrome/Safari modernos ok.

Cualquier fix de auditoría que caiga en estos criterios se descarta.

---

**Señales de "tapar hoyos" encontradas en el código:**
- 345 `as any` type bypasses
- 161 console.logs en producción
- 20+ archivos monolíticos (>1,000 líneas)
- 101+ emails hardcoded en vez de config
- 15+ errores silenciados (catch vacíos)
- 20+ políticas RLS con `USING(true)` aún activas en migración base
- 4 TODOs pendientes

---

## Los 10 Módulos Re-auditados

### MÓDULO M06 — EMPLEADOS + ASISTENCIA + VEHÍCULOS

**Calificación anterior:** 93%
**Calificación real:** 78%

| Dimensión | Pts | Razón |
|-----------|-----|-------|
| 1. Completitud | 16/20 | Wizard paso 3 upload no persiste. Campo nombre_beneficiario existe pero no en todos los flujos. Historial sueldo sin UI de reporte exportable. |
| 2. UX | 16/20 | Ficha bien diseñada con inline editing. Wizard funcional. Pero: Empleados.tsx tiene 3,126 líneas — monolítico, difícil de mantener. |
| 3. Errores/edge | 15/20 | Firma de contrato robusta con preview+canvas. Pero: ¿qué pasa si el empleado no tiene email? El flow de bienvenida falla silenciosamente. |
| 4. Integración | 16/20 | Buena integración con ZKTeco, vehículos, pedidos. Pero: la relación empleado→auth_user (user_id) depende de auto_link_user_employee trigger — si falla, el empleado no puede loguearse. |
| 5. Autonomía | 15/20 | Norma puede dar de alta empleados y firmar contratos sin Jose. Pero: configurar ZKTeco requiere Jose. Las actas requieren entender el flujo de 3 firmas. Vacaciones masivas requiere entender el cálculo de días. |
| **TOTAL** | **78/100** | |

**Señales de "tapar hoyos":**
1. Empleados.tsx = 3,126 líneas (3er monolito más grande)
2. 13 `as any` casts en Empleados.tsx
3. TODO pendiente en EmpleadoWizard.tsx:248 (upload no implementado)

**Si Jose se va 2 semanas:** CON LIMITACIONES — Norma puede operar 80% del módulo. ZKTeco y config avanzada requieren Jose.

**Delta:** -15%

---

### MÓDULO M02 — PRODUCTOS + PRECIOS + CATÁLOGO

**Calificación anterior:** 97%
**Calificación real:** 85%

| Dimensión | Pts | Razón |
|-----------|-----|-------|
| 1. Completitud | 18/20 | Catálogo robusto. Precios, márgenes, SAT, historial — todo funciona. Falta: codigo_barras para lectores. |
| 2. UX | 17/20 | 3 versiones de lista precios con hooks shared — bien arquitectado. Pero: Productos.tsx 1,255 lín monolítico. SecretariaCostosTab 932 lín con 41 colores hardcoded. |
| 3. Errores/edge | 16/20 | Historial de precios vía trigger DB — robusto. Pero: ¿qué pasa si secretaria edita precio y vendedor está creando pedido al mismo tiempo? No hay optimistic locking. |
| 4. Integración | 17/20 | Bien integrado con pedidos, compras, inventario. calcularTotalesPedido ya centralizado. |
| 5. Autonomía | 17/20 | Norma puede editar precios, ver márgenes, exportar PDF sin Jose. Calculator de margen intuitivo. Bulk update solo admin. |
| **TOTAL** | **85/100** | |

**Señales de "tapar hoyos":**
1. 3 archivos hacen lo mismo (lista precios) — decisión consciente pero 1,534 lín totales
2. Productos.tsx es monolítico (1,255 lín)
3. No hay versionado de precios (solo historial, no rollback)

**Si Jose se va 2 semanas:** SÍ — Norma opera precios sin problemas.

**Delta:** -12%

---

### MÓDULO M07 — COMPRAS / ÓRDENES DE COMPRA

**Calificación anterior:** 98%
**Calificación real:** 82%

| Dimensión | Pts | Razón |
|-----------|-----|-------|
| 1. Completitud | 18/20 | 8 tabs, 18 dialogs, wizard 4 pasos, recepción con evidencia. Módulo más completo. |
| 2. UX | 14/20 | CrearOrdenCompraWizard = 3,015 lín (2do monolito). OrdenesCompraTab = 2,912 lín. OrdenAccionesDialog = 2,321 lín. 3 componentes con >2,000 lín = mantenimiento difícil. |
| 3. Errores/edge | 16/20 | Folio atómico OC. Recepción con diferencias. Pero: 1 catch vacío detectado en CrearOrdenCompraWizard. Emails hardcoded (compras@almasa.com.mx en 10+ lugares). |
| 4. Integración | 17/20 | Bien integrado con inventario (lotes creados en recepción) y proveedores. RPCs con guards. |
| 5. Autonomía | 17/20 | Norma crea OCs, recepciona mercancía, concilia facturas sin Jose. Analytics solo admin pero no crítico. |
| **TOTAL** | **82/100** | |

**Señales de "tapar hoyos":**
1. 3 archivos >2,000 lín (los monolitos más grandes del proyecto después de types.ts)
2. 10+ emails hardcoded (compras@almasa.com.mx) en vez de config
3. Catch vacío en wizard (errores silenciados)

**Si Jose se va 2 semanas:** SÍ — Norma es autosuficiente en compras.

**Delta:** -16%

---

### MÓDULO M05-RECEPCIÓN — ALMACÉN RECEPCIÓN DE COMPRAS

**Calificación anterior:** 95%
**Calificación real:** 80%

| Dimensión | Pts | Razón |
|-----------|-----|-------|
| 1. Completitud | 17/20 | Flujo completo: llegada, verificación, diferencias, evidencia, firma. |
| 2. UX | 14/20 | AlmacenRecepcionSheet = 2,619 lín (5to monolito). AlmacenRecepcionTab = 1,428 lín. 10 console.logs en producción. |
| 3. Errores/edge | 16/20 | Manejo de diferencias (roto, no llegó, rechazado) bien implementado. Pero: 17 `as any` en AlmacenRecepcionSheet — tipo más bypassed del proyecto. |
| 4. Integración | 17/20 | Crea lotes correctamente. Actualiza OC. Envía emails de confirmación. |
| 5. Autonomía | 16/20 | Almacenistas pueden recepcionar sin Jose. Pero: la interfaz es densa (2,619 lín en un solo sheet) — requiere capacitación inicial. |
| **TOTAL** | **80/100** | |

**Señales de "tapar hoyos":**
1. AlmacenRecepcionSheet = 2,619 lín con 17 `as any`
2. 10 console.logs en producción
3. Monolítico — difícil de debugear si algo falla

**Si Jose se va 2 semanas:** CON LIMITACIONES — almacenistas operan pero si hay un edge case raro, necesitan soporte.

**Delta:** -15%

---

### MÓDULO M05-INVENTARIO — STOCK Y LOTES

**Calificación anterior:** 85%
**Calificación real:** 72%

| Dimensión | Pts | Razón |
|-----------|-----|-------|
| 1. Completitud | 15/20 | Stock, lotes, movimientos, caducidad — existen. Pero: no hay FIFO/FEFO automatizado, no hay ajuste con aprobación, no hay conteo cíclico. |
| 2. UX | 14/20 | Inventario.tsx = 1,299 lín. Vista funcional pero densa. Alerta stock bajo bien diseñada. |
| 3. Errores/edge | 12/20 | RPCs con guards (M04.6b). PERO: ReporteCaducidadTab bypassa RPCs con INSERT directo a inventario_movimientos. RLS aún abierto en inventario_lotes e inventario_movimientos (USING true de migración base). |
| 4. Integración | 15/20 | Bien conectado con compras (lotes de recepción) y carga (decrementar_lote). Pero: inconsistencia de data — un camino usa RPC, otro no. |
| 5. Autonomía | 16/20 | Almacenistas ven stock y caducidad sin Jose. Gerente puede dar de baja lotes. Pero: movimientos manuales no tienen workflow de aprobación. |
| **TOTAL** | **72/100** | |

**Señales de "tapar hoyos":**
1. Bypass de RPC en caducidad (INSERT directo a inventario_movimientos)
2. RLS abierto en tablas de inventario (USING true)
3. Sin FIFO/FEFO automatizado — dependencia en juicio humano

**Si Jose se va 2 semanas:** CON LIMITACIONES — opera day-to-day pero ajustes y bajas podrían tener inconsistencias.

**Delta:** -13%

---

### MÓDULO M01 — CLIENTES

**Calificación anterior:** 92%
**Calificación real:** 79%

| Dimensión | Pts | Razón |
|-----------|-----|-------|
| 1. Completitud | 16/20 | Admin: datos fiscales completos. Vendedor: datos operativos ricos (GPS, horarios, zonas). Pero: data inconsistente entre flujos — admin guarda dirección como texto libre, vendedor la desglosa. |
| 2. UX | 16/20 | Google Maps, CP lookup, CSF parser — sofisticado. VendedorNuevoClienteSheet = 1,012 lín (grande pero funcional). |
| 3. Errores/edge | 15/20 | RFC duplicado verificado (M04.5B fix). Código cliente atómico (M04.5B fix). Pero: no hay validación de que el cliente tenga datos fiscales suficientes para facturar antes de intentar facturar. |
| 4. Integración | 15/20 | RLS correcto (vendedor solo sus clientes). Pero: data inconsistente entre admin y vendedor — metodo_pago, forma_pago no existen como defaults. dirección fiscal solo en sucursales. |
| 5. Autonomía | 17/20 | Vendedor da de alta clientes en campo sin Jose. Admin edita datos fiscales sin Jose. Norma puede buscar/filtrar/exportar. |
| **TOTAL** | **79/100** | |

**Señales de "tapar hoyos":**
1. Inconsistencia de data: admin vs vendedor guardan dirección de forma incompatible
2. Faltan campos para integración Aspel (metodo_pago_default, forma_pago_default)
3. No hay validación pre-factura de data fiscal completa

**Si Jose se va 2 semanas:** SÍ — Carlos/Norma operan clientes sin problemas.

**Delta:** -13%

---

### MÓDULO M04 — PEDIDOS (CAPTURA + AUTORIZACIÓN)

**Calificación anterior:** 88%
**Calificación real:** 75%

| Dimensión | Pts | Razón |
|-----------|-----|-------|
| 1. Completitud | 15/20 | 3 flujos de creación funcionan. Pero: fecha_entrega falta en admin/vendedor. Notas internas no accesibles al vendedor. Cortesías solo admin. |
| 2. UX | 14/20 | Wizard vendedor bien diseñado con sticky buttons (fix reciente). Pero: NuevoPedidoDialog admin = 1,013 lín dialog (difícil de mantener). VendedorNuevoPedidoTab = 1,247 lín. 3 implementaciones = 3,207 lín para la misma función. |
| 3. Errores/edge | 16/20 | Folio atómico (M04.5A). RLS correcto. Guard de precios. Offline/draft. Pero: sin optimistic locking — 2 usuarios editando mismo pedido = último gana. |
| 4. Integración | 14/20 | calcularTotalesPedido centralizado (M04.5B.3.1). Pero: los 3 INSERT tienen campos distintos (17 vs 17 vs 12). Status inconsistente (pendiente vs por_autorizar según flujo). Post-submit radicalmente distinto por rol. |
| 5. Autonomía | 16/20 | Carlos puede crear pedidos desde celular sin Jose (wizard + offline). Norma puede ver/filtrar pedidos en laptop (desktop-only, sin responsive requerido). Autorización requiere entender alertas_precio. |
| **TOTAL** | **75/100** | |

**Señales de "tapar hoyos":**
1. 3 implementaciones de "Nuevo Pedido" = 3,207 líneas (mayor duplicación del proyecto)
2. Sin optimistic locking en edición concurrente
3. 4 `as any` en Pedidos.tsx

**Si Jose se va 2 semanas:** CON LIMITACIONES — pedidos se capturan pero autorización de precios puede requerir criterio de Jose.

**Delta:** -13%

---

### MÓDULO M09 — RUTAS + CARGA + ENTREGA

**Calificación anterior:** 95%
**Calificación real:** 81%

| Dimensión | Pts | Razón |
|-----------|-----|-------|
| 1. Completitud | 17/20 | 8 tabs, carga con QR, GPS, firma digital, conciliación. Módulo operativamente más sofisticado. |
| 2. UX | 15/20 | CargaHojaInteractiva 1,325 lín. AlmacenCargaScan 1,362 lín. AlmacenCargaRutasTab 1,428 lín. 3 monolitos en un solo módulo. GPS tracking excelente. |
| 3. Errores/edge | 16/20 | useCargaOperations sólido (8 funciones atómicas). Invariante de solo-RPCs respetado. Pero: peso_confirmado no siempre forzado. ¿Qué pasa si chofer pierde señal GPS durante entrega? |
| 4. Integración | 17/20 | Bien integrado: pedidos→rutas→entregas→cobranza. Notificaciones a vendedor si pedido modificado en carga. |
| 5. Autonomía | 16/20 | Almacenistas cargan rutas sin Jose. Chofer entrega con firma+GPS. Pero: sugerencias AI requiere Jose para interpretar. Planificación de rutas es power-user. |
| **TOTAL** | **81/100** | |

**Señales de "tapar hoyos":**
1. 3 archivos >1,300 lín en almacén (CargaScan, CargaHoja, CargaRutas)
2. 5 console.logs en AlmacenCargaRutasTab (producción)
3. Sugerencias AI difíciles de interpretar sin contexto

**Si Jose se va 2 semanas:** CON LIMITACIONES — operación normal funciona. Planificación avanzada puede requerir Jose.

**Delta:** -14%

---

### MÓDULO M08 — FACTURACIÓN + REMISIONES

**Calificación anterior:** 92%
**Calificación real:** 80%

| Dimensión | Pts | Razón |
|-----------|-----|-------|
| 1. Completitud | 17/20 | CFDI 4.0 completo vía Facturama. Timbrado + cancelación. Remisión imprimible. |
| 2. UX | 16/20 | Flujo claro: seleccionar pedido → elegir CFDI → timbrar. Loading states buenos. |
| 3. Errores/edge | 14/20 | ¿Qué pasa si Facturama está caído? No hay retry automático. ¿Qué pasa si el XML se pierde? Solo URL almacenada, no el XML raw. ¿Qué pasa con facturas parciales? |
| 4. Integración | 16/20 | Bien conectado con pedidos y clientes. Pero: no hay campo aspel_folio. No hay export batch. La integración Aspel no existe. |
| 5. Autonomía | 17/20 | Norma puede timbrar, cancelar, enviar facturas sin Jose. Catálogo SAT integrado. |
| **TOTAL** | **80/100** | |

**Señales de "tapar hoyos":**
1. Sin retry de Facturama — si falla, usuario debe reintentar manualmente
2. XML no guardado localmente — dependencia total de Facturama para recovery
3. Sin export batch para Aspel

**Si Jose se va 2 semanas:** SÍ para facturación normal. NO para problemas con Facturama.

**Delta:** -12%

---

### MÓDULO M10 — COBRANZA + PAGOS + CONTABILIDAD

**Calificación anterior:** 70%
**Calificación real:** 55%

| Dimensión | Pts | Razón |
|-----------|-----|-------|
| 1. Completitud | 10/20 | Cobranza básica funciona. Pero: sin aging report, sin allocación manual, sin estado de resultados, sin balance general, sin pólizas contables. ALMASA opera su contabilidad en Aspel — este módulo es solo tracking parcial. |
| 2. UX | 12/20 | VendedorCobranzaTab funcional. SecretariaPagosValidarTab limpia. Pero: Rentabilidad solo muestra márgenes por producto — no hay vista de P&L, flujo de efectivo, ni cartera consolidada. |
| 3. Errores/edge | 11/20 | RPC registrar_cobro_pedido con guard. Trigger actualiza saldo. Pero: ¿qué pasa con pagos parciales que cubren 2 facturas? La UI no existe para allocar manualmente. |
| 4. Integración | 12/20 | Pagos actualizan saldo_pendiente de cliente y pedido. Pero: no hay conexión con facturación para marcar facturas como cobradas automáticamente desde pagos. |
| 5. Autonomía | 10/20 | Vendedor puede registrar cobro. Norma puede validar. PERO: contadora (Norma) no puede generar reportes financieros formales — los hace en Aspel. El módulo de rentabilidad es insuficiente para decisiones financieras serias. |
| **TOTAL** | **55/100** | |

**Señales de "tapar hoyos":**
1. Contabilidad formal no existe — solo tracking transaccional
2. Sin aging report (antigüedad de saldos)
3. Sin allocación manual de pagos a facturas
4. Rentabilidad es análisis de márgenes, no contabilidad

**Si Jose se va 2 semanas:** SÍ para cobros y validación. NO para reportes financieros (van a Aspel).

**Delta:** -15%

---

## 3. Tabla Comparativa

| Módulo | Anterior | Real | Delta | Razón principal del delta |
|--------|----------|------|-------|--------------------------|
| M02 Productos | 97% | 85% | **-12%** | Monolitos, sin locking, 3 versiones precios |
| M07 Compras | 98% | 82% | **-16%** | 3 monolitos >2,000 lín, emails hardcoded |
| M09 Rutas | 95% | 81% | **-14%** | 3 monolitos, sugerencias AI poco autónomas |
| M05-R Recepción | 95% | 80% | **-15%** | 2,619 lín monolito, 17 as any, 10 console.logs |
| M08 Facturación | 92% | 80% | **-12%** | Sin retry Facturama, sin Aspel, sin XML local |
| M06 Empleados | 93% | 78% | **-15%** | 3,126 lín monolito, upload pendiente, ZK requiere Jose |
| M01 Clientes | 92% | 79% | **-13%** | Data inconsistente admin/vendedor, sin validación pre-factura |
| M04 Pedidos | 88% | 75% | **-13%** | 3 implementaciones divergentes (responsive secretaria N/A — desktop only) |
| M05-I Inventario | 85% | 72% | **-13%** | Bypass RPC, RLS abierto, sin FIFO, sin conteo cíclico |
| M10 Cobranza | 70% | 55% | **-15%** | Sin contabilidad formal, sin aging, sin allocación |

**Promedio anterior:** 87%
**Promedio real:** 76.5%
**Delta promedio:** -10.5%

---

## 4. Diagnóstico del "Síndrome del 87%"

El reporte anterior medía **"¿existe el feature?"**. Este mide **"¿funciona sin fricción?"**.

La diferencia se explica así:
- **Código que existe ≠ código mantenible.** 20 archivos con >1,000 líneas son bombas de mantenimiento.
- **Feature implementado ≠ edge cases cubiertos.** Sin optimistic locking, sin retry de APIs externas, sin FIFO automatizado.
- **UI funcional ≠ UI autónoma.** Almacenista necesita capacitación para recepcionar. Contadora no puede generar P&L. (Nota: responsive en secretaria/contadora descartado — solo usan laptop desktop.)
- **345 `as any` y 161 console.logs** son síntomas de desarrollo rápido sin pulir.

**El sistema ES productivo.** ALMASA opera con él todos los días. Pero opera con Jose como backstop permanente — y eso no escala.

---

## 5. Nueva Recomendación de Orden de Trabajo

**SPRINT 1 (2 semanas): CALIDAD antes de features**
- Limpiar los 161 console.logs restantes (top 10 archivos)
- Corregir bypass RPC en ReporteCaducidadTab
- ~~Responsive SecretariaPedidosTab~~ → descartado (secretaria=desktop only)

**SPRINT 2 (2 semanas): M10 Cobranza → elevar de 55% a 70%**
- Aging report (antigüedad de saldos por cliente)
- Allocación manual de pagos a facturas (UI)
- Dashboard de cartera consolidada para contadora

**SPRINT 3 (1 semana): M04 Pedidos → elevar de 75% a 82%**
- Agregar fecha_entrega al wizard vendedor y dialog admin
- Notas internas visibles para vendedor (read-only)

**SPRINT 4 (1 semana): M05-I Inventario → elevar de 72% a 80%**
- Corregir bypass RPC en caducidad
- Evaluar FIFO/FEFO con alertas (no automatizado completo, pero al menos aviso)

**SPRINT 5+ (ongoing): Refactor monolitos**
- Partir archivos >2,000 lín en sub-componentes
- Reducir `as any` en top 10 archivos

---

## 6. Proyección Salida de Aspel (Septiembre 2026)

Para que ALMASA pueda salir de Aspel en 6 meses, estos módulos DEBEN estar al **85%+ real**:

| Módulo | Hoy | Meta | Gap | Factible? |
|--------|-----|------|-----|-----------|
| M08 Facturación | 80% | 85% | 5% | ✅ Sí — retry Facturama + export batch |
| M10 Cobranza | 55% | 85% | **30%** | ⚠️ Requiere aging + allocación + reportes |
| M01 Clientes | 79% | 85% | 6% | ✅ Sí — campos fiscales + validación pre-factura |
| M04 Pedidos | 75% | 85% | 10% | ⚠️ fecha_entrega + notas vendedor + consistencia |
| M05-I Inventario | 72% | 85% | 13% | ⚠️ FIFO + RPC fix + conteo cíclico |

**Veredicto:** Factible SI se prioriza M10 (el gap más grande). Sin contabilidad formal, Aspel sigue siendo necesario para reportes fiscales. La pregunta real es: ¿se necesita un módulo de contabilidad dentro de ALMASA-OS, o basta con un export limpio a Aspel?

**Recomendación:** Export limpio a Aspel (CSV/XML de facturas + pagos + movimientos) es más realista que construir GL completo. Objetivo: ALMASA-OS alimenta a Aspel automáticamente, en vez de captura manual duplicada.

---

## BACKLOG (no urgente)

### Bloqueo técnico por IP para secretaria/contadora
Implementar Edge Function que valide IP pública al login. Solo roles secretaria y contadora se afectan. Si IP no está en rango ALMASA → logout forzado + toast. Esfuerzo estimado: 3-4 horas. Prioridad: baja (por ahora es política, no riesgo operativo real).
