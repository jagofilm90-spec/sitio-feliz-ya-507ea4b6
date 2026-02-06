
# Plan: Reestructurar Menus, Pestanas y Ventanas de Pedidos para Movil

## Problemas Identificados

Despues de revisar todo el codigo, encontre estos problemas concretos que causan una experiencia desestructurada en movil:

### 1. NuevoPedidoDialog (admin) - Grids que no se adaptan
- El grid de Cliente/Sucursal usa `grid-cols-2` fijo sin breakpoint movil, aplastando ambos selects en una pantalla pequena (linea 473)
- La tabla de productos dentro del dialogo tiene 6 columnas que se desbordan sin wrap movil
- La seccion de cortesias tiene elementos en fila que se comprimen en movil

### 2. PedidoDetalleDialog - Tabla rígida sin vista movil
- La tabla de productos tiene 6 columnas (Codigo, Producto, Cantidad, Presentacion, P.Unitario, Subtotal) sin version card para movil
- Los totales usan `flex justify-end` con ancho fijo w-64 que no se adapta
- La grid de informacion general usa `grid-cols-2 md:grid-cols-4` pero no se ve bien en pantallas muy pequenas

### 3. VendedorPanel - Navegacion inferior se corta
- La barra de navegacion inferior tiene 7 items en un scroll horizontal pero sin indicadores visuales de que hay mas contenido
- Los items no tienen iconos en todos los casos (Novedades, Precios, Saldos, Comisiones solo muestran texto sin icono)
- El padding inferior `pb-32` puede ser excesivo o insuficiente segun el dispositivo

### 4. Pedidos.tsx (admin) - Pestanas sin estructura clara
- Las 5 pestanas (Por Autorizar, Pedidos, Cotizaciones, Analisis, Calendario) usan labels abreviados en movil pero sin iconos consistentes ni indicadores de scroll

### 5. PedidosPorAutorizarTab - Tabla de autorizacion sin vista card
- El componente ya importa `PedidoCardMobile` pero necesita revision de como se muestran los detalles de autorizacion en movil

---

## Cambios Propuestos

### Paso 1: NuevoPedidoDialog - Grid responsivo y tabla card movil
- Cambiar `grid-cols-2` a `grid-cols-1 sm:grid-cols-2` en el bloque Cliente/Sucursal
- Reemplazar la tabla de productos con cards en movil (mostrar producto, cantidad, precio y subtotal en formato vertical con controles tactiles)
- Hacer la seccion de cortesias con stack vertical en movil

### Paso 2: PedidoDetalleDialog - Vista card para productos en movil
- Agregar deteccion `useIsMobile()` al componente
- En movil, reemplazar la tabla de 6 columnas con cards por producto que muestren: nombre, cantidad, presentacion, precio y subtotal
- Mover los totales a ancho completo en movil
- Cambiar la grid de info general a `grid-cols-1` en pantallas muy pequenas

### Paso 3: VendedorPanel - Mejorar navegacion inferior
- Agregar iconos faltantes a los items de navegacion (Novedades=Sparkles, Precios=List, Saldos=Wallet, Comisiones=Percent)
- Agregar indicador visual de scroll (gradiente lateral)
- Ajustar el padding inferior para ser consistente con safe-area

### Paso 4: Pedidos.tsx - Refinar pestanas movil
- Mejorar la estructura visual de las pestanas con spacing consistente
- Agregar indicadores de scroll lateral (fade/gradiente) para que sea obvio que hay mas pestanas

---

## Detalle Tecnico

### Archivos a modificar:
1. `src/components/pedidos/NuevoPedidoDialog.tsx` - Grid responsivo + cards moviles para tabla de productos
2. `src/components/pedidos/PedidoDetalleDialog.tsx` - Cards moviles para detalle + totales responsivos
3. `src/pages/VendedorPanel.tsx` - Iconos en todos los items de nav + indicador scroll
4. `src/pages/Pedidos.tsx` - Indicadores de scroll en pestanas

### Patron de cards moviles para tablas:
Se usara el mismo patron que ya existe en `PedidoCardMobile.tsx` y `PedidoHistorialCardMobile.tsx`, donde en movil se muestra un Card con la informacion apilada verticalmente en vez de la tabla horizontal.

### Deteccion movil:
Se usara el hook existente `useIsMobile()` que ya se importa en varios de estos archivos, con el breakpoint de 768px.

### Compatibilidad:
- Desktop: Sin cambios visibles, todo se mantiene igual
- Tablet: Se beneficia de los grids responsivos
- Movil: Cards en vez de tablas, grids de una columna, nav con iconos
