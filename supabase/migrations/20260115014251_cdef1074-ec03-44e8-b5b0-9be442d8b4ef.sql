-- Drop the existing policy that only allows admin and almacen
DROP POLICY IF EXISTS "Admins and almacen can manage products" ON public.productos;

-- Create new policy that includes secretaria role
CREATE POLICY "Admins, almacen and secretaria can manage products" 
ON public.productos 
FOR ALL 
USING (
  public.has_any_role(ARRAY['admin'::app_role, 'almacen'::app_role, 'secretaria'::app_role])
)
WITH CHECK (
  public.has_any_role(ARRAY['admin'::app_role, 'almacen'::app_role, 'secretaria'::app_role])
);