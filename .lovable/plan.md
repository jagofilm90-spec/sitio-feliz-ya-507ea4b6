
# Plan: Reestructurar Panel de Autorizacion en Movil

## El Problema Real

En la pestana "Por Autorizar", hay DOS paneles separados:
1. **Solicitudes de Descuento** (panel individual por producto) - ocupa TODA la pantalla
2. **Pedidos por Autorizar** (pedidos completos) - aparece abajo con "Sin pedidos pendientes"

Tu estas viendo las solicitudes de descuento, pero:
- No ves el pedido completo (los 10 productos, solo el 1 que pide descuento)
- No hay boton de rechazar visible (esta en el otro panel)
- No aparece el % de margen/ganancia
- El "Sin pedidos pendientes" confunde porque SI hay cosas que autorizar

## Solucion

### Cambio 1: Mostrar el pedido completo dentro de cada solicitud de descuento
**Archivo:** `src/components/admin/SolicitudesDescuentoPanel.tsx`

Actualmente los "Otros productos en el carrito" estan escondidos en un collapsible. Se van a mostrar SIEMPRE visibles, con el producto que pide descuento resaltado en rojo/amarillo y los demas en gris:

```text
SOLICITUD DE DESCUENTO
Vendedor: Carlos Giron | Cliente: Alimentos La Central

--- Productos del pedido (3 total) ---

[RESALTADO] Fecula de Maiz     100 uds
  Lista: $430  |  Solicitado: $376  |  Dif: -$54
  Costo: $320  |  Margen: +17.5%

  Harina de Trigo               50 uds    $12,500
  Azucar Estandar               20 uds    $8,400

--- Total estimado: $58,500 ---

[Aprobar $376]  [$403]  [Rechazar]  [Otro precio]
```

### Cambio 2: Agregar costo y % de margen al detalle de descuento
**Archivo:** `src/components/admin/SolicitudesDescuentoPanel.tsx`

Necesito traer `ultimo_costo_compra` y `costo_promedio_ponderado` del producto en la query. Actualmente solo trae `id, codigo, nombre`.

Se agrega una linea nueva al "Detalle del Descuento":
```text
Precio lista:       $430.00
Precio solicitado:  $376.00
Max. autorizado:    -$30.00
Excedente:          -$24.00
Costo:              $320.00
Margen estimado:    +17.5%   (badge verde/amarillo/rojo)
```

### Cambio 3: Quitar "Sin pedidos pendientes" cuando hay solicitudes de descuento
**Archivo:** `src/components/pedidos/PedidosPorAutorizarTab.tsx`

Si no hay pedidos con status "por_autorizar", el componente no renderiza nada (return null) en vez del mensaje "Sin pedidos pendientes". Esto evita que ocupe espacio al final de la pantalla cuando las solicitudes de descuento son lo que importa.

### Cambio 4: Hacer botones de accion siempre accesibles
**Archivo:** `src/components/admin/SolicitudesDescuentoPanel.tsx`

Los botones de Aprobar/Rechazar/Otro precio se muestran SIEMPRE que la solicitud este expandida, sin necesidad de hacer scroll hasta el fondo. Se colocan como un sticky footer dentro de cada tarjeta expandida, o se reducen a botones compactos visibles al inicio.

---

## Detalle Tecnico

### Archivos a modificar:

1. **`src/components/admin/SolicitudesDescuentoPanel.tsx`**
   - Ampliar la query de productos: agregar `ultimo_costo_compra, costo_promedio_ponderado` al select de `producto:productos(...)`
   - En `SolicitudCard`, mostrar los items del carrito (`carritoItems`) directamente visibles (no en collapsible), con el producto solicitado resaltado
   - Agregar fila de Costo y Margen % al bloque "Detalle del Descuento" (lineas 488-516)
   - Usar badges de color: verde (margen >= 10%), amarillo (0-10%), rojo (negativo)
   - Reorganizar los botones de aprobacion rapida para que esten mas arriba, directamente debajo del detalle de precios

2. **`src/components/pedidos/PedidosPorAutorizarTab.tsx`**
   - Lineas 382-388: Cambiar de mostrar mensaje "Sin pedidos pendientes" a `return null`
   - Esto hace que solo aparezca `SolicitudesDescuentoPanel` sin ruido visual debajo

3. **`src/hooks/useSolicitudesDescuento.ts`**
   - Ampliar la query del producto para incluir campos de costo: `producto:productos(id, codigo, nombre, ultimo_costo_compra, costo_promedio_ponderado, precio_venta)`
   - Actualizar la interface `SolicitudDescuento.producto` para incluir los nuevos campos

### Calculo del margen:
```typescript
const costo = solicitud.producto?.ultimo_costo_compra 
  || solicitud.producto?.costo_promedio_ponderado || 0;
const margenPct = costo > 0 
  ? ((solicitud.precio_solicitado - costo) / costo) * 100 
  : 0;
```

### Layout del carrito (productos del pedido):
- Producto con descuento: fondo amarillo/rojo, muestra desglose completo de precios
- Otros productos: fondo neutral, solo nombre + cantidad + subtotal en una linea
- Total estimado del pedido al final

### Compatibilidad:
- Desktop: mismos cambios, se ve mejor con mas espacio
- Movil: todo apilado verticalmente, botones full-width
- No hay cambios en la logica de aprobar/rechazar/contraoferta
- El `AutorizacionRapidaSheet` y la tabla de `PedidosPorAutorizarTab` se mantienen para cuando SI haya pedidos con status "por_autorizar"
