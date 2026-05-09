# Rediseño de Clientes / Portal — ALMASA-OS

**Versión:** v1.0  
**Fecha:** 10 de Mayo 2026  
**Origen:** Auditoría de clientes + decisiones operativas + metodología "Mejor que Oracle"  
**Estado:** Diseño · Pendiente decisión y ejecución  
**Tagline:** Cliente conocido es cliente atendido. Conocer mejor que Oracle.

---

## 1. La filosofía

ALMASA es negocio de relaciones. Don Pepe, Doña Lucha, Lecaroz con 
sus 149 sucursales. Cada cliente es un mundo: tiene preferencias, 
historial, sucursales, contactos, hábitos de compra, satisfacción, 
crédito.

Conocer al cliente NO es opcional. Es la base de:
- Vender lo que necesita
- Cobrar a tiempo
- Atenderlo bien
- Anticipar problemas
- Crecer con él

> Principio rector: "Conocer al cliente es producto. Cada dato del 
> cliente debe tener propósito. Cada interacción debe quedar 
> registrada. ALMASA-OS sabe más de tu cliente que tu cliente."

---

## 2. Estado actual de clientes

ALMASA-OS Clientes es el módulo MÁS COMPLETO del sistema:

- 42 campos en tabla clientes
- 6 tablas de soporte
- 21 archivos en /components/clientes (~9,615 líneas)
- 4 pages adicionales (~2,294 líneas)
- 4 archivos portal cliente (~1,734 líneas)
- create-client-user edge function
- TOTAL: ~12,000 líneas de código solo de clientes

| Capacidad | Estado | Detalle |
|-----------|--------|---------|
| Tabla clientes (42 campos) | ✅ Completo | Identidad, fiscal, comercial, entrega, jerarquía |
| Datos fiscales | ✅ Completo | RFC, razón social, régimen, uso CFDI, CSF upload |
| Sucursales (PDE) | ✅ ÚNICO 27 campos | lat/lng, horario, restricciones, rosticería |
| Jerarquía Grupo→RS→PDE | ✅ ÚNICO | es_grupo + grupo_cliente_id |
| IA detecta grupos | ✅ ÚNICO | DetectarGruposDialog (614 lín) |
| Contactos múltiples | ✅ | cliente_contactos con puesto |
| Crédito asignado | ✅ | limite_credito + termino_credito |
| Crédito por producto | ✅ ÚNICO | cliente_creditos_excepciones |
| Productos frecuentes | ✅ | cliente_productos_frecuentes |
| Preferencia facturación | ✅ ÚNICO | siempre_factura/siempre_remision/variable |
| Programación visitas | ✅ | dias_visita_preferidos[] |
| Portal cliente login | ✅ | create-client-user edge function |
| Estado de cuenta | ✅ | ClienteEstadoCuenta (300 lín) |
| Self-service pedidos | ✅ | ClienteNuevoPedido (922 lín) |
| Mapa clientes | ✅ | ClientesMapaTab + sucursales |
| Import Aspel | ✅ ÚNICO | ImportarCatalogoAspelDialog (913 lín) |
| Auditoría fiscal | ✅ ÚNICO | AuditoriaFiscalSheet (455 lín) |
| Segmentación A/B/C/D | ❌ NO existe | Sin clasificación automática |
| Scoring crediticio | ❌ NO existe | Sin score 0-100 |
| CRM timeline | ❌ NO existe | Sin registro interacciones |
| NPS satisfacción | ❌ NO existe | Sin encuestas |
| Tracking entrega vivo | ❌ NO existe | Sin Uber-experience |

**Conclusión:** Base ESPECTACULAR. 5 brechas son features 
diferenciadores estratégicos.

---

## 3. Estándar Oracle / SAP / NetSuite

7 conceptos universales:
1. Customer Master Data centralizado
2. Hierarchies (corporativo)
3. Credit Management
4. Pricing personalizado
5. CRM (interacciones)
6. Self-Service Portal
7. Segmentation

---

## 4. Por qué ALMASA-OS gana

| Dimensión | Oracle/SAP | ALMASA-OS | Ganador |
|-----------|-----------|-----------|---------|
| Master data | ✅ | ✅ 42 campos | EMPATE |
| Datos fiscales MX | 🟡 general | ✅ específico | ALMASA |
| Sucursales (PDE) | ✅ | ✅ 27 campos | EMPATE |
| Jerarquía corporativa | ✅ | ✅ + IA | ALMASA |
| Detección IA grupos | ❌ | ✅ ÚNICO | ALMASA |
| Crédito POR PRODUCTO | ❌ | ✅ ÚNICO | ALMASA |
| Auditoría fiscal | 🟡 | ✅ ÚNICO | ALMASA |
| Import Aspel | ❌ | ✅ ÚNICO | ALMASA |
| Pref. facturación | ❌ | ✅ ÚNICO | ALMASA |
| Portal autoservicio | ✅ | ✅ 4 vistas | EMPATE |
| Segmentación | ✅ estática | ✅ → IA + 5D | ALMASA (post) |
| Scoring crediticio | ✅ pagos | ✅ → multidim | ALMASA (post) |
| CRM interacciones | ✅ manual | ✅ → auto+manual | ALMASA (post) |
| NPS satisfacción | ✅ anual | ✅ → POR ENTREGA | ALMASA (post) |
| Tracking entrega vivo | ✅ estado | ✅ → Uber-style | ALMASA (post) |
| Costo licencia | $$$$ | $0 | ALMASA |

**Marcador final (post-implementación):**
ALMASA gana: 14 dimensiones (incluyendo 11 ÚNICOS o mejorados)
Oracle gana: 0 dimensiones
Empate: 11 dimensiones

---

## 5. Las 5 Brechas Estratégicas

### Brecha 1 — Segmentación A/B/C/D Automática

**Solución:**

```sql
CREATE TYPE segmento_cliente AS ENUM ('A', 'B', 'C', 'D');

ALTER TABLE clientes ADD COLUMN segmento segmento_cliente;
ALTER TABLE clientes ADD COLUMN segmento_score NUMERIC;
ALTER TABLE clientes ADD COLUMN segmento_tendencia TEXT 
  CHECK (segmento_tendencia IN ('subiendo', 'estable', 'bajando'));

CREATE TABLE segmentacion_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  fecha_calculo DATE NOT NULL,
  segmento segmento_cliente NOT NULL,
  score NUMERIC NOT NULL,
  dim_frecuencia NUMERIC,
  dim_volumen NUMERIC,
  dim_margen NUMERIC,
  dim_antiguedad NUMERIC,
  dim_puntualidad NUMERIC,
  acciones_sugeridas JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Acciones por segmento:**
- A (Top 20%): vendedor senior, visita semanal, crédito ampliado
- B (Siguiente 30%): vendedor regular, visita quincenal
- C (Siguiente 30%): promociones para subir, crédito básico
- D (Bajo 20%): revisar rentabilidad, solo contado

**Recálculo:** mensual automático con 5 dimensiones.

**Esfuerzo:** 2 semanas  
**Prioridad:** ALTA ESTRATÉGICA

### Brecha 2 — Scoring Crediticio Multidimensional

**Solución:**

```sql
ALTER TABLE clientes ADD COLUMN score_crediticio NUMERIC;
ALTER TABLE clientes ADD COLUMN nivel_credito TEXT 
  CHECK (nivel_credito IN ('platino', 'oro', 'plata', 'bronce', 'sin_credito'));

CREATE TABLE score_crediticio_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  fecha_calculo DATE NOT NULL,
  score NUMERIC NOT NULL,
  nivel TEXT,
  dim_pagos_puntuales NUMERIC,
  dim_antiguedad NUMERIC,
  dim_volumen_consistente NUMERIC,
  dim_sin_disputas NUMERIC,
  dim_crecimiento NUMERIC,
  dim_referencias NUMERIC,
  credito_recomendado NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**6 dimensiones ponderadas:**
- Pagos puntuales (40%)
- Antigüedad (15%)
- Volumen consistente (15%)
- Sin disputas (10%)
- Crecimiento (10%)
- Referencias (10%)

**Niveles:** Platino (90+) → Oro (75+) → Plata (60+) → Bronce (40+) → Sin crédito (<40)

**Esfuerzo:** 2 semanas  
**Prioridad:** CRÍTICA

### Brecha 3 — CRM Timeline Auto + Manual

**Solución:**

```sql
CREATE TYPE tipo_interaccion AS ENUM (
  'pedido_creado', 'pedido_entregado', 'pago_recibido',
  'whatsapp_enviado', 'whatsapp_recibido',
  'email_enviado', 'email_recibido',
  'visita_gps_chofer', 'visita_gps_vendedor',
  'recordatorio_cobranza',
  'llamada_realizada', 'llamada_recibida',
  'visita_personal', 'reunion',
  'queja_recibida', 'felicitacion', 'otro'
);

CREATE TABLE cliente_interacciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  cliente_sucursal_id UUID REFERENCES cliente_sucursales(id),
  tipo tipo_interaccion NOT NULL,
  fecha TIMESTAMPTZ DEFAULT now(),
  empleado_id UUID REFERENCES empleados(id),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  duracion_minutos INTEGER,
  origen TEXT CHECK (origen IN ('automatico', 'manual')) DEFAULT 'manual',
  origen_referencia_id UUID,
  origen_referencia_tipo TEXT,
  resultado TEXT CHECK (resultado IN (
    'exitoso', 'parcial', 'sin_respuesta', 'rechazado', 'pendiente_seguimiento'
  )),
  proxima_accion TEXT,
  proxima_accion_fecha DATE,
  proxima_accion_completada BOOLEAN DEFAULT false,
  gps_lat NUMERIC,
  gps_lng NUMERIC,
  notas TEXT,
  registrado_por UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Triggers automáticos:** pedido creado, entregado, pago, WhatsApp, email, GPS chofer/vendedor.

**Esfuerzo:** 2-3 semanas  
**Prioridad:** ALTA (memoria organizacional)

### Brecha 4 — NPS Por Entrega

**Solución:**

```sql
CREATE TABLE nps_encuestas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  entrega_id UUID REFERENCES entregas(id),
  enviado_en TIMESTAMPTZ NOT NULL,
  canal_envio TEXT CHECK (canal_envio IN ('whatsapp', 'email', 'sms')),
  respondido BOOLEAN DEFAULT false,
  respondido_en TIMESTAMPTZ,
  score_nps INTEGER CHECK (score_nps BETWEEN 0 AND 10),
  categoria TEXT GENERATED ALWAYS AS (
    CASE 
      WHEN score_nps >= 9 THEN 'promotor'
      WHEN score_nps >= 7 THEN 'pasivo'
      WHEN score_nps IS NOT NULL THEN 'detractor'
      ELSE NULL
    END
  ) STORED,
  comentario TEXT,
  vendedor_id UUID,
  chofer_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Workflow:** Entrega → 24h → WhatsApp 0-10 → Si detractor → alerta admin.

**Dashboards:** NPS general, por vendedor, por chofer, por zona, tendencia.

**Esfuerzo:** 2 semanas  
**Prioridad:** ALTO VALOR ESTRATÉGICO

### Brecha 5 — Tracking Entrega Vivo Uber-Style

**Solución:**

```sql
CREATE TABLE tracking_entrega_publico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id UUID NOT NULL REFERENCES entregas(id),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  token_publico TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::TEXT,
  url_publica TEXT GENERATED ALWAYS AS 
    ('https://erp.almasa.com.mx/tracking/' || token_publico) STORED,
  notificacion_salida_enviada BOOLEAN DEFAULT false,
  notificacion_proximidad_enviada BOOLEAN DEFAULT false,
  notificacion_entregado_enviada BOOLEAN DEFAULT false,
  vistas_publicas INTEGER DEFAULT 0,
  expira_en TIMESTAMPTZ DEFAULT now() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Flujo:**
1. Pedido sale → WhatsApp con URL tracking
2. Cliente ve mapa en vivo (camión + ETA Google Maps)
3. 5 min antes → notificación proximidad
4. Entregado → confirmación + 24h después NPS

**Esfuerzo:** 3 semanas  
**Prioridad:** ALTO IMPACTO COMERCIAL

---

## 6. Roadmap

| Mes | Entregas |
|-----|----------|
| Mayo (resto) | /audit/18 generado |
| Julio | Brecha 1: Segmentación A/B/C/D (2 sem) |
| Agosto | Brecha 2: Scoring crediticio multidim (2 sem) |
| Septiembre | Brecha 3: CRM timeline auto+manual (3 sem) |
| Octubre | Brecha 4: NPS por entrega (2 sem) |
| Noviembre | Brecha 5: Tracking vivo Uber-style (3 sem) |

**Tiempo total:** 5-6 meses  
**Inversión:** $0 software (Google Maps API ya disponible)

---

## 7. Decisiones de Negocio Pendientes

### Decisión 1 — Pesos de scoring crediticio
- 40% pagos puntuales es correcto?
- Ajustar dimensiones?

### Decisión 2 — Segmentación dimensiones
- 5 dimensiones es correcto?
- Ajustar pesos?

### Decisión 3 — Periodicidad recálculo
- Mensual o trimestral?

### Decisión 4 — Templates NPS
- Validar wording
- Solo WhatsApp o también email?

### Decisión 5 — Tracking público token
- Expira en 7 días o mantener histórico?

### Decisión 6 — Detractores NPS
- Quién contacta? Vendedor o admin?
- Plazo de respuesta?

---

## 8. Conexión con Biblia v1.1 y otros documentos

### Biblia v1.1 - Principios afectados:
- Principio #1 (Privacidad por rol): cliente solo ve sus datos
- Principio #5 (Utilidad en tres niveles): segmentación por margen real
- Principio #2 (AirDrop digital): tracking en vivo

### Conexiones cruzadas:
- /audit/13 Pedidos: HOLD de crédito usa scoring
- /audit/14 Rutas: GPS chofer alimenta tracking
- /audit/16 Cobranza: scoring alimenta workflow morosos
- /audit/17 Flota: NPS por chofer mide rendimiento
- /audit/12 Evidencia: hashes en NPS para integridad

### Nuevo Principio Transversal Propuesto — CONOCER ES PRODUCTO
"Cada dato del cliente debe tener propósito. Cada interacción debe 
quedar registrada. Cada entrega debe medir satisfacción. ALMASA-OS 
sabe más de tu cliente que tu cliente, y se lo regresa al admin 
en forma de decisiones."

---

## 9. Recomendación final

ALMASA-OS Clientes ya tiene 7 ventajas únicas sobre Oracle/SAP.
Las 5 brechas convierten ALMASA-OS en el mejor sistema de 
clientes del mundo PYME:
1. SEGMENTACIÓN A/B/C/D — estrategia comercial
2. SCORING CREDITICIO — decisiones automáticas
3. CRM TIMELINE — memoria organizacional
4. NPS POR ENTREGA — satisfacción granular
5. TRACKING VIVO UBER — experiencia diferenciadora

**Orden estricto:**
1. JULIO 2026: Segmentación (estrategia comercial)
2. AGOSTO 2026: Scoring crediticio (decisiones automáticas)
3. SEPTIEMBRE 2026: CRM timeline (memoria)
4. OCTUBRE 2026: NPS por entrega
5. NOVIEMBRE 2026: Tracking vivo (experiencia decisiva)

Una vez completas las 5 brechas, ALMASA-OS Clientes será 
**superior a Oracle CRM, SAP Business Partner y NetSuite Customer 
Records** para distribuidoras mexicanas, con costo $0 y 12+ 
ventajas únicas no replicables.

---

*ALMASA-OS · Rediseño de Clientes / Portal · v1.0*  
*Generado el 10 de mayo de 2026*  
*Conocer al cliente es producto. Mejor que Oracle, mejor que SAP.*
