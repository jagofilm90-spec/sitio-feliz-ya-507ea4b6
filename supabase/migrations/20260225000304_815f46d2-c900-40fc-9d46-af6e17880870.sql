-- Fix 1: Add gerente_almacen to pedidos SELECT policy
DROP POLICY IF EXISTS "Admin y secretaria ven todos los pedidos" ON public.pedidos;
CREATE POLICY "Admin y secretaria ven todos los pedidos"
ON public.pedidos FOR SELECT
USING (
  has_any_role(ARRAY['admin'::app_role, 'secretaria'::app_role, 'contadora'::app_role, 'almacen'::app_role, 'chofer'::app_role, 'gerente_almacen'::app_role])
);

-- Fix 2: Add 'cargada' to the allowed statuses for rutas
ALTER TABLE public.rutas DROP CONSTRAINT IF EXISTS rutas_status_check;
ALTER TABLE public.rutas ADD CONSTRAINT rutas_status_check 
  CHECK (status = ANY (ARRAY['programada'::text, 'en_curso'::text, 'completada'::text, 'cancelada'::text, 'cargada'::text]));