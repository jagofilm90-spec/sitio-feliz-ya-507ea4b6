-- Corregir Miguel Hidalgo: mover de región 'hidalgo' a 'cdmx_poniente'
UPDATE zonas 
SET region = 'cdmx_poniente' 
WHERE nombre ILIKE '%Miguel Hidalgo%' 
AND region = 'hidalgo';

-- Agregar San Martín Texmelucan (Puebla) si no existe
INSERT INTO zonas (nombre, region, es_foranea, activo, descripcion)
SELECT 'San Martín Texmelucan', 'puebla', true, true, 'Zona de Puebla - San Martín Texmelucan'
WHERE NOT EXISTS (
  SELECT 1 FROM zonas WHERE nombre ILIKE '%San Martín Texmelucan%'
);