# M14 Dashboard Ejecutivo + Reportes Diarios

**Fecha:** 11 de Mayo 2026  
**Estado:** Completo  
**Principio:** "Papá ve TODO sin entrar al sistema"

---

## Qué se construyó

### Migration

`supabase/migrations/20260511080000_m14_dashboard_reportes.sql`

| Tabla | Propósito |
|-------|-----------|
| `reportes_diarios` | Snapshot KPIs por fecha (16+ métricas) |
| `user_dashboard_prefs` | Preferencias notificación por usuario |

### Edge Functions (2)

| Function | Propósito |
|----------|-----------|
| `generar-reporte-diario` | Consolida 22 queries paralelas en 1 snapshot |
| `enviar-reporte-diario` | Email HTML premium vía Gmail API |

### Email HTML Premium

Secciones: Ventas, Operación, Facturación, Cobranza, LA CORONA.
Design system v1.1 (Cormorant Garamond header, JetBrains Mono KPIs, crimson accent).
Alertas destacadas si banderas rojas o discrepancias.

### Dashboard Ejecutivo

`src/pages/DashboardEjecutivo.tsx` — Ruta `/dashboard-ejecutivo` (admin + contadora)

- 4 KPI cards top (ventas día/mes, cartera, pedidos)
- Grid 2x2: Operación, Facturación, LA CORONA, Cobranza
- Tab Histórico con reportes diarios pasados
- Botón "Generar reporte" + "Enviar"
- Refresh 30s automático
- Tabular-nums para todos los montos

### Hooks (6)

`useDashboardEjecutivo`, `useReportesDiarios`, `useGenerarReporte`, `useEnviarReporte`, `useUserDashPrefs`, `useUpdateDashPrefs`

---

## ⚠️ MIGRATION PENDIENTE

```
supabase/migrations/20260511080000_m14_dashboard_reportes.sql
```

---

*M14 — "Papá ve TODO sin entrar al sistema"*
