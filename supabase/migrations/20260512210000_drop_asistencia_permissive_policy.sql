-- Eliminar policy permisiva que anula las restrictivas añadidas en 20260511100000 y 20260511110000.
-- La policy auth_all_asistencia (FOR ALL TO authenticated USING (true) WITH CHECK (true))
-- fue creada en 20260330000000_asistencia.sql y nunca eliminada por las migraciones de tightening.
-- Mientras coexiste, anula asistencia_admin_sec_insert y asistencia_propia_insert.
DROP POLICY IF EXISTS "auth_all_asistencia" ON public.asistencia;
