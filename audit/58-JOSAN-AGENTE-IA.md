# JOSAN Agente IA — Principio Biblia #12 AI-FIRST

**Fecha:** 11 de Mayo 2026  
**Estado:** Completo  
**Principio:** "Todo conversable sin navegar 50 menús"

---

## Arquitectura

```
Usuario pregunta → Edge function chat-josan
  → Claude API (tool_use loop)
  → 10 tools → Supabase queries → 136 tablas
  → Claude formula respuesta → UI
```

Model: `claude-sonnet-4-20250514`

## 10 Tools Enterprise

| Tool | Propósito |
|------|-----------|
| get_ventas | Ventas hoy/mes/YTD |
| get_top_clientes | Por ventas o cartera vencida |
| get_pedidos_pendientes | Sin surtir / en tránsito |
| get_alertas_criticas | LA CORONA activas |
| get_score_empleados | Banderas rojas |
| get_inventario_bajo | Bajo mínimo |
| get_cobros_pendientes | Aging cartera |
| get_dashboard_resumen | Resumen ejecutivo completo |
| buscar_cliente | Por nombre/RFC |
| get_top_productos | Más vendidos |

## Frontend

| Archivo | Propósito |
|---------|-----------|
| `/josan` página fullscreen | Chat + sidebar conversaciones + sugerencias |
| `JosanFloatingWidget` | FAB crimson bottom-right (admin only) |
| `useJosan` hooks | 4 hooks (enviar, conversaciones, chat state) |

## Migration

`supabase/migrations/20260511120000_josan_agente_ia.sql`
- `josan_conversaciones` (historial + tools usados)
- RLS: usuario solo ve sus conversaciones, admin ve todas

---

## ⚠️ MIGRATION PENDIENTE

```
supabase/migrations/20260511120000_josan_agente_ia.sql
```

---

*JOSAN — Ningún ERP wholesale mexicano tiene chat IA. SAP no. NetSuite no. Aspel no.*
