# AUDITORÍA ALMASA-OS — 04 BUGS Y DEUDA TÉCNICA
**Fecha**: 8 mayo 2026

---

## A) VERIFICACIÓN PROFUNDA DEL TOP 10

---

### BUG #1 — CPP no se calcula

**DIAGNÓSTICO: ✅ CERRADO (ya funciona vía trigger)**

La función `calcular_costo_promedio_ponderado` SÍ se ejecuta automáticamente. Existe un **trigger** `trg_actualizar_costo_promedio` en `inventario_lotes` (AFTER INSERT/UPDATE/DELETE) que llama a `actualizar_costo_promedio_trigger()`, que a su vez llama a `calcular_costo_promedio_ponderado(producto_id)` y actualiza `productos.costo_promedio_ponderado`.

```sql
-- Migración 20260121041748
CREATE TRIGGER trg_actualizar_costo_promedio
AFTER INSERT OR UPDATE OR DELETE ON inventario_lotes
FOR EACH ROW
EXECUTE FUNCTION actualizar_costo_promedio_trigger();
```

**La función calcula:**
```sql
SELECT COALESCE(
  SUM(precio_compra * cantidad_disponible) / NULLIF(SUM(cantidad_disponible), 0), 0
) FROM inventario_lotes
WHERE producto_id = p_producto_id AND cantidad_disponible > 0;
```

**Lo que SÍ funciona:** Cada vez que se crea/modifica/elimina un `inventario_lote`, el CPP se recalcula automáticamente.

**Lo que NO funciona:** El frontend nunca llama la función directamente (confirmado: 0 invocaciones desde src/). Pero NO NECESITA hacerlo — el trigger lo hace. El bug reportado en la auditoría anterior era **falso positivo**.

**Limitación real:** La función NO considera gastos asociados (flete, aduana, cuadrilla). Solo promedia `precio_compra` de lotes activos. Esto es correcto para el modelo actual de ALMASA (el precio_compra ya incluye el costo unitario del proveedor).

**Estado: ✅ CERRADO — trigger funcional, CPP se actualiza automáticamente.**

---

### BUG #2 — Devoluciones no reversan inventario

**DIAGNÓSTICO: 🔴 ABIERTO — confirmado**

La función `agregar_devolucion_a_oc` hace SOLAMENTE:
```sql
UPDATE ordenes_compra
SET monto_devoluciones = COALESCE(monto_devoluciones, 0) + p_monto,
    total_ajustado = total - (COALESCE(monto_devoluciones, 0) + p_monto)
WHERE id = p_oc_id;
```

**Lo que hace:** Incrementa `monto_devoluciones` y ajusta `total_ajustado` en la OC. Es decir, ajusta el MONTO FINANCIERO.

**Lo que NO hace:**
- No decrementa `inventario_lotes.cantidad_disponible`
- No inserta `inventario_movimientos` tipo 'salida' o 'devolucion'
- No recalcula `productos.stock_actual`

**Flujos de devolución encontrados:**
- `DevolucionProveedorDialog.tsx` (almacén → proveedor): Inserta en `devoluciones_proveedor` + llama `agregar_devolucion_a_oc` → **stock NO se decrementa**
- `devoluciones` tabla (cliente → almacén): Existe en BD pero no tiene RPC ni trigger de inventario visible

**Impacto:** Stock inflado permanentemente por cada devolución a proveedor. El inventario dice que hay X bultos pero en realidad Y fueron devueltos.

**Fix necesario:** Agregar a `agregar_devolucion_a_oc` (o trigger en `devoluciones_proveedor`): decrementar lotes + insertar movimiento + recalcular stock.

---

### BUG #3 — Facturado vs CFDI desincronizado

**DIAGNÓSTICO: 🟠 PARCIAL — problema arquitectónico**

`pedidos.facturado` es un boolean en la tabla pedidos. Se usa en:
- `exportData.ts`: export shows "Facturado: Sí/No"
- Múltiples queries filtran por `facturado`

**El problema:** `pedidos.facturado = true` puede marcarse sin que exista un registro en la tabla `facturas` con CFDI timbrado. Son dos flujos paralelos:
1. Marcar pedido como facturado (toggle boolean)
2. Crear CFDI real vía `timbrar-cfdi` edge function → insert en `facturas`

No hay constraint ni trigger que sincronice ambos.

**No existe:** campo `tipo_documento`, concepto de "pre-factura", ni `pre_factura` en el código.

---

### BUG #4 — Folio duplicable

**DIAGNÓSTICO: ✅ CERRADO para pedidos, 🟠 ABIERTO para cotización→pedido**

La función `generar_folio_pedido()` tiene `pg_advisory_xact_lock`:
```sql
PERFORM pg_advisory_xact_lock(hashtext('generar_folio_pedido'));
```
Esto es correcto y atómico.

**El bug restante:** `CotizacionDetalleDialog.handleConvertirPedido` genera folio con query manual (`LIKE + parseInt`) en vez de llamar la RPC. Riesgo de duplicado bajo concurrencia.

---

### BUG #5 — Faltantes desconectado de Score

**DIAGNÓSTICO: 🟠 PARCIAL — dos modelos coexisten**

- Tabla `faltantes_proveedor` existe (creada en nuestras sesiones Día 3). Tiene: `proveedor_id`, `orden_compra_id`, `producto_id`, `tipo_faltante`, `cantidad_pedida/recibida/faltante`, `peso_pedido/recibido/faltante`.
- `get_proveedor_score` consulta `faltantes_proveedor` para calcular % completas.
- PERO la UI de faltantes (`FaltantesPendientesTab`) usa `ordenes_compra_entregas.origen_faltante = true`.
- No hay trigger ni RPC que sincronice: crear un faltante en la UI NO inserta en `faltantes_proveedor`.

**No existe:** tabla de score de empleados, calificacion_empleado, ni performance_empleado.

---

### BUG #6 — Status mismatch en rutas

**DIAGNÓSTICO: 🟠 CONFIRMADO — 3 variantes coexisten**

| Valor | Dónde se usa | Significado |
|-------|-------------|-------------|
| `"en_curso"` | Rutas admin (SecretariaRutasTab:95,217,220) | Ruta activa con chofer en camino |
| `"en_ruta"` | Pedidos (SecretariaPedidosTab:107, VendedorEnRutaTab:78, types.ts) | Pedido asignado a ruta activa |
| `"en_camino"` | SecretariaRutasTab:69,310,338 | Tab label UI (no valor de BD) |

`"en_camino"` es solo UI label. `"en_curso"` es status de `rutas`. `"en_ruta"` es status de `pedidos`. Son dominios diferentes pero el naming causa confusión al leer código.

VendedorEnRutaTab busca `ruta.status = "en_curso"` AND `pedido.status = "en_ruta"` → correcto, pero requiere que ambos estén en el status esperado simultáneamente.

---

### BUG #9 — Dos paths de recepción

**DIAGNÓSTICO: 🟠 CONFIRMADO**

7 archivos tocan recepciones:
1. `AlmacenRecepcionSheet.tsx` (2,619 lín) — **CREA inventario_lotes** ✅
2. `AlmacenRecepcionTab.tsx` (1,428 lín) — Lista + lanza Sheet
3. `RegistrarRecepcionDialog.tsx` (933 lín) — **NO crea lotes** ❌
4. `RecepcionDetalleDialog.tsx` (1,114 lín) — Solo lectura
5. `ReporteRecepcionesDiaTab.tsx` — Reporte diario
6. `recepcionPdfGenerator.ts` — PDF
7. `reporteRecepcionesDiaPdfGenerator.ts` — PDF reporte

Solo 1 RPC de recepción existe en BD: `registrar_baja_caducidad` (para bajas, no recepciones).

La RPC `registrar_recepcion_oc` que diseñamos en Día 3 NO fue ejecutada (postponed a Sesión Almacén v3).

---

### BUG #10 — NotificacionesCaducidad consulta tabla equivocada

**DIAGNÓSTICO: 🔴 CONFIRMADO**

```typescript
// NotificacionesCaducidad.tsx
.from("inventario_movimientos")  // ← INCORRECTO
.select("producto_id, fecha_caducidad, lote")
.eq("tipo_movimiento", "entrada")
.lte("fecha_caducidad", fecha30Dias)
```

**Debería consultar:** `inventario_lotes` donde `cantidad_disponible > 0` y `fecha_caducidad` próxima.

**Problemas:**
- Consulta movimientos históricos, no lotes activos
- Un lote con cantidad=0 (ya consumido) aún genera alerta por su movimiento de entrada
- Lotes que entraron sin movimiento (ej: carga inicial) no aparecen
- Duplicados: múltiples movimientos del mismo producto generan alertas duplicadas (mitigado parcialmente con `lotesUnicos` Set)

**Impacto:** Alertas fantasma (lotes ya consumidos), alertas faltantes (lotes sin movimiento), conteo inexacto.

---

## B) BUGS ADICIONALES DESCUBIERTOS

### BUG #11 — `documentos` state sin setter en Empleados.tsx
- Archivo: `src/pages/Empleados.tsx:185-186`
- Descripción: `const [documentos] = useState({})` — sin `setDocumentos`. El state siempre es `{}`. La eliminación de archivos de storage al desactivar empleado (línea ~892) nunca ejecuta porque `documentos[id]?.length > 0` siempre es false.
- Impacto: Archivos huérfanos en storage al desactivar empleados
- Severidad: 🟡 Medio

### BUG #12 — 14 Edge Functions sin verify_jwt
- Archivo: `supabase/config.toml`
- Descripción: 14 funciones con `verify_jwt = false` — aceptan requests sin autenticación
- Funciones afectadas: gmail-auth, gmail-callback, gmail-api, notificar-entregas-programadas, notificar-faltante-anticipado, notificar-pedidos-programados, notificar-solicitud-deposito, + 7 más
- Impacto: Las funciones de Gmail OAuth necesitan ser públicas (callback). Las de notificación se justifican si son llamadas por cron/webhook. Pero `gmail-api` sin JWT es riesgoso — cualquiera con la URL puede enviar emails.
- Severidad: 🟠 Alto (gmail-api expuesto)

### BUG #13 — `renderStats()` nunca renderizado en AlmacenTablet
- Archivo: `src/pages/AlmacenTablet.tsx:~208`
- Descripción: Función definida pero no llamada en JSX
- Impacto: KPI cards del almacén invisibles
- Severidad: 🟡 Medio

---

## C) DEUDA TÉCNICA CUANTIFICADA

### 1. console.log en producción: **126**
Top ofensores:
| Archivo | Count |
|---------|-------|
| ProcesarPedidoDialog.tsx | 15 |
| ImportarSucursalesExcelDialog.tsx | 13 |
| useRouteNotifications.ts | 11 |
| AlmacenRecepcionSheet.tsx | 10 |
| backgroundGeolocation.ts | 7 |
| useBodegaAutoDetect.ts | 7 |

### 2. Uso de `any` en TypeScript: **1,154**
Top ofensores:
| Archivo | Count |
|---------|-------|
| Empleados.tsx | 39 |
| PedidosAcumulativosManager.tsx | 28 |
| ProcesarPedidoDialog.tsx | 27 |
| OrdenAccionesDialog.tsx | 27 |
| ProveedoresTab.tsx | 24 |
| OrdenesCompraTab.tsx | 24 |
| useDashboardData.ts | 23 |
| AlmacenRecepcionSheet.tsx | 21 |

### 3. Componentes monstruo (>500 líneas): **45+**
Top 10:
| Archivo | Líneas |
|---------|--------|
| Empleados.tsx | 3,126 |
| CrearOrdenCompraWizard.tsx | 3,021 |
| OrdenesCompraTab.tsx | 2,912 |
| AlmacenRecepcionSheet.tsx | 2,619 |
| OrdenAccionesDialog.tsx | 2,321 |
| ProveedoresTab.tsx | 2,095 |
| ProcesarPedidoDialog.tsx | 1,886 |
| VehiculosTab.tsx | 1,460 |
| AlmacenRecepcionTab.tsx | 1,428 |
| CotizacionDetalleDialog.tsx | 1,415 |

### 4. TODO/FIXME en código: **~3 reales**
La mayoría de los 20 matches son falsos positivos (texto "TODO" en comments descriptivos o "TODOS" en español). TODOs reales:
- `EmpleadoWizard.tsx:248` — upload to storage not implemented
- `proveedorUtils.ts:29,65` — format en mayúsculas pending

---

## D) RIESGOS DE SEGURIDAD

### 1. Edge Functions sin JWT: 14 de 53
Funciones `verify_jwt = false`:
- `gmail-auth` — Justificado (OAuth callback)
- `gmail-callback` — Justificado (OAuth callback)
- `gmail-api` — **🔴 RIESGO: API de email sin autenticación**
- 11 funciones de notificación — Justificado si son webhook/cron
  
**Recomendación:** Agregar `verify_jwt = true` a `gmail-api` y pasar el token desde el frontend.

### 2. RLS habilitado
- 117 statements `ENABLE ROW LEVEL SECURITY` en migraciones
- La mayoría de tablas tienen RLS. Sin acceso SQL directo no puedo verificar si TODAS lo tienen.

### 3. SECURITY DEFINER: 64 funciones
- Todas las RPCs de negocio usan DEFINER (necesario para bypass RLS en operaciones atómicas)
- Cada una tiene guard de rol interno — correcto

### 4. Variables de entorno
- `VITE_` prefixed vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_GOOGLE_MAPS_API_KEY`, `VITE_SUPABASE_PROJECT_ID`
- Todas son keys públicas (anon key, maps key) — correcto
- No se encontraron secrets hardcodeados (sk_live, service_role)
- Passwords en código son todos inputs de formulario, no hardcoded

### 5. Storage buckets
9 buckets encontrados. Sin acceso al dashboard no puedo verificar cuáles son públicos vs privados. `empleados-fotos` probablemente es público (getPublicUrl). Los de evidencias deberían ser privados (signed URLs).

---

## E) DEPENDENCIAS Y VULNERABILIDADES

### npm audit
```
12 vulnerabilities (1 moderate, 10 high, 1 critical)
```
**Acción:** `npm audit fix` para los que no requieren breaking changes. Revisar el crítico manualmente.

### Dependencias desactualizadas
Principalmente Radix UI (`@radix-ui/*`) con minor updates disponibles. React, Supabase, Vite están en versiones actuales.

---

## F) RESUMEN FINAL

1. **Bugs del top 10 ABIERTOS:** 5 de 10 (#2 devoluciones, #3 facturado, #5 faltantes sync, #9 dual recepción, #10 caducidad query). Bug #1 (CPP) está **CERRADO** — el trigger funciona.

2. **Bug más grave:** #2 (devoluciones no reversan inventario) — cada devolución a proveedor infla el stock permanentemente. Es un bug financiero y operativo.

3. **console.log en producción:** 126

4. **`any` tipados:** 1,154 — concentrados en 10 archivos monstruo. La raíz es types.ts desactualizado.

5. **Componentes monstruo (>500 lín):** 45+ archivos. El peor tiene 3,126 líneas (Empleados.tsx).

6. **Riesgo de seguridad URGENTE:** `gmail-api` edge function sin `verify_jwt` — cualquiera con la URL puede enviar emails corporativos.

7. **Calidad producción:** ~**75%**. El código funciona y cubre el 82% de features, pero tiene deuda técnica significativa (1,154 any, 126 console.log, 45 componentes monstruo, 5 bugs abiertos de integridad de datos, 1 riesgo de seguridad).
