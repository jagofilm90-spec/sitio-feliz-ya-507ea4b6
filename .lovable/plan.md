

# Plan: Rediseño Compacto de Hoja de Carga

## Problema

La hoja de carga actual ocupa demasiado espacio vertical: siempre muestra 6 filas de productos (vacías si hay pocos), secciones con padding excesivo, y observaciones con 3 líneas fijas. Para un pedido de 1 producto se ve vacía y poco profesional.

## Cambios en `HojaCargaUnificadaTemplate.tsx`

### Header compacto
- Combinar el header y la barra de variante en una sola franja: logo a la izquierda, "HOJA DE CARGA" centrado, QR a la derecha, y la banda de color de variante como borde inferior en lugar de bloque separado.

### Info del pedido en línea
- Fusionar folio, cliente, peso total y dirección en un solo bloque de 2 filas con grid, eliminando la sección separada de dirección.

### Tabla de productos adaptativa
- Eliminar las filas vacías de relleno fijo. En su lugar, mostrar solo las filas reales.
- Agregar un mínimo de 2 filas vacías (en vez de 6) solo si hay menos de 3 productos, para que haya espacio para anotaciones manuales.
- Reducir padding de celdas de `p-1.5` a `py-1 px-2`.

### Observaciones y firmas más compactas
- Reducir observaciones de 3 líneas a 2.
- Reducir altura de firma de `h-12` a `h-8`.

### Resultado
- Un pedido de 1 producto ocupará aproximadamente la mitad de la hoja, luciendo limpio y proporcional.
- Pedidos con muchos productos seguirán funcionando igual, simplemente la tabla crece de forma natural.

## Archivo a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/pedidos/HojaCargaUnificadaTemplate.tsx` | Rediseño compacto del layout completo |

