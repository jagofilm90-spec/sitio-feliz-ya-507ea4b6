
# Plan: Optimizar Columnas del Panel de Adeudos

## Objetivo
Ajustar el ancho de las columnas y compactar la información para que toda la tabla sea visible sin necesidad de hacer scroll horizontal, incluyendo el botón "Pagar".

## Análisis del Estado Actual

La tabla actualmente tiene **9 columnas**:
| Folio | Fecha | Status OC | Status Pago | Total | Pagado | Adeudo | Recepción | Pagar |

**Problemas identificados:**
- Las columnas no tienen anchos definidos, ocupando más espacio del necesario
- Los textos completos ocupan mucho espacio horizontal
- El folio `OC-202601-0002` es largo y no está abreviado

## Cambios Propuestos

### 1. Reducir ancho de columnas con clases CSS

```text
| Columna     | Cambio                                    |
|-------------|-------------------------------------------|
| Folio       | Mostrar solo número (ej: "0002")          |
| Fecha       | Formato corto ya existe (dd/MM/yy) ✓      |
| Status OC   | Ancho fijo: w-20                          |
| Status Pago | Ancho fijo: w-20                          |
| Total       | Ancho fijo: w-24, texto más pequeño       |
| Pagado      | Ancho fijo: w-24, texto más pequeño       |
| Adeudo      | Ancho fijo: w-24                          |
| Recepción   | Ancho fijo: w-20                          |
| Pagar       | Ancho fijo: w-16                          |
```

### 2. Abreviar el folio

Cambiar de `OC-202601-0002` a solo el número: `0002` o `#0002`

### 3. Hacer la tabla responsive

Agregar `table-fixed` y anchos específicos para evitar que la tabla crezca más allá del contenedor.

### 4. Aplicar texto más compacto

Usar `text-xs` en celdas numéricas para reducir espacio.

## Implementación

### Archivo: `src/components/compras/AdeudosProveedoresTab.tsx`

**Cambios en TableHeader (líneas 486-497):**
```typescript
<Table className="table-fixed w-full">
  <TableHeader>
    <TableRow>
      <TableHead className="w-16">Folio</TableHead>
      <TableHead className="w-20">Fecha</TableHead>
      <TableHead className="w-24">Status OC</TableHead>
      <TableHead className="w-24">Status Pago</TableHead>
      <TableHead className="w-24 text-right">Total</TableHead>
      <TableHead className="w-24 text-right">Pagado</TableHead>
      <TableHead className="w-24 text-right">Adeudo</TableHead>
      <TableHead className="w-20">Recep.</TableHead>
      <TableHead className="w-16"></TableHead>
    </TableRow>
  </TableHeader>
```

**Cambios en celdas (aplicar text-xs y truncate):**

1. **Folio** - Extraer solo el número:
```typescript
<TableCell className="font-medium text-xs">
  #{orden.folio.split('-').pop()}
</TableCell>
```

2. **Fecha** - Más compacta:
```typescript
<TableCell className="text-xs">
  {format(new Date(orden.fecha_orden), "dd/MM", { locale: es })}
</TableCell>
```

3. **Columnas numéricas** - Texto más pequeño:
```typescript
<TableCell className="text-right text-xs">
  {formatCurrency(orden.total_ajustado || orden.total)}
</TableCell>
```

4. **Botón Pagar** - Más compacto:
```typescript
<Button size="sm" variant="outline" className="h-7 px-2 text-xs">
  Pagar
</Button>
```

## Resultado Visual Esperado

```text
┌────────┬───────┬──────────┬──────────┬──────────┬──────────┬──────────┬────────┬────────┐
│ Folio  │ Fecha │ Status   │ Status   │    Total │   Pagado │   Adeudo │ Recep. │        │
│        │       │ OC       │ Pago     │          │          │          │        │        │
├────────┼───────┼──────────┼──────────┼──────────┼──────────┼──────────┼────────┼────────┤
│ #0002  │ 21/01 │ Recibida │ Pendiente│ $234,000 │       $0 │ $234,000 │ Ver 2▼ │ [Pagar]│
│ #0012  │ 28/01 │ Enviada  │ Pendiente│ $2.4M    │       $0 │ $2.4M    │   -    │ [Pagar]│
└────────┴───────┴──────────┴──────────┴──────────┴──────────┴──────────┴────────┴────────┘
```

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/components/compras/AdeudosProveedoresTab.tsx` | Anchos fijos en columnas, abreviar folio, texto compacto |

## Beneficios

- **Sin scroll horizontal** - Toda la información visible
- **Mejor legibilidad** - Columnas alineadas consistentemente
- **Responsive** - Se adapta al ancho disponible
- **Botón Pagar siempre visible** - Acceso inmediato a la acción principal
