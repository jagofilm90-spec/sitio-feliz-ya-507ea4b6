
# Plan: Corregir Diálogo de Pago Anticipado - Bultos y Scroll

## Problemas Identificados

### Problema 1: Cantidad de Bultos Muestra 0
**Ubicación:** `src/components/compras/ProcesarPagoOCDialog.tsx`, línea 148

**Causa raíz:** El código actual usa el operador `??` (nullish coalescing):
```typescript
cantidad: d.cantidad_recibida ?? d.cantidad_ordenada
```

El operador `??` solo actúa cuando el valor es `null` o `undefined`. Para OCs con pago anticipado sin recepción, `cantidad_recibida` es `0` (no null), por lo que NO cae al fallback `cantidad_ordenada`.

**Solución:** Para OCs con pago anticipado, SIEMPRE usar `cantidad_ordenada`:
```typescript
// Si es pago anticipado, usar cantidad ordenada
// Si no, usar recibida (con fallback a ordenada si es null)
cantidad: orden?.tipo_pago === 'anticipado' 
  ? d.cantidad_ordenada 
  : (d.cantidad_recibida ?? d.cantidad_ordenada)
```

### Problema 2: No Se Puede Hacer Scroll
**Ubicación:** `src/components/compras/ProcesarPagoOCDialog.tsx`, líneas 563-577

**Causa raíz:** La combinación de estilos causa problemas en Safari:
```tsx
<DialogContent 
  className="max-w-4xl max-h-[90vh] overflow-hidden" 
  style={{ display: 'flex', flexDirection: 'column' }}
>
  ...
  <ScrollArea className="flex-1 min-h-0 overflow-hidden px-1">
```

El `overflow-hidden` en el DialogContent junto con `flex-1 min-h-0` no calcula correctamente la altura disponible para el ScrollArea.

**Solución:** Agregar altura explícita al ScrollArea y remover `overflow-hidden` redundante:
```tsx
<DialogContent 
  className="max-w-4xl max-h-[90vh] flex flex-col"
>
  ...
  <ScrollArea className="flex-1 max-h-[calc(90vh-200px)] pr-4">
```

---

## Archivos a Modificar

### `src/components/compras/ProcesarPagoOCDialog.tsx`

#### Cambio 1: Query de productos (líneas 121-158)
Pasar el `tipo_pago` al mapeo de productos para usar la cantidad correcta:

```typescript
const { data: productosRecibidos = [] } = useQuery({
  queryKey: ["productos-recibidos-pago", orden?.id, orden?.tipo_pago],
  queryFn: async () => {
    if (!orden?.id) return [];
    
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
        productos (codigo, nombre, aplica_iva, aplica_ieps, peso_kg)
      `)
      .eq("orden_compra_id", orden.id);
    
    if (error) throw error;
    if (!detalles) return [];
    
    const esPagoAnticipado = orden.tipo_pago === 'anticipado';
    
    return detalles.map((d: any): ProductoRecibido => {
      // Para pago anticipado, siempre usar cantidad ordenada
      // Para contra entrega, usar cantidad recibida (o ordenada si es null)
      const cantidad = esPagoAnticipado 
        ? d.cantidad_ordenada 
        : (d.cantidad_recibida ?? d.cantidad_ordenada);
      
      return {
        detalle_id: d.id,
        producto_id: d.producto_id,
        codigo: d.productos?.codigo || "",
        nombre: d.productos?.nombre || "Producto",
        cantidad: cantidad,
        precio_unitario: d.precio_unitario_compra || 0,
        subtotal: cantidad * (d.precio_unitario_compra || 0),
        aplica_iva: d.productos?.aplica_iva ?? true,
        aplica_ieps: d.productos?.aplica_ieps ?? false,
        pagado: d.pagado || false,
        peso_kg: d.productos?.peso_kg || 0,
      };
    });
  },
  enabled: !!orden?.id && open,
});
```

#### Cambio 2: Estructura del diálogo (líneas 562-577)
Corregir el scroll con altura explícita:

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
    <DialogHeader className="flex-shrink-0">
      <DialogTitle className="flex items-center gap-2">
        <Package className="h-5 w-5" />
        Procesar Pago - {orden?.folio}
      </DialogTitle>
      <DialogDescription>
        Selecciona los productos a pagar. Los impuestos se recalculan automáticamente.
      </DialogDescription>
    </DialogHeader>

    <ScrollArea className="flex-1 max-h-[calc(90vh-180px)] pr-4">
      <div className="space-y-6 pb-4">
        {/* ... contenido ... */}
      </div>
    </ScrollArea>

    <DialogFooter className="flex-shrink-0 border-t pt-4">
      {/* ... botones ... */}
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Resultado Esperado

### Para OC Anticipada OC-202601-0005 (6,000 bultos de Azúcar a $400)

**Antes:**
```
Total bultos: 0    Peso total: 0 kg
Cant: 0  |  Costo OC: $400  |  Subtotal: $0.00
MONTO A PAGAR: $0.00
```

**Después:**
```
Total bultos: 6,000    Peso total: 150,000 kg
Cant: 6,000  |  Costo OC: $400  |  Subtotal: $2,400,000.00
MONTO A PAGAR: $2,400,000.00
```

### Scroll
- El contenido del diálogo será scrolleable
- Los botones del footer permanecerán fijos en la parte inferior
- El header permanecerá fijo en la parte superior

---

## Resumen de Cambios

| Línea(s) | Cambio |
|----------|--------|
| 122 | Agregar `orden?.tipo_pago` al queryKey para refetch correcto |
| 143-155 | Calcular `cantidad` basado en `tipo_pago` |
| 563-565 | Cambiar estilos del DialogContent a clases Tailwind |
| 567 | Agregar `flex-shrink-0` al DialogHeader |
| 577 | Cambiar ScrollArea a `max-h-[calc(90vh-180px)]` |
| 1047 | Agregar `flex-shrink-0` al DialogFooter |
