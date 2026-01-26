
# Plan: Selección de Productos con Checkboxes y Recálculo de Impuestos

## Resumen

Implementar sistema de checkboxes para selección de productos a pagar, con recálculo automático de IVA e IEPS cuando se quitan productos que llevan estos impuestos.

---

## Lógica de Impuestos Actual

El sistema ya tiene definido:
- **IVA**: 16% (`IVA_RATE = 0.16`)
- **IEPS**: 8% (`IEPS_RATE = 0.08`)
- Los flags `aplica_iva` y `aplica_ieps` están en la tabla `productos`
- La función `redondear()` garantiza precisión a 2 decimales

---

## Cambios Técnicos

### 1. Modificar Query de Productos para Incluir Flags de Impuestos

```typescript
const { data: productosRecibidos = [] } = useQuery({
  queryKey: ["productos-recibidos-pago", orden?.id],
  queryFn: async () => {
    const { data: detalles, error } = await supabase
      .from("ordenes_compra_detalles")
      .select(`
        id,
        cantidad_ordenada,
        cantidad_recibida,
        precio_unitario_compra,
        subtotal,
        producto_id,
        pagado,
        productos (
          codigo, 
          nombre, 
          aplica_iva, 
          aplica_ieps
        )
      `)
      .eq("orden_compra_id", orden.id);
    
    return detalles.map((d) => ({
      detalle_id: d.id,
      producto_id: d.producto_id,
      codigo: d.productos?.codigo || "",
      nombre: d.productos?.nombre || "Producto",
      cantidad: d.cantidad_recibida ?? d.cantidad_ordenada,
      precio_unitario: d.precio_unitario_compra || 0,
      subtotal: (d.cantidad_recibida ?? d.cantidad_ordenada) * (d.precio_unitario_compra || 0),
      aplica_iva: d.productos?.aplica_iva || false,
      aplica_ieps: d.productos?.aplica_ieps || false,
      pagado: d.pagado || false,
    }));
  },
});
```

### 2. Función de Recálculo de Impuestos

```typescript
const IVA_RATE = 0.16;
const IEPS_RATE = 0.08;

const calcularTotalesSeleccionados = useMemo(() => {
  const productosParaPagar = productosRecibidos.filter(
    p => productosSeleccionados.has(p.detalle_id) && !p.pagado
  );
  
  let subtotalBase = 0;
  let ivaTotal = 0;
  let iepsTotal = 0;
  
  for (const p of productosParaPagar) {
    // Asumir precios incluyen impuestos (flujo común de proveedores)
    let base = p.subtotal;
    let divisor = 1;
    
    if (p.aplica_iva) divisor += IVA_RATE;  // +0.16
    if (p.aplica_ieps) divisor += IEPS_RATE; // +0.08
    
    // Desagregar base del precio total
    base = p.subtotal / divisor;
    subtotalBase += base;
    
    // Calcular impuestos
    if (p.aplica_iva) {
      ivaTotal += base * IVA_RATE;
    }
    if (p.aplica_ieps) {
      iepsTotal += base * IEPS_RATE;
    }
  }
  
  // Redondear a 2 decimales
  return {
    subtotal: Math.round(subtotalBase * 100) / 100,
    iva: Math.round(ivaTotal * 100) / 100,
    ieps: Math.round(iepsTotal * 100) / 100,
    impuestos: Math.round((ivaTotal + iepsTotal) * 100) / 100,
    total: Math.round((subtotalBase + ivaTotal + iepsTotal) * 100) / 100,
  };
}, [productosRecibidos, productosSeleccionados]);
```

### 3. Interfaz con Checkboxes

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  PROCESAR PAGO - OC-202601-0003                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  Proveedor: ENVOLPAN                                                    │
│                                                                          │
│  SELECCIONAR PRODUCTOS A PAGAR:                [☑ Seleccionar todos]    │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ ☑ │ Código   │ Producto            │ Cant │ Subtotal │ IVA  │ IEPS│ │
│  ├───┼──────────┼─────────────────────┼──────┼──────────┼──────┼─────┤ │
│  │ ☑ │ BALA-001 │ Papel Bala Rojo     │ 50   │ $12,931  │ 16%  │  -  │ │
│  │ ☐ │ BLAN-002 │ Blanco Revolucion.. │ 40   │ $10,345  │ 16%  │  -  │ │
│  │ ✓ │ ALCO-003 │ Alcohol 96 (pagado) │ 10   │  $5,000  │ 16%  │ 8%  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ════════════════════════════════════════════════════════════════════   │
│  │ Subtotal (base):                                       $12,931.03 │  │
│  │ IVA (16%):                                              $2,068.97 │  │
│  │ IEPS (8%):                                                  $0.00 │  │
│  │──────────────────────────────────────────────────────────────────│  │
│  │ MONTO A PAGAR:                                         $15,000.00 │  │
│  ════════════════════════════════════════════════════════════════════   │
│                                                                          │
│  [📄 Descargar Orden de Pago (PDF)]                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4. Badges Visuales de Impuestos

Cada fila mostrará badges indicando qué impuestos aplica:

```typescript
<TableCell>
  <div className="flex gap-1">
    {p.aplica_iva && <Badge variant="outline" className="text-xs">IVA</Badge>}
    {p.aplica_ieps && <Badge variant="outline" className="text-xs bg-amber-50">IEPS</Badge>}
    {!p.aplica_iva && !p.aplica_ieps && <span className="text-muted-foreground text-xs">Sin impuestos</span>}
  </div>
</TableCell>
```

### 5. Resumen Financiero Dinámico

El resumen se actualiza en tiempo real cuando se seleccionan/deseleccionan productos:

```typescript
<div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg">
  <div className="space-y-2 text-sm">
    <div className="flex justify-between">
      <span>Subtotal (base):</span>
      <span>${calcularTotalesSeleccionados.subtotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
    </div>
    
    {calcularTotalesSeleccionados.iva > 0 && (
      <div className="flex justify-between text-blue-600">
        <span>IVA (16%):</span>
        <span>+${calcularTotalesSeleccionados.iva.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
      </div>
    )}
    
    {calcularTotalesSeleccionados.ieps > 0 && (
      <div className="flex justify-between text-amber-600">
        <span>IEPS (8%):</span>
        <span>+${calcularTotalesSeleccionados.ieps.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
      </div>
    )}
    
    <Separator />
    
    <div className="flex justify-between text-lg font-bold text-green-700">
      <span>MONTO A PAGAR:</span>
      <span>${calcularTotalesSeleccionados.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
    </div>
  </div>
</div>
```

### 6. Migración de Base de Datos

Agregar campos de tracking a `ordenes_compra_detalles`:

```sql
-- Agregar campos para tracking de pago por producto
ALTER TABLE ordenes_compra_detalles 
ADD COLUMN IF NOT EXISTS pagado boolean DEFAULT false;

ALTER TABLE ordenes_compra_detalles 
ADD COLUMN IF NOT EXISTS fecha_pago timestamp with time zone;

-- Comentarios
COMMENT ON COLUMN ordenes_compra_detalles.pagado IS 'Indica si este detalle ya fue pagado';
COMMENT ON COLUMN ordenes_compra_detalles.fecha_pago IS 'Fecha en que se registró el pago';
```

### 7. Lógica de Confirmación de Pago

```typescript
const confirmarPagoMutation = useMutation({
  mutationFn: async () => {
    // 1. Marcar productos seleccionados como pagados
    const idsSeleccionados = Array.from(productosSeleccionados);
    await supabase
      .from("ordenes_compra_detalles")
      .update({ 
        pagado: true, 
        fecha_pago: new Date().toISOString() 
      })
      .in("id", idsSeleccionados);
    
    // 2. Calcular nuevo monto pagado total
    const nuevoMontoPagado = (orden.monto_pagado || 0) + calcularTotalesSeleccionados.total;
    
    // 3. Verificar si todos los productos están pagados
    const { data: detalles } = await supabase
      .from("ordenes_compra_detalles")
      .select("id, pagado")
      .eq("orden_compra_id", orden.id);
    
    const todosPagados = detalles?.every(d => d.pagado);
    const nuevoStatus = todosPagados ? "pagado" : "parcial";
    
    // 4. Actualizar OC
    await supabase
      .from("ordenes_compra")
      .update({
        status_pago: nuevoStatus,
        monto_pagado: nuevoMontoPagado,
        fecha_pago: fechaPago.toISOString(),
        referencia_pago: referenciaPago,
        comprobante_pago_url: comprobanteUrl,
      })
      .eq("id", orden.id);
  },
});
```

### 8. PDF con Productos Seleccionados

El PDF solo incluirá los productos seleccionados con su desglose de impuestos:

```typescript
const handleDescargarPDF = async () => {
  const productosParaPDF = productosRecibidos.filter(
    p => productosSeleccionados.has(p.detalle_id)
  );
  
  const pdfData: OrdenPagoData = {
    ordenCompra: {
      ...orden,
      // Usar totales calculados de selección
      subtotal: calcularTotalesSeleccionados.subtotal,
      iva: calcularTotalesSeleccionados.iva,
      ieps: calcularTotalesSeleccionados.ieps,
      total: calcularTotalesSeleccionados.total,
    },
    productosRecibidos: productosParaPDF.map(p => ({
      ...p,
      aplica_iva: p.aplica_iva,
      aplica_ieps: p.aplica_ieps,
    })),
    devoluciones: [],
    datosBancarios,
  };
  
  await generarOrdenPagoPDF(pdfData);
};
```

---

## Ejemplo de Recálculo

**Escenario**: OC con 2 productos

| Producto | Subtotal | IVA | IEPS | Total |
|----------|----------|-----|------|-------|
| Papel Bala Rojo | $12,931.03 | $2,068.97 | $0 | $15,000 |
| Blanco Revolucionario | $10,344.83 | $1,655.17 | $0 | $12,000 |
| **TOTAL OC** | $23,275.86 | $3,724.14 | $0 | **$27,000** |

**Usuario deselecciona "Blanco Revolucionario":**

| Producto | Subtotal | IVA | IEPS | Total |
|----------|----------|-----|------|-------|
| Papel Bala Rojo | $12,931.03 | $2,068.97 | $0 | $15,000 |
| **TOTAL A PAGAR** | $12,931.03 | $2,068.97 | $0 | **$15,000** |

El IVA se recalcula correctamente porque el producto deseleccionado tenía `aplica_iva = true`.

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/compras/ProcesarPagoOCDialog.tsx` | Agregar checkboxes, lógica de selección, recálculo con impuestos |
| `src/utils/ordenPagoPdfGenerator.ts` | Actualizar para mostrar desglose de IVA/IEPS |
| Migración SQL | Agregar `pagado` y `fecha_pago` a `ordenes_compra_detalles` |

---

## Beneficios

1. **Precisión fiscal**: IVA e IEPS se recalculan correctamente
2. **Cumplimiento de la regla de 0 tolerancia**: Usa `redondear()` a 2 decimales
3. **Flexibilidad total**: Paga exactamente los productos que quieras
4. **Trazabilidad**: Cada producto tiene su fecha de pago
5. **PDF dinámico**: Solo muestra lo seleccionado con desglose fiscal
