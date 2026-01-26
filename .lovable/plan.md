
# Plan: Conciliación de Factura de Proveedor con Ajuste de Costo

## Problema

Cuando el proveedor factura a un precio diferente al de la OC (ej: más barato), el sistema actualmente:
1. Registra el costo de la OC en el inventario (incorrecto)
2. No ajusta el costo promedio ponderado
3. No tiene forma de vincular la factura real con los precios por producto

**Ejemplo real:**
- OC de Papel Blanco Revolución: 40 bultos a $95 c/u = $3,800
- Factura del proveedor: 40 bultos a $88 c/u = $3,520
- Diferencia: $280 menos
- El inventario debe reflejar costo $88, no $95

---

## Solución Propuesta

### 1. Ampliar el registro de facturas para incluir detalle por producto

**Nuevo concepto:** "Conciliación de Factura"

Cuando la secretaria registra la factura del proveedor y el monto es diferente al de la OC, el sistema:
1. Detecta la diferencia automáticamente
2. Permite capturar el precio unitario real (facturado) por producto
3. Ajusta el costo en los lotes de inventario
4. Recalcula el costo promedio ponderado

---

## Cambios en Base de Datos

### Nueva tabla: `proveedor_factura_detalles`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | Identificador |
| factura_id | uuid | FK a proveedor_facturas |
| producto_id | uuid | FK a productos |
| cantidad_facturada | integer | Cantidad en factura |
| precio_unitario_facturado | numeric | Precio real del proveedor |
| subtotal_facturado | numeric | cantidad × precio |
| precio_original_oc | numeric | Precio que estaba en la OC |
| diferencia | numeric | Original - Facturado |

### Nuevos campos en `proveedor_facturas`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| requiere_conciliacion | boolean | true si monto ≠ total OC |
| conciliacion_completada | boolean | true cuando se ajustaron costos |
| diferencia_total | numeric | Monto OC - Monto Factura |

---

## Cambios en Código

### 1. Modificar `ProveedorFacturasDialog.tsx`

Al registrar una factura:
- Comparar `monto_total` de la factura vs `total` de la OC
- Si hay diferencia > $1, marcar `requiere_conciliacion = true`
- Mostrar alerta: "El monto facturado es diferente al de la OC. Se requiere conciliación de precios."

### 2. Nuevo componente: `ConciliarFacturaDialog.tsx`

Permite:
1. Ver productos de la OC con sus precios originales
2. Capturar el precio real facturado por cada producto
3. Calcular la diferencia por producto y total
4. Botón "Aplicar Conciliación" que:
   - Actualiza `precio_compra` en `inventario_lotes`
   - Actualiza `precio_unitario_compra` en `ordenes_compra_detalles`
   - Dispara recálculo de `costo_promedio_ponderado`
   - Ajusta `total_ajustado` de la OC
   - Marca `conciliacion_completada = true`

### 3. Función SQL: `conciliar_factura_proveedor`

```sql
CREATE OR REPLACE FUNCTION conciliar_factura_proveedor(
  p_factura_id UUID,
  p_productos JSONB -- [{producto_id, precio_facturado}]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_producto RECORD;
  v_oc_id UUID;
  v_diferencia_total NUMERIC := 0;
BEGIN
  -- Obtener la OC de la factura
  SELECT orden_compra_id INTO v_oc_id
  FROM proveedor_facturas
  WHERE id = p_factura_id;

  -- Por cada producto, ajustar costos
  FOR v_producto IN SELECT * FROM jsonb_to_recordset(p_productos) 
    AS x(producto_id UUID, precio_facturado NUMERIC)
  LOOP
    -- Actualizar lotes de inventario de esta OC
    UPDATE inventario_lotes
    SET precio_compra = v_producto.precio_facturado
    WHERE orden_compra_id = v_oc_id
      AND producto_id = v_producto.producto_id;

    -- Actualizar detalle de la OC
    UPDATE ordenes_compra_detalles
    SET precio_unitario_compra = v_producto.precio_facturado,
        subtotal = cantidad_recibida * v_producto.precio_facturado
    WHERE orden_compra_id = v_oc_id
      AND producto_id = v_producto.producto_id;

    -- Recalcular costo promedio del producto
    UPDATE productos 
    SET costo_promedio_ponderado = calcular_costo_promedio_ponderado(v_producto.producto_id),
        ultimo_costo_compra = v_producto.precio_facturado
    WHERE id = v_producto.producto_id;
  END LOOP;

  -- Recalcular total de la OC
  UPDATE ordenes_compra
  SET total = (
    SELECT COALESCE(SUM(subtotal), 0)
    FROM ordenes_compra_detalles
    WHERE orden_compra_id = v_oc_id
  ),
  total_ajustado = (
    SELECT COALESCE(SUM(subtotal), 0)
    FROM ordenes_compra_detalles
    WHERE orden_compra_id = v_oc_id
  ) - COALESCE(monto_devoluciones, 0)
  WHERE id = v_oc_id;

  -- Marcar factura como conciliada
  UPDATE proveedor_facturas
  SET conciliacion_completada = true
  WHERE id = p_factura_id;
END;
$$;
```

---

## Flujo de Usuario

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│  FACTURAS DEL PROVEEDOR - OC-202601-0003                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Total OC: $3,800.00    |    Total Facturado: $3,520.00    |    Pagado: $0.00   │
│                                                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │ ⚠️ FACTURA FAC-2024-1234                                                  │  │
│  │                                                                            │  │
│  │ Monto: $3,520.00    Diferencia: -$280.00                                  │  │
│  │                                                                            │  │
│  │ ⚠️ El monto facturado es menor al de la OC.                               │  │
│  │    Se requiere conciliación para ajustar los costos de inventario.       │  │
│  │                                                                            │  │
│  │                      [Conciliar Precios]  [Registrar Pago]                │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

Al hacer clic en "Conciliar Precios":

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│  CONCILIAR FACTURA - FAC-2024-1234                                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Producto               │ Cant. │ Precio OC │ Precio Factura │ Diferencia       │
│  ───────────────────────┼───────┼───────────┼────────────────┼──────────────    │
│  Papel Blanco Revolución│  40   │   $95.00  │   [$88.00]     │   -$280.00       │
│                                                                                  │
│  ────────────────────────────────────────────────────────────────────────────   │
│  Total Diferencia:                                             -$280.00         │
│                                                                                  │
│  ⚡ Al aplicar:                                                                  │
│     • Se actualizará el costo de 40 bultos en inventario                        │
│     • Se recalculará el costo promedio ponderado                                │
│     • Se ajustará el total de la OC                                             │
│                                                                                  │
│                                    [Cancelar]  [Aplicar Conciliación]           │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Archivos a Crear/Modificar

| Archivo | Acción |
|---------|--------|
| Migración SQL | Crear tabla `proveedor_factura_detalles`, agregar campos a `proveedor_facturas` |
| `src/components/compras/ConciliarFacturaDialog.tsx` | CREAR - Diálogo de conciliación |
| `src/components/compras/ProveedorFacturasDialog.tsx` | Modificar - Detectar diferencia y mostrar botón conciliar |

---

## Resultado Esperado

1. Secretaria registra factura con monto diferente → Sistema detecta automáticamente
2. Secretaria hace clic en "Conciliar Precios" → Captura precio real por producto
3. Sistema ajusta:
   - Costo en lotes de inventario
   - Costo promedio ponderado
   - Total de la OC
   - `ultimo_costo_compra` del producto
4. Los análisis de margen reflejan el costo real (el de la factura)
5. El pago al proveedor es por el monto facturado

---

## Beneficio Directo

**Responde tu pregunta:** Si el proveedor factura más barato, el sistema:
1. Detecta la diferencia automáticamente
2. Te permite corregir el costo producto por producto
3. Ajusta el inventario y los cálculos de margen
4. El pago refleja lo realmente facturado

Todo queda trazable: quién concilió, cuándo, y qué diferencia había.
