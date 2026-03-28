ALTER TABLE empleados ADD COLUMN IF NOT EXISTS contrato_firmado_url text;
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS aviso_firmado_url text;
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS contrato_firmado_fecha timestamptz;

-- Create storage bucket for employee documents if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos-empleados', 'documentos-empleados', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload and read from this bucket
CREATE POLICY IF NOT EXISTS "Authenticated users can upload employee docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documentos-empleados');

CREATE POLICY IF NOT EXISTS "Authenticated users can read employee docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documentos-empleados');
