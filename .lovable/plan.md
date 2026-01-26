
# Plan: Corregir Scroll en ProcesarPagoOCDialog

## El Problema

El diálogo de "Procesar Pago" no permite hacer scroll porque el `ScrollArea` no tiene las propiedades CSS necesarias para funcionar correctamente dentro de un contenedor flex.

**Causa técnica:** En flexbox, los elementos hijos con `flex-1` necesitan `min-h-0` para permitir que se encojan cuando el contenido es más grande que el espacio disponible.

---

## Corrección

**Archivo**: `src/components/compras/ProcesarPagoOCDialog.tsx`

**Línea 531**: Agregar `overflow-hidden` y `min-h-0` al ScrollArea:

```typescript
// ANTES (línea 531):
<ScrollArea className="flex-1 px-1">

// DESPUÉS:
<ScrollArea className="flex-1 min-h-0 overflow-hidden px-1">
```

---

## Por qué funciona

```text
┌─────────────────────────────────────────────────┐
│  DialogContent (max-h-[90vh] flex flex-col)     │
├─────────────────────────────────────────────────┤
│  DialogHeader (altura fija)                     │
├─────────────────────────────────────────────────┤
│  ScrollArea (flex-1 min-h-0 overflow-hidden)    │  ← AHORA tiene límite
│  ┌───────────────────────────────────────────┐  │
│  │  Contenido largo...                       │  │
│  │  Productos, totales, formulario...        │  │  ← Scroll interno
│  │  Comprobante de pago                      │  │
│  └───────────────────────────────────────────┘  │
├─────────────────────────────────────────────────┤
│  DialogFooter (altura fija, border-t)           │
└─────────────────────────────────────────────────┘
```

- `min-h-0`: Permite que el elemento flexbox se encoja por debajo de su tamaño natural de contenido
- `overflow-hidden`: Activa el recorte del contenido desbordado, permitiendo que ScrollArea maneje el scroll

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/compras/ProcesarPagoOCDialog.tsx` | Línea 531: agregar `min-h-0 overflow-hidden` al className del ScrollArea |
