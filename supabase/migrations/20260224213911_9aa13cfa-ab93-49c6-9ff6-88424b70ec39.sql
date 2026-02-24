-- Add peso_real_kg to carga_productos for actual weight capture during loading
ALTER TABLE public.carga_productos 
ADD COLUMN peso_real_kg numeric NULL;

-- Add a comment for clarity
COMMENT ON COLUMN public.carga_productos.peso_real_kg IS 'Peso real capturado por el almacenista durante la carga (solo para productos precio_por_kilo)';
