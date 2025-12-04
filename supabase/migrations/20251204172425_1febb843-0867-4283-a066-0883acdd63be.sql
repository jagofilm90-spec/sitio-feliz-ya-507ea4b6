-- Add columns for federal circulation card support
ALTER TABLE public.vehiculos 
ADD COLUMN IF NOT EXISTS tipo_tarjeta_circulacion TEXT DEFAULT 'estatal',
ADD COLUMN IF NOT EXISTS peso_vehicular_ton DECIMAL,
ADD COLUMN IF NOT EXISTS numero_ejes INTEGER,
ADD COLUMN IF NOT EXISTS numero_llantas INTEGER,
ADD COLUMN IF NOT EXISTS capacidad_toneladas DECIMAL,
ADD COLUMN IF NOT EXISTS clase_federal TEXT,
ADD COLUMN IF NOT EXISTS permiso_ruta TEXT,
ADD COLUMN IF NOT EXISTS tipo_suspension TEXT,
ADD COLUMN IF NOT EXISTS dimensiones_alto DECIMAL,
ADD COLUMN IF NOT EXISTS dimensiones_ancho DECIMAL,
ADD COLUMN IF NOT EXISTS dimensiones_largo DECIMAL,
ADD COLUMN IF NOT EXISTS marca TEXT;

-- Add comment to explain the type field
COMMENT ON COLUMN public.vehiculos.tipo_tarjeta_circulacion IS 'Type of circulation card: estatal (state) or federal (SICT/SCT)';