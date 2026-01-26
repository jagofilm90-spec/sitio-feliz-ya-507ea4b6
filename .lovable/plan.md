

# Plan: Corregir Bug en Query de ProcesarPagoOCDialog

## El Problema

El código en `ProcesarPagoOCDialog.tsx` línea 124 está solicitando la columna `cantidad` que **no existe** en la tabla `ordenes_compra_detalles`. La columna correcta es `cantidad_ordenada`.

Error en los logs:
```
{"code":"42703","message":"column ordenes_compra_detalles.cantidad does not exist"}
```

## Estado Actual de tus OCs

| Folio | Productos | Ordenado | Recibido | Status |
|-------|-----------|----------|----------|--------|
| OC-202601-0002 | 2 | 290 | 290 | completada |
| OC-202601-0003 | 1 | 600 | 600 | completada |

Los datos están correctos en la base de datos; el problema es solo la query.

---

## Corrección

**Archivo**: `src/components/compras/ProcesarPagoOCDialog.tsx`

**Línea 124**: Cambiar `cantidad` → `cantidad_ordenada`

```typescript
// ANTES (línea 122-132):
const { data: detalles, error } = await supabase
  .from("ordenes_compra_detalles")
  .select(`
    id,
    cantidad,          // ❌ NO EXISTE
    cantidad_recibida,
    ...
  `)

// DESPUÉS:
const { data: detalles, error } = await supabase
  .from("ordenes_compra_detalles")
  .select(`
    id,
    cantidad_ordenada, // ✅ CORRECTO
    cantidad_recibida,
    ...
  `)
```

También ajustar **línea 142** donde se usa el fallback:

```typescript
// ANTES:
cantidad: d.cantidad_recibida ?? d.cantidad,

// DESPUÉS:
cantidad: d.cantidad_recibida ?? d.cantidad_ordenada,
```

---

## Resultado Esperado

Después de la corrección, al abrir "Procesar Pago" verás:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  PROCESAR PAGO - OC-202601-0002                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  Proveedor: ENVOLPAN                                                    │
│                                                                          │
│  SELECCIONAR PRODUCTOS A PAGAR:                [☑ Seleccionar todos]    │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ ☑ │ Código   │ Producto            │ Cant │ Subtotal │ Impuestos  │ │
│  ├───┼──────────┼─────────────────────┼──────┼──────────┼────────────┤ │
│  │ ☑ │ XXX-001  │ Producto 1          │ 145  │ $X,XXX   │ IVA        │ │
│  │ ☑ │ XXX-002  │ Producto 2          │ 145  │ $X,XXX   │ IVA        │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/compras/ProcesarPagoOCDialog.tsx` | Líneas 124 y 142: cambiar `cantidad` → `cantidad_ordenada` |

