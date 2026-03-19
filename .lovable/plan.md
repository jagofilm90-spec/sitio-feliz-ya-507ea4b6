

## Analysis

After searching the file thoroughly:

1. **CAMBIO 1 (ScrollArea height)**: There is no `<ScrollArea className="h-[calc(100vh-420px)]">` in the file. The only `100vh` reference is on line 506: `<div className="flex flex-col h-[calc(100vh-4rem-3rem)]">` which is the outer container, not a ScrollArea. This change cannot be applied as described — the line doesn't exist.

2. **CAMBIO 2 (Remove fecha_caducidad blocks)**: The two UI blocks for `fecha_caducidad_inicial` inputs (BLOQUE A and BLOQUE B) **do not exist** in the current file — they were already removed in the previous rewrite.

   However, the **informational note** that should appear when `maneja_caducidad` is active ("El almacén registrará la fecha de caducidad de cada lote al recibir la mercancía") is **not present** in its styled `<p>` form. The current code has the text inline as a sublabel inside the switch row (line 825), but not as a separate highlighted box below the switch.

### Plan

**Single change**: After line 831 (closing `</div>` of the caducidad switch block), insert the styled informational note:

```tsx
{formData.maneja_caducidad && (
  <p className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/30 p-2 rounded border border-blue-200 dark:border-blue-800">
    El almacén registrará la fecha de caducidad de cada lote al recibir la mercancía.
  </p>
)}
```

**No other changes** — the ScrollArea line doesn't exist in the file, and the fecha_caducidad blocks were already removed.

### Files modified
- `src/pages/Productos.tsx` — 1 insertion (4 lines after line 831)

