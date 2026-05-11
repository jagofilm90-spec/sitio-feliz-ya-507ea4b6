# M09 Cobranza App — Ciclo completo cartera

**Fecha:** 11 de Mayo 2026  
**Estado:** Completo  
**Cierra ciclo:** Pedido → Hoja Salida → IA → Factura → **COBRO** → REP auto

---

## Arquitectura

```
Vendedor captura cobro (campo)
    ↓
Aplica a N facturas (edge function)
    ↓
Secretaria valida (workflow dual)
    ↓
Si PPD → auto-genera REP pendiente
    ↓
Contadora timbra REP
    ↓
Factura.pagada = true cuando saldo = 0
```

## Migration

**Archivo:** `supabase/migrations/20260511070000_m09_cobranza.sql`

| Tabla | Propósito |
|-------|-----------|
| `cobros` | COB-YYYYMM-NNNN, GPS, foto, workflow estados |
| `cobros_facturas` | 1 cobro → N facturas con parcialidades |
| `rutas_cobranza` | RC-YYYYMM-NNNN, programación por vendedor |
| `rutas_cobranza_clientes` | Clientes asignados con saldo snapshot |
+ `facturas.saldo_pendiente`, `dias_credito`, `pagada_at`

## Edge Functions (3)

| Function | Propósito |
|----------|-----------|
| `aplicar-cobro` | Distribuye monto a facturas, actualiza saldos, detecta PPD→REP |
| `crear-rep-from-cobro` | Auto-genera complemento_pago con DoctoRelacionado |
| `generar-aging-report` | Buckets 0/1-30/31-60/61-90/>90 por cliente |

## Frontend

| Archivo | Propósito |
|---------|-----------|
| `src/pages/Cobranza.tsx` | Dashboard admin: KPIs + Aging Report + Cobros con validación |
| `src/hooks/useCobranza.ts` | 8 hooks: aging, cobros, facturas pendientes, crear/validar/rechazar |

**Nota:** `cobrador` no existe como role en el enum. Vendedores son quienes cobran en campo (misma persona en ALMASA). La app mobile para captura en campo se agregará en fase posterior integrando con VendedorPanel existente.

## Aging Report (NetSuite estándar)

| Columna | Descripción |
|---------|-------------|
| Corriente | No vencido |
| 1-30 | 1 a 30 días vencido |
| 31-60 | 31 a 60 días |
| 61-90 | 61 a 90 días |
| >90 | Más de 90 días (crítico) |
| Total | Suma por cliente |

Footer con totales por bucket.

---

## ⚠️ MIGRATION PENDIENTE

```
supabase/migrations/20260511070000_m09_cobranza.sql
```

---

*M09 Cobranza — Cierra ciclo comercial completo ALMASA-OS*
