

## Plan: Add credit usage progress bar to "Crédito Disponible" card

**Single file edit**: `src/pages/PortalCliente.tsx`

1. **Import** `Progress` from `@/components/ui/progress` (top of file).

2. **Replace lines 261-268** (the `<CardContent>` of "Crédito Disponible") to add after the existing `<p>`:
   - Calculate `porcentajeUsado = (saldo_pendiente / limite_credito) * 100`
   - Conditionally render (only if `limite_credito > 0`):
     - `<Progress>` with dynamic indicator color class: green (`[&>div]:bg-green-500`) if < 70%, yellow if 70-90%, red if > 90%
     - `<p className="text-xs text-muted-foreground">{porcentajeUsado.toFixed(0)}% utilizado</p>`

All other code remains untouched.

