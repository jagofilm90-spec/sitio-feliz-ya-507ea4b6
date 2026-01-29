

# Plan: Eliminar Columna "Adeudo" Duplicada

## Problema Actual

El adeudo se muestra **3 veces** en la misma vista:

```text
┌─────────────────────────────────────────────────────────────────┐
│ Envolapan                                        $234,756.00    │ ← Adeudo #1
├─────────────────────────────────────────────────────────────────┤
│ Folio │ Fecha │ Status │ Pago │ Total │ Pagado │ Adeudo │ Recep │
│                                                  ^^^^^^         │ ← Adeudo #2
│ #0002 │ 21/01 │ Recib. │ Pend │ $234k │   $0   │ $234k  │ Ver 2▼│ ← Adeudo #3
└─────────────────────────────────────────────────────────────────┘
```

## Solución

Eliminar la columna "Adeudo" de la tabla, ya que:
- El **total del adeudo** ya está en el encabezado del proveedor
- El adeudo por OC se puede inferir de (Total - Pagado)

## Cambios a Realizar

### Archivo: `src/components/compras/AdeudosProveedoresTab.tsx`

**1. Eliminar el TableHead de "Adeudo" (línea 494):**
```diff
- <TableHead className="w-20 text-right">Adeudo</TableHead>
```

**2. Eliminar el TableCell de "Adeudo" (líneas 528-530):**
```diff
- <TableCell className="text-right text-xs font-semibold text-destructive">
-   {formatCurrency(orden.adeudo)}
- </TableCell>
```

## Resultado Final

```text
┌─────────────────────────────────────────────────────────────────┐
│ Envolapan                                        $234,756.00    │ ← Único adeudo mostrado
├─────────────────────────────────────────────────────────────────┤
│ Folio │ Fecha │ Status │ Pago │  Total │ Pagado │ Recep. │      │
│ #0002 │ 21/01 │ Recib. │ Pend │ $234k  │   $0   │ Ver 2▼ │[Pagar]│
└─────────────────────────────────────────────────────────────────┘
```

## Beneficios

- Sin información duplicada
- Más espacio horizontal para las demás columnas
- El botón "Pagar" más accesible
- Interfaz más limpia

