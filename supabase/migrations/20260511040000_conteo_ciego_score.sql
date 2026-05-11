-- ============================================
-- LA CORONA — Inventario Ciego + Score Historial
-- APLICAR MANUALMENTE en Lovable SQL Editor
-- ============================================

-- 1. Conteos Ciegos
CREATE TABLE IF NOT EXISTS conteos_ciegos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio text UNIQUE,
  tipo text DEFAULT 'aleatorio',
  estado text DEFAULT 'programado',
  motivo text,
  programado_por uuid,
  asignado_a uuid REFERENCES empleados(id),
  inicio_at timestamptz,
  fin_at timestamptz,
  total_productos int DEFAULT 0,
  productos_contados int DEFAULT 0,
  productos_con_diferencia int DEFAULT 0,
  shrinkage_rate numeric(8,4),
  valor_diferencia numeric(12,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conteos_ciegos_estado ON conteos_ciegos(estado);
CREATE INDEX IF NOT EXISTS idx_conteos_ciegos_asignado ON conteos_ciegos(asignado_a);

-- Folio atómico CC-YYYYMM-NNNN
CREATE OR REPLACE FUNCTION generate_conteo_ciego_folio()
RETURNS TRIGGER AS $$
DECLARE
  next_num int;
  yyyymm text;
BEGIN
  IF NEW.folio IS NULL OR NEW.folio = '' THEN
    yyyymm := to_char(now(), 'YYYYMM');
    PERFORM pg_advisory_xact_lock(hashtext('conteo_ciego_folio'));
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(folio FROM 'CC-' || yyyymm || '-(\d+)') AS int)
    ), 0) + 1
    INTO next_num
    FROM conteos_ciegos
    WHERE folio LIKE 'CC-' || yyyymm || '-%';
    NEW.folio := 'CC-' || yyyymm || '-' || LPAD(next_num::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_conteo_ciego_folio ON conteos_ciegos;
CREATE TRIGGER trg_conteo_ciego_folio
BEFORE INSERT ON conteos_ciegos
FOR EACH ROW EXECUTE FUNCTION generate_conteo_ciego_folio();

-- 2. Detalle conteo (cantidad_teorica OCULTA al empleado vía RLS)
CREATE TABLE IF NOT EXISTS conteos_ciegos_detalles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conteo_id uuid REFERENCES conteos_ciegos(id) ON DELETE CASCADE,
  producto_id uuid REFERENCES productos(id),
  codigo_producto text,
  nombre_producto text,
  cantidad_teorica numeric(15,4),
  cantidad_contada numeric(15,4),
  diferencia numeric(15,4),
  precio_unitario numeric(12,2),
  valor_diferencia numeric(12,2),
  contado_at timestamptz,
  notas text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conteo_detalles_conteo ON conteos_ciegos_detalles(conteo_id);

-- 3. Métricas empleado diarias
CREATE TABLE IF NOT EXISTS metricas_empleado_diarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id uuid REFERENCES empleados(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  entregas_exitosas int DEFAULT 0,
  entregas_con_problema int DEFAULT 0,
  hojas_sin_firma int DEFAULT 0,
  hojas_sin_sello int DEFAULT 0,
  conteos_exactos int DEFAULT 0,
  conteos_con_diferencia int DEFAULT 0,
  km_recorridos numeric(10,2),
  tiempo_ruta_minutos int,
  created_at timestamptz DEFAULT now(),
  UNIQUE(empleado_id, fecha)
);

CREATE INDEX IF NOT EXISTS idx_metricas_emp_fecha ON metricas_empleado_diarias(empleado_id, fecha);

-- 4. Score historial (auditoría cambios)
CREATE TABLE IF NOT EXISTS score_confianza_historial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id uuid REFERENCES empleados(id) ON DELETE CASCADE,
  score_anterior numeric(5,2),
  score_nuevo numeric(5,2),
  cambio numeric(5,2),
  factores_aplicados jsonb,
  calculado_por text DEFAULT 'sistema',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_score_hist_empleado ON score_confianza_historial(empleado_id);
CREATE INDEX IF NOT EXISTS idx_score_hist_fecha ON score_confianza_historial(created_at DESC);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE conteos_ciegos ENABLE ROW LEVEL SECURITY;
ALTER TABLE conteos_ciegos_detalles ENABLE ROW LEVEL SECURITY;
ALTER TABLE metricas_empleado_diarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_confianza_historial ENABLE ROW LEVEL SECURITY;

-- Conteos: admin full, empleado asignado solo sus conteos
CREATE POLICY "conteos_admin" ON conteos_ciegos FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "conteos_asignado" ON conteos_ciegos FOR SELECT
  USING (asignado_a IN (SELECT id FROM empleados WHERE user_id = auth.uid()));
CREATE POLICY "conteos_asignado_upd" ON conteos_ciegos FOR UPDATE
  USING (asignado_a IN (SELECT id FROM empleados WHERE user_id = auth.uid()));

-- CRÍTICO: empleado NUNCA ve cantidad_teorica
-- Admin ve todo, empleado solo ve lo que debe contar (sin teorica)
CREATE POLICY "conteo_det_admin" ON conteos_ciegos_detalles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "conteo_det_empleado_read" ON conteos_ciegos_detalles FOR SELECT
  USING (
    conteo_id IN (
      SELECT id FROM conteos_ciegos
      WHERE asignado_a IN (SELECT id FROM empleados WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "conteo_det_empleado_upd" ON conteos_ciegos_detalles FOR UPDATE
  USING (
    conteo_id IN (
      SELECT id FROM conteos_ciegos
      WHERE asignado_a IN (SELECT id FROM empleados WHERE user_id = auth.uid())
    )
  );

-- Métricas y historial: solo admin
CREATE POLICY "metricas_admin" ON metricas_empleado_diarias FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "score_hist_admin" ON score_confianza_historial FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "score_hist_insert" ON score_confianza_historial FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
