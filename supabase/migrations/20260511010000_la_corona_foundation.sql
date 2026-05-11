-- ============================================
-- LA CORONA — Anti-robo Foundation
-- Principio Biblia #11: "El Sistema Todo lo Ve"
-- Reconciliación Papel Físico + Digital
-- APLICAR MANUALMENTE en Lovable SQL Editor
-- ============================================

-- 1. Momentos clave del ciclo de entrega
CREATE TABLE IF NOT EXISTS momentos_clave (
  id text PRIMARY KEY,
  orden_secuencia int NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  rol_responsable text NOT NULL,
  requiere_firma boolean DEFAULT false,
  requiere_gps boolean DEFAULT false,
  requiere_foto boolean DEFAULT false,
  requiere_qr boolean DEFAULT false,
  bloqueante boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

INSERT INTO momentos_clave (id, orden_secuencia, nombre, descripcion, rol_responsable, requiere_firma, requiere_gps, requiere_foto, requiere_qr, bloqueante) VALUES
('almacen_surte', 1, 'Almacén surte pedido', 'Almacenista prepara mercancía', 'almacenista', true, false, true, false, true),
('sistema_imprime_hoja', 2, 'Sistema imprime hoja física', 'PDF generado con espacios sello/firma', 'almacenista', false, false, false, false, true),
('chofer_recibe_mercancia', 3, 'Chofer recibe mercancía + hoja', 'Chofer firma digital recepción', 'chofer', true, false, true, false, true),
('chofer_sale_bodega', 4, 'Chofer sale de bodega', 'Geo-fence salida + GPS on', 'chofer', false, true, false, false, false),
('chofer_en_ruta', 5, 'Chofer en ruta', 'GPS continuo durante recorrido', 'chofer', false, true, false, false, false),
('cliente_recibe_fisico', 6, 'Cliente sella y firma hoja física', 'Chofer toma foto hoja sellada', 'chofer', false, false, true, false, true),
('ia_procesa_hoja', 7, 'IA procesa hoja física', 'OCR + Claude detecta sello/firma/observaciones', 'admin', false, false, false, false, false),
('chofer_regresa_bodega', 8, 'Chofer regresa a bodega', 'Geo-fence retorno + entrega hojas', 'chofer', false, true, false, false, false),
('reconciliacion_final', 9, 'Reconciliación final admin', 'Validación digital vs físico', 'admin', false, false, false, false, false)
ON CONFLICT (id) DO NOTHING;

-- 2. Eventos de conciliación por entrega
CREATE TABLE IF NOT EXISTS eventos_conciliacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id uuid REFERENCES entregas(id) ON DELETE CASCADE,
  momento_id text REFERENCES momentos_clave(id),
  empleado_id uuid REFERENCES empleados(id),
  timestamp_evento timestamptz DEFAULT now(),
  latitud numeric(10,7),
  longitud numeric(10,7),
  firma_base64 text,
  foto_url text,
  notas text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eventos_conc_entrega ON eventos_conciliacion(entrega_id);
CREATE INDEX IF NOT EXISTS idx_eventos_conc_momento ON eventos_conciliacion(momento_id);
CREATE INDEX IF NOT EXISTS idx_eventos_conc_empleado ON eventos_conciliacion(empleado_id);
CREATE INDEX IF NOT EXISTS idx_eventos_conc_fecha ON eventos_conciliacion(timestamp_evento DESC);

-- 3. Discrepancias detectadas
CREATE TABLE IF NOT EXISTS discrepancias_la_corona (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id uuid REFERENCES entregas(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  severidad text DEFAULT 'media',
  descripcion text NOT NULL,
  evidencia_digital jsonb,
  evidencia_fisica jsonb,
  estado_investigacion text DEFAULT 'pendiente',
  investigado_por uuid REFERENCES auth.users(id),
  investigado_at timestamptz,
  resolucion text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discrepancias_entrega ON discrepancias_la_corona(entrega_id);
CREATE INDEX IF NOT EXISTS idx_discrepancias_estado ON discrepancias_la_corona(estado_investigacion);
CREATE INDEX IF NOT EXISTS idx_discrepancias_sev ON discrepancias_la_corona(severidad);

-- 4. Score de confianza por empleado
CREATE TABLE IF NOT EXISTS score_confianza (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id uuid REFERENCES empleados(id) ON DELETE CASCADE,
  periodo text NOT NULL,
  entregas_totales int DEFAULT 0,
  entregas_sin_discrepancia int DEFAULT 0,
  discrepancias_leves int DEFAULT 0,
  discrepancias_medias int DEFAULT 0,
  discrepancias_graves int DEFAULT 0,
  score numeric(5,2) DEFAULT 100.00,
  tendencia text DEFAULT 'estable',
  calculado_at timestamptz DEFAULT now(),
  UNIQUE(empleado_id, periodo)
);

CREATE INDEX IF NOT EXISTS idx_score_empleado ON score_confianza(empleado_id);

-- 5. Anomalías detectadas automáticamente
CREATE TABLE IF NOT EXISTS anomalias_la_corona (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  severidad text DEFAULT 'media',
  descripcion text NOT NULL,
  entrega_id uuid REFERENCES entregas(id),
  empleado_id uuid REFERENCES empleados(id),
  ruta_id uuid REFERENCES rutas(id),
  datos_anomalia jsonb DEFAULT '{}',
  revisada boolean DEFAULT false,
  revisada_por uuid REFERENCES auth.users(id),
  revisada_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anomalias_tipo ON anomalias_la_corona(tipo);
CREATE INDEX IF NOT EXISTS idx_anomalias_revisada ON anomalias_la_corona(revisada);
CREATE INDEX IF NOT EXISTS idx_anomalias_fecha ON anomalias_la_corona(created_at DESC);

-- 6. Hojas físicas (papel → digital)
CREATE TABLE IF NOT EXISTS hojas_fisicas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id uuid REFERENCES entregas(id) ON DELETE CASCADE,
  pdf_url text NOT NULL,
  pdf_folio text UNIQUE,
  generado_at timestamptz DEFAULT now(),
  foto_sellada_url text,
  foto_capturada_at timestamptz,
  foto_capturada_por uuid REFERENCES empleados(id),
  ia_procesada_at timestamptz,
  ia_sello_detectado boolean,
  ia_sello_confianza numeric(5,2),
  ia_firma_detectada boolean,
  ia_firma_confianza numeric(5,2),
  ia_observaciones_texto text,
  ia_clasificacion text,
  ia_items_faltantes jsonb,
  ia_raw_response jsonb,
  reconciliado_at timestamptz,
  reconciliado_por uuid,
  reconciliacion_estado text DEFAULT 'pendiente',
  reconciliacion_notas text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hojas_fisicas_entrega ON hojas_fisicas(entrega_id);
CREATE INDEX IF NOT EXISTS idx_hojas_fisicas_folio ON hojas_fisicas(pdf_folio);
CREATE INDEX IF NOT EXISTS idx_hojas_fisicas_reconc ON hojas_fisicas(reconciliacion_estado);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE momentos_clave ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_conciliacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE discrepancias_la_corona ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_confianza ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomalias_la_corona ENABLE ROW LEVEL SECURITY;
ALTER TABLE hojas_fisicas ENABLE ROW LEVEL SECURITY;

-- momentos_clave: lectura pública
CREATE POLICY "momentos_select" ON momentos_clave FOR SELECT USING (true);

-- eventos_conciliacion: admin+secretaria full, chofer/almacen insert sus propios
CREATE POLICY "eventos_conc_admin" ON eventos_conciliacion FOR ALL
  USING (public.has_any_role(ARRAY['admin'::public.app_role, 'secretaria'::public.app_role]));
CREATE POLICY "eventos_conc_insert" ON eventos_conciliacion FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "eventos_conc_read" ON eventos_conciliacion FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- discrepancias: solo admin
CREATE POLICY "discrepancias_admin" ON discrepancias_la_corona FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "discrepancias_read_sec" ON discrepancias_la_corona FOR SELECT
  USING (public.has_role(auth.uid(), 'secretaria'::public.app_role));

-- score: admin lee, sistema escribe
CREATE POLICY "score_admin" ON score_confianza FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "score_read_sec" ON score_confianza FOR SELECT
  USING (public.has_role(auth.uid(), 'secretaria'::public.app_role));

-- anomalías: admin full
CREATE POLICY "anomalias_admin" ON anomalias_la_corona FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "anomalias_read_sec" ON anomalias_la_corona FOR SELECT
  USING (public.has_role(auth.uid(), 'secretaria'::public.app_role));

-- hojas_fisicas: admin+secretaria full, chofer update (subir foto)
CREATE POLICY "hojas_admin_sec" ON hojas_fisicas FOR ALL
  USING (public.has_any_role(ARRAY['admin'::public.app_role, 'secretaria'::public.app_role]));
CREATE POLICY "hojas_chofer_update" ON hojas_fisicas FOR UPDATE
  USING (public.has_role(auth.uid(), 'chofer'::public.app_role));
CREATE POLICY "hojas_chofer_read" ON hojas_fisicas FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "hojas_insert_any" ON hojas_fisicas FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- TRIGGER: folio hoja física
-- ============================================

CREATE OR REPLACE FUNCTION generate_hoja_fisica_folio()
RETURNS TRIGGER AS $$
DECLARE
  next_num int;
  yyyymm text;
BEGIN
  IF NEW.pdf_folio IS NULL THEN
    yyyymm := to_char(now(), 'YYYYMM');
    PERFORM pg_advisory_xact_lock(hashtext('hoja_fisica_folio'));
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(pdf_folio FROM 'HF-' || yyyymm || '-(\d+)') AS int)
    ), 0) + 1
    INTO next_num
    FROM hojas_fisicas
    WHERE pdf_folio LIKE 'HF-' || yyyymm || '-%';
    NEW.pdf_folio := 'HF-' || yyyymm || '-' || LPAD(next_num::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_hoja_fisica_folio
BEFORE INSERT ON hojas_fisicas
FOR EACH ROW EXECUTE FUNCTION generate_hoja_fisica_folio();

-- ============================================
-- TRIGGER: auto-detectar anomalías
-- ============================================

CREATE OR REPLACE FUNCTION detect_la_corona_anomalias()
RETURNS TRIGGER AS $$
BEGIN
  -- Anomalía: hoja procesada con faltantes
  IF NEW.ia_clasificacion = 'faltante' AND NEW.ia_items_faltantes IS NOT NULL THEN
    INSERT INTO anomalias_la_corona (tipo, severidad, descripcion, entrega_id, datos_anomalia)
    VALUES (
      'faltante_detectado_ia',
      'alta',
      'IA detectó mercancía faltante en hoja física: ' || COALESCE(NEW.ia_observaciones_texto, ''),
      NEW.entrega_id,
      jsonb_build_object('hoja_fisica_id', NEW.id, 'items_faltantes', NEW.ia_items_faltantes, 'clasificacion', NEW.ia_clasificacion)
    );
  END IF;

  -- Anomalía: no llegó nada
  IF NEW.ia_clasificacion = 'no_llego' THEN
    INSERT INTO anomalias_la_corona (tipo, severidad, descripcion, entrega_id, datos_anomalia)
    VALUES (
      'entrega_no_realizada_ia',
      'critica',
      'IA detectó que la mercancía NO LLEGÓ según hoja física',
      NEW.entrega_id,
      jsonb_build_object('hoja_fisica_id', NEW.id, 'observaciones', NEW.ia_observaciones_texto)
    );
  END IF;

  -- Anomalía: sin sello ni firma
  IF NEW.ia_sello_detectado = false AND NEW.ia_firma_detectada = false AND NEW.ia_procesada_at IS NOT NULL THEN
    INSERT INTO anomalias_la_corona (tipo, severidad, descripcion, entrega_id, datos_anomalia)
    VALUES (
      'hoja_sin_sello_ni_firma',
      'alta',
      'Hoja física sin sello ni firma detectados por IA',
      NEW.entrega_id,
      jsonb_build_object('hoja_fisica_id', NEW.id, 'sello_confianza', NEW.ia_sello_confianza, 'firma_confianza', NEW.ia_firma_confianza)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_hoja_anomalias
AFTER UPDATE OF ia_clasificacion ON hojas_fisicas
FOR EACH ROW
WHEN (NEW.ia_procesada_at IS NOT NULL AND OLD.ia_procesada_at IS NULL)
EXECUTE FUNCTION detect_la_corona_anomalias();

-- ============================================
-- STORAGE BUCKET
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('hojas-fisicas', 'hojas-fisicas', false)
ON CONFLICT (id) DO NOTHING;
