-- Tabla para guardar resúmenes diarios
CREATE TABLE IF NOT EXISTS resumenes_diarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL UNIQUE,
  datos JSONB NOT NULL,
  enviado_en TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE resumenes_diarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins pueden ver resumenes"
ON resumenes_diarios FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role puede insertar resumenes"
ON resumenes_diarios FOR ALL
USING (true);

-- Cron job: resumen diario a las 20:00 hora México (02:00 UTC siguiente)
SELECT cron.schedule(
  'resumen-diario-8pm',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/resumen-diario',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
