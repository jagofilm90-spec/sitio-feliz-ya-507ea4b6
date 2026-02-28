

# Plan: GPS en Tiempo Real para Choferes + Mejoras en Pestanas de Almacen

## Resumen

Implementar rastreo GPS tipo "Encontrar" para choferes visible desde almacen, con horario de operacion (L-V 8am-8pm, Sab 8am-6pm), mapa en tiempo real, y mejoras a las pestanas "En Ruta" y "Pedidos Entregados" con sistema de pedidos individuales y auto-completado de rutas.

---

## 1. Mapa en Tiempo Real del Chofer (tipo "Encontrar")

Crear un componente de mapa que muestre la ubicacion en vivo del chofer usando Google Maps.

- Crear `src/components/almacen/ChoferMapDialog.tsx`: dialogo con Google Maps embebido mostrando un marcador animado con la posicion del chofer en tiempo real
- Usa el hook existente `useChoferUbicacionRealtime` para obtener latitud/longitud con actualizacion automatica via Realtime
- Muestra: nombre del chofer, velocidad, precision, ultima actualizacion
- Indicador visual si la senal esta "stale" (mas de 5 min sin actualizar)
- Boton de localizacion (icono de pin) junto al nombre del chofer en cada tarjeta de ruta

---

## 2. Horario de Tracking GPS

Agregar logica de horario al servicio de geolocalizacion para que solo envie posicion dentro del horario laboral.

- Modificar `src/services/backgroundGeolocation.ts`: agregar funcion `isWithinTrackingSchedule()` que valide:
  - Lunes a Viernes: 8:00 AM - 8:00 PM
  - Sabado: 8:00 AM - 6:00 PM
  - Domingo: No tracking
- En `updateLocationInDB`, verificar el horario antes de hacer el upsert a la base de datos
- Si esta fuera de horario, no enviar la ubicacion (el watcher sigue activo para no perder permisos, pero no se guarda)

---

## 3. Redisenar Pestana "En Ruta"

Actualizar `RutasEnRutaTab.tsx` para incluir:

- **Boton de localizacion** junto al nombre del chofer que abre `ChoferMapDialog`
- **Unidad (vehiculo)** visible: placa y nombre
- **Sistema de pedidos individuales**: cuando hay mas de 1 pedido, mostrar "Pedido 1", "Pedido 2", "Pedido 3" con tabs o acordeon
  - Cada pedido muestra: cliente, folio, productos, peso
  - Palomita verde si ya fue entregado, pendiente si no
  - Contador visible: "1/3 entregados", "2/2 entregados"
- **Auto-completado**: cuando todas las entregas de una ruta estan marcadas como entregadas (ej. 2/2), la ruta se mueve automaticamente a "Pedidos Entregados" (cambiar status a 'completada')

---

## 4. Redisenar Pestana "Pedidos Entregados"

Actualizar `RutasEntregadasTab.tsx` para:

- Mostrar rutas completadas del **mes completo** (no solo del dia) para auditorias
- Filtro por fecha (rango de fechas) con selector
- Cada ruta muestra: chofer, unidad, hora inicio/fin, pedidos con detalle
- Misma estructura de pedidos individuales con palomitas verdes
- Conservar datos minimo 1 mes (ya se guardan en la tabla `rutas` y `entregas`)

---

## 5. Auto-completar Ruta al Entregar Todos los Pedidos

Cuando el chofer confirma la ultima entrega de una ruta:

- Modificar la logica post-entrega en `EntregaCard.tsx` / `RegistrarEntregaSheet`:
  - Despues de marcar una entrega, verificar si TODAS las entregas de esa ruta estan completadas
  - Si todas estan completadas, automaticamente actualizar la ruta a status `completada` con `fecha_hora_fin = now()`
  - Esto hace que desaparezca de "En Ruta" y aparezca en "Pedidos Entregados" en tiempo real

---

## Detalle Tecnico

### Archivos nuevos:
- `src/components/almacen/ChoferMapDialog.tsx` - Mapa Google Maps con marcador en vivo

### Archivos a modificar:
- `src/components/almacen/RutasEnRutaTab.tsx` - Agregar boton GPS, sistema de pedidos, auto-completado
- `src/components/almacen/RutasEntregadasTab.tsx` - Mostrar mes completo con filtros
- `src/services/backgroundGeolocation.ts` - Agregar validacion de horario laboral
- `src/components/chofer/EntregaCard.tsx` o flujo de entrega - Auto-completar ruta

### No se requieren cambios de base de datos:
- La tabla `chofer_ubicaciones` ya existe con los campos necesarios
- Las tablas `rutas` y `entregas` ya tienen los campos de status y timestamps
- Los datos se mantienen en BD indefinidamente (auditoria cubierta)

