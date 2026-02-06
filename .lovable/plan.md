
# Plan: Optimizar Panel Admin para Movil y Quitar Pedidos Autorizados del Dashboard

## Problemas Identificados

### 1. SolicitudesDescuentoPanel aparece en el Dashboard
En `Dashboard.tsx` linea 76, se muestra `<SolicitudesDescuentoPanel />` directamente en el Dashboard. El usuario no quiere que aparezca ahi -- este panel ya existe en la pestana "Por Autorizar" de Pedidos (linea 937-938 de `Pedidos.tsx`).

### 2. Dialogo de autorizacion desktop se rompe en movil
Aunque el `PedidosPorAutorizarTab` tiene un flujo mobile separado usando `AutorizacionRapidaSheet`, el dialogo desktop de revision de precios (lineas 520-727) tiene problemas graves si se accede desde tablet o pantallas intermedias:
- Grid `grid-cols-3` para info del cliente (linea 548) -- se comprime en pantallas medianas
- Tabla de 7 columnas para productos -- se desborda
- Card de total con `w-64` fijo -- no se adapta
- Botones de accion `flex justify-end` -- dificil de tocar

### 3. SolicitudesDescuentoPanel tiene problemas moviles
El panel de solicitudes de descuento (que se muestra en la pestana "Por Autorizar") tiene:
- Botones de aprobacion rapida en `flex flex-wrap` que se comprimen
- Grid `grid-cols-2` en el detalle de precio que se comprime
- Informacion del vendedor y producto en una sola linea que se trunca

---

## Cambios Propuestos

### Paso 1: Quitar SolicitudesDescuentoPanel del Dashboard
**Archivo:** `src/pages/Dashboard.tsx`
- Eliminar la importacion de `SolicitudesDescuentoPanel`
- Eliminar la linea `<SolicitudesDescuentoPanel />` (linea 76)
- El panel seguira visible en la pestana "Por Autorizar" de Pedidos donde corresponde

### Paso 2: Optimizar dialogo de revision de precios para movil
**Archivo:** `src/components/pedidos/PedidosPorAutorizarTab.tsx`

En el dialogo desktop (lineas 520-727):
- Cambiar `grid-cols-3` a `grid-cols-1 sm:grid-cols-3` para info del cliente
- Reemplazar la tabla de 7 columnas con cards apiladas cuando `isMobile` es true (mismo patron que `PedidoDetalleProductCards`)
- Cambiar el total de `w-64` a `w-full sm:w-64`
- Hacer botones de accion full-width apilados en movil: `flex-col sm:flex-row`
- Ajustar el header del dialogo para que los botones "Editar precios" / "Cancelar" no se compriman

### Paso 3: Optimizar SolicitudesDescuentoPanel para movil
**Archivo:** `src/components/admin/SolicitudesDescuentoPanel.tsx`

- Cambiar `grid-cols-2` del detalle de descuento a `grid-cols-1` en movil
- Hacer botones de aprobacion rapida `flex-col` con full-width en movil
- Asegurar que la informacion del vendedor/cliente se muestre en multiples lineas en movil

### Paso 4: Mejorar AutorizacionRapidaSheet (ajustes menores)
**Archivo:** `src/components/pedidos/AutorizacionRapidaSheet.tsx`
- Quitar `truncate` de los nombres de productos (linea 284) y usar `line-clamp-2` para que se lean completos
- Esto ya es el flujo movil principal y funciona bien, solo necesita este ajuste menor

---

## Detalle Tecnico

### Archivos a modificar:
1. `src/pages/Dashboard.tsx` -- Quitar SolicitudesDescuentoPanel
2. `src/components/pedidos/PedidosPorAutorizarTab.tsx` -- Dialogo responsivo
3. `src/components/admin/SolicitudesDescuentoPanel.tsx` -- Botones y grids responsivos
4. `src/components/pedidos/AutorizacionRapidaSheet.tsx` -- Quitar truncate de nombres

### Patron de responsividad:
- Se usara `useIsMobile()` ya importado en los archivos
- Desktop: Sin cambios visibles, todo se mantiene igual
- Movil: Cards en vez de tablas, grids de una columna, botones apilados
- Se sigue el patron existente de `PedidoDetalleProductCards` para las tablas de productos
