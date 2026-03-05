

# Plan: Rediseño Profesional del Encabezado del Pedido (PedidoPrintTemplate)

## Problemas detectados

1. El header usa `text-center` con `flex justify-center` pero el logo y el título no quedan visualmente balanceados — el logo queda pegado al texto.
2. No hay título "PEDIDO / REMISIÓN" como documento, solo el nombre de la empresa.
3. Las filas vacías de relleno (6 filas) hacen que pedidos pequeños se vean desproporcionados, igual que pasaba en la hoja de carga.

## Cambios en `PedidoPrintTemplate.tsx`

### Header profesional
- Layout de 3 columnas: logo a la izquierda (centrado verticalmente), datos de empresa al centro (razón social, RFC, teléfonos, dirección), y título "PEDIDO / REMISIÓN" a la derecha con el folio debajo.
- Borde inferior limpio de 2px.
- Logo con altura fija `h-12` para que se vea nítido y proporcionado.

### Mover folio al header
- El folio pasa al header (esquina derecha) para darle prominencia y liberar espacio en la sección de datos del cliente.
- La sección de cliente pierde la columna de folio, quedando más limpia a ancho completo.

### Tabla adaptativa
- Reducir filas vacías de relleno de 6 a 2 (igual que se hizo en hoja de carga): `Math.max(0, 2 - datos.productos.length)`.

## Archivo a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/pedidos/PedidoPrintTemplate.tsx` | Rediseño del header y tabla adaptativa |

