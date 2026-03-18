INSERT INTO storage.buckets (id, name, public)
VALUES ('comprobantes-pagos', 'comprobantes-pagos', false);

CREATE POLICY "Authenticated users can upload comprobantes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'comprobantes-pagos');

CREATE POLICY "Authenticated users can read comprobantes"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'comprobantes-pagos');