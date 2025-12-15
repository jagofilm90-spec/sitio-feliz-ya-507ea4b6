-- Agregar columnas para firma del chofer cuando hay diferencias
ALTER TABLE ordenes_compra_entregas
ADD COLUMN IF NOT EXISTS firma_chofer_diferencia TEXT,
ADD COLUMN IF NOT EXISTS firma_chofer_diferencia_fecha TIMESTAMPTZ;

-- Agregar columna para vincular devolución con entrega específica y firma del chofer
ALTER TABLE devoluciones_proveedor
ADD COLUMN IF NOT EXISTS orden_compra_entrega_id UUID REFERENCES ordenes_compra_entregas(id),
ADD COLUMN IF NOT EXISTS firma_chofer TEXT;

-- Comentarios para documentación
COMMENT ON COLUMN ordenes_compra_entregas.firma_chofer_diferencia IS 'Firma base64 del chofer del proveedor confirmando que entregó menos de lo ordenado';
COMMENT ON COLUMN ordenes_compra_entregas.firma_chofer_diferencia_fecha IS 'Fecha/hora en que el chofer firmó confirmando la diferencia';
COMMENT ON COLUMN devoluciones_proveedor.firma_chofer IS 'Firma base64 del chofer confirmando que recibe mercancía devuelta';
COMMENT ON COLUMN devoluciones_proveedor.orden_compra_entrega_id IS 'Entrega específica de la orden de compra asociada a esta devolución';