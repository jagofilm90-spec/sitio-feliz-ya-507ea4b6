-- Crear bucket para PDFs de checkups vehiculares
INSERT INTO storage.buckets (id, name, public)
VALUES ('checkups-reportes-pdf', 'checkups-reportes-pdf', false)
ON CONFLICT (id) DO NOTHING;

-- Política para subir PDFs (usuarios autenticados)
CREATE POLICY "Usuarios autenticados pueden subir PDFs de checkups"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'checkups-reportes-pdf');

-- Política para leer PDFs (usuarios autenticados)
CREATE POLICY "Usuarios autenticados pueden leer PDFs de checkups"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'checkups-reportes-pdf');

-- Política para eliminar PDFs (usuarios autenticados)
CREATE POLICY "Usuarios autenticados pueden eliminar PDFs de checkups"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'checkups-reportes-pdf');

-- Agregar columna para guardar referencia al PDF en checkups
ALTER TABLE vehiculos_checkups
ADD COLUMN IF NOT EXISTS pdf_path TEXT;