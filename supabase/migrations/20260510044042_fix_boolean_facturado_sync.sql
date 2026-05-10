-- ============================================================
-- FIX: Sincronizar boolean pedidos.facturado con estado real CFDI
-- Bug #1 identificado en /audit/07 y /audit/40
--
-- PROBLEMA:
-- Flujo A ("Facturar y Enviar") marca facturado=true SIN crear CFDI
-- Flujo B ("Generar Factura") crea CFDI SIN marcar facturado=true
-- Resultado: reportes financieros incorrectos
--
-- SOLUCIÓN:
-- 1. Recalcular facturado para TODOS los pedidos existentes
-- 2. Trigger que mantiene sincronía automática en el futuro
-- ============================================================

-- PASO 1: Recalcular boolean facturado basado en estado REAL de facturas
-- facturado = true SOLO si existe factura timbrada (cfdi_uuid NOT NULL,
-- cfdi_estado != 'cancelada')
UPDATE pedidos p
SET facturado = EXISTS(
  SELECT 1 FROM facturas f
  WHERE f.pedido_id = p.id
    AND f.cfdi_uuid IS NOT NULL
    AND f.cfdi_estado NOT IN ('cancelada', 'error')
);

-- PASO 2: Función trigger para mantener sincronía futura
CREATE OR REPLACE FUNCTION sync_pedido_facturado_from_facturas()
RETURNS TRIGGER AS $$
DECLARE
  v_pedido_id UUID;
BEGIN
  -- Determinar pedido_id afectado
  v_pedido_id := COALESCE(NEW.pedido_id, OLD.pedido_id);

  -- Si no hay pedido vinculado, nada que hacer
  IF v_pedido_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Recalcular boolean facturado del pedido
  UPDATE pedidos
  SET facturado = EXISTS(
    SELECT 1 FROM facturas
    WHERE pedido_id = v_pedido_id
      AND cfdi_uuid IS NOT NULL
      AND cfdi_estado NOT IN ('cancelada', 'error')
  )
  WHERE id = v_pedido_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 3: Crear trigger en tabla facturas
-- Se dispara cuando:
-- - Se inserta nueva factura (Flujo B)
-- - Se actualiza factura (timbrado exitoso, cancelación)
-- - Se elimina factura
DROP TRIGGER IF EXISTS trg_sync_pedido_facturado ON facturas;
CREATE TRIGGER trg_sync_pedido_facturado
AFTER INSERT OR UPDATE OR DELETE ON facturas
FOR EACH ROW EXECUTE FUNCTION sync_pedido_facturado_from_facturas();

-- PASO 4: Verificación (ejecutar manualmente para confirmar)
-- Después de esta migración, estos queries deben regresar 0:
--
-- Pedidos marcados facturado=true SIN CFDI timbrado real:
-- SELECT count(*) FROM pedidos p
-- LEFT JOIN facturas f ON f.pedido_id = p.id AND f.cfdi_uuid IS NOT NULL AND f.cfdi_estado NOT IN ('cancelada','error')
-- WHERE p.facturado = true AND f.id IS NULL;
--
-- Pedidos marcados facturado=false CON CFDI timbrado real:
-- SELECT count(*) FROM pedidos p
-- JOIN facturas f ON f.pedido_id = p.id
-- WHERE p.facturado = false AND f.cfdi_uuid IS NOT NULL AND f.cfdi_estado NOT IN ('cancelada','error');
