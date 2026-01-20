-- Add policy for internal roles to view all profiles (needed for "Recibido por" in receipts)
CREATE POLICY "Internal roles can view all profiles"
ON public.profiles
FOR SELECT
USING (
  has_any_role(ARRAY['admin'::app_role, 'secretaria'::app_role, 'almacen'::app_role, 'chofer'::app_role, 'vendedor'::app_role, 'contadora'::app_role])
);