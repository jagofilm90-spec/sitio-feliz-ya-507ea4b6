-- Tabla para guardar resúmenes diarios
CREATE TABLE IF NOT EXISTS resumenes_diarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL UNIQUE,
  datos JSONB NOT NULL,
  enviado_en TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE resumenes_diarios ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Admins pueden ver resumenes" ON resumenes_diarios;
DROP POLICY IF EXISTS "Service role full access resumenes" ON resumenes_diarios;

CREATE POLICY "Admins pueden ver resumenes"
ON resumenes_diarios FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role full access resumenes"
ON resumenes_diarios FOR ALL
TO service_role
USING (true)
WITH CHECK (true);