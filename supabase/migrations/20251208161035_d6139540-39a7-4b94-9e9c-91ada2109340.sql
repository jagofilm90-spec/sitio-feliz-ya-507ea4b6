-- Eliminar política problemática que usa ALL sin with_check
DROP POLICY IF EXISTS "Admins y secretarias pueden gestionar documentos vehiculos" ON storage.objects;

-- Crear política de INSERT con with_check (ESTO ES LO QUE FALTABA)
CREATE POLICY "Admins y secretarias pueden subir documentos vehiculos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vehiculos-documentos' 
  AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'secretaria'::public.app_role))
);

-- Crear política de UPDATE
CREATE POLICY "Admins y secretarias pueden actualizar documentos vehiculos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'vehiculos-documentos' 
  AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'secretaria'::public.app_role))
);

-- Crear política de DELETE
CREATE POLICY "Admins y secretarias pueden eliminar documentos vehiculos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'vehiculos-documentos' 
  AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'secretaria'::public.app_role))
);