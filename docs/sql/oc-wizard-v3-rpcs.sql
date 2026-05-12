-- ═══════════════════════════════════════════════════════════
-- OC WIZARD V3 — RPCs
-- Fecha: 29 abril 2026 (actualizado con peso real)
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Ejecutar DESPUÉS de oc-wizard-v3-migration.sql
--
-- REGLAS DE PAGO:
--   Por kilo:  pago = peso_recibido_real × precio_por_kg
--   Por bulto: pago = cantidad_bultos × precio_unitario
-- ═══════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════
-- RPC 1: crear_orden_compra_v3
-- Creación atómica: OC + detalles + entregas en 1 transacción
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION crear_orden_compra_v3(
  -- REQUERIDOS (sin default)
  p_proveedor_id UUID,
  p_tipo_pago TEXT,              -- 'contra_entrega' | 'anticipado'
  p_lineas JSONB,                -- [{producto_id, cantidad, precio_unitario, tipo_carga, unidades_carga}]
  -- OPCIONALES (con default)
  p_plazo_pago_dias INTEGER DEFAULT 0,
  p_metodo_pago_anticipado TEXT DEFAULT NULL,
  p_notas TEXT DEFAULT NULL,
  p_notas_internas TEXT DEFAULT NULL,
  p_entregas_multiples BOOLEAN DEFAULT false,
  p_entregas JSONB DEFAULT NULL  -- [{numero_entrega, cantidad_bultos, fecha_programada}]
)
RETURNS JSONB AS $$
DECLARE
  v_orden_id UUID;
  v_folio TEXT;
  v_user_id UUID;
  v_subtotal NUMERIC := 0;
  v_iva NUMERIC := 0;
  v_ieps NUMERIC := 0;
  v_total NUMERIC := 0;
  v_linea JSONB;
  v_entrega JSONB;
  v_status TEXT;
  v_prod RECORD;
  v_line_subtotal NUMERIC;
  v_line_iva NUMERIC;
  v_line_ieps NUMERIC;
  v_peso_pedido NUMERIC;
BEGIN
  -- Validar usuario
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  -- Validar rol
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = v_user_id AND role IN ('admin', 'secretaria')
  ) THEN
    RAISE EXCEPTION 'Sin permisos para crear OC';
  END IF;

  -- Validar tipo de pago
  IF p_tipo_pago NOT IN ('contra_entrega', 'anticipado') THEN
    RAISE EXCEPTION 'Tipo de pago inválido: %', p_tipo_pago;
  END IF;

  -- Validar proveedor activo
  IF NOT EXISTS (SELECT 1 FROM proveedores WHERE id = p_proveedor_id AND activo = true) THEN
    RAISE EXCEPTION 'Proveedor no encontrado o inactivo';
  END IF;

  -- Validar al menos 1 línea
  IF p_lineas IS NULL OR jsonb_array_length(p_lineas) = 0 THEN
    RAISE EXCEPTION 'La OC debe tener al menos un producto';
  END IF;

  -- Generar folio atómico
  v_folio := generar_folio_orden_compra();

  -- Status inicial
  v_status := CASE
    WHEN p_tipo_pago = 'anticipado' THEN 'pendiente_pago'
    ELSE 'pendiente'
  END;

  -- Insertar OC
  INSERT INTO ordenes_compra (
    folio, proveedor_id, creado_por,
    tipo_pago, plazo_pago_dias, metodo_pago_anticipado,
    status, status_pago,
    entregas_multiples, notas, notas_internas,
    subtotal, impuestos, total
  ) VALUES (
    v_folio, p_proveedor_id, v_user_id,
    p_tipo_pago, p_plazo_pago_dias, p_metodo_pago_anticipado,
    v_status, 'pendiente',
    p_entregas_multiples, p_notas, p_notas_internas,
    0, 0, 0
  ) RETURNING id INTO v_orden_id;

  -- Insertar líneas
  FOR v_linea IN SELECT * FROM jsonb_array_elements(p_lineas)
  LOOP
    -- Datos del producto
    SELECT aplica_iva, aplica_ieps, tasa_ieps, precio_por_kilo, peso_kg
    INTO v_prod
    FROM productos
    WHERE id = (v_linea->>'producto_id')::UUID;

    v_line_subtotal := (v_linea->>'cantidad')::NUMERIC * (v_linea->>'precio_unitario')::NUMERIC;

    -- Para productos por kilo: peso pedido estimado = bultos × peso_kg
    IF v_prod.precio_por_kilo = true THEN
      v_peso_pedido := (v_linea->>'cantidad')::NUMERIC * COALESCE(v_prod.peso_kg, 0);
    ELSE
      v_peso_pedido := NULL;
    END IF;

    -- IVA 16% (precio incluye IVA → descontar base)
    v_line_iva := CASE WHEN v_prod.aplica_iva THEN v_line_subtotal * 0.16 / 1.16 ELSE 0 END;

    -- IEPS (tasa variable)
    v_line_ieps := CASE WHEN v_prod.aplica_ieps THEN
      v_line_subtotal * COALESCE(v_prod.tasa_ieps, 8) / (100 + COALESCE(v_prod.tasa_ieps, 8))
    ELSE 0 END;

    INSERT INTO ordenes_compra_detalles (
      orden_compra_id, producto_id,
      cantidad_ordenada, precio_unitario_compra, subtotal,
      tipo_carga, unidades_carga, peso_pedido_estimado
    ) VALUES (
      v_orden_id, (v_linea->>'producto_id')::UUID,
      (v_linea->>'cantidad')::NUMERIC,
      (v_linea->>'precio_unitario')::NUMERIC,
      v_line_subtotal,
      COALESCE(v_linea->>'tipo_carga', 'libre'),
      (v_linea->>'unidades_carga')::INTEGER,
      v_peso_pedido
    );

    v_subtotal := v_subtotal + (v_line_subtotal - v_line_iva - v_line_ieps);
    v_iva := v_iva + v_line_iva;
    v_ieps := v_ieps + v_line_ieps;
  END LOOP;

  v_total := v_subtotal + v_iva + v_ieps;

  -- Entregas
  IF p_entregas_multiples AND p_entregas IS NOT NULL THEN
    FOR v_entrega IN SELECT * FROM jsonb_array_elements(p_entregas)
    LOOP
      INSERT INTO ordenes_compra_entregas (
        orden_compra_id, numero_entrega, cantidad_bultos,
        fecha_programada, status
      ) VALUES (
        v_orden_id,
        (v_entrega->>'numero_entrega')::INTEGER,
        (v_entrega->>'cantidad_bultos')::INTEGER,
        (v_entrega->>'fecha_programada')::DATE,
        CASE WHEN (v_entrega->>'fecha_programada') IS NOT NULL THEN 'programada' ELSE 'pendiente_fecha' END
      );
    END LOOP;
  ELSIF NOT p_entregas_multiples THEN
    INSERT INTO ordenes_compra_entregas (
      orden_compra_id, numero_entrega, cantidad_bultos,
      fecha_programada, status
    ) VALUES (
      v_orden_id, 1,
      (SELECT SUM((l->>'cantidad')::NUMERIC) FROM jsonb_array_elements(p_lineas) l)::INTEGER,
      NULL, 'pendiente_fecha'
    );
  END IF;

  -- Actualizar totales
  UPDATE ordenes_compra SET
    subtotal = v_subtotal,
    impuestos = v_iva + v_ieps,
    total = v_total
  WHERE id = v_orden_id;

  RETURN jsonb_build_object(
    'success', true,
    'orden_id', v_orden_id,
    'folio', v_folio,
    'subtotal', v_subtotal,
    'iva', v_iva,
    'ieps', v_ieps,
    'total', v_total
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION crear_orden_compra_v3 TO authenticated;


-- ═══════════════════════════════════════════════════════════
-- RPC registrar_recepcion_oc → POSTPONED to Sesión Almacén v3
-- Razón: la recepción pertenece al módulo Almacén, no Compras.
-- Se diseñará con peso real, faltantes por peso, y mockup propio.
