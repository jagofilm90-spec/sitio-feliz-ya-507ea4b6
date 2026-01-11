-- Add columns for order context in discount requests
ALTER TABLE solicitudes_descuento ADD COLUMN IF NOT EXISTS 
  carrito_snapshot JSONB;

ALTER TABLE solicitudes_descuento ADD COLUMN IF NOT EXISTS 
  total_pedido_estimado NUMERIC;

ALTER TABLE solicitudes_descuento ADD COLUMN IF NOT EXISTS 
  es_urgente BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN solicitudes_descuento.carrito_snapshot IS 'Snapshot of all products in the cart when discount was requested';
COMMENT ON COLUMN solicitudes_descuento.total_pedido_estimado IS 'Estimated total of the order at time of request';
COMMENT ON COLUMN solicitudes_descuento.es_urgente IS 'Whether the seller is waiting live for the response';