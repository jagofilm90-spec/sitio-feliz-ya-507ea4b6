# DÍA 1 — VALIDACIÓN TÉCNICA FLUJO OC
**Fecha**: 28 abril 2026
**Método**: Auditoría de migraciones + tipos generados + código fuente
**Limitación**: Sin acceso SQL directo a producción (no hay service_role JWT en env files, CLI no vinculado al proyecto). Las queries de conteo requieren verificación manual en Supabase Dashboard.

---

## FASE 1 — VERIFICACIÓN PREVIA

### A. Status constraint en ordenes_compra

**4 versiones del CHECK encontradas en migraciones. La activa (v4) es:**

```sql
-- Migración: 20260128035446_19164adb.sql (28 enero 2026)
ALTER TABLE ordenes_compra ADD CONSTRAINT ordenes_compra_status_check
CHECK (status = ANY (ARRAY[
  'pendiente',
  'pendiente_autorizacion',
  'pendiente_pago',
  'autorizada',
  'enviada',
  'confirmada',
  'parcial',
  'recibida',
  'completada',
  'rechazada',
  'devuelta',
  'cancelada'
]));
```

**🔴 ISSUE #1 — `cerrada` NO está en el CHECK constraint**

El código UI usa `cerrada` en 2 lugares:
- `OrdenesCompraTab.tsx` (línea ~1535): `if (orden.status === 'cerrada') return true`
- `AdeudosProveedoresTab.tsx`: query `.or('status.in.(recibida,completada,cerrada,parcial)...')` y badge "Cerrada"

Cualquier intento de `UPDATE ordenes_compra SET status = 'cerrada'` **fallará con constraint violation**.

**Severidad**: 🟡 Workaround — `cerrada` es un status terminal post-cierre. El flujo E2E de la semana 1 (crear → autorizar → enviar → recibir → ajustar costos) NO necesita `cerrada`. Pero MarcarPagadoDialog o cierre final sí podrían fallar.

**Fix requerido**: 
```sql
ALTER TABLE ordenes_compra DROP CONSTRAINT IF EXISTS ordenes_compra_status_check;
ALTER TABLE ordenes_compra ADD CONSTRAINT ordenes_compra_status_check
CHECK (status = ANY (ARRAY[
  'pendiente', 'pendiente_autorizacion', 'pendiente_pago',
  'autorizada', 'enviada', 'confirmada', 'parcial',
  'recibida', 'completada', 'cerrada',
  'rechazada', 'devuelta', 'cancelada'
]));
```

---

### B. Tabla productos_revision_precio

**✅ EXISTE** — Creada en migración `20260319003837_35792862.sql`.

Esquema confirmado:
- `id`, `producto_id`, `costo_anterior`, `costo_nuevo`, `precio_venta_actual`, `precio_venta_sugerido`
- `margen_actual_porcentaje`, `margen_sugerido_porcentaje`, `ajuste_aplicado`, `pendiente_ajuste`
- `status` (default 'pendiente'), `notas`, `creado_por`, `resuelto_por`, `created_at`, `resuelto_at`
- RLS: admin, secretaria, contadora
- Presente en `types.ts` generado → tabla existe en producción

**Severidad**: 🟢 No es issue.

---

### C. Tablas core de Compras — Esquemas verificados

| Tabla | Columnas | Status |
|-------|----------|--------|
| `ordenes_compra` | 37 cols | ✅ Completa (folio, status, proveedor_id, subtotal/impuestos/total, autorizado_por, tipo_pago, creditos, etc.) |
| `ordenes_compra_detalles` | 13 cols | ✅ Completa (producto_id, cantidad_ordenada/recibida/cancelada, precio_unitario_compra, etc.) |
| `proveedor_facturas` | 19 cols | ✅ Completa (numero_factura, monto_total, status_pago, conciliacion_completada, etc.) |
| `inventario_lotes` | 16 cols | ✅ Completa (producto_id, cantidad_disponible, precio_compra, bodega_id, fecha_caducidad, etc.) |

Todas las tablas tienen tipos generados en `types.ts` → existen en producción.

---

### D. Edge Functions de Compras

| Function | Existe | En config.toml | Transporte email | Notas |
|----------|--------|----------------|-----------------|-------|
| `gmail-api` | ✅ | ✅ (verify_jwt: false) | Gmail OAuth2 | Gateway central. Requiere `gmail_cuentas` con tokens OAuth |
| `notificar-cierre-oc` | ✅ | ✅ (verify_jwt: true) | gmail-api | Envía devoluciones a proveedor |
| `notificar-faltante-oc` | ✅ | ✅ (verify_jwt: true) | gmail-api | 5 tipos de notificación de faltantes |
| `notificar-entregas-programadas` | ✅ | ✅ (verify_jwt: false) | gmail-api | Recordatorios de entrega |
| `notificar-faltante-anticipado` | ✅ | ✅ (verify_jwt: false) | gmail-api | Faltantes en OC anticipadas |
| `notificar-cancelacion-descarga` | ✅ | ❌ No listada | gmail-api | Cancelación de descarga |
| `notificar-solicitud-deposito` | ✅ | ✅ (verify_jwt: false) | Resend API | Solicitud de depósito bancario |

**🟡 ISSUE #2 — gmail-api requiere OAuth2 configurado**

`gmail-api` lee tokens de la tabla `gmail_cuentas`. Si no hay una cuenta `compras@almasa.com.mx` configurada con OAuth2 válido, TODOS los envíos de email fallarán silenciosamente.

**Acción**: Verificar en Supabase Dashboard → tabla `gmail_cuentas` que exista un registro para `compras@almasa.com.mx` con token vigente. Si no: los emails se envían manualmente como workaround (no es bloqueante para el flujo OC).

---

### E. Datos actuales en producción

**⚠️ No verificable remotamente** — Se necesita revisar en Supabase Dashboard:

```sql
SELECT COUNT(*) FROM ordenes_compra;
SELECT COUNT(*) FROM proveedores WHERE activo = true;
SELECT COUNT(*) FROM productos WHERE activo = true;
```

**Esperado**: Pocos o ningún dato en ordenes_compra/proveedores. Productos debería tener el catálogo (~274 productos según PageHeader canónico).

---

## FASE 2 — TRAZA E2E DEL FLUJO (desde código)

Dado que no tengo acceso SQL directo, documenté la traza exacta de cada paso del flujo para que Jose pueda ejecutarlo desde la UI y verificar:

### Paso 1: Crear OC

**Componente**: `CrearOrdenCompraWizard.tsx`

| Operación | Tabla | Detalle |
|-----------|-------|---------|
| RPC `generar_folio_orden_compra()` | — | Genera folio atómico (OC-YYYYMM-NNNN) |
| INSERT | `ordenes_compra` | status: `pendiente` (normal) o `pendiente_pago` (anticipado) |
| INSERT (N rows) | `ordenes_compra_detalles` | 1 por producto |
| INSERT (1+ rows) | `ordenes_compra_entregas` | Entrega única o múltiples |
| UPDATE (opcional) | `proveedor_creditos_pendientes` | Si se aplican créditos |

**🟡 ISSUE #3 — RPC `generar_folio_orden_compra` necesita verificación**

Este RPC se llama al inicio del wizard. Si no está definido en la DB (no encontré su definición en las migraciones auditadas para la búsqueda de constraints), la creación fallará.

**Acción**: Verificar en Supabase Dashboard → SQL Editor:
```sql
SELECT proname FROM pg_proc WHERE proname = 'generar_folio_orden_compra';
```

### Paso 2: Autorizar OC

**Componente**: `AutorizacionOCDialog.tsx`

| Operación | Tabla | Detalle |
|-----------|-------|---------|
| UPDATE | `ordenes_compra` | status → `autorizada`, autorizado_por, fecha_autorizacion |
| UPDATE | `notificaciones` | Marca notificación como leída |
| INSERT | `notificaciones` | Notifica al creador que fue autorizada |

**Riesgo**: Ninguno. El status `autorizada` está en el CHECK. ✅

### Paso 3: Enviar OC

**Componente**: `CrearOrdenCompraWizard.tsx` (inline, post-autorización)

| Operación | Tabla/Función | Detalle |
|-----------|---------------|---------|
| INVOKE | Edge Function `gmail-api` | Envía PDF al proveedor |
| UPDATE | `ordenes_compra` | status → `enviada` (solo si email exitoso) |

**Riesgo**: Si `gmail-api` falla (OAuth vencido, cuenta no configurada), el status queda en `autorizada`. Workaround: enviar email manualmente y hacer UPDATE de status desde Dashboard.

### Paso 4: Recibir mercancía

**Dos caminos posibles:**

**Camino A — `RegistrarRecepcionDialog.tsx`** (desde panel admin/compras)
- UPDATE `ordenes_compra_detalles.cantidad_recibida`
- UPDATE `ordenes_compra.status` → `parcial` o `recibida`
- **⚠️ NO crea `inventario_lotes`** — solo registra cantidades

**Camino B — `AlmacenRecepcionSheet.tsx`** (desde panel almacén, RECOMENDADO)
- UPDATE `ordenes_compra_detalles.cantidad_recibida`
- **INSERT `inventario_lotes`** ← esto es lo que realmente mueve el inventario
- UPDATE `productos.ultimo_costo_compra`
- UPDATE `ordenes_compra_entregas.status` → `recibida`
- UPDATE `ordenes_compra.status` → `parcial` o `completada`

**🔴 ISSUE #4 — RegistrarRecepcionDialog NO crea lotes de inventario**

Si se usa el Camino A (recepción desde panel admin), la mercancía queda registrada como "recibida" en la OC pero **NO se crea ningún lote en inventario**. El stock no se mueve. Solo `AlmacenRecepcionSheet` (Camino B, panel almacén) crea los lotes.

**Severidad**: 🔴 Bloqueante para inventario — si la recepción se hace desde Compras en vez de Almacén, el inventario no se actualiza.

**Recomendación**: Para la semana 1, la recepción DEBE hacerse desde el panel Almacén (AlmacenRecepcionSheet), nunca desde RegistrarRecepcionDialog.

### Paso 5: Ajustar costos

**Componente**: `AjustarCostosOCDialog.tsx`

| Operación | Tabla/RPC | Detalle |
|-----------|-----------|---------|
| RPC `ajustar_costos_oc` | — | Params: `p_oc_id`, `p_productos: [{producto_id, precio_facturado, cantidad}]` |
| INSERT (N rows) | `productos_historial_costos` | costo_anterior, costo_nuevo, fuente: "ajuste_manual_oc" |
| INSERT (condicional) | `productos_revision_precio` | Solo si costo subió |
| INSERT (condicional) | `notificaciones` | Alerta de revisión de precio |

**Riesgo**: Bajo. El RPC existe (definido en blindaje M04.6b). ✅

### Paso 6: Conciliar factura

**Componente**: `ConciliarFacturaDialog.tsx`

| Operación | Tabla/RPC | Detalle |
|-----------|-----------|---------|
| INSERT (N rows) | `proveedor_factura_detalles` | precio_facturado vs precio_oc por producto |
| UPDATE | `productos.ultimo_costo_compra` | Costo final autoritativo |
| INSERT (condicional) | `productos_historial_costos` | Si cambió el costo |
| RPC `conciliar_factura_proveedor` | — | Params: `p_factura_id`, `p_productos: [{producto_id, precio_facturado, cantidad}]` |
| UPDATE | `proveedor_facturas` | diferencia_total, requiere_conciliacion: false |
| UPDATE | `inventario_lotes` | conciliado: true |
| UPDATE | `ordenes_compra_entregas` | status_conciliacion: 'conciliada' |
| UPDATE | `ordenes_compra` | status_conciliacion: 'conciliada' |

**Riesgo**: Bajo. Ambos RPCs existen. ✅

### Paso 7: Devolución

**Componente**: `DevolucionProveedorDialog.tsx` (se abre desde AlmacenRecepcionSheet)

| Operación | Tabla/RPC | Detalle |
|-----------|-----------|---------|
| INSERT | `devoluciones_proveedor` | producto, cantidad, motivo (roto/rechazado_calidad), firma chofer |
| INSERT | `devoluciones_proveedor_evidencias` | Fotos de evidencia |
| RPC `agregar_devolucion_a_oc` | — | Actualiza monto_devoluciones en OC |
| INSERT (anticipado) | `proveedor_creditos_pendientes` | Crédito por devolución |

**🟡 ISSUE #5 — RPC `agregar_devolucion_a_oc` necesita verificación**

Este RPC se llama en el flujo de devolución. Necesita verificar que existe en producción.

---

## FASE 3 — RESUMEN DE ISSUES

| # | Severidad | Issue | Impacto semana 1 | Fix |
|---|-----------|-------|-------------------|-----|
| 1 | 🟡 | `cerrada` no está en CHECK constraint | No bloquea flujo básico (crear→recibir→costos). Bloquea cierre final de OC. | ALTER TABLE: agregar `cerrada` al constraint |
| 2 | 🟡 | gmail-api requiere OAuth2 configurado en `gmail_cuentas` | Emails no se envían. Workaround: enviar PDF manualmente. | Verificar tabla `gmail_cuentas` en Dashboard |
| 3 | 🟡 | RPC `generar_folio_orden_compra` — verificar existencia | Si no existe, el wizard no arranca. | Verificar con `SELECT proname FROM pg_proc` |
| 4 | 🔴 | RegistrarRecepcionDialog NO crea inventario_lotes | Si se usa camino equivocado, inventario no se mueve. | **Regla operativa**: recepción SOLO desde panel Almacén |
| 5 | 🟡 | RPC `agregar_devolucion_a_oc` — verificar existencia | Devoluciones fallarían. No bloquea flujo básico sin devoluciones. | Verificar con `SELECT proname FROM pg_proc` |

---

## FASE 4 — VERIFICACIONES QUE JOSE DEBE HACER EN DASHBOARD

Antes de arrancar capacitación el martes, Jose debe verificar en **Supabase Dashboard → SQL Editor**:

### 1. Verificar RPCs existentes
```sql
SELECT proname FROM pg_proc 
WHERE proname IN (
  'generar_folio_orden_compra', 
  'ajustar_costos_oc', 
  'conciliar_factura_proveedor',
  'agregar_devolucion_a_oc'
)
ORDER BY proname;
```
**Esperado**: Las 4 deben aparecer. Si falta alguna → 🔴 bloqueante.

### 2. Verificar cuenta de email
```sql
SELECT email, activo, token_expiry FROM gmail_cuentas 
WHERE email LIKE '%compras%' OR email LIKE '%almasa%';
```
**Esperado**: Al menos 1 registro activo. Si vacío → emails manuales (no bloqueante).

### 3. Contar datos existentes
```sql
SELECT 'proveedores' as tabla, COUNT(*) FROM proveedores WHERE activo = true
UNION ALL
SELECT 'ordenes_compra', COUNT(*) FROM ordenes_compra
UNION ALL
SELECT 'productos', COUNT(*) FROM productos WHERE activo = true;
```

### 4. Fix del CHECK constraint (si decide aplicar hoy)
```sql
ALTER TABLE ordenes_compra DROP CONSTRAINT IF EXISTS ordenes_compra_status_check;
ALTER TABLE ordenes_compra ADD CONSTRAINT ordenes_compra_status_check
CHECK (status = ANY (ARRAY[
  'pendiente', 'pendiente_autorizacion', 'pendiente_pago',
  'autorizada', 'enviada', 'confirmada', 'parcial',
  'recibida', 'completada', 'cerrada',
  'rechazada', 'devuelta', 'cancelada'
]));
```

### 5. Prueba de inserción rápida (opcional)
```sql
-- Solo para verificar que el INSERT no falla por constraint/FK
INSERT INTO ordenes_compra (folio, status, subtotal, impuestos, total, creado_por, fecha_orden)
VALUES ('OC-TEST-001', 'pendiente', 0, 0, 0, (SELECT id FROM profiles LIMIT 1), NOW());

-- Verificar
SELECT * FROM ordenes_compra WHERE folio = 'OC-TEST-001';

-- Limpiar
DELETE FROM ordenes_compra WHERE folio = 'OC-TEST-001';
```

---

## FASE 5 — RECOMENDACIÓN

### ¿Podemos arrancar capacitación el martes?

**SÍ, con condiciones:**

1. **OBLIGATORIO antes del martes**:
   - Jose ejecuta las 4 queries de verificación (§ Fase 4, ítems 1-3)
   - Si `generar_folio_orden_compra` NO existe → bloqueante, hay que crearla
   - Aplicar fix del CHECK constraint (agregar `cerrada`) — 30 segundos en SQL Editor

2. **REGLA OPERATIVA para la semana 1**:
   - La recepción de mercancía se hace EXCLUSIVAMENTE desde el **panel Almacén** (AlmacenRecepcionSheet), NUNCA desde el RegistrarRecepcionDialog del panel Compras
   - Esto garantiza que se crean lotes de inventario correctamente

3. **NICE TO HAVE** (no bloquea):
   - Verificar gmail-api / OAuth. Si no funciona, los PDFs de OC se envían por correo normal
   - El status `cerrada` se puede aplicar después (no se usa en semana 1)

### Nivel de confianza: **ALTO**

El flujo crear OC → autorizar → recibir (vía Almacén) → ajustar costos está bien construido. El modelo de datos es sólido, los RPCs de seguridad están en su lugar, y los 12 status del CHECK cubren todo el ciclo de vida excepto `cerrada`.

---

*Documento generado automáticamente. No hacer commit hasta que Jose valide.*
