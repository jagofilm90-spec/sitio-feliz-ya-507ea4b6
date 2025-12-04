-- Función para verificar si un chofer tiene acceso a un cliente (rompe recursión)
CREATE OR REPLACE FUNCTION public.check_chofer_client_access(p_cliente_id uuid, p_chofer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM pedidos p
    JOIN entregas e ON e.pedido_id = p.id
    JOIN rutas r ON r.id = e.ruta_id
    WHERE p.cliente_id = p_cliente_id AND r.chofer_id = p_chofer_id
  );
$$;

-- Función para verificar si un cliente tiene acceso a un pedido (rompe recursión)
CREATE OR REPLACE FUNCTION public.check_client_order_access(p_pedido_cliente_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM clientes
    WHERE id = p_pedido_cliente_id AND user_id = p_user_id
  );
$$;

-- Arreglar política de clientes para choferes
DROP POLICY IF EXISTS "Choferes ven clientes de sus rutas" ON public.clientes;
CREATE POLICY "Choferes ven clientes de sus rutas" 
ON public.clientes
FOR SELECT
USING (
  has_role(auth.uid(), 'chofer'::app_role) 
  AND check_chofer_client_access(id, auth.uid())
);

-- Arreglar política de pedidos para clientes
DROP POLICY IF EXISTS "Clientes can view their own orders" ON public.pedidos;
CREATE POLICY "Clientes can view their own orders" 
ON public.pedidos
FOR SELECT
USING (
  check_client_order_access(cliente_id, auth.uid())
);