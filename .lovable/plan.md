

# PDF de 3 Paginas para Email Interno de Pedido

## Problema Actual

Cuando se crea un pedido, el email interno a `pedidos@almasa.com.mx` solo adjunta **1 pagina** (la Remision/Pedido). Segun el plan original, el PDF deberia contener **3 paginas**:

1. **Pagina 1 - Remision de Oficina** (`PedidoPrintTemplate`) -- con QR interno
2. **Pagina 2 - Hoja de Carga Almacen** (`HojaCargaAlmacenTemplate`) -- para el almacenista, con checkboxes y QR
3. **Pagina 3 - Hoja de Carga Cliente** (`HojaCargaClienteTemplate`) -- para el chofer/cliente, con firmas, pagare, datos bancarios

## Cambios Necesarios

### 1. Modificar la generacion de PDF en `VendedorNuevoPedidoTab.tsx`

Cambiar la funcion `generatePdfFromTemplate` para que el PDF interno (el que NO tiene `hideQR`) genere un documento de **3 paginas**:

- Renderizar las 3 plantillas (`PedidoPrintTemplate`, `HojaCargaAlmacenTemplate`, `HojaCargaClienteTemplate`) en contenedores ocultos
- Capturar cada una con `html2canvas` (scale 3x)
- Combinarlas en un unico PDF de 3 paginas usando `jsPDF.addPage()`

Para esto se necesita:
- Importar `HojaCargaAlmacenTemplate` y `HojaCargaClienteTemplate`
- Preparar los datos para cada plantilla (la mayoria ya estan disponibles en `datosPrintFinal`)
- Para `HojaCargaAlmacenTemplate` se necesita agregar la `unidad` de cada producto (ya disponible en `l.producto.unidad`)
- Para `HojaCargaClienteTemplate` se necesita agregar `unidad` y campos operacionales (chofer, etc.) que estaran vacios en esta etapa inicial

### 2. Estructura del nuevo generador

```text
generatePdfFromTemplate(hideQR):
  Si hideQR = true (PDF para cliente):
    -> Solo 1 pagina: PedidoPrintTemplate con hideQR=true (igual que ahora)
  
  Si hideQR = false (PDF interno):
    -> 3 paginas en un solo PDF:
       Pagina 1: PedidoPrintTemplate (con QR)
       Pagina 2: HojaCargaAlmacenTemplate
       Pagina 3: HojaCargaClienteTemplate
```

### 3. Datos adicionales necesarios

- Para `HojaCargaAlmacenTemplate`: necesita `pedidoId`, `productos[].unidad` -- ambos disponibles
- Para `HojaCargaClienteTemplate`: necesita `productos[].unidad` -- disponible en `l.producto.unidad`

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/vendedor/VendedorNuevoPedidoTab.tsx` | Modificar `generatePdfFromTemplate` para renderizar 3 plantillas y combinarlas en PDF de 3 paginas cuando es el PDF interno |

### Resultado

El email a `pedidos@almasa.com.mx` incluira un PDF de 3 paginas listo para imprimir: la remision para oficina, la hoja de carga para almacen, y la hoja de entrega para el cliente.
