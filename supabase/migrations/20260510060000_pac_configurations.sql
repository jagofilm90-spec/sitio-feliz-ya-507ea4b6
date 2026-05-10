-- ============================================
-- PAC CONFIGURATIONS — Architecture PAC-Agnostic
-- Patrón: Oracle NetSuite + SAP S/4HANA
-- APLICAR MANUALMENTE en Lovable SQL Editor
-- ============================================

-- 1. Tabla de PACs disponibles (catálogo)
CREATE TABLE IF NOT EXISTS pac_providers (
  id text PRIMARY KEY,
  nombre text NOT NULL,
  descripcion text,
  url_sandbox text,
  url_produccion text,
  documentacion_url text,
  precio_promedio_timbre numeric(8,4),
  soporta_carta_porte_31 boolean DEFAULT true,
  soporta_cfdi_40 boolean DEFAULT true,
  soporta_complemento_pagos boolean DEFAULT true,
  status text DEFAULT 'disponible',
  created_at timestamptz DEFAULT now()
);

INSERT INTO pac_providers (id, nombre, descripcion, url_sandbox, url_produccion, documentacion_url, precio_promedio_timbre) VALUES
('facturama', 'Facturama', 'PAC con API REST excelente y sandbox público', 'https://apisandbox.facturama.mx', 'https://api.facturama.mx', 'https://apisandbox.facturama.mx/docs', 0.50),
('finkok', 'Finkok', 'PAC enterprise con SOAP/REST', 'https://demo-facturacion.finkok.com', 'https://facturacion.finkok.com', 'https://wiki.finkok.com', 0.45),
('sw_sapien', 'SW Smarter Web (Sapien)', 'PAC enterprise robusto', 'http://services.test.sw.com.mx', 'https://services.sw.com.mx', 'https://developers.sw.com.mx', 0.60)
ON CONFLICT (id) DO NOTHING;

-- 2. Configuración del PAC activo del tenant (ALMASA)
CREATE TABLE IF NOT EXISTS pac_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pac_provider_id text REFERENCES pac_providers(id) NOT NULL,
  api_key text,
  api_secret text,
  username text,
  password_encrypted text,
  modo text DEFAULT 'sandbox',
  rfc_emisor text NOT NULL,
  razon_social_emisor text NOT NULL,
  regimen_fiscal_emisor text NOT NULL,
  certificado_csd_url text,
  llave_csd_url text,
  password_csd_encrypted text,
  activo boolean DEFAULT true,
  ultimo_test_conexion timestamptz,
  ultimo_test_exitoso boolean,
  ultimo_test_mensaje text,
  created_at timestamptz DEFAULT now(),
  created_by uuid,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

CREATE INDEX IF NOT EXISTS idx_pac_config_activo ON pac_configurations(activo);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pac_config_unico_activo
  ON pac_configurations(activo) WHERE activo = true;

-- 3. Log de transacciones PAC
CREATE TABLE IF NOT EXISTS pac_transacciones_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carta_porte_id uuid REFERENCES cartas_porte(id),
  pac_provider_id text REFERENCES pac_providers(id),
  tipo_operacion text NOT NULL,
  request_payload jsonb,
  response_payload jsonb,
  exitoso boolean,
  codigo_error text,
  mensaje_error text,
  duracion_ms int,
  created_at timestamptz DEFAULT now(),
  created_by uuid
);

CREATE INDEX IF NOT EXISTS idx_pac_log_cp ON pac_transacciones_log(carta_porte_id);
CREATE INDEX IF NOT EXISTS idx_pac_log_fecha ON pac_transacciones_log(created_at DESC);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE pac_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pac_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pac_transacciones_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pac_providers_select" ON pac_providers FOR SELECT USING (true);
CREATE POLICY "pac_providers_admin" ON pac_providers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "pac_config_admin" ON pac_configurations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "pac_log_select" ON pac_transacciones_log FOR SELECT
  USING (public.has_any_role(ARRAY['admin'::public.app_role, 'secretaria'::public.app_role]));

CREATE POLICY "pac_log_insert" ON pac_transacciones_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- STORAGE BUCKET
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('cartas-porte', 'cartas-porte', false)
ON CONFLICT (id) DO NOTHING;
