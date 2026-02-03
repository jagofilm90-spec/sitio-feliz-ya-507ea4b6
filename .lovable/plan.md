
# Plan: Corregir Overflow Horizontal en Dialog de Gestión de OC

## Problemas Identificados en el Screenshot

1. **Header cortado**: El título con badges ("Enviada", botón "Cont...") se desborda hacia la derecha
2. **Tabla de productos cortada**: Las columnas "P.Unit" y "Subtotal" se salen del viewport
3. **ScrollArea solo vertical**: La tabla necesita scroll horizontal en móvil

## Solución Propuesta

### Cambios en `OrdenAccionesDialog.tsx`

**1. Reestructurar el DialogHeader para móvil (líneas 1627-1651)**

Cambiar el layout del título para que los badges se apilen debajo del folio en pantallas pequeñas:

```tsx
<DialogTitle className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 pr-8">
  <span className="flex items-center gap-2 flex-wrap">
    Gestionar Orden {orden?.folio}
    {getStatusBadge()}
  </span>
  <div className="flex items-center gap-2 flex-wrap">
    {!proveedorTieneEmail && (
      <Badge variant="outline" className="text-muted-foreground text-[10px]">
        Sin correo
      </Badge>
    )}
    {/* ... badges de "Leído", "Control interno", etc. */}
  </div>
</DialogTitle>
```

El `pr-8` deja espacio para el botón X de cerrar.

**2. Envolver la tabla en contenedor con scroll horizontal (líneas 1746-1771)**

```tsx
{/* Tabla de productos - scrollable en ambos ejes */}
{orden?.ordenes_compra_detalles && orden.ordenes_compra_detalles.length > 0 && (
  <div className="overflow-x-auto">
    <ScrollArea className="max-h-[180px]">
      <Table className="min-w-[350px]">
        <TableHeader>
          <TableRow className="text-xs">
            <TableHead className="py-2 min-w-[120px]">Producto</TableHead>
            <TableHead className="text-center w-14 py-2">Cant</TableHead>
            <TableHead className="text-right w-20 py-2">P.Unit</TableHead>
            <TableHead className="text-right w-20 py-2">Subtotal</TableHead>
          </TableRow>
        </TableHeader>
        ...
      </Table>
    </ScrollArea>
  </div>
)}
```

- `overflow-x-auto` permite scroll horizontal cuando la tabla no cabe
- `min-w-[350px]` en la tabla evita que se comprima demasiado
- Columnas más angostas (`w-14`, `w-20`) en vez de `w-16`, `w-24`

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/components/compras/OrdenAccionesDialog.tsx` | Reestructurar header con stacking en móvil, agregar scroll horizontal a tabla de productos |

## Resultado Visual Esperado

```
┌────────────────────────────────┐
│ Gestionar Orden OC-202601-0005 │ ×
│ [Enviada] [Sin correo]         │
│ [Control interno]              │
├────────────────────────────────┤
│ 📦 Resumen de la Orden         │
│ Proveedor: SAÑUDO...           │
│ Fecha: Por confirmar           │
├────────────────────────────────┤
│ 🚚 Progreso de Entregas        │
│ ┌────────┬────────┐            │
│ │ 3      │ 0      │            │
│ │Sin Fech│Program │            │
│ ├────────┼────────┤            │
│ │ 0      │ 0      │            │
│ │En Desc │Recibid │            │
│ └────────┴────────┘            │
├────────────────────────────────┤
│ Producto  │ Cant │P.Unit│Subt │ ← scroll horizontal
│ Sal Refin │ 1200 │$336  │$403K│
└────────────────────────────────┘
```
