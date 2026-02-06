
# Plan: Corregir 3 Problemas de Autorizacion en Movil

## Problema 1: No deja rechazar pedidos

**Causa raiz**: Cuando tocas "Rechazar pedido" en el footer, el formulario de rechazo (textarea + boton confirmar) aparece DENTRO del area de scroll de productos. Necesitas hacer scroll hasta el final de todos los productos para encontrarlo -- es practicamente invisible.

**Solucion**: Mover el formulario de rechazo al footer (la zona fija de abajo). Cuando se toque "Rechazar", el footer cambiara para mostrar el textarea + botones de confirmar/cancelar directamente en la parte inferior de la pantalla, siempre visible sin necesidad de scroll.

```text
Antes:
[Header]
[Scroll con productos...]
  [...muchos productos...]
  [Formulario rechazo escondido aqui abajo]
[Footer: botones desaparecen]

Despues:
[Header]
[Scroll con productos...]
[Footer: Textarea motivo + Confirmar/Cancelar]
```

---

## Problema 2: No aparece el % de ganancia

**Causa raiz**: Todos los productos en la base de datos tienen `ultimo_costo_compra = 0` y `costo_promedio_ponderado = 0`. El codigo actual verifica `costo > 0` antes de mostrar el margen, y como todos son cero, la seccion nunca se renderiza.

**Solucion**: Mostrar la seccion de costo/margen SIEMPRE, pero con un mensaje claro cuando no hay costo registrado:

- Si hay costo > 0: Mostrar el costo + % de margen con badge de color (verde/amarillo/rojo)
- Si costo = 0: Mostrar "Sin costo registrado" en gris para indicar que falta el dato

Esto aplica en ambos archivos:
- `AutorizacionRapidaSheet.tsx` (vista movil principal)
- `PedidosPorAutorizarTab.tsx` (cards moviles del dialogo y tabla desktop)

---

## Problema 3: "Sin pedidos pendientes" se ve mal abajo

**Causa raiz**: En la pestana "Por Autorizar", se muestra primero el `SolicitudesDescuentoPanel` (que puede ocupar mucho espacio) y despues el `PedidosPorAutorizarTab`. Cuando no hay pedidos por autorizar, aparece una tarjeta grande con icono y padding de 48px en la parte inferior, lo cual se ve mal especialmente en movil.

**Solucion**: Cambiar el estado vacio a un mensaje compacto inline en vez de una tarjeta gigante. En movil sera un texto simple con icono pequeno, sin la tarjeta Card envolvente con padding excesivo.

---

## Detalle Tecnico

### Archivos a modificar:

1. **`src/components/pedidos/AutorizacionRapidaSheet.tsx`**
   - Mover el bloque de formulario de rechazo (lineas 366-398) de dentro del `ScrollArea` al area del footer (despues de linea 401)
   - Cuando `showRejectForm` sea true, el footer mostrara: textarea + botones confirmar/cancelar
   - Cuando sea false, se mantiene el layout actual de botones autorizar/editar/rechazar
   - Cambiar la condicion `costo > 0` (linea 331) para mostrar siempre la seccion de margen
   - Si costo es 0, mostrar texto "Sin costo" en vez del badge de margen

2. **`src/components/pedidos/PedidosPorAutorizarTab.tsx`**
   - En las cards moviles del dialogo (lineas 614-624): misma logica -- mostrar seccion de margen siempre
   - En la tabla desktop (lineas 737-745): mostrar "Sin costo" cuando no hay dato
   - Cambiar el estado vacio (lineas 382-392): reducir de Card grande a un mensaje inline compacto
   - En movil: solo un texto con icono, sin la Card con `py-12`

### Patron de la seccion de costo/margen:

```text
Si costo > 0:
  Costo: $320.00  |  +21.9% margen (badge verde/amarillo/rojo)

Si costo = 0:
  Costo: Sin registro  |  -- margen (badge gris)
```

### Compatibilidad:
- Desktop: Se agregan las etiquetas "Sin costo" donde antes no aparecia nada
- Movil: Formulario de rechazo visible en el footer, margen siempre visible, estado vacio compacto
- La logica de autorizacion/rechazo no cambia, solo se mueve de posicion
