-- Consolidar presentacion a campo numérico único
-- Migrar datos de kg_por_unidad a presentacion donde sea necesario

-- 1. Copiar kg_por_unidad a presentacion donde presentacion esté vacío
UPDATE productos 
SET presentacion = kg_por_unidad::text 
WHERE kg_por_unidad IS NOT NULL 
  AND (presentacion IS NULL OR presentacion = '' OR presentacion = '0');

-- 2. Limpiar valores texto para extraer solo número (ej: "25 KG" → "25")
UPDATE productos 
SET presentacion = regexp_replace(presentacion, '[^0-9.]', '', 'g')
WHERE presentacion IS NOT NULL 
  AND presentacion ~ '[a-zA-Z]';

-- 3. Manejar valores vacíos o inválidos antes de conversión
UPDATE productos 
SET presentacion = NULL 
WHERE presentacion = '' OR presentacion = '.';

-- 4. Cambiar tipo de columna a NUMERIC
ALTER TABLE productos 
ALTER COLUMN presentacion TYPE NUMERIC(10,2) 
USING NULLIF(presentacion, '')::NUMERIC;

-- 5. Eliminar columna redundante kg_por_unidad
ALTER TABLE productos DROP COLUMN IF EXISTS kg_por_unidad;

-- 6. Agregar comentario descriptivo
COMMENT ON COLUMN productos.presentacion IS 'Peso en kilogramos por unidad de venta (bulto/caja). Usado para cálculos de precio por kilo y logística.';