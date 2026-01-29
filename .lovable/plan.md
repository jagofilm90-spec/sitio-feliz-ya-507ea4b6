
# Plan: Filtrar Adeudos Solo para OCs Recibidas o Anticipadas

## Problema Actual
El panel de Adeudos muestra TODAS las OCs con pago pendiente/parcial, incluyendo aquellas que aún no se han recibido. Esto no tiene sentido porque no se debe dinero hasta que la mercancía llegue (excepto en pagos anticipados).

## Lógica de Negocio Correcta
Solo deben aparecer en el panel de adeudos:
1. **OCs recibidas/completadas/cerradas** - Ya llegó la mercancía, se debe el dinero
2. **OCs con pago anticipado** - Se debe pagar antes de recibir

## Cambio Técnico

### Archivo: `src/components/compras/AdeudosProveedoresTab.tsx`

**Modificar el query principal (líneas 107-130):**

Cambiar de:
```typescript
const { data, error } = await supabase
  .from("ordenes_compra")
  .select(...)
  .in("status_pago", ["pendiente", "parcial"])
```

A una lógica OR que incluya:
```typescript
const { data, error } = await supabase
  .from("ordenes_compra")
  .select(...)
  .in("status_pago", ["pendiente", "parcial"])
  .or('status.in.(recibida,completada,cerrada,parcial),tipo_pago.eq.anticipado')
```

**Explicación del filtro:**
- `status.in.(recibida,completada,cerrada,parcial)` - OCs donde ya llegó mercancía (total o parcialmente)
- `tipo_pago.eq.anticipado` - OCs que requieren pago antes de recibir

## Impacto Visual

Antes del cambio:
- OC enviada sin recibir: ❌ Aparece en adeudos (incorrecto)
- OC recibida sin pagar: ✅ Aparece en adeudos
- OC anticipada sin pagar: ✅ Aparece en adeudos

Después del cambio:
- OC enviada sin recibir: ✅ NO aparece en adeudos
- OC recibida sin pagar: ✅ Aparece en adeudos
- OC anticipada sin pagar: ✅ Aparece en adeudos (aunque no esté recibida)

## También actualizar el badge contador en Compras.tsx

**Modificar query de adeudosCount (líneas 107-116):**

Aplicar el mismo filtro OR para que el badge muestre el conteo correcto:
```typescript
const { count, error } = await supabase
  .from("ordenes_compra")
  .select("*", { count: "exact", head: true })
  .in("status_pago", ["pendiente", "parcial"])
  .or('status.in.(recibida,completada,cerrada,parcial),tipo_pago.eq.anticipado');
```

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/compras/AdeudosProveedoresTab.tsx` | Agregar filtro OR en query principal |
| `src/pages/Compras.tsx` | Agregar mismo filtro en query del badge |

## Resultado Final

El panel de adeudos mostrará únicamente:
- Deudas reales por mercancía ya recibida
- Pagos anticipados pendientes que bloquean entregas
