-- ==============================================
-- FASE 1: Corregir RLS para que vendedores solo vean sus propios datos
-- ==============================================

-- Eliminar políticas permisivas en pedidos
DROP POLICY IF EXISTS "All authenticated users can view orders" ON public.pedidos;

-- Crear políticas restrictivas para pedidos
CREATE POLICY "Admin y secretaria ven todos los pedidos"
ON public.pedidos FOR SELECT
USING (
  public.has_any_role(ARRAY['admin'::app_role, 'secretaria'::app_role, 'contadora'::app_role, 'almacen'::app_role, 'chofer'::app_role])
);

CREATE POLICY "Vendedores ven pedidos de sus clientes"
ON public.pedidos FOR SELECT
USING (
  public.has_role(auth.uid(), 'vendedor'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.clientes 
    WHERE clientes.id = pedidos.cliente_id 
    AND clientes.vendedor_asignado = auth.uid()
  )
);

CREATE POLICY "Clientes ven sus propios pedidos"
ON public.pedidos FOR SELECT
USING (
  public.has_role(auth.uid(), 'cliente'::app_role)
  AND public.check_client_order_access(cliente_id, auth.uid())
);

-- Eliminar políticas permisivas en facturas
DROP POLICY IF EXISTS "All authenticated users can view invoices" ON public.facturas;

-- Crear políticas restrictivas para facturas
CREATE POLICY "Admin y secretaria ven todas las facturas"
ON public.facturas FOR SELECT
USING (
  public.has_any_role(ARRAY['admin'::app_role, 'secretaria'::app_role, 'contadora'::app_role])
);

CREATE POLICY "Vendedores ven facturas de sus clientes"
ON public.facturas FOR SELECT
USING (
  public.has_role(auth.uid(), 'vendedor'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.clientes 
    WHERE clientes.id = facturas.cliente_id 
    AND clientes.vendedor_asignado = auth.uid()
  )
);

CREATE POLICY "Clientes ven sus propias facturas"
ON public.facturas FOR SELECT
USING (
  public.has_role(auth.uid(), 'cliente'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.clientes
    WHERE clientes.id = facturas.cliente_id
    AND clientes.user_id = auth.uid()
  )
);