

# Liberar el panel "Por Autorizar" -- quitar el recuadro y usar toda la ventana

## El problema actual

El panel esta encerrado dentro de un componente `Card` (recuadro con borde, padding, header). Esto crea una "caja dentro de una caja" que desperdicia espacio vertical. Ademas, el `ScrollArea` interno tiene un limite de altura que, combinado con el padding del Card, impide que se vean todas las tarjetas y que el scroll funcione correctamente.

Resultado: dice "7 pendientes" pero solo se ven 2-3, y no puedes hacer scroll para ver las demas.

## La solucion: Eliminar el recuadro, usar lista directa

Quitar el envoltorio `Card` y mostrar las tarjetas directamente en la pagina, aprovechando toda la ventana disponible. El titulo "Por Autorizar" se mantiene como un header simple (sin caja).

```text
Antes (con Card):
+------ Card border + padding ------+
| [icon] Por Autorizar     [7]      |
| +-- ScrollArea (limitada) ------+ |
| | Tarjeta 1                     | |
| | Tarjeta 2                     | |
| | (no se ven mas, sin scroll)   | |
| +-------------------------------+ |
+-----------------------------------+

Despues (sin Card):
[icon] Por Autorizar  [7]
  Tarjeta 1
  Tarjeta 2
  Tarjeta 3
  Tarjeta 4
  Tarjeta 5
  Tarjeta 6
  Tarjeta 7
  (scroll natural de la pagina)
```

## Que cambia

| Aspecto | Antes | Despues |
|---------|-------|---------|
| Envoltorio | Card con borde y padding | Div simple, sin borde |
| Scroll | ScrollArea interno limitado | Scroll natural de la pagina completa |
| Espacio usado | ~60% de la ventana | 100% de la ventana disponible |
| Visibilidad | 2-3 tarjetas | Todas las tarjetas con scroll completo |

## Detalle tecnico

### Archivo: `src/components/admin/SolicitudesDescuentoPanel.tsx`

1. Reemplazar el wrapper `Card > CardHeader > CardContent > ScrollArea` por una estructura plana:
   - Un `div` contenedor con el titulo "Por Autorizar" + badge como header simple
   - Las tarjetas directamente debajo, sin `ScrollArea` -- se scrollean con la pagina
   - Se mantiene un separador sutil entre el header y las tarjetas

2. El titulo conserva el icono de campana, el texto y el badge con el contador

3. Las tarjetas (`SolicitudCardFlat`) no cambian en absoluto -- solo cambia su contenedor

4. Los dialogs (Contraoferta, Rechazo, Ver Mas) no cambian

### Resultado esperado
- Las 7 solicitudes se ven todas haciendo scroll en la pagina
- No hay recuadro ni "caja" que limite el espacio
- El scroll es el natural de la ventana, sin limites artificiales
- En mobile funciona igual -- scroll completo sin restricciones
