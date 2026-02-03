
# Plan: Corregir Overflow Horizontal en Dialog de Gestión de OC

## Problema Identificado

Veo que los cambios ya están en el código, pero el diálogo sigue mostrando contenido cortado porque:

1. **`overflow-x-hidden` en DialogContent** - Esta clase bloquea cualquier scroll horizontal, anulando el `overflow-x-auto` de la tabla interna
2. **Columnas de tabla aún anchas** - Las columnas "P.Unit" y "Subtotal" se salen del viewport

## Solución Propuesta

### Cambio 1: Quitar `overflow-x-hidden` del DialogContent (línea 1625)

Actualmente:
```tsx
<DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden">
```

Cambiar a:
```tsx
<DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
```

Esto permite que el contenedor de la tabla (`overflow-x-auto`) funcione correctamente.

### Cambio 2: Reducir ancho de columnas de tabla (líneas 1750-1755)

Cambiar los anchos fijos a valores más compactos:

| Columna | Antes | Después |
|---------|-------|---------|
| Producto | `min-w-[100px]` | `min-w-[80px]` |
| Cant | `w-12` | `w-10` |
| P.Unit | `w-16` | `w-14` |
| Subtotal | `w-16` | `w-14` |

Y agregar `text-[11px]` para texto más compacto.

### Cambio 3: Formato de moneda más corto

En las celdas de precio, podemos usar un formato más compacto que redondee miles (ej: "$403,200" en vez de "$403,200.00").

## Archivos a Modificar

| Archivo | Línea | Cambio |
|---------|-------|--------|
| `src/components/compras/OrdenAccionesDialog.tsx` | 1625 | Quitar `overflow-x-hidden` |
| `src/components/compras/OrdenAccionesDialog.tsx` | 1750-1766 | Reducir anchos de columnas y tamaño de texto |

## Resultado Esperado

La tabla de productos será más compacta y cabrá en el viewport móvil. Si aún no cabe, el usuario podrá hacer scroll horizontal dentro de la tabla.
