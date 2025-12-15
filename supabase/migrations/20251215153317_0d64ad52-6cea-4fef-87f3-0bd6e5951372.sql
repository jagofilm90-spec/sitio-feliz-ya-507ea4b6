-- 1. Recrear vista productos_stock_bajo con security_invoker
DROP VIEW IF EXISTS public.productos_stock_bajo;

CREATE VIEW public.productos_stock_bajo WITH (security_invoker = true) AS
SELECT 
    id,
    codigo,
    nombre,
    stock_actual,
    stock_minimo
FROM public.productos
WHERE activo = true AND stock_actual <= stock_minimo;

COMMENT ON VIEW public.productos_stock_bajo IS 'Vista de productos con stock bajo. Usa security_invoker para heredar RLS de la tabla productos.';

-- 2. Mover extensión pg_net de public a extensions
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;