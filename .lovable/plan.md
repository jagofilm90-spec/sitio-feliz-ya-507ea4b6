

## Plan: Connect Purchases to Pricing Module + Cost Notification System

7 steps across ~6 files. One DB migration for the new table.

---

### STEP 1 — Create `productos_revision_precio` table

**Migration SQL:**
- Create table with all specified columns: `id`, `producto_id`, `costo_anterior`, `costo_nuevo`, `precio_venta_actual`, `precio_venta_sugerido`, `margen_actual_porcentaje`, `margen_sugerido_porcentaje`, `ajuste_aplicado`, `pendiente_ajuste`, `status`, `notas`, `creado_por`, `resuelto_por`, `created_at`, `resuelto_at`
- Enable RLS with policies for admin/secretaria to select/insert/update
- No realtime needed

---

### STEP 2 — Connect AjustarCostosOCDialog to price reviews

**File: `src/components/compras/AjustarCostosOCDialog.tsx`**

After the existing cost adjustment logic (after `ajustar_costos_oc` RPC call), add:

1. For each product where `precio_editado > precio_actual` (cost increased):
   - Fetch current `precio_venta` from `productos` table
   - Calculate `margen_actual = (precio_venta - costo_anterior) / costo_anterior * 100`
   - Calculate `precio_sugerido = costo_nuevo * (1 + margen_actual / 100)`
   - Calculate `pendiente = precio_sugerido - precio_venta`
   - Insert into `productos_revision_precio`

2. Create in-app notification with type `revision_precio_requerida`

3. Send push notification to admin roles via `send-push-notification` edge function

All added inside the existing `ajustarCostosMutation.mutationFn`, after the historial insert loop.

---

### STEP 3 — Price review panel in AdminListaPreciosTab

**File: `src/components/admin/AdminListaPreciosTab.tsx`**

Add a new section above the existing table (both mobile and desktop views) that only renders when there are pending reviews:

1. **Query**: `productos_revision_precio` WHERE `status IN ('pendiente', 'parcial')`, joined with `productos` for name/code
2. **UI**: Collapsible alert banner showing count + expandable list of products
3. Each product card shows:
   - Cost change (old → new)
   - Current price, suggested price, pending adjustment
   - Editable margin % input (pre-filled with current margin)
   - Calculated price preview in real-time
   - Editable descuento_maximo
4. Three action buttons per product:
   - **"Aplicar completo"**: Updates `productos.precio_venta` to suggested, marks review as `completado`, inserts `productos_historial_precios`
   - **"Aplicar parcial"**: Opens input for custom price, updates producto, marks as `parcial` with remaining `pendiente_ajuste`
   - **"Después"**: Sets `status = 'ignorado'`, hidden for 24h via localStorage dismiss pattern (already used in CentroNotificaciones)

---

### STEP 4 — Enhanced simulator with "Aplicar" button

**File: `src/components/admin/AdminListaPreciosTab.tsx`** (simulador dialog, lines 681-790)

Enhance the existing simulator dialog:

1. Add editable "Margen deseado %" input (pre-filled from current margin)
2. Add editable "Descuento máximo $" input
3. Add comparison table: Actual vs Propuesto (precio venta, descuento, precio lista, margen %, ganancia/unidad)
4. Add **"Aplicar este precio"** button that:
   - Calls `updatePriceMutation` with the proposed price and discount
   - Inserts into `productos_historial_precios` for audit trail
   - Closes the simulator dialog
   - Shows success toast

---

### STEP 5 — Dashboard alert for pending price reviews

**File: `src/components/dashboard/useDashboardData.ts`**
- Add `preciosRevisionPendientes` to `DashboardKPIs` interface
- Add query: `SELECT count(*) FROM productos_revision_precio WHERE status IN ('pendiente', 'parcial')`
- Include in the `Promise.all` batch

**File: `src/components/dashboard/AlertasUrgentes.tsx`**
- Add `precios_por_revisar` to alert type union
- Add icon (`TrendingUp`) and color mapping (orange)
- Add label: "Precios por revisar" with button "Revisar ahora" → `/precios`

---

### STEP 6 — Read orphan notification types in CentroNotificaciones

**File: `src/hooks/useNotificaciones.ts`**
- Add new interface `NotificacionPrecio` and `NotificacionGeneral`
- Add `cargarNotificacionesPrecio()`: queries `notificaciones` WHERE `tipo IN ('revision_precio_requerida', 'costo_incrementado')` AND `leida = false`, admin-only
- Add `cargarNotificacionesPedidos()`: queries `notificaciones` WHERE `tipo = 'nuevo_pedido_vendedor'` AND `leida = false`, admin+secretaria
- Add both to `NotificacionesData` interface and `cargarNotificaciones()` Promise.all
- Update `totalCount` calculation

**File: `src/components/CentroNotificaciones.tsx`**
- Add sections for price notifications (orange background) with click → `/precios`
- Add section for new order notifications with click → `/pedidos`
- Include in `computedCount`

---

### STEP 7 — Bulk price update

**File: `src/components/admin/AdminListaPreciosTab.tsx`**

Add "Actualizar en masa" button in the header that opens a Sheet:

1. **Option A — By margin %**: Select category/brand filter, input target margin %, input descuento máximo, "Calcular" → preview table, "Aplicar a todos"
2. **Option B — By price increment**: Select category/brand, input $ or % increase, preview, "Aplicar"

Both options:
- Show preview table (product, current price, new price, change %) before applying
- On apply: batch update `productos.precio_venta`, insert `productos_historial_precios` per product
- Toast: "X productos actualizados"

---

### Technical Summary

**Migration (1):** Create `productos_revision_precio` table + RLS

**Files modified (4):**
- `src/components/compras/AjustarCostosOCDialog.tsx` — insert price reviews + notifications on cost increase
- `src/components/admin/AdminListaPreciosTab.tsx` — review panel, enhanced simulator, bulk update
- `src/components/dashboard/useDashboardData.ts` + `AlertasUrgentes.tsx` — new alert type
- `src/hooks/useNotificaciones.ts` + `src/components/CentroNotificaciones.tsx` — orphan notification types

**No existing functionality removed.** All additions are additive.

