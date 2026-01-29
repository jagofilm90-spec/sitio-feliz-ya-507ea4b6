

# Plan: Incluir Comprobante de Recepción en Panel de Adeudos

## Objetivo
Agregar acceso al comprobante de recepción de cada OC directamente en la tabla del panel de Adeudos, permitiendo ver y descargar el PDF de recepción con un clic.

## Arquitectura de Datos Actual

Las recepciones se almacenan en la tabla `ordenes_compra_entregas`:
- Cada OC puede tener múltiples entregas/recepciones
- El campo `status = 'completada'` indica recepciones finalizadas
- El campo `recepcion_finalizada_en` tiene la fecha de finalización
- El `RecepcionDetalleDialog` ya existe y permite ver/descargar el PDF

## Cambios Propuestos

### Archivo: `src/components/compras/AdeudosProveedoresTab.tsx`

**1. Modificar la interfaz `OrdenConAdeudo`:**
```typescript
interface OrdenConAdeudo {
  // ... campos existentes
  entregas: {
    id: string;
    numero_entrega: number;
    status: string;
    recepcion_finalizada_en: string | null;
  }[];
}
```

**2. Actualizar el query para incluir entregas:**
```typescript
const { data, error } = await supabase
  .from("ordenes_compra")
  .select(`
    id, folio, fecha_orden, total, total_ajustado, 
    monto_pagado, status, status_pago, tipo_pago,
    proveedor_id, proveedor_nombre_manual,
    proveedores (id, nombre, telefono, email),
    ordenes_compra_entregas (
      id, numero_entrega, status, recepcion_finalizada_en
    )
  `)
  .in("status_pago", ["pendiente", "parcial"])
  .or('status.in.(recibida,completada,cerrada,parcial),tipo_pago.eq.anticipado')
  .order("fecha_orden", { ascending: false });
```

**3. Agregar estado para el dialog de recepción:**
```typescript
const [selectedEntregaId, setSelectedEntregaId] = useState<string | null>(null);
const [showRecepcionDialog, setShowRecepcionDialog] = useState(false);
```

**4. Agregar import del RecepcionDetalleDialog:**
```typescript
import { RecepcionDetalleDialog } from "./RecepcionDetalleDialog";
```

**5. Nueva columna en la tabla - "Recepción":**

Agregar entre "Adeudo" y el botón "Pagar":

| Folio | Fecha | Status OC | Status Pago | Total | Pagado | Adeudo | **Recepción** | Acciones |
|-------|-------|-----------|-------------|-------|--------|--------|---------------|----------|
| OC-... | 21/01 | Recibida  | Pendiente   | $234K | $0     | $234K  | **[Ver PDF]** | [Pagar]  |

**Lógica de visualización:**
- Si `entregas` tiene al menos una con `status = 'completada'`: Mostrar botón "Ver PDF"
- Si no hay entregas completadas: Mostrar texto "-" o "Pendiente"
- Si tipo_pago = 'anticipado' y sin recepciones: Mostrar "Anticipo" (no aplica comprobante aún)

**6. Código del botón de recepción:**
```typescript
<TableCell>
  {orden.entregas?.filter(e => e.status === 'completada').length > 0 ? (
    <Button
      size="sm"
      variant="ghost"
      className="text-blue-600"
      onClick={(e) => {
        e.stopPropagation();
        const completada = orden.entregas.find(e => e.status === 'completada');
        if (completada) {
          setSelectedEntregaId(completada.id);
          setShowRecepcionDialog(true);
        }
      }}
    >
      <FileText className="h-3 w-3 mr-1" />
      Ver
    </Button>
  ) : orden.tipo_pago === 'anticipado' ? (
    <span className="text-xs text-muted-foreground">N/A</span>
  ) : (
    <span className="text-xs text-muted-foreground">-</span>
  )}
</TableCell>
```

**7. Agregar el dialog al final del componente:**
```typescript
{/* Dialog de Detalle de Recepción */}
<RecepcionDetalleDialog
  entregaId={selectedEntregaId}
  open={showRecepcionDialog}
  onOpenChange={(open) => {
    setShowRecepcionDialog(open);
    if (!open) setSelectedEntregaId(null);
  }}
/>
```

## Resultado Visual

```text
+-------+--------+-----------+-------------+---------+--------+---------+-----------+--------+
| Folio | Fecha  | Status OC | Status Pago | Total   | Pagado | Adeudo  | Recepción | Acción |
+-------+--------+-----------+-------------+---------+--------+---------+-----------+--------+
| OC-02 | 21/01  | Completada| Pendiente   | $234,000| $0     | $234,000| [Ver PDF] | [Pagar]|
| OC-05 | 28/01  | Enviada   | Pendiente   | $2.4M   | $0     | $2.4M   | N/A       | [Pagar]|
+-------+--------+-----------+-------------+---------+--------+---------+-----------+--------+
```

## Flujo de Usuario

1. Usuario ve la tabla de adeudos
2. Identifica la columna "Recepción" con el botón "Ver"
3. Click en "Ver" abre el `RecepcionDetalleDialog`
4. En el dialog puede:
   - Ver detalles completos de la recepción
   - Ver firmas digitales
   - Ver evidencias fotográficas
   - Descargar/Previsualizar el PDF del comprobante

## Consideraciones Técnicas

- **OCs con múltiples entregas**: Si hay más de una recepción completada, el botón mostrará la primera. Se podría extender para mostrar un dropdown con todas las recepciones.
- **Performance**: El query con el join a `ordenes_compra_entregas` agrega datos mínimos (solo 4 campos por entrega).
- **Reutilización**: Se usa el `RecepcionDetalleDialog` existente, manteniendo consistencia con el resto del sistema.

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/compras/AdeudosProveedoresTab.tsx` | Agregar query de entregas, columna de recepción, y dialog |

