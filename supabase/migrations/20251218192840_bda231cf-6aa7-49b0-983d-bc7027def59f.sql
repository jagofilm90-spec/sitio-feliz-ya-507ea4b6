-- Agregar campos de configuración de lotes a proveedor_productos
ALTER TABLE proveedor_productos
ADD COLUMN IF NOT EXISTS dividir_en_lotes_recepcion BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cantidad_lotes_default INTEGER,
ADD COLUMN IF NOT EXISTS unidades_por_lote_default INTEGER;

-- Agregar comentarios descriptivos
COMMENT ON COLUMN proveedor_productos.dividir_en_lotes_recepcion IS 'Indica si este producto del proveedor viene dividido en lotes al recibirse';
COMMENT ON COLUMN proveedor_productos.cantidad_lotes_default IS 'Número de lotes en que viene dividido el producto';
COMMENT ON COLUMN proveedor_productos.unidades_por_lote_default IS 'Cantidad de unidades por cada lote';