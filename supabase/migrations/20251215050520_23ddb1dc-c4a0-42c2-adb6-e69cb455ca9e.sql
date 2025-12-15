-- Agregar campo para registrar cuando se finaliza la recepción (para calcular tiempo de descarga)
ALTER TABLE ordenes_compra_entregas 
ADD COLUMN IF NOT EXISTS recepcion_finalizada_en TIMESTAMPTZ;