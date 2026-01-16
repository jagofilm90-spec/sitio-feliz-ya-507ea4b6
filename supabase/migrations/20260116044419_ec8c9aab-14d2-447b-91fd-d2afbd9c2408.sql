-- Agregar campos estructurados para productos
-- Contenido del empaque (ej: "24×800g", "25kg", "10kg")
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS contenido_empaque TEXT;

-- Unidad SAT para facturación (ej: "H87", "KGM", "XBX")
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS unidad_sat TEXT;

-- Migrar datos existentes: si tiene peso_kg, generar contenido_empaque automáticamente
UPDATE public.productos 
SET contenido_empaque = peso_kg || ' kg'
WHERE peso_kg IS NOT NULL 
  AND peso_kg > 0 
  AND contenido_empaque IS NULL;

-- Comentarios para documentación
COMMENT ON COLUMN public.productos.contenido_empaque IS 'Contenido del empaque, ej: 24×800g, 25kg, 10kg';
COMMENT ON COLUMN public.productos.unidad_sat IS 'Clave de unidad SAT para facturación, ej: H87 (pieza), KGM (kilogramo)';