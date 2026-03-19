

## Plan: Mejoras profesionales al módulo de Productos

### Summary
6 targeted fixes to Productos.tsx and productUtils.ts: full-height table without horizontal scroll, add "Paquete" unit, remove fecha_caducidad field from form, restructure Operativo section with collapsible, replace emojis with Lucide icons, and improve Nombre column with 2-line layout.

---

### FIX 1 — Full-height table, no horizontal scroll

**File: `src/pages/Productos.tsx`** (lines 1345-1451)

- Replace `ScrollArea` with a `div` using `overflow-y-auto` and `max-h-[calc(100vh-320px)]`
- Change `<colgroup>` widths from pixel to percentage:
  - Código: 9%, Nombre+marca: 30%, Unidad: 8%, Tipo: 8%, Precio: 13%, Stock: 8%, Imp: 8%, Acciones: 6%
  - Remaining 10% absorbed as auto padding
- Keep `tableLayout: 'fixed'` and `width: '100%'`
- Remove `ScrollArea` import if no longer used elsewhere (check first)

### FIX 2 — Add "Paquete" unit

**File: `src/lib/productUtils.ts`** (line 9-16)

Add `{ value: 'paquete', label: 'Paquete' }` between cubeta and pieza.

**File: `src/pages/Productos.tsx`** (line 220)

Add `'paquete'` to the `unidad` union type.

### FIX 3 — Remove fecha_caducidad_inicial from form

**File: `src/pages/Productos.tsx`** (lines 1053-1076)

Replace the two conditional blocks (create and edit) that show `fecha_caducidad_inicial` input with a single informational note:
```tsx
{formData.maneja_caducidad && (
  <p className="text-xs text-muted-foreground ml-2 p-2 rounded bg-muted">
    Cuando llegue mercancía de este producto, el almacén deberá registrar la fecha de caducidad de cada lote recibido.
  </p>
)}
```

Keep `fecha_caducidad_inicial` in formData state (used during lot creation in handleSave) but don't show the field. The lot creation logic at lines 359-361 and 382-384 stays — it just won't have a value from the form anymore, which is fine (it checks `formData.fecha_caducidad_inicial` and won't set it if empty).

### FIX 4 — Restructure Operativo section

**File: `src/pages/Productos.tsx`** (lines 1079-1168)

Restructure into two sub-sections:

1. **"Proveedor"** — standalone section with proveedor_id Select, sublabel text
2. **"Configuración especial"** — `Collapsible` (defaultOpen only if any toggle is active when editing):
   - requiere_fumigacion Switch + conditional fecha field
   - solo_uso_interno Switch with sublabel
   - bloqueado_venta Switch with sublabel + red bg when active
   - es_promocion Switch + conditional descripcion field
   - Collapsed label: "Sin configuración especial" when nothing active

Remove the `⚙️` emoji from section title. Use `Settings2` icon instead.

### FIX 5 — Replace all emojis with Lucide icons

**File: `src/pages/Productos.tsx`**

| Line | Current | Replacement |
|------|---------|-------------|
| 721 | `📦 Información básica` | `<Package className="h-4 w-4 text-muted-foreground inline" /> Información básica` |
| 861 | `💰 Presentación y precio` | `<Tag className="h-4 w-4 text-muted-foreground inline" /> Presentación y precio` |
| 1005 | `📊 Inventario` | `<Package className="h-4 w-4 text-muted-foreground inline" /> Inventario` (use `BarChart3` or `Boxes`) |
| 1176 | `🏛️ Datos fiscales (CFDI)` | `<FileText className="h-4 w-4 text-muted-foreground inline" /> Datos fiscales (CFDI)` |

Add imports: `Tag, Settings2, FileText, Boxes` from lucide-react.

Also remove emoji from warning messages (lines 749 `💡`, 791 `⚠️`, 856 `❌`, 941 `❌`, 993 `⚠️`, 998 `❌`) — replace with nothing or small Lucide icons inline.

### FIX 6 — Improve Nombre column in table

**File: `src/pages/Productos.tsx`** (lines 1383-1393)

Replace the current 2-line layout with:
- **Line 1** (font-medium): `producto.nombre`
- **Line 2** (text-xs text-muted-foreground): Build from `[marca] · [especificaciones] · [contenido_empaque]`, joined with ` · `, filtering out empty values

Example output: `"Potrero · 25kg"` or `"Bones · 18kg (6×3kg)"`

---

### Files changed

| File | Changes |
|------|---------|
| `src/lib/productUtils.ts` | Add 'paquete' to UNIDADES_PRODUCTO |
| `src/pages/Productos.tsx` | All 6 fixes: table layout, unit type, form sections, icons, nombre column |

No DB changes. No logic changes. All existing validation, auto-suggest, duplicate detection, and save logic preserved.

