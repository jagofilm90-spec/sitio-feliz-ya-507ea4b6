-- Drop and recreate view with proper security invoker setting
DROP VIEW IF EXISTS public.productos_stock_bajo;

CREATE VIEW public.productos_stock_bajo 
WITH (security_invoker = true) AS
SELECT id, codigo, nombre, stock_actual, stock_minimo
FROM public.productos
WHERE activo = true AND stock_actual <= stock_minimo;

-- Grant access to authenticated users
GRANT SELECT ON public.productos_stock_bajo TO authenticated;
GRANT SELECT ON public.productos_stock_bajo TO anon;