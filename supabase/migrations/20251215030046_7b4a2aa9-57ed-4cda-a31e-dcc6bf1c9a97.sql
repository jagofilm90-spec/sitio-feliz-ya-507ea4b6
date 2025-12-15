-- Corregir región de Ecatepec de Morelos (estaba en 'morelos' pero es Estado de México)
UPDATE zonas 
SET region = 'edomex_norte' 
WHERE nombre ILIKE '%Ecatepec%';