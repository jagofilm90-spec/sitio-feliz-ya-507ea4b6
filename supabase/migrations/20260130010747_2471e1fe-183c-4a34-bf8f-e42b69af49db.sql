-- Agregar columna uuid a proveedor_facturas para vincular con CFDI
ALTER TABLE public.proveedor_facturas
ADD COLUMN IF NOT EXISTS uuid TEXT;

-- Crear índice único para evitar duplicados
CREATE UNIQUE INDEX IF NOT EXISTS idx_proveedor_facturas_uuid 
ON public.proveedor_facturas(uuid) 
WHERE uuid IS NOT NULL;