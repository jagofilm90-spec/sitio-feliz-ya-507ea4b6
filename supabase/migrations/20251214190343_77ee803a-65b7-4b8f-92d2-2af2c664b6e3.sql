-- Agregar campos para tracking de inicio de carga
ALTER TABLE rutas ADD COLUMN IF NOT EXISTS carga_iniciada_en timestamp with time zone;
ALTER TABLE rutas ADD COLUMN IF NOT EXISTS carga_iniciada_por uuid REFERENCES profiles(id);

-- Agregar hora sugerida de salida si no existe
ALTER TABLE rutas ADD COLUMN IF NOT EXISTS hora_salida_sugerida time;

-- Comentarios descriptivos
COMMENT ON COLUMN rutas.carga_iniciada_en IS 'Timestamp cuando el almacenista inició la carga';
COMMENT ON COLUMN rutas.carga_iniciada_por IS 'Usuario que inició la carga';
COMMENT ON COLUMN rutas.hora_salida_sugerida IS 'Hora programada de salida del vehículo';