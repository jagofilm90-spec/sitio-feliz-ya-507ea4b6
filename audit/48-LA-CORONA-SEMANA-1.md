# LA CORONA — SEMANA 1 Anti-robo Foundation Papel+Digital

**Fecha:** 11 de Mayo 2026  
**Principio:** Biblia #11 "El Sistema Todo Lo Ve"  
**Estado:** Foundation completa — 6 tablas + 4 edge functions + dashboard  
**Próximo:** SEMANA 2 (geo-fence, integración chofer panel, alertas push)

---

## Arquitectura: 9 Momentos de Reconciliación

```
1. Almacén surte pedido          [firma digital almacenista]
2. Sistema imprime hoja física   [PDF con espacios sello/firma]
3. Chofer recibe mercancía       [firma digital chofer]
4. Chofer sale bodega            [geo-fence + GPS on]
5. Chofer en ruta                [GPS continuo]
6. Cliente sella hoja física     [chofer toma FOTO]
7. IA procesa hoja               [Claude Vision: sello/firma/observaciones]
8. Chofer regresa bodega         [geo-fence retorno]
9. Reconciliación final admin    [valida digital vs físico]
```

**Cliente NUNCA toca el sistema.** Sigue sellando y firmando hojas de papel como siempre.
**El sistema captura, procesa con IA, y concilia automáticamente.**

---

## Migration: 6 tablas

**Archivo:** `supabase/migrations/20260511010000_la_corona_foundation.sql`

| Tabla | Propósito |
|-------|-----------|
| `momentos_clave` | 9 momentos del ciclo (seed) |
| `eventos_conciliacion` | Registro de cada momento por entrega |
| `discrepancias_la_corona` | Faltantes, robos sospechados, no entregados |
| `score_confianza` | Score 0-100 por empleado por periodo |
| `anomalias_la_corona` | Alertas automáticas (geo-fence, IA, etc.) |
| `hojas_fisicas` | Papel→digital: PDF generado, foto sellada, resultados IA |

**Triggers:**
- `trg_hoja_fisica_folio` — auto-genera folio HF-YYYYMM-NNNN
- `trg_hoja_anomalias` — auto-detecta anomalías cuando IA clasifica hoja

**Storage bucket:** `hojas-fisicas`

### IA Processing (Claude Vision)

La tabla `hojas_fisicas` almacena:
- `ia_sello_detectado` + confianza 0-100
- `ia_firma_detectada` + confianza 0-100
- `ia_observaciones_texto` — transcripción de observaciones manuscritas
- `ia_clasificacion` — completo / faltante / no_llego / otro
- `ia_items_faltantes` — JSON array de items mencionados

---

## Edge Functions (4)

| Function | Propósito |
|----------|-----------|
| `generar-hoja-fisica-pdf` | Genera HTML hoja física con espacios sello/firma/observaciones |
| `procesar-hoja-fisica` | Claude Vision analiza foto: detecta sello, firma, lee observaciones |
| `conciliar-momento` | Registra evento en timeline, valida secuencia, detecta geo-fence |
| `calcular-score-empleado` | Calcula score 0-100 por empleado basado en discrepancias |

### procesar-hoja-fisica detalle

1. Recibe `hoja_fisica_id` + `foto_url`
2. Descarga imagen → base64
3. Llama Claude API (vision) con prompt estructurado
4. Claude responde JSON: sello/firma/observaciones/clasificación
5. Update `hojas_fisicas` con resultados IA
6. Si faltante o no_llego → crea `discrepancias_la_corona`
7. Trigger `trg_hoja_anomalias` crea `anomalias_la_corona`

**Requiere:** `ANTHROPIC_API_KEY` como secret en Edge Functions.

---

## Frontend

| Archivo | Propósito |
|---------|-----------|
| `src/hooks/useLaCorona.ts` | 11 hooks: momentos, eventos, discrepancias, anomalías, scores, hojas, procesamiento |
| `src/components/la-corona/HojaFisicaUpload.tsx` | Upload foto + procesamiento IA + resultados visuales |
| `src/components/la-corona/TimelineMomentos.tsx` | Timeline 9 momentos con checks verdes |
| `src/pages/LaCorona.tsx` | Dashboard 4 tabs: Anomalías, Discrepancias, Hojas Físicas, Scores |

### Dashboard tabs

1. **Anomalías** — alertas auto-detectadas sin revisar (button "Revisar")
2. **Discrepancias** — faltantes/robos con filtro por estado investigación
3. **Hojas Físicas** — lista con clasificación IA, foto, badge estado
4. **Scores** — ranking empleados con tendencia (mejorando/empeorando)

### Routing

- Ruta: `/la-corona` (admin only)
- Sidebar: bajo "Logística" con icono Shield
- `MODULE_PERMISSIONS` actualizado

---

## Hoja Física PDF (diseño)

```
┌─────────────────────────────────────────┐
│  ALMASA          HOJA DE ENTREGA        │
│  Logo            Pedido: P-202605-0042  │
│                  Ruta: R-202605-0008    │
├─────────────────────────────────────────┤
│  Cliente: La Tiendita Don Pepe          │
│  RFC: XAXX010101000                     │
│  Dirección: Blvd. Kino #123, Hermosillo│
├──────┬──────┬───────────┬──────┬────────┤
│  #   │ Cód  │ Producto  │ Cant │ Recib. │
├──────┼──────┼───────────┼──────┼────────┤
│  1   │ A001 │ Azúcar 5k │ 10   │        │
│  2   │ B002 │ Coca 600ml│ 24   │        │
│  3   │ C003 │ Aceite 1L │ 12   │        │
├──────┴──────┴───────────┴──────┴────────┤
│                                         │
│  ┌─────────────────────────────────┐    │
│  │     SELLO DEL CLIENTE           │    │
│  │     (colocar sello aquí)        │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Firma cliente: ___________________     │
│  Firma chofer:  ___________________     │
│                                         │
│  OBSERVACIONES:                         │
│  ___________________________________    │
│  ___________________________________    │
│  ___________________________________    │
│                                         │
│  Sellar, firmar y devolver al chofer.   │
└─────────────────────────────────────────┘
```

---

## ⚠️ MIGRATION PENDIENTE

```
supabase/migrations/20260511010000_la_corona_foundation.sql
```

6 tablas + RLS + triggers + seed + storage bucket.

**También requiere:** `ANTHROPIC_API_KEY` como secret en Supabase Edge Functions para que `procesar-hoja-fisica` funcione.

---

## Archivos creados/modificados

| Archivo | Cambio |
|---------|--------|
| `supabase/migrations/20260511010000_la_corona_foundation.sql` | CREADO — 6 tablas + RLS + triggers |
| `supabase/functions/generar-hoja-fisica-pdf/index.ts` | CREADO — generador PDF hoja física |
| `supabase/functions/procesar-hoja-fisica/index.ts` | CREADO — Claude Vision IA |
| `supabase/functions/conciliar-momento/index.ts` | CREADO — registro momentos + geo-fence |
| `supabase/functions/calcular-score-empleado/index.ts` | CREADO — score confianza |
| `src/hooks/useLaCorona.ts` | CREADO — 11 hooks React Query |
| `src/components/la-corona/HojaFisicaUpload.tsx` | CREADO — upload + IA processing |
| `src/components/la-corona/TimelineMomentos.tsx` | CREADO — timeline 9 momentos |
| `src/pages/LaCorona.tsx` | CREADO — dashboard 4 tabs |
| `src/App.tsx` | MODIFICADO — ruta /la-corona |
| `src/hooks/useUserRoles.ts` | MODIFICADO — permiso /la-corona |
| `src/components/Layout.tsx` | MODIFICADO — sidebar "LA CORONA" |

---

*LA CORONA — Principio Biblia #11: "El Sistema Todo Lo Ve"*  
*Reconciliación automática papel físico + digital con IA*
