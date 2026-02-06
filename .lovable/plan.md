
# Plan: Optimizar Catalogo de Productos para Movil en Vendedor

## Problemas Detectados

Del screenshot se identifican 3 problemas claros:

1. **Nombres de productos cortados**: Cada producto usa `truncate` en una sola linea, por lo que nombres largos como "Fecula de Maiz Ingredion -- Bulto 25.00 kg" se cortan y no se pueden leer completos.

2. **Controles de cantidad invisibles/inaccesibles**: Los botones +/- y el contador estan en la misma fila que el nombre y precio, comprimidos contra el borde derecho. En pantallas angostas, los botones se vuelven demasiado pequenos para tocar o quedan ocultos.

3. **Header del paso se superpone**: El titulo "Selecciona los productos y las cantidades" queda parcialmente tapado por el header fijo del vendedor, desperdiciando espacio vertical.

---

## Cambios Propuestos

### 1. Redisenar items del catalogo para movil (`PasoProductos.tsx`)

Cambiar el layout de cada producto de una sola fila horizontal a un formato apilado en movil:

```text
Antes (una sola fila):
[Nombre cortado...] [$precio] [-][0][+]

Despues (apilado en movil):
[Nombre completo del producto]
[Codigo] [Stock badge] [$precio]
[-] [cantidad] [+]
```

Cambios especificos:
- Quitar `truncate` del nombre en movil para que se muestre completo (usar `line-clamp-2` para limitar a 2 lineas como maximo)
- Mover precio y controles de cantidad a una segunda fila debajo del nombre
- Hacer los botones +/- mas grandes en movil: `h-9 w-9` en vez de `h-7 w-7` para mejor area tactil
- Agregar un boton "Agregar" visible cuando la cantidad es 0 en vez de solo el "+"

### 2. Reducir header del paso en movil (`PasoProductos.tsx`)

- Ocultar el titulo grande "Que productos necesita?" en movil (ya es obvio por el step indicator)
- Mantener solo el subtitulo como texto pequeno
- Esto recupera ~60px de espacio vertical valioso

### 3. Ajustar ScrollArea en movil (`PasoProductos.tsx`)

- Cambiar la altura del area de scroll de `h-[300px]` a `h-[calc(100vh-320px)]` en movil para usar todo el espacio disponible hasta la barra de navegacion inferior
- Esto permite ver mas productos sin scrollear tanto

### 4. Productos frecuentes mas compactos (`PasoProductos.tsx`)

- El grid de frecuentes usa `grid-cols-2` en movil pero los items son muy pequenos
- Cambiar a cards mas legibles con nombre + precio + boton de agregar

---

## Detalle Tecnico

### Archivo a modificar:
- `src/components/vendedor/pedido-wizard/PasoProductos.tsx`

### Patron del nuevo layout movil para cada item del catalogo:

En movil, cada producto sera un card con dos secciones:
- **Arriba**: Nombre completo (hasta 2 lineas) + codigo + stock badge + precio
- **Abajo**: Controles de cantidad con botones tactiles grandes, o boton "Agregar" si cantidad es 0

En desktop: Sin cambios, se mantiene el layout horizontal actual.

### Deteccion movil:
Se usa el hook `useIsMobile()` que ya esta importado en el archivo.

### Compatibilidad:
- Desktop/Tablet: Sin cambios visibles
- Movil: Layout apilado con botones tactiles grandes y nombres completos
