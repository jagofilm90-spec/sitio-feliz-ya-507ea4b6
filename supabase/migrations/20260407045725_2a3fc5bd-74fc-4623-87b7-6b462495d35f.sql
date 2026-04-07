
ALTER TABLE cotizaciones_lecaroz ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizacion_lecaroz_lineas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tandas_lecaroz ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_log_lecaroz ENABLE ROW LEVEL SECURITY;

-- Cotizaciones Lecaroz: admin, secretaria, vendedor, contadora can CRUD
CREATE POLICY "lecaroz_cot_select" ON cotizaciones_lecaroz FOR SELECT TO authenticated
  USING (has_any_role(ARRAY['admin','secretaria','vendedor','contadora']::app_role[]));
CREATE POLICY "lecaroz_cot_insert" ON cotizaciones_lecaroz FOR INSERT TO authenticated
  WITH CHECK (has_any_role(ARRAY['admin','secretaria','vendedor','contadora']::app_role[]));
CREATE POLICY "lecaroz_cot_update" ON cotizaciones_lecaroz FOR UPDATE TO authenticated
  USING (has_any_role(ARRAY['admin','secretaria','vendedor','contadora']::app_role[]));
CREATE POLICY "lecaroz_cot_delete" ON cotizaciones_lecaroz FOR DELETE TO authenticated
  USING (has_any_role(ARRAY['admin','secretaria']::app_role[]));

-- Líneas: same access as parent
CREATE POLICY "lecaroz_lineas_select" ON cotizacion_lecaroz_lineas FOR SELECT TO authenticated
  USING (has_any_role(ARRAY['admin','secretaria','vendedor','contadora']::app_role[]));
CREATE POLICY "lecaroz_lineas_insert" ON cotizacion_lecaroz_lineas FOR INSERT TO authenticated
  WITH CHECK (has_any_role(ARRAY['admin','secretaria','vendedor','contadora']::app_role[]));
CREATE POLICY "lecaroz_lineas_update" ON cotizacion_lecaroz_lineas FOR UPDATE TO authenticated
  USING (has_any_role(ARRAY['admin','secretaria','vendedor','contadora']::app_role[]));
CREATE POLICY "lecaroz_lineas_delete" ON cotizacion_lecaroz_lineas FOR DELETE TO authenticated
  USING (has_any_role(ARRAY['admin','secretaria']::app_role[]));

-- Tandas
CREATE POLICY "lecaroz_tandas_select" ON tandas_lecaroz FOR SELECT TO authenticated
  USING (has_any_role(ARRAY['admin','secretaria','vendedor','contadora']::app_role[]));
CREATE POLICY "lecaroz_tandas_insert" ON tandas_lecaroz FOR INSERT TO authenticated
  WITH CHECK (has_any_role(ARRAY['admin','secretaria','vendedor']::app_role[]));
CREATE POLICY "lecaroz_tandas_update" ON tandas_lecaroz FOR UPDATE TO authenticated
  USING (has_any_role(ARRAY['admin','secretaria','vendedor']::app_role[]));

-- Email log
CREATE POLICY "lecaroz_email_select" ON email_log_lecaroz FOR SELECT TO authenticated
  USING (has_any_role(ARRAY['admin','secretaria','vendedor','contadora']::app_role[]));
CREATE POLICY "lecaroz_email_insert" ON email_log_lecaroz FOR INSERT TO authenticated
  WITH CHECK (has_any_role(ARRAY['admin','secretaria','vendedor']::app_role[]));
CREATE POLICY "lecaroz_email_update" ON email_log_lecaroz FOR UPDATE TO authenticated
  USING (has_any_role(ARRAY['admin','secretaria','vendedor']::app_role[]));
