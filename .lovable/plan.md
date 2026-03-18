

## Plan: Dashboard Ejecutivo Complete Overhaul

This is a large overhaul touching ~12 files. I'll break it into logical implementation steps.

---

### Step 1: Create shared dashboard utilities

**New file: `src/components/dashboard/useDashboardData.ts`**
- Custom hook that centralizes all dashboard data fetching
- Accepts a `periodo` parameter (hoy/semana/mes/anio)
- Auto-refreshes every 60 seconds via `setInterval`
- Returns all KPI data, alerts, top products, top clients, financial summary
- Single set of optimized queries instead of each component querying independently
- Exposes a `refresh()` function for manual refresh button

**Key queries consolidated:**
- Ventas del dia/mes/mes anterior (for % variation)
- Pedidos en_ruta, entregas completadas/pendientes hoy, pedidos por surtir
- Credito excedido count, stock bajo count, pedidos sin autorizar >24h, facturas vencen esta semana
- Top 10 productos (pedidos_detalles JOIN productos, grouped)
- Top 10 clientes (pedidos grouped by cliente)
- Financial summary (ticket promedio, clientes nuevos, clientes inactivos, tasa entregas)

### Step 2: Rewrite KPICards with 3 rows + clickable + auto-refresh

**Edit: `src/components/dashboard/KPICards.tsx`**
- Accept `data` and `loading` as props from parent (from useDashboardData hook)
- Remove local `formatCurrency`, import from `@/lib/utils`
- 3 labeled sections: "Dinero", "Operacion de Hoy", "Alertas"
- Each card: clickable (wraps in div with `onClick` + `cursor-pointer`), navigates to corresponding module
- Grid: `grid-cols-2 lg:grid-cols-4` per row
- Alert row cards: conditional red/orange/yellow coloring when value > 0
- New KPIs added: ventas del dia, % variacion mes, pedidos en calle, entregas completadas hoy, entregas pendientes, pedidos por surtir, pedidos sin autorizar >24h, facturas vencen esta semana

**Navigation mapping:**
- Ventas dia/mes → `/pedidos`
- Por cobrar / Vencido → `/facturas`
- Pedidos en calle → `/rutas?tab=monitoreo`
- Entregas completadas/pendientes → `/rutas`
- Pedidos por surtir → `/almacen-tablet`
- Credito excedido → `/clientes`
- Stock bajo → `/inventario`
- Pedidos sin autorizar → `/pedidos?tab=por-autorizar`
- Facturas por vencer → `/facturas`

### Step 3: Create AlertasUrgentes component

**New file: `src/components/dashboard/AlertasUrgentes.tsx`**
- Receives alert data from parent hook
- Conditionally renders only if there are urgent items
- Horizontal badges/chips layout on desktop, stacked on mobile
- Each alert: icon + count + action button
- 4 alert types: pedidos sin autorizar >24h, choferes sin GPS >30min, productos stock=0, credito excedido
- Uses existing theme colors (destructive, warning variants)

### Step 4: Show MapaRutasWidget on mobile

**Edit: `src/pages/Dashboard.tsx`**
- Remove `{!isMobile && ...}` condition from MapaRutasWidget
- On mobile, the existing fallback list in MapaRutasWidget already renders when map can't load
- Add a simplified mobile-specific rendering path inside MapaRutasWidget that shows a list of chofers with status + last GPS update time + red alert if >30 min stale

**Edit: `src/components/dashboard/MapaRutasWidget.tsx`**
- Accept `isMobile` prop
- When mobile: render list view (driver name, status badge, "last update X min ago", red highlight if stale >30 min)
- When desktop: existing map behavior unchanged

### Step 5: Improve VendedoresResumen

**Edit: `src/components/dashboard/VendedoresResumen.tsx`**
- Fix N+1 query: single query fetching empleados + pedidos aggregated via two queries max (not per-vendedor)
- Add medal emojis for top 3
- Make each vendedor row clickable (navigate to `/empleados?id=...` or similar)
- Remove local `formatCurrency`, import from `@/lib/utils`
- Keep existing progress bar and layout

### Step 6: Create TopProductosClientes component

**New file: `src/components/dashboard/TopProductosClientesPanel.tsx`**
- Two cards side by side (stacked on mobile)
- Top 10 Productos: position, name, qty sold, total amount. Show first 5, "ver mas" expands
- Top 10 Clientes: position, name, total $, # pedidos. Show first 5, "ver mas" expands
- Data comes from useDashboardData hook
- Uses Collapsible or simple state toggle for expand

### Step 7: Create ResumenFinanciero component

**New file: `src/components/dashboard/ResumenFinancieroPanel.tsx`**
- 4 mini-stats in a single card: ticket promedio, clientes nuevos mes, clientes inactivos (30d), tasa entregas %
- Data from useDashboardData hook
- Simple grid of 4 stat boxes inside one card

### Step 8: Add period selector + refresh button + assemble Dashboard

**Edit: `src/pages/Dashboard.tsx`**
- Add period selector (Hoy/Semana/Mes/Anio) as Tabs or ToggleGroup at top
- Add RefreshCw button next to title (visible on all devices, prominent on mobile)
- Wire useDashboardData hook with selected period
- Insert AlertasUrgentes after NotificacionesSistema
- Keep existing component order, add new sections:
  - After VentasMensualesChart + CobranzaCriticaPanel row: TopProductosClientesPanel
  - After that: ResumenFinancieroPanel
  - Bottom row (CreditoExcedido, Vendedores, Entregas, Inventario): make each card clickable via wrapper
- Mobile: reduce padding with `p-2` on outer container
- Keep UsuariosConectadosPanel desktop-only as it already is

### Step 9: Remove duplicate formatCurrency

**Edit 6 files** in `src/components/dashboard/`:
- KPICards, VentasMensualesChart, InventarioResumen, VendedoresResumen, CreditoExcedidoAlert, CobranzaCriticaPanel
- Remove local `formatCurrency` definitions
- Import `formatCurrency` from `@/lib/utils` (already exists there)
- Note: the utils version outputs `$1,234.00` format which is the Mexican format requested

---

### Technical Details

**Files created (4):**
- `src/components/dashboard/useDashboardData.ts`
- `src/components/dashboard/AlertasUrgentes.tsx`
- `src/components/dashboard/TopProductosClientesPanel.tsx`
- `src/components/dashboard/ResumenFinancieroPanel.tsx`

**Files modified (8):**
- `src/pages/Dashboard.tsx` — layout, period selector, refresh, new sections
- `src/components/dashboard/KPICards.tsx` — 3 rows, clickable, props-based
- `src/components/dashboard/MapaRutasWidget.tsx` — mobile list view
- `src/components/dashboard/VendedoresResumen.tsx` — fix N+1, medals, clickable
- `src/components/dashboard/VentasMensualesChart.tsx` — remove local formatCurrency
- `src/components/dashboard/InventarioResumen.tsx` — remove local formatCurrency
- `src/components/dashboard/CreditoExcedidoAlert.tsx` — remove local formatCurrency
- `src/components/dashboard/CobranzaCriticaPanel.tsx` — remove local formatCurrency

**No database changes needed** — all data already exists in current tables.

**Auto-refresh**: 60-second `setInterval` in `useDashboardData` hook, cleared on unmount.

**Mobile parity**: All new sections render responsively. KPIs use `grid-cols-2` on mobile. New panels stack vertically. Map shows list view.

