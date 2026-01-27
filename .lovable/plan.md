

# Plan: Mostrar Productos Recibidos por Entrega Específica

## El Problema Real

Cuando ves la recepción del día 23 (Entrega #1):
- **Actualmente muestra**: Ambos productos con cantidades totales (250 Bala Rojo + 40 Papel Blanco)
- **Debería mostrar**: Solo lo que llegó ese día (250 Papel Bala Rojo)

### Causa Raíz
El `RecepcionDetalleDialog` obtiene productos de `ordenes_compra_detalles`, que guarda **totales acumulados**, no por entrega.

### Solución Disponible
Los **lotes de inventario** (`inventario_lotes`) SÍ tienen el número de entrega en `lote_referencia`:
- `REC-OC-202601-0002-1` → Entrega 1 → Papel Bala Rojo (250)
- `REC-OC-202601-0002-2` → Entrega 2 → Papel Blanco Revolución (40)

---

## Solución Propuesta

### Enfoque A: Usar lotes de inventario para mostrar productos por entrega

Modificar `RecepcionDetalleDialog` para:

1. **Obtener productos desde `inventario_lotes`** filtrando por el patrón de lote_referencia que incluye el número de entrega
2. **Mostrar solo los productos que realmente llegaron en ESA entrega**
3. **Mantener la vista general de la OC** como referencia secundaria

### Cambios en RecepcionDetalleDialog.tsx

**Cambio 1: Nueva query para obtener productos por entrega**

```tsx
// Después de cargar la entrega, obtener lotes específicos de esta entrega
const patronLote = `REC-${(entrega as any).orden_compra.folio}-${(entrega as any).numero_entrega}`;

const { data: lotesEntrega } = await supabase
  .from("inventario_lotes")
  .select(`
    id, cantidad_disponible, lote_referencia, fecha_entrada,
    producto:productos(id, codigo, nombre, marca, especificaciones)
  `)
  .eq("orden_compra_id", (entrega as any).orden_compra.id)
  .like("lote_referencia", `${patronLote}%`);
```

**Cambio 2: Nuevo estado para productos de esta entrega**

```tsx
const [productosEntrega, setProductosEntrega] = useState<ProductoEntrega[]>([]);
```

**Cambio 3: Mostrar sección diferenciada**

```tsx
{/* Productos recibidos EN ESTA ENTREGA */}
<div className="space-y-2">
  <h4 className="font-medium flex items-center gap-2">
    <Package className="h-4 w-4" />
    Productos Recibidos en Esta Entrega
  </h4>
  
  {productosEntrega.length === 0 ? (
    <p className="text-muted-foreground text-sm">
      No se encontraron registros de lotes para esta entrega
    </p>
  ) : (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead className="text-right">Cantidad Recibida</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {productosEntrega.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.producto.nombre}</TableCell>
              <TableCell className="text-right font-medium">
                {item.cantidad_disponible}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )}
</div>

{/* Separador */}
<Separator />

{/* Resumen General de la OC (colapsable o secundario) */}
<Collapsible>
  <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground">
    <ChevronRight className="h-4 w-4" />
    Ver resumen total de la OC
  </CollapsibleTrigger>
  <CollapsibleContent>
    {/* Tabla actual de productos totales */}
  </CollapsibleContent>
</Collapsible>
```

---

## Cambios Adicionales para el Calendario

### CalendarioEntregasTab.tsx - Mostrar info en el día 23

Para la entrega original (no faltante), también mostrar qué llegó:

1. **Si NO es faltante**: Podemos consultar los lotes y mostrar un resumen
2. **Si ES faltante**: Ya lo tenemos en `productos_faltantes`

Agregar una query adicional o usar la información de lotes para mostrar en el popup del día.

---

## Resultado Esperado

### Día 23 - Entrega #1 (Original):
```text
┌────────────────────────────────────────────┐
│ OC-202601-0002                    [Recibida]│
├────────────────────────────────────────────┤
│ Productos Recibidos en Esta Entrega:       │
│ • 250x Papel Bala Rojo                     │
│                                            │
│ [▶ Ver resumen total de la OC]             │
└────────────────────────────────────────────┘
```

### Día 26 - Entrega #2 (Faltante):
```text
┌────────────────────────────────────────────┐
│ OC-202601-0002           [Recibida][Faltante]│
├────────────────────────────────────────────┤
│ ⚠️ Productos recibidos en esta entrega:    │
│ • 40x Papel Blanco Revolución              │
│                                            │
│ [▶ Ver resumen total de la OC]             │
└────────────────────────────────────────────┘
```

---

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/components/compras/RecepcionDetalleDialog.tsx` | 1. Nueva query para lotes por entrega 2. Nuevo estado productosEntrega 3. Mostrar productos específicos de la entrega primero 4. Mover tabla general a sección colapsable |
| `src/components/compras/CalendarioEntregasTab.tsx` | Opcional: mostrar productos recibidos en el popup del día |

---

## Beneficios

1. **Claridad total**: Ves exactamente qué llegó en cada entrega
2. **Trazabilidad**: Puedes verificar cada recepción individual
3. **Sin ambigüedad**: No confundes totales acumulados con recepciones específicas
4. **Contexto completo**: La información general de la OC sigue disponible como referencia

