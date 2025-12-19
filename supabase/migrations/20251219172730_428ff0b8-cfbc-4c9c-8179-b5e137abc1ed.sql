-- Agregar campo costo_proveedor a proveedor_productos
ALTER TABLE proveedor_productos 
ADD COLUMN costo_proveedor numeric DEFAULT NULL;

COMMENT ON COLUMN proveedor_productos.costo_proveedor IS 'Costo específico de este producto con este proveedor (con impuestos incluidos)';