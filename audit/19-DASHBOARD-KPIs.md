# Dashboard / KPIs — ALMASA-OS

**Versión:** v1.0  
**Fecha:** 10 de Mayo 2026  
**Origen:** Auditoría de dashboards + decisiones operativas + metodología "Mejor que Oracle"  
**Estado:** Diseño · Pendiente decisión y ejecución  
**Tagline:** El dashboard es la cara del producto. Si impresiona, vende.

---

## 1. La filosofía

Dashboard NO es un módulo más. Es la cara que ALMASA-OS muestra al 
admin cada mañana, al inversionista en demo, al comprador potencial 
en evaluación. Si el dashboard impresiona, se vende. Si es genérico, 
parece Excel.

> Principio rector: "Dashboard como producto vendible. Cada KPI 
> con propósito accionable. Cada vista con drill-down. Cada gráfica 
> con storytelling. Mejor que Oracle BI."

---

## 2. Estado actual de dashboard

ALMASA-OS Dashboard es uno de los módulos más sofisticados:

- Dashboard.tsx con 3 tabs (General, RRHH, Finanzas)
- 22 widgets en /components/dashboard (~4,133 líneas)
- 34 KPIs definidos
- 11 tipos de alertas automáticas
- useDashboardData.ts (351 líneas) — 27+ queries paralelas
- Auto-refresh 60 segundos
- 4 periodos (hoy/semana/mes/ano)
- 7+ generadores PDF (~3,800 líneas)
- Export Excel genérico (175 líneas)
- 5 gráficas Recharts integradas

| Capacidad | Estado | Detalle |
|-----------|--------|---------|
| Dashboard admin/director | ✅ Completo | 3 tabs, 22 widgets, 34 KPIs |
| Dashboard vendedor | ✅ | Comisiones, saldos, cobranza |
| Dashboard almacenista | ✅ | Redirect /almacen-tablet (14 tabs) |
| Dashboard chofer | ✅ | Redirect /chofer (ResumenRuta) |
| Dashboard contadora | 🟡 Parcial | Tab en admin, no propio |
| Dashboard cliente | ✅ | Portal: estado cuenta, pedidos |
| KPIs operativos | ✅ 15+ | Ventas, entregas, pedidos, cobros |
| KPIs financieros | ✅ 7+ | Variacion, por cobrar, vencido |
| Alertas automáticas | ✅ 11 tipos | Con boton "ir a" |
| Graficas | ✅ 5+ | Recharts (Line/Bar/Pie) |
| Auto-refresh | ✅ 60s | useDashboardData |
| Periodos | ✅ 4 | hoy/semana/mes/ano |
| Push notifications | ✅ 15+ eventos | Multi-canal |
| Export PDF | ✅ 7+ generadores | OC, contrato, cotizacion, etc. |
| Export Excel | ✅ Generico | exportData.ts |
| Drill-down | 🟡 Parcial | Alertas si, KPI cards no |
| Comparativa ano vs ano | 🟡 Parcial | Solo mes vs mes anterior |
| Dashboard utilidad real | ❌ NO existe | Principio #5 sin implementar |
| Dashboard TCO flota | ❌ NO existe | Propuesto en /audit/17 |
| Dashboard NPS | ❌ NO existe | Propuesto en /audit/18 |
| Heat maps | ❌ NO existe | Sin mapa de calor |
| Predicciones IA | ❌ NO existe | Sin forecasting |
| Materialized views | ❌ NO existen | Solo views normales |
| RPCs KPIs | ❌ NO existen | Queries directas |

**Conclusion:** Base ESPECTACULAR. 6 brechas estrategicas.

---

## 3. Estandar Oracle / SAP / NetSuite

7 conceptos universales:
1. Role-based Dashboards
2. KPI Hierarchy (operativos / tacticos / estrategicos)
3. Drill-down
4. Real-time Updates
5. Alert Intelligence
6. Exportable Reports
7. Predictive Analytics

---

## 4. Por que ALMASA-OS gana

| Dimension | Oracle/SAP | ALMASA-OS | Ganador |
|-----------|-----------|-----------|---------|
| Dashboard admin | ✅ | ✅ 22 widgets | EMPATE |
| Dashboards por rol | ✅ | ✅ 5 roles | EMPATE |
| KPIs operativos | ✅ | ✅ 34 | EMPATE |
| Auto-refresh | ✅ | ✅ 60s | EMPATE |
| Alertas automaticas | ✅ | ✅ 11 tipos | EMPATE |
| Push notifications | ✅ | ✅ | EMPATE |
| Graficas | ✅ | ✅ Recharts | EMPATE |
| PDF exports | ✅ | ✅ 7+ | EMPATE |
| Excel export | ✅ | ✅ | EMPATE |
| Drill-down | ✅ | 🟡 → planeado | EMPATE (post) |
| Comparativa ano/ano | ✅ | 🟡 → planeado | EMPATE (post) |
| Heat maps | ✅ | ❌ → planeado | EMPATE (post) |
| Predicciones IA | ✅ ML | ❌ → Claude API | ALMASA (post) |
| Materialized views | ✅ | ❌ → planeado | EMPATE (post) |
| Utilidad real 3 niveles | ❌ | ❌ → UNICO | ALMASA (post) |
| TCO flota integrado | 🟡 | ❌ → UNICO | ALMASA (post) |
| NPS granular por entrega | ❌ | ❌ → UNICO | ALMASA (post) |
| Costo licencia | $$$$ | $0 | ALMASA |

**Marcador post-implementacion:**
ALMASA gana: 5 dimensiones (incluyendo 3 UNICOS + IA + costo)
Oracle gana: 0 dimensiones
Empate: 13 dimensiones

---

## 5. Las 6 Brechas Estrategicas

### Brecha 1 — Dashboard Utilidad Real (3 Niveles - Principio #5)

**Problema:** ALMASA-OS muestra "ventas - costo producto" como 
"utilidad". Es INCORRECTO. Falta logistica, almacen, admin.

**Solucion:** Implementar Principio #5 de la Biblia v1.1.

```sql
CREATE VIEW vw_utilidad_3_niveles_pedido AS
SELECT 
  p.id AS pedido_id,
  p.folio,
  c.nombre AS cliente,
  p.precio_real_total AS venta,
  p.costo_producto_total AS costo_producto,
  
  -- NIVEL 1 — Utilidad de Producto
  p.precio_real_total - p.costo_producto_total AS utilidad_nivel_1,
  
  -- NIVEL 2 — Utilidad Operativa
  (p.precio_real_total - p.costo_producto_total) - 
  COALESCE(pcl.costo_logistica_pedido, 0) AS utilidad_nivel_2,
  
  -- NIVEL 3 — Utilidad Real
  (p.precio_real_total - p.costo_producto_total) - 
  COALESCE(pcl.costo_logistica_pedido, 0) -
  ((p.precio_real_total) * 
   (SELECT pct_admin_total FROM config_costos_admin LIMIT 1) / 100) 
   AS utilidad_nivel_3,
  
  -- Margenes %
  ROUND(((p.precio_real_total - p.costo_producto_total) / 
    NULLIF(p.precio_real_total, 0) * 100), 2) AS margen_n1_pct,
  ROUND((((p.precio_real_total - p.costo_producto_total) - 
    COALESCE(pcl.costo_logistica_pedido, 0)) / 
    NULLIF(p.precio_real_total, 0) * 100), 2) AS margen_n2_pct
  
FROM pedidos p
JOIN clientes c ON c.id = p.cliente_id
LEFT JOIN pedido_costos_logistica pcl ON pcl.pedido_id = p.id
WHERE p.status = 'entregado';

CREATE TABLE config_costos_admin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pct_admin_total NUMERIC NOT NULL,
  pct_renta NUMERIC,
  pct_servicios NUMERIC,
  pct_oficina NUMERIC,
  pct_otros NUMERIC,
  vigente_desde DATE,
  notas TEXT
);
```

**Dashboard visual:**

```
UTILIDAD REAL - 3 NIVELES

NIVEL 1 — Utilidad de Producto
  Ventas: $5,000,000
  - Costo producto: $3,500,000
  N1: $1,500,000 (30%)

NIVEL 2 — Utilidad Operativa
  - Logistica: $305,000
  N2: $1,195,000 (24%)

NIVEL 3 — Utilidad Real
  - Costos admin (8%): $400,000
  N3: $795,000 (16%)

CLIENTES POR RENTABILIDAD REAL:
  EXCELENTES (N3 >= 15%): Lecaroz 22%, Mayorista X 18%
  PERDIDA (N3 < 0%): Don Juan -2% (revisar)
```

**Esfuerzo:** 2-3 semanas  
**Prioridad:** CRITICA (Principio #5 Biblia)

### Brecha 2 — Heat Maps Geograficos

5 heat maps en dashboard admin:
- Ventas por zona
- NPS por zona
- Margen real (N3) por zona
- Frecuencia visitas
- Densidad clientes

**Decisiones que habilita:**
- Zonas blancas → expandir
- Zonas saturadas → optimizar
- Zonas baja rentabilidad → revisar pricing

**Esfuerzo:** 1-2 semanas  
**Prioridad:** ALTA VALOR ESTRATEGICO

### Brecha 3 — Predicciones IA con Claude API

Edge function que usa Claude API para forecasting:

```typescript
// supabase/functions/forecasting-ia/index.ts
// Llama Claude API con datos historicos
// Devuelve: prediccion, tendencia, confianza, factores, recomendacion
```

**Predicciones implementadas:**
- Ventas proximos 30 dias
- Stock que se acabara
- Cliente bajara consumo
- Vendedor no llegara a meta
- Vehiculo mantenimiento pronto

```sql
CREATE TABLE predicciones_ia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  contexto_id UUID,
  prediccion JSONB NOT NULL,
  confianza_pct NUMERIC,
  tendencia TEXT,
  factores_clave TEXT[],
  recomendacion_accion TEXT,
  generado_en TIMESTAMPTZ DEFAULT now(),
  expira_en TIMESTAMPTZ DEFAULT now() + INTERVAL '7 days',
  cumplimiento_real NUMERIC,
  validado_en TIMESTAMPTZ
);
```

**Esfuerzo:** 3-4 semanas  
**Prioridad:** ALTO (diferenciador comercial DECISIVO)

### Brecha 4 — Drill-down + Comparativa Ano vs Ano

**Drill-down:**
- Cada KPI card clickeable
- Detalle por cliente/producto/vendedor/zona/dia
- Exportar desde detalle

**Comparativas:**
- Mes vs mes anterior (existe)
- Mismo mes ano pasado (NUEVO)
- Ano vs ano pasado (NUEVO)

**Esfuerzo:** 2-3 semanas  
**Prioridad:** IMPORTANTE

### Brecha 5 — Dashboards TCO + NPS Consolidados

Vista ejecutiva premium que consolida:
- Utilidad real 3 niveles
- NPS general (de /audit/18)
- TCO flota (de /audit/17)
- Segmentacion A/B/C/D (de /audit/18)
- Alertas integradas

**Esfuerzo:** 1-2 semanas (despues de /audit/17 y /audit/18)  
**Prioridad:** ALTA COMERCIAL

### Brecha 6 — Materialized Views + RPCs Optimizadas

```sql
CREATE MATERIALIZED VIEW mv_kpis_ejecutivos_diarios AS
SELECT 
  CURRENT_DATE AS fecha_calculo,
  -- Todos los KPIs pre-calculados
  -- ...
;

-- Refresh nocturno 3am
CREATE OR REPLACE FUNCTION refresh_kpis_diarios()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_kpis_ejecutivos_diarios;
END;
$$ LANGUAGE plpgsql;

-- RPC consolidada: 27 queries → 1
CREATE OR REPLACE FUNCTION obtener_kpis_dashboard()
RETURNS JSONB AS $$
BEGIN
  RETURN (SELECT row_to_json(mv.*) FROM mv_kpis_ejecutivos_diarios mv LIMIT 1);
END;
$$ LANGUAGE plpgsql STABLE;
```

**Beneficios:** 27 queries → 1 RPC. Dashboard 10x mas rapido.

**Esfuerzo:** 1-2 semanas  
**Prioridad:** TECNICA (cuando crezca volumen)

---

## 6. Roadmap

| Mes | Entregas |
|-----|----------|
| Mayo (resto) | /audit/19 generado |
| Julio | Brecha 1: Utilidad real 3 niveles (3 sem) |
| Agosto | Brecha 4: Drill-down + ano vs ano (3 sem) |
| Septiembre | Brecha 2: Heat maps (2 sem) |
| Septiembre | Brecha 6: Materialized views + RPCs (2 sem) |
| Octubre | Brecha 3: Predicciones IA (4 sem) |
| Noviembre | Brecha 5: Dashboards TCO + NPS consolidados |

**Tiempo total:** 6-7 meses  
**Inversion:** $0 software + ~$100/mes Claude API

---

## 7. Decisiones de Negocio Pendientes

### Decision 1 — % Costos administrativos
- Estimado: 8% sobre ventas
- Validar con contadora?
- Ajustar por mes?

### Decision 2 — Dashboard contadora propio
- Solo conciliacion bancaria?
- Reportes fiscales?
- Acceso completo a finanzas?

### Decision 3 — Frecuencia predicciones IA
- Diaria? (mas costo API)
- Semanal? (suficiente)

### Decision 4 — Heat maps - capas activas
- Ventas, NPS, margen siempre activos?
- Filtros adicionales?

### Decision 5 — Compartir dashboards
- Inversionistas tienen acceso?
- Vista publica para auditoria?

### Decision 6 — Mobile dashboards
- Version completa en movil?
- Solo KPIs principales?

---

## 8. Conexion con Biblia v1.1 y otros documentos

### Biblia v1.1 - Principios afectados:
- Principio #1 (Privacidad por rol): cada rol ve lo suyo
- Principio #4 (CPP real con gastos asociados): utilidad 3 niveles
- Principio #5 (Utilidad en tres niveles): CORE de Brecha 1
- Principio #10 (Users Before Perfection): MVP iterativo

### Conexiones cruzadas:
- /audit/13 Pedidos: ventas alimentan KPIs
- /audit/14 Rutas: costos logistica → utilidad N2
- /audit/15 RH: comisiones, productividad
- /audit/16 Cobranza: aging en dashboard ejecutivo
- /audit/17 Flota: TCO consolidado
- /audit/18 Clientes: NPS, scoring, segmentacion
- /audit/12 Evidencia: hashes en exports

### Nuevo Principio Transversal Propuesto — DASHBOARD COMO PRODUCTO
"El dashboard NO es un modulo. Es la cara de ALMASA-OS al mundo. 
Cada KPI debe vender. Cada grafica debe contar historia. Cada 
prediccion debe accionar. Mejor que Oracle BI."

---

## 9. Recomendacion final

ALMASA-OS Dashboard ya tiene base ESPECTACULAR (22 widgets, 
34 KPIs, 11 alertas, 4 periodos, auto-refresh). Las 6 brechas 
convierten ALMASA-OS en producto comercial vendible que 
APLASTA a Oracle BI para PYMEs distribuidoras.

3 ventajas unicas post-implementacion:
1. Utilidad real en 3 niveles (Principio #5 - CORE de ALMASA)
2. TCO de flota integrado (de /audit/17)
3. NPS granular por entrega (de /audit/18)

Plus: predicciones IA con Claude API.

**Orden estricto:**
1. JULIO: Utilidad real 3 niveles (CORE)
2. AGOSTO: Drill-down + ano vs ano
3. SEPTIEMBRE: Heat maps + Optimizacion tecnica
4. OCTUBRE: Predicciones IA
5. NOVIEMBRE: Dashboards consolidados TCO + NPS

Una vez completas las 6 brechas, ALMASA-OS Dashboard sera 
**superior a Oracle BI, SAP Analytics y NetSuite Dashboards** 
para PYMEs mexicanas, con costo $0 + ~$100/mes Claude API 
y ventajas unicas no replicables.

---

*ALMASA-OS · Dashboard / KPIs · v1.0*  
*Generado el 10 de mayo de 2026*  
*Dashboard como producto. Mejor que Oracle BI.*
