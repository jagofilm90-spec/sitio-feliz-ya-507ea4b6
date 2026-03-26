-- Allow vendedores to update their own orders when status is pendiente, por_autorizar, or rechazado
CREATE POLICY "Vendedores can update their pending orders"
ON public.pedidos
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'vendedor'::app_role)
  AND status IN ('pendiente'::order_status, 'por_autorizar'::order_status, 'rechazado'::order_status, 'borrador'::order_status)
  AND EXISTS (
    SELECT 1 FROM clientes
    WHERE clientes.id = pedidos.cliente_id
    AND clientes.vendedor_asignado = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'vendedor'::app_role)
  AND EXISTS (
    SELECT 1 FROM clientes
    WHERE clientes.id = pedidos.cliente_id
    AND clientes.vendedor_asignado = auth.uid()
  )
);