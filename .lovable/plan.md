

## Plan: Rediseño completo del módulo de Productos

### Overview
Rewrite `src/pages/Productos.tsx` and `src/components/productos/ProductoCardMobile.tsx` with reorganized form sections, improved table columns, column sorting, role-based cost visibility, and all checkboxes replaced with Switch components. All existing logic (auto-suggest, duplicates, validations, soft delete, filters) is preserved.

---

### File 1: `src/pages/Productos.tsx` (rewrite ~1535 lines)

**Imports to add:** `useUserRoles` from `@/hooks/useUserRoles`, `Tooltip/TooltipTrigger/TooltipContent/TooltipProvider` from `@/components/ui/tooltip`, `ArrowUpDown` from lucide.

**New state:** `sortColumn` and `sortDirection` for column sorting.

**Role-based visibility:**
```typescript
const { isAdmin, isSecretaria, isContadora } = useUserRoles();
const canSeeCosts = isAdmin || isSecretaria || isContadora;
```

**Form reorganization** (inside DialogContent):

1. **Stock info card** (editing only) — moved BEFORE form, cost lines only if `canSeeCosts`
2. **Section 1 "Información básica"** — nombre (first, full width), codigo, marca, categoria (2-col grid with datalists preserved)
3. **Section 2 "Presentación y precio"** — Row 1: unidad + peso_kg + contenido_empaque (3-col). Row 2: precio_por_kilo Switch with blue explainer card. Row 3: precio_venta + descuento_maximo (2-col) with unit-equivalent preview and real-time validation warnings. Inline error for peso_kg=0 when por_kilo.
4. **Section 3 "Inventario"** — stock_minimo, stock_inicial, maneja_caducidad Switch + conditional fecha_caducidad_inicial
5. **Section 4 "Operativo"** — proveedor_id Select (visible in create AND edit), requiere_fumigacion Switch + conditional fecha, solo_uso_interno Switch, bloqueado_venta Switch (red when active), es_promocion Switch + conditional descripcion_promocion
6. **Section 5 "Fiscal" (Collapsible, closed by default)** — title "Datos fiscales (CFDI)", sublabel. Contains: aplica_iva Switch, aplica_ieps Switch, codigo_sat, unidad_sat Select, piezas_por_unidad
7. **activo toggle** — moved to bottom, small and discrete

All `<input type="checkbox">` replaced with `<Switch>` from shadcn/ui.

**Table redesign** (desktop, 9 columns):
| Código | Nombre + Marca | Unidad | Tipo | Precio | Stock | IVA/IEPS | Estado | Acciones |

- **Tipo**: Blue badge "/kilo" or gray badge "/unidad"
- **Precio**: Bold `$X/kg` + gray `= $Y/unidad` below for kilo products
- **Stock**: Green if > min, red if ≤ min, "Sin stock" badge if 0
- **Estado**: Green "Activo", red "Bloqueado", purple "Promo", amber "Interno"
- **Sortable headers**: Código, Nombre, Precio, Stock — click toggles asc/desc with ArrowUpDown icon

**Filter enhancement**: Add "Estado" filter (Todos/Activo/Bloqueado/Promoción/Interno) to existing filter set.

**Sorting logic**: Applied to `filteredProductos` before render based on `sortColumn`/`sortDirection`.

---

### File 2: `src/components/productos/ProductoCardMobile.tsx` (update)

Enhance card layout per spec:
- Line 1: `[CODE] Name Brand`
- Line 2: `Unidad · Peso · Tipo badge`
- Line 3: Price with kilo equivalent `$13.00/kg = $325.00/costal`
- Line 4: `Stock: 47 ✅  Mín: 10` with color coding
- Line 5: Tax/status badges
- Line 6: Action buttons

Add `stock_minimo` display. Show unit-equivalent price for kilo products.

---

### Technical notes
- No DB migration needed — all fields already exist
- `precio_compra` field removed from form (auto-updated from Compras); cost info card controlled by `canSeeCosts`
- `proveedor_id` now visible in both create and edit modes
- All existing validation logic, auto-suggest, duplicate detection, soft delete with AlertDialog preserved exactly as-is
- Dark mode maintained via existing Tailwind dark: classes
- Mobile/desktop parity enforced

