-- Agregar columna foto_url a empleados
ALTER TABLE empleados 
ADD COLUMN IF NOT EXISTS foto_url TEXT;

COMMENT ON COLUMN empleados.foto_url IS 'URL de la foto de perfil del empleado';

-- Crear bucket para fotos de perfil de empleados
INSERT INTO storage.buckets (id, name, public)
VALUES ('empleados-fotos', 'empleados-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para el bucket de fotos
CREATE POLICY "Todos pueden ver fotos de empleados"
ON storage.objects FOR SELECT
USING (bucket_id = 'empleados-fotos');

CREATE POLICY "Usuarios autenticados pueden subir fotos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'empleados-fotos' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Usuarios autenticados pueden actualizar fotos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'empleados-fotos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden eliminar fotos"
ON storage.objects FOR DELETE
USING (bucket_id = 'empleados-fotos' AND auth.uid() IS NOT NULL);