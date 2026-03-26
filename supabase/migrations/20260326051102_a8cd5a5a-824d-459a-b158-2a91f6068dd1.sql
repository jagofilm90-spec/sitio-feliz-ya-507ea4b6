ALTER TABLE public.rutas ADD COLUMN IF NOT EXISTS porcentaje_carga integer DEFAULT 0;
ALTER TABLE public.pedidos_detalles ADD COLUMN IF NOT EXISTS agregado_en_carga boolean DEFAULT false;