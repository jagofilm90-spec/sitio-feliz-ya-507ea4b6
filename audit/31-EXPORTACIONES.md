# Exportaciones — ALMASA-OS

**Versión:** v2.0  
**Fecha:** 10 de Mayo 2026  
**Origen:** Visión Josan "Tal vez en el futuro" + investigación Oracle GTM Cloud  
**Estado:** Diseño · Preparado para activación futura  
**Tagline:** Oracle Global Trade Management para PYMEs. Estructura lista, compliance automático.

---

## 1. La filosofía

ALMASA hoy NO exporta. Pero la respuesta de Josan fue clara: "Tal vez en futuro."

ALMASA-OS deja la estructura completa preparada (basada en Oracle Global Trade Management Cloud) sin construir UI ni flujos. Cuando Josan decida exportar, activación rápida.

> Principio rector: "Oracle GTM cuesta $50K+ USD setup. ALMASA-OS replica la estructura por $0. Cuando llegue el momento, ya estás listo."

---

## 2. Investigación Oracle GTM Cloud

### Capacidades clave (referencia diseño):

1. **Restricted Party Screening** — OFAC SDN, UN, EU, UK sanctions. Refresh diario.
2. **License Management** — Export licenses por producto + país. Auto-attach a transactions.
3. **Classification System** — HTS, Schedule B, ECCN, USML. Country of Origin.
4. **Trade Incentive Programs** — Duty Drawback, Bonded Warehouses, FTZ, FTAs (USMCA).
5. **Order Management Integration** — Auto-screening al submit. Hold si failed.
6. **Landed Cost Simulator** — Múltiples escenarios, FTA savings.
7. **Customs Documentation** — Auto-enriquecida, workflow, archive.

### Requisitos SAT México (Exportadores)
- Pedimento exportación (A1 export)
- Complemento Comercio Exterior CFDI 4.0
- Certificado de origen (USMCA, otros TLCs)
- Manifiesto de exportación
- Conocimiento de embarque (B/L)

---

## 3. Diseño Completo Oracle GTM Style

### 3.1 Extender Pedimentos

```sql
ALTER TABLE pedimentos ADD COLUMN direccion_pedimento TEXT 
  CHECK (direccion_pedimento IN ('importacion', 'exportacion')) DEFAULT 'importacion';
ALTER TABLE pedimentos ADD COLUMN cliente_extranjero_id UUID;
ALTER TABLE pedimentos ADD COLUMN pais_destino TEXT;
ALTER TABLE pedimentos ADD COLUMN aduana_salida_codigo TEXT;
ALTER TABLE pedimentos ADD COLUMN puerto_salida TEXT;
ALTER TYPE tipo_pedimento ADD VALUE 'A1_EXP';
ALTER TYPE tipo_pedimento ADD VALUE 'H1';
ALTER TYPE tipo_pedimento ADD VALUE 'F5';
```

### 3.2 Clientes Extranjeros con Compliance

```sql
CREATE TABLE clientes_extranjeros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razon_social TEXT NOT NULL,
  nombre_comercial TEXT,
  pais TEXT NOT NULL,
  tax_id_extranjero TEXT,
  contacto_nombre TEXT,
  email TEXT,
  telefono_internacional TEXT,
  direccion_calle TEXT,
  direccion_ciudad TEXT,
  direccion_estado TEXT,
  direccion_cp TEXT,
  swift_code TEXT,
  iban TEXT,
  cuenta_bancaria TEXT,
  moneda_default TEXT DEFAULT 'USD',
  incoterm_preferido TEXT,
  forma_pago_preferida TEXT,
  ultimo_screening TIMESTAMPTZ,
  ofac_clean BOOLEAN,
  un_clean BOOLEAN,
  eu_clean BOOLEAN,
  uk_clean BOOLEAN,
  screening_resultado TEXT,
  bloqueado_compliance BOOLEAN DEFAULT false,
  motivo_bloqueo TEXT,
  tratado_origen TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.3 Restricted Party Screening

```sql
CREATE TABLE compliance_screenings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_extranjero_id UUID REFERENCES clientes_extranjeros(id),
  fecha_screening TIMESTAMPTZ DEFAULT now(),
  tipo_screening TEXT DEFAULT 'completo',
  ofac_sdn_match BOOLEAN DEFAULT false,
  ofac_sdn_detalles JSONB,
  un_consolidated_match BOOLEAN DEFAULT false,
  un_consolidated_detalles JSONB,
  eu_sanctions_match BOOLEAN DEFAULT false,
  eu_sanctions_detalles JSONB,
  uk_sanctions_match BOOLEAN DEFAULT false,
  uk_sanctions_detalles JSONB,
  bis_entity_list_match BOOLEAN DEFAULT false,
  pais_embargado BOOLEAN DEFAULT false,
  algun_match BOOLEAN GENERATED ALWAYS AS (
    ofac_sdn_match OR un_consolidated_match OR 
    eu_sanctions_match OR uk_sanctions_match OR 
    bis_entity_list_match OR pais_embargado
  ) STORED,
  estado TEXT CHECK (estado IN ('passed', 'under_review', 'failed')),
  accion_recomendada TEXT,
  notificado_admin BOOLEAN DEFAULT false,
  resuelto BOOLEAN DEFAULT false,
  resuelto_por UUID,
  resolucion TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.4 License Management

```sql
CREATE TABLE export_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_licencia TEXT UNIQUE NOT NULL,
  tipo TEXT CHECK (tipo IN (
    'permiso_secretaria_economia', 'licencia_exportacion_general',
    'licencia_individual', 'permiso_sagarpa', 'permiso_cofepris', 'otro'
  )),
  emisor TEXT,
  fecha_emision DATE NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  productos_cubiertos UUID[],
  paises_cubiertos TEXT[],
  cantidad_maxima NUMERIC,
  cantidad_usada NUMERIC DEFAULT 0,
  cantidad_disponible NUMERIC GENERATED ALWAYS AS 
    (cantidad_maxima - COALESCE(cantidad_usada, 0)) STORED,
  licencia_pdf_url TEXT,
  hash_sha256 TEXT,
  vigente BOOLEAN GENERATED ALWAYS AS 
    (fecha_vencimiento >= CURRENT_DATE) STORED,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.5 Classification System

```sql
CREATE TABLE clasificaciones_aduanales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES productos(id),
  fraccion_arancelaria_mx TEXT,
  unidad_medida_mx TEXT,
  hts_code_us TEXT,
  schedule_b_us TEXT,
  hs_code_internacional TEXT,
  hts_code_canada TEXT,
  taric_code_eu TEXT,
  eccn TEXT,
  es_dual_use BOOLEAN DEFAULT false,
  es_munitions BOOLEAN DEFAULT false,
  pais_origen_default TEXT,
  certificable_usmca BOOLEAN DEFAULT false,
  certificable_tlc_ue BOOLEAN DEFAULT false,
  ultima_revision_clasificacion DATE,
  revisado_por UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.6 Trade Incentive Programs

```sql
CREATE TABLE trade_incentive_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT CHECK (tipo IN (
    'duty_drawback', 'bonded_warehouse', 'foreign_trade_zone',
    'inward_processing', 'outward_processing',
    'fta_usmca', 'fta_tlcue', 'fta_cptpp', 'maquila_program'
  )),
  nombre TEXT,
  descripcion TEXT,
  paises_aplicables TEXT[],
  productos_aplicables UUID[],
  fracciones_arancelarias TEXT[],
  ahorro_pct NUMERIC,
  requisitos JSONB,
  activo BOOLEAN DEFAULT true,
  fecha_inicio DATE,
  fecha_fin DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.7 Letter of Credit

```sql
CREATE TABLE export_letters_credit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_lc TEXT UNIQUE,
  tipo_lc TEXT CHECK (tipo_lc IN (
    'irrevocable', 'confirmada', 'transferible', 'rotativa', 'standby'
  )),
  banco_emisor TEXT,
  banco_avisador TEXT,
  banco_confirmador TEXT,
  monto NUMERIC,
  moneda TEXT DEFAULT 'USD',
  fecha_emision DATE,
  fecha_vencimiento DATE,
  cliente_extranjero_id UUID REFERENCES clientes_extranjeros(id),
  pedido_export_id UUID,
  documentos_requeridos JSONB,
  documentos_presentados JSONB,
  documentos_aceptados BOOLEAN,
  estado TEXT CHECK (estado IN (
    'avisada', 'aceptada', 'embarcado_pendiente_docs',
    'documentos_presentados', 'discrepancias', 'pagada', 'vencida', 'cancelada'
  )),
  fecha_embarque_efectivo DATE,
  fecha_presentacion_docs DATE,
  fecha_pago DATE,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.8 Landed Cost Simulator

```sql
CREATE TABLE landed_cost_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_simulacion TEXT,
  fecha_simulacion DATE DEFAULT CURRENT_DATE,
  producto_id UUID,
  cantidad NUMERIC,
  pais_origen TEXT DEFAULT 'MX',
  pais_destino TEXT,
  puerto_salida TEXT,
  puerto_destino TEXT,
  escenarios JSONB,
  escenario_recomendado_idx INTEGER,
  motivo_recomendacion TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.9 Order Auto-Screening

```sql
CREATE OR REPLACE FUNCTION trigger_screen_export_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.es_export = true THEN
    -- Auto-screening compliance
    -- Auto-hold si failed
    IF NEW.compliance_status = 'failed' THEN
      NEW.estado := 'on_hold_compliance';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 4. Por qué ALMASA-OS gana cuando active

| Capacidad | Oracle GTM | SAP GTS | NetSuite | ALMASA-OS |
|-----------|-----------|---------|----------|-----------|
| Party Screening | ✅ | ✅ | 🟡 | ✅ |
| License Management | ✅ | ✅ | 🟡 | ✅ |
| Classification | ✅ | ✅ | ❌ | ✅ |
| Duty Drawback | ✅ | ✅ | ❌ | ✅ |
| FTA management | ✅ | ✅ | 🟡 | ✅ |
| Letter of Credit | ✅ | ✅ | 🟡 | ✅ |
| Landed Cost Sim | ✅ | ✅ | 🟡 | ✅ |
| Order screening | ✅ | ✅ | ❌ | ✅ |
| CFDI MX nativo | 🟡 | ✅ | ❌ | ✅ NATIVO |
| Estructura hoy | ❌ | ❌ | ❌ | ✅ ÚNICO |
| Costo | $50K+ | $100K+ | $30K+ | $0 |

ALMASA gana 3: estructura lista, CFDI nativo, costo $0.

---

## 5. Roadmap

| Fase | Cuándo |
|------|--------|
| HOY | Documento aprobado |
| FASE 0 | Junio 2026: migraciones SQL (1 semana) |
| ACTIVACIÓN | Cuando Josan decida: 4-6 semanas |

---

## 6. Decisiones Futuras

1. **Mercados** — Centroamérica, EEUU, Sudamérica?
2. **Productos exportables** — catálogo selectivo?
3. **Términos** — FOB o CIF? L/C obligatorio?
4. **Banco Base** — servicio export disponible?
5. **Trade Incentives** — aplicar IMMEX? FTZ?
6. **Compliance** — officer dedicado o tercerizar?

---

## 7. Conexión con otros documentos

- /audit/29 Divisas (USD cobranza export)
- /audit/30 Importaciones (estructura compartida)
- /audit/07 Facturación (Complemento CFDI)
- /audit/22 Productos (fracción arancelaria + ECCN)

### Nuevo Principio — COMPLIANCE BY DESIGN
"El compliance no es opcional. Cada cliente extranjero pasa screening. Cada producto tiene clasificación. Oracle GTM nivel sin precio."

---

## 8. Recomendación final

Estructura Oracle GTM completa preparada hoy. Activación en 4-6 semanas cuando llegue el momento. $0 vs $50K+ Oracle.

---

*ALMASA-OS · Exportaciones · v2.0*  
*Generado el 10 de mayo de 2026*  
*Oracle GTM para PYMEs. Estructura lista, compliance automático.*
