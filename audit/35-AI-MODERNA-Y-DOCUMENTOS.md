# AI Moderna y Documentos — ALMASA-OS

**Versión:** v1.0  
**Fecha:** 10 de Mayo 2026  
**Origen:** Investigación NetSuite Next + SAP Joule Q1 2026 + Gartner 2026  
**Estado:** Diseño · Pendiente decisión y ejecución  
**Tagline:** AI-first ERP. No ERP con IA. La diferencia comercial está aquí.

---

## 1. La filosofía

**ERP con IA** = IA es feature opcional, interfaz tradicional.
**AI-first ERP** = IA ES la interfaz principal, conversacional, predictiva.

> Gartner 2026: "40% enterprise apps con AI agents end of 2026. 80% routine tasks automatizables."

> Principio rector: "JOSAN habla con Josan. Documentos hablan con el sistema. Agentes externos colaboran. Todo conversacional."

---

## 2. Los 10 Gaps

| # | Gap | NetSuite/SAP | ALMASA-OS |
|---|-----|-------------|-----------|
| 1 | Asistente IA conversacional | Ask Oracle / Joule | ❌ → JOSAN |
| 2 | AI Canvas workspace | NetSuite Next | ❌ → Mesa Trabajo |
| 3 | Narrative summaries | NetSuite Next | ❌ → Auto |
| 4 | Document & Knowledge | NetSuite + Joule | 🟡 → Hub |
| 5 | MCP Agent interop | NetSuite MCP | ❌ → Primer MX |
| 6 | Custom Agent Builder | Joule Studio GA | ❌ → Fábrica |
| 7 | Continuous Anomaly Scan | Autonomous Close | 🟡 → Financiero |
| 8 | Predictive Forecast explicado | EPM Agent | 🟡 → Explicado |
| 9 | Office integration | SAP IBP + Joule | ❌ → Hub |
| 10 | Subscription Metrics SaaS | NetSuite | ❌ → Nativo |

---

## 3. Diseño de los 10 Gaps

### GAP 1 — JOSAN: Asistente IA Conversacional Core

```sql
CREATE TABLE josan_conversaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL,
  rol_usuario TEXT,
  mensajes JSONB NOT NULL DEFAULT '[]',
  contexto_actual JSONB,
  acciones_ejecutadas JSONB,
  tipo TEXT CHECK (tipo IN ('consulta', 'transaccional', 'analisis', 'configuracion')),
  iniciada_en TIMESTAMPTZ DEFAULT now(),
  ultima_actividad TIMESTAMPTZ DEFAULT now(),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  feedback_texto TEXT
);

CREATE TABLE josan_capacidades_rol (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rol TEXT NOT NULL,
  puede_consultar JSONB,
  puede_ejecutar JSONB,
  monto_maximo_aprobacion NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Edge function `josan-core` con Claude tool use, 50+ funciones, capacidades por rol, tono cordial mexicano. UI flotante siempre presente.

### GAP 2 — Mesa de Trabajo (AI Canvas)

```sql
CREATE TABLE mesas_trabajo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  creador_id UUID NOT NULL,
  canvas_data JSONB,
  estado TEXT CHECK (estado IN ('borrador', 'en_analisis', 'completada', 'archivada')),
  insights_generados JSONB,
  acciones_recomendadas JSONB,
  reporte_final_pdf_url TEXT,
  compartida_con UUID[],
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Canvas visual estilo Figma/Miro con nodos de datos + agentes + reportes.

### GAP 3 — Narrative Summaries

```sql
CREATE TABLE narrative_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_tipo TEXT NOT NULL,
  entidad_id UUID,
  resumen_corto TEXT,
  resumen_completo TEXT,
  insights_clave TEXT[],
  alertas TEXT[],
  recomendaciones TEXT[],
  generado_por_modelo TEXT DEFAULT 'claude-opus-4-7',
  generado_en TIMESTAMPTZ DEFAULT now(),
  vence_en TIMESTAMPTZ,
  util BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Cron diario regenera narrativas vencidas. Cada vista del sistema muestra resumen IA.

### GAP 4 — Document & Knowledge Hub

```sql
CREATE TABLE documentos_inteligentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  archivo_url TEXT NOT NULL,
  hash_sha256 TEXT,
  tipo_documento TEXT CHECK (tipo_documento IN (
    'factura_proveedor', 'contrato', 'manual_producto', 'ficha_tecnica',
    'pedimento', 'poliza_seguro', 'estado_cuenta', 'reporte_externo', 'otro'
  )),
  vinculado_a_tipo TEXT,
  vinculado_a_id UUID,
  texto_extraido TEXT,
  datos_estructurados JSONB,
  embedding vector(1536),
  resumen_ia TEXT,
  conceptos_clave TEXT[],
  fechas_importantes JSONB,
  subido_por UUID,
  procesado BOOLEAN DEFAULT false,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_doc_embedding ON documentos_inteligentes 
  USING ivfflat (embedding vector_cosine_ops);
```

OCR + Claude extracción + pgvector búsqueda semántica + auto-vinculación. Q&A sobre documentos propios.

### GAP 5 — MCP Server (Primer ERP MX)

```typescript
// supabase/functions/mcp-server-almasa/index.ts
export const mcpServer = {
  name: "almasa-os",
  version: "1.0.0",
  resources: [
    { uri: "almasa://clientes", name: "Clientes ALMASA" },
    { uri: "almasa://pedidos/pendientes", name: "Pedidos Pendientes" },
    { uri: "almasa://dashboard/metrics", name: "Métricas Dashboard" },
    // 30+ recursos
  ],
  tools: [
    { name: "consultar_cliente", description: "Info cliente detallada" },
    { name: "generar_reporte", description: "Reporte personalizado" },
    // 50+ herramientas
  ]
};
// Auth: API key + scopes (read_only, read_write, admin_full)
```

Claude.ai / ChatGPT consultan ALMASA-OS via MCP estándar.

### GAP 6 — Fábrica de Agentes

```sql
CREATE TABLE agentes_personalizados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  creador_id UUID,
  prompt_creacion TEXT,
  configuracion JSONB,
  activo BOOLEAN DEFAULT true,
  ejecuciones_totales INTEGER DEFAULT 0,
  ejecuciones_exitosas INTEGER DEFAULT 0,
  ultima_ejecucion TIMESTAMPTZ,
  requiere_aprobacion BOOLEAN DEFAULT true,
  aprobado_por UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE agentes_ejecuciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id UUID NOT NULL REFERENCES agentes_personalizados(id),
  ejecutado_en TIMESTAMPTZ DEFAULT now(),
  trigger TEXT,
  datos_consultados JSONB,
  resultado JSONB,
  acciones_tomadas TEXT[],
  exitoso BOOLEAN,
  error TEXT,
  duracion_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Crear agentes en lenguaje natural. Claude traduce a configuración.

### GAP 7 — Continuous Anomaly Scanning

```sql
CREATE TABLE anomalias_financieras_detectadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_deteccion TIMESTAMPTZ DEFAULT now(),
  tipo_anomalia TEXT CHECK (tipo_anomalia IN (
    'monto_inusual', 'frecuencia_inusual', 'horario_inusual',
    'cliente_nuevo_alto', 'duplicado_potencial', 'descuento_excesivo',
    'patron_robo_potencial', 'gap_periodo', 'velocidad_inusual', 'ratio_anomalo'
  )),
  severidad TEXT CHECK (severidad IN ('baja', 'media', 'alta', 'critica')),
  descripcion TEXT,
  entidad_afectada_tipo TEXT,
  entidad_afectada_id UUID,
  patron_normal_descripcion TEXT,
  desviacion_descripcion TEXT,
  score_confianza NUMERIC,
  estado TEXT CHECK (estado IN (
    'nueva', 'investigando', 'falsa_alarma', 'confirmada_actuada', 'descartada'
  )) DEFAULT 'nueva',
  notificado_admin BOOLEAN DEFAULT false,
  resuelto_por UUID,
  resolucion TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Cron cada 15 min. Z-score + pattern matching. Conecta con /audit/26 anti-robo.

### GAP 8 — Predictive Forecast Explicado

```sql
CREATE TABLE predicciones_ia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_prediccion TEXT,
  entidad_tipo TEXT,
  entidad_id UUID,
  valor_predicho NUMERIC,
  unidad TEXT,
  fecha_objetivo DATE,
  valor_minimo NUMERIC,
  valor_maximo NUMERIC,
  porcentaje_confianza NUMERIC,
  factores_influyentes JSONB,
  datos_historicos_usados JSONB,
  rango_historico_meses INTEGER,
  explicacion_completa TEXT,
  escenarios_alternativos JSONB,
  fecha_generacion TIMESTAMPTZ DEFAULT now(),
  fecha_real DATE,
  valor_real NUMERIC,
  precision_porcentaje NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Predicciones con factores con peso + narrativa explicativa + escenarios what-if + validación post-evento.

### GAP 9 — Office Integration Hub

Edge functions: generar fórmulas Excel conversacional, reportes Word desde datos, sincronización Gmail extendida, plantillas IA editables.

### GAP 10 — Subscription Metrics SaaS

```sql
CREATE TABLE saas_subscription_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL,
  mrr NUMERIC,
  arr NUMERIC,
  ltv NUMERIC,
  cac NUMERIC,
  churn_rate NUMERIC,
  expansion_mrr NUMERIC,
  net_revenue_retention NUMERIC,
  cohort_data JSONB,
  prediccion_mrr_proximo_mes NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Para venta SaaS 2027+: MRR, ARR, LTV, CAC, churn, cohort heatmaps.

---

## 4. Comparación

| Capacidad | NetSuite Next | SAP Joule | ALMASA-OS |
|-----------|-------------|-----------|-----------|
| Asistente IA core | ✅ | ✅ | ✅ JOSAN |
| AI Canvas | ✅ | 🟡 | ✅ Mesa Trabajo |
| Narratives | ✅ | 🟡 | ✅ |
| Document Hub | ✅ | ✅ 10 PDFs | ✅ ilimitado + semántica |
| MCP interop | ✅ | ✅ | ✅ Primer MX |
| Agent Builder | ✅ | ✅ GA | ✅ Conversacional |
| Anomaly scan | ✅ | ✅ | ✅ + anti-robo |
| Forecast explicado | ✅ | 🟡 | ✅ + escenarios |
| Office integration | 🟡 | ✅ | ✅ |
| SaaS Metrics | ✅ | ❌ | ✅ |
| Costo | $30K-200K/año | $100K-1M/año | $0 |

---

## 5. Roadmap

| Mes | Gap | Entrega |
|-----|-----|---------|
| Jun 2026 | #3 | Narrative summaries |
| Jul-Ago | #1 | JOSAN core + 50 tools |
| Sep | #4 | Document Hub + semántica |
| Oct | #7 | Anomaly scanning |
| Nov | #8 | Forecast explicado |
| Dic | #5 | MCP Server |
| Ene 2027 | #2 | Mesa de Trabajo |
| Feb | #6 | Fábrica Agentes |
| Mar | #9 | Office Hub |
| Q2 2027 | #10 | SaaS Metrics |

**Tiempo:** 10 meses. **Inversión:** ~$200/mes USD adicional.

---

## 6. Decisiones Pendientes

1. **JOSAN interfaz primaria** — Reemplaza menús o coexiste?
2. **MCP exposición** — Solo Josan o clientes también?
3. **Fábrica permisos** — Solo admin crea agentes?
4. **Documentos privacidad** — IA lee TODO?
5. **Anomalías umbral** — Notificar todo o solo alta/critica?
6. **SaaS metrics** — Construir ahora o esperar 2027?

---

## 7. Conexión con otros documentos

- /audit/25 Correos (JOSAN + extracción)
- /audit/26 Sistema Inteligente (anti-robo + anomalies)
- /audit/19 Dashboard (narrative + forecast)
- /audit/24 Configuración (feature flags)
- /audit/27 MOAT (extiende con AI moderna)

### Nuevo Principio — AI-FIRST, NO AI-ENABLED
"ALMASA-OS no es ERP con IA. Es AI-first ERP. La IA no es feature, es la interfaz."

---

## 8. Recomendación final

10 gaps cubiertos. AI-first ERP nivel 2027 listo desde 2026.

**vs NetSuite Next:** $30K-200K/año
**vs SAP Joule:** $100K-1M/año + 3% adopción
**ALMASA-OS:** $0 + 100% adopción

---

*ALMASA-OS · AI Moderna y Documentos · v1.0*  
*Generado el 10 de mayo de 2026*  
*AI-first ERP. No ERP con IA.*
