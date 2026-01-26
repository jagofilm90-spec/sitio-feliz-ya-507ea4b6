
# Plan: Agregar Columna Editable de Costo en el Diálogo de Pago

## Resumen

Agregar una columna "Costo Facturado" editable directamente en el diálogo de "Procesar Pago" para que puedas ajustar los precios cuando el proveedor factura diferente a la OC. Los ajustes actualizarán automáticamente:
- El costo del lote en inventario
- El costo promedio ponderado del producto
- El total de la OC
- El registro histórico del cambio

---

## Flujo Propuesto

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│  PROCESAR PAGO - OC-202601-0002                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Proveedor: ENVOLPAN                                                            │
│                                                                                  │
│  ⚠️ Puedes ajustar el costo si el proveedor facturó diferente                   │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │ ☑ │ Código │ Producto      │ Cant │ Costo OC │ Costo Factura │ Subtotal   │ │
│  ├───┼────────┼───────────────┼──────┼──────────┼───────────────┼────────────┤ │
│  │ ☑ │ BAL-01 │ Papel Bala    │ 50   │ $550.00  │ [  $500.00  ] │ $25,000.00 │ │
│  │ ☑ │ BLA-02 │ Blanco Rev.   │ 40   │ $300.00  │ [  $300.00  ] │ $12,000.00 │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │ Subtotal Original OC:                                      $37,000.00     │  │
│  │ Subtotal Ajustado:                                         $34,500.00     │  │
│  │ Diferencia (ahorro):                                  -$2,500.00 ✓        │  │
│  │──────────────────────────────────────────────────────────────────────────│  │
│  │ MONTO A PAGAR:                                             $34,500.00     │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  [📄 Descargar PDF]                              [Cancelar] [Confirmar Pago]    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Cambios Técnicos

### 1. Corregir Bug en función RPC `conciliar_factura_proveedor`

La función actual tiene el mismo bug que los dialogs: usa `cantidad` que no existe.

```sql
-- ANTES (línea 73):
subtotal = COALESCE(cantidad_recibida, cantidad) * v_producto.precio_facturado

-- DESPUÉS:
subtotal = COALESCE(cantidad_recibida, cantidad_ordenada) * v_producto.precio_facturado
```

### 2. Crear Nueva Función RPC para Ajuste Directo (sin factura)

Crear una función similar pero que no requiera factura registrada:

```sql
CREATE OR REPLACE FUNCTION public.ajustar_costos_oc(
  p_oc_id UUID,
  p_productos JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_producto RECORD;
BEGIN
  FOR v_producto IN SELECT * FROM jsonb_to_recordset(p_productos) 
    AS x(producto_id UUID, precio_facturado NUMERIC, cantidad NUMERIC)
  LOOP
    -- Actualizar lotes de inventario de esta OC
    UPDATE inventario_lotes
    SET precio_compra = v_producto.precio_facturado,
        updated_at = now()
    WHERE orden_compra_id = p_oc_id
      AND producto_id = v_producto.producto_id;

    -- Actualizar detalle de la OC
    UPDATE ordenes_compra_detalles
    SET precio_unitario_compra = v_producto.precio_facturado,
        subtotal = COALESCE(cantidad_recibida, cantidad_ordenada) * v_producto.precio_facturado
    WHERE orden_compra_id = p_oc_id
      AND producto_id = v_producto.producto_id;

    -- Recalcular costo promedio del producto
    UPDATE productos 
    SET costo_promedio_ponderado = calcular_costo_promedio_ponderado(v_producto.producto_id),
        ultimo_costo_compra = v_producto.precio_facturado,
        updated_at = now()
    WHERE id = v_producto.producto_id;
  END LOOP;

  -- Recalcular total de la OC
  UPDATE ordenes_compra
  SET total = (
    SELECT COALESCE(SUM(subtotal), 0)
    FROM ordenes_compra_detalles
    WHERE orden_compra_id = p_oc_id
  ),
  total_ajustado = (
    SELECT COALESCE(SUM(subtotal), 0)
    FROM ordenes_compra_detalles
    WHERE orden_compra_id = p_oc_id
  ) - COALESCE(monto_devoluciones, 0),
  updated_at = now()
  WHERE id = p_oc_id;
END;
$$;
```

### 3. Modificar `ProcesarPagoOCDialog.tsx`

**Nuevos elementos:**

```typescript
interface ProductoRecibido {
  // ... campos existentes
  precio_unitario: number;        // Precio OC original
  precioFacturado: number;        // Precio editable (nuevo)
  subtotalCalculado: number;      // Subtotal recalculado
  diferenciaCosto: number;        // Diferencia por producto
}
```

**Estado adicional:**
```typescript
const [preciosEditados, setPreciosEditados] = useState<Record<string, number>>({});
```

**Columna editable en la tabla:**
```typescript
<TableCell className="text-right">
  <Input
    type="number"
    step="0.01"
    min="0"
    className="w-24 text-right"
    value={preciosEditados[p.detalle_id] ?? p.precio_unitario}
    onChange={(e) => handlePrecioChange(p.detalle_id, parseFloat(e.target.value) || 0)}
  />
</TableCell>
```

**Recálculo automático de totales:**
```typescript
const calcularTotalesConAjustes = useMemo(() => {
  let subtotalOriginal = 0;
  let subtotalAjustado = 0;
  
  for (const p of productosSeleccionados) {
    const precioOC = p.precio_unitario;
    const precioFacturado = preciosEditados[p.detalle_id] ?? precioOC;
    
    subtotalOriginal += p.cantidad * precioOC;
    subtotalAjustado += p.cantidad * precioFacturado;
  }
  
  const diferencia = subtotalOriginal - subtotalAjustado;
  
  return {
    subtotalOriginal,
    subtotalAjustado,
    diferencia,
    // ... impuestos recalculados sobre subtotalAjustado
  };
}, [productosSeleccionados, preciosEditados]);
```

**Llamar RPC al confirmar pago:**
```typescript
// Si hay ajustes de precio, actualizar costos primero
const productosConAjustes = Object.entries(preciosEditados)
  .filter(([id, precio]) => {
    const producto = productosRecibidos.find(p => p.detalle_id === id);
    return producto && precio !== producto.precio_unitario;
  })
  .map(([id, precio]) => {
    const producto = productosRecibidos.find(p => p.detalle_id === id)!;
    return {
      producto_id: producto.producto_id,
      precio_facturado: precio,
      cantidad: producto.cantidad,
    };
  });

if (productosConAjustes.length > 0) {
  await supabase.rpc("ajustar_costos_oc", {
    p_oc_id: orden.id,
    p_productos: productosConAjustes,
  });
}
```

---

## Qué se Actualiza al Confirmar

| Campo | Tabla | Descripción |
|-------|-------|-------------|
| `precio_compra` | `inventario_lotes` | Costo del lote específico |
| `precio_unitario_compra` | `ordenes_compra_detalles` | Precio en la OC |
| `subtotal` | `ordenes_compra_detalles` | Subtotal recalculado |
| `costo_promedio_ponderado` | `productos` | WAC recalculado |
| `ultimo_costo_compra` | `productos` | Último costo de compra |
| `total` | `ordenes_compra` | Total de la OC |
| `total_ajustado` | `ordenes_compra` | Total menos devoluciones |

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| Nueva migración SQL | Crear función `ajustar_costos_oc` |
| `src/components/compras/ProcesarPagoOCDialog.tsx` | Agregar columna editable, lógica de ajuste, llamada a RPC |
| `src/components/compras/ConciliarFacturaDialog.tsx` | Corregir bug `cantidad` → `cantidad_ordenada` |

---

## Ejemplo de Uso

**Escenario:** OC creada con Papel Bala a $550, pero el proveedor factura a $500.

1. Abres "Procesar Pago" en la OC
2. Ves la columna "Costo OC": $550
3. Cambias "Costo Factura" a: $500
4. El sistema muestra:
   - Subtotal Original: $27,500 (50 × $550)
   - Subtotal Ajustado: $25,000 (50 × $500)
   - Diferencia: -$2,500 (ahorro)
5. Al confirmar:
   - El lote de inventario queda con costo $500
   - El producto actualiza su costo promedio
   - La OC refleja el total real de $25,000
   - Tu margen de venta se calcula correctamente

---

## Beneficios

1. **Sin flujo extra**: No necesitas registrar factura por separado
2. **Costos reales**: Inventario refleja lo que realmente pagaste
3. **Márgenes correctos**: El precio de venta se compara con el costo real
4. **Trazabilidad**: La OC queda con el monto ajustado
5. **Flexibilidad**: Puedes ajustar solo algunos productos si es necesario
