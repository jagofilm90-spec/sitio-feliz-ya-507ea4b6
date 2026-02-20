
-- Agregar policies de INSERT y SELECT en el bucket clientes-csf para vendedores
CREATE POLICY "Vendedores pueden subir CSF de sus clientes"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'clientes-csf'
  AND public.has_role(auth.uid(), 'vendedor'::public.app_role)
);

CREATE POLICY "Vendedores pueden ver CSF de sus clientes"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'clientes-csf'
  AND public.has_role(auth.uid(), 'vendedor'::public.app_role)
);
