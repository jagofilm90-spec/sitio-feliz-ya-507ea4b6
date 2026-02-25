CREATE POLICY "Almacen can update pedido status"
  ON public.pedidos
  FOR UPDATE
  USING (has_any_role(ARRAY['almacen'::app_role, 'gerente_almacen'::app_role]))
  WITH CHECK (has_any_role(ARRAY['almacen'::app_role, 'gerente_almacen'::app_role]));