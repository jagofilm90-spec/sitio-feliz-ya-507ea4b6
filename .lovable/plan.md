
# Plan: Sistema Completo de OC - Cancelación de Productos y Alertas de Costos

## Entendimiento de los Escenarios

Hay **dos escenarios distintos** de cancelación de productos que debo implementar:

### Escenario A: Error de Captura (ANTES de recepción)
El administrador o secretaria crea una OC con 3 productos, pero por error de captura o cambio de necesidades, necesita **cancelar un producto** antes de que llegue.

**Flujo:**
1. Abrir OC en estado `borrador`, `autorizada`, `enviada` o `confirmada`
2. Seleccionar producto(s) a eliminar de la OC
3. Especificar motivo de cancelación
4. Sistema modifica la OC y recalcula totales
5. Si la OC ya fue enviada al proveedor, enviar email notificando la modificación

### Escenario B: Producto Faltante que Ya No Se Requiere (DESPUÉS de recepción parcial)
El día de entrega solo llega 1 de 2 productos. Días después, el producto faltante ya no se necesita.

**Flujo:**
1. OC está en estado `parcial` con entregas programadas de faltantes
2. Admin/Secretaria decide cancelar el producto que no llegó
3. Sistema marca la entrega programada como `cancelada`
4. Sistema verifica si ya no hay entregas pendientes → marca OC como `completada`
5. Notifica al proveedor que el producto ya no se requiere
6. OC procede a proceso de pago solo por lo recibido

---

## Cambios a Implementar

### 1. Nuevo Componente: `ModificarProductosOCDialog.tsx`

**Propósito:** Permite eliminar productos de una OC **antes** de que sean recibidos.

**Funcionalidad:**
- Lista todos los productos de la OC con checkbox de selección
- Muestra cantidad ordenada vs cantidad ya recibida (si aplica)
- Solo permite eliminar productos con cantidad_recibida = 0
- Campo para motivo de modificación
- Recalcula subtotal, IVA y total automáticamente
- Si OC ya fue enviada: genera email de modificación al proveedor

**Ubicación:** `src/components/compras/ModificarProductosOCDialog.tsx`

**Integración:** Agregar botón "Modificar productos" en `OrdenAccionesDialog.tsx` visible cuando:
- Status: `borrador`, `autorizada`, `enviada`, `confirmada`, `parcial`
- Al menos un producto tiene cantidad_recibida = 0

---

### 2. Mejora a `FaltantesPendientesTab.tsx`

**Cambio:** Ya existe funcionalidad de cancelar faltantes. Solo necesito:
- Mejorar el diálogo de confirmación para ser más explícito
- Agregar badge visual indicando que la OC pasará a `completada` si no hay más pendientes

**Ya funciona:**
- Cancelar entrega de faltante ✓
- Notificar al proveedor ✓
- Marcar OC como completada si no hay más pendientes ✓

---

### 3. Alertas de Costo Mayor en `AjustarCostosOCDialog.tsx`

**Cambios:**

**A) Visual Badge por producto:**
```typescript
// En cada fila de producto, si precio_editado > precio_actual
{producto.precio_editado > producto.precio_actual && (
  <Badge className="bg-red-100 text-red-700 border border-red-300 ml-2">
    <AlertTriangle className="w-3 h-3 mr-1" />
    +{((producto.precio_editado - producto.precio_actual) / producto.precio_actual * 100).toFixed(1)}%
  </Badge>
)}
```

**B) Crear notificación al guardar:**
```typescript
// Después de ajustar costos exitosamente
const productosConIncremento = productosConCambios.filter(
  p => p.precio_facturado > productosCostos.find(x => x.producto_id === p.producto_id)?.precio_actual
);

if (productosConIncremento.length > 0) {
  await supabase.from("notificaciones").insert({
    tipo: "costo_incrementado",
    titulo: `⚠️ Costo mayor: ${ordenCompra.folio}`,
    descripcion: `Se detectó incremento de costo en ${productosConIncremento.length} producto(s). Impacto: +$${diferenciaTotalMonto.toFixed(2)}`,
    leida: false
  });
}
```

---

### 4. Actualizar Edge Function `notificar-faltante-oc`

**Agregar nuevo tipo:** `productos_modificados`

**Uso:** Cuando se eliminan productos de una OC ya enviada, notificar al proveedor con la lista de cambios.

**Nuevo template de email:**
```typescript
case 'productos_modificados':
  asunto = `📝 Modificación de Orden - ${orden_folio}`;
  cuerpoHTML = `
    <p>Estimado ${proveedor_nombre},</p>
    <p>Le informamos que la orden <strong>${orden_folio}</strong> ha sido modificada.</p>
    
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
      <p style="font-weight: bold; color: #92400e; margin: 0 0 10px;">Productos cancelados:</p>
      <ul style="margin: 0; padding-left: 20px; color: #92400e;">
        ${getProductosHTML(productos_cancelados)}
      </ul>
      ${motivo_cancelacion ? `<p style="margin-top: 10px;"><strong>Motivo:</strong> ${motivo_cancelacion}</p>` : ''}
    </div>
    
    <p>Por favor tome nota de esta modificación. Los productos listados arriba <strong>ya no deben ser enviados</strong>.</p>
    
    <p>Saludos cordiales,<br><strong>Departamento de Compras</strong></p>
  `;
  break;
```

---

### 5. Mejora Visual en Calendario (Iconografía)

**Archivo:** `CalendarioEntregasTab.tsx`

Ya tiene iconografía diferenciada:
- ✅ CheckCircle2 verde = Recibida
- ⚠️ PackageX naranja = Faltante pendiente
- 🟢 Punto verde = Anticipado pagado
- 🟡 Punto amarillo = Anticipado pendiente
- 🔴 Punto rojo = Contra entrega

**Mejora adicional:** Agregar badge de "Reprogramada" cuando `notas` contiene `[AUTO]`:

```typescript
// En el mapeo de entregas del grid
{entrega.notas?.includes('[AUTO]') && (
  <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
    Reprog.
  </Badge>
)}
```

---

### 6. Sincronización Realtime en `OrdenesCompraTab.tsx`

**Agregar subscripción** para actualizar la barra de progreso de recepción en tiempo real:

```typescript
useEffect(() => {
  const channel = supabase
    .channel('oc-entregas-sync')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'ordenes_compra_entregas'
      },
      () => {
        queryClient.invalidateQueries({ queryKey: ["ordenes_compra"] });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

---

## Resumen de Archivos

| Archivo | Cambios |
|---------|---------|
| `ModificarProductosOCDialog.tsx` | **NUEVO** - Eliminar productos antes de recepción |
| `OrdenAccionesDialog.tsx` | Agregar botón "Modificar productos" |
| `AjustarCostosOCDialog.tsx` | Badge de alerta + notificación de costo mayor |
| `CalendarioEntregasTab.tsx` | Badge "Reprog." para entregas auto-reprogramadas |
| `OrdenesCompraTab.tsx` | Subscripción Realtime para sincronización |
| `notificar-faltante-oc/index.ts` | Nuevo tipo `productos_modificados` |

---

## Flujos Completos Después de la Implementación

### Flujo A: Cancelar producto por error de captura

```text
1. OC con 3 productos creada y enviada al proveedor
2. Admin detecta error → abre menú "Acciones" → "Modificar productos"
3. Selecciona producto a eliminar, escribe motivo
4. Sistema:
   - Elimina el producto de ordenes_compra_detalles
   - Recalcula subtotal, IVA, total
   - Envía email al proveedor notificando la modificación
5. Proveedor recibe email con productos cancelados
6. OC continúa con 2 productos
```

### Flujo B: Recepción parcial + cancelar faltante

```text
1. OC con 2 productos, llega solo 1
2. Almacén marca producto 2 como "no_llego"
3. Sistema crea entrega automática para día siguiente
4. Admin decide que ya no necesita producto 2
5. Va a "Faltantes" → Cancela el faltante pendiente
6. Sistema:
   - Marca entrega como cancelada
   - Verifica: no hay más entregas pendientes
   - Cambia OC a status "completada"
   - Notifica al proveedor
7. OC procede a pago solo por producto 1
```

### Flujo C: Detección de costo mayor

```text
1. OC registrada a $100/unidad
2. Proveedor factura a $120/unidad
3. Usuario abre "Ajustar Costos" en OC
4. Al cambiar precio:
   - Badge rojo aparece: "+20%"
   - Input se resalta en amarillo
5. Al guardar:
   - Sistema actualiza lotes y WAC
   - Crea notificación: "⚠️ Costo mayor: OC-XXXX - +$200"
6. Admin ve alerta en Centro de Notificaciones
```

---

## Notas Técnicas

- El componente `FaltantesPendientesTab` ya maneja correctamente la cancelación de faltantes después de recepción
- La única parte faltante era cancelar productos **antes** de la recepción (nuevo `ModificarProductosOCDialog`)
- Las alertas de costo son solo internas, nunca se notifica al proveedor del incremento
- La sincronización Realtime asegura que todos los paneles (Almacén, Secretaría, Admin) vean los cambios inmediatamente
