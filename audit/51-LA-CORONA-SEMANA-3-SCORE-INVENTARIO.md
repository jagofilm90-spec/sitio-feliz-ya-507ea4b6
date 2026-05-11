# LA CORONA — SEMANA 3 Score Confianza + Inventario Ciego

**Fecha:** 11 de Mayo 2026  
**Capas:** 3 (Score Confianza) + 4 (Inventario Ciego) completadas  
**Estado:** 5 de 7 capas LA CORONA construidas  
**Próximo:** Capa 6 (GPS desviación rutas) + Capa 7 (alertas push)

---

## Algoritmo Score Confianza

### Constantes parametrizables

| Factor | Peso | Tipo |
|--------|------|------|
| Entrega exitosa (reconciliada completo) | +0.5 | Positivo |
| Conteo ciego exacto | +1.0 | Positivo |
| Antigüedad (cada 6 meses) | +2.0 | Positivo |
| Discrepancia detectada | -3.0 | Negativo |
| Robo sospechado | -15.0 | Negativo |
| Hoja sin firma (IA detectó) | -1.0 | Negativo |
| Hoja sin sello (IA detectó) | -2.0 | Negativo |
| Conteo incorrecto | -2.0 | Negativo |

### Score base
- Empleado nuevo (<6 meses): 80
- Empleado probado (>=6 meses): 100

### Umbrales banderas
- Bandera amarilla: score < 80
- Bandera roja: score < 60
- Bandera roja activada → anomalía automática tipo "critica"

### Fórmula
```
Score = min(100, max(0, ScoreBase + Positivos + Negativos))
```

---

## Sistema Inventario Ciego

### Concepto (NetSuite/SAP estándar)
- Admin programa conteo asignando empleado
- Sistema selecciona 20 productos aleatorios con stock
- Empleado cuenta SIN VER cantidad teórica (RLS oculta)
- Al finalizar, sistema calcula diferencias
- Shrinkage Rate = (|Valor Diferencia| / Valor Teórico) × 100

### Shrinkage estándar industria
- < 1% → excelente
- 1-2% → normal
- \> 2% → anomalía automática
- \> 5% → anomalía crítica

---

## Migration: 4 tablas nuevas

**Archivo:** `supabase/migrations/20260511040000_conteo_ciego_score.sql`

| Tabla | Propósito |
|-------|-----------|
| `conteos_ciegos` | Documento CC-YYYYMM-NNNN con folio atómico |
| `conteos_ciegos_detalles` | Líneas: cantidad_teorica OCULTA al empleado vía RLS |
| `metricas_empleado_diarias` | KPIs diarios por empleado |
| `score_confianza_historial` | Auditoría cambios score con factores |

### RLS crítica
```sql
-- Empleado NUNCA ve cantidad_teorica al contar
-- Solo puede leer/actualizar sus propios conteos asignados
-- Admin ve todo incluido teórica
```

---

## Edge Functions

| Function | Propósito |
|----------|-----------|
| `calcular-score-empleado` | Algoritmo completo con 8 factores + historial + auto-anomalía |
| `generar-conteo-ciego` | Selecciona 20 productos aleatorios, crea conteo + detalles |
| `finalizar-conteo-ciego` | Calcula diferencias + shrinkage + discrepancias + trigger score |

---

## Frontend

| Archivo | Propósito |
|---------|-----------|
| `src/hooks/useConteoCiego.ts` | 8 hooks: CRUD conteos, registrar cantidad, finalizar, historial, recalcular |
| `src/pages/ConteosCiegos.tsx` | Admin: lista + crear nuevo conteo (asignar empleado) |
| `src/pages/RealizarConteo.tsx` | Empleado: cuenta productos touch-friendly (sin ver teórica) |

### Ruta + Sidebar
- `/conteos-ciegos` — admin, almacen, gerente_almacen
- `/conteos-ciegos/:conteoId` — realizar conteo
- Sidebar: "Conteos Ciegos" bajo Logística con icon ClipboardCheck

---

## Estado LA CORONA: 5/7 capas

| Capa | Estado |
|------|--------|
| 1. Conciliación 9 momentos | **Completa** |
| 2. Hoja de Salida V4 | **Completa** |
| 3. Score Confianza | **Completa** |
| 4. Inventario Ciego | **Completa** |
| 5. Verificación sello/firma IA | **Completa** |
| 6. GPS desviación rutas | Pendiente |
| 7. Alertas push | Pendiente |

---

## ⚠️ MIGRATION PENDIENTE

```
supabase/migrations/20260511040000_conteo_ciego_score.sql
```

4 tablas + RLS + folio atómico + índices.

---

*LA CORONA SEMANA 3 — Score real + Inventario ciego imposible de manipular*
