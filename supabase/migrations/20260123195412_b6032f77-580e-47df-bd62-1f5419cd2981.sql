-- Add GPS coordinates and detection radius to bodegas table
ALTER TABLE bodegas 
ADD COLUMN IF NOT EXISTS latitud decimal(10, 8),
ADD COLUMN IF NOT EXISTS longitud decimal(11, 8),
ADD COLUMN IF NOT EXISTS radio_deteccion_metros integer DEFAULT 100;

-- Update Bodega 1 with known coordinates (from BODEGA_COORDS in useEnRutaCalculations.ts)
UPDATE bodegas SET 
  latitud = 19.408680,
  longitud = -99.121084,
  radio_deteccion_metros = 100
WHERE nombre = 'Bodega 1';

-- Add comment for documentation
COMMENT ON COLUMN bodegas.latitud IS 'Latitud GPS de la bodega para auto-detección';
COMMENT ON COLUMN bodegas.longitud IS 'Longitud GPS de la bodega para auto-detección';
COMMENT ON COLUMN bodegas.radio_deteccion_metros IS 'Radio en metros para detectar si el usuario está en esta bodega';