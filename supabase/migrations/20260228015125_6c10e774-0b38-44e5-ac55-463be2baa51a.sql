
-- Add cantidad_original to pedidos_detalles for tracking modifications during loading
ALTER TABLE public.pedidos_detalles ADD COLUMN IF NOT EXISTS cantidad_original numeric;

-- Add impresion_requerida to rutas to block dispatch until sheets are printed
ALTER TABLE public.rutas ADD COLUMN IF NOT EXISTS impresion_requerida boolean DEFAULT false;
