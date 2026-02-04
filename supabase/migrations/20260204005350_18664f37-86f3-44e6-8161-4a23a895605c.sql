-- Add 60_dias option to credit_term enum
ALTER TYPE credit_term ADD VALUE '60_dias';

-- Add fecha_entrega_real column to pedidos table
ALTER TABLE pedidos 
ADD COLUMN IF NOT EXISTS fecha_entrega_real TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create function to sync delivery date from entregas to pedidos
CREATE OR REPLACE FUNCTION sync_pedido_fecha_entrega()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.entregado = true AND (OLD.entregado = false OR OLD.entregado IS NULL) THEN
    UPDATE pedidos 
    SET fecha_entrega_real = COALESCE(NEW.fecha_entrega, NOW()),
        status = 'entregado'
    WHERE id = NEW.pedido_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-update fecha_entrega_real when delivery is marked as complete
DROP TRIGGER IF EXISTS trigger_sync_fecha_entrega ON entregas;
CREATE TRIGGER trigger_sync_fecha_entrega
AFTER UPDATE ON entregas
FOR EACH ROW
EXECUTE FUNCTION sync_pedido_fecha_entrega();

-- Also handle INSERT case for new deliveries that are immediately marked as delivered
CREATE OR REPLACE FUNCTION sync_pedido_fecha_entrega_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.entregado = true THEN
    UPDATE pedidos 
    SET fecha_entrega_real = COALESCE(NEW.fecha_entrega, NOW()),
        status = 'entregado'
    WHERE id = NEW.pedido_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_sync_fecha_entrega_insert ON entregas;
CREATE TRIGGER trigger_sync_fecha_entrega_insert
AFTER INSERT ON entregas
FOR EACH ROW
EXECUTE FUNCTION sync_pedido_fecha_entrega_insert();

-- Add comment for documentation
COMMENT ON COLUMN pedidos.fecha_entrega_real IS 'Fecha real de entrega del pedido. Se actualiza automáticamente cuando el chofer registra la entrega. Los plazos de crédito comienzan a contar desde esta fecha.';