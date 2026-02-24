-- Permitir que vendedores eliminen también sus pedidos en borrador
DROP POLICY IF EXISTS "Vendedores can delete their pending orders" ON public.pedidos;

CREATE POLICY "Vendedores can delete their pending orders"
ON public.pedidos
FOR DELETE
USING (
  has_role(auth.uid(), 'vendedor'::app_role)
  AND status = ANY (ARRAY['borrador'::order_status, 'por_autorizar'::order_status, 'pendiente'::order_status])
  AND EXISTS (
    SELECT 1
    FROM public.clientes
    WHERE clientes.id = pedidos.cliente_id
      AND clientes.vendedor_asignado = auth.uid()
  )
);