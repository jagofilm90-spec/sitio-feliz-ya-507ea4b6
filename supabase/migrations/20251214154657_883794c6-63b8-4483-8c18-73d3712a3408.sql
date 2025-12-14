-- Habilitar realtime para tablas de monitoreo de rutas
ALTER PUBLICATION supabase_realtime ADD TABLE public.rutas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.entregas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.carga_productos;