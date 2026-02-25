-- Allow almacen and gerente_almacen to manage entregas (insert/update for carga flow)
DROP POLICY IF EXISTS "Admins and choferes can manage deliveries" ON public.entregas;
CREATE POLICY "Staff can manage deliveries"
ON public.entregas
FOR ALL
TO authenticated
USING (has_any_role(ARRAY['admin'::app_role, 'chofer'::app_role, 'secretaria'::app_role, 'almacen'::app_role, 'gerente_almacen'::app_role]))
WITH CHECK (has_any_role(ARRAY['admin'::app_role, 'chofer'::app_role, 'secretaria'::app_role, 'almacen'::app_role, 'gerente_almacen'::app_role]));

-- Allow gerente_almacen to view clientes (needed for pedido scanning)
CREATE POLICY "Gerente almacen ve clientes para gestión"
ON public.clientes
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'gerente_almacen'::app_role));