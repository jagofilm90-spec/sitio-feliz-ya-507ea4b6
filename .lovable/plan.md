

# Plan: Historial de Modificaciones Visible en Detalle de Pedido

## Resumen

Crear un componente reutilizable `PedidoHistorialCambios` que consulte la tabla `pedidos_historial_cambios` y muestre una línea de tiempo con cada modificación. Integrarlo en los dos diálogos de detalle existentes: `PedidoDetalleDialog` (admin/secretaria) y `PedidoDetalleVendedorDialog` (vendedor).

## Componente nuevo: `PedidoHistorialCambios.tsx`

- Recibe `pedidoId` como prop
- Consulta `pedidos_historial_cambios` filtrado por `pedido_id`, ordenado por `created_at` desc
- Join con `profiles` vía `usuario_id` para mostrar el nombre de quien hizo el cambio
- Muestra una timeline vertical con:
  - **Icono/badge** según `tipo_cambio`: "almacen_carga" (icono Warehouse) vs "conciliacion_secretaria" (icono ClipboardCheck)
  - **Fecha/hora** formateada
  - **Quien** hizo el cambio (nombre del usuario)
  - **Detalle de cambios** parseado del JSONB `cambios`: lista de productos con cantidad original → cantidad nueva
  - **Total anterior → Total nuevo** si cambió
- Si no hay historial, no se renderiza nada (sin sección vacía)

## Integración en diálogos existentes

### `PedidoDetalleDialog.tsx` (admin/secretaria)
- Agregar `<PedidoHistorialCambios pedidoId={pedidoId} />` después de la sección de totales, antes del cierre del dialog

### `PedidoDetalleVendedorDialog.tsx` (vendedor)
- Agregar el mismo componente después de la sección de notas, antes de los botones de acción

## Archivos a crear/modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/pedidos/PedidoHistorialCambios.tsx` | **Nuevo** - Componente de timeline de cambios |
| `src/components/pedidos/PedidoDetalleDialog.tsx` | Importar y renderizar el componente |
| `src/components/vendedor/PedidoDetalleVendedorDialog.tsx` | Importar y renderizar el componente |

No se requieren migraciones de base de datos (la tabla ya existe).

