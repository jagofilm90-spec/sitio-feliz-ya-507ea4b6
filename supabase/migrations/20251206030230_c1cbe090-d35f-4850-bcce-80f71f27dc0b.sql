-- Fix security definer view - add SECURITY INVOKER explicitly
DROP VIEW IF EXISTS public.productos_stock_bajo;
CREATE VIEW public.productos_stock_bajo 
WITH (security_invoker = true) AS
SELECT id, codigo, nombre, stock_actual, stock_minimo
FROM public.productos
WHERE activo = true AND stock_actual <= stock_minimo;