

# Plan: Fix Folio Search and Remove Auto-Navigate on QR Scan

## Issues

1. **Folio partial match**: The input hardcodes prefix `PED-V-` and only accepts numbers. When searching, it does an exact match (`eq("folio", ...)`). If the user types only the last 4 digits, it fails. Need to support partial/suffix matching using `ilike`.

2. **Auto-navigate to loading sheet**: Lines 99-107 have a `useEffect` that auto-proceeds to create the route and go to "hoja_carga" after 800ms when exactly 1 pedido is scanned. This must be removed so the user can scan multiple pedidos before choosing to proceed.

## Changes (single file)

**`src/components/almacen/CargaRutaInlineFlow.tsx`**

### Fix 1: Remove auto-proceed effect
- Delete the `useEffect` at lines 99-107 that calls `handleCrearRutaYCargar()` when `cola.length === 1`

### Fix 2: Support partial folio matching
- Change the manual input search logic (lines 165-187) to use `ilike` with suffix matching when the input is just digits (e.g., `%1234` matches `PED-V-1234`)
- Also remove the hardcoded `PED-V-` prefix from the input UI (lines 571, 583, 587) — instead accept any text and try matching flexibly
- When multiple results match, show an error asking for more digits

### Fix 3: Update button label
- The "Empezar a Cargar" button (line 643-650) text is fine as-is — it already says "Empezar a Cargar (N pedidos)" which serves as the "ir a carga" action

