
-- Fix: Add gerente_almacen to SELECT policy for recepciones-evidencias
DROP POLICY IF EXISTS "Internal roles can view recepciones evidencias" ON storage.objects;
CREATE POLICY "Internal roles can view recepciones evidencias"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'recepciones-evidencias'
  AND has_any_role(ARRAY['admin'::app_role, 'secretaria'::app_role, 'almacen'::app_role, 'contadora'::app_role, 'gerente_almacen'::app_role])
);

-- Also add UPDATE policy for upsert to work
CREATE POLICY "Almacen puede actualizar evidencias recepciones"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'recepciones-evidencias'
  AND has_any_role(ARRAY['admin'::app_role, 'almacen'::app_role, 'gerente_almacen'::app_role])
);
