-- Fase 1: Nuevos campos para flujo de carga mejorado

-- 1.1 Tabla carga_productos: campos para corrección
ALTER TABLE public.carga_productos
ADD COLUMN IF NOT EXISTS motivo_correccion text,
ADD COLUMN IF NOT EXISTS corregido_en timestamp with time zone;

-- 1.2 Tabla entregas: campos para confirmación de carga
ALTER TABLE public.entregas
ADD COLUMN IF NOT EXISTS carga_confirmada boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS carga_confirmada_por uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS carga_confirmada_en timestamp with time zone;

-- 1.3 Tabla rutas: campos para sellos y firma del chofer
ALTER TABLE public.rutas
ADD COLUMN IF NOT EXISTS lleva_sellos boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS numero_sello_salida text,
ADD COLUMN IF NOT EXISTS firma_chofer_carga text,
ADD COLUMN IF NOT EXISTS firma_chofer_carga_fecha timestamp with time zone;