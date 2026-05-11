-- ============================================
-- LA CORONA — Anti-robo Foundation + Hoja de Salida V4
-- REEMPLAZA migration 20260511010000 (si se aplicó)
-- APLICAR MANUALMENTE en Lovable SQL Editor
-- ============================================

-- Drop tablas anteriores si existen (de migration previa)
DROP TABLE IF EXISTS hojas_fisicas CASCADE;
DROP TABLE IF EXISTS score_confianza CASCADE;

-- 1. Catálogo momentos clave (recrear con datos nuevos)
DROP TABLE IF EXISTS eventos_conciliacion CASCADE;
DROP TABLE IF EXISTS discrepancias_la_corona CASCADE;
DROP TABLE IF EXISTS anomalias_la_corona CASCADE;
DROP TABLE IF EXISTS momentos_clave CASCADE;

CREATE TABLE momentos_clave (
  id text PRIMARY KEY,
  orden_secuencia int NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  rol_responsable text,
  requiere_firma boolean DEFAULT false,
  requiere_gps boolean DEFAULT false,
  requiere_foto boolean DEFAULT false,
  bloqueante boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

INSERT INTO momentos_clave (id, orden_secuencia, nombre, descripcion, rol_responsable, requiere_firma, requiere_gps, requiere_foto, bloqueante) VALUES
('almacen_surte', 1, 'Almacén surte pedido', 'Almacenista marca productos surtidos en tablet', 'almacen', true, false, false, true),
('sistema_genera_hoja', 2, 'Sistema genera Hoja de Salida', 'PDF auto al terminar carga', 'sistema', false, false, false, true),
('chofer_recibe', 3, 'Chofer recibe mercancía + hoja', 'Firma digital chofer en tablet', 'chofer', true, false, true, true),
('chofer_sale', 4, 'Chofer sale de bodega', 'Geo-fence salida + GPS on', 'chofer', false, true, false, false),
('en_ruta', 5, 'Chofer en ruta', 'GPS continuo', 'chofer', false, true, false, false),
('cliente_sella_firma', 6, 'Cliente sella y firma hoja', 'Chofer toma foto hoja sellada', 'chofer', false, false, true, true),
('ia_procesa', 7, 'IA procesa hoja física', 'OCR Claude Vision (SEMANA 1B)', 'sistema', false, false, false, false),
('chofer_regresa', 8, 'Chofer regresa a bodega', 'Geo-fence retorno + entrega hojas', 'chofer', false, true, false, false),
('reconciliacion_final', 9, 'Reconciliación final admin', 'Admin valida digital vs físico', 'admin', false, false, false, false);

-- 2. Hojas de Salida (documento principal)
CREATE TABLE IF NOT EXISTS hojas_salida (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio text UNIQUE NOT NULL,
  entrega_id uuid REFERENCES entregas(id) ON DELETE RESTRICT,
  pedido_id uuid REFERENCES pedidos(id),
  carta_porte_id uuid REFERENCES cartas_porte(id),
  requiere_carta_porte boolean DEFAULT false,
  estado text DEFAULT 'generada',
  oc_cliente text,
  tipo_entrega text DEFAULT 'unica',
  terminos_pago text,
  fecha_emision timestamptz DEFAULT now(),
  fecha_entrega_programada timestamptz,
  hora_estimada_llegada time,
  cliente_razon_social text,
  cliente_rfc text,
  cliente_direccion text,
  cliente_contacto_nombre text,
  cliente_contacto_telefono text,
  cliente_notas text,
  vehiculo_id uuid REFERENCES vehiculos(id),
  vehiculo_placa text,
  vehiculo_descripcion text,
  ruta_id uuid REFERENCES rutas(id),
  ruta_folio text,
  tiene_refrigerados boolean DEFAULT false,
  tiene_fragiles boolean DEFAULT false,
  tiene_peligrosos boolean DEFAULT false,
  avisos_especiales text,
  total_items_pedidos int DEFAULT 0,
  total_items_surtidos int DEFAULT 0,
  total_bultos int DEFAULT 0,
  peso_bruto_kg numeric(10,2) DEFAULT 0,
  generada_at timestamptz DEFAULT now(),
  generada_por uuid,
  impresa_at timestamptz,
  surtida_at timestamptz,
  surtida_por uuid,
  entregada_chofer_at timestamptz,
  entregada_chofer_por uuid,
  salida_bodega_at timestamptz,
  entregada_cliente_at timestamptz,
  regresada_bodega_at timestamptz,
  reconciliada_at timestamptz,
  reconciliada_por uuid,
  pdf_url text,
  foto_sellada_url text,
  reconciliacion_estado text DEFAULT 'pendiente',
  reconciliacion_observaciones text,
  reconciliacion_items_faltantes jsonb,
  ia_procesada_at timestamptz,
  ia_sello_detectado boolean,
  ia_firma_detectada boolean,
  ia_observaciones_texto text,
  ia_clasificacion text,
  ia_raw_response jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hojas_salida_folio ON hojas_salida(folio);
CREATE INDEX IF NOT EXISTS idx_hojas_salida_entrega ON hojas_salida(entrega_id);
CREATE INDEX IF NOT EXISTS idx_hojas_salida_estado ON hojas_salida(estado);
CREATE INDEX IF NOT EXISTS idx_hojas_salida_fecha ON hojas_salida(fecha_emision DESC);
CREATE INDEX IF NOT EXISTS idx_hojas_salida_reconc ON hojas_salida(reconciliacion_estado);

-- 3. Líneas Hoja Salida
CREATE TABLE IF NOT EXISTS hojas_salida_lineas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hoja_salida_id uuid REFERENCES hojas_salida(id) ON DELETE CASCADE,
  pedido_detalle_id uuid,
  producto_id uuid REFERENCES productos(id),
  orden_linea int NOT NULL,
  codigo_producto text,
  descripcion_producto text,
  cantidad_pedida numeric(15,4),
  cantidad_surtida numeric(15,4),
  unidad text,
  lote text,
  notas_linea text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hojas_lineas_hoja ON hojas_salida_lineas(hoja_salida_id);

-- 4. Cuadrilla (chofer + N ayudantes)
CREATE TABLE IF NOT EXISTS cuadrilla_hoja_salida (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hoja_salida_id uuid REFERENCES hojas_salida(id) ON DELETE CASCADE,
  empleado_id uuid REFERENCES empleados(id),
  rol_en_entrega text NOT NULL,
  orden_ayudante int,
  nombre_snapshot text,
  firma_digital_url text,
  firmado_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cuadrilla_hoja ON cuadrilla_hoja_salida(hoja_salida_id);

-- 5. Eventos Conciliación (9 momentos)
CREATE TABLE eventos_conciliacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hoja_salida_id uuid REFERENCES hojas_salida(id) ON DELETE CASCADE,
  entrega_id uuid REFERENCES entregas(id),
  momento_id text REFERENCES momentos_clave(id),
  estado text DEFAULT 'completado',
  usuario_id uuid,
  usuario_nombre text,
  rol_usuario text,
  firma_url text,
  foto_url text,
  gps_lat numeric(10,7),
  gps_lng numeric(10,7),
  gps_accuracy numeric(8,2),
  dentro_geo_fence boolean,
  completado_at timestamptz DEFAULT now(),
  duracion_segundos int,
  tiene_anomalia boolean DEFAULT false,
  anomalia_tipo text,
  anomalia_detalle text,
  notas text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eventos_concil_hoja ON eventos_conciliacion(hoja_salida_id);
CREATE INDEX IF NOT EXISTS idx_eventos_concil_momento ON eventos_conciliacion(momento_id);
CREATE INDEX IF NOT EXISTS idx_eventos_concil_anomalia ON eventos_conciliacion(tiene_anomalia) WHERE tiene_anomalia = true;

-- 6. Discrepancias
CREATE TABLE discrepancias_la_corona (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hoja_salida_id uuid REFERENCES hojas_salida(id),
  entrega_id uuid REFERENCES entregas(id),
  tipo_discrepancia text NOT NULL,
  producto_id uuid REFERENCES productos(id),
  cantidad_esperada numeric(15,4),
  cantidad_real numeric(15,4),
  diferencia numeric(15,4),
  valor_monetario numeric(12,2),
  detectado_por text,
  detectado_at timestamptz DEFAULT now(),
  empleado_responsable_id uuid REFERENCES empleados(id),
  estado_investigacion text DEFAULT 'pendiente',
  resolucion text,
  resolucion_at timestamptz,
  resolucion_por uuid,
  severidad text DEFAULT 'media',
  es_robo_sospechado boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discrepancias_hoja ON discrepancias_la_corona(hoja_salida_id);
CREATE INDEX IF NOT EXISTS idx_discrepancias_estado ON discrepancias_la_corona(estado_investigacion);

-- 7. Score Confianza Empleado
CREATE TABLE IF NOT EXISTS score_confianza_empleado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id uuid REFERENCES empleados(id) ON DELETE CASCADE,
  score_actual numeric(5,2) DEFAULT 100.00,
  factor_entregas_exitosas numeric(5,2),
  factor_discrepancias_30d int DEFAULT 0,
  factor_robos_sospechados int DEFAULT 0,
  score_anterior numeric(5,2),
  tendencia text DEFAULT 'estable',
  bandera_amarilla boolean DEFAULT false,
  bandera_roja boolean DEFAULT false,
  ultimo_calculo timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(empleado_id)
);

CREATE INDEX IF NOT EXISTS idx_score_empleado ON score_confianza_empleado(empleado_id);

-- 8. Anomalías
CREATE TABLE anomalias_la_corona (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_anomalia text NOT NULL,
  hoja_salida_id uuid REFERENCES hojas_salida(id),
  entrega_id uuid REFERENCES entregas(id),
  empleado_id uuid REFERENCES empleados(id),
  severidad text DEFAULT 'media',
  detalle jsonb DEFAULT '{}',
  notificado_admin boolean DEFAULT false,
  estado text DEFAULT 'abierta',
  cerrada_at timestamptz,
  cerrada_por uuid,
  resolucion text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anomalias_hoja ON anomalias_la_corona(hoja_salida_id);
CREATE INDEX IF NOT EXISTS idx_anomalias_estado ON anomalias_la_corona(estado);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE momentos_clave ENABLE ROW LEVEL SECURITY;
ALTER TABLE hojas_salida ENABLE ROW LEVEL SECURITY;
ALTER TABLE hojas_salida_lineas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuadrilla_hoja_salida ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_conciliacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE discrepancias_la_corona ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_confianza_empleado ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomalias_la_corona ENABLE ROW LEVEL SECURITY;

CREATE POLICY "momentos_select" ON momentos_clave FOR SELECT USING (true);

CREATE POLICY "hojas_admin_sec" ON hojas_salida FOR ALL
  USING (public.has_any_role(ARRAY['admin'::public.app_role, 'secretaria'::public.app_role]));
CREATE POLICY "hojas_almacen_read" ON hojas_salida FOR SELECT
  USING (public.has_any_role(ARRAY['almacen'::public.app_role, 'gerente_almacen'::public.app_role]));
CREATE POLICY "hojas_chofer_read" ON hojas_salida FOR SELECT
  USING (public.has_role(auth.uid(), 'chofer'::public.app_role));
CREATE POLICY "hojas_chofer_upd" ON hojas_salida FOR UPDATE
  USING (public.has_role(auth.uid(), 'chofer'::public.app_role));
CREATE POLICY "hojas_insert_auth" ON hojas_salida FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "lineas_read" ON hojas_salida_lineas FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "lineas_write" ON hojas_salida_lineas FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "cuadrilla_read" ON cuadrilla_hoja_salida FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "cuadrilla_write" ON cuadrilla_hoja_salida FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "eventos_read" ON eventos_conciliacion FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "eventos_write" ON eventos_conciliacion FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "eventos_admin_upd" ON eventos_conciliacion FOR UPDATE
  USING (public.has_any_role(ARRAY['admin'::public.app_role, 'secretaria'::public.app_role]));

CREATE POLICY "discrepancias_admin" ON discrepancias_la_corona FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "score_admin" ON score_confianza_empleado FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "anomalias_read" ON anomalias_la_corona FOR SELECT
  USING (public.has_any_role(ARRAY['admin'::public.app_role, 'secretaria'::public.app_role]));
CREATE POLICY "anomalias_write" ON anomalias_la_corona FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "anomalias_admin_upd" ON anomalias_la_corona FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================
-- TRIGGER: Folio atómico HS-YYYYMM-NNNN
-- ============================================

CREATE OR REPLACE FUNCTION generate_hoja_salida_folio()
RETURNS TRIGGER AS $$
DECLARE
  next_num int;
  yyyymm text;
BEGIN
  IF NEW.folio IS NULL OR NEW.folio = '' THEN
    yyyymm := to_char(now(), 'YYYYMM');
    PERFORM pg_advisory_xact_lock(hashtext('hoja_salida_folio'));
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(folio FROM 'HS-' || yyyymm || '-(\d+)') AS int)
    ), 0) + 1
    INTO next_num
    FROM hojas_salida
    WHERE folio LIKE 'HS-' || yyyymm || '-%';
    NEW.folio := 'HS-' || yyyymm || '-' || LPAD(next_num::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hoja_salida_folio ON hojas_salida;
CREATE TRIGGER trg_hoja_salida_folio
BEFORE INSERT ON hojas_salida
FOR EACH ROW EXECUTE FUNCTION generate_hoja_salida_folio();

-- ============================================
-- STORAGE BUCKET
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('hojas-salida', 'hojas-salida', false)
ON CONFLICT (id) DO NOTHING;
