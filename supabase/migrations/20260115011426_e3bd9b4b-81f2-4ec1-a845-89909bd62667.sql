-- 1. Agregar campo de especificaciones para calibre/formato/variante
ALTER TABLE productos 
ADD COLUMN especificaciones TEXT;

-- 2. Renombrar presentacion a peso_kg para mayor claridad
ALTER TABLE productos 
RENAME COLUMN presentacion TO peso_kg;

-- 3. Comentarios descriptivos
COMMENT ON COLUMN productos.peso_kg IS 'Peso en kg por unidad de venta (bulto/caja). Para cálculos de precio y logística.';
COMMENT ON COLUMN productos.especificaciones IS 'Calibre, presentación o variante del producto (ej: "50/60", "24/800gr", "Deshuesada").';