-- ============================================
-- M14 DASHBOARD + REPORTES DIARIOS
-- APLICAR MANUALMENTE en Lovable SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS reportes_diarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL UNIQUE,
  generado_at timestamptz DEFAULT now(),
  ventas_dia numeric(15,2) DEFAULT 0,
  ventas_mes numeric(15,2) DEFAULT 0,
  ventas_ytd numeric(15,2) DEFAULT 0,
  pedidos_dia int DEFAULT 0,
  pedidos_pendientes int DEFAULT 0,
  pedidos_completados int DEFAULT 0,
  ticket_promedio numeric(15,2) DEFAULT 0,
  entregas_dia int DEFAULT 0,
  entregas_exitosas int DEFAULT 0,
  hojas_salida_generadas int DEFAULT 0,
  hojas_procesadas_ia int DEFAULT 0,
  porcentaje_on_time numeric(5,2),
  facturas_timbradas int DEFAULT 0,
  monto_facturado_dia numeric(15,2) DEFAULT 0,
  notas_credito_dia int DEFAULT 0,
  reps_generados int DEFAULT 0,
  cobros_dia int DEFAULT 0,
  monto_cobrado_dia numeric(15,2) DEFAULT 0,
  cartera_total numeric(15,2) DEFAULT 0,
  cartera_vencida numeric(15,2) DEFAULT 0,
  porcentaje_vencido numeric(5,2),
  alertas_dia int DEFAULT 0,
  alertas_criticas int DEFAULT 0,
  discrepancias_nuevas int DEFAULT 0,
  desviaciones_gps int DEFAULT 0,
  score_promedio_empleados numeric(5,2),
  empleados_bandera_roja int DEFAULT 0,
  insights_texto text,
  enviado_email boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reportes_fecha ON reportes_diarios(fecha DESC);

CREATE TABLE IF NOT EXISTS user_dashboard_prefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  recibir_reporte_diario boolean DEFAULT false,
  hora_reporte_diario time DEFAULT '21:00',
  canal_reporte text DEFAULT 'email',
  email_notificaciones text,
  whatsapp_numero text,
  recibir_alertas_criticas_whatsapp boolean DEFAULT false,
  widgets_visibles jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE reportes_diarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_dashboard_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reportes_read" ON reportes_diarios FOR SELECT
  USING (public.has_any_role(ARRAY['admin'::public.app_role, 'secretaria'::public.app_role, 'contadora'::public.app_role]));
CREATE POLICY "reportes_write" ON reportes_diarios FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "reportes_update" ON reportes_diarios FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "prefs_own" ON user_dashboard_prefs FOR ALL USING (user_id = auth.uid());
CREATE POLICY "prefs_insert" ON user_dashboard_prefs FOR INSERT WITH CHECK (user_id = auth.uid());
