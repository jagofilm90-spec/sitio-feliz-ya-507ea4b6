

## Plan: Productos Module Overhaul

8 fixes across ~4 files. No DB changes needed — all columns already exist.

---

### FIX 1 — Route Protection

**File: `src/App.tsx` (line 130)**
- Change `allowedRoles` from `['admin', 'secretaria', 'vendedor', 'contadora']` to `['admin', 'secretaria', 'contadora']` (remove `vendedor`).

---

### FIX 2+3+4+6 — Form Overhaul in Productos.tsx

**File: `src/pages/Productos.tsx`**

**FormData state** — Add missing fields:
- `precio_venta`, `precio_por_kilo`, `descuento_maximo`, `es_promocion`, `descripcion_promocion`, `bloqueado_venta`

**handleEdit** — Load these fields from product.

**handleSave** — Include all new fields in `productData`. Add validations:
- `precio_venta` required, > 0
- If `precio_por_kilo && !peso_kg` → error
- `descuento_maximo < precio_venta`
- `stock_minimo >= 0`
- Check unique `codigo` before save (query DB)

**handleDelete** — Replace `.delete()` with `.update({ activo: false })`. Replace `confirm()` with `AlertDialog` ("¿Desactivar [nombre]?"). Add `handleReactivate` for inactive tab (`.update({ activo: true })`).

**Form JSX** — Reorganize into sections:

1. **Existing fields** (código, unidad, nombre, marca, etc.) — keep as-is.

2. **New section "Precios y Ventas"** after marca/categoría row:
   - `precio_por_kilo` Switch with conditional explanation text
   - `precio_venta` Input with `$` prefix, label changes based on toggle
   - Preview: if `precio_por_kilo`, show calculated unit-equivalent price
   - Warning if `precio_venta < precio_compra` (yellow, non-blocking)
   - `descuento_maximo` Input with `$` prefix and contextual tooltip
   - `contenido_empaque` and `piezas_por_unidad` inputs

3. **Collapsible "Facturación SAT"**: `unidad_sat` Select (from UNIDADES_SAT) + `codigo_sat`

4. **Collapsible "Promoción"**: `es_promocion` Switch → conditional `descripcion_promocion`, `bloqueado_venta` Switch with red badge

**Stock info card** (FIX 6) — When `editingProduct`, show read-only card above form:
- Stock actual, stock status, costo compra, CPP, precio venta, margen %
- If `precio_por_kilo`: show price/kg → price/unit calculation, total kg in stock

**resetForm** — Reset all new fields.

---

### FIX 5 — Mobile Card View

**New file: `src/components/productos/ProductoCardMobile.tsx`**

Card component showing:
- Code badge + bold name
- Brand + specs in gray
- Price display: `$X/kg • Ykg/unidad` with blue "Por kilo" badge, or `$X/unidad`
- Stock with color coding (red ≤ min, green > min)
- IVA/IEPS/Promo badges
- Edit + Deactivate/Reactivate buttons

**Edit `src/pages/Productos.tsx`**:
- Import `useIsMobile` from `@/hooks/use-mobile`
- Import `ProductoCardMobile`
- Desktop: existing table
- Mobile: grid of `ProductoCardMobile` cards

---

### FIX 7 — Ahorro Descuentos Bug

**File: `src/components/vendedor/VendedorNuevoPedidoTab.tsx` (line 680)**

Change:
```ts
ahorroDescuentos += l.descuento * l.cantidad;
```
To:
```ts
if (l.producto.precio_por_kilo && l.producto.peso_kg) {
  ahorroDescuentos += l.descuento * l.cantidad * l.producto.peso_kg;
} else {
  ahorroDescuentos += l.descuento * l.cantidad;
}
```

---

### FIX 8 — Advanced Filters

**In `src/pages/Productos.tsx`**:

Add filter state variables: `filterMarca`, `filterCategoria`, `filterImpuestos`, `filterTipoPrecio`, `filterStock`.

Desktop: inline row of Select dropdowns below search bar.
Mobile: "Filtros" button opening a Sheet with same filters.

Show counter: "Mostrando X de Y productos" + "Limpiar filtros" button when active.

Update `filteredProductos` to apply all filters.

---

### Technical Summary

**Files created (1):**
- `src/components/productos/ProductoCardMobile.tsx`

**Files modified (3):**
- `src/App.tsx` — route protection change
- `src/pages/Productos.tsx` — form fields, validations, soft delete, filters, mobile view, stock info card
- `src/components/vendedor/VendedorNuevoPedidoTab.tsx` — ahorro descuentos bug fix

**Imports added to Productos.tsx:**
- `Switch` from shadcn, `AlertDialog` components, `useIsMobile`, `formatCurrency` from `@/lib/utils`, `Collapsible` components, `RotateCcw` icon, `Sheet` components, `ProductoCardMobile`

**No DB migrations needed** — all columns (`precio_venta`, `precio_por_kilo`, `descuento_maximo`, `es_promocion`, `descripcion_promocion`, `bloqueado_venta`) already exist in the `productos` table.

