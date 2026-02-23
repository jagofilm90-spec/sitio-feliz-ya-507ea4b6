-- Allow vendedores to delete their clients' orders (only por_autorizar/pendiente status)
CREATE POLICY "Vendedores can delete their pending orders"
ON public.pedidos
FOR DELETE
USING (
  has_role(auth.uid(), 'vendedor'::app_role)
  AND status IN ('por_autorizar', 'pendiente')
  AND EXISTS (
    SELECT 1 FROM clientes
    WHERE clientes.id = pedidos.cliente_id
    AND clientes.vendedor_asignado = auth.uid()
  )
);

-- Allow vendedores to delete solicitudes_descuento for their orders
CREATE POLICY "Vendedores can delete their discount requests"
ON public.solicitudes_descuento
FOR DELETE
USING (
  vendedor_id = auth.uid()
  OR has_any_role(ARRAY['admin'::app_role, 'secretaria'::app_role])
);