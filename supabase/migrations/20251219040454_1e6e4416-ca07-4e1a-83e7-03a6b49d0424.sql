-- Add column to track how supplier charges for each product (by kilo or by unit)
-- NULL = not configured yet (system will ask)
-- true = supplier charges by kilo
-- false = supplier charges by unit/box
ALTER TABLE proveedor_productos 
ADD COLUMN IF NOT EXISTS precio_por_kilo_compra boolean DEFAULT NULL;

-- Add a comment to document the field
COMMENT ON COLUMN proveedor_productos.precio_por_kilo_compra IS 'How the supplier charges for this product: true=by kilo, false=by unit/box, NULL=not configured';