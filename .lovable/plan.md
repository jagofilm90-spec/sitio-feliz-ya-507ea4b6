

## Plan: Ajustes al módulo de Productos y PDFs

### CAMBIO 1 — Unidades del catálogo

**Files: `src/lib/productUtils.ts`, `src/pages/Productos.tsx`**

Update `UNIDADES_PRODUCTO` in `productUtils.ts` to remove `costal`, `kg`, `litro`:
```typescript
export const UNIDADES_PRODUCTO = [
  { value: 'bulto',  label: 'Bulto'   },
  { value: 'balon',  label: 'Balón'   },
  { value: 'caja',   label: 'Caja'    },
  { value: 'cubeta', label: 'Cubeta'  },
  { value: 'pieza',  label: 'Pieza'   },
  { value: 'churla', label: 'Churla'  },
] as const;
```

In `Productos.tsx`, the Select for `unidad` already uses `UNIDADES_PRODUCTO` — it will automatically reflect the change. For products with legacy `unidad` values (e.g. "costal"), they display correctly in the table/form since the value is read from DB. The Select won't offer "costal" for new products but will show it if editing an existing product with that value — we'll add a fallback `SelectItem` when `editingProduct?.unidad` is not in the new list.

Update the `formData.unidad` type to remove `costal`, `kg`, `litro` from the union.

---

### CAMBIO 2 — Tabla compacta con table-layout fixed

**File: `src/pages/Productos.tsx`** (lines 1339-1432)

Replace the current table with a fixed-layout table:
- Add `style={{ tableLayout: 'fixed' }}` to `<Table>`
- Set column widths via `<colgroup>`:
  - Código: 90px
  - Nombre+Marca: auto (fills remaining)
  - Unidad: 70px
  - Tipo: 70px
  - Precio: 110px
  - Stock: 70px
  - Impuestos: 70px
  - Acciones: 80px
- Remove the "Estado" column (8 → 8 columns, saves space)
- Move status badges into the Nombre+Marca cell as inline badges after the name
- Truncate long names with `truncate` class
- Reduce padding on cells: `px-2 py-1.5` instead of `p-4`

---

### CAMBIO 3 — PDF Pedido: 6 columnas

**File: `src/components/pedidos/PedidoPrintTemplate.tsx`**

Update `ProductoPedido` interface to add `unidad: string` field.

Redesign the product table to 6 columns with percentage widths:
| CANT. (8%) | UNIDAD (10%) | PESO KG (12%) | DESCRIPCIÓN (38%) | PRECIO (14%) | TOTAL (18%) |

- CANTIDAD: centered
- UNIDAD: centered, capitalize
- PESO TOTAL KG: right-aligned, `cantidad × peso_kg` formatted as "250.00 kg" or "-"
- DESCRIPCIÓN: left-aligned, product name + brand + specs
- PRECIO: right-aligned, show "$13.00/kg" for kilo products, "$325.00" for unit
- TOTAL: right-aligned, bold

Update totals section to include Peso Total row and keep Subtotal/IVA/IEPS/TOTAL with black bg for total row.

Empty rows also need 6 cells.

**Callers to update** (add `unidad` field to product mapping):
- `src/components/vendedor/pedido-wizard/PasoConfirmar.tsx` (line ~121)
- `src/components/vendedor/VendedorNuevoPedidoTab.tsx` (line ~845)
- `src/components/secretaria/ConciliacionMasivaEnvio.tsx` (line ~559 area)
- `src/components/secretaria/ConciliacionDetalleDialog.tsx` (line ~256 area)
- `src/components/vendedor/PedidoPDFPreviewDialog.tsx`

Each needs: `unidad: l.producto.unidad || 'PZA'` (or equivalent) added to the product mapping object.

---

### CAMBIO 4 — Hoja de Carga: 5 columnas sin precio

**File: `src/components/pedidos/HojaCargaUnificadaTemplate.tsx`**

Redesign the product table to 5 columns:
| CANT. (10%) | UNIDAD (10%) | PESO KG (12%) | DESCRIPCIÓN (58%) | ✓ CARGADO (10%) |

- CANTIDAD: centered
- UNIDAD: centered (already in the data)
- PESO TOTAL KG: right-aligned, `pesoTotal` formatted or "-"
- DESCRIPCIÓN: left-aligned
- ✓ CARGADO: empty checkbox cell for physical marking

Add summary row at bottom:
- Peso total (sum of all peso columns)
- Total de unidades (sum of all quantities)

Maintain all existing sections (QR, Pagaré, Firmas, etc.) unchanged.

---

### Summary of files changed

| File | Change |
|------|--------|
| `src/lib/productUtils.ts` | Remove costal/kg/litro from UNIDADES_PRODUCTO |
| `src/pages/Productos.tsx` | Fixed-layout table, legacy unidad fallback, remove Estado column |
| `src/components/pedidos/PedidoPrintTemplate.tsx` | 6-column table with unidad field |
| `src/components/pedidos/HojaCargaUnificadaTemplate.tsx` | 5-column table with ✓ CARGADO |
| `src/components/vendedor/pedido-wizard/PasoConfirmar.tsx` | Add `unidad` to product mapping |
| `src/components/vendedor/VendedorNuevoPedidoTab.tsx` | Add `unidad` to product mapping |
| `src/components/secretaria/ConciliacionMasivaEnvio.tsx` | Add `unidad` to product mapping |
| `src/components/secretaria/ConciliacionDetalleDialog.tsx` | Add `unidad` to product mapping |
| `src/components/vendedor/PedidoPDFPreviewDialog.tsx` | Add `unidad` to product mapping |

No DB changes needed. No existing logic modified.

