-- Agregar campos para rechazo total en Fase 1
ALTER TABLE ordenes_compra_entregas
ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT,
ADD COLUMN IF NOT EXISTS rechazada_en TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rechazada_por UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS firma_chofer_rechazo TEXT;

-- Comentarios descriptivos
COMMENT ON COLUMN ordenes_compra_entregas.motivo_rechazo IS 'Motivo del rechazo total: calidad, producto_incorrecto';
COMMENT ON COLUMN ordenes_compra_entregas.rechazada_en IS 'Timestamp cuando se rechazó la entrega';
COMMENT ON COLUMN ordenes_compra_entregas.rechazada_por IS 'Usuario que registró el rechazo';
COMMENT ON COLUMN ordenes_compra_entregas.firma_chofer_rechazo IS 'Firma digital del chofer confirmando el rechazo';