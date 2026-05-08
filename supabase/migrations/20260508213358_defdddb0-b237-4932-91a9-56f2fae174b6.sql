CREATE OR REPLACE FUNCTION sync_faltantes_proveedor()
RETURNS TRIGGER AS $$
DECLARE
  v_proveedor_id UUID;
  v_item JSONB;
  v_producto_id UUID;
  v_cantidad_faltante NUMERIC;
  v_detalle RECORD;
BEGIN
  IF NEW.origen_faltante IS NOT TRUE THEN
    RETURN NEW;
  END IF;
  IF NEW.productos_faltantes IS NULL OR jsonb_array_length(NEW.productos_faltantes) = 0 THEN
    RETURN NEW;
  END IF;

  SELECT proveedor_id INTO v_proveedor_id
  FROM ordenes_compra
  WHERE id = NEW.orden_compra_id;

  IF v_proveedor_id IS NULL THEN
    RETURN NEW;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.productos_faltantes)
  LOOP
    BEGIN
      v_producto_id := (v_item->>'producto_id')::UUID;
      v_cantidad_faltante := COALESCE((v_item->>'cantidad_faltante')::NUMERIC, 0);

      IF v_producto_id IS NULL OR v_cantidad_faltante <= 0 THEN
        CONTINUE;
      END IF;

      SELECT cantidad_ordenada, cantidad_recibida
      INTO v_detalle
      FROM ordenes_compra_detalles
      WHERE orden_compra_id = NEW.orden_compra_id
        AND producto_id = v_producto_id
      LIMIT 1;

      INSERT INTO faltantes_proveedor (
        proveedor_id, orden_compra_id, producto_id,
        tipo_faltante, cantidad_pedida, cantidad_recibida,
        cantidad_faltante, fecha_recepcion, status
      ) VALUES (
        v_proveedor_id, NEW.orden_compra_id, v_producto_id,
        'cantidad',
        COALESCE(v_detalle.cantidad_ordenada, v_cantidad_faltante),
        COALESCE(v_detalle.cantidad_recibida, 0),
        v_cantidad_faltante,
        CURRENT_DATE, 'pendiente'
      );

    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'sync_faltantes_proveedor item failed: %', SQLERRM;
    END;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_faltantes_proveedor ON ordenes_compra_entregas;
CREATE TRIGGER trg_sync_faltantes_proveedor
AFTER INSERT ON ordenes_compra_entregas
FOR EACH ROW
WHEN (NEW.origen_faltante = true)
EXECUTE FUNCTION sync_faltantes_proveedor();

COMMENT ON FUNCTION sync_faltantes_proveedor IS
'Trigger que sincroniza ordenes_compra_entregas (origen_faltante=true) con faltantes_proveedor para KPIs v3. Exception handler por item. Fix Bug #4.';