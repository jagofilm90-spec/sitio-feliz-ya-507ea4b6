

# Plan: Notificar al Cliente de Modificaciones al Enviar a Ruta

## Problema Actual

Cuando el almacenista modifica cantidades durante la carga (ej: de 80 a 70 unidades de azúcar), el sistema:
- Sincroniza las cantidades al pedido (`syncCargaToPedidos`) 
- Envía notificación "en_ruta" al cliente **pero sin PDF actualizado y sin mencionar las modificaciones**

El cliente recibe un correo genérico de "su pedido va en camino" sin saber que su pedido cambió.

## Solución

### 1. Detectar modificaciones al momento de sincronizar

En `syncCargaToPedidos` (dentro de `AlmacenCargaRutasTab.tsx`), recopilar las diferencias entre `cantidad original` y `cantidad_cargada` para cada producto modificado. Retornar un mapa de `pedidoId → cambios[]`.

```text
Ejemplo de cambios detectados:
  Azúcar Estándar: 80 → 70 (-10)
  Aceite 1L: 50 → 50 (sin cambio, no se incluye)
```

### 2. Generar PDF actualizado del pedido del cliente

Después de sincronizar las cantidades, generar un nuevo PDF de remisión (1 página, tipo cliente) con las cantidades ya actualizadas. Esto se hace en el frontend con el mismo `PedidoPrintTemplate` que ya existe.

### 3. Modificar el email "en_ruta" en la Edge Function

Agregar un nuevo campo opcional `modificaciones` al tipo de notificación `en_ruta`:

```text
data: {
  pedidoFolio, choferNombre,
  modificaciones?: [
    { producto: "Azúcar Estándar", cantidadOriginal: 80, cantidadNueva: 70 },
  ],
  totalAnterior?: number,
  totalNuevo?: number,
}
```

Si hay modificaciones, el email cambia de:
- "¡Su pedido va en camino!" 
  
A:
- "¡Su pedido va en camino! Le informamos que hubo ajustes en su pedido:"
- Tabla con producto, cantidad original, cantidad nueva
- Total anterior vs total nuevo
- PDF actualizado adjunto

Si NO hay modificaciones, el email queda igual que ahora (sin PDF, sin mención de cambios).

### 4. Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/almacen/AlmacenCargaRutasTab.tsx` | `syncCargaToPedidos` retorna cambios detectados; `handleEnviarARuta` genera PDF y lo envía con las modificaciones |
| `src/components/almacen/CargaRutaInlineFlow.tsx` | Mismo ajuste en `handleFinalizarCarga` (flujo inline) |
| `supabase/functions/send-client-notification/index.ts` | Template "en_ruta" condicional: si hay `modificaciones`, mostrar tabla de cambios y adjuntar PDF |

### 5. Flujo resultante

```text
Almacenista cambia 80→70 en azúcar
  ↓
"Enviar a Ruta"
  ↓
syncCargaToPedidos: actualiza pedido, detecta cambios
  ↓
Si hay cambios:
  → Genera PDF cliente actualizado (1 página remisión)
  → Envía "en_ruta" con modificaciones[] + PDF adjunto
  → WhatsApp: "Su pedido va en camino. Nota: hubo ajustes..."
Si NO hay cambios:
  → Envía "en_ruta" normal sin PDF
```

