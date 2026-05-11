-- ============================================
-- M08 FACTURACIÓN DUAL — Cierre gaps
-- Notas Crédito + Complementos Pago + Remisiones
-- APLICAR MANUALMENTE en Lovable SQL Editor
-- ============================================

-- 1. Notas de Crédito (CFDI tipo E)
CREATE TABLE IF NOT EXISTS notas_credito (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio text UNIQUE,
  factura_original_id uuid REFERENCES facturas(id),
  cliente_id uuid REFERENCES clientes(id),
  tipo text DEFAULT 'devolucion',
  motivo text,
  subtotal numeric(12,2) NOT NULL,
  impuestos numeric(12,2) DEFAULT 0,
  total numeric(12,2) NOT NULL,
  uso_cfdi text DEFAULT 'G02',
  forma_pago text DEFAULT '99',
  metodo_pago text DEFAULT 'PUE',
  cfdi_uuid text,
  cfdi_estado text DEFAULT 'pendiente',
  cfdi_fecha_timbrado timestamptz,
  cfdi_xml_url text,
  cfdi_pdf_url text,
  cfdi_error text,
  notas text,
  created_at timestamptz DEFAULT now(),
  created_by uuid,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nc_factura ON notas_credito(factura_original_id);
CREATE INDEX IF NOT EXISTS idx_nc_estado ON notas_credito(cfdi_estado);

-- Folio NC-YYYYMM-NNNN
CREATE OR REPLACE FUNCTION generate_nota_credito_folio()
RETURNS TRIGGER AS $$
DECLARE next_num int; yyyymm text;
BEGIN
  IF NEW.folio IS NULL OR NEW.folio = '' THEN
    yyyymm := to_char(now(), 'YYYYMM');
    PERFORM pg_advisory_xact_lock(hashtext('nc_folio'));
    SELECT COALESCE(MAX(CAST(SUBSTRING(folio FROM 'NC-' || yyyymm || '-(\d+)') AS int)), 0) + 1
    INTO next_num FROM notas_credito WHERE folio LIKE 'NC-' || yyyymm || '-%';
    NEW.folio := 'NC-' || yyyymm || '-' || LPAD(next_num::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_nc_folio ON notas_credito;
CREATE TRIGGER trg_nc_folio BEFORE INSERT ON notas_credito
FOR EACH ROW EXECUTE FUNCTION generate_nota_credito_folio();

-- 2. Complementos de Pago (CFDI tipo P / REP)
CREATE TABLE IF NOT EXISTS complementos_pago (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio text UNIQUE,
  cliente_id uuid REFERENCES clientes(id),
  fecha_pago date NOT NULL,
  forma_pago text NOT NULL,
  moneda text DEFAULT 'MXN',
  monto numeric(12,2) NOT NULL,
  num_operacion text,
  rfc_emisor_cta text,
  nom_banco_emisor text,
  cuenta_emisor text,
  rfc_receptor_cta text,
  cuenta_receptor text,
  cfdi_uuid text,
  cfdi_estado text DEFAULT 'pendiente',
  cfdi_fecha_timbrado timestamptz,
  cfdi_xml_url text,
  cfdi_pdf_url text,
  cfdi_error text,
  notas text,
  created_at timestamptz DEFAULT now(),
  created_by uuid,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rep_estado ON complementos_pago(cfdi_estado);
CREATE INDEX IF NOT EXISTS idx_rep_cliente ON complementos_pago(cliente_id);

-- Doctos relacionados al REP
CREATE TABLE IF NOT EXISTS complementos_pago_doctos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complemento_id uuid REFERENCES complementos_pago(id) ON DELETE CASCADE,
  factura_id uuid REFERENCES facturas(id),
  serie text,
  folio text,
  uuid_factura text,
  num_parcialidad int DEFAULT 1,
  imp_saldo_ant numeric(12,2),
  imp_pagado numeric(12,2),
  imp_saldo_insoluto numeric(12,2),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rep_doctos ON complementos_pago_doctos(complemento_id);

-- Folio REP-YYYYMM-NNNN
CREATE OR REPLACE FUNCTION generate_rep_folio()
RETURNS TRIGGER AS $$
DECLARE next_num int; yyyymm text;
BEGIN
  IF NEW.folio IS NULL OR NEW.folio = '' THEN
    yyyymm := to_char(now(), 'YYYYMM');
    PERFORM pg_advisory_xact_lock(hashtext('rep_folio'));
    SELECT COALESCE(MAX(CAST(SUBSTRING(folio FROM 'REP-' || yyyymm || '-(\d+)') AS int)), 0) + 1
    INTO next_num FROM complementos_pago WHERE folio LIKE 'REP-' || yyyymm || '-%';
    NEW.folio := 'REP-' || yyyymm || '-' || LPAD(next_num::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rep_folio ON complementos_pago;
CREATE TRIGGER trg_rep_folio BEFORE INSERT ON complementos_pago
FOR EACH ROW EXECUTE FUNCTION generate_rep_folio();

-- 3. Remisiones (documento interno no fiscal)
CREATE TABLE IF NOT EXISTS remisiones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio text UNIQUE,
  pedido_id uuid REFERENCES pedidos(id),
  cliente_id uuid REFERENCES clientes(id),
  factura_id uuid REFERENCES facturas(id),
  estado text DEFAULT 'emitida',
  subtotal numeric(12,2),
  impuestos numeric(12,2),
  total numeric(12,2),
  convertida_a_factura boolean DEFAULT false,
  convertida_at timestamptz,
  notas text,
  created_at timestamptz DEFAULT now(),
  created_by uuid,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_remisiones_pedido ON remisiones(pedido_id);
CREATE INDEX IF NOT EXISTS idx_remisiones_estado ON remisiones(estado);

-- Folio REM-YYYYMM-NNNN
CREATE OR REPLACE FUNCTION generate_remision_folio()
RETURNS TRIGGER AS $$
DECLARE next_num int; yyyymm text;
BEGIN
  IF NEW.folio IS NULL OR NEW.folio = '' THEN
    yyyymm := to_char(now(), 'YYYYMM');
    PERFORM pg_advisory_xact_lock(hashtext('rem_folio'));
    SELECT COALESCE(MAX(CAST(SUBSTRING(folio FROM 'REM-' || yyyymm || '-(\d+)') AS int)), 0) + 1
    INTO next_num FROM remisiones WHERE folio LIKE 'REM-' || yyyymm || '-%';
    NEW.folio := 'REM-' || yyyymm || '-' || LPAD(next_num::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_remision_folio ON remisiones;
CREATE TRIGGER trg_remision_folio BEFORE INSERT ON remisiones
FOR EACH ROW EXECUTE FUNCTION generate_remision_folio();

-- 4. Agregar factura_id a pac_transacciones_log
ALTER TABLE pac_transacciones_log ADD COLUMN IF NOT EXISTS factura_id uuid;
ALTER TABLE pac_transacciones_log ADD COLUMN IF NOT EXISTS nota_credito_id uuid;
ALTER TABLE pac_transacciones_log ADD COLUMN IF NOT EXISTS complemento_pago_id uuid;

-- 5. Agregar remision_id a facturas
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS remision_id uuid;

-- ============================================
-- RLS
-- ============================================

ALTER TABLE notas_credito ENABLE ROW LEVEL SECURITY;
ALTER TABLE complementos_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE complementos_pago_doctos ENABLE ROW LEVEL SECURITY;
ALTER TABLE remisiones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nc_admin_sec_cont" ON notas_credito FOR ALL
  USING (public.has_any_role(ARRAY['admin'::public.app_role, 'secretaria'::public.app_role, 'contadora'::public.app_role]));

CREATE POLICY "rep_admin_sec_cont" ON complementos_pago FOR ALL
  USING (public.has_any_role(ARRAY['admin'::public.app_role, 'secretaria'::public.app_role, 'contadora'::public.app_role]));

CREATE POLICY "rep_doctos_admin_sec_cont" ON complementos_pago_doctos FOR ALL
  USING (public.has_any_role(ARRAY['admin'::public.app_role, 'secretaria'::public.app_role, 'contadora'::public.app_role]));

CREATE POLICY "remisiones_admin_sec" ON remisiones FOR ALL
  USING (public.has_any_role(ARRAY['admin'::public.app_role, 'secretaria'::public.app_role, 'contadora'::public.app_role]));
CREATE POLICY "remisiones_vendedor" ON remisiones FOR SELECT
  USING (public.has_role(auth.uid(), 'vendedor'::public.app_role));
