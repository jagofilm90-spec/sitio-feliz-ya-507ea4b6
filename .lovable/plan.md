

# Plan: Sistema de 4 Hojas en PDF Interno

## Situación Actual

Actualmente el PDF interno (a `pedidos@almasa.com.mx`) genera **3 páginas**:
1. Remisión (PedidoPrintTemplate)
2. Hoja de Carga Almacén (con QR, sin precios)
3. Hoja de Carga Cliente (con precios, firmas, pagaré)

El PDF al cliente es **1 página** (solo remisión sin QR).

## Lo que se necesita (4 hojas internas)

Según tu descripción, el PDF interno debe tener **4 hojas**, cada una con logo Almasa:

```text
HOJA 1: PEDIDO (igual que la del cliente)
  → Remisión comercial con precios, totales, impuestos
  → Para control de oficinas (se junta con las demás al final)

HOJA 2: ORIGINAL (Hoja de Carga con QR)
  → Dice "ORIGINAL" visible
  → Con código QR para escanear en tablet de almacén
  → Sin precios (solo cantidades y productos)
  → Con espacios para firmas (Entregó/Recibió)
  → Con espacio para observaciones (devoluciones/faltantes)
  → El chofer la lleva, el cliente la firma, el chofer la trae de vuelta

HOJA 3: CLIENTE (Hoja de Carga sin QR)
  → Dice "CLIENTE" visible
  → Misma info que ORIGINAL pero sin QR
  → Sin precios
  → Se la queda el cliente

HOJA 4: ALMACÉN (Hoja de Carga sin QR)
  → Dice "ALMACÉN" visible
  → Misma info que ORIGINAL pero sin QR
  → Sin precios
  → Se queda en almacén para emparejar con la ORIGINAL firmada al día siguiente
```

## Flujo operativo

```text
Creación del pedido:
  → Email cliente: 1 PDF (Hoja 1 sola, sin QR)
  → Email pedidos@almasa.com.mx: 1 PDF de 4 hojas

Día de entrega:
  → Secretaria imprime las 4 hojas
  → Chofer lleva: ORIGINAL + CLIENTE
  → Se queda en almacén: ALMACÉN
  → Se queda en oficina: PEDIDO (Hoja 4/control)

Regreso del chofer:
  → Trae la ORIGINAL firmada con observaciones
  → Almacenista empareja ORIGINAL + ALMACÉN
  → Oficinas juntan: ORIGINAL + ALMACÉN + PEDIDO (control)

Si hay devolución/faltante:
  → Secretaria busca pedido, modifica cantidades
  → Se reimprime, se junta con ORIGINAL firmada
  → Cambios se reflejan en pedido original para cobro correcto
```

## Cambios Técnicos

### 1. Crear nueva plantilla: `HojaCargaUnificadaTemplate`

Una sola plantilla reutilizable con props para controlar variante:
- `variante`: `"ORIGINAL"` | `"CLIENTE"` | `"ALMACÉN"`
- `showQR`: solo true para ORIGINAL
- Sin precios en ninguna variante
- Con espacios para firmas (Entregó/Recibió) y observaciones
- Logo Almasa, nombre cliente, dirección entrega, cantidades, productos

### 2. Modificar `generatePdfFromTemplate` en `VendedorNuevoPedidoTab.tsx`

El PDF interno pasa de 3 a 4 páginas:
- Página 1: `PedidoPrintTemplate` (remisión con precios, igual que la del cliente)
- Página 2: `HojaCargaUnificadaTemplate` variante ORIGINAL (con QR)
- Página 3: `HojaCargaUnificadaTemplate` variante CLIENTE (sin QR)
- Página 4: `HojaCargaUnificadaTemplate` variante ALMACÉN (sin QR)

### 3. Eliminar templates redundantes

`HojaCargaAlmacenTemplate` y `HojaCargaClienteTemplate` se reemplazan por la nueva `HojaCargaUnificadaTemplate`.

### 4. Modificar email interno

Actualizar el cuerpo del email en la Edge Function `enviar-pedido-interno` para incluir la frase: *"Favor de imprimir PDF para su entrega"*.

### 5. La modificación de pedidos por secretarias/almacén

Esto **ya existe** en el sistema: las secretarias pueden editar pedidos en estado `pendiente` o `por_autorizar`, y los cambios se sincronizan al pedido original. La reimpresión de hojas de carga actualizadas también ya está implementada en el flujo de carga.

### Archivos a crear/modificar

| Archivo | Acción |
|---------|--------|
| `src/components/pedidos/HojaCargaUnificadaTemplate.tsx` | **Crear** — plantilla unificada con variantes ORIGINAL/CLIENTE/ALMACÉN |
| `src/components/vendedor/VendedorNuevoPedidoTab.tsx` | **Modificar** — PDF interno de 3→4 páginas usando nueva plantilla |
| `supabase/functions/enviar-pedido-interno/index.ts` | **Modificar** — agregar frase "favor de imprimir PDF para su entrega" |
| `src/components/pedidos/HojaCargaAlmacenTemplate.tsx` | **Eliminar** (reemplazada) |
| `src/components/pedidos/HojaCargaClienteTemplate.tsx` | **Eliminar** (reemplazada) |

