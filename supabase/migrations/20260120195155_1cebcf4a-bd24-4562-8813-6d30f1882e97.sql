-- Agregar campos para cancelación de descarga
ALTER TABLE ordenes_compra_entregas 
ADD COLUMN IF NOT EXISTS descarga_cancelada_en TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS descarga_cancelada_por UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS motivo_cancelacion_descarga TEXT;