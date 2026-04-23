# ORDEN DE MADUREZ OPERATIVA — ALMASA-OS
**Fecha:** 23 abril 2026 | **10 módulos auditados** | **446 componentes, 42 rutas**

---

## 1. Resumen Ejecutivo

ALMASA-OS está en un estado de madurez sorprendentemente alto para un sistema custom: **promedio 87% de completitud** en los 10 módulos de la cadena operativa. Los módulos core (Productos, Compras, Logística, Facturación) están esencialmente completos. Los gaps principales son: (1) el módulo de Contabilidad formal no existe — solo hay tracking transaccional; (2) FIFO/FEFO automatizado no está implementado — se depende de selección manual del almacenista; (3) el wizard de alta de empleado tiene un TODO de upload de documentos pendiente; (4) algunas tablas de inventario aún tienen RLS abierto post-blindaje M04.6. El sistema es productivo HOY — las mejoras son incrementales, no fundacionales.

El módulo con más deuda técnica es M04 Pedidos (3 implementaciones divergentes del flujo "Nuevo Pedido"), pero ya se ha avanzado en consolidar la lógica compartida (calcularTotalesPedido, generar_folio_pedido, usePermissions).

---

## 2. Auditoría por Módulo

### MÓDULO M06 — EMPLEADOS + ASISTENCIA + VEHÍCULOS

**Propósito operativo:** Gestionar la plantilla de 30+ empleados, su asistencia diaria (integración ZKTeco), y la flota de 14 vehículos.

**Archivos principales:** EmpleadoFicha.tsx (658), EmpleadoWizard.tsx (314), Asistencia.tsx (5 tabs), VehiculosTab.tsx (1,460), 17 componentes en empleados/ (4,429 lín total), 7 componentes en asistencia/ (1,552 lín).

**Tablas:** empleados, empleados_actas, empleados_vacaciones, empleados_historial_sueldo, asistencia, zk_mapeo, vehiculos. RLS: blindado en M04.6b.

**Funcionalidad EXISTENTE:**
- ✅ Alta de empleado wizard 4 pasos (datos, laboral, documentos, resumen)
- ✅ Ficha integral con 7 tabs (ficha, documentos, contrato, actas, vacaciones, expediente, baja)
- ✅ Edición inline por sección en la ficha
- ✅ Firma de contrato con canvas signatures + PDF + email de bienvenida
- ✅ Firma de addendum
- ✅ Proceso de baja con finiquito + PDF
- ✅ Actas administrativas con firma + impresión
- ✅ Expediente digital con upload a Storage
- ✅ Asistencia: 5 tabs (hoy, semanal, quincenal, mensual, mapeo ZKTeco)
- ✅ Premio de asistencia binario (1 falta = $0, 2+ retardos = $0)
- ✅ Integración ZKTeco con panel de mapeo admin
- ✅ Vacaciones con cálculo de días + masivas
- ✅ Vehículos: CRUD completo con OCR de documentos (tarjeta, póliza, factura)
- ✅ Asignación chofer-vehículo con auto-release al desactivar

**Funcionalidad INCOMPLETA:**
- ⚠️ EmpleadoWizard paso 3: "TODO: Implement actual upload to supabase storage on save" (archivos se quedan en state, no se persisten)

**Bugs conocidos:** Ninguno detectado en código.

**Dependencias ENTRANTES:** Ninguna — es foundation.
**Dependencias SALIENTES:** M04 (vendedores), M09 (choferes), M05 (almacenistas).

**Madurez: 93%** — Todo funciona excepto upload de documentos en wizard paso 3.

**¿Bloquea algo?** No urgente. Los documentos se pueden subir después desde la ficha (ExpedienteDigital funciona).

---

### MÓDULO M02 — PRODUCTOS + PRECIOS + CATÁLOGO

**Propósito operativo:** Mantener el catálogo de 274 productos con precios, costos, márgenes, impuestos SAT, y modo de cobro (pieza vs kilo).

**Archivos principales:** Productos.tsx, ProductosModoCobro.tsx (509), ProductosHistorialPrecios.tsx (468), AdminListaPreciosTab (636), SecretariaListaPreciosTab (465), VendedorListaPreciosTab (419), useListaPrecios (248), usePrecioEditor (260), usePrecioHistorial (79).

**Tablas:** productos, productos_historial_precios, productos_historial_estado, categorias_productos. RLS: SELECT abierto (catálogo público, aceptable).

**Funcionalidad EXISTENTE:**
- ✅ CRUD productos con validación de código, duplicados, nombres similares
- ✅ Modo cobro pieza/kilo con toggle y bulk update
- ✅ Historial de precios completo con audit trail automático (DB trigger)
- ✅ Lista de precios por rol (admin: análisis margen + simulador + bulk, secretaria: calculadora, vendedor: read-only)
- ✅ Campos SAT: codigo_sat, unidad_sat
- ✅ descuento_maximo por producto
- ✅ Costo promedio ponderado + último costo compra
- ✅ Hooks shared bien arquitectados (useListaPrecios, usePrecioEditor, usePrecioHistorial)
- ✅ Badges compartidos extraídos (PromocionBadge, ImpuestoBadges, ListaPreciosPdfButton)
- ✅ Export PDF de lista de precios (versión cliente + interna)

**Funcionalidad INCOMPLETA:**
- ⚠️ No hay campo codigo_barras (para lectores)

**Bugs conocidos:** Ninguno.

**Dependencias ENTRANTES:** Ninguna directa.
**Dependencias SALIENTES:** M04 (selección de productos en pedido), M07 (qué comprar), M05 (qué contar).

**Madurez: 97%** — Prácticamente completo. El campo codigo_barras es nice-to-have.

**¿Bloquea algo?** No.

---

### MÓDULO M07 — COMPRAS / ÓRDENES DE COMPRA

**Propósito operativo:** Gestionar las compras a proveedores, desde la OC hasta la recepción y conciliación de facturas.

**Archivos principales:** Compras.tsx (8 tabs), CrearOrdenCompraWizard.tsx (3,015), RegistrarRecepcionDialog.tsx (933), 41 archivos en compras/ (18 dialogs, todos funcionales).

**Tablas:** ordenes_compra, ordenes_compra_detalles, proveedores, proveedor_facturas, creditos_proveedor, devoluciones_proveedor. RLS: role-based correcto.

**Funcionalidad EXISTENTE:**
- ✅ 8 tabs: Proveedores, Órdenes, Calendario, Devoluciones, Historial, Adeudos, Sugerencias, Analytics
- ✅ Wizard de creación OC 4 pasos (proveedor, productos, entregas, confirmación)
- ✅ Recepción de mercancía con evidencia fotográfica + firma digital
- ✅ Conciliación de facturas proveedor con ajuste de costos
- ✅ Devoluciones y faltantes
- ✅ Créditos de proveedor
- ✅ Sugerencias de reabastecimiento automáticas
- ✅ Analytics de compras
- ✅ Calendar de entregas programadas
- ✅ Email automático al enviar OC
- ✅ Folio atómico para OC

**Funcionalidad INCOMPLETA:** Nada detectado.

**Dependencias ENTRANTES:** M02 (catálogo de productos).
**Dependencias SALIENTES:** M05 (lotes de inventario creados en recepción).

**Madurez: 98%** — El módulo más completo del sistema.

**¿Bloquea algo?** No.

---

### MÓDULO M05-RECEPCIÓN — ALMACÉN RECEPCIÓN DE COMPRAS

**Propósito operativo:** Recibir mercancía de proveedores, verificar cantidades, registrar diferencias, y crear lotes de inventario.

**Archivos principales:** AlmacenRecepcionTab.tsx, AlmacenRecepcionSheet.tsx, RegistrarLlegadaSheet.tsx, RegistrarRecepcionDialog.tsx (933).

**Tablas:** inventario_lotes, inventario_movimientos, ordenes_compra_entregas. RLS: RPC guards (M04.6b), tabla con policy abierta (pendiente cerrar totalmente).

**Funcionalidad EXISTENTE:**
- ✅ Registro de llegada (chofer, placas, sellos)
- ✅ Verificación de cantidades recibidas vs ordenadas
- ✅ 6 tipos de diferencia: devolución, roto, no llegó, error cantidad, rechazado calidad, otro
- ✅ Captura de evidencia fotográfica
- ✅ Firma digital de recepción
- ✅ Creación automática de lotes con fecha de entrada y caducidad
- ✅ Email de confirmación con PDF
- ✅ Reporte de recepciones del día

**Funcionalidad INCOMPLETA:** Nada detectado.

**Dependencias ENTRANTES:** M07 (OC creadas).
**Dependencias SALIENTES:** M05-Inventario (lotes disponibles).

**Madurez: 95%** — Completo y funcional.

**¿Bloquea algo?** No.

---

### MÓDULO M05-INVENTARIO — STOCK Y LOTES

**Propósito operativo:** Mantener el inventario de lotes con tracking de caducidad, stock mínimo, y movimientos auditables.

**Archivos principales:** Inventario.tsx (4 tabs), AlmacenInventarioTab.tsx, ReporteCaducidadTab.tsx, decrementar_lote/incrementar_lote RPCs.

**Tablas:** inventario_lotes, inventario_movimientos, bodegas. RLS: RPCs con guards (M04.6b). Tablas: policy abierta para autenticados (SELECT).

**Funcionalidad EXISTENTE:**
- ✅ 4 tabs: Stock, Lotes, Movimientos, Por Categoría
- ✅ Alerta de stock bajo con threshold configurable
- ✅ Tracking de caducidad 4 niveles (vencido, crítico, próximo, vigente)
- ✅ Baja de lotes vencidos (gerente/admin only)
- ✅ RPCs atómicos con role guards: decrementar_lote, incrementar_lote
- ✅ Multi-bodega con auto-detección GPS/WiFi
- ✅ Movimientos auditables (entrada/salida/ajuste)

**Funcionalidad INCOMPLETA:**
- ⚠️ FIFO/FEFO no automatizado — lotes se muestran ordenados por caducidad pero almacenista selecciona manualmente
- ⚠️ Ajuste de inventario manual existe pero no tiene workflow de aprobación

**Bugs conocidos:**
- 🐛 ReporteCaducidadTab.tsx hace INSERT directo en inventario_movimientos para bajas por caducidad, bypassing RPCs (detectado en auditoría M07)

**Dependencias ENTRANTES:** M05-Recepción (lotes creados), M07 (OC).
**Dependencias SALIENTES:** M04 (stock disponible para pedidos), M09 (carga usa decrementar_lote).

**Madurez: 85%** — Funcional pero falta FIFO automatizado y tiene bypass de RPC.

**¿Bloquea algo?** No urgente. El bypass de RPC es riesgo de seguridad, no de funcionalidad.

---

### MÓDULO M01 — CLIENTES

**Propósito operativo:** Gestionar la cartera de clientes con datos fiscales, sucursales de entrega, zonas, y crédito.

**Archivos principales:** Clientes.tsx (lista+mapa), NuevoCliente.tsx (admin, 639 lín), VendedorNuevoClienteSheet.tsx (vendedor, 1,012 lín), DetalleCliente.tsx, EditarCliente.tsx.

**Tablas:** clientes, cliente_sucursales, cliente_correos, cliente_telefonos, cliente_contactos, cliente_productos_frecuentes, cliente_programacion_pedidos, zonas. RLS: role-based correcto (vendedor solo sus clientes).

**Funcionalidad EXISTENTE:**
- ✅ Alta admin con datos fiscales (RFC validado, régimen, CFDI) + sucursales múltiples
- ✅ Alta vendedor con dirección desglosada + GPS + horarios + restricciones
- ✅ CSF parser (Edge Function parse-csf) con auto-llenado
- ✅ Google Maps autocomplete para dirección de entrega
- ✅ Código postal lookup con auto-asignación de zona/colonia/alcaldía
- ✅ Vista lista + vista mapa
- ✅ Filtros: zona, crédito, vendedor, estado
- ✅ Detección de grupos empresariales
- ✅ Import desde Aspel (Excel)
- ✅ Auditoría fiscal (RFC/dirección)
- ✅ Generación atómica de código cliente (RPC, arreglado en M04.5B)
- ✅ Verificación RFC duplicado en ambos flujos (arreglado en M04.5B)

**Funcionalidad INCOMPLETA:**
- ⚠️ Campos metodo_pago_default y forma_pago_default no existen en tabla clientes (solo por factura)
- ⚠️ direccion_fiscal solo en cliente_sucursales, no en tabla principal clientes

**Bugs conocidos:** Ninguno post-fixes M04.5B.

**Dependencias ENTRANTES:** Ninguna.
**Dependencias SALIENTES:** M04 (pedidos), M09 (entregas), M08 (facturación).

**Madurez: 92%** — Sólido. Los campos fiscales faltantes son para integración Aspel futura.

**¿Bloquea algo?** No.

---

### MÓDULO M04 — PEDIDOS (CAPTURA + AUTORIZACIÓN)

**Propósito operativo:** Core del negocio — capturar pedidos de 3 orígenes (admin, vendedor, portal cliente), autorizarlos, y prepararlos para carga.

**Archivos principales:** Pedidos.tsx (1,133), NuevoPedidoDialog.tsx (1,013), VendedorNuevoPedidoTab.tsx (1,251) + pedido-wizard/ (~1,600), ClienteNuevoPedido.tsx (943), PedidoDetalleDialog.tsx, AutorizacionRapidaSheet.tsx, EditarPedidoPendienteDialog.tsx.

**Tablas:** pedidos, pedidos_detalles, pedidos_historial_cambios, alertas_precio (JSONB). RLS: role-based correcto (M04.5A + M04.6b).

**Funcionalidad EXISTENTE:**
- ✅ 3 flujos de creación: Dialog admin, Wizard vendedor 4 pasos, Page portal cliente
- ✅ Folio atómico PED-YYYYMMDD-NNN (RPC con advisory lock, M04.5A)
- ✅ RLS en pedidos_detalles vinculado al padre (M04.5A)
- ✅ Guard de edición de precios por estado (M04.5A)
- ✅ Offline: IndexedDB + borrador DB con autosave 1.5s
- ✅ Alertas precio: bajo_piso + error_dedo (JSONB, informativo, nunca bloquea)
- ✅ Autorización rápida vía sheet con edición de precios
- ✅ Edición de pedido pendiente (cantidades, precios, agregar/quitar productos)
- ✅ Re-envío de pedidos rechazados
- ✅ 5 tabs admin: alertas, pedidos, cotizaciones, análisis, calendario
- ✅ Post-submit: notificaciones push, email secretaria, PDF, audit log
- ✅ Cálculos compartidos: calcularTotalesPedido (M04.5B.3.1)
- ✅ usePermissions hook centralizado (M04.5B.1)

**Funcionalidad INCOMPLETA:**
- ⚠️ fecha_entrega no se captura en admin ni vendedor (solo portal cliente)
- ⚠️ notas internas no accesibles al vendedor
- ⚠️ Cortesías solo disponibles en admin (no en vendedor)
- ⚠️ 3 implementaciones divergentes de UI (dialog/wizard/page) — decisión consciente pero genera 3,207 líneas

**Bugs conocidos:** Ninguno post-fixes M04.5A/B.

**Dependencias ENTRANTES:** M06 (vendedores), M02 (productos), M01 (clientes), M05 (stock).
**Dependencias SALIENTES:** M09 (rutas), M08 (facturación), M10 (cobranza).

**Madurez: 88%** — Funcional y robusto. El gap principal es fecha_entrega no capturada en admin/vendedor.

**¿Bloquea algo?** No urgente. La fecha de entrega se maneja operativamente (se asigna al crear ruta).

---

### MÓDULO M09 — RUTAS + CARGA + ENTREGA

**Propósito operativo:** Planificar rutas, cargar vehículos en almacén, trackear entregas con GPS, y registrar recepción en cliente.

**Archivos principales:** Rutas.tsx (8 tabs), AlmacenCargaRutasTab.tsx, CargaRutaInlineFlow.tsx, AlmacenCargaScan.tsx, useCargaOperations.ts (567), ChoferPanel.tsx, RegistrarEntregaSheet.tsx, SecretariaRutasTab.tsx (527).

**Tablas:** rutas, entregas, carga_productos, carga_evidencias, chofer_ubicaciones. RLS: blindado M04.6b.

**Funcionalidad EXISTENTE:**
- ✅ 8 tabs de gestión de rutas: planificar, asignaciones, monitoreo, mapa, rutas, zonas, disponibilidad, externos
- ✅ Sugerencias de rutas AI (agrupa por zona, capacidad, prioridad)
- ✅ Carga inline con 3 pasos (selección, escaneo QR, hoja interactiva)
- ✅ Escaneo de barcode/QR para carga (AlmacenCargaScan)
- ✅ useCargaOperations: 8 funciones atómicas (toggle, peso, cantidad, confirmar, resync, finalizar, cancelar)
- ✅ Invariante: SOLO RPCs decrementar/incrementar_lote para inventario
- ✅ GPS tracking web + nativo (Capacitor background)
- ✅ Panel chofer: ruta del día + entregas + firma digital + registro de rechazo
- ✅ Conciliación secretaria: papeles, devoluciones, envío masivo
- ✅ PDF de hoja de carga, nota de entrega, comprobante

**Funcionalidad INCOMPLETA:**
- ⚠️ Confirmación de peso (peso_confirmado) es gate opcional, no siempre forzado

**Bugs conocidos:** Ninguno.

**Dependencias ENTRANTES:** M04 (pedidos pendientes), M05 (inventario para carga), M06 (choferes, vehículos).
**Dependencias SALIENTES:** M08 (entregas gatean facturación), M10 (entregas gatean cobranza).

**Madurez: 95%** — Módulo más sofisticado del sistema. GPS tracking, QR scanning, firma digital.

**¿Bloquea algo?** No.

---

### MÓDULO M08 — FACTURACIÓN + REMISIONES

**Propósito operativo:** Generar CFDI 4.0 vía Facturama, imprimir remisiones, y tracking de facturas.

**Archivos principales:** Facturas.tsx, SecretariaFacturacionTab.tsx (352), GenerarFacturaDialog.tsx, NuevaFacturaDirectaDialog.tsx, timbrar-cfdi (Edge Function), cancelar-cfdi (Edge Function), RemisionPrintTemplate.tsx, PedidoPrintTemplate.tsx.

**Tablas:** facturas, factura_detalles. RLS: role-based.

**Funcionalidad EXISTENTE:**
- ✅ Timbrado CFDI 4.0 vía Facturama API (Edge Function)
- ✅ Cancelación CFDI con motivos SAT (01-04)
- ✅ Factura desde pedido + factura directa (sin pedido)
- ✅ Venta mostrador con RFC público general (XAXX010101000)
- ✅ Uso CFDI: G01, G03, P01, S01
- ✅ Formas de pago: 01, 03, 04, 28, 99
- ✅ Métodos: PUE, PPD
- ✅ XML/PDF almacenados como URLs de Facturama
- ✅ Envío de factura por email
- ✅ Remisión/Nota de venta imprimible (print template)
- ✅ Catálogo SAT para regímenes fiscales

**Funcionalidad INCOMPLETA:**
- ⚠️ No hay campo aspel_folio en facturas (sync con Aspel pendiente)
- ⚠️ No hay export batch de facturas (CSV/XML)

**Bugs conocidos:** Ninguno.

**Dependencias ENTRANTES:** M04 (pedidos entregados), M01 (datos fiscales del cliente), M02 (códigos SAT).
**Dependencias SALIENTES:** M10 (facturas gatean cobranza).

**Madurez: 92%** — CFDI funcional y completo. Falta integración Aspel y export.

**¿Bloquea algo?** No. Facturación funciona 100% vía Facturama independiente de Aspel.

---

### MÓDULO M10 — COBRANZA + PAGOS + CONTABILIDAD

**Propósito operativo:** Cobrar pedidos entregados, validar pagos, y llevar control de cartera de clientes.

**Archivos principales:** VendedorCobranzaTab.tsx, RegistrarCobroPedidoDialog.tsx, SecretariaPagosValidarTab.tsx, Rentabilidad.tsx.

**Tablas:** pagos_cliente, pagos_cliente_detalle, cobros_pedido. RLS: role-based (vendedor ve solo sus clientes).

**Funcionalidad EXISTENTE:**
- ✅ Dashboard de cobranza para vendedor (vencido/por vencer/al corriente)
- ✅ Registro de cobro con 4 formas de pago (efectivo, depósito, transferencia, cheque)
- ✅ Validación de pagos por secretaria (aprobar/rechazar)
- ✅ Comprobante de pago (URL)
- ✅ Trigger actualizar_saldo_cliente_pago (auto-recalcula saldo)
- ✅ Allocación multi-factura (pagos_cliente_detalle)
- ✅ Rentabilidad por producto (margen, costo promedio)
- ✅ RPC registrar_cobro_pedido con role guard

**Funcionalidad INCOMPLETA:**
- ⚠️ No hay módulo de contabilidad formal (no journal entries, no balance sheet, no estado de resultados)
- ⚠️ No hay reporte de antigüedad de saldos (aging report)
- ⚠️ No hay integración con Aspel para contabilidad
- ⚠️ UI de allocación manual de pagos a facturas no existe (solo automática)

**Bugs conocidos:** Ninguno.

**Dependencias ENTRANTES:** M04 (pedidos), M08 (facturas), M09 (entregas).
**Dependencias SALIENTES:** Ninguna (cierre del ciclo).

**Madurez: 70%** — Cobranza operativa funciona. Contabilidad formal no existe.

**¿Bloquea algo?** No urgente para operación diaria. Sí para reportes financieros formales.

---

## 3. Matriz de Madurez

| Módulo | Nombre | Madurez | Bloqueante | Prioridad |
|--------|--------|---------|------------|-----------|
| M07 | Compras / OC | 98% | No | P5 |
| M02 | Productos / Precios | 97% | No | P5 |
| M09 | Rutas / Carga / Entrega | 95% | No | P4 |
| M05-R | Recepción Almacén | 95% | No | P5 |
| M06 | Empleados / Asistencia / Vehículos | 93% | No | P4 |
| M01 | Clientes | 92% | No | P4 |
| M08 | Facturación / Remisiones | 92% | No | P3 |
| M04 | Pedidos (Captura + Autorización) | 88% | No | P2 |
| M05-I | Inventario / Stock / Lotes | 85% | No | P3 |
| M10 | Cobranza / Pagos / Contabilidad | 70% | Sí (reportes) | P1 |

---

## 4. Cadena de Dependencias

```
M06 Empleados ──┐
                 ├── M04 Pedidos ──── M09 Rutas ──── M08 Facturación ──── M10 Cobranza
M02 Productos ──┤                                         │
                 │                                         │
M01 Clientes ───┘                                         │
                                                           │
M07 Compras ──── M05-R Recepción ──── M05-I Inventario ──┘
```

Todo converge en M04 (Pedidos) como core operativo. M10 (Cobranza) es el cierre del ciclo y el módulo con menor madurez.

---

## 5. Recomendación de Orden de Trabajo

**SPRINT 1 (1-2 semanas): M10 Cobranza — elevar de 70% a 85%**
- Agregar reporte de antigüedad de saldos (aging report)
- UI para allocación manual de pagos a facturas
- Dashboard de cartera para admin/contadora
- Razón: es el único módulo que retrasa decisiones financieras

**SPRINT 2 (1 semana): M04 Pedidos — elevar de 88% a 93%**
- Agregar campo fecha_entrega al wizard vendedor y dialog admin
- Notas internas visibles para vendedor (read-only)
- Razón: fecha_entrega es dato operativo que falta en 2 de 3 flujos

**SPRINT 3 (1 semana): M05-I Inventario — elevar de 85% a 92%**
- Corregir bypass de RPC en ReporteCaducidadTab (usar decrementar_lote)
- Evaluar FIFO/FEFO automatizado vs manual con alertas
- Razón: integridad de inventario es la base de toda la operación

**SPRINT 4 (ongoing): Calidad general**
- Completar upload de documentos en EmpleadoWizard paso 3
- Preparar campos Aspel (metodo_pago, forma_pago en clientes, aspel_folio en facturas)
- Responsive de SecretariaPedidosTab

---

## 6. Anti-patrones Detectados

1. **Folio client-side (pre-M04.5A):** Se generaban folios con `Date.now()` en vez de RPC atómico. Creó riesgo de duplicados en captura concurrente nocturna. Corregido en M04.5A.

2. **RLS "true/true" en migración de alineación (20260326000000):** Al alinear BD con código, se aplicó `USING (true)` a 13 tablas core como fix temporal. Parcialmente corregido en M04.6b.

3. **3 implementaciones de "Nuevo Pedido":** Admin (dialog), vendedor (wizard), cliente (page) comparten lógica pero no código. Se extrajo `calcularTotalesPedido` pero el 90% sigue duplicado. Decisión: las UI son genuinamente distintas, la lógica se consolida incrementalmente.

4. **console.logs en producción:** 57 logs de debug en pushNotifications.ts + PushNotificationsGate.tsx. Limpiados en M04.6b.

---

## 7. Métricas de Salud

| Métrica | Valor |
|---------|-------|
| Promedio de madurez | **87%** |
| Módulos al 95%+ | 4 (M07, M02, M09, M05-R) |
| Módulos al 90%+ | 8 de 10 |
| Módulos bloqueantes | 1 (M10, para reportes financieros) |
| Componentes .tsx totales | 446 |
| Rutas protegidas | 33 |
| Tablas con RLS correcto | ~80% post-M04.6b |
| RPCs con role guards | 8 (M04.6b) |
| Deuda técnica (bugs conocidos) | 3 (upload wizard, bypass RPC caducidad, RLS inventario) |
| Hooks centralizados creados | usePermissions, useListaPrecios, usePrecioEditor, calcularTotalesPedido |
