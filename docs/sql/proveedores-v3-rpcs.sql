-- ═══════════════════════════════════════════════════════════
-- PROVEEDORES V3 — RPCs DE KPIs
-- Fecha: 29 abril 2026
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Ejecutar DESPUÉS de proveedores-v3-migration.sql
-- ═══════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════
-- RPC 1: get_proveedor_score
-- Score de confiabilidad 0-100 ponderado
-- 50% entregas completas + 30% peso correcto + 20% lead time
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_proveedor_score(p_proveedor_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_total_ocs INTEGER;
  v_completas INTEGER;
  v_pct_completas NUMERIC;
  v_peso_correcto NUMERIC;
  v_lead_time_promedio NUMERIC;
  v_score NUMERIC;
  v_rating TEXT;
BEGIN
  -- Total OCs últimos 6 meses con recepción
  SELECT COUNT(*) INTO v_total_ocs
  FROM ordenes_compra
  WHERE proveedor_id = p_proveedor_id
    AND created_at > NOW() - INTERVAL '6 months'
    AND status IN ('recibida', 'completada', 'cerrada', 'parcial');

  IF v_total_ocs = 0 THEN
    RETURN jsonb_build_object(
      'score', NULL, 'rating', 'sin_historial', 'total_ocs', 0,
      'porcentaje_completas', NULL, 'peso_correcto', NULL, 'lead_time_promedio', NULL
    );
  END IF;

  -- OCs sin faltantes pendientes
  SELECT COUNT(*) INTO v_completas
  FROM ordenes_compra oc
  WHERE oc.proveedor_id = p_proveedor_id
    AND oc.created_at > NOW() - INTERVAL '6 months'
    AND oc.status IN ('recibida', 'completada', 'cerrada')
    AND NOT EXISTS (
      SELECT 1 FROM faltantes_proveedor
      WHERE orden_compra_id = oc.id AND status = 'pendiente'
    );

  v_pct_completas := (v_completas::NUMERIC / v_total_ocs::NUMERIC) * 100;

  -- Precisión de peso (% recibido vs pedido, solo productos por kilo)
  SELECT COALESCE(AVG(
    CASE WHEN ocd.peso_pedido_estimado > 0 THEN
      LEAST((ocd.peso_recibido_real / ocd.peso_pedido_estimado) * 100, 100)
    ELSE NULL END
  ), 100) INTO v_peso_correcto
  FROM ordenes_compra_detalles ocd
  JOIN ordenes_compra oc ON oc.id = ocd.orden_compra_id
  WHERE oc.proveedor_id = p_proveedor_id
    AND oc.created_at > NOW() - INTERVAL '6 months'
    AND ocd.peso_pedido_estimado IS NOT NULL
    AND ocd.peso_recibido_real IS NOT NULL;

  -- Lead time promedio (días creación → recepción)
  SELECT COALESCE(AVG(
    EXTRACT(DAY FROM (fecha_entrega_real::TIMESTAMP - created_at::TIMESTAMP))
  ), 5) INTO v_lead_time_promedio
  FROM ordenes_compra
  WHERE proveedor_id = p_proveedor_id
    AND fecha_entrega_real IS NOT NULL
    AND created_at > NOW() - INTERVAL '6 months';

  -- Score ponderado
  v_score := (
    (v_pct_completas * 0.5) +
    (LEAST(v_peso_correcto, 100) * 0.3) +
    (GREATEST(0, 100 - (v_lead_time_promedio * 5)) * 0.2)
  );

  v_rating := CASE
    WHEN v_score >= 90 THEN 'excelente'
    WHEN v_score >= 75 THEN 'bueno'
    WHEN v_score >= 60 THEN 'regular'
    WHEN v_score >= 40 THEN 'bajo'
    ELSE 'critico'
  END;

  RETURN jsonb_build_object(
    'score', ROUND(v_score, 1),
    'rating', v_rating,
    'total_ocs', v_total_ocs,
    'porcentaje_completas', ROUND(v_pct_completas, 1),
    'peso_correcto', ROUND(v_peso_correcto, 1),
    'lead_time_promedio', ROUND(v_lead_time_promedio, 1)
  );
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_proveedor_score TO authenticated;


-- ═══════════════════════════════════════════════════════════
-- RPC 2: get_proveedor_kpis
-- Dashboard 360 del proveedor
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_proveedor_kpis(p_proveedor_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_compras_30d NUMERIC;
  v_compras_30d_ant NUMERIC;
  v_trend NUMERIC;
  v_saldo_total NUMERIC;
  v_saldo_vencido NUMERIC;
  v_score JSONB;
BEGIN
  -- Compras últimos 30 días
  SELECT COALESCE(SUM(total), 0) INTO v_compras_30d
  FROM ordenes_compra
  WHERE proveedor_id = p_proveedor_id
    AND created_at > NOW() - INTERVAL '30 days';

  -- Compras 30 días anteriores (para tendencia)
  SELECT COALESCE(SUM(total), 0) INTO v_compras_30d_ant
  FROM ordenes_compra
  WHERE proveedor_id = p_proveedor_id
    AND created_at BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days';

  v_trend := CASE
    WHEN v_compras_30d_ant > 0 THEN
      ((v_compras_30d - v_compras_30d_ant) / v_compras_30d_ant) * 100
    ELSE NULL
  END;

  -- Saldo pendiente de pago
  SELECT COALESCE(SUM(total), 0) INTO v_saldo_total
  FROM ordenes_compra
  WHERE proveedor_id = p_proveedor_id
    AND status_pago = 'pendiente';

  -- Saldo vencido
  SELECT COALESCE(SUM(total), 0) INTO v_saldo_vencido
  FROM ordenes_compra
  WHERE proveedor_id = p_proveedor_id
    AND status_pago = 'pendiente'
    AND fecha_pago_calculada < CURRENT_DATE;

  -- Score
  v_score := get_proveedor_score(p_proveedor_id);

  RETURN jsonb_build_object(
    'compras_30d', v_compras_30d,
    'trend_compras', ROUND(v_trend, 1),
    'saldo_total', v_saldo_total,
    'saldo_vencido', v_saldo_vencido,
    'score', v_score
  );
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_proveedor_kpis TO authenticated;


-- ═══════════════════════════════════════════════════════════
-- RPC 3: get_proveedor_compras_mensuales
-- Barras de compras por mes (últimos 6 meses)
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_proveedor_compras_mensuales(p_proveedor_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_resultado JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'mes', TO_CHAR(mes, 'Mon YYYY'),
      'total', total
    ) ORDER BY mes
  ) INTO v_resultado
  FROM (
    SELECT
      DATE_TRUNC('month', created_at) AS mes,
      SUM(total) AS total
    FROM ordenes_compra
    WHERE proveedor_id = p_proveedor_id
      AND created_at > NOW() - INTERVAL '6 months'
    GROUP BY DATE_TRUNC('month', created_at)
  ) t;

  RETURN COALESCE(v_resultado, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_proveedor_compras_mensuales TO authenticated;


-- ═══════════════════════════════════════════════════════════
-- VERIFICACIÓN
-- ═══════════════════════════════════════════════════════════

SELECT proname FROM pg_proc
WHERE proname IN ('get_proveedor_score', 'get_proveedor_kpis',
                  'get_proveedor_compras_mensuales');
