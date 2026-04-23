-- ══════════════════════════════════════════════════════════════
-- M04.6b BLINDAJE REDUCIDO
-- Complementa M04.6 cerrando solo los agujeros restantes
-- TIER 1 restante (4 tablas) + TIER 2 (4 tablas) + 8 RPCs
-- ══════════════════════════════════════════════════════════════


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  BLOQUE 1: Cerrar agujeros TIER 1 restantes              ║
-- ╚═══════════════════════════════════════════════════════════╝

-- ── asistencia ──
-- Eliminar policies abiertas de service_role (service_role bypassa RLS, no necesita policy)
DROP POLICY IF EXISTS "Service role puede actualizar asistencia" ON public.asistencia;
DROP POLICY IF EXISTS "Service role puede insertar asistencia" ON public.asistencia;
-- "Admin y secretaria pueden ver asistencia" ya existe y es correcta

-- ── empleados_actas ──
DROP POLICY IF EXISTS "Authenticated users can read actas" ON public.empleados_actas;
DROP POLICY IF EXISTS "Authenticated users can insert actas" ON public.empleados_actas;
CREATE POLICY "Admin secretaria can manage actas"
  ON public.empleados_actas FOR ALL
  USING (has_any_role(ARRAY['admin','secretaria']::app_role[]));

-- ── empleados_vacaciones ──
DROP POLICY IF EXISTS "Authenticated users can view vacaciones" ON public.empleados_vacaciones;
DROP POLICY IF EXISTS "Authenticated users can insert vacaciones" ON public.empleados_vacaciones;
DROP POLICY IF EXISTS "Authenticated users can update vacaciones" ON public.empleados_vacaciones;
DROP POLICY IF EXISTS "Authenticated users can delete vacaciones" ON public.empleados_vacaciones;
CREATE POLICY "Admin secretaria contadora can manage vacaciones"
  ON public.empleados_vacaciones FOR ALL
  USING (has_any_role(ARRAY['admin','secretaria','contadora']::app_role[]));

-- ── zk_mapeo ──
DROP POLICY IF EXISTS "Authenticated users can read zk_mapeo" ON public.zk_mapeo;
DROP POLICY IF EXISTS "Admin can insert zk_mapeo" ON public.zk_mapeo;
CREATE POLICY "Admin gerente can read zk_mapeo"
  ON public.zk_mapeo FOR SELECT
  USING (has_any_role(ARRAY['admin','gerente_almacen']::app_role[]));
CREATE POLICY "Admin gerente can insert zk_mapeo"
  ON public.zk_mapeo FOR INSERT
  WITH CHECK (has_any_role(ARRAY['admin','gerente_almacen']::app_role[]));


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  BLOQUE 2: TIER 2                                        ║
-- ╚═══════════════════════════════════════════════════════════╝

-- ── empleados_historial_sueldo ──
DROP POLICY IF EXISTS "Authenticated users can read salary history" ON public.empleados_historial_sueldo;
DROP POLICY IF EXISTS "Authenticated users can insert salary history" ON public.empleados_historial_sueldo;
DROP POLICY IF EXISTS "Authenticated users can manage salary history" ON public.empleados_historial_sueldo;
CREATE POLICY "Admin contadora secretaria can read salary history"
  ON public.empleados_historial_sueldo FOR SELECT
  USING (has_any_role(ARRAY['admin','contadora','secretaria']::app_role[]));
CREATE POLICY "Admin secretaria can insert salary history"
  ON public.empleados_historial_sueldo FOR INSERT
  WITH CHECK (has_any_role(ARRAY['admin','secretaria']::app_role[]));

-- ── pedidos_historial_cambios ──
DROP POLICY IF EXISTS "Authenticated users can insert historial" ON public.pedidos_historial_cambios;
DROP POLICY IF EXISTS "Authenticated users can read historial" ON public.pedidos_historial_cambios;
CREATE POLICY "Authenticated can read pedidos_historial"
  ON public.pedidos_historial_cambios FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff can insert pedidos_historial"
  ON public.pedidos_historial_cambios FOR INSERT
  WITH CHECK (has_any_role(ARRAY['admin','secretaria','vendedor','almacen','gerente_almacen']::app_role[]));

-- ── productos_historial_precios ──
DROP POLICY IF EXISTS "Sistema puede insertar historial precios" ON public.productos_historial_precios;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver historial precios" ON public.productos_historial_precios;
CREATE POLICY "Staff can read precio historial"
  ON public.productos_historial_precios FOR SELECT
  USING (has_any_role(ARRAY['admin','secretaria','contadora']::app_role[]));
CREATE POLICY "Staff can insert precio historial"
  ON public.productos_historial_precios FOR INSERT
  WITH CHECK (has_any_role(ARRAY['admin','secretaria']::app_role[]));

-- ── cliente_programacion_pedidos ──
DROP POLICY IF EXISTS "Authenticated users can view scheduling" ON public.cliente_programacion_pedidos;
DROP POLICY IF EXISTS "Authenticated users can insert scheduling" ON public.cliente_programacion_pedidos;
DROP POLICY IF EXISTS "Authenticated users can update scheduling" ON public.cliente_programacion_pedidos;
DROP POLICY IF EXISTS "Authenticated users can delete scheduling" ON public.cliente_programacion_pedidos;
CREATE POLICY "Staff can manage programacion pedidos"
  ON public.cliente_programacion_pedidos FOR ALL
  USING (has_any_role(ARRAY['admin','secretaria','vendedor']::app_role[]));


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  BLOQUE 3: Guards en RPCs críticas                       ║
-- ╚═══════════════════════════════════════════════════════════╝

-- ── decrementar_lote ──
CREATE OR REPLACE FUNCTION decrementar_lote(p_lote_id uuid, p_cantidad numeric)
RETURNS void AS $$
BEGIN
  IF NOT has_any_role(ARRAY['admin','almacen','gerente_almacen']::app_role[]) THEN
    RAISE EXCEPTION 'Acceso denegado: rol insuficiente';
  END IF;

  UPDATE inventario_lotes
  SET cantidad_disponible = cantidad_disponible - p_cantidad,
      updated_at = now()
  WHERE id = p_lote_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lote no encontrado: %', p_lote_id;
  END IF;

  IF (SELECT cantidad_disponible FROM inventario_lotes WHERE id = p_lote_id) < 0 THEN
    RAISE EXCEPTION 'Stock insuficiente en lote %', p_lote_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── incrementar_lote ──
CREATE OR REPLACE FUNCTION incrementar_lote(p_lote_id uuid, p_cantidad numeric)
RETURNS void AS $$
BEGIN
  IF NOT has_any_role(ARRAY['admin','almacen','gerente_almacen']::app_role[]) THEN
    RAISE EXCEPTION 'Acceso denegado: rol insuficiente';
  END IF;

  UPDATE inventario_lotes
  SET cantidad_disponible = cantidad_disponible + p_cantidad,
      updated_at = now()
  WHERE id = p_lote_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── update_empleado_completo ──
CREATE OR REPLACE FUNCTION update_empleado_completo(
  p_id uuid, p_nombre_completo text,
  p_nombre text DEFAULT NULL, p_primer_apellido text DEFAULT NULL,
  p_segundo_apellido text DEFAULT NULL, p_rfc text DEFAULT NULL,
  p_curp text DEFAULT NULL, p_fecha_nacimiento date DEFAULT NULL,
  p_telefono text DEFAULT NULL, p_email text DEFAULT NULL,
  p_fecha_ingreso date DEFAULT NULL, p_puesto text DEFAULT NULL,
  p_activo boolean DEFAULT true, p_notas text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL, p_sueldo_bruto numeric DEFAULT NULL,
  p_periodo_pago text DEFAULT NULL, p_fecha_baja date DEFAULT NULL,
  p_motivo_baja text DEFAULT NULL, p_beneficiario text DEFAULT NULL,
  p_premio_asistencia_semanal numeric DEFAULT NULL,
  p_numero_seguro_social text DEFAULT NULL,
  p_contacto_emergencia_nombre text DEFAULT NULL,
  p_contacto_emergencia_telefono text DEFAULT NULL,
  p_tipo_sangre text DEFAULT NULL, p_estado_civil text DEFAULT NULL,
  p_numero_dependientes integer DEFAULT NULL,
  p_nivel_estudios text DEFAULT NULL,
  p_cuenta_bancaria text DEFAULT NULL,
  p_clabe_interbancaria text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  IF NOT has_any_role(ARRAY['admin','secretaria']::app_role[]) THEN
    RAISE EXCEPTION 'Acceso denegado: rol insuficiente';
  END IF;

  UPDATE empleados SET
    nombre_completo = p_nombre_completo, nombre = p_nombre,
    primer_apellido = p_primer_apellido, segundo_apellido = p_segundo_apellido,
    rfc = p_rfc, curp = p_curp, fecha_nacimiento = p_fecha_nacimiento,
    telefono = p_telefono, email = p_email, fecha_ingreso = p_fecha_ingreso,
    puesto = p_puesto, activo = p_activo, notas = p_notas, user_id = p_user_id,
    sueldo_bruto = p_sueldo_bruto, periodo_pago = p_periodo_pago,
    fecha_baja = p_fecha_baja, motivo_baja = p_motivo_baja,
    beneficiario = p_beneficiario, premio_asistencia_semanal = p_premio_asistencia_semanal,
    numero_seguro_social = p_numero_seguro_social,
    contacto_emergencia_nombre = p_contacto_emergencia_nombre,
    contacto_emergencia_telefono = p_contacto_emergencia_telefono,
    tipo_sangre = p_tipo_sangre, estado_civil = p_estado_civil,
    numero_dependientes = p_numero_dependientes, nivel_estudios = p_nivel_estudios,
    cuenta_bancaria = p_cuenta_bancaria, clabe_interbancaria = p_clabe_interbancaria
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── update_empleado_json ──
CREATE OR REPLACE FUNCTION update_empleado_json(p_id uuid, p_data json)
RETURNS void AS $$
BEGIN
  IF NOT has_any_role(ARRAY['admin','secretaria']::app_role[]) THEN
    RAISE EXCEPTION 'Acceso denegado: rol insuficiente';
  END IF;

  UPDATE empleados SET
    nombre_completo = COALESCE((p_data->>'nombre_completo'), nombre_completo),
    nombre = (p_data->>'nombre'), primer_apellido = (p_data->>'primer_apellido'),
    segundo_apellido = (p_data->>'segundo_apellido'), rfc = (p_data->>'rfc'),
    curp = (p_data->>'curp'), fecha_nacimiento = (p_data->>'fecha_nacimiento')::date,
    telefono = (p_data->>'telefono'), email = (p_data->>'email'),
    fecha_ingreso = (p_data->>'fecha_ingreso')::date, puesto = (p_data->>'puesto'),
    activo = COALESCE((p_data->>'activo')::boolean, activo), notas = (p_data->>'notas'),
    sueldo_bruto = (p_data->>'sueldo_bruto')::numeric,
    periodo_pago = (p_data->>'periodo_pago'),
    fecha_baja = (p_data->>'fecha_baja')::date, motivo_baja = (p_data->>'motivo_baja'),
    beneficiario = (p_data->>'beneficiario'),
    premio_asistencia_semanal = (p_data->>'premio_asistencia_semanal')::numeric,
    numero_seguro_social = (p_data->>'numero_seguro_social'),
    contacto_emergencia_nombre = (p_data->>'contacto_emergencia_nombre'),
    contacto_emergencia_telefono = (p_data->>'contacto_emergencia_telefono'),
    tipo_sangre = (p_data->>'tipo_sangre'), estado_civil = (p_data->>'estado_civil'),
    numero_dependientes = (p_data->>'numero_dependientes')::integer,
    nivel_estudios = (p_data->>'nivel_estudios'),
    cuenta_bancaria = (p_data->>'cuenta_bancaria'),
    clabe_interbancaria = (p_data->>'clabe_interbancaria')
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── update_empleado_extras ──
CREATE OR REPLACE FUNCTION update_empleado_extras(
  p_empleado_id uuid,
  p_beneficiario text DEFAULT NULL,
  p_premio_asistencia_semanal numeric DEFAULT NULL
) RETURNS void AS $$
BEGIN
  IF NOT has_any_role(ARRAY['admin','secretaria']::app_role[]) THEN
    RAISE EXCEPTION 'Acceso denegado: rol insuficiente';
  END IF;

  UPDATE empleados
  SET beneficiario = COALESCE(p_beneficiario, beneficiario),
      premio_asistencia_semanal = COALESCE(p_premio_asistencia_semanal, premio_asistencia_semanal)
  WHERE id = p_empleado_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── registrar_cobro_pedido ──
CREATE OR REPLACE FUNCTION public.registrar_cobro_pedido(
  p_pedido_id uuid, p_cliente_id uuid, p_monto numeric, p_forma_pago text,
  p_referencia text DEFAULT NULL, p_fecha_cheque date DEFAULT NULL,
  p_notas text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cobro_id uuid;
  v_saldo_actual numeric;
  v_nuevo_saldo numeric;
BEGIN
  IF NOT has_any_role(ARRAY['admin','secretaria','contadora','chofer']::app_role[]) THEN
    RAISE EXCEPTION 'Acceso denegado: rol insuficiente';
  END IF;

  SELECT COALESCE(saldo_pendiente, total) INTO v_saldo_actual
  FROM pedidos WHERE id = p_pedido_id;

  IF v_saldo_actual IS NULL THEN RAISE EXCEPTION 'Pedido no encontrado'; END IF;
  IF p_monto > v_saldo_actual + 0.01 THEN RAISE EXCEPTION 'El monto del cobro supera el saldo pendiente'; END IF;

  INSERT INTO cobros_pedido (pedido_id, cliente_id, monto, forma_pago, referencia, fecha_cheque, notas, registrado_por)
  VALUES (p_pedido_id, p_cliente_id, p_monto, p_forma_pago, p_referencia, p_fecha_cheque, p_notas, auth.uid())
  RETURNING id INTO v_cobro_id;

  v_nuevo_saldo := GREATEST(v_saldo_actual - p_monto, 0);

  UPDATE pedidos SET saldo_pendiente = v_nuevo_saldo, pagado = (v_nuevo_saldo <= 0), updated_at = now()
  WHERE id = p_pedido_id;

  UPDATE clientes SET saldo_pendiente = (
    SELECT COALESCE(SUM(COALESCE(saldo_pendiente, 0)), 0) FROM pedidos
    WHERE cliente_id = p_cliente_id AND status != 'cancelado' AND pagado = false
  ) WHERE id = p_cliente_id;

  RETURN v_cobro_id;
END;
$$;

-- ── conciliar_factura_proveedor ──
CREATE OR REPLACE FUNCTION public.conciliar_factura_proveedor(p_factura_id uuid, p_productos jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_producto RECORD;
  v_oc_id UUID;
BEGIN
  IF NOT has_any_role(ARRAY['admin','contadora']::app_role[]) THEN
    RAISE EXCEPTION 'Acceso denegado: rol insuficiente';
  END IF;

  SELECT orden_compra_id INTO v_oc_id FROM proveedor_facturas WHERE id = p_factura_id;
  IF v_oc_id IS NULL THEN RAISE EXCEPTION 'Factura no encontrada o sin OC asociada'; END IF;

  FOR v_producto IN SELECT * FROM jsonb_to_recordset(p_productos)
    AS x(producto_id UUID, precio_facturado NUMERIC, cantidad INTEGER)
  LOOP
    UPDATE inventario_lotes SET precio_compra = v_producto.precio_facturado, updated_at = now()
    WHERE orden_compra_id = v_oc_id AND producto_id = v_producto.producto_id;

    UPDATE ordenes_compra_detalles
    SET precio_unitario_compra = v_producto.precio_facturado,
        subtotal = COALESCE(cantidad_recibida, cantidad_ordenada) * v_producto.precio_facturado
    WHERE orden_compra_id = v_oc_id AND producto_id = v_producto.producto_id;

    UPDATE productos SET costo_promedio_ponderado = calcular_costo_promedio_ponderado(v_producto.producto_id),
        ultimo_costo_compra = v_producto.precio_facturado, updated_at = now()
    WHERE id = v_producto.producto_id;
  END LOOP;

  UPDATE ordenes_compra SET total = (SELECT COALESCE(SUM(subtotal), 0) FROM ordenes_compra_detalles WHERE orden_compra_id = v_oc_id),
    total_ajustado = (SELECT COALESCE(SUM(subtotal), 0) FROM ordenes_compra_detalles WHERE orden_compra_id = v_oc_id) - COALESCE(monto_devoluciones, 0),
    updated_at = now() WHERE id = v_oc_id;

  UPDATE proveedor_facturas SET conciliacion_completada = true, updated_at = now() WHERE id = p_factura_id;
END;
$$;

-- ── ajustar_costos_oc ──
CREATE OR REPLACE FUNCTION public.ajustar_costos_oc(p_oc_id UUID, p_productos JSONB)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_producto RECORD;
BEGIN
  IF NOT has_any_role(ARRAY['admin','contadora']::app_role[]) THEN
    RAISE EXCEPTION 'Acceso denegado: rol insuficiente';
  END IF;

  FOR v_producto IN SELECT * FROM jsonb_to_recordset(p_productos)
    AS x(producto_id UUID, precio_facturado NUMERIC, cantidad NUMERIC)
  LOOP
    UPDATE inventario_lotes SET precio_compra = v_producto.precio_facturado, updated_at = now()
    WHERE orden_compra_id = p_oc_id AND producto_id = v_producto.producto_id;

    UPDATE ordenes_compra_detalles
    SET precio_unitario_compra = v_producto.precio_facturado,
        subtotal = COALESCE(cantidad_recibida, cantidad_ordenada) * v_producto.precio_facturado
    WHERE orden_compra_id = p_oc_id AND producto_id = v_producto.producto_id;

    UPDATE productos SET costo_promedio_ponderado = calcular_costo_promedio_ponderado(v_producto.producto_id),
        ultimo_costo_compra = v_producto.precio_facturado, updated_at = now()
    WHERE id = v_producto.producto_id;
  END LOOP;

  UPDATE ordenes_compra SET total = (SELECT COALESCE(SUM(subtotal), 0) FROM ordenes_compra_detalles WHERE orden_compra_id = p_oc_id),
    total_ajustado = (SELECT COALESCE(SUM(subtotal), 0) FROM ordenes_compra_detalles WHERE orden_compra_id = p_oc_id) - COALESCE(monto_devoluciones, 0),
    updated_at = now() WHERE id = p_oc_id;
END;
$$;
