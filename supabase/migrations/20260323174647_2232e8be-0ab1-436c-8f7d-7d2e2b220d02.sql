ALTER TABLE ordenes_compra_entregas ADD COLUMN IF NOT EXISTS datos_llegada_parcial JSONB DEFAULT NULL;

COMMENT ON COLUMN ordenes_compra_entregas.datos_llegada_parcial IS 'Borrador de datos de llegada para continuar después';