-- Add JSONB column for extended delivery restrictions
ALTER TABLE cliente_sucursales 
ADD COLUMN IF NOT EXISTS metadata_entrega JSONB DEFAULT '{}'::jsonb;

-- GIN index for fast searches within the JSON
CREATE INDEX IF NOT EXISTS idx_cliente_sucursales_metadata_entrega 
ON cliente_sucursales USING gin (metadata_entrega);

COMMENT ON COLUMN cliente_sucursales.metadata_entrega IS 
'Datos estructurados de restricciones de entrega: personal_extra, zona (conflictiva, cita_previa, puerta_trasera, avisar_minutos), notas_libres. Los campos básicos (dias_sin_entrega, horario_entrega, restricciones_vehiculo) siguen en sus columnas TEXT originales.';