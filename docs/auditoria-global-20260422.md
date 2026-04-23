# AUDITORÍA GLOBAL ALMASA-OS — Blueprint v0.4 Base
**Fecha:** 2026-04-22 | **Alcance:** 8 roles, 446 componentes, 111 tablas RLS

---

## 1. RESUMEN EJECUTIVO

### Top 5 Hallazgos Críticos

1. **13 tablas core con RLS abierto (`USING (true)`)** — profiles, user_roles, empleados, inventario_lotes, inventario_movimientos, entregas, carga_productos, carga_evidencias, zonas, bodegas, cliente_sucursales, notificaciones, y más. Cualquier usuario autenticado puede leer/escribir/borrar todo. Migración `20260326000000_alinear_bd_con_codigo.sql`.

2. **Duplicación masiva de componentes por rol** — Lista de precios tiene 3 versiones (Admin 636 lín + Secretaria 479 + Vendedor 419 = 1,534 líneas con ~60% overlap). Pedidos tiene NuevoPedidoDialog (1,013) + VendedorNuevoPedidoTab (1,251) con lógica duplicada de cálculo/insert.

3. **38 console.logs en pushNotifications.ts** + 19 en PushNotificationsGate.tsx — código de producción con logging excesivo.

4. **Lógica de permisos dispersa** — 40+ role checks inline en componentes en vez de hook centralizado. Mix de `{isAdmin && <JSX>}` (correcto) con `disabled={!canX}` (18 violaciones del patrón del proyecto).

5. **Sin integración Aspel SAE** — El sistema factura vía Facturama (CFDI 4.0 completo), pero no hay mecanismo de sync bidireccional con Aspel. Faltan campos: `metodo_pago_default` y `forma_pago_default` en clientes, `aspel_folio` en facturas.

### Top 5 Oportunidades de Mejora

1. **Consolidar componentes por rol** — Extraer lógica compartida de Precios/Pedidos/Clientes a componentes base con props de permisos.
2. **Endurecer RLS** — Reemplazar las 13+ políticas `true/true` con políticas role-based reales.
3. **Hook centralizado `usePermissions(module, action)`** — Eliminar role checks dispersos.
4. **Limpiar console.logs** — 15 archivos con 3+ logs en producción.
5. **Campo `fecha_entrega`** — Existe en DB pero nunca se captura en ningún flujo de creación de pedidos.

### Estado General

| Métrica | Valor |
|---------|-------|
| Componentes totales (.tsx) | 446 (399 components + 47 pages) |
| Tablas con RLS habilitado | 111 |
| Tablas con RLS `true/true` (agujeros) | 26+ políticas en 13+ tablas core |
| RPCs SECURITY DEFINER | 25+ |
| Roles implementados | 8/8 |
| Módulos funcionales | ~23 |
| Duplicación estimada | ~15% del código frontend |
| TODOs pendientes | 4 (1 accionable: upload en EmpleadoWizard) |
| Console.logs en producción | 100+ en 15 archivos |

---

## 2. MATRIZ GLOBAL DE ACCESO ROL × MÓDULO

| Módulo | admin | secretaria | vendedor | contadora | almacen | gerente_almacen | chofer | cliente |
|--------|-------|------------|----------|-----------|---------|-----------------|--------|---------|
| **Dashboard** | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ❌ | ❌ | ❌ | ❌ |
| **Clientes** | ✅ CRUD | ✅ CRUD | ✅ CRUD (sus clientes) | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Productos** | ✅ Full + modo cobro + historial | ✅ Ver/editar | ❌ (via panel precios) | ✅ Ver | ✅ Ver (tablet) | ✅ Ver (tablet) | ❌ | ❌ |
| **Lista Precios** | ✅ Full + análisis | ✅ Editar precios | ✅ Ver (read-only) | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Pedidos** | ✅ Full + autorizar | ✅ Full (precio disabled) | ✅ Crear/ver/editar (sus clientes) | ❌ | ❌ | ❌ | ❌ | ✅ Crear/ver (portal) |
| **Cotizaciones Lecaroz** | ✅ Full | ✅ Full | ✅ Full | ✅ Ver | ❌ | ❌ | ❌ | ❌ |
| **Compras** | ✅ Full | ✅ Full (mode=secretaria) | ❌ | ✅ Full | ❌ | ❌ | ❌ | ❌ |
| **Inventario** | ✅ Full | ✅ Full | ❌ | ❌ | ✅ Tablet view | ✅ Full tablet | ❌ | ❌ |
| **Facturación** | ✅ Full | ✅ Full | ❌ | ✅ Full | ❌ | ❌ | ❌ | ❌ |
| **Rentabilidad** | ✅ Full | ❌ | ❌ | ✅ Full | ❌ | ❌ | ❌ | ❌ |
| **Rutas** | ✅ Full | ✅ Full | ❌ | ❌ | ❌ | ❌ | ✅ Su ruta (panel) | ❌ |
| **Empleados** | ✅ Full + baja | ✅ Full | ❌ | ✅ Ver | ❌ | ❌ | ❌ | ❌ |
| **Asistencia** | ✅ Full | ✅ Full | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Vehículos** | ✅ Full | ✅ Full | ❌ | ❌ | ❌ | ✅ Full (tablet) | ❌ | ❌ |
| **Correos** | ✅ Full | ✅ Full | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Chat** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Almacén Tablet** | ✅ Full | ❌ | ❌ | ❌ | ✅ 8 tabs | ✅ 14 tabs (+ flotilla) | ❌ | ❌ |
| **Portal Cliente** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ 4 tabs |
| **Configuración** | ✅ Full | ❌ | ❌ | ✅ Parcial | ❌ | ✅ Parcial | ❌ | ❌ |
| **Permisos** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Respaldos** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Fumigaciones** | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |

---

## 3. AUDITORÍA POR ROL

### 3.1 ADMIN (Jose — Dueño)

**Panel:** No tiene panel dedicado. Usa `/dashboard` + sidebar completo.
**Rutas:** Acceso a TODAS las rutas protegidas (36+).
**Sidebar:** Muestra todos los módulos en 9 categorías.
**Capacidades especiales:**
- Editar precios en pedidos existentes (`canEditPrice` en PedidoDetalleDialog:98)
- Autorizar precios bajo piso
- Dar de baja empleados
- Gestionar permisos de otros usuarios
- Acceso a modo cobro y historial de precios
- Generar assets (screenshots, iconos)

**Hallazgo:** Admin puede acceder a paneles de otros roles (`/vendedor`, `/secretaria`, `/chofer`, `/almacen-tablet`) — útil para soporte pero no hay indicador visual de "modo admin".

### 3.2 SECRETARIA (Oficina)

**Panel:** `/secretaria` — SecretariaPanel.tsx (13 tabs).
**Redirect automático:** Layout.tsx:308 si `isOnlySecretaria`.
**Tabs:** productos, costos, precios, pedidos (default), mostrador, compras, inventario, facturación, chat, correos, clientes, rutas, pagos_validar.
**Badges:** 7 contadores en sidebar (pedidos por autorizar, ventas mostrador, facturas, chat, correos, compras, pagos).

**Hallazgo:** Secretaria es el rol más amplio después de admin. Tiene su propio panel completo que replica mucha funcionalidad de las páginas compartidas (SecretariaPedidosTab vs Pedidos.tsx).

### 3.3 VENDEDOR (Carlos, Salvador, Martín, Venancio)

**Panel:** `/vendedor` — VendedorPanel.tsx (10 tabs).
**Redirect automático:** Layout.tsx:312 si `isOnlyVendedor`.
**Tabs:** clientes, nuevo pedido, pedidos, cobranza, ventas, novedades, precios, saldos, comisiones, análisis.
**Stats:** 5 KPIs en tab clientes (clientes, ventas mes/año, por cobrar, vencido).

**Hallazgos:**
- Wizard de 4 pasos para nuevo pedido con offline support (IndexedDB)
- `vendedor_id` auto-llenado de `auth.uid()`, no editable
- Puede ver precios pero NO editarlos (read-only)
- No tiene acceso a `notas` internas del pedido (solo `notas_entrega`)
- No tiene acceso a cortesías
- Guard de navegación para borradores no guardados

### 3.4 CONTADORA (Norma)

**Panel:** NO tiene panel dedicado. Usa páginas compartidas.
**Rutas:** dashboard, productos, compras, facturas, empleados, rentabilidad, chat, lecaroz, configuración.

**Hallazgo:** Es el único rol operativo sin panel dedicado. Navega el sistema general. Podría beneficiarse de un panel tipo "SecretariaPanel" enfocado en finanzas.

### 3.5 ALMACEN (Almacenistas)

**Panel:** `/almacen-tablet` — AlmacenTablet.tsx (8 tabs base).
**Redirect automático:** Layout.tsx:300 si `isOnlyAlmacen`.
**Tabs:** rutas, ventas mostrador, recepción, reporte, inventario, productos, fumigaciones, caducidad.
**Auto-detección de bodega:** GPS/WiFi via `useBodegaAutoDetect`.

**Hallazgo:** Diseñado tablet-first. No ve tabs de flotilla (alertas, checkups, vehículos, personal, disponibilidad, externos) — esos son exclusivos de gerente_almacen.

### 3.6 GERENTE ALMACEN (Supervisor)

**Panel:** `/almacen-tablet` — mismo componente, 14 tabs (6 extra).
**Tabs extra:** alertas flotilla, checkups vehículos, vehículos, personal, disponibilidad, ayudantes externos.
**Visibilidad:** Controlada por `isGerenteAlmacen || isAdmin` (AlmacenTablet.tsx:82).

**Hallazgo:** También tiene acceso a `/configuracion` y `/vehiculos` como páginas standalone.

### 3.7 CHOFER (Entregas)

**Panel:** `/chofer` — ChoferPanel.tsx (UI modal, no tabs).
**Redirect automático:** Layout.tsx:316 si `isOnlyChofer`.
**Funcionalidad:** Ver ruta del día, lista de entregas, marcar entregado, GPS tracking, finalizar ruta.

**Hallazgo:** Es el panel más minimalista. No tiene tabs — todo es contextual según el estado de la ruta. GPS tracking se activa solo cuando ruta está "en_ruta" o "cargada".

### 3.8 CLIENTE (Portal)

**Panel:** `/portal-cliente` — PortalCliente.tsx (4 tabs).
**Ruta:** Sin ProtectedRoute (auth manejado internamente).
**Tabs:** pedidos, nuevo pedido, estado de cuenta, entregas.
**Stats:** 5 cards (crédito, saldo, pedidos mes, producto favorito, última compra).

**Hallazgo:** Completamente aislado del sistema admin. Usa `PED-CLI-` como prefijo de folio (ahora migrado a `PED-YYYYMMDD-NNN` con RPC).

---

## 4. AUDITORÍA POR MÓDULO CRÍTICO

### 4.1 Pedidos — Campos por Rol

| Campo | Admin | Vendedor | Secretaria | Cliente |
|-------|-------|----------|------------|---------|
| cliente_id | editable (todos) | editable (sus clientes) | editable (todos) | auto |
| vendedor_id | editable (selector) | **auto (auth.uid)** | editable (selector) | auto |
| termino_credito | editable | editable | editable | oculto |
| requiere_factura | editable | editable | editable | editable |
| productos | editable | editable (búsqueda+frecuentes) | editable | editable |
| precio_unitario | editable (sin guard) | editable (alertas) | editable en creación | oculto |
| notas (internas) | **editable** | **oculto** | **editable** | oculto |
| notas_entrega | editable | editable | editable | oculto |
| fecha_entrega | **oculto (no capturado)** | **oculto** | **oculto** | **editable** (solo en portal) |
| cortesías | **editable** | **oculto** | **editable** | oculto |
| es_directo | auto (DIRECTO_VALUE) | auto (false) | auto | auto |

**Inconsistencias detectadas:**
- `fecha_entrega`: existe en DB, solo capturada en portal cliente, no en admin/vendedor/secretaria
- `notas`: admin/secretaria pueden escribir, vendedor no puede ni ver
- `cortesías`: admin/secretaria pueden agregar, vendedor no

### 4.2 Clientes — Campos Fiscales

| Campo | Presente | Requerido | Notas |
|-------|----------|-----------|-------|
| rfc | Sí | Opcional | Validado formato |
| razon_social | Sí | Opcional | — |
| regimen_fiscal | Sí | Opcional | Catálogo SAT integrado |
| codigo_postal | Sí | Opcional | — |
| uso_cfdi_default | Sí | Opcional | — |
| direccion_fiscal | **Solo en sucursales** | — | Falta en tabla principal clientes |
| metodo_pago_default | **No existe** | — | Solo se captura por factura |
| forma_pago_default | **No existe** | — | Solo se captura por factura |

---

## 5. ARQUITECTURA TÉCNICA

### 5.1 Duplicaciones Críticas

| Componente | Versiones | Líneas totales | Overlap estimado |
|------------|-----------|----------------|------------------|
| Lista de Precios | Admin (636) + Secretaria (479) + Vendedor (419) | 1,534 | ~60% |
| Nuevo Pedido | NuevoPedidoDialog (1,013) + VendedorNuevoPedidoTab (1,251) + ClienteNuevoPedido (943) | 3,207 | ~40% |
| Pedidos Tab | Pedidos.tsx (1,133) + SecretariaPedidosTab (232) + VendedorPedidosTab (735) | 2,100 | ~30% |

### 5.2 Permisos Dispersos

- **Hook centralizado:** `useUserRoles()` existe y retorna `isAdmin`, `isVendedor`, etc.
- **Problema:** 40+ componentes hacen role checks inline en vez de usar un hook de permisos por acción.
- **Patrón correcto (mayoritario):** `{isAdmin && <EditablePriceCell>}`
- **Patrón incorrecto (18 instancias):** `disabled={!canSave}` en botones de permiso

### 5.3 RLS — Estado Real

| Categoría | Tablas | Estado |
|-----------|--------|--------|
| RLS correcto (role-based) | pedidos, clientes, conversaciones | ✅ |
| RLS recién corregido (M04.5A) | pedidos_detalles | ✅ |
| RLS abierto `true/true` | profiles, user_roles, empleados, inventario_lotes, inventario_movimientos, entregas, carga_productos, zonas, bodegas, notificaciones + 16 más | 🔴 CRÍTICO |

### 5.4 Console.logs en Producción

| Archivo | Count | Severidad |
|---------|-------|-----------|
| pushNotifications.ts | 38 | Alta (servicio core) |
| PushNotificationsGate.tsx | 19 | Alta |
| ProcesarPedidoDialog.tsx | 15 | Media |
| ImportarSucursalesExcelDialog.tsx | 13 | Baja |
| useRouteNotifications.ts | 11 | Media |
| AlmacenRecepcionSheet.tsx | 10 | Media |

### 5.5 RPCs Críticos

| RPC | Seguridad | Rol Check | Riesgo |
|-----|-----------|-----------|--------|
| generar_folio_pedido | DEFINER + advisory lock | Ninguno (cualquiera genera) | Bajo |
| decrementar_lote | DEFINER | Ninguno | **Alto** — cualquier auth puede decrementar |
| incrementar_lote | DEFINER | Ninguno | **Alto** — cualquier auth puede incrementar |
| update_empleado_completo | DEFINER | Ninguno | **Alto** — bypass total de RLS |

---

## 6. PREPARACIÓN ASPEL

### Estado Actual
- **Facturación:** 100% vía Facturama (CFDI 4.0 completo, timbrado, cancelación)
- **Integración Aspel:** NO existe. Solo hay importador de catálogo de clientes desde Excel Aspel.
- **Conciliación fiscal:** No implementada. Solo conciliación de entregas.

### Qué Falta

| Requisito | Estado | Acción |
|-----------|--------|--------|
| Campos fiscales en clientes | 80% | Agregar `metodo_pago_default`, `forma_pago_default`, `direccion_fiscal` |
| Campos SAT en productos | 70% | `codigo_sat` y `unidad_sat` existen. Falta `codigo_barras` |
| CFDI completo | ✅ 100% | Facturama funcional |
| Sync Aspel | 0% | Necesita: campo `aspel_folio` en facturas, Edge Function de sync, tabla de mapeo productos |
| Export batch | 0% | No hay CSV/XML export para alimentar Aspel |
| Conciliación fiscal | 0% | No hay componente de conciliación factura Aspel ↔ ALMASA-OS |

---

## 7. RECOMENDACIONES PRIORIZADAS

### 🔴 ALTA — Refactor inmediato

| # | Recomendación | Impacto |
|---|---------------|---------|
| 1 | **Endurecer RLS en 13+ tablas** — Reemplazar `USING (true)` con políticas role-based reales. Priorizar: user_roles, profiles, empleados, inventario_lotes, inventario_movimientos | Seguridad crítica |
| 2 | **Agregar role checks a RPCs de inventario** — `decrementar_lote` y `incrementar_lote` deben validar que el caller tiene rol almacen/admin | Seguridad |
| 3 | **Limpiar console.logs** — Al menos pushNotifications.ts (38) y PushNotificationsGate.tsx (19) | Producción |

### 🟡 MEDIA — Deuda técnica a resolver pronto

| # | Recomendación | Impacto |
|---|---------------|---------|
| 4 | **Consolidar Lista de Precios** — Un componente base con props `{canEdit, showAnalysis}` en vez de 3 versiones | 1,534 → ~600 líneas |
| 5 | **Hook `usePermissions(module, action)`** — Centralizar role checks. Eliminar 40+ checks inline | Mantenibilidad |
| 6 | **Agregar `fecha_entrega`** a flujos de creación admin/vendedor/secretaria | Funcionalidad |
| 7 | **Panel dedicado para contadora** — Similar a SecretariaPanel pero enfocado en finanzas (facturas, rentabilidad, cartera, compras) | UX |
| 8 | **Corregir 18 `disabled={!can}`** → renderizado condicional | Consistencia |

### 🟢 BAJA — Limpieza cuando haya tiempo

| # | Recomendación | Impacto |
|---|---------------|---------|
| 9 | Agregar `notas` y `cortesías` al wizard del vendedor | Completitud |
| 10 | Completar TODO de upload en EmpleadoWizard.tsx:248 | Funcionalidad |
| 11 | Eliminar PedidosPorAutorizarTab.tsx (reemplazado por AlertasPrecioList) | Limpieza |
| 12 | Preparar campos Aspel (metodo_pago, forma_pago en clientes, aspel_folio en facturas) | Integración futura |
| 13 | Agregar `codigo_barras` a productos para compatibilidad con lectores | Operaciones |
