-- ============================================
-- TIGHTENING RLS — TIER 1 + TIER 2
-- Auditoría 11 Mayo 2026
-- Cierra gaps USING (true) en datos sensibles
-- APLICAR MANUALMENTE en Lovable SQL Editor
-- ============================================

-- ╔══════════════════════════════════════════╗
-- ║ TIER 1 — CRÍTICO (RH + Fiscal)          ║
-- ╚══════════════════════════════════════════╝

-- empleados_historial_sueldo
DROP POLICY IF EXISTS "Authenticated users can manage salary history" ON empleados_historial_sueldo;
DROP POLICY IF EXISTS "Service role full access" ON empleados_historial_sueldo;

CREATE POLICY "sueldo_admin_contadora_all" ON empleados_historial_sueldo FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'contadora'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'contadora'::public.app_role));

CREATE POLICY "sueldo_propio_select" ON empleados_historial_sueldo FOR SELECT
  USING (empleado_id IN (SELECT id FROM empleados WHERE user_id = auth.uid()));

-- empleados_actas
DROP POLICY IF EXISTS "Authenticated users can read actas" ON empleados_actas;
DROP POLICY IF EXISTS "Authenticated users can create actas" ON empleados_actas;
DROP POLICY IF EXISTS "Authenticated users can manage actas" ON empleados_actas;

CREATE POLICY "actas_admin_sec_all" ON empleados_actas FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'secretaria'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'secretaria'::public.app_role));

CREATE POLICY "actas_propias_select" ON empleados_actas FOR SELECT
  USING (empleado_id IN (SELECT id FROM empleados WHERE user_id = auth.uid()));

-- empleados_vacaciones
DROP POLICY IF EXISTS "Authenticated users can view vacaciones" ON empleados_vacaciones;
DROP POLICY IF EXISTS "Authenticated users can update vacaciones" ON empleados_vacaciones;
DROP POLICY IF EXISTS "Authenticated users can delete vacaciones" ON empleados_vacaciones;
DROP POLICY IF EXISTS "Authenticated users can create vacaciones" ON empleados_vacaciones;

CREATE POLICY "vacaciones_admin_sec_all" ON empleados_vacaciones FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'secretaria'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'secretaria'::public.app_role));

CREATE POLICY "vacaciones_propias_select" ON empleados_vacaciones FOR SELECT
  USING (empleado_id IN (SELECT id FROM empleados WHERE user_id = auth.uid()));

CREATE POLICY "vacaciones_propias_insert" ON empleados_vacaciones FOR INSERT
  WITH CHECK (empleado_id IN (SELECT id FROM empleados WHERE user_id = auth.uid()));

-- pac_providers (credenciales fiscales)
DROP POLICY IF EXISTS "pac_providers_select" ON pac_providers;
DROP POLICY IF EXISTS "Authenticated users can view pac" ON pac_providers;

CREATE POLICY "pac_admin_only" ON pac_providers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ╔══════════════════════════════════════════╗
-- ║ TIER 2 — ALTO (Modificación sin control) ║
-- ╚══════════════════════════════════════════╝

-- asistencia
DROP POLICY IF EXISTS "Service role puede actualizar asistencia" ON asistencia;

CREATE POLICY "asistencia_admin_sec_update" ON asistencia FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'secretaria'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'secretaria'::public.app_role));

-- resumenes_diarios
DROP POLICY IF EXISTS "Service role full access resumenes" ON resumenes_diarios;

CREATE POLICY "resumenes_admin_sec_cont_all" ON resumenes_diarios FOR ALL
  USING (public.has_any_role(ARRAY['admin'::public.app_role, 'secretaria'::public.app_role, 'contadora'::public.app_role]))
  WITH CHECK (public.has_any_role(ARRAY['admin'::public.app_role, 'secretaria'::public.app_role, 'contadora'::public.app_role]));

-- cliente_programacion_pedidos
DROP POLICY IF EXISTS "Authenticated users can delete scheduling" ON cliente_programacion_pedidos;
DROP POLICY IF EXISTS "Authenticated users can update scheduling" ON cliente_programacion_pedidos;
DROP POLICY IF EXISTS "Authenticated users can view scheduling" ON cliente_programacion_pedidos;
DROP POLICY IF EXISTS "Authenticated users can create scheduling" ON cliente_programacion_pedidos;

CREATE POLICY "prog_admin_sec_vend_all" ON cliente_programacion_pedidos FOR ALL
  USING (public.has_any_role(ARRAY['admin'::public.app_role, 'secretaria'::public.app_role, 'vendedor'::public.app_role]))
  WITH CHECK (public.has_any_role(ARRAY['admin'::public.app_role, 'secretaria'::public.app_role, 'vendedor'::public.app_role]));

CREATE POLICY "prog_cliente_propias_select" ON cliente_programacion_pedidos FOR SELECT
  USING (cliente_id IN (SELECT id FROM clientes WHERE user_id = auth.uid()));

-- proveedor_factura_detalles
DROP POLICY IF EXISTS "Authenticated users can view proveedor_factura_detalles" ON proveedor_factura_detalles;
DROP POLICY IF EXISTS "Authenticated users can update proveedor_factura_detalles" ON proveedor_factura_detalles;
DROP POLICY IF EXISTS "Authenticated users can create proveedor_factura_detalles" ON proveedor_factura_detalles;
DROP POLICY IF EXISTS "Authenticated users can delete proveedor_factura_detalles" ON proveedor_factura_detalles;

CREATE POLICY "prov_fact_admin_sec_cont_all" ON proveedor_factura_detalles FOR ALL
  USING (public.has_any_role(ARRAY['admin'::public.app_role, 'secretaria'::public.app_role, 'contadora'::public.app_role]))
  WITH CHECK (public.has_any_role(ARRAY['admin'::public.app_role, 'secretaria'::public.app_role, 'contadora'::public.app_role]));
