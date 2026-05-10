# Gestión Empresarial y Colaboración — ALMASA-OS

**Versión:** v1.0  
**Fecha:** 10 de Mayo 2026  
**Origen:** 8 gaps de gestión identificados en sesión arquitectónica mayo 2026  
**Estado:** Diseño · Pendiente decisión y ejecución  
**Tagline:** Slack + Asana + Notion + Jira + Concur, pero integrados con tu negocio. Sin 5 licencias.

---

## 1. Diagnóstico — Por qué este documento existe

ALMASA tiene 30+ empleados distribuidos: vendedores en calle, choferes en ruta, almacenistas en bodega, secretarias en oficina, contadora externa. La comunicación HOY:

- **WhatsApp grupos sin orden** — mezclan personal con operativo
- **Decisiones no documentadas** — se pierden en hilos de 500 mensajes
- **Sin OKRs ni metas medibles** — Jose sabe qué quiere pero no está escrito
- **Sin tickets internos** — "oye, se descompuso la impresora" vía WhatsApp
- **Conocimiento tribal** — solo Roberto sabe cómo cuadrar la caja
- **Vendedores externos** — viáticos en papelitos, reembolsos tardíos
- **Contadora externa** — intercambio vía USB, email con XMLs adjuntos
- **Sin compliance formal** — políticas en cabeza de Jose

**Costo de NO tenerlo:**
- Ventas perdidas por comunicación lenta
- Errores repetidos por conocimiento no documentado
- Fraude potencial por falta de governance
- Cierre contable 5-10 días por proceso manual
- Empleados desmotivados por falta de objetivos claros

---

## 2. Tesis — ALMASA opera como Inditex, no como SAP

Las empresas grandes usan 5-8 herramientas separadas:
- Slack ($12/usuario/mes) para chatear
- Asana ($25/usuario/mes) para tareas
- Notion ($15/usuario/mes) para wiki
- Jira ($20/usuario/mes) para tickets
- SAP Concur ($30/usuario/mes) para viáticos
- **Total: $102/usuario/mes × 30 = $3,060/mes = $36,720/año**

Inditex (Zara) opera con UN sistema integrado donde todo habla con todo. No 5 herramientas pegadas con cinta.

ALMASA-OS sigue el modelo Inditex: **UN sistema donde chat, tareas, wiki, tickets, viáticos y contadora están integrados nativamente con pedidos, rutas, inventario, clientes y finanzas.**

> Principio rector: "La colaboración NO es módulo aparte. Es la forma en que el negocio opera. Chat sobre un pedido ESTÁ en el pedido. Tarea de una ruta ESTÁ en la ruta. Wiki de un proceso ESTÁ en el proceso."

---

## 3. Los 8 Módulos de Gestión

### M1 — Chat Interno + WhatsApp Bridge

**Benchmark:** Slack + WhatsApp Business API

ALMASA-OS ya tiene Chat (audit/02: 1,295 líneas, realtime). Este módulo lo EXTIENDE.

**Capacidades nuevas:**

```sql
-- Extender tabla mensajes existente
ALTER TABLE mensajes ADD COLUMN entidad_vinculada_tipo TEXT;
ALTER TABLE mensajes ADD COLUMN entidad_vinculada_id UUID;
-- Vincular mensaje a pedido, cliente, ruta, producto

ALTER TABLE mensajes ADD COLUMN es_whatsapp BOOLEAN DEFAULT false;
ALTER TABLE mensajes ADD COLUMN whatsapp_message_id TEXT;
ALTER TABLE mensajes ADD COLUMN whatsapp_number TEXT;

-- Canales automáticos por entidad
CREATE TABLE canales_automaticos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_tipo TEXT NOT NULL,
  -- 'ruta', 'pedido_critico', 'cliente_vip', 'departamento'
  entidad_id UUID,
  canal_nombre TEXT NOT NULL,
  participantes_ids UUID[],
  auto_creado BOOLEAN DEFAULT true,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- WhatsApp Bridge
CREATE TABLE whatsapp_bridge_mensajes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direccion TEXT CHECK (direccion IN ('entrante', 'saliente')),
  whatsapp_number TEXT NOT NULL,
  mensaje_texto TEXT,
  mensaje_tipo TEXT, -- 'texto', 'audio', 'imagen', 'documento'
  audio_transcripcion TEXT, -- Whisper API
  cliente_id UUID REFERENCES clientes(id),
  empleado_id UUID,
  canal_interno_id UUID,
  procesado BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Diferenciador vs Slack:**
- Mensaje sobre pedido P-2026-1234 → click → abre el pedido
- Canal de ruta se auto-crea cuando ruta se asigna
- WhatsApp del cliente llega al chat interno vinculado
- JOSAN sugiere respuestas basadas en contexto del pedido
- Búsqueda semántica: "qué dijo Don Pepe sobre el azúcar"

**UI:**

```
┌───────────────────────────────────────────────┐
│ 💬 CHAT ALMASA                                │
├───────────────────────────────────────────────┤
│ CANALES:                                      │
│ 📦 #ruta-sur-10may (3 nuevos)                 │
│ 🏭 #almacen-general                           │
│ 💼 #ventas                                    │
│ 📋 #pedido-P-2026-1234 (urgente)              │
│ 👤 Carlos Hernández (DM)                      │
│ 📱 WhatsApp: Don Pepe (+52 55...)             │
│                                               │
│ ─── #ruta-sur-10may ──────────────            │
│                                               │
│ Carlos: Ya llegué a Lecaroz sucursal 42       │
│ 📍 GPS: Polanco, 14:32                        │
│                                               │
│ JOSAN: Carlos, el pedido P-1234 de Lecaroz    │
│ tiene 3 sacos azúcar pendientes confirmar     │
│ peso. ¿Necesitas ayuda?                       │
│                                               │
│ Carlos: Sí, el cliente dice que pesaron 24.8  │
│ pero pedido dice 25.                          │
│                                               │
│ JOSAN: Diferencia 0.8% (dentro tolerancia 2%).│
│ ¿Cobrar real $496 o redondear $500?           │
│ [Cobrar real] [Redondear]                     │
│                                               │
│ [_______________] [📎] [🎤] [Enviar]          │
└───────────────────────────────────────────────┘
```

**Esfuerzo:** 3-4 semanas (extiende chat existente)

---

### M2 — OKRs + Balanced Scorecard

**Benchmark:** Lattice + Balanced Scorecard (Kaplan & Norton)

Este es el módulo para DIRIGIR LA EMPRESA. Jose define hacia dónde va ALMASA, el sistema mide si llegamos.

```sql
CREATE TYPE nivel_okr AS ENUM ('empresa', 'departamento', 'persona');
CREATE TYPE estado_okr AS ENUM (
  'borrador', 'activo', 'en_riesgo', 'completado', 'cancelado'
);

CREATE TABLE okrs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Jerarquía
  nivel nivel_okr NOT NULL,
  padre_okr_id UUID REFERENCES okrs(id), -- cascada
  
  -- Objetivo
  titulo TEXT NOT NULL,
  descripcion TEXT,
  
  -- Asignación
  responsable_id UUID REFERENCES empleados(id),
  departamento TEXT,
  
  -- Periodo
  periodo TEXT, -- 'Q2-2026', 'H1-2026', '2026'
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  
  -- Estado
  estado estado_okr DEFAULT 'borrador',
  progreso_pct NUMERIC DEFAULT 0,
  
  -- Balanced Scorecard perspectiva
  perspectiva TEXT CHECK (perspectiva IN (
    'financiera',        -- utilidad, CPP, cash flow
    'cliente',           -- NPS, retención, ticket promedio
    'procesos_internos', -- eficiencia rutas, mermas, anti-robo
    'aprendizaje'        -- capacitación, OKRs cumplidos
  )),
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_id UUID NOT NULL REFERENCES okrs(id),
  
  titulo TEXT NOT NULL,
  
  -- Métrica
  metrica_tipo TEXT CHECK (metrica_tipo IN (
    'numero', 'porcentaje', 'moneda', 'boolean'
  )),
  valor_inicio NUMERIC,
  valor_objetivo NUMERIC,
  valor_actual NUMERIC DEFAULT 0,
  
  -- Vinculación a dato operativo REAL
  fuente_dato_tabla TEXT,
  fuente_dato_query TEXT,
  -- Ej: "SELECT SUM(total) FROM pedidos WHERE status='entregado' AND fecha >= '2026-04-01'"
  auto_actualizar BOOLEAN DEFAULT false,
  
  progreso_pct NUMERIC GENERATED ALWAYS AS (
    CASE 
      WHEN valor_objetivo = valor_inicio THEN 0
      ELSE LEAST(100, ((valor_actual - valor_inicio) / 
        NULLIF(valor_objetivo - valor_inicio, 0)) * 100)
    END
  ) STORED,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Check-ins quincenales
CREATE TABLE okr_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_id UUID NOT NULL REFERENCES okrs(id),
  
  fecha DATE NOT NULL,
  progreso_reportado NUMERIC,
  confianza TEXT CHECK (confianza IN ('en_camino', 'en_riesgo', 'fuera_camino')),
  comentario TEXT,
  
  -- IA analiza datos y sugiere
  ia_analisis TEXT,
  ia_sugerencias TEXT[],
  
  registrado_por UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Ejemplo OKRs ALMASA Q3 2026:**

```
═══════════════════════════════════════════════════
🎯 OKRs ALMASA - Q3 2026
═══════════════════════════════════════════════════

EMPRESA (Jose):
O1: Incrementar utilidad real (N3) a 18%
  KR1: Ventas $15M (actual: $12.5M → 83%) 🟢
  KR2: Margen N3 promedio 18% (actual: 15.2%) 🟡
  KR3: Reducir clientes con margen <5% de 8 a 3 🟡

O2: Adopción digital 100%
  KR1: 100% pedidos en sistema (actual: 72%) 🟡
  KR2: 0 procesos en papel (actual: 4 restantes) 🟡
  KR3: NPS empleados >7 (actual: 6.8) 🟡

─────────────────────────────────────────────────

VENTAS (Carlos - Gerente):
O1: Crecer cartera sur 20%
  KR1: 5 clientes nuevos (actual: 3) 🟢 60%
  KR2: Ticket promedio +15% (actual: +8%) 🟡
  [Vinculado auto → datos pedidos en tiempo real]

─────────────────────────────────────────────────

ALMACÉN (Pedro - Gerente):
O1: Conciliación perfecta 98%
  KR1: 98% entregas sin discrepancia (actual: 93%) 🟡
  [Vinculado auto → /audit/26 conciliación]
  
─────────────────────────────────────────────────

🔮 JOSAN (Vigilante Estratégico):
"OKR ventas KR2 (ticket promedio) en riesgo. 
Últimas 2 semanas bajó de +10% a +8%. Sugiero:
1. Promoción cross-sell aceites en zona sur
2. Revisar precios vs competencia en 3 productos
3. Reunión Carlos + Jose para ajuste táctico"

═══════════════════════════════════════════════════
```

**Esfuerzo:** 3-4 semanas

---

### M3 — Project Management / Tasks

**Benchmark:** Asana + Monday.com

```sql
CREATE TABLE proyectos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  responsable_id UUID REFERENCES empleados(id),
  estado TEXT CHECK (estado IN (
    'planificado', 'activo', 'pausado', 'completado', 'cancelado'
  )) DEFAULT 'planificado',
  fecha_inicio DATE,
  fecha_fin_estimada DATE,
  fecha_fin_real DATE,
  okr_vinculado_id UUID REFERENCES okrs(id),
  plantilla_origen TEXT,
  progreso_pct NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tareas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID REFERENCES proyectos(id),
  padre_tarea_id UUID REFERENCES tareas(id), -- subtareas
  
  titulo TEXT NOT NULL,
  descripcion TEXT,
  
  asignado_a UUID REFERENCES empleados(id),
  prioridad TEXT CHECK (prioridad IN ('baja', 'media', 'alta', 'urgente')),
  estado TEXT CHECK (estado IN (
    'pendiente', 'en_progreso', 'en_revision', 'completada', 'cancelada'
  )) DEFAULT 'pendiente',
  
  fecha_vencimiento DATE,
  
  -- Dependencias
  depende_de UUID[], -- IDs de tareas que deben completarse primero
  
  -- Recurrencia
  es_recurrente BOOLEAN DEFAULT false,
  recurrencia TEXT, -- 'diaria', 'semanal', 'mensual'
  
  -- Vinculación negocio
  entidad_tipo TEXT, -- 'pedido', 'cliente', 'ruta', 'producto'
  entidad_id UUID,
  
  -- Time tracking
  tiempo_estimado_min INTEGER,
  tiempo_real_min INTEGER,
  
  -- Checklist
  checklist JSONB,
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Plantillas de proyecto precargadas:**
- Onboarding cliente nuevo (15 tareas)
- Apertura ruta nueva (12 tareas)
- Cierre mensual contable (20 tareas → /audit/33)
- Alta empleado nuevo (18 tareas)
- Importación nueva (10 tareas → /audit/30)

**Vistas:** Kanban, Lista, Gantt, Calendario.

**Esfuerzo:** 3 semanas

---

### M4 — Knowledge Base / Wiki Interno

**Benchmark:** Notion + Confluence

```sql
CREATE TABLE wiki_articulos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  titulo TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  
  -- Jerarquía
  seccion TEXT NOT NULL,
  -- 'almacen', 'ventas', 'compras', 'rh', 'finanzas', 'general'
  padre_articulo_id UUID REFERENCES wiki_articulos(id),
  orden INTEGER DEFAULT 0,
  
  -- Contenido
  contenido_html TEXT NOT NULL,
  contenido_texto TEXT, -- para búsqueda
  
  -- Búsqueda semántica
  embedding vector(1536),
  
  -- Versionado
  version INTEGER DEFAULT 1,
  editado_por UUID,
  editado_en TIMESTAMPTZ,
  
  -- Metadata
  tags TEXT[],
  es_sop BOOLEAN DEFAULT false, -- Standard Operating Procedure
  es_onboarding BOOLEAN DEFAULT false,
  
  -- Permisos
  visibilidad TEXT CHECK (visibilidad IN (
    'publico', 'departamento', 'privado', 'solo_admin'
  )) DEFAULT 'publico',
  departamentos_permitidos TEXT[],
  
  publicado BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_wiki_embedding ON wiki_articulos 
  USING ivfflat (embedding vector_cosine_ops);
```

**Artículos iniciales propuestos:**
- Cómo recibir mercancía (SOP almacén)
- Cómo cargar camión (SOP almacén)
- Cómo crear pedido en campo (SOP vendedor)
- Cómo registrar entrega (SOP chofer)
- Cómo cerrar caja diaria (SOP contabilidad)
- Política de anticipos y préstamos (RH)
- Política de viáticos vendedores (RH)
- Glosario ALMASA (términos del negocio)

**Integración JOSAN:** "JOSAN, ¿cómo se registra una devolución?" → busca wiki → responde con artículo.

**Esfuerzo:** 2-3 semanas

---

### M5 — Helpdesk / Tickets Internos

**Benchmark:** Jira Service Desk + Freshdesk

```sql
CREATE TYPE prioridad_ticket AS ENUM ('baja', 'media', 'alta', 'critica');
CREATE TYPE estado_ticket AS ENUM (
  'nuevo', 'asignado', 'en_progreso', 'esperando_info',
  'resuelto', 'cerrado', 'reabierto'
);

CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_ticket TEXT UNIQUE NOT NULL, -- TK-2026-0001
  
  -- Solicitante
  solicitante_id UUID NOT NULL,
  solicitante_tipo TEXT, -- 'empleado', 'cliente_portal'
  
  -- Clasificación
  categoria TEXT CHECK (categoria IN (
    'ti_sistemas',        -- computadora, impresora, red
    'rh_nomina',          -- nómina, vacaciones, permisos
    'mantenimiento',      -- bodega, oficina, equipo
    'operaciones',        -- pedidos, rutas, inventario
    'cliente_reclamo',    -- reclamo de cliente externo
    'mejora_sugerencia',  -- ideas
    'otro'
  )),
  
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  
  prioridad prioridad_ticket DEFAULT 'media',
  estado estado_ticket DEFAULT 'nuevo',
  
  -- Asignación
  asignado_a UUID,
  departamento_responsable TEXT,
  
  -- SLA
  sla_horas INTEGER, -- según categoría
  fecha_limite TIMESTAMPTZ,
  sla_cumplido BOOLEAN,
  
  -- Resolución
  resolucion TEXT,
  resuelto_en TIMESTAMPTZ,
  tiempo_resolucion_min INTEGER,
  
  -- Satisfacción
  calificacion INTEGER CHECK (calificacion BETWEEN 1 AND 5),
  
  -- Adjuntos
  adjuntos_urls TEXT[],
  
  -- Vinculación
  entidad_tipo TEXT,
  entidad_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- SLA defaults por categoría
CREATE TABLE sla_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria TEXT UNIQUE NOT NULL,
  horas_respuesta INTEGER NOT NULL,
  horas_resolucion INTEGER NOT NULL,
  asignar_a_departamento TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO sla_config (categoria, horas_respuesta, horas_resolucion, asignar_a_departamento) VALUES
('ti_sistemas', 2, 24, 'sistemas'),
('rh_nomina', 4, 48, 'rh'),
('mantenimiento', 4, 72, 'almacen'),
('operaciones', 1, 8, 'operaciones'),
('cliente_reclamo', 1, 4, 'ventas'),
('mejora_sugerencia', 24, 168, 'admin');
```

**Integración chat:** Empleado en chat dice "la impresora no jala" → JOSAN detecta → "¿Quieres crear ticket de TI?" → [Sí] → ticket auto-creado.

**Esfuerzo:** 2 semanas

---

### M6 — Governance / Compliance / GRC

**Benchmark:** SAP GRC + ServiceNow GRC

```sql
CREATE TABLE politicas_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  categoria TEXT CHECK (categoria IN (
    'privacidad_datos',
    'anti_lavado',
    'codigo_conducta',
    'seguridad_informacion',
    'rh_general',
    'operaciones',
    'compras',
    'ventas',
    'vehiculos',
    'otro'
  )),
  contenido_html TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  vigente_desde DATE,
  vigente_hasta DATE,
  aprobada_por UUID,
  publicada BOOLEAN DEFAULT false,
  requiere_firma_empleado BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE firmas_politicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politica_id UUID NOT NULL REFERENCES politicas_empresa(id),
  empleado_id UUID NOT NULL REFERENCES empleados(id),
  firma_url TEXT,
  firmada_en TIMESTAMPTZ,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(politica_id, empleado_id)
);

CREATE TABLE auditorias_internas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  tipo TEXT CHECK (tipo IN (
    'inventario_ciego',    -- /audit/26
    'caja_sorpresa',       -- conteo caja sin aviso
    'documentos_empleados', -- expedientes completos
    'compliance_general',
    'seguridad_sistemas',
    'operaciones_almacen'
  )),
  fecha_programada DATE,
  fecha_ejecutada DATE,
  ejecutada_por UUID,
  hallazgos JSONB,
  acciones_correctivas JSONB,
  estado TEXT CHECK (estado IN (
    'programada', 'en_ejecucion', 'completada', 'acciones_pendientes'
  )),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Clasificación datos (DLP básico)
CREATE TABLE clasificacion_datos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla_nombre TEXT NOT NULL,
  campo_nombre TEXT NOT NULL,
  clasificacion TEXT CHECK (clasificacion IN (
    'publico', 'interno', 'confidencial', 'restringido'
  )),
  justificacion TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Dashboard Compliance Jose:**

```
═══════════════════════════════════════════════════
🛡️ GOVERNANCE - MAYO 2026
═══════════════════════════════════════════════════

📋 POLÍTICAS:
- 8 publicadas, 2 pendientes firma
- 28/30 empleados firmaron código conducta ✅
- 2 pendientes: Roberto, María (notificados)

🔍 AUDITORÍAS:
- Próxima: Inventario ciego 15/may (en 5 días)
- Última: Caja sorpresa 28/abr ✅ sin hallazgos

📊 COMPLIANCE SCORE: 92% 🟢

⚠️ ACCIONES PENDIENTES:
1. Roberto firmar código conducta (3 días pendiente)
2. Actualizar política privacidad LFPDPPP 2026
═══════════════════════════════════════════════════
```

**Esfuerzo:** 2-3 semanas

---

### M7 — Gastos y Viáticos (SAP Concur-like)

**Benchmark:** SAP Concur + Rydoo + Brex

Este módulo es para Carlos, Salvador, Martín, Venancio (vendedores en campo) y choferes con viáticos.

```sql
CREATE TABLE reportes_gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_reporte TEXT UNIQUE NOT NULL, -- RG-2026-0001
  
  empleado_id UUID NOT NULL REFERENCES empleados(id),
  
  -- Periodo
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  
  -- Totales
  total_gastos NUMERIC DEFAULT 0,
  total_aprobado NUMERIC DEFAULT 0,
  total_reembolsado NUMERIC DEFAULT 0,
  
  -- Estado workflow
  estado TEXT CHECK (estado IN (
    'borrador', 'enviado', 'aprobado_supervisor',
    'aprobado_contabilidad', 'reembolsado', 'rechazado'
  )) DEFAULT 'borrador',
  
  -- Aprobaciones
  aprobado_por_supervisor UUID,
  fecha_aprobacion_supervisor TIMESTAMPTZ,
  aprobado_por_contabilidad UUID,
  fecha_aprobacion_contabilidad TIMESTAMPTZ,
  
  -- Rechazo
  rechazado_por UUID,
  motivo_rechazo TEXT,
  
  -- Reembolso
  metodo_reembolso TEXT,
  fecha_reembolso DATE,
  comprobante_reembolso_url TEXT,
  
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE gastos_detalle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporte_id UUID NOT NULL REFERENCES reportes_gastos(id),
  
  fecha_gasto DATE NOT NULL,
  
  -- Categoría (SAP Concur categories)
  categoria TEXT CHECK (categoria IN (
    'gasolina',
    'casetas_peaje',
    'estacionamiento',
    'comida_desayuno',
    'comida_almuerzo',
    'comida_cena',
    'hospedaje',
    'transporte_publico',
    'taxi_uber',
    'papeleria',
    'telefonia',
    'muestras_producto',
    'regalo_cliente',
    'mantenimiento_vehiculo',
    'otro'
  )),
  
  descripcion TEXT NOT NULL,
  proveedor_nombre TEXT,
  
  -- Montos
  monto NUMERIC NOT NULL,
  moneda TEXT DEFAULT 'MXN',
  tipo_cambio NUMERIC, -- si USD
  monto_mxn NUMERIC,
  
  -- CFDI (México compliance)
  tiene_cfdi BOOLEAN DEFAULT false,
  cfdi_uuid TEXT,
  cfdi_xml_url TEXT,
  cfdi_rfc_emisor TEXT,
  
  -- Si no tiene CFDI
  ticket_foto_url TEXT,
  ticket_foto_hash TEXT,
  
  -- OCR IA
  datos_ocr JSONB,
  -- {monto_detectado: 250, fecha_detectada: '2026-05-10', 
  --  concepto: 'Gasolina BP Insurgentes'}
  ocr_confianza NUMERIC,
  
  -- GPS
  gps_lat NUMERIC,
  gps_lng NUMERIC,
  
  -- Vinculación operativa
  ruta_id UUID,
  cliente_visitado_id UUID,
  
  -- Aprobación individual
  aprobado BOOLEAN,
  motivo_rechazo_individual TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Políticas de gasto (SAP Concur policy engine)
CREATE TABLE politicas_gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria TEXT NOT NULL,
  
  monto_maximo_sin_aprobacion NUMERIC,
  monto_maximo_con_aprobacion NUMERIC,
  requiere_cfdi BOOLEAN DEFAULT true,
  requiere_foto_si_no_cfdi BOOLEAN DEFAULT true,
  
  -- Límites diarios
  limite_diario_comida NUMERIC, -- ej: $350/día
  limite_diario_gasolina NUMERIC,
  limite_hospedaje_noche NUMERIC, -- ej: $1,500/noche
  
  -- Reglas IA anomalía
  alerta_si_supera_promedio_pct NUMERIC DEFAULT 50,
  
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO politicas_gastos 
  (categoria, monto_maximo_sin_aprobacion, limite_diario_comida, limite_hospedaje_noche)
VALUES
('comida_desayuno', 150, 350, NULL),
('comida_almuerzo', 200, 350, NULL),
('comida_cena', 200, 350, NULL),
('hospedaje', NULL, NULL, 1500),
('gasolina', 500, NULL, NULL),
('casetas_peaje', 300, NULL, NULL);
```

**App Móvil Vendedor:**

```
┌───────────────────────────────────────────────┐
│ 💰 MIS GASTOS - Carlos                        │
├───────────────────────────────────────────────┤
│ REPORTE ACTUAL: Mayo 1-15                     │
│ Total: $4,250 MXN (8 gastos)                  │
│ Estado: Borrador                              │
│                                               │
│ ➕ NUEVO GASTO                                │
│                                               │
│ [📸 Tomar foto ticket]                        │
│                                               │
│ 🤖 OCR detectó:                               │
│ • Monto: $250.00                              │
│ • Fecha: 10/may/2026                          │
│ • Concepto: Gasolina BP Insurgentes           │
│ • CFDI: No detectado                          │
│                                               │
│ Categoría: [Gasolina ▼] ✓ auto                │
│ Cliente visitado: [Don Pepe ▼]                 │
│ Ruta: [Ruta Sur 10/may ▼]                     │
│                                               │
│ ⚠️ Sin CFDI. Foto ticket obligatoria.          │
│ ✅ Dentro de política ($250 < $500 max)        │
│                                               │
│ [Guardar gasto]                               │
│                                               │
│ ─── GASTOS DE HOY ────────────────            │
│ 08:30 Gasolina $250 (foto) ✓                  │
│ 10:15 Caseta Cuernavaca $180 (CFDI) ✓         │
│ 13:00 Comida $195 (CFDI) ✓                    │
│ 16:00 Caseta regreso $180 (CFDI) ✓            │
│                                               │
│ [Enviar reporte para aprobación]              │
└───────────────────────────────────────────────┘
```

**Conexiones:**
- `/audit/32` Anticipos: si empleado tiene anticipo activo, gasto se cruza
- `/audit/17` Flota: gastos gasolina alimentan TCO vehículo
- `/audit/14` Rutas: gastos vinculados a ruta alimentan costo logístico
- `/audit/29` Divisas: gastos USD con tipo cambio

**IA Vigilante Financiero:**
- "Carlos gastó 40% más en gasolina que promedio → investigar"
- "Salvador: 3 comidas sin CFDI este mes → recordar política"
- "Martín hospedaje $2,100 > límite $1,500 → requiere aprobación admin"

**Esfuerzo:** 4-5 semanas

---

### M8 — Portal Contadora Externa

**Benchmark:** QuickBooks Accountant Portal + Xero Partner

```sql
CREATE TABLE contadora_accesos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  contadora_id UUID NOT NULL REFERENCES contadores_externos(id),
  
  -- Permisos granulares
  puede_ver_ventas BOOLEAN DEFAULT true,
  puede_ver_compras BOOLEAN DEFAULT true,
  puede_ver_nomina BOOLEAN DEFAULT true,
  puede_ver_bancos BOOLEAN DEFAULT true,
  puede_ver_inventario BOOLEAN DEFAULT false,
  puede_ver_rutas BOOLEAN DEFAULT false,
  puede_descargar_xml BOOLEAN DEFAULT true,
  puede_descargar_reportes BOOLEAN DEFAULT true,
  puede_modificar_provisiones BOOLEAN DEFAULT true,
  puede_cerrar_periodo BOOLEAN DEFAULT false,
  
  ultimo_acceso TIMESTAMPTZ,
  total_logins INTEGER DEFAULT 0,
  
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE contadora_exportaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contadora_id UUID,
  
  periodo TEXT NOT NULL, -- 'mayo-2026'
  tipo_export TEXT CHECK (tipo_export IN (
    'xml_emitidos',
    'xml_recibidos',
    'balanza_comprobacion',
    'catalogo_cuentas',
    'polizas_contables',
    'estado_resultados',
    'balance_general'
  )),
  
  archivo_url TEXT,
  hash_sha256 TEXT,
  
  formato TEXT, -- 'xml_sat', 'excel', 'pdf', 'contpaqi', 'aspel'
  
  descargado BOOLEAN DEFAULT false,
  descargado_en TIMESTAMPTZ,
  
  generado_en TIMESTAMPTZ DEFAULT now()
);

-- Workflow mensual contadora
CREATE TABLE contadora_workflow_mensual (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo TEXT NOT NULL UNIQUE,
  
  -- Día 1-2: ALMASA cierra
  almasa_cierre_completado BOOLEAN DEFAULT false,
  almasa_cierre_fecha TIMESTAMPTZ,
  
  -- Día 3-5: Contadora valida
  contadora_revision_inicio TIMESTAMPTZ,
  contadora_ajustes JSONB, -- ajustes solicitados
  contadora_validado BOOLEAN DEFAULT false,
  contadora_validado_fecha TIMESTAMPTZ,
  
  -- Día 6: Envío SAT
  sat_enviado BOOLEAN DEFAULT false,
  sat_enviado_fecha TIMESTAMPTZ,
  sat_acuse_url TEXT,
  
  -- Comunicación
  notas_almasa TEXT,
  notas_contadora TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**UI Portal Contadora:**

```
═══════════════════════════════════════════════════
📊 PORTAL CONTADORA - MAYO 2026
═══════════════════════════════════════════════════

ESTADO CIERRE MAYO: EN PROCESO (día 3 de 7)

✅ ALMASA cerró operativo (2/jun)
🟡 TU TURNO: Validar y ajustar

─── EXPORTACIONES DISPONIBLES ─────────────────

📁 XMLs Emitidos Mayo: 234 facturas
   [Descargar ZIP] (formato CONTPAQi)

📁 XMLs Recibidos Mayo: 89 facturas proveedor
   [Descargar ZIP]

📊 Balanza Comprobación Mayo
   [Descargar Excel] [Descargar XML SAT]

📋 Catálogo Cuentas (Código Agrupador SAT)
   [Descargar XML]

📑 Pólizas Contables Auto-generadas
   [Descargar] (42 pólizas del mes)

─── ALERTAS ────────────────────────────────────

⚠️ 3 XMLs proveedor sin vincular a OC
⚠️ Diferencia cambiaria USD: -$4,200 MXN
✅ Provisiones sugeridas por sistema

─── COMUNICACIÓN ───────────────────────────────

💬 Chat con Jose:
[Escribir mensaje...]

Último: "Jose, necesito el XML de la factura F-892 
de Cargill, no aparece en la descarga."

Jose: "Lo busco y te lo subo hoy. Fue en USD."

═══════════════════════════════════════════════════

[Validar y cerrar periodo] 
(solo si todos los XMLs vinculados)
═══════════════════════════════════════════════════
```

**Esfuerzo:** 3-4 semanas

---

## 4. Ventajas Competitivas (15)

| # | Ventaja | Stack tradicional | ALMASA-OS |
|---|---------|-------------------|-----------|
| 1 | Sistema único | 5 apps separadas | 1 integrado |
| 2 | Datos negocio en chat | Copiar-pegar | Nativo |
| 3 | IA contextual | Cada app tiene su IA | JOSAN sabe todo |
| 4 | OKRs ↔ datos reales | Manual actualizar | Auto-vinculado |
| 5 | Wiki busca semántica | Búsqueda básica | pgvector |
| 6 | Tickets desde chat | Cambiar app | 1 click |
| 7 | Gastos con OCR CFDI | Genérico | MX nativo |
| 8 | Contadora integrada | Email/USB | Portal dedicado |
| 9 | WhatsApp bridge | No existe | Bidireccional |
| 10 | Compliance auditado | Manual | Automático |
| 11 | Anti-robo en chat | No | Audit trail |
| 12 | Viáticos ↔ rutas | Separados | Vinculados |
| 13 | Tasks ↔ OKRs | Manual | Automático |
| 14 | Costo | $36K/año | $0 |
| 15 | Onboarding wiki | Días | Horas |

---

## 5. Arquitectura Técnica

**Tablas Supabase nuevas:** ~15 tablas principales + ~10 de soporte.

**RLS:** Cada tabla con policies por rol. Chat: solo participantes ven mensajes. Wiki: visibilidad configurable. Gastos: empleado ve los suyos, admin ve todos.

**Edge Functions nuevas:**
- `whatsapp-webhook` — recibe mensajes WhatsApp Business
- `ocr-recibo` — procesa foto ticket con Claude Vision
- `okr-checkin-cron` — genera check-ins quincenales
- `wiki-embedding` — genera embeddings pgvector
- `ticket-autoasign` — asigna tickets por categoría

**Storage buckets nuevos:**
- `chat-archivos` (ya existe, extender)
- `gastos-recibos` — fotos tickets + XMLs
- `wiki-archivos` — adjuntos artículos
- `politicas-documentos` — PDFs políticas

**Realtime:** Chat usa Supabase Realtime (ya existe). Extender a tickets + tareas.

**Cron jobs:**
- OKR check-in reminder: quincenal
- SLA tickets: cada hora
- Anomalías gastos: diario
- Wiki embeddings: al guardar artículo

---

## 6. Roadmap Implementación

| Mes | Módulo | Entrega |
|-----|--------|---------|
| 1 | M1 + M4 | Chat extendido + Wiki básico (foundation colaboración) |
| 2 | M2 + M3 | OKRs + Tasks (foundation gestión) |
| 3 | M5 + M6 | Helpdesk + Governance (foundation compliance) |
| 4 | M7 + M8 | Gastos/Viáticos + Portal Contadora (foundation finanzas) |
| 5 | Integración | JOSAN contextual, IA anomalías, cross-module |
| 6 | WhatsApp | WhatsApp Business API + Concur-like completo |

**Tiempo total:** 6 meses  
**Inversión:** $0 software + WhatsApp Business API (~$50/mes) + pgvector (ya en Supabase)

---

## 7. KPIs de Éxito

| KPI | Actual | Meta 6 meses |
|-----|--------|-------------|
| Comunicación crítica en sistema | 0% | 100% |
| Empleados con OKRs activos | 0% | 90% |
| Resolución promedio tickets | N/A | < 24 horas |
| Gastos vendedores con CFDI | ~30% | 100% |
| Cierre mes contable | 5-10 días | 1-2 días |
| Artículos wiki | 0 | 50+ |
| Políticas firmadas | 0% | 100% |
| WhatsApp en sistema | 0% | 80% mensajes |

---

## 8. Gaps Cubiertos

| Gap | Módulo | Estado |
|-----|--------|--------|
| A — Chat + WhatsApp | M1 | ✅ Diseñado |
| B — OKRs + Balanced Scorecard | M2 | ✅ Diseñado |
| C — Project Management / Tasks | M3 | ✅ Diseñado |
| D — Knowledge Base / Wiki | M4 | ✅ Diseñado |
| E — Helpdesk / Tickets | M5 | ✅ Diseñado |
| H — Governance / Compliance | M6 | ✅ Diseñado |
| CC — Gastos viáticos (Concur-like) | M7 | ✅ Diseñado |
| LL — Portal Contadora Externa | M8 | ✅ Diseñado |

---

## 9. Conexión con Biblia v1.1

### Principios aplicados:
- **#1 Privacidad por rol:** chat por permisos, gastos solo los tuyos
- **#2 AirDrop digital:** tareas fluyen entre roles sin papel
- **#3 Continuidad operativa:** wiki documenta todo, nadie es insustituible
- **#5 Utilidad en tres niveles:** gastos alimentan N2 y N3
- **#9 Ventaja por Integración:** 8 módulos en 1 sistema
- **#10 Users Before Perfection:** MVP por mes, iterar

### Conexiones cruzadas:
- /audit/14 Rutas (gastos vinculados a ruta)
- /audit/15 RH (tickets RH + onboarding wiki)
- /audit/17 Flota (gastos combustible → TCO)
- /audit/19 Dashboard (OKRs como KPIs ejecutivos)
- /audit/20 Tesorería (reembolsos en flujo caja)
- /audit/26 Sistema Inteligente (chat auditado → anti-robo)
- /audit/29 Divisas (gastos USD)
- /audit/32 Anticipos (cruce con viáticos)
- /audit/33 Cierres (portal contadora + workflow)
- /audit/35 AI Moderna (JOSAN en chat + wiki + tickets)

---

## 10. Recomendación final

8 módulos de gestión empresarial integrados nativamente al ERP. Sin Slack + Asana + Notion + Jira + Concur separados.

**Ahorro vs stack tradicional:** $36,720/año (30 usuarios × $102/mes)
**Inversión ALMASA-OS:** $0 software + $50/mes WhatsApp API

**La diferencia:** En Slack, chateas sobre el pedido. En ALMASA-OS, chateas DENTRO del pedido. En Asana, creas tarea genérica. En ALMASA-OS, la tarea NACE de la ruta. En Concur, capturas gasto sin contexto. En ALMASA-OS, el gasto SABE a qué ruta y cliente pertenece.

ALMASA opera como Inditex, no como SAP.

---

*ALMASA-OS · Gestión Empresarial y Colaboración · v1.0*  
*Generado el 10 de mayo de 2026*  
*Slack + Asana + Notion + Jira + Concur, integrados con tu negocio.*
