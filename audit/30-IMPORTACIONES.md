# Importaciones — ALMASA-OS

**Versión:** v1.0  
**Fecha:** 10 de Mayo 2026  
**Origen:** Confirmación Josan: ALMASA importa directo + vía brokers MX  
**Estado:** Diseño · Pendiente decisión y ejecución  
**Tagline:** SAP Global Trade Services para PYMEs. Pedimento integrado al sistema.

---

## 1. La filosofía

ALMASA importa producto del extranjero de dos formas:
1. **Directo** — negocia con proveedor extranjero, define INCOTERMS
2. **Vía brokers MX** — compra a importador mexicano que ya nacionalizó

El SAT exige tracking de pedimento desde recepción hasta venta al cliente final.

> Principio rector: "El pedimento viaja con el producto. Desde aduana hasta cliente final. Cada centavo de costo de importación se prorratea correctamente. SAT compliance automático."

---

## 2. Estado actual

Probablemente NO existe módulo formal. Brecha 100%.

---

## 3. Estándar SAP GTS

Capacidades clave: Pedimento implementation, Batch management con PEDIMENTO, Annex 24 SECIIT, Complemento Comercio Exterior CFDI, INCOTERMS, Landed cost calculation.

---

## 4. Diseño Importaciones ALMASA-OS

### 4.1 Tabla Pedimentos

```sql
CREATE TYPE tipo_pedimento AS ENUM (
  'A1', 'IN', 'F4', 'AF', 'F8', 'V1'
);

CREATE TYPE incoterm AS ENUM (
  'EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'
);

CREATE TABLE pedimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_pedimento TEXT UNIQUE NOT NULL,
  tipo_pedimento tipo_pedimento NOT NULL,
  fecha_pago DATE NOT NULL,
  fecha_entrada DATE NOT NULL,
  aduana_codigo TEXT NOT NULL,
  aduana_nombre TEXT NOT NULL,
  agente_aduanal_id UUID,
  agente_aduanal_nombre TEXT,
  agente_patente TEXT,
  proveedor_extranjero_id UUID,
  proveedor_extranjero_nombre TEXT,
  pais_origen TEXT NOT NULL,
  pais_procedencia TEXT,
  incoterm incoterm NOT NULL,
  punto_destino TEXT,
  modalidad TEXT CHECK (modalidad IN ('directo', 'broker_mx', 'broker_extranjero')),
  broker_id UUID,
  moneda TEXT NOT NULL DEFAULT 'USD',
  valor_aduana_origen NUMERIC NOT NULL,
  valor_aduana_mxn NUMERIC NOT NULL,
  tipo_cambio_pedimento NUMERIC(15,6),
  flete_origen NUMERIC DEFAULT 0,
  seguro NUMERIC DEFAULT 0,
  flete_destino NUMERIC DEFAULT 0,
  arancel_pct NUMERIC,
  arancel_mxn NUMERIC,
  dta_pct NUMERIC,
  dta_mxn NUMERIC,
  iva_pedimento NUMERIC,
  prv_mxn NUMERIC,
  total_nacionalizado_mxn NUMERIC GENERATED ALWAYS AS (
    valor_aduana_mxn + COALESCE(flete_origen, 0) + COALESCE(seguro, 0) + 
    COALESCE(flete_destino, 0) + COALESCE(arancel_mxn, 0) + 
    COALESCE(dta_mxn, 0) + COALESCE(iva_pedimento, 0) + COALESCE(prv_mxn, 0)
  ) STORED,
  documento_pedimento_pdf_url TEXT,
  documento_factura_proveedor_url TEXT,
  documento_packing_list_url TEXT,
  documento_bl_awb_url TEXT,
  documento_certificado_origen_url TEXT,
  documentos_hash_sha256 TEXT[],
  fecha_etd DATE,
  fecha_eta DATE,
  fecha_arribo_real DATE,
  fecha_liberacion_aduana DATE,
  fecha_recepcion_bodega DATE,
  estado TEXT CHECK (estado IN (
    'planificado', 'embarcado', 'arribado', 'en_aduana',
    'liberado', 'en_transito_destino', 'recibido', 'cerrado'
  )) DEFAULT 'planificado',
  orden_compra_id UUID,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.2 Productos vinculados a pedimento

```sql
CREATE TABLE pedimento_productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedimento_id UUID NOT NULL REFERENCES pedimentos(id),
  producto_id UUID NOT NULL REFERENCES productos(id),
  cantidad NUMERIC NOT NULL,
  unidad TEXT NOT NULL,
  fraccion_arancelaria TEXT NOT NULL,
  descripcion_arancelaria TEXT,
  valor_unitario_origen NUMERIC NOT NULL,
  valor_total_origen NUMERIC NOT NULL,
  valor_unitario_mxn NUMERIC,
  valor_total_mxn NUMERIC,
  flete_prorrateado NUMERIC,
  seguro_prorrateado NUMERIC,
  arancel_prorrateado NUMERIC,
  dta_prorrateado NUMERIC,
  costo_unitario_nacionalizado NUMERIC,
  lote_numero TEXT,
  caducidad DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.3 Prorrateo automático

```sql
CREATE OR REPLACE FUNCTION prorratear_costos_pedimento(p_pedimento_id UUID)
RETURNS void AS $$
DECLARE v_pedimento RECORD; v_total_valor NUMERIC;
BEGIN
  SELECT * INTO v_pedimento FROM pedimentos WHERE id = p_pedimento_id;
  SELECT SUM(valor_total_mxn) INTO v_total_valor
  FROM pedimento_productos WHERE pedimento_id = p_pedimento_id;
  
  UPDATE pedimento_productos pp SET 
    flete_prorrateado = (pp.valor_total_mxn / v_total_valor) * v_pedimento.flete_origen,
    seguro_prorrateado = (pp.valor_total_mxn / v_total_valor) * v_pedimento.seguro,
    arancel_prorrateado = (pp.valor_total_mxn / v_total_valor) * v_pedimento.arancel_mxn,
    dta_prorrateado = (pp.valor_total_mxn / v_total_valor) * v_pedimento.dta_mxn,
    costo_unitario_nacionalizado = pp.valor_unitario_mxn + 
      ((pp.valor_total_mxn / v_total_valor) * (v_pedimento.flete_origen + v_pedimento.seguro + 
        v_pedimento.arancel_mxn + v_pedimento.dta_mxn) / pp.cantidad)
  WHERE pedimento_id = p_pedimento_id;
END;
$$ LANGUAGE plpgsql;
```

### 4.4 Pedimento viaja con el producto

```sql
ALTER TABLE inventario_lotes ADD COLUMN pedimento_id UUID REFERENCES pedimentos(id);
ALTER TABLE inventario_lotes ADD COLUMN pedimento_numero TEXT;

ALTER TABLE pedidos_detalles ADD COLUMN pedimento_id UUID;
ALTER TABLE pedidos_detalles ADD COLUMN pedimento_numero TEXT;
ALTER TABLE pedidos_detalles ADD COLUMN pedimento_aduana_codigo TEXT;
ALTER TABLE pedidos_detalles ADD COLUMN pedimento_fecha DATE;

-- Trigger: copiar pedimento del lote al pedido
CREATE OR REPLACE FUNCTION trigger_copiar_pedimento_a_pedido()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lote_id IS NOT NULL THEN
    SELECT pedimento_id, pedimento_numero
    INTO NEW.pedimento_id, NEW.pedimento_numero
    FROM inventario_lotes WHERE id = NEW.lote_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_copiar_pedimento
BEFORE INSERT OR UPDATE ON pedidos_detalles
FOR EACH ROW EXECUTE FUNCTION trigger_copiar_pedimento_a_pedido();
```

### 4.5 Embarques

```sql
CREATE TABLE embarques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedimento_id UUID REFERENCES pedimentos(id),
  numero_embarque TEXT,
  bl_awb_numero TEXT,
  modo_transporte TEXT CHECK (modo_transporte IN (
    'maritimo', 'aereo', 'terrestre', 'multimodal'
  )),
  puerto_origen TEXT,
  pais_origen TEXT,
  fecha_etd DATE,
  puerto_destino TEXT,
  fecha_eta DATE,
  fecha_arribo_real DATE,
  naviera_aerolinea TEXT,
  numero_contenedor TEXT[],
  tracking_url TEXT,
  estado TEXT CHECK (estado IN (
    'reservado', 'cargando', 'en_transito', 'arribado',
    'en_aduana', 'liberado', 'entregado'
  )),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.6 Brokers y Agentes Aduanales

```sql
CREATE TABLE brokers_importacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  rfc TEXT,
  tipo TEXT CHECK (tipo IN ('broker_comercial', 'agente_aduanal', 'consolidador')),
  contacto_principal TEXT,
  email TEXT,
  telefono TEXT,
  patente_aduanal TEXT,
  total_pedimentos INTEGER DEFAULT 0,
  pedimentos_sin_problemas INTEGER DEFAULT 0,
  tiempo_promedio_liberacion_dias NUMERIC,
  costo_promedio_servicio NUMERIC,
  rating NUMERIC,
  activo BOOLEAN DEFAULT true,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 5. Por qué ALMASA-OS gana

| Capacidad | SAP GTS | Oracle | NetSuite | ALMASA-OS |
|-----------|---------|--------|----------|-----------|
| Pedimento tracking | ✅ | ✅ | 🟡 | ✅ |
| INCOTERMS | ✅ | ✅ | ✅ | ✅ |
| Prorrateo costos | ✅ | ✅ | 🟡 | ✅ |
| Tracking embarques | ✅ | ✅ | ✅ | ✅ |
| Brokers performance | 🟡 | ❌ | ❌ | ✅ ÚNICO |
| IA recomendación broker | ❌ | ❌ | ❌ | ✅ ÚNICO |
| Annex 24 SECIIT MX | ✅ | 🟡 | ❌ | ✅ MX |
| Costo | $$$$$$ | $$$$$ | $$$$ | $0 |

ALMASA gana 3 (2 ÚNICOS + costo). SAP GTS = $100K+ setup.

---

## 6. Roadmap

| Mes | Entrega |
|-----|---------|
| Junio | Tablas pedimentos + pedimento_productos |
| Julio | Prorrateo automático + pedimento→lote→pedido |
| Agosto | Embarques + brokers/agentes |
| Septiembre | UI captura + dashboard |
| Octubre | Complemento Comercio Exterior CFDI + IA broker |

**Tiempo total:** 5 meses. **Inversión:** $0.

---

## 7. Decisiones Pendientes

1. **Costos a prorratear** — Solo flete+seguro+arancel o incluir broker?
2. **Frecuencia importaciones** — Cuántas/mes promedio?
3. **Annex 24 SECIIT** — ALMASA tiene IMMEX?
4. **Performance brokers** — Score auto o manual?
5. **Documentos storage** — Supabase o S3? Hash obligatorio.
6. **INCOTERMS preferidos** — CIF, FOB, DDP?

---

## 8. Conexión con otros documentos

- /audit/29 Divisas (USD costos)
- /audit/09 Compras (OCs internacionales)
- /audit/22 Productos (CPP nacionalizado)
- /audit/08 Inventario (lotes con pedimento)
- /audit/07 Facturación (CFDI Comercio Exterior)
- /audit/20 Tesorería (pagos USD)

### Nuevo Principio — EL PEDIMENTO VIAJA CON EL PRODUCTO
"Desde aduana hasta cliente final, el pedimento es la huella fiscal. SAT compliance automático."

---

## 9. Recomendación final

Replica SAP GTS + 2 ÚNICOS (performance brokers, IA recomendación). Pedimento integrado desde aduana hasta CFDI cliente. Costo $0 vs $100K+ SAP.

---

*ALMASA-OS · Importaciones · v1.0*  
*Generado el 10 de mayo de 2026*  
*El pedimento viaja con el producto. SAP GTS para PYMEs.*
