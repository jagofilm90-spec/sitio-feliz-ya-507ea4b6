-- Ensure gerente_almacen can view all pedidos
DROP POLICY IF EXISTS "Admin y secretaria ven todos los pedidos" ON public.pedidos;
CREATE POLICY "Admin y secretaria ven todos los pedidos"
ON public.pedidos FOR SELECT
USING (
  has_any_role(ARRAY['admin'::app_role, 'secretaria'::app_role, 'contadora'::app_role, 'almacen'::app_role, 'chofer'::app_role, 'gerente_almacen'::app_role])
);