# Fix Boolean Facturado — Resolución

**Fecha:** 10 de Mayo 2026  
**Bug:** Boolean `facturado` desincronizado con CFDI real (audit/07, audit/40 bug #1)  
**Severidad:** ALTA  
**Estado:** ✅ CERRADO

---

## Diagnóstico

### Los dos flujos paralelos (confirmados en código)

**FLUJO A — "Facturar y Enviar" (Pedidos.tsx:380-427)**
1. Marca `pedidos.facturado = true` directamente
2. Llama edge function `send-invoice-email`
3. **NO crea registro en tabla `facturas`**
4. **NO timbra CFDI**
5. Resultado: **pre-factura fantasma** (facturado=true sin CFDI)

**FLUJO B — "Generar Factura" (GenerarFacturaDialog.tsx:105-194)**
1. Crea registro en `facturas` con `cfdi_estado: "pendiente"`
2. **NO marca `pedidos.facturado = true`**
3. Después se timbra desde Facturas.tsx
4. Resultado: **factura invisible** (CFDI real pero facturado=false)

### Causa raíz

- **NO existía trigger** que sincronice `pedidos.facturado` con tabla `facturas`
- **NO existía función** que recalcule el boolean
- El update manual en Pedidos.tsx era la ÚNICA forma de cambiar el boolean
- El flujo de timbrado real NUNCA tocaba el boolean

### Impacto

- KPIs del dashboard basados en `facturado` = incorrectos
- ClienteEstadoCuenta filtra por `facturado=false` = datos parciales
- Export de pedidos muestra "Facturado: Sí/No" = mentira
- Decisiones de cobranza basadas en datos falsos

---

## Solución Implementada

### 1. Migración SQL: `20260510044042_fix_boolean_facturado_sync.sql`

**Paso 1 — Corrección histórica:**
```sql
UPDATE pedidos p
SET facturado = EXISTS(
  SELECT 1 FROM facturas f
  WHERE f.pedido_id = p.id
    AND f.cfdi_uuid IS NOT NULL
    AND f.cfdi_estado NOT IN ('cancelada', 'error')
);
```
Recalcula TODOS los pedidos existentes basado en CFDI timbrado real.

**Paso 2 — Trigger automático futuro:**
```sql
CREATE TRIGGER trg_sync_pedido_facturado
AFTER INSERT OR UPDATE OR DELETE ON facturas
FOR EACH ROW EXECUTE FUNCTION sync_pedido_facturado_from_facturas();
```
Se dispara cuando:
- Se inserta factura (GenerarFacturaDialog)
- Se timbra factura (cfdi_uuid se llena)
- Se cancela factura (cfdi_estado → cancelada)
- Se elimina factura

### 2. Eliminación update manual: `Pedidos.tsx`

**Antes:**
```tsx
// Paso 1: Marcar como facturado
const { error: facturarError } = await supabase
  .from("pedidos")
  .update({ facturado: true })
  .eq("id", pedido.id);
```

**Después:**
```tsx
// NOTA: Ya NO marcamos facturado=true manualmente.
// El trigger trg_sync_pedido_facturado lo hará automáticamente
// cuando se cree un CFDI timbrado real en tabla facturas.
```

### 3. Fuente de verdad

| Antes | Después |
|-------|---------|
| Boolean manual en frontend | Trigger automático desde tabla facturas |
| 2 flujos desconectados | 1 fuente de verdad (facturas + trigger) |
| Datos incorrectos | Datos siempre sincronizados |

---

## Verificación

### Queries para validar post-migración

```sql
-- Debe regresar 0: pedidos con facturado=true SIN CFDI real
SELECT count(*) FROM pedidos p
LEFT JOIN facturas f ON f.pedido_id = p.id 
  AND f.cfdi_uuid IS NOT NULL 
  AND f.cfdi_estado NOT IN ('cancelada','error')
WHERE p.facturado = true AND f.id IS NULL;

-- Debe regresar 0: pedidos con facturado=false CON CFDI real
SELECT count(*) FROM pedidos p
JOIN facturas f ON f.pedido_id = p.id
WHERE p.facturado = false 
  AND f.cfdi_uuid IS NOT NULL 
  AND f.cfdi_estado NOT IN ('cancelada','error');
```

### Flujo validado post-fix

1. Generar factura via GenerarFacturaDialog → crea en `facturas` con estado "pendiente" → trigger NO marca facturado (sin cfdi_uuid)
2. Timbrar factura via Facturas.tsx → cfdi_uuid se llena → **trigger marca facturado=true automáticamente**
3. Cancelar factura → cfdi_estado = "cancelada" → **trigger marca facturado=false automáticamente**

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `supabase/migrations/20260510044042_fix_boolean_facturado_sync.sql` | CREADO — corrección histórica + trigger |
| `src/pages/Pedidos.tsx` | MODIFICADO — eliminado update manual `facturado=true` |
| `audit/42-FIX-BOOLEAN-FACTURADO-RESOLUCION.md` | CREADO — este documento |

---

## Próximos pasos (documentados en /audit/07)

Este fix resuelve la desincronización INMEDIATA. El rediseño completo de facturación (/audit/07) propone:
- Eliminar columna `facturado` completamente
- Reemplazar con vista computada `vw_pedidos_estado_facturacion`
- Agregar `tipo_documento` (cfdi vs nota_venta)
- Máquina de estados explícita

Ese rediseño se implementará en FASE 1 del roadmap (audit/39).

---

*Fix aplicado el 10 de mayo de 2026*  
*Bug identificado en audit/07 y audit/40*  
*Cierra desincronización boolean facturado con CFDI real*
