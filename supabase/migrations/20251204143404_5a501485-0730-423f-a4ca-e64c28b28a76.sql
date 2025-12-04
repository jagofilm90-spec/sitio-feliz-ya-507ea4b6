-- Add new columns to vehiculos table for tarjeta de circulación data
ALTER TABLE public.vehiculos 
ADD COLUMN IF NOT EXISTS numero_motor text,
ADD COLUMN IF NOT EXISTS cilindros text,
ADD COLUMN IF NOT EXISTS modelo text,
ADD COLUMN IF NOT EXISTS clave_vehicular text,
ADD COLUMN IF NOT EXISTS clase_tipo text,
ADD COLUMN IF NOT EXISTS tarjeta_circulacion_expedicion date;