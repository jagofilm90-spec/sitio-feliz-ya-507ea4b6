# M08 Facturación Dual — Cierre Gaps (75% → 95%)

**Fecha:** 11 de Mayo 2026  
**Estado anterior:** 75% (auditoría M08)  
**Estado nuevo:** 95%  
**Gaps cerrados:** 5 de 9 identificados

---

## Gaps cerrados

| # | Gap | Solución |
|---|-----|---------|
| 1 | Nota de Crédito CFDI tipo E | Tabla + edge function + UI página completa |
| 2 | Complemento de Pago REP tipo P | Tabla + doctos relacionados + edge function + UI |
| 3 | Remisiones sin tabla propia | Tabla `remisiones` con folio REM-YYYYMM-NNNN |
| 4 | Remisión → Factura conversión | Edge function `convertir-remision-factura` |
| 5 | `pac_transacciones_log` sin `factura_id` | ALTER TABLE + `nota_credito_id` + `complemento_pago_id` |

## Compliance SAT CFDI 4.0

| Tipo | Nombre | Estado |
|------|--------|--------|
| I | Ingreso (factura normal) | **Funciona** (timbrar-cfdi existente) |
| E | Egreso (nota crédito) | **Nuevo** |
| P | Pago (REP complemento) | **Nuevo** |
| T | Traslado (carta porte) | **Funciona** (carta-porte-timbrar) |

## Migration

**Archivo:** `supabase/migrations/20260511060000_m08_facturacion_cierre.sql`

| Tabla | Propósito |
|-------|-----------|
| `notas_credito` | CFDI tipo E con CfdiRelacionado a factura original |
| `complementos_pago` | CFDI tipo P / REP |
| `complementos_pago_doctos` | DoctoRelacionado (facturas PPD pagadas) |
| `remisiones` | Documento interno no fiscal, convertible a factura |

Folios atómicos: NC-YYYYMM-NNNN, REP-YYYYMM-NNNN, REM-YYYYMM-NNNN

## Edge Functions (3 nuevas)

| Function | Tipo CFDI | Propósito |
|----------|-----------|-----------|
| `timbrar-nota-credito` | E | Timbra NC con CfdiRelacionado tipo 01 |
| `timbrar-complemento-pago` | P | Timbra REP con Pago20 + DoctoRelacionado |
| `convertir-remision-factura` | — | Crea factura desde remisión, marca convertida |

## Frontend

| Archivo | Propósito |
|---------|-----------|
| `src/pages/NotasCredito.tsx` | Lista + filtros + timbrar |
| `src/pages/ComplementosPago.tsx` | Lista + filtros + timbrar REP |
| `src/hooks/useNotaCredito.ts` | 4 hooks |
| `src/hooks/useComplementoPago.ts` | 4 hooks |
| `src/hooks/useRemision.ts` | 3 hooks |

Sidebar expandido bajo "Finanzas": Facturas, Notas de Crédito, Complementos Pago, Rentabilidad.

---

## ⚠️ MIGRATION PENDIENTE

```
supabase/migrations/20260511060000_m08_facturacion_cierre.sql
```

---

*M08 Facturación Dual — CFDI 4.0 completo (I/E/P/T)*
