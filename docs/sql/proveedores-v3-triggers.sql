-- ═══════════════════════════════════════════════════════════
-- PROVEEDORES V3 — TRIGGERS DE EVENTOS AUTOMÁTICOS
-- ═══════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════
-- TRIGGER 1: Faltante detectado → evento auto
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION trg_evento_faltante()
RETURNS TRIGGER AS $$
DECLARE
  v_producto_nombre TEXT;
  v_oc_folio TEXT;
BEGIN
  SELECT nombre INTO v_producto_nombre
  FROM productos WHERE id = NEW.producto_id;

  SELECT folio INTO v_oc_folio
  FROM ordenes_compra WHERE id = NEW.orden_compra_id;

  INSERT INTO eventos_proveedor (
    proveedor_id, tipo_evento, titulo, descripcion, metadata, origen
  ) VALUES (
    NEW.proveedor_id,
    'auto_faltante',
    'Faltante en ' || COALESCE(v_oc_folio, 'OC'),
    CASE
      WHEN NEW.tipo_faltante = 'peso' THEN
        COALESCE(v_producto_nombre, 'Producto') || ': faltaron ' ||
        ROUND(NEW.peso_faltante, 1) || ' kg'
      WHEN NEW.tipo_faltante = 'cantidad' THEN
        COALESCE(v_producto_nombre, 'Producto') || ': faltaron ' ||
        NEW.cantidad_faltante || ' bultos'
      ELSE
        COALESCE(v_producto_nombre, 'Producto') || ': faltaron ' ||
        NEW.cantidad_faltante || ' bultos y ' ||
        ROUND(NEW.peso_faltante, 1) || ' kg'
    END,
    jsonb_build_object(
      'orden_compra_id', NEW.orden_compra_id,
      'folio', v_oc_folio,
      'producto_id', NEW.producto_id,
      'producto_nombre', v_producto_nombre,
      'tipo_faltante', NEW.tipo_faltante,
      'cantidad_faltante', NEW.cantidad_faltante,
      'peso_faltante', NEW.peso_faltante
    ),
    'auto'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS evento_faltante_auto ON faltantes_proveedor;
CREATE TRIGGER evento_faltante_auto
  AFTER INSERT ON faltantes_proveedor
  FOR EACH ROW EXECUTE FUNCTION trg_evento_faltante();


-- ═══════════════════════════════════════════════════════════
-- TRIGGER 2: Cambio significativo de precio (>15%)
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION trg_evento_precio_cambio()
RETURNS TRIGGER AS $$
DECLARE
  v_proveedor_id UUID;
  v_ultimo_precio NUMERIC;
  v_diferencia_pct NUMERIC;
  v_producto_nombre TEXT;
  v_oc_folio TEXT;
BEGIN
  SELECT proveedor_id, folio INTO v_proveedor_id, v_oc_folio
  FROM ordenes_compra WHERE id = NEW.orden_compra_id;

  IF v_proveedor_id IS NULL THEN RETURN NEW; END IF;

  -- FIX Issue #6: Comparar solo con OCs DISTINTAS (no la actual)
  SELECT ocd.precio_unitario_compra INTO v_ultimo_precio
  FROM ordenes_compra_detalles ocd
  JOIN ordenes_compra oc ON oc.id = ocd.orden_compra_id
  WHERE oc.proveedor_id = v_proveedor_id
    AND ocd.producto_id = NEW.producto_id
    AND oc.id != NEW.orden_compra_id
  ORDER BY ocd.created_at DESC
  LIMIT 1;

  IF v_ultimo_precio IS NULL OR v_ultimo_precio = 0 THEN RETURN NEW; END IF;

  v_diferencia_pct := ((NEW.precio_unitario_compra - v_ultimo_precio) / v_ultimo_precio) * 100;

  IF ABS(v_diferencia_pct) <= 15 THEN RETURN NEW; END IF;

  SELECT nombre INTO v_producto_nombre FROM productos WHERE id = NEW.producto_id;

  INSERT INTO eventos_proveedor (
    proveedor_id, tipo_evento, titulo, descripcion, metadata, origen
  ) VALUES (
    v_proveedor_id,
    CASE WHEN v_diferencia_pct > 0 THEN 'auto_precio_subio' ELSE 'auto_precio_bajo' END,
    COALESCE(v_producto_nombre, 'Producto') || ': precio ' ||
      CASE WHEN v_diferencia_pct > 0 THEN 'subió' ELSE 'bajó' END ||
      ' ' || ABS(ROUND(v_diferencia_pct, 1)) || '%',
    'De $' || ROUND(v_ultimo_precio, 2) || ' a $' || ROUND(NEW.precio_unitario_compra, 2) ||
      ' en ' || COALESCE(v_oc_folio, 'OC'),
    jsonb_build_object(
      'orden_compra_id', NEW.orden_compra_id,
      'folio', v_oc_folio,
      'producto_id', NEW.producto_id,
      'precio_anterior', v_ultimo_precio,
      'precio_nuevo', NEW.precio_unitario_compra,
      'diferencia_pct', ROUND(v_diferencia_pct, 1)
    ),
    'auto'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS evento_precio_cambio_auto ON ordenes_compra_detalles;
CREATE TRIGGER evento_precio_cambio_auto
  AFTER INSERT ON ordenes_compra_detalles
  FOR EACH ROW EXECUTE FUNCTION trg_evento_precio_cambio();


-- ═══════════════════════════════════════════════════════════
-- VERIFICACIÓN
-- ═══════════════════════════════════════════════════════════

SELECT tgname, tgrelid::regclass AS tabla
FROM pg_trigger
WHERE tgname IN ('evento_faltante_auto', 'evento_precio_cambio_auto');
