
# Plan: Ajuste Automático del Total de OC por Devoluciones

## Resumen del Problema

Cuando se devuelven productos por mal estado (roto, rechazado_calidad), el sistema registra la devolución pero **NO ajusta el total de la OC para el pago**. Ejemplo:

- OC de 1200 bultos de Azúcar a $50 c/u = **$60,000**
- Se devuelven 2 bultos por mal estado = **$100**
- El pago debería ser **$59,900** (no $60,000)

Actualmente el `MarcarPagadoDialog` muestra el total original sin considerar las devoluciones.

---

## Solución Propuesta

### Cambios en Base de Datos

**Nuevos campos en `ordenes_compra`:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `monto_devoluciones` | numeric | Suma del valor de productos devueltos |
| `total_ajustado` | numeric | Total original - monto_devoluciones |

### Cambios en Código

#### 1. Al registrar una devolución, calcular el monto a descontar

**Archivo:** `src/components/almacen/DevolucionProveedorDialog.tsx`

- Después de insertar en `devoluciones_proveedor`, buscar el `precio_unitario_compra` del producto en `ordenes_compra_detalles`
- Calcular: `monto_devolucion = cantidad_devuelta × precio_unitario_compra`
- Actualizar `ordenes_compra.monto_devoluciones` (sumando el nuevo monto)
- Recalcular `ordenes_compra.total_ajustado`

```typescript
// Después de insertar la devolución:
const { data: detalle } = await supabase
  .from("ordenes_compra_detalles")
  .select("precio_unitario_compra")
  .eq("orden_compra_id", ordenCompraId)
  .eq("producto_id", producto.productoId)
  .single();

const montoDevolucion = producto.cantidadDevuelta * detalle.precio_unitario_compra;

// Actualizar la OC
await supabase.rpc('agregar_devolucion_a_oc', {
  p_oc_id: ordenCompraId,
  p_monto: montoDevolucion
});
```

#### 2. Mostrar el total ajustado en el diálogo de pago

**Archivo:** `src/components/compras/MarcarPagadoDialog.tsx`

**Antes (línea 370-376):**
```jsx
<div className="flex justify-between">
  <span className="text-muted-foreground">Total:</span>
  <span className="font-bold text-primary">
    ${orden.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
  </span>
</div>
```

**Después:**
```jsx
{/* Total original */}
<div className="flex justify-between">
  <span className="text-muted-foreground">Total Original:</span>
  <span>${orden.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
</div>

{/* Si hay devoluciones, mostrar desglose */}
{devoluciones.length > 0 && (
  <>
    <div className="flex justify-between text-destructive">
      <span>(-) Devoluciones:</span>
      <span>-${montoDevoluciones.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
    </div>
    <Separator className="my-1" />
    <div className="flex justify-between">
      <span className="font-medium">Total a Pagar:</span>
      <span className="font-bold text-primary">
        ${totalAjustado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
      </span>
    </div>
  </>
)}
```

#### 3. Cargar las devoluciones de la OC al abrir el diálogo de pago

```typescript
const { data: devolucionesOC = [] } = useQuery({
  queryKey: ["devoluciones-oc", orden?.id],
  queryFn: async () => {
    const { data } = await supabase
      .from("devoluciones_proveedor")
      .select(`
        cantidad_devuelta,
        producto_id,
        productos (nombre, codigo)
      `)
      .eq("orden_compra_id", orden?.id);
    return data || [];
  },
  enabled: !!orden?.id && open,
});

// Calcular monto total de devoluciones
const calcularMontoDevoluciones = async () => {
  let total = 0;
  for (const dev of devolucionesOC) {
    const { data: detalle } = await supabase
      .from("ordenes_compra_detalles")
      .select("precio_unitario_compra")
      .eq("orden_compra_id", orden.id)
      .eq("producto_id", dev.producto_id)
      .single();
    
    if (detalle) {
      total += dev.cantidad_devuelta * detalle.precio_unitario_compra;
    }
  }
  return total;
};
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `ordenes_compra` (migración) | Agregar campos `monto_devoluciones` y `total_ajustado` |
| `src/components/almacen/DevolucionProveedorDialog.tsx` | Calcular y guardar monto al registrar devolución |
| `src/components/compras/MarcarPagadoDialog.tsx` | Mostrar desglose (original - devoluciones = a pagar) |
| `src/components/compras/DevolucionesPendientesTab.tsx` | Agregar columna de "Monto" a la tabla |

---

## Función SQL para actualizar OC

```sql
CREATE OR REPLACE FUNCTION agregar_devolucion_a_oc(
  p_oc_id UUID,
  p_monto NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE ordenes_compra
  SET 
    monto_devoluciones = COALESCE(monto_devoluciones, 0) + p_monto,
    total_ajustado = total - (COALESCE(monto_devoluciones, 0) + p_monto)
  WHERE id = p_oc_id;
END;
$$;
```

---

## Flujo Visual

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  REGISTRAR PAGO - OC-202601-0003                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Proveedor: BODEGA AURRERA                                              │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Total Original:                              $60,000.00         │   │
│  │ (-) Devoluciones:                               -$100.00        │   │
│  │   • 2 × Azúcar Estándar ($50.00 c/u) - Roto                    │   │
│  │ ──────────────────────────────────────────────────────────      │   │
│  │ TOTAL A PAGAR:                               $59,900.00         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  Fecha de pago: [26/01/2026]                                            │
│  Referencia: [_______________]                                          │
│  Comprobante: [Subir archivo...]                                        │
│                                                                          │
│  [ ] Enviar comprobante al proveedor                                    │
│                                                                          │
│                                    [Cancelar]  [Registrar Pago]         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Beneficios

1. **Pago exacto**: Solo se paga lo que realmente se aceptó
2. **Transparencia**: El proveedor recibe desglose claro en la notificación
3. **Trazabilidad**: Queda registro de qué productos se descontaron y por qué
4. **Sin reprogramación**: Las devoluciones por mal estado NO crean entregas adicionales (diferente a faltantes)

---

## Nota Importante: Diferencia entre Faltante y Devolución

| Escenario | Acción del Sistema |
|-----------|---------------------|
| **Faltante (no_llego)** | Se reprograma entrega para el día siguiente. OC queda en "parcial" hasta que llegue. Se paga el total cuando se complete. |
| **Devolución (roto/rechazado)** | NO se reprograma. OC se cierra normalmente. Se descuenta el monto de lo devuelto del pago. |

Este plan implementa la lógica de devoluciones sin afectar el flujo de faltantes que ya funciona correctamente.
