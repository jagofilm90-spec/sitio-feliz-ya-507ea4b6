-- Agregar campo numero_talon a entregas de órdenes de compra
ALTER TABLE ordenes_compra_entregas 
ADD COLUMN numero_talon VARCHAR(100);

-- Índice para búsqueda rápida por número de talón
CREATE INDEX idx_entregas_numero_talon 
ON ordenes_compra_entregas(numero_talon) 
WHERE numero_talon IS NOT NULL;

-- Comentario descriptivo
COMMENT ON COLUMN ordenes_compra_entregas.numero_talon IS 'Número de talón del proveedor para vincular con factura CFDI';