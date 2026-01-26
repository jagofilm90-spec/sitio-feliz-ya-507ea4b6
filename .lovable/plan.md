
# Plan: Resumen Visual Detallado en Panel de Pago

## Situación Actual

El `MarcarPagadoDialog` ya muestra un resumen básico cuando hay devoluciones:
- Total Original: $60,000.00
- (-) Devoluciones: -$100.00
- Total a Pagar: $59,900.00

**Lo que falta:** El detalle de qué productos fueron devueltos, cuántas unidades y el monto de cada uno.

---

## Mejora Propuesta

Transformar la sección de devoluciones en un resumen visual completo con desglose por producto:

```text
┌─────────────────────────────────────────────────────────────────┐
│  REGISTRAR PAGO - OC-202601-0003                                │
├─────────────────────────────────────────────────────────────────┤
│  Proveedor: BODEGA AURRERA                                      │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 📦 RESUMEN DE PAGO                                        │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │                                                            │  │
│  │ Total Original:                           $60,000.00      │  │
│  │                                                            │  │
│  │ ⚠️ Devoluciones:                             -$100.00      │  │
│  │   ┌──────────────────────────────────────────────────┐   │  │
│  │   │ • 2 × Azúcar Estándar 50kg                       │   │  │
│  │   │   Motivo: Roto | $50.00 c/u → -$100.00           │   │  │
│  │   │ • 1 × Arroz Morelos 25kg                         │   │  │
│  │   │   Motivo: Calidad | $42.00 c/u → -$42.00         │   │  │
│  │   └──────────────────────────────────────────────────┘   │  │
│  │                                                            │  │
│  │ ─────────────────────────────────────────────────────     │  │
│  │ ✅ TOTAL A PAGAR:                         $59,858.00      │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Cambios Técnicos

### Archivo: `src/components/compras/MarcarPagadoDialog.tsx`

**1. Agregar query para obtener devoluciones de la OC:**

```typescript
// Nuevo query para obtener detalles de devoluciones
const { data: devolucionesDetalle = [] } = useQuery({
  queryKey: ["devoluciones-detalle-pago", orden?.id],
  queryFn: async () => {
    // Primero obtener las devoluciones
    const { data: devoluciones, error } = await supabase
      .from("devoluciones_proveedor")
      .select(`
        id,
        cantidad_devuelta,
        motivo,
        producto_id,
        productos (nombre, codigo)
      `)
      .eq("orden_compra_id", orden?.id);
    
    if (error) throw error;
    
    // Para cada devolución, obtener el precio unitario
    const devolucionesConPrecio = await Promise.all(
      (devoluciones || []).map(async (dev) => {
        const { data: detalle } = await supabase
          .from("ordenes_compra_detalles")
          .select("precio_unitario_compra")
          .eq("orden_compra_id", orden?.id)
          .eq("producto_id", dev.producto_id)
          .maybeSingle();
        
        return {
          ...dev,
          precio_unitario: detalle?.precio_unitario_compra || 0,
          monto: dev.cantidad_devuelta * (detalle?.precio_unitario_compra || 0)
        };
      })
    );
    
    return devolucionesConPrecio;
  },
  enabled: !!orden?.id && open,
});
```

**2. Crear componente visual de resumen:**

Nueva sección que reemplaza el resumen básico actual con:
- Card con fondo destacado
- Icono de paquete para el título
- Lista colapsable de productos devueltos
- Cada producto muestra: cantidad, nombre, motivo, precio unitario, subtotal
- Total claramente destacado con color de éxito

**3. Formato de motivos legible:**

```typescript
const formatMotivo = (motivo: string) => {
  const motivos: Record<string, string> = {
    'roto': 'Empaque roto',
    'rechazado_calidad': 'Calidad rechazada',
    'no_llego': 'No llegó',
  };
  return motivos[motivo] || motivo;
};
```

---

## Beneficios para el Proveedor

Cuando se envía el correo de confirmación de pago, el cuerpo del mensaje también incluirá:

```html
<h3>Detalle de Devoluciones Aplicadas:</h3>
<table>
  <tr>
    <th>Producto</th>
    <th>Cantidad</th>
    <th>Motivo</th>
    <th>Descuento</th>
  </tr>
  <tr>
    <td>Azúcar Estándar 50kg</td>
    <td>2</td>
    <td>Empaque roto</td>
    <td>-$100.00</td>
  </tr>
</table>
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/compras/MarcarPagadoDialog.tsx` | Agregar query de devoluciones y componente visual de resumen |

---

## Resultado Esperado

1. Al abrir el diálogo de pago de una OC con devoluciones, se verá inmediatamente:
   - El total original de la OC
   - Lista detallada de cada producto devuelto (nombre, cantidad, motivo, monto)
   - El total final a pagar claramente destacado

2. El proveedor recibirá en el correo de confirmación el mismo desglose para transparencia total

3. La información visual permite al operador confirmar que el pago es correcto antes de ejecutarlo
