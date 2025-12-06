-- Agregar campos de tracking de ajuste de precios a pedidos_detalles
ALTER TABLE public.pedidos_detalles 
ADD COLUMN IF NOT EXISTS precio_original numeric,
ADD COLUMN IF NOT EXISTS precio_ajustado_por uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS fecha_ajuste_precio timestamp with time zone,
ADD COLUMN IF NOT EXISTS linea_dividida_de uuid REFERENCES public.pedidos_detalles(id),
ADD COLUMN IF NOT EXISTS notas_ajuste text;

-- Comentarios descriptivos
COMMENT ON COLUMN public.pedidos_detalles.precio_original IS 'Precio unitario original antes de cualquier ajuste';
COMMENT ON COLUMN public.pedidos_detalles.precio_ajustado_por IS 'Usuario que realizó el ajuste de precio';
COMMENT ON COLUMN public.pedidos_detalles.fecha_ajuste_precio IS 'Fecha y hora del ajuste de precio';
COMMENT ON COLUMN public.pedidos_detalles.linea_dividida_de IS 'Referencia a la línea original si esta fue creada por división';
COMMENT ON COLUMN public.pedidos_detalles.notas_ajuste IS 'Notas explicativas del ajuste de precio';