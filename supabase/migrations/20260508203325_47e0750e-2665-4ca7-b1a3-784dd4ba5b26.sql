CREATE OR REPLACE FUNCTION registrar_devolucion_proveedor(
  p_orden_compra_id UUID,
  p_orden_compra_entrega_id UUID,
  p_producto_id UUID,
  p_lote_id UUID,
  p_cantidad NUMERIC,
  p_motivo TEXT,
  p_notas TEXT DEFAULT NULL,
  p_firma_chofer TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_devolucion_id UUID;
  v_stock_post NUMERIC;
  v_producto_nombre TEXT;
  v_cantidad_actual NUMERIC;
  v_producto_id_lote UUID;
BEGIN
  IF NOT has_any_role(ARRAY['admin','almacen','gerente_almacen']::app_role[]) THEN
    RAISE EXCEPTION 'Acceso denegado: se requiere rol admin, almacen o gerente_almacen';
  END IF;

  IF p_cantidad <= 0 THEN
    RAISE EXCEPTION 'Cantidad debe ser mayor a 0';
  END IF;

  SELECT cantidad_disponible, producto_id
    INTO v_cantidad_actual, v_producto_id_lote
  FROM inventario_lotes
  WHERE id = p_lote_id
  FOR UPDATE;

  IF v_producto_id_lote IS NULL THEN
    RAISE EXCEPTION 'Lote no encontrado: %', p_lote_id;
  END IF;

  IF v_producto_id_lote != p_producto_id THEN
    RAISE EXCEPTION 'Inconsistencia: producto % no coincide con lote % (producto real del lote: %)',
      p_producto_id, p_lote_id, v_producto_id_lote;
  END IF;

  SELECT nombre INTO v_producto_nombre FROM productos WHERE id = p_producto_id;

  INSERT INTO devoluciones_proveedor (
    orden_compra_id, orden_compra_entrega_id, producto_id,
    lote_id, cantidad_devuelta, motivo, notas,
    firma_chofer, registrado_por, status
  ) VALUES (
    p_orden_compra_id, p_orden_compra_entrega_id, p_producto_id,
    p_lote_id, p_cantidad, p_motivo, p_notas,
    p_firma_chofer, auth.uid(), 'pendiente'
  ) RETURNING id INTO v_devolucion_id;

  UPDATE inventario_lotes
  SET cantidad_disponible = cantidad_disponible - p_cantidad,
      updated_at = now()
  WHERE id = p_lote_id;

  SELECT cantidad_disponible INTO v_stock_post
  FROM inventario_lotes WHERE id = p_lote_id;

  INSERT INTO inventario_movimientos (
    producto_id, cantidad, tipo_movimiento,
    referencia, notas, usuario_id
  ) VALUES (
    p_producto_id, p_cantidad, 'devolucion_proveedor',
    v_devolucion_id::TEXT,
    COALESCE(p_motivo, 'Devolución a proveedor'),
    auth.uid()
  );

  IF v_stock_post < 0 THEN
    INSERT INTO notificaciones (
      tipo, titulo, descripcion, leida
    ) VALUES (
      'stock_bajo',
      'Stock negativo: ' || COALESCE(v_producto_nombre, 'Producto'),
      'Lote quedó con ' || v_stock_post || ' unidades después de devolución a proveedor (OC ' || p_orden_compra_id || ')',
      false
    );
  END IF;

  RETURN v_devolucion_id;
END;
$$;

REVOKE ALL ON FUNCTION registrar_devolucion_proveedor(UUID,UUID,UUID,UUID,NUMERIC,TEXT,TEXT,TEXT) FROM public;
GRANT EXECUTE ON FUNCTION registrar_devolucion_proveedor(UUID,UUID,UUID,UUID,NUMERIC,TEXT,TEXT,TEXT) TO authenticated;

COMMENT ON FUNCTION registrar_devolucion_proveedor IS
'RPC atómica para devoluciones a proveedor. INSERT devolución + decremento lote + movimiento auditoría + notificación si stock negativo. Fix Bug #1A.';