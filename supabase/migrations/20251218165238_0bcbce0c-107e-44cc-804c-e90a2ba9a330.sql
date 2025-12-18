-- Agregar campos de configuración de transporte a proveedor_productos
ALTER TABLE public.proveedor_productos 
ADD COLUMN IF NOT EXISTS tipo_vehiculo_estandar TEXT;

ALTER TABLE public.proveedor_productos 
ADD COLUMN IF NOT EXISTS capacidad_vehiculo_bultos INTEGER;

ALTER TABLE public.proveedor_productos 
ADD COLUMN IF NOT EXISTS capacidad_vehiculo_kg NUMERIC;

ALTER TABLE public.proveedor_productos 
ADD COLUMN IF NOT EXISTS permite_combinacion BOOLEAN DEFAULT false;

ALTER TABLE public.proveedor_productos 
ADD COLUMN IF NOT EXISTS es_capacidad_fija BOOLEAN DEFAULT true;

ALTER TABLE public.proveedor_productos 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Comentarios descriptivos
COMMENT ON COLUMN public.proveedor_productos.tipo_vehiculo_estandar IS 'Tipo de vehículo estándar: trailer, torton, rabon, camioneta';
COMMENT ON COLUMN public.proveedor_productos.capacidad_vehiculo_bultos IS 'Cantidad de bultos que caben en el vehículo para este producto';
COMMENT ON COLUMN public.proveedor_productos.capacidad_vehiculo_kg IS 'Capacidad en kg del vehículo para este producto';
COMMENT ON COLUMN public.proveedor_productos.permite_combinacion IS 'Si permite combinar con otros productos en el mismo vehículo';
COMMENT ON COLUMN public.proveedor_productos.es_capacidad_fija IS 'Si la capacidad es fija (siempre viene así) o variable';