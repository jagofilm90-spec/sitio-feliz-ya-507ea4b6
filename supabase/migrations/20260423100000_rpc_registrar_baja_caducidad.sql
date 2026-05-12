-- RPC atómica para bajas de caducidad
-- Sustituye UPDATE inventario_lotes + INSERT inventario_movimientos directos
-- Patrón: role guard + operación atómica (similar a decrementar_lote)

CREATE OR REPLACE FUNCTION registrar_baja_caducidad(
  p_lote_id uuid,
  p_cantidad numeric,
  p_tipo text,
  p_notas text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_producto_id uuid;
BEGIN
  -- Role guard: solo admin, almacen, gerente_almacen
  IF NOT has_any_role(ARRAY['admin','almacen','gerente_almacen']::app_role[]) THEN
    RAISE EXCEPTION 'Acceso denegado: se requiere rol admin, almacen o gerente_almacen';
  END IF;

  -- Validar tipo permitido
  IF p_tipo NOT IN ('merma', 'consumo_interno', 'ajuste') THEN
    RAISE EXCEPTION 'Tipo de baja inválido: %. Use: merma, consumo_interno, ajuste', p_tipo;
  END IF;

  -- Validar cantidad positiva
  IF p_cantidad <= 0 THEN
    RAISE EXCEPTION 'Cantidad debe ser mayor a 0';
  END IF;

  -- Obtener producto_id del lote y validar stock suficiente (en un solo paso)
  SELECT producto_id INTO v_producto_id
  FROM inventario_lotes
  WHERE id = p_lote_id AND cantidad_disponible >= p_cantidad
  FOR UPDATE;

  IF v_producto_id IS NULL THEN
    RAISE EXCEPTION 'Lote no encontrado o stock insuficiente';
  END IF;

  -- Decrementar lote
  UPDATE inventario_lotes
  SET cantidad_disponible = cantidad_disponible - p_cantidad
  WHERE id = p_lote_id;

  -- Registrar movimiento de auditoría
  INSERT INTO inventario_movimientos (
    producto_id,
    cantidad,
    tipo_movimiento,
    referencia,
    notas,
    usuario_id
  )
  VALUES (
    v_producto_id,
    p_cantidad,
    p_tipo,
    'BAJA-CADUCIDAD',
    p_notas,
    auth.uid()
  );
END;
$$;

-- Permisos: solo usuarios autenticados pueden llamar (role guard adentro de la función)
REVOKE ALL ON FUNCTION registrar_baja_caducidad(uuid, numeric, text, text) FROM public;
GRANT EXECUTE ON FUNCTION registrar_baja_caducidad(uuid, numeric, text, text) TO authenticated;

COMMENT ON FUNCTION registrar_baja_caducidad IS
'RPC atómica para bajas por caducidad. Reemplaza UPDATE inventario_lotes + INSERT inventario_movimientos directos. Incluye role guard y validación de stock.';
