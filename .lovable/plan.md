

# Regla de Proyecto: Sincronizacion Automatica Mobile/Desktop

## Contexto del problema

El proyecto tiene **29 archivos** que usan `useIsMobile()` con rendering condicional (`isMobile ? <Mobile /> : <Desktop />`), y **20+ componentes dedicados `*CardMobile.tsx`** que son versiones separadas para movil. Esto significa que cualquier cambio en la vista desktop NO se refleja automaticamente en movil, y viceversa.

### Archivos con rendering condicional (los que requieren doble actualizacion):

| Modulo | Archivo padre | Componente Mobile separado |
|--------|--------------|---------------------------|
| Pedidos | `Pedidos.tsx` | `PedidoHistorialCardMobile.tsx` |
| Por Autorizar | `PedidosPorAutorizarTab.tsx` | `PedidoCardMobile.tsx` + `AutorizacionRapidaSheet.tsx` |
| Descuentos | `SolicitudesDescuentoPanel.tsx` | (inline mobile/desktop) |
| Ordenes Compra | `OrdenesCompraTab.tsx` | `OrdenCompraCardMobile.tsx` |
| Cotizaciones | `CotizacionesTab.tsx` | `CotizacionCardMobile.tsx` |
| Clientes | `Clientes.tsx` | `ClienteCardMobile.tsx` |
| Empleados | `Empleados.tsx` | `EmpleadoCardMobile.tsx` |
| Inventario | `InventarioPorCategoria.tsx` | `CategoriaProductoMobile.tsx` |
| Movimientos | `MovimientosTab.tsx` | `MovimientoCardMobile.tsx` |
| Vehiculos | `VehiculosTab.tsx` | `VehiculoCardMobile.tsx` |
| Fumigaciones | `Fumigaciones.tsx` | `FumigacionCardMobile.tsx` |
| Rentabilidad | `Rentabilidad.tsx` | `RentabilidadCardMobile.tsx` |
| Usuarios | `UsuariosContent.tsx` | `UsuarioCardMobile.tsx` |
| Correos | `EmailListView.tsx` | `EmailRowMobile.tsx` |
| Secretaria | `SecretariaInventarioTab.tsx` | `InventarioItemMobile.tsx` |
| Precios | `ProductosPreciosTab.tsx` | `ProductoPrecioCardMobile.tsx` |
| Lotes | `LotesTab.tsx` | `LoteCardMobile.tsx` |
| Productos (wizard) | `PasoProductos.tsx` | `ProductoItemMobile.tsx` |
| Dashboard | `Dashboard.tsx` | `EstadoOperacionesMobile.tsx` |

## La regla que se implementa

A partir de ahora, **cada cambio que se haga en cualquier vista (desktop o movil) se aplicara automaticamente a la otra vista**. Esto incluye:

1. **Datos nuevos**: Si se agrega un campo (ej: % margen), aparece en la tabla desktop Y en la card mobile
2. **Acciones nuevas**: Si se agrega un boton (ej: rechazar), aparece en ambas vistas
3. **Logica de negocio**: Si se cambia un calculo o condicion, se actualiza en ambos paths de rendering
4. **Estilos y estados**: Si se cambia un badge o estado visual, se refleja en ambos

## Como se implementa (sin cambios de codigo ahora)

Esta regla se aplica como **metodologia de trabajo**, no como un cambio de codigo:

- Cuando reciba instrucciones de cambiar algo en una vista, identificare TODOS los archivos que renderizan esa informacion (desktop + mobile)
- Aplicare el cambio en todos los archivos afectados en la misma sesion
- Verificare que los props, datos y acciones sean consistentes entre las versiones mobile y desktop del mismo componente

No se requiere refactorizar los 29 archivos existentes ahora -- la arquitectura de componentes separados es valida y permite optimizar cada vista para su dispositivo. Lo que se corrige es el proceso: **nunca mas se hara un cambio en uno sin actualizar el otro**.

## Accion inmediata pendiente

Los cambios del plan anterior (rechazo, margen, estado vacio) necesitan verificarse en AMBAS vistas:
- `SolicitudesDescuentoPanel.tsx` -- ya tiene los cambios de margen y carrito
- `PedidosPorAutorizarTab.tsx` -- ya tiene el estado vacio compacto
- `AutorizacionRapidaSheet.tsx` -- ya tiene el rechazo en footer
- `PedidoCardMobile.tsx` -- verificar que tenga margen tambien

Si hay inconsistencias actuales, se corregiran en la siguiente iteracion.

