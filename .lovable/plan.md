
# Plan: Corregir Scroll en Diálogo de Procesar Pago

## Análisis del Problema

### ¿Por qué no funciona el scroll?

1. **Conflicto CSS**: El componente `DialogContent` base tiene `display: grid` en sus estilos (línea 39 de `dialog.tsx`). Agregamos `flex flex-col`, pero `grid` tiene mayor especificidad.

2. **ScrollArea de Radix**: El componente `ScrollArea` envuelve el contenido en un `Viewport` interno que necesita una altura definida explícitamente para calcular el área scrolleable. Actualmente solo definimos `max-h` en el Root, no en el Viewport.

3. **Estructura actual incorrecta**:
```
DialogContent (grid + flex-col conflicto, max-h-[90vh])
  └─ DialogHeader (flex-shrink-0)
  └─ ScrollArea (flex-1 max-h-[calc(90vh-180px)])
        └─ Viewport (h-full w-full - pero no tiene referencia de altura real)
             └─ contenido
  └─ DialogFooter (flex-shrink-0)
```

## Solución

Reemplazar `ScrollArea` por un `div` con `overflow-y-auto` nativo que funciona más confiablemente en diálogos modales. Esto evita los problemas de cálculo de altura de Radix ScrollArea.

### Modificar `src/components/compras/ProcesarPagoOCDialog.tsx`

#### Cambio 1: Estructura del DialogContent (líneas 572-585)

**Antes:**
```tsx
<DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
  <DialogHeader className="flex-shrink-0">
    ...
  </DialogHeader>

  <ScrollArea className="flex-1 max-h-[calc(90vh-180px)] pr-4">
    <div className="space-y-6 pb-4">
```

**Después:**
```tsx
<DialogContent className="max-w-4xl max-h-[90vh] !flex !flex-col overflow-hidden">
  <DialogHeader className="flex-shrink-0">
    ...
  </DialogHeader>

  <div className="flex-1 overflow-y-auto pr-4 min-h-0">
    <div className="space-y-6 pb-4">
```

**Explicación:**
- `!flex !flex-col` - Usa `!important` de Tailwind para sobrescribir el `grid` base
- `overflow-hidden` en DialogContent - Previene doble scrollbar
- `overflow-y-auto` en el contenedor - Scroll nativo del navegador
- `min-h-0` - Crítico para que flex-1 calcule correctamente la altura en flex containers

#### Cambio 2: Cerrar el div (línea ~1052)

Cambiar el cierre de `</ScrollArea>` por `</div>`:

**Antes:**
```tsx
        </ScrollArea>

        <DialogFooter className="flex-shrink-0 border-t pt-4">
```

**Después:**
```tsx
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4">
```

#### Cambio 3: Remover import de ScrollArea si ya no se usa

Si `ScrollArea` no se usa en otro lugar del archivo, remover el import:
```tsx
// Remover de línea 49:
import { ScrollArea } from "@/components/ui/scroll-area";
```

---

## Resultado Visual

```
┌─────────────────────────────────────────────────────────────────────┐
│ Procesar Pago - OC-202601-0005                              [X]    │ ← Header fijo
│ Selecciona los productos a pagar...                                 │
├─────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ [Contenido scrolleable]                                          │ │
│ │ • Proveedor info                                                 │ │
│ │ • Alertas                                                        │ │
│ │ • Tabla de productos                                             │ │
│ │ • Resumen de pago                                                │ │
│ │ • Datos del pago (comprobante, etc.)        ← Se puede ver aquí │ │
│ └─────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│           [Cancelar]  [✓ Confirmar Pago]                           │ ← Footer fijo
└─────────────────────────────────────────────────────────────────────┘
```

---

## Alternativa: Usar Scrollbar Styling

Si prefieres mantener una barra de scroll más estilizada como la de ScrollArea, podemos agregar estas clases CSS nativas:

```tsx
<div className="flex-1 overflow-y-auto min-h-0 pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
```

Pero esto requiere el plugin `tailwind-scrollbar` que puede no estar instalado.

---

## Resumen de Cambios

| Ubicación | Cambio |
|-----------|--------|
| Línea 573 | Agregar `!flex !flex-col overflow-hidden` al DialogContent |
| Línea 584 | Cambiar `<ScrollArea className="flex-1 max-h-[calc(90vh-180px)] pr-4">` por `<div className="flex-1 overflow-y-auto pr-4 min-h-0">` |
| Línea 1052 | Cambiar `</ScrollArea>` por `</div>` |
| Línea 49 | Opcional: remover import de ScrollArea si no se usa en otro lugar |

---

## Nota sobre los Bultos = 0

El código para calcular `cantidad` basado en `tipo_pago === 'anticipado'` **ya está correctamente implementado** (líneas 143-150). Si aún muestra 0, puede ser:

1. **Caché del navegador** - El usuario necesita hacer hard refresh (Cmd+Shift+R en Mac)
2. **React Query cache** - Los datos viejos siguen en memoria hasta que se invalida la query

Después de implementar este cambio de scroll, el usuario debería:
1. Cerrar el diálogo
2. Refrescar la página (hard refresh)
3. Volver a abrir el diálogo de pago

Esto forzará que la query se re-ejecute con la lógica corregida.
