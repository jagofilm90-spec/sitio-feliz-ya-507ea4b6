

# Plan: Crédito obligatorio y reordenar tabla de productos en pedido

## Cambios

### 1. Hacer obligatorio seleccionar crédito antes de avanzar

En `PasoProductosInline.tsx`:
- Cambiar la condicion `canContinue` para que tambien requiera que `terminoCredito` no este vacio: `const canContinue = lineas.length > 0 && terminoCredito !== ""`
- Actualizar el texto del boton cuando no hay credito seleccionado para que diga algo como "Selecciona un plazo de crédito"
- En el collapsible de credito, si no hay credito seleccionado mostrar el texto "Sin seleccionar" en lugar del valor actual (que mostraria algo raro con string vacio)

### 2. Reordenar: tabla de "Productos en pedido" arriba, catalogo abajo

En `PasoProductosInline.tsx`, mover la seccion de "Productos en pedido" (actualmente lineas ~527-661) para que aparezca **antes** de la tabla del catalogo de productos (lineas ~404-481). El orden quedaria:

1. Indicador de cliente
2. Buscador
3. **Productos en pedido** (la tabla con los productos ya agregados al carrito) -- solo si hay lineas
4. Credito + Notas (collapsible)
5. **Catalogo de productos** (la tabla grande donde se buscan y agregan productos)
6. Botones de navegacion

Esto permite al vendedor ver primero lo que ya tiene en el pedido antes de seguir buscando.

## Detalle Tecnico

### Archivo a modificar:
- `src/components/vendedor/pedido-wizard/PasoProductosInline.tsx`

### Cambios especificos:
1. Linea 362: cambiar `canContinue` para incluir validacion de credito
2. Lineas 670-678: actualizar texto del boton segun estado de credito
3. Linea 489: manejar caso de `terminoCredito` vacio en el label del collapsible
4. Mover el bloque JSX de "Productos en pedido" (lineas ~527-661) para que aparezca despues del buscador y antes del catalogo
