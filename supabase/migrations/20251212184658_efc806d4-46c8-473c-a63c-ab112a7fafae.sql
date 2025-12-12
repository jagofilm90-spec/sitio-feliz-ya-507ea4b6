-- Add solo_uso_interno field to productos table
ALTER TABLE public.productos 
ADD COLUMN IF NOT EXISTS solo_uso_interno boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.productos.solo_uso_interno IS 'Productos marcados como solo uso interno no aparecen en catálogo de ventas pero sí en inventario';