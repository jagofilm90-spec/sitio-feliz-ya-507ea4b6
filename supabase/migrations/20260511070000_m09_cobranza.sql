-- ============================================
-- M09 COBRANZA APP
-- APLICAR MANUALMENTE en Lovable SQL Editor
-- ============================================

-- Agregar campos faltantes a facturas
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS saldo_pendiente numeric(15,2);
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS dias_credito int DEFAULT 0;
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS pagada_at timestamptz;

UPDATE facturas SET saldo_pendiente = total WHERE saldo_pendiente IS NULL;

CREATE INDEX IF NOT EXISTS idx_facturas_saldo ON facturas(saldo_pendiente) WHERE saldo_pendiente > 0;

-- 1. Cobros
CREATE TABLE IF NOT EXISTS cobros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio text UNIQUE,
  cliente_id uuid NOT NULL,
  monto_total numeric(15,2) NOT NULL,
  moneda text DEFAULT 'MXN',
  forma_pago_sat text NOT NULL,
  banco_emisor text,
  numero_cuenta_emisor text,
  numero_operacion text,
  numero_cheque text,
  fecha_deposito date,
  estado text DEFAULT 'capturado',
  capturado_por uuid,
  capturado_at timestamptz DEFAULT now(),
  gps_lat numeric(10,7),
  gps_lng numeric(10,7),
  foto_comprobante_url text,
  notas_cobrador text,
  validado_por uuid,
  validado_at timestamptz,
  notas_validacion text,
  motivo_rechazo text,
  conciliado_por uuid,
  conciliado_at timestamptz,
  requiere_rep boolean DEFAULT false,
  complemento_pago_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cobros_cliente ON cobros(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cobros_estado ON cobros(estado);
CREATE INDEX IF NOT EXISTS idx_cobros_fecha ON cobros(capturado_at DESC);

-- 2. Cobros aplicados a facturas
CREATE TABLE IF NOT EXISTS cobros_facturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cobro_id uuid REFERENCES cobros(id) ON DELETE CASCADE,
  factura_id uuid NOT NULL,
  monto_aplicado numeric(15,2) NOT NULL,
  saldo_antes numeric(15,2),
  saldo_despues numeric(15,2),
  num_parcialidad int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cobros_fact_cobro ON cobros_facturas(cobro_id);
CREATE INDEX IF NOT EXISTS idx_cobros_fact_factura ON cobros_facturas(factura_id);

-- 3. Rutas cobranza
CREATE TABLE IF NOT EXISTS rutas_cobranza (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio text UNIQUE,
  cobrador_id uuid,
  fecha_ruta date NOT NULL,
  estado text DEFAULT 'pendiente',
  clientes_visitados int DEFAULT 0,
  clientes_cobrados int DEFAULT 0,
  monto_total_cobrado numeric(15,2) DEFAULT 0,
  iniciada_at timestamptz,
  completada_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rutas_cob_fecha ON rutas_cobranza(fecha_ruta);

-- 4. Clientes en ruta cobranza
CREATE TABLE IF NOT EXISTS rutas_cobranza_clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ruta_cobranza_id uuid REFERENCES rutas_cobranza(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL,
  orden_visita int,
  saldo_total numeric(15,2),
  facturas_pendientes int,
  dias_vencimiento_max int,
  estado_visita text DEFAULT 'pendiente',
  visitado_at timestamptz,
  cobro_id uuid,
  notas text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rutas_cli_ruta ON rutas_cobranza_clientes(ruta_cobranza_id);

-- Folios atómicos
CREATE OR REPLACE FUNCTION generate_cobro_folio()
RETURNS TRIGGER AS $$
DECLARE next_num int; yyyymm text;
BEGIN
  IF NEW.folio IS NULL OR NEW.folio = '' THEN
    yyyymm := to_char(now(), 'YYYYMM');
    PERFORM pg_advisory_xact_lock(hashtext('cobro_folio'));
    SELECT COALESCE(MAX(CAST(SUBSTRING(folio FROM 'COB-' || yyyymm || '-(\d+)') AS int)), 0) + 1
    INTO next_num FROM cobros WHERE folio LIKE 'COB-' || yyyymm || '-%';
    NEW.folio := 'COB-' || yyyymm || '-' || LPAD(next_num::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cobro_folio ON cobros;
CREATE TRIGGER trg_cobro_folio BEFORE INSERT ON cobros
FOR EACH ROW EXECUTE FUNCTION generate_cobro_folio();

CREATE OR REPLACE FUNCTION generate_ruta_cob_folio()
RETURNS TRIGGER AS $$
DECLARE next_num int; yyyymm text;
BEGIN
  IF NEW.folio IS NULL OR NEW.folio = '' THEN
    yyyymm := to_char(now(), 'YYYYMM');
    PERFORM pg_advisory_xact_lock(hashtext('ruta_cob_folio'));
    SELECT COALESCE(MAX(CAST(SUBSTRING(folio FROM 'RC-' || yyyymm || '-(\d+)') AS int)), 0) + 1
    INTO next_num FROM rutas_cobranza WHERE folio LIKE 'RC-' || yyyymm || '-%';
    NEW.folio := 'RC-' || yyyymm || '-' || LPAD(next_num::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ruta_cob_folio ON rutas_cobranza;
CREATE TRIGGER trg_ruta_cob_folio BEFORE INSERT ON rutas_cobranza
FOR EACH ROW EXECUTE FUNCTION generate_ruta_cob_folio();

-- RLS
ALTER TABLE cobros ENABLE ROW LEVEL SECURITY;
ALTER TABLE cobros_facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE rutas_cobranza ENABLE ROW LEVEL SECURITY;
ALTER TABLE rutas_cobranza_clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cobros_admin_sec_cont" ON cobros FOR ALL
  USING (public.has_any_role(ARRAY['admin'::public.app_role, 'secretaria'::public.app_role, 'contadora'::public.app_role]));
CREATE POLICY "cobros_vendedor_propios" ON cobros FOR SELECT
  USING (capturado_por = auth.uid());
CREATE POLICY "cobros_vendedor_insert" ON cobros FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "cobros_fact_read" ON cobros_facturas FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "cobros_fact_write" ON cobros_facturas FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "cobros_fact_admin" ON cobros_facturas FOR ALL
  USING (public.has_any_role(ARRAY['admin'::public.app_role, 'secretaria'::public.app_role, 'contadora'::public.app_role]));

CREATE POLICY "rutas_cob_admin" ON rutas_cobranza FOR ALL
  USING (public.has_any_role(ARRAY['admin'::public.app_role, 'secretaria'::public.app_role]));
CREATE POLICY "rutas_cob_vendedor" ON rutas_cobranza FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "rutas_cli_admin" ON rutas_cobranza_clientes FOR ALL
  USING (public.has_any_role(ARRAY['admin'::public.app_role, 'secretaria'::public.app_role]));
CREATE POLICY "rutas_cli_read" ON rutas_cobranza_clientes FOR SELECT USING (auth.uid() IS NOT NULL);
