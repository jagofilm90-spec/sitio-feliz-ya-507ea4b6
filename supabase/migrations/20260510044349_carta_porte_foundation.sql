-- ============================================
-- CARTA PORTE 3.1 — FOUNDATION TABLES
-- Versión SAT: 3.1 (vigente desde abril 2024)
-- Gap V del blueprint (/audit/37, /audit/40)
-- ============================================

-- 1. Catálogos SAT (auto-actualizables)
CREATE TABLE IF NOT EXISTS sat_catalogos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalogo text NOT NULL,
  clave text NOT NULL,
  descripcion text NOT NULL,
  vigente_desde date,
  vigente_hasta date,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(catalogo, clave)
);

CREATE INDEX IF NOT EXISTS idx_sat_catalogos_catalogo ON sat_catalogos(catalogo);
CREATE INDEX IF NOT EXISTS idx_sat_catalogos_clave ON sat_catalogos(catalogo, clave);

-- 2. Permisos SICT por vehículo
CREATE TABLE IF NOT EXISTS permisos_sict (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id uuid REFERENCES vehiculos(id) ON DELETE CASCADE,
  tipo_permiso text NOT NULL,
  numero_permiso text NOT NULL,
  fecha_emision date,
  fecha_vencimiento date,
  estado text DEFAULT 'vigente',
  documento_url text,
  observaciones text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_permisos_sict_vehiculo ON permisos_sict(vehiculo_id);

-- 3. Cartas Porte (documento principal)
CREATE TABLE IF NOT EXISTS cartas_porte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio text UNIQUE,
  ruta_id uuid REFERENCES rutas(id),
  vehiculo_id uuid REFERENCES vehiculos(id),
  chofer_id uuid,

  tipo_cfdi text NOT NULL DEFAULT 'T',
  transp_internac text DEFAULT 'No',
  total_dist_recorrida numeric(10,2),

  estado text DEFAULT 'borrador',
  id_ccp uuid DEFAULT gen_random_uuid(),

  uuid_sat text,
  xml_url text,
  pdf_url text,
  fecha_timbrado timestamptz,
  pac_usado text,
  pac_response jsonb,

  uuid_cancelacion text,
  fecha_cancelacion timestamptz,
  motivo_cancelacion text,

  errores_validacion jsonb DEFAULT '[]',

  created_at timestamptz DEFAULT now(),
  created_by uuid,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

CREATE INDEX IF NOT EXISTS idx_cartas_porte_folio ON cartas_porte(folio);
CREATE INDEX IF NOT EXISTS idx_cartas_porte_ruta ON cartas_porte(ruta_id);
CREATE INDEX IF NOT EXISTS idx_cartas_porte_estado ON cartas_porte(estado);
CREATE INDEX IF NOT EXISTS idx_cartas_porte_fecha ON cartas_porte(created_at DESC);

-- 4. Ubicaciones (origen + destinos)
CREATE TABLE IF NOT EXISTS cp_ubicaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carta_porte_id uuid REFERENCES cartas_porte(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  orden_secuencia int NOT NULL,
  rfc text NOT NULL,
  nombre_remitente_destinatario text,
  calle text,
  numero_exterior text,
  numero_interior text,
  colonia text,
  localidad text,
  municipio text,
  estado text,
  pais text DEFAULT 'MEX',
  codigo_postal text NOT NULL,
  fecha_hora_estimada timestamptz NOT NULL,
  distancia_recorrida numeric(10,2),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cp_ubicaciones_cp ON cp_ubicaciones(carta_porte_id);

-- 5. Mercancías
CREATE TABLE IF NOT EXISTS cp_mercancias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carta_porte_id uuid REFERENCES cartas_porte(id) ON DELETE CASCADE,
  pedido_detalle_id uuid,
  bienes_transp text NOT NULL,
  descripcion text NOT NULL,
  cantidad numeric(15,4) NOT NULL,
  clave_unidad text NOT NULL,
  unidad text,
  peso_en_kg numeric(15,4) NOT NULL,
  material_peligroso boolean DEFAULT false,
  cve_material_peligroso text,
  embalaje text,
  descrip_embalaje text,
  fraccion_arancelaria text,
  uuid_comercio_ext text,
  pedimentos jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cp_mercancias_cp ON cp_mercancias(carta_porte_id);

-- 6. Autotransporte
CREATE TABLE IF NOT EXISTS cp_autotransporte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carta_porte_id uuid REFERENCES cartas_porte(id) ON DELETE CASCADE UNIQUE,
  perm_sct text NOT NULL,
  num_permiso_sct text NOT NULL,
  config_vehicular text NOT NULL,
  placa_vm text NOT NULL,
  anio_modelo_vm int NOT NULL,
  asegura_resp_civil text NOT NULL,
  poliza_resp_civil text NOT NULL,
  asegura_med_ambiente text,
  poliza_med_ambiente text,
  asegura_carga text,
  poliza_carga text,
  prima_seguro numeric(10,2),
  peso_bruto_vehicular numeric(10,2),
  created_at timestamptz DEFAULT now()
);

-- 7. Remolques
CREATE TABLE IF NOT EXISTS cp_remolques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  autotransporte_id uuid REFERENCES cp_autotransporte(id) ON DELETE CASCADE,
  subtipo_rem text NOT NULL,
  placa text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 8. Figura del Transporte
CREATE TABLE IF NOT EXISTS cp_figura_transporte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carta_porte_id uuid REFERENCES cartas_porte(id) ON DELETE CASCADE,
  tipo_figura text NOT NULL,
  rfc_figura text NOT NULL,
  num_licencia text,
  nombre_figura text NOT NULL,
  num_reg_id_trib text,
  residencia_fiscal text,
  domicilio jsonb,
  created_at timestamptz DEFAULT now()
);

-- 9. Eventos / Auditoría
CREATE TABLE IF NOT EXISTS cp_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carta_porte_id uuid REFERENCES cartas_porte(id) ON DELETE CASCADE,
  tipo_evento text NOT NULL,
  usuario_id uuid,
  usuario_nombre text,
  detalle jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cp_eventos_cp ON cp_eventos(carta_porte_id);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE sat_catalogos ENABLE ROW LEVEL SECURITY;
ALTER TABLE permisos_sict ENABLE ROW LEVEL SECURITY;
ALTER TABLE cartas_porte ENABLE ROW LEVEL SECURITY;
ALTER TABLE cp_ubicaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE cp_mercancias ENABLE ROW LEVEL SECURITY;
ALTER TABLE cp_autotransporte ENABLE ROW LEVEL SECURITY;
ALTER TABLE cp_remolques ENABLE ROW LEVEL SECURITY;
ALTER TABLE cp_figura_transporte ENABLE ROW LEVEL SECURITY;
ALTER TABLE cp_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sat_catalogos_select" ON sat_catalogos FOR SELECT USING (true);
CREATE POLICY "sat_catalogos_admin" ON sat_catalogos FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "cartas_porte_admin_secretaria" ON cartas_porte FOR ALL
  USING (
    public.has_any_role(ARRAY['admin'::public.app_role, 'secretaria'::public.app_role])
  );

CREATE POLICY "cartas_porte_read_authenticated" ON cartas_porte FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "permisos_sict_all" ON permisos_sict FOR ALL
  USING (public.has_any_role(ARRAY['admin'::public.app_role, 'secretaria'::public.app_role]));

CREATE POLICY "permisos_sict_read" ON permisos_sict FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "cp_ubicaciones_all" ON cp_ubicaciones FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "cp_mercancias_all" ON cp_mercancias FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "cp_autotransporte_all" ON cp_autotransporte FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "cp_remolques_all" ON cp_remolques FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "cp_figura_transporte_all" ON cp_figura_transporte FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "cp_eventos_all" ON cp_eventos FOR ALL
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- SEED DATA — Catálogos SAT iniciales
-- ============================================

INSERT INTO sat_catalogos (catalogo, clave, descripcion, vigente_desde) VALUES
('c_TipoPermiso', 'TPAF01', 'Autotransporte Federal de Carga General', '2020-01-01'),
('c_TipoPermiso', 'TPAF02', 'Transporte Privado de Carga', '2020-01-01'),
('c_TipoPermiso', 'TPAF03', 'Autotransporte Federal de Carga Especializada', '2020-01-01'),
('c_TipoPermiso', 'TPAF04', 'Transporte de Materiales y Residuos Peligrosos', '2020-01-01'),
('c_FiguraTransporte', '01', 'Operador', '2020-01-01'),
('c_FiguraTransporte', '02', 'Propietario', '2020-01-01'),
('c_FiguraTransporte', '03', 'Arrendador', '2020-01-01'),
('c_FiguraTransporte', '04', 'Notificado', '2020-01-01'),
('c_ConfigAutotransporte', 'VL', 'Vehiculo ligero de carga', '2020-01-01'),
('c_ConfigAutotransporte', 'C2', 'Camión Unitario (2 ejes)', '2020-01-01'),
('c_ConfigAutotransporte', 'C3', 'Camión Unitario (3 ejes)', '2020-01-01'),
('c_ConfigAutotransporte', 'T3S2', 'Tractocamión articulado', '2020-01-01')
ON CONFLICT (catalogo, clave) DO NOTHING;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION generate_carta_porte_folio()
RETURNS TRIGGER AS $$
DECLARE
  next_num int;
  yyyymm text;
BEGIN
  IF NEW.folio IS NULL THEN
    yyyymm := to_char(now(), 'YYYYMM');
    PERFORM pg_advisory_xact_lock(hashtext('carta_porte_folio'));
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(folio FROM 'CP-' || yyyymm || '-(\d+)') AS int)
    ), 0) + 1
    INTO next_num
    FROM cartas_porte
    WHERE folio LIKE 'CP-' || yyyymm || '-%';
    NEW.folio := 'CP-' || yyyymm || '-' || LPAD(next_num::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_carta_porte_folio
BEFORE INSERT ON cartas_porte
FOR EACH ROW EXECUTE FUNCTION generate_carta_porte_folio();

CREATE OR REPLACE FUNCTION update_carta_porte_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cartas_porte_updated_at
BEFORE UPDATE ON cartas_porte
FOR EACH ROW EXECUTE FUNCTION update_carta_porte_updated_at();
