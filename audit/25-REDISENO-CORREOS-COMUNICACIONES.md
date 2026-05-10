# Rediseño de Correos / Comunicaciones — ALMASA-OS

**Versión:** v1.0  
**Fecha:** 10 de Mayo 2026  
**Origen:** Auditoría correos + decisiones operativas + visión "mejor que Hubspot"  
**Estado:** Diseño · Pendiente decisión y ejecución  
**Tagline:** El email es ventas. IA lo procesa por nosotros.

---

## 1. La filosofía

ALMASA recibe 60%+ de pedidos por email. Sin sistema de correos 
robusto, ALMASA pierde ventas, demora respuestas, comete errores.

> Principio rector: "El email es ventas. Cada minuto de retraso 
> es venta perdida. IA procesa lo repetitivo, humanos deciden lo 
> importante."

---

## 2. Estado actual de correos

ALMASA-OS Correos es uno de los módulos MÁS GRANDES del sistema:

**4 tablas:** gmail_cuentas, correos_enviados, pedidos_acumulativos + detalles, cotizaciones_envios

**15 componentes correos (~8,317 líneas):**
- ProcesarPedidoDialog (1,886) — IA parser email→pedido
- BandejaEntrada (1,379) — inbox unificado multi-cuenta
- PedidosAcumulativosManager (1,255) — múltiples emails→1 pedido
- VincularFacturaDialog (775) — CFDI proveedor
- EmailDetailView (622), VerificacionRapidaLecaroz (517)
- ComposeEmailDialog (511), GmailPermisosManager (308)
- EmailListView (275), TrashListView (188)
- GmailFirmasManager (177), GmailSearchBar (152)

**4 componentes correos-v2 (~975 líneas):**
- AccountRail, ContextPanel, EmailList, ThreadView

**11 Edge Functions email:**
- gmail-api, gmail-auth, gmail-callback
- parse-order-email (IA), parse-excel-order (IA)
- parse-cfdi-xml, parse-csf
- send-invoice-email, send-order-authorized-email
- send-delivery-confirmation, send-welcome-email + 4 más

| Capacidad | Estado | Detalle |
|-----------|--------|---------|
| Gmail OAuth multi-cuenta | ✅ | Tokens, refresh, propósito |
| Inbox unificado UI | ✅ | BandejaEntrada (1,379 lín) |
| Correos V2 con threads | ✅ | 4 componentes (975 lín) |
| IA email→pedido | ✅ ÚNICO | parse-order-email |
| IA Excel→pedido | ✅ ÚNICO | parse-excel-order |
| Pedidos acumulativos | ✅ ÚNICO | Múltiples emails→1 pedido |
| Componer/responder | ✅ | ComposeEmailDialog |
| Firmas por cuenta | ✅ | GmailFirmasManager |
| Permisos por usuario | ✅ | GmailPermisosManager |
| Búsqueda | ✅ | GmailSearchBar |
| Adjuntos envío | ✅ | OCs, facturas, cotizaciones |
| CFDI XML vinculación | ✅ ÚNICO MX | VincularFacturaDialog |
| Flujo Lecaroz especial | ✅ ÚNICO | Verificación Rápida |
| Papelera | ✅ | TrashListView |
| 11 edge functions | ✅ | API + parsers + senders |
| Categorización auto IA | ❌ NO existe | Sin clasificación |
| Auto-vinculación cliente | 🟡 Parcial | Solo en parseo |
| Push notif nuevo email | ❌ NO existe | Sin real-time |
| Templates respuesta | 🟡 Básico | Firmas sí, templates no |
| Metrics tiempo respuesta | ❌ NO existe | Sin medición |

**Conclusión:** Módulo EXTRAORDINARIO con 5 ÚNICOS. 5 brechas lo elevan a imbatible.

---

## 3. Estándar Hubspot / Salesforce

5 conceptos universales:
1. Inbox unificado
2. Auto-categorización IA
3. Templates / snippets
4. Auto-vinculación contacto
5. Metrics SLA

---

## 4. Por qué ALMASA-OS gana

| Dimensión | Hubspot/Sales | ALMASA-OS | Ganador |
|-----------|---------------|-----------|---------|
| Gmail OAuth multi | ✅ | ✅ | EMPATE |
| Inbox unificado | ✅ | ✅ | EMPATE |
| IA Email→Pedido | ❌ | ✅ ÚNICO | ALMASA |
| IA Excel→Pedido | ❌ | ✅ ÚNICO | ALMASA |
| Pedidos acumulativos | ❌ | ✅ ÚNICO | ALMASA |
| CFDI XML vinculación | ❌ | ✅ ÚNICO MX | ALMASA |
| Verificación cliente | 🟡 | ✅ ÚNICO | ALMASA |
| 11 edge functions | 🟡 | ✅ | ALMASA |
| Categorización auto IA | ✅ | ❌ → planeado | EMPATE (post) |
| Templates respuesta | ✅ | 🟡 → planeado | EMPATE (post) |
| Metrics tiempo respuesta | ✅ | ❌ → planeado | EMPATE (post) |
| Costo licencia | $$$$ | $0 | ALMASA |

**Marcador post-implementación:**
ALMASA gana: 7 dimensiones (6 ÚNICOS + costo)
Hubspot gana: 0
Empate: 14

---

## 5. Las 5 Brechas

### Brecha 1 — Categorización Automática IA

```sql
CREATE TYPE categoria_email AS ENUM (
  'pedido_cliente', 'cobranza_pago', 'pregunta_producto',
  'cotizacion_solicitada', 'factura_proveedor', 'queja_reclamo',
  'consulta_general', 'spam_promocional', 'otro'
);

CREATE TABLE emails_categorizados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_message_id TEXT UNIQUE NOT NULL,
  gmail_cuenta_id UUID REFERENCES gmail_cuentas(id),
  subject TEXT,
  from_email TEXT,
  from_nombre TEXT,
  fecha_recibido TIMESTAMPTZ,
  preview TEXT,
  categoria_ia categoria_email,
  confianza_pct NUMERIC,
  factores_clave TEXT[],
  categoria_manual categoria_email,
  categorizado_por UUID,
  cliente_id UUID REFERENCES clientes(id),
  proveedor_id UUID,
  asignado_a UUID,
  asignado_en TIMESTAMPTZ,
  leido BOOLEAN DEFAULT false,
  respondido BOOLEAN DEFAULT false,
  archivado BOOLEAN DEFAULT false,
  fecha_primera_apertura TIMESTAMPTZ,
  fecha_respuesta TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Edge function `classify-email-ia`** con Claude API: clasifica en 9 categorías con confianza %.

**Auto-asignación:** pedido→vendedor, cobranza→equipo, queja→admin.

**Esfuerzo:** 1-2 semanas  
**Prioridad:** ALTA

### Brecha 2 — Auto-Vinculación Universal Cliente

```sql
CREATE TABLE cliente_correos_indexed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  email TEXT NOT NULL,
  tipo TEXT CHECK (tipo IN ('principal', 'compras', 'cobranza', 'general', 'otro')),
  contacto_nombre TEXT,
  vigente BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_cliente_correos_email 
  ON cliente_correos_indexed(LOWER(email)) WHERE vigente = true;

CREATE OR REPLACE FUNCTION vincular_email_a_cliente(p_email_remitente TEXT)
RETURNS UUID AS $$
DECLARE v_cliente_id UUID;
BEGIN
  -- 1. Match exacto en cliente_correos_indexed
  SELECT cliente_id INTO v_cliente_id
  FROM cliente_correos_indexed WHERE LOWER(email) = LOWER(p_email_remitente) AND vigente LIMIT 1;
  -- 2. Match en clientes.email
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM clientes WHERE LOWER(email) = LOWER(p_email_remitente) LIMIT 1;
  END IF;
  -- 3. Match por dominio
  IF v_cliente_id IS NULL THEN
    SELECT cliente_id INTO v_cliente_id FROM cliente_correos_indexed
    WHERE LOWER(email) LIKE '%@' || split_part(p_email_remitente, '@', 2) AND vigente LIMIT 1;
  END IF;
  RETURN v_cliente_id;
END;
$$ LANGUAGE plpgsql STABLE;
```

**Trigger automático** en cada email entrante. Alimenta CRM timeline (/audit/18).

**Esfuerzo:** 3-5 días  
**Prioridad:** IMPORTANTE

### Brecha 3 — Push Notification Nuevo Email Relevante

```sql
CREATE TABLE notificaciones_email_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  notificar_pedidos BOOLEAN DEFAULT true,
  notificar_cobranza BOOLEAN DEFAULT true,
  notificar_quejas BOOLEAN DEFAULT true,
  notificar_proveedores BOOLEAN DEFAULT false,
  notificar_clientes_segmento_a BOOLEAN DEFAULT true,
  notificar_clientes_especificos UUID[],
  palabras_urgente TEXT[] DEFAULT ARRAY['urgente', 'emergencia', 'reclamo'],
  notificar_solo_horario_laboral BOOLEAN DEFAULT true,
  hora_inicio TIME DEFAULT '08:00',
  hora_fin TIME DEFAULT '18:00',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Edge function `notify-new-email`:** Determina destinatarios push según categoría + configuración personal. Reusa Capacitor FCM/APNs existente.

**Esfuerzo:** 1 semana  
**Prioridad:** IMPORTANTE

### Brecha 4 — Templates Respuesta Rápida

Reutiliza tabla `plantillas_documentos` de /audit/24. 8 tipos email-respuesta:
- Confirmación pedido, cotización adjunta, pedido sale mañana
- Pago recibido, factura enviada, disculpa demora
- Seguimiento, bienvenida cliente

**UI:** Botón "Insertar template" en ComposeEmailDialog con variables auto-llenadas.

**Esfuerzo:** 1 semana  
**Prioridad:** ALTA EFICIENCIA

### Brecha 5 — Metrics Tiempo Respuesta

```sql
CREATE VIEW vw_metrics_email_diario AS
SELECT 
  asignado_a AS empleado_id,
  DATE(fecha_recibido) AS fecha,
  categoria_ia AS categoria,
  COUNT(*) AS emails_recibidos,
  COUNT(*) FILTER (WHERE respondido) AS respondidos,
  AVG(EXTRACT(EPOCH FROM (fecha_respuesta - fecha_recibido))/60) AS min_promedio_respuesta,
  COUNT(*) FILTER (WHERE respondido AND fecha_respuesta < fecha_recibido + INTERVAL '1 hour') AS respuestas_en_1hr,
  COUNT(*) FILTER (WHERE NOT respondido AND fecha_recibido < now() - INTERVAL '4 hours') AS sin_responder_4hrs
FROM emails_categorizados
GROUP BY 1, 2, 3;

CREATE VIEW vw_ranking_atencion_email AS
SELECT 
  empleado_id,
  SUM(emails_recibidos) AS total_emails,
  SUM(respondidos) AS total_respondidos,
  ROUND(SUM(respondidos)::NUMERIC / SUM(emails_recibidos) * 100, 1) AS tasa_respuesta_pct,
  AVG(min_promedio_respuesta) AS min_promedio_respuesta,
  ROUND(
    (SUM(respondidos)::NUMERIC / SUM(emails_recibidos) * 50) +
    (SUM(respuestas_en_1hr)::NUMERIC / NULLIF(SUM(respondidos), 0) * 50), 1
  ) AS score_atencion
FROM vw_metrics_email_diario
WHERE fecha > CURRENT_DATE - INTERVAL '30 days'
GROUP BY 1
ORDER BY score_atencion DESC;
```

**Dashboard:** Ranking vendedores, SLA 1hr/4hr, emails sin atender, score atención.

**Esfuerzo:** 1 semana  
**Prioridad:** ALTA COMERCIAL

---

## 6. Roadmap

| Mes | Entregas |
|-----|----------|
| Mayo (resto) | /audit/25 generado |
| Septiembre | Brecha 1: Categorización IA (1-2 sem) |
| Septiembre | Brecha 2: Auto-vinculación universal (3-5 días) |
| Octubre | Brecha 3: Push notif nuevo email (1 sem) |
| Octubre | Brecha 4: Templates respuesta (1 sem) |
| Noviembre | Brecha 5: Metrics tiempo respuesta (1 sem) |

**Tiempo total:** 5-6 semanas  
**Inversión:** $50-100/mes Claude API

---

## 7. Decisiones de Negocio Pendientes

### Decisión 1 — Categorías iniciales
- 9 categorías suficientes?
- Necesita "interno" (entre empleados)?

### Decisión 2 — Asignación automática
- pedido_cliente → vendedor del cliente
- cobranza_pago → quién?
- queja_reclamo → admin o gerente?

### Decisión 3 — Templates iniciales
- Validar wording de 8 templates
- Faltan más?

### Decisión 4 — SLA objetivo
- 1 hora razonable?
- 4 horas para alerta?

### Decisión 5 — Push horario
- Solo laboral (8am-6pm)?
- Urgentes 24/7?

### Decisión 6 — Vinculación por dominio
- @lecaroz.com.mx → vincular a Lecaroz?
- Solo emails registrados?

---

## 8. Conexión con otros documentos

### Conexiones cruzadas:
- /audit/13 Pedidos: IA email→pedido
- /audit/16 Cobranza: emails categorizados
- /audit/18 Clientes: timeline CRM auto
- /audit/19 Dashboard: KPIs atención
- /audit/24 Configuración: templates compartidos

### Nuevo Principio Transversal — EMAIL ES VENTAS
"Cada email no respondido es venta perdida. Cada minuto de 
retraso baja probabilidad cierre. IA procesa lo repetitivo, 
humanos deciden lo importante."

---

## 9. Recomendación final

ALMASA-OS Correos YA es EXTRAORDINARIO (~9,292 líneas) con 5 
ÚNICOS no replicables. Las 5 brechas lo elevan a imbatible:

1. CATEGORIZACIÓN IA — inbox limpio
2. AUTO-VINCULACIÓN — todos los emails al CRM
3. PUSH NOTIFICATION — real-time crítico
4. TEMPLATES RESPUESTA — eficiencia 10x
5. METRICS TIEMPO RESPUESTA — mejora continua

**Orden estricto:**
1. SEPTIEMBRE: Categorización + Auto-vinculación
2. OCTUBRE: Push + Templates
3. NOVIEMBRE: Metrics

Una vez completas, ALMASA-OS Correos será **superior a Hubspot, 
Salesforce y Outlook** para PYMEs distribuidoras mexicanas.

---

*ALMASA-OS · Rediseño de Correos / Comunicaciones · v1.0*  
*Generado el 10 de mayo de 2026*  
*El email es ventas. IA lo procesa. Mejor que Hubspot.*
