# Rediseño de Configuración del Sistema — ALMASA-OS

**Versión:** v1.0  
**Fecha:** 10 de Mayo 2026  
**Origen:** Auditoría configuración + decisiones operativas + visión producto comercial  
**Estado:** Diseño · Pendiente decisión y ejecución  
**Tagline:** Configurable sin código. Vendible por planes.

---

## 1. La filosofía

Configuración es la columna vertebral invisible del sistema. Si está 
bien hecha, cambios masivos se hacen en 1 lugar. Si está mal, cada 
cambio requiere developer + redeploy + downtime.

ALMASA-OS aspira a ser **producto comercial vendible**. Para vender, 
necesitas planes diferenciados. Esto SOLO es posible con **feature 
flags**: switches que activan o desactivan capacidades sin redeploy.

> Principio rector: "Configurable sin código. Vendible por planes. 
> 1 código fuente, infinitos clientes con diferentes necesidades."

---

## 2. Estado actual de configuración

ALMASA-OS Configuración es módulo MUY MADURO:

**2 tablas key-value:**
- configuracion_empresa (JSON) — datos empresa, alertas, créditos
- configuracion_flotilla (string) — config flota
- module_permissions — permisos por rol

**11 archivos (~3,595 líneas):**
- UsuariosContent (1,039 lín) — gestión usuarios + roles
- ConfigEmpresaTab (475 lín) — datos empresa editables
- ConfigCreditosTab (337 lín) — configuración créditos
- PushNotificationDiagnostics (336 lín)
- ConfigFlotillaTab (311 lín)
- ConfigAlertasTab (305 lín) — umbrales stock/caducidad/fumigación
- ConfigSistemaTab (226 lín)
- ConfigCorreosTab (220 lín)
- PermisosContent (210 lín)

**6 integraciones activas:**
- PAC Facturama (CFDI) — ÚNICO MX
- Gmail OAuth multi-cuenta
- Google Maps
- ZKTeco biométrico — ÚNICO MX
- WhatsApp (wa.me manual)
- Push FCM + APNs

| Capacidad | Estado | Detalle |
|-----------|--------|---------|
| Datos empresa centralizados | ✅ Dual | companyData + BD |
| Tabla configuración | ✅ Key-value | JSON |
| Días feriados MX | ✅ ÚNICO | lib/mexicanHolidays |
| Página config 7 tabs | ✅ | Completa |
| PAC Facturama | ✅ ÚNICO MX | CFDI completo |
| Gmail OAuth | ✅ Multi-cuenta | Completo |
| ZKTeco | ✅ ÚNICO MX | Biométrico |
| Push FCM/APNs | ✅ | Capacitor |
| Permisos módulos | ✅ | UI + BD |
| Gestión usuarios | ✅ | 1,039 lín |
| Alertas configurables | ✅ | Stock/caducidad/fumigación |
| Feature flags | ❌ NO existe | Sin sistema |
| Plantillas documentos | ❌ Hardcoded | En código |
| Audit log config | ❌ NO existe | Sin trazabilidad |
| Backup config | ❌ NO existe | Sin export/import |

**Conclusión:** Base ESPECTACULAR. 4 brechas convierten ALMASA-OS en producto comercial escalable.

---

## 3. Estándar Oracle / SAP / NetSuite

5 conceptos universales:
1. Configuración Centralizada
2. Feature Flags / Toggles
3. Plantillas Editables
4. Audit Trail de Cambios
5. Backup / Restore

---

## 4. Por qué ALMASA-OS gana

| Dimensión | Oracle/SAP | ALMASA-OS | Ganador |
|-----------|-----------|-----------|---------|
| Configuración central | ✅ | ✅ | EMPATE |
| Días feriados MX | ❌ | ✅ ÚNICO | ALMASA |
| ZKTeco biométrico MX | ❌ | ✅ ÚNICO | ALMASA |
| PAC Facturama MX | ❌ | ✅ ÚNICO | ALMASA |
| Feature flags | ✅ | ❌ → planeado | EMPATE (post) |
| Plantillas editables | ✅ | ❌ → planeado | EMPATE (post) |
| Audit log config | ✅ | ❌ → planeado | EMPATE (post) |
| Costo licencia | $$$$ | $0 | ALMASA |
| Multi-empresa | ✅ | ❌ futuro | ORACLE |

**Marcador post-implementación:**
ALMASA gana: 4 dimensiones (3 ÚNICOS + costo)
Oracle gana: 1 (multi-empresa)
Empate: 12 dimensiones

---

## 5. Las 4 Brechas

### Brecha 1 — Feature Flags (CRÍTICO COMERCIAL)

```sql
CREATE TYPE plan_comercial AS ENUM (
  'basico', 'pro', 'enterprise', 'custom'
);

CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  categoria TEXT,
  habilitado_global BOOLEAN DEFAULT false,
  habilitado_para_roles TEXT[],
  habilitado_para_usuarios UUID[],
  porcentaje_rollout INTEGER DEFAULT 0
    CHECK (porcentaje_rollout BETWEEN 0 AND 100),
  requiere_plan plan_comercial DEFAULT 'basico',
  vigente_desde TIMESTAMPTZ,
  vigente_hasta TIMESTAMPTZ,
  kill_switch_activo BOOLEAN DEFAULT false,
  kill_switch_motivo TEXT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION feature_enabled(
  p_key TEXT,
  p_user_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_flag feature_flags%ROWTYPE;
  v_user_role TEXT;
BEGIN
  SELECT * INTO v_flag FROM feature_flags WHERE key = p_key;
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_flag.kill_switch_activo THEN RETURN false; END IF;
  IF v_flag.vigente_hasta IS NOT NULL 
    AND v_flag.vigente_hasta < now() THEN RETURN false; END IF;
  IF v_flag.habilitado_global THEN RETURN true; END IF;
  IF p_user_id = ANY(v_flag.habilitado_para_usuarios) 
    THEN RETURN true; END IF;
  SELECT role INTO v_user_role FROM user_roles WHERE user_id = p_user_id LIMIT 1;
  IF v_user_role = ANY(v_flag.habilitado_para_roles) 
    THEN RETURN true; END IF;
  IF v_flag.porcentaje_rollout > 0 AND p_user_id IS NOT NULL THEN
    IF (hashtext(p_user_id::text) % 100) < v_flag.porcentaje_rollout
      THEN RETURN true; END IF;
  END IF;
  RETURN false;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

**Catálogo features por plan:**
- Básico: pedidos, inventario, clientes, compras
- Pro: + IA predicciones, NPS, CRM timeline, utilidad 3N
- Enterprise: + tracking Uber, multi-empresa, API pública

**Hook React:** `useFeatureFlag('predicciones_ia')`

**Esfuerzo:** 1-2 semanas  
**Prioridad:** CRÍTICA COMERCIAL

### Brecha 2 — Plantillas Documentos Editables

```sql
CREATE TABLE plantillas_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN (
    'cotizacion', 'pedido', 'remision', 'factura', 'nota_credito',
    'recibo_pago', 'recordatorio_3_dias_antes', 'recordatorio_dia_vencimiento',
    'recordatorio_7_dias_vencido', 'recordatorio_15_dias_vencido',
    'agradecimiento_pago', 'orden_compra', 'orden_pago',
    'bienvenida_cliente_nuevo', 'felicitacion_cumpleanos'
  )),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  asunto_email TEXT,
  cuerpo_email_html TEXT,
  cuerpo_email_texto TEXT,
  texto_whatsapp TEXT,
  cuerpo_pdf_html TEXT,
  variables_permitidas TEXT[],
  vigente BOOLEAN DEFAULT true,
  default_template BOOLEAN DEFAULT false,
  ab_test_grupo TEXT,
  ab_test_porcentaje INTEGER,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_plantillas_default 
  ON plantillas_documentos(tipo) 
  WHERE default_template = true;

CREATE OR REPLACE FUNCTION renderizar_plantilla(
  p_plantilla_id UUID,
  p_variables JSONB
) RETURNS TEXT AS $$
DECLARE
  v_texto TEXT;
  v_var TEXT;
  v_valor TEXT;
BEGIN
  SELECT cuerpo_email_html INTO v_texto 
    FROM plantillas_documentos WHERE id = p_plantilla_id;
  FOR v_var IN SELECT jsonb_object_keys(p_variables) LOOP
    v_valor := p_variables->>v_var;
    v_texto := REPLACE(v_texto, '{' || v_var || '}', v_valor);
  END LOOP;
  RETURN v_texto;
END;
$$ LANGUAGE plpgsql STABLE;
```

**14 tipos de plantilla.** Editor WYSIWYG con drag & drop variables. Email + WhatsApp + PDF en mismo template.

**Esfuerzo:** 2 semanas  
**Prioridad:** ALTA COMERCIAL

### Brecha 3 — Audit Log de Cambios Configuración

```sql
CREATE TABLE config_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla TEXT NOT NULL,
  registro_id UUID,
  campo TEXT NOT NULL,
  valor_anterior JSONB,
  valor_nuevo JSONB,
  modificado_por UUID NOT NULL,
  modificado_por_email TEXT,
  modificado_por_role TEXT,
  modificado_en TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  motivo TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION trigger_audit_config()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO config_audit_log (
      tabla, registro_id, campo,
      valor_anterior, valor_nuevo,
      modificado_por
    ) 
    SELECT 
      TG_TABLE_NAME, NEW.id, key,
      to_jsonb(OLD)->key, to_jsonb(NEW)->key,
      auth.uid()
    FROM jsonb_object_keys(to_jsonb(NEW)) AS key
    WHERE to_jsonb(OLD)->key IS DISTINCT FROM to_jsonb(NEW)->key;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Aplicar a: configuracion_empresa, configuracion_flotilla, module_permissions, feature_flags.

**Esfuerzo:** 1 semana  
**Prioridad:** IMPORTANTE COMPLIANCE

### Brecha 4 — Export/Import Configuración (Backup)

Export JSON con TODA la config + hash SHA-256. Import con validación + backup auto previo. Cron mensual automático. Setup nuevo cliente: importar plantilla ALMASA.

**Esfuerzo:** 1 semana  
**Prioridad:** IMPORTANTE COMERCIAL

---

## 6. Roadmap

| Mes | Entregas |
|-----|----------|
| Mayo (resto) | /audit/24 generado |
| Septiembre | Brecha 3: Audit log config (1 sem) |
| Octubre | Brecha 1: Feature flags (1-2 sem) |
| Noviembre | Brecha 2: Plantillas editables (2 sem) |
| Diciembre | Brecha 4: Export/import backup (1 sem) |

**Tiempo total:** 5-6 semanas dispersas  
**Inversión:** $0 software

---

## 7. Decisiones de Negocio Pendientes

### Decisión 1 — Planes comerciales
- Qué features en Básico/Pro/Enterprise?
- Pricing tentativo?

### Decisión 2 — Plantillas iniciales
- Cuáles tipos crear primero?
- Wording cordial mexicano

### Decisión 3 — Periodicidad backup
- Mensual automático suficiente?
- Storage: S3 / Google Drive?

### Decisión 4 — Rollback automático
- Permitir rollback cambios config?
- Solo admin? Confirmación doble?

---

## 8. Conexión con otros documentos

### Conexiones cruzadas:
- /audit/11 Roles: feature flags por rol
- /audit/12 Evidencia: hashes en backup
- /audit/16 Cobranza: plantillas tono cordial
- /audit/19 Dashboard: KPIs uso features

### Nuevo Principio Transversal — CONFIGURABLE SIN CÓDIGO
"Cada parámetro editable sin developer. Cada feature con switch. 
Cada cambio registrado. Cada configuración respaldada."

---

## 9. Recomendación final

ALMASA-OS Configuración ya es MUY MADURO (3,595 líneas, 7 tabs, 
6 integraciones, 3 ÚNICOS mexicanos). Las 4 brechas convierten 
ALMASA-OS en **producto SaaS escalable**:

1. FEATURE FLAGS — base para planes Básico/Pro/Enterprise
2. PLANTILLAS EDITABLES — sin developer para wording
3. AUDIT LOG CONFIG — compliance y trazabilidad
4. BACKUP CONFIG — recuperación + setup clientes nuevos

**Orden estricto:**
1. SEPTIEMBRE: Audit log (compliance)
2. OCTUBRE: Feature flags (CRÍTICO COMERCIAL)
3. NOVIEMBRE: Plantillas editables
4. DICIEMBRE: Backup config

Una vez completas, ALMASA-OS es **producto SaaS escalable**. 
1 código fuente, infinitos clientes, 3 planes diferenciados.

---

*ALMASA-OS · Rediseño de Configuración del Sistema · v1.0*  
*Generado el 10 de mayo de 2026*  
*Configurable sin código. Vendible por planes.*
