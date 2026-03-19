

## Plan: Mejoras de Caducidad y Fumigaciones

### MEJORA 1 — Reporte FEFO en Almacén

**New file: `src/components/almacen/ReporteCaducidadTab.tsx`**

- Query `inventario_lotes` JOIN `productos` LEFT JOIN `bodegas` where `maneja_caducidad=true`, `cantidad_disponible > 0`, `fecha_caducidad IS NOT NULL`, ordered by `fecha_caducidad ASC`
- **Section 1**: 4 summary cards — 🔴 Vencidos (< hoy), 🟠 Críticos (≤7 días), 🟡 Próximos (8-30 días), 🟢 Vigentes (>30 días)
- **Section 2**: Table (desktop) / Cards (mobile) with columns: fecha caducidad + badge color, días restantes, producto (código+nombre), lote, bodega, stock disponible, estado badge
- Row colors: red for vencido, orange ≤7d, yellow 8-30d, normal >30d
- Filters: bodega select, estado select, texto búsqueda producto
- "Exportar a Excel" button using simple CSV download of filtered data
- Uses `useIsMobile` for responsive layout

**Modified: `src/pages/AlmacenTablet.tsx`**
- Import `ReporteCaducidadTab`
- Add `caducidad` case in `renderTabContent`
- Add caducidad stats state (`vencidos`, `criticos`)
- Add stats cards for the `caducidad` tab in `renderStats`

**Modified: `src/components/almacen/AlmacenSidebar.tsx`**
- Add `{ id: "caducidad", label: "Caducidad", icon: Timer }` to `almacenItems` with red badge if vencidos+criticos > 0

**Modified: `src/components/almacen/AlmacenMobileNav.tsx`**
- Add `caducidad` to `secondaryItems`

---

### MEJORA 2 — Push Notifications de Caducidad (Edge Function + Cron)

**New file: `supabase/functions/check-caducidad-fumigacion/index.ts`**

Single edge function handling both caducidad and fumigación checks:

1. **Caducidad check**:
   - Query `inventario_lotes` JOIN `productos` where `fecha_caducidad` between today and today+30, `cantidad_disponible > 0`
   - Group by critical (≤7d) and expired (<today)
   - Check `notificaciones` for duplicates today (same tipo + today's date)
   - If critical: insert `notificaciones` tipo `caducidad_critica` + call `send-push-notification` to roles `['admin', 'almacen', 'gerente_almacen']`
   - If expired: insert `notificaciones` tipo `caducidad_vencida` + push with urgent title

2. **Fumigación check**:
   - Query `productos` where `requiere_fumigacion=true`, `activo=true`, `stock_actual > 0`
   - Categorize: vencida (fecha_ultima_fumigacion + 6mo < today), próxima (within 2 weeks), sin_fecha (null)
   - Duplicate check same as caducidad
   - Vencida: insert notification + push to `['admin', 'almacen', 'gerente_almacen']`
   - Próxima: insert notification + push to `['admin', 'gerente_almacen']`
   - Sin fecha: only in-app notification, tipo `fumigacion_sin_fecha`

**Config**: Add `verify_jwt = false` in `config.toml` for the new function

**Cron job** (via insert tool — NOT migration):
```sql
SELECT cron.schedule(
  'check-caducidad-fumigacion-daily',
  '0 13 * * *',  -- 7am Mexico City (UTC-6)
  $$ SELECT net.http_post(...) $$
);
```

---

### MEJORA 3 — Centro de Notificaciones: Caducidad + Fumigación

**Modified: `src/hooks/useNotificaciones.ts`**
- Add `notificacionesCaducidadCritica: NotificacionGeneral[]` and `notificacionesFumigacion: NotificacionGeneral[]` to `NotificacionesData`
- Add `cargarNotificacionesCaducidad()`: query `notificaciones` where tipo IN (`caducidad_critica`, `caducidad_vencida`), `leida=false`, for roles admin/almacen/gerente_almacen
- Add `cargarNotificacionesFumigacionPush()`: query `notificaciones` where tipo IN (`fumigacion_proxima`, `fumigacion_vencida`, `fumigacion_sin_fecha`), `leida=false`, same roles
- Add both to Promise.all and totalCount

**Modified: `src/components/CentroNotificaciones.tsx`**
- Render `notificacionesCaducidadCritica` section: orange bg for crítica, red for vencida, click → `/almacen-tablet` (sets caducidad tab)
- Render `notificacionesFumigacion` section: yellow for próxima, red for vencida, click → `/almacen-tablet` (sets fumigaciones tab)
- Use `Timer` icon for caducidad, `Bug` icon for fumigación

---

### MEJORA 4 — Dashboard: Alertas de Caducidad y Fumigación

**Modified: `src/components/dashboard/useDashboardData.ts`**
- Add 2 new queries to the Promise.all batch:
  - `inventario_lotes` count where `fecha_caducidad < today` AND `cantidad_disponible > 0` (join productos where maneja_caducidad=true)
  - `productos` count where `requiere_fumigacion=true` AND `activo=true` AND (`fecha_ultima_fumigacion IS NULL` OR `fecha_ultima_fumigacion + 6mo < today`)
- Add `lotesVencidos` and `fumigacionesVencidas` to `DashboardKPIs`
- Push new `AlertaUrgente` entries if counts > 0

**Modified: `src/components/dashboard/AlertasUrgentes.tsx`**
- Add `lotes_vencidos` and `fumigaciones_vencidas` to `iconMap` (Timer, Bug) and `colorMap` (red)
- Add label text for both new types

---

### Summary of files

| Action | File |
|--------|------|
| Create | `src/components/almacen/ReporteCaducidadTab.tsx` |
| Create | `supabase/functions/check-caducidad-fumigacion/index.ts` |
| Modify | `src/pages/AlmacenTablet.tsx` — add caducidad tab |
| Modify | `src/components/almacen/AlmacenSidebar.tsx` — add nav item |
| Modify | `src/components/almacen/AlmacenMobileNav.tsx` — add nav item |
| Modify | `src/hooks/useNotificaciones.ts` — add caducidad+fumigación types |
| Modify | `src/components/CentroNotificaciones.tsx` — render new types |
| Modify | `src/components/dashboard/useDashboardData.ts` — add KPIs |
| Modify | `src/components/dashboard/AlertasUrgentes.tsx` — add alert types |
| Data op | Cron job schedule via insert tool |

No existing functionality is removed. All changes are additive.

