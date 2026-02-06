

# Rediseno: Panel de Solicitudes de Descuento -- Vista Plana y Rapida

## El problema

El panel actual usa un patron de "expandir/colapsar" (accordion). Cada tarjeta colapsada mide ~80px, pero al expandir una, crece a ~500px con: detalle de precios, botones de accion, carrito completo e historial. Como el contenedor tiene un maximo de 600px, al expandir la primera tarjeta ya no hay espacio para ver las demas. Por eso dice "7 pendientes" pero solo se ven 2.

Ademas, si se intenta expandir la ultima tarjeta visible, el contenido queda cortado porque no hay espacio.

## La solucion: Tarjetas planas con todo visible

Eliminar el patron de expand/collapse. Cada tarjeta mostrara TODA la informacion esencial y los botones de accion directamente, sin necesidad de hacer click para ver mas. La informacion secundaria (carrito completo, historial de precios) estara disponible mediante un boton "Ver mas" que abre un dialog.

### Diseno de cada tarjeta compacta (~160px):

```text
+------------------------------------------------------+
| Vendedor: Juan Lopez          hace 5 min    URGENTE  |
| Cliente: Materiales del Norte - Suc. Centro          |
|------------------------------------------------------|
| Azucar Estandar 50kg                    x 20 uds     |
| $580 --> $520  (-$60)   Costo: $450  [+15.6% margen] |
|------------------------------------------------------|
| [Aprobar $520] [$550] [$551] [Rechazar] [Otro] [+]   |
+------------------------------------------------------+
```

### Que cambia:

| Antes | Despues |
|-------|---------|
| Header colapsado (80px) + contenido expandido (500px) | Tarjeta plana con todo visible (~160px) |
| Solo 2 tarjetas visibles de 7 | Las 7 tarjetas visibles con scroll |
| Click para ver precios y botones | Precios y botones siempre visibles |
| Informacion del carrito inline | Carrito en dialog bajo "Ver mas" |
| Historial de precios inline | Historial en dialog bajo "Ver mas" |
| ScrollArea de 600px | ScrollArea adaptativa (hasta 80vh) |

### Informacion que se mueve a un dialog "Ver mas":
- Carrito completo del pedido (productos, cantidades, subtotales)
- Historial de precios con este cliente
- Saldo pendiente del cliente (solo se muestra como icono de alerta si hay saldo)

### Informacion que permanece en la tarjeta:
- Vendedor + tiempo transcurrido + indicador urgente
- Cliente + sucursal
- Producto + cantidad
- Precio lista, precio solicitado, descuento, costo, margen
- Botones: Aprobar (precio solicitado), Precio medio, -5%, Rechazar, Otro precio

## Detalle tecnico

### Archivo a modificar: `src/components/admin/SolicitudesDescuentoPanel.tsx`

**Eliminar:**
- Estado `expandedItems` y funcion `toggleExpanded`
- useEffect de auto-expand
- La logica de `isExpanded` en SolicitudCard
- Props `isExpanded` y `onToggleExpand`

**Redisenar SolicitudCard:**
- Layout compacto en 3 filas:
  1. Fila superior: vendedor, tiempo, urgencia
  2. Fila media: producto, precios, costo/margen
  3. Fila inferior: botones de accion (todos visibles)
- Nuevo boton "Ver mas" que abre un Dialog con carrito + historial (carga bajo demanda como antes)

**Ajustar ScrollArea:**
- Cambiar `max-h-[600px]` a `max-h-[calc(80vh-120px)]` para aprovechar mas pantalla

**Consistencia mobile/desktop:**
- El componente `SolicitudesDescuentoPanel` ya es el mismo para ambas vistas (no tiene componente mobile separado)
- Las tarjetas compactas usaran `flex-wrap` para adaptarse automaticamente a pantallas pequenas
- Los botones de accion se apilaran verticalmente en mobile y horizontalmente en desktop

### Archivos que NO cambian:
- `useSolicitudesDescuento.ts` -- el hook ya tiene toda la logica correcta
- Dialogs de Rechazo y Contraoferta -- se mantienen identicos
- Push notifications -- ya implementados correctamente
- `removeSolicitud` -- ya funciona correctamente

### Resultado esperado:
- Las 7 solicitudes son visibles en la lista sin necesidad de expandir nada
- Cada tarjeta muestra todo lo necesario para tomar una decision rapida
- Los botones de accion estan siempre accesibles
- Informacion secundaria disponible bajo "Ver mas" sin saturar la vista principal
