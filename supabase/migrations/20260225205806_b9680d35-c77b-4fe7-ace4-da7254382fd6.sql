-- Allow authenticated users with almacen/gerente_almacen roles to upload to cargas-evidencias
CREATE POLICY "almacen_upload_cargas_evidencias"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cargas-evidencias'
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('almacen', 'gerente_almacen', 'admin')
  )
);

-- Allow authenticated users to read from cargas-evidencias
CREATE POLICY "authenticated_read_cargas_evidencias"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'cargas-evidencias');

-- Allow update (overwrite) for almacen roles
CREATE POLICY "almacen_update_cargas_evidencias"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'cargas-evidencias'
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('almacen', 'gerente_almacen', 'admin')
  )
);