-- ============================================
-- TIGHTENING RLS — Cerrar INSERT WITH CHECK true
-- Cabos sueltos auditoría 11 Mayo 2026
-- APLICAR MANUALMENTE en Lovable SQL Editor
-- ============================================

-- asistencia INSERT
DROP POLICY IF EXISTS "Service role puede insertar asistencia" ON asistencia;

CREATE POLICY "asistencia_admin_sec_insert" ON asistencia FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'secretaria'::public.app_role)
  );

CREATE POLICY "asistencia_propia_insert" ON asistencia FOR INSERT
  WITH CHECK (
    empleado_id IN (SELECT id FROM empleados WHERE user_id = auth.uid())
  );

-- cliente_programacion_pedidos INSERT
DROP POLICY IF EXISTS "Authenticated users can insert scheduling" ON cliente_programacion_pedidos;

CREATE POLICY "prog_admin_sec_vend_insert" ON cliente_programacion_pedidos FOR INSERT
  WITH CHECK (
    public.has_any_role(ARRAY['admin'::public.app_role, 'secretaria'::public.app_role, 'vendedor'::public.app_role])
  );

-- empleados_actas INSERT
DROP POLICY IF EXISTS "Authenticated users can insert actas" ON empleados_actas;

CREATE POLICY "actas_admin_sec_insert" ON empleados_actas FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'secretaria'::public.app_role)
  );

-- empleados_vacaciones INSERT
DROP POLICY IF EXISTS "Authenticated users can insert vacaciones" ON empleados_vacaciones;

CREATE POLICY "vacaciones_admin_sec_insert" ON empleados_vacaciones FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'secretaria'::public.app_role)
  );

-- proveedor_factura_detalles INSERT
DROP POLICY IF EXISTS "Authenticated users can insert proveedor_factura_detalles" ON proveedor_factura_detalles;

CREATE POLICY "prov_fact_admin_sec_cont_insert" ON proveedor_factura_detalles FOR INSERT
  WITH CHECK (
    public.has_any_role(ARRAY['admin'::public.app_role, 'secretaria'::public.app_role, 'contadora'::public.app_role])
  );

-- Limpieza duplicada pac_providers
DROP POLICY IF EXISTS "pac_providers_admin" ON pac_providers;
