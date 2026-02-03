
# Plan: Hacer Scrollable el Dialog de Acciones de OC en Móvil

## Problema Identificado

El diálogo `OrdenAccionesDialog` que se abre al presionar "Acciones" en una OC tiene demasiado contenido y en móvil **se corta** porque:

1. **No tiene altura máxima** - el contenido se sale del viewport
2. **No tiene overflow scroll** - no se puede desplazar para ver todo el contenido
3. **El grid de 4 columnas** para el panel de entregas (Sin Fecha, Programadas, En Descarga, Recibidas) es demasiado apretado en móvil

### Screenshot del problema:
- El diálogo aparece cortado arriba
- No se puede hacer scroll para ver más contenido
- El panel de entregas muestra 4 columnas muy comprimidas

---

## Solución Propuesta

### Cambios en `src/components/compras/OrdenAccionesDialog.tsx`

**1. Agregar `max-h-[90vh] overflow-y-auto` al DialogContent (línea 1625)**

Antes:
```tsx
<DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg overflow-x-hidden">
```

Después:
```tsx
<DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden">
```

**2. Cambiar el grid de entregas de 4 a 2 columnas en móvil (línea 1710)**

Antes:
```tsx
<div className="grid grid-cols-4 gap-2">
```

Después:
```tsx
<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
```

Esto hará que en móvil muestre 2x2 en lugar de 4x1 apretados.

---

## Beneficios

| Antes | Después |
|-------|---------|
| Diálogo cortado, no scrolleable | Diálogo con scroll vertical |
| Panel de 4 columnas apretadas | Panel 2x2 legible en móvil |
| No se puede ver todo el contenido | Contenido 100% accesible |

## Archivo a Modificar

| Archivo | Línea | Cambio |
|---------|-------|--------|
| `src/components/compras/OrdenAccionesDialog.tsx` | 1625 | Agregar `max-h-[90vh] overflow-y-auto` |
| `src/components/compras/OrdenAccionesDialog.tsx` | 1710 | Cambiar a `grid-cols-2 sm:grid-cols-4` |
