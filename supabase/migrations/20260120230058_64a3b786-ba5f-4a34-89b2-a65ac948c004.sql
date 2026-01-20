-- Drop and recreate the SELECT policy for recepciones-evidencias to ensure it works for all internal roles
DROP POLICY IF EXISTS "Admins y almacen pueden ver evidencias" ON storage.objects;

-- Create a more permissive policy for internal roles to view reception evidences
CREATE POLICY "Internal roles can view recepciones evidencias"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'recepciones-evidencias' 
  AND has_any_role(ARRAY['admin'::app_role, 'secretaria'::app_role, 'almacen'::app_role, 'contadora'::app_role])
);

-- Also add policy for devoluciones-evidencias SELECT (missing)
CREATE POLICY "Internal roles can view devoluciones evidencias"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'devoluciones-evidencias' 
  AND has_any_role(ARRAY['admin'::app_role, 'secretaria'::app_role, 'almacen'::app_role, 'contadora'::app_role])
);

-- Ensure profiles can be read by internal roles for "Recibido por" field
DROP POLICY IF EXISTS "Internal roles can view all profiles" ON public.profiles;

CREATE POLICY "Internal roles can view all profiles"
ON public.profiles FOR SELECT
USING (
  has_any_role(ARRAY['admin'::app_role, 'secretaria'::app_role, 'almacen'::app_role, 'chofer'::app_role, 'vendedor'::app_role, 'contadora'::app_role])
);

-- Also ensure ordenes_compra_entregas_evidencias can be read
DROP POLICY IF EXISTS "Internal roles can view entregas evidencias" ON public.ordenes_compra_entregas_evidencias;

CREATE POLICY "Internal roles can view entregas evidencias"
ON public.ordenes_compra_entregas_evidencias FOR SELECT
USING (
  has_any_role(ARRAY['admin'::app_role, 'secretaria'::app_role, 'almacen'::app_role, 'contadora'::app_role])
);