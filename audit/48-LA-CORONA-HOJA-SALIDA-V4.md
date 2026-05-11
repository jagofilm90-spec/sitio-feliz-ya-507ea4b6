# LA CORONA — SEMANA 1A Anti-robo + Hoja de Salida V4 Enterprise

**Fecha:** 11 de Mayo 2026  
**Principio:** Biblia #11 "El Sistema Todo Lo Ve"  
**Estado:** Foundation completa SIN IA (IA viene SEMANA 1B)  
**Próximo:** SEMANA 1B (Claude Vision OCR procesamiento foto)

---

## Filosofía LA CORONA

ALMASA opera con 30+ empleados, 14 vehículos. Problema #1: ROBO INTERNO.

Realidad operativa:
- Cliente NO usa apps, NO escanea QR
- Chofer lleva hoja física + mercancía
- Cliente sella + firma + escribe observaciones manuales
- Chofer regresa con hoja sellada
- Sistema CONCILIA lo digital con lo físico

**7 capas anti-robo:**
1. Conciliación 9 momentos del día (**esta semana**)
2. Hoja de Salida digital + papel (**esta semana**)
3. Score confianza empleado (**esta semana**)
4. Inventario ciego (futuro)
5. Verificación sello/firma (**esta semana foundation**)
6. GPS desviación rutas (futuro)
7. Dashboard LA CORONA (**esta semana**)

---

## Arquitectura: 9 Momentos de Reconciliación

```
1. Almacén surte pedido          [firma almacenista]
2. Sistema genera Hoja de Salida [auto post-carga, PDF]
3. Chofer recibe mercancía       [firma chofer]
4. Chofer sale bodega            [geo-fence + GPS]
5. Chofer en ruta                [GPS continuo]
6. Cliente sella y firma hoja    [chofer toma FOTO]
7. IA procesa hoja               [placeholder → SEMANA 1B]
8. Chofer regresa bodega         [geo-fence retorno]
9. Reconciliación final admin    [manual → IA después]
```

---

## Hoja de Salida V4 (diseño enterprise)

Basado en investigación:
- SAP S/4HANA Smartforms (paginación, totales última página)
- Oracle NetSuite Pick Slip Manager (2 copias, firma cliente)
- Mecalux/Facturama (campos legales México)
- Coca-Cola FEMSA pattern (digital + papel coexisten)

**Características:**
- Folio único HS-YYYYMM-NNNN (atómico con pg_advisory_xact_lock)
- Header completo página 1, simplificado páginas 2+
- Paginación dinámica (10 productos/página)
- "Continúa en página X" en intermedias
- Totales + observaciones + sello + firmas SOLO última página
- Cuadrilla sin límite (chofer + N ayudantes)
- Auto-vincula Carta Porte cuando aplica
- Aviso legal (no sustituye CFDI, conservar 5 años)
- Design system v1.1 (Cormorant Garamond, Inter Tight, JetBrains Mono, crimson)

---

## Migration: 8 tablas

**Archivo:** `supabase/migrations/20260511020000_la_corona_hoja_salida_v4.sql`

| Tabla | Propósito |
|-------|-----------|
| `momentos_clave` | 9 momentos del ciclo (catálogo) |
| `hojas_salida` | Documento principal HS-YYYYMM-NNNN |
| `hojas_salida_lineas` | Snapshot productos por hoja |
| `cuadrilla_hoja_salida` | Chofer + N ayudantes |
| `eventos_conciliacion` | Audit trail 9 momentos |
| `discrepancias_la_corona` | Faltantes, robos sospechados |
| `score_confianza_empleado` | Score 0-100 con banderas |
| `anomalias_la_corona` | Detección automática |

**Nota:** DROP IF EXISTS de tablas previas (migration anterior 20260511010000).
**Role:** Usa `almacen` (no `almacenista`) conforme enum app_role real.

---

## Edge Functions (3)

| Function | Propósito |
|----------|-----------|
| `generar-hoja-salida` | Auto-genera PDF paginado + inserts (hoja, líneas, cuadrilla, evento) |
| `conciliar-momento` | Registra momento + valida secuencia + geo-fence + anomalías |
| `calcular-score-empleado` | Score 0-100 basado en entregas/discrepancias/robos (cron) |

---

## Frontend

| Archivo | Propósito |
|---------|-----------|
| `src/hooks/useHojaSalida.ts` | 8 hooks: list, detail, lineas, cuadrilla, generar, subir foto, reconciliar, eventos |
| `src/hooks/useLaCorona.ts` | 8 hooks: dashboard KPIs, discrepancias, anomalías, scores, feed, momentos |
| `src/components/la-corona/TimelineMomentos.tsx` | Timeline vertical 9 momentos con dots crimson |
| `src/components/la-corona/HojaFisicaUpload.tsx` | Chofer sube foto (cámara/galería) |
| `src/components/la-corona/ReconciliarHojaDialog.tsx` | Admin: 2 columnas (foto + form), sello/firma/clasificación |
| `src/pages/LaCorona.tsx` | Dashboard 5 tabs: Feed, Hojas, Discrepancias, Empleados, Anomalías |

---

## SEMANA 1A vs 1B

| Feature | 1A (esta) | 1B (próxima) |
|---------|-----------|-------------|
| 8 tablas foundation | done | — |
| Hoja de Salida PDF V4 | done | — |
| 9 momentos conciliación | done | — |
| Score confianza | done | — |
| Dashboard 5 tabs | done | — |
| Reconciliación manual (admin) | done | — |
| Foto sellada upload | done | — |
| Claude Vision OCR | placeholder | **implementar** |
| IA lee observaciones manuscritas | — | **implementar** |
| Auto-detección faltantes por IA | — | **implementar** |
| Notificaciones push anomalías | — | **implementar** |

---

## ⚠️ MIGRATION PENDIENTE

```
supabase/migrations/20260511020000_la_corona_hoja_salida_v4.sql
```

**IMPORTANTE:** Esta migration hace DROP de tablas de la migration anterior (20260511010000). Si la anterior fue aplicada, esta la reemplaza. Si no fue aplicada, aplicar SOLO esta.

---

*LA CORONA — Principio Biblia #11: "El Sistema Todo Lo Ve"*  
*Reconciliación papel + digital enterprise-grade*
