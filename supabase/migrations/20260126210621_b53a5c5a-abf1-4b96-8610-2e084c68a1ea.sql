-- 1. Fix existing conciliar_factura_proveedor function (cantidad → cantidad_ordenada)
CREATE OR REPLACE FUNCTION public.conciliar_factura_proveedor(p_factura_id uuid, p_productos jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_producto RECORD;
  v_oc_id UUID;
BEGIN
  -- Obtener la OC de la factura
  SELECT orden_compra_id INTO v_oc_id
  FROM proveedor_facturas
  WHERE id = p_factura_id;

  IF v_oc_id IS NULL THEN
    RAISE EXCEPTION 'Factura no encontrada o sin OC asociada';
  END IF;

  -- Por cada producto, ajustar costos
  FOR v_producto IN SELECT * FROM jsonb_to_recordset(p_productos) 
    AS x(producto_id UUID, precio_facturado NUMERIC, cantidad INTEGER)
  LOOP
    -- Actualizar lotes de inventario de esta OC
    UPDATE inventario_lotes
    SET precio_compra = v_producto.precio_facturado,
        updated_at = now()
    WHERE orden_compra_id = v_oc_id
      AND producto_id = v_producto.producto_id;

    -- Actualizar detalle de la OC (FIXED: cantidad_ordenada instead of cantidad)
    UPDATE ordenes_compra_detalles
    SET precio_unitario_compra = v_producto.precio_facturado,
        subtotal = COALESCE(cantidad_recibida, cantidad_ordenada) * v_producto.precio_facturado
    WHERE orden_compra_id = v_oc_id
      AND producto_id = v_producto.producto_id;

    -- Recalcular costo promedio del producto
    UPDATE productos 
    SET costo_promedio_ponderado = calcular_costo_promedio_ponderado(v_producto.producto_id),
        ultimo_costo_compra = v_producto.precio_facturado,
        updated_at = now()
    WHERE id = v_producto.producto_id;
  END LOOP;

  -- Recalcular total de la OC
  UPDATE ordenes_compra
  SET total = (
    SELECT COALESCE(SUM(subtotal), 0)
    FROM ordenes_compra_detalles
    WHERE orden_compra_id = v_oc_id
  ),
  total_ajustado = (
    SELECT COALESCE(SUM(subtotal), 0)
    FROM ordenes_compra_detalles
    WHERE orden_compra_id = v_oc_id
  ) - COALESCE(monto_devoluciones, 0),
  updated_at = now()
  WHERE id = v_oc_id;

  -- Marcar factura como conciliada
  UPDATE proveedor_facturas
  SET conciliacion_completada = true,
      updated_at = now()
  WHERE id = p_factura_id;
END;
$function$;

-- 2. Create new function for direct cost adjustment (without invoice requirement)
CREATE OR REPLACE FUNCTION public.ajustar_costos_oc(
  p_oc_id UUID,
  p_productos JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_producto RECORD;
BEGIN
  FOR v_producto IN SELECT * FROM jsonb_to_recordset(p_productos) 
    AS x(producto_id UUID, precio_facturado NUMERIC, cantidad NUMERIC)
  LOOP
    -- Actualizar lotes de inventario de esta OC
    UPDATE inventario_lotes
    SET precio_compra = v_producto.precio_facturado,
        updated_at = now()
    WHERE orden_compra_id = p_oc_id
      AND producto_id = v_producto.producto_id;

    -- Actualizar detalle de la OC
    UPDATE ordenes_compra_detalles
    SET precio_unitario_compra = v_producto.precio_facturado,
        subtotal = COALESCE(cantidad_recibida, cantidad_ordenada) * v_producto.precio_facturado
    WHERE orden_compra_id = p_oc_id
      AND producto_id = v_producto.producto_id;

    -- Recalcular costo promedio del producto
    UPDATE productos 
    SET costo_promedio_ponderado = calcular_costo_promedio_ponderado(v_producto.producto_id),
        ultimo_costo_compra = v_producto.precio_facturado,
        updated_at = now()
    WHERE id = v_producto.producto_id;
  END LOOP;

  -- Recalcular total de la OC
  UPDATE ordenes_compra
  SET total = (
    SELECT COALESCE(SUM(subtotal), 0)
    FROM ordenes_compra_detalles
    WHERE orden_compra_id = p_oc_id
  ),
  total_ajustado = (
    SELECT COALESCE(SUM(subtotal), 0)
    FROM ordenes_compra_detalles
    WHERE orden_compra_id = p_oc_id
  ) - COALESCE(monto_devoluciones, 0),
  updated_at = now()
  WHERE id = p_oc_id;
END;
$$;