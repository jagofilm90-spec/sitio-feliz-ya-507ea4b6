-- ============================================
-- LA CORONA CAPA 6+7: GPS Geo-fence + Alertas
-- APLICAR MANUALMENTE en Lovable SQL Editor
-- ============================================

-- 1. Geo-fences
CREATE TABLE IF NOT EXISTS geo_fences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  cliente_id uuid,
  ruta_id uuid,
  centro_lat numeric(10,7) NOT NULL,
  centro_lng numeric(10,7) NOT NULL,
  radio_metros int DEFAULT 100,
  nombre text,
  descripcion text,
  activo boolean DEFAULT true,
  horario_inicio time,
  horario_fin time,
  trigger_entrada_alerta boolean DEFAULT false,
  trigger_salida_alerta boolean DEFAULT false,
  severidad_alerta text DEFAULT 'media',
  created_at timestamptz DEFAULT now(),
  created_by uuid
);

CREATE INDEX IF NOT EXISTS idx_geofences_tipo ON geo_fences(tipo);
CREATE INDEX IF NOT EXISTS idx_geofences_activo ON geo_fences(activo) WHERE activo = true;

-- 2. Eventos geo-fence
CREATE TABLE IF NOT EXISTS eventos_geofence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  geofence_id uuid REFERENCES geo_fences(id),
  user_id uuid,
  vehiculo_id uuid,
  hoja_salida_id uuid,
  tipo_evento text NOT NULL,
  lat numeric(10,7),
  lng numeric(10,7),
  velocidad_kmh numeric(6,2),
  duracion_dwell_minutos int,
  alerta_disparada boolean DEFAULT false,
  detectado_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eventos_gf_geofence ON eventos_geofence(geofence_id);
CREATE INDEX IF NOT EXISTS idx_eventos_gf_user ON eventos_geofence(user_id);
CREATE INDEX IF NOT EXISTS idx_eventos_gf_fecha ON eventos_geofence(detectado_at DESC);

-- 3. Desviaciones de ruta
CREATE TABLE IF NOT EXISTS desviaciones_ruta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ruta_id uuid,
  hoja_salida_id uuid,
  user_id uuid,
  vehiculo_id uuid,
  tipo_desviacion text NOT NULL,
  lat numeric(10,7),
  lng numeric(10,7),
  distancia_del_waypoint_km numeric(8,2),
  velocidad_kmh numeric(6,2),
  duracion_minutos int,
  iniciada_at timestamptz NOT NULL,
  finalizada_at timestamptz,
  severidad text DEFAULT 'media',
  estado text DEFAULT 'detectada',
  justificacion_chofer text,
  justificada_at timestamptz,
  resuelta_por uuid,
  resuelta_at timestamptz,
  resolucion_notas text,
  anomalia_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_desviaciones_estado ON desviaciones_ruta(estado);
CREATE INDEX IF NOT EXISTS idx_desviaciones_user ON desviaciones_ruta(user_id);
CREATE INDEX IF NOT EXISTS idx_desviaciones_fecha ON desviaciones_ruta(iniciada_at DESC);

-- 4. Alertas LA CORONA
CREATE TABLE IF NOT EXISTS alertas_la_corona (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_alerta text NOT NULL,
  severidad text NOT NULL DEFAULT 'media',
  titulo text NOT NULL,
  mensaje text NOT NULL,
  user_id uuid,
  hoja_salida_id uuid,
  desviacion_id uuid,
  discrepancia_id uuid,
  anomalia_id uuid,
  lat numeric(10,7),
  lng numeric(10,7),
  estado text DEFAULT 'activa',
  destinatarios_roles text[] DEFAULT ARRAY['admin'],
  vista_por uuid,
  vista_at timestamptz,
  resuelta_por uuid,
  resuelta_at timestamptz,
  resolucion_notas text,
  requiere_sonido boolean DEFAULT false,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alertas_estado ON alertas_la_corona(estado);
CREATE INDEX IF NOT EXISTS idx_alertas_severidad ON alertas_la_corona(severidad);
CREATE INDEX IF NOT EXISTS idx_alertas_fecha ON alertas_la_corona(created_at DESC);

-- ============================================
-- RLS
-- ============================================

ALTER TABLE geo_fences ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_geofence ENABLE ROW LEVEL SECURITY;
ALTER TABLE desviaciones_ruta ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas_la_corona ENABLE ROW LEVEL SECURITY;

CREATE POLICY "geofences_admin" ON geo_fences FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "geofences_read" ON geo_fences FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "eventos_gf_admin" ON eventos_geofence FOR ALL
  USING (public.has_any_role(ARRAY['admin'::public.app_role, 'secretaria'::public.app_role]));
CREATE POLICY "eventos_gf_insert" ON eventos_geofence FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "desviaciones_admin" ON desviaciones_ruta FOR ALL
  USING (public.has_any_role(ARRAY['admin'::public.app_role, 'secretaria'::public.app_role]));
CREATE POLICY "desviaciones_chofer_upd" ON desviaciones_ruta FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "alertas_admin" ON alertas_la_corona FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "alertas_sec_read" ON alertas_la_corona FOR SELECT
  USING (public.has_role(auth.uid(), 'secretaria'::public.app_role));
