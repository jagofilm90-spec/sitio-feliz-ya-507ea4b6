-- Agregar campos para mejoras en recepción de OC
ALTER TABLE public.ordenes_compra_entregas
ADD COLUMN IF NOT EXISTS numero_remision_proveedor TEXT,
ADD COLUMN IF NOT EXISTS firma_chofer_conformidad TEXT,
ADD COLUMN IF NOT EXISTS firma_chofer_conformidad_fecha TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS firma_almacenista TEXT,
ADD COLUMN IF NOT EXISTS firma_almacenista_fecha TIMESTAMP WITH TIME ZONE;