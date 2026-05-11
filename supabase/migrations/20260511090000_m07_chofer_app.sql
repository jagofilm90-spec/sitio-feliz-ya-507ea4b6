-- ============================================
-- M07 CHOFER APP MÓVIL
-- APLICAR MANUALMENTE en Lovable SQL Editor
-- ============================================

ALTER TABLE hojas_salida ADD COLUMN IF NOT EXISTS chofer_inicio_at timestamptz;
ALTER TABLE hojas_salida ADD COLUMN IF NOT EXISTS chofer_llegada_at timestamptz;
ALTER TABLE hojas_salida ADD COLUMN IF NOT EXISTS firma_chofer_url text;
ALTER TABLE hojas_salida ADD COLUMN IF NOT EXISTS firma_cliente_url text;
ALTER TABLE hojas_salida ADD COLUMN IF NOT EXISTS recibe_nombre text;
ALTER TABLE hojas_salida ADD COLUMN IF NOT EXISTS recibe_cargo text;
ALTER TABLE hojas_salida ADD COLUMN IF NOT EXISTS notas_chofer text;
ALTER TABLE hojas_salida ADD COLUMN IF NOT EXISTS motivo_no_entrega text;
ALTER TABLE hojas_salida ADD COLUMN IF NOT EXISTS gps_inicio_lat numeric(10,7);
ALTER TABLE hojas_salida ADD COLUMN IF NOT EXISTS gps_inicio_lng numeric(10,7);
ALTER TABLE hojas_salida ADD COLUMN IF NOT EXISTS gps_entrega_lat numeric(10,7);
ALTER TABLE hojas_salida ADD COLUMN IF NOT EXISTS gps_entrega_lng numeric(10,7);

CREATE TABLE IF NOT EXISTS chofer_sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chofer_id uuid,
  hoja_salida_id uuid,
  tipo_evento text NOT NULL,
  payload jsonb,
  estado text DEFAULT 'pendiente',
  intentos int DEFAULT 0,
  error_mensaje text,
  evento_timestamp_cliente timestamptz NOT NULL,
  procesado_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_chofer ON chofer_sync_queue(chofer_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_estado ON chofer_sync_queue(estado) WHERE estado = 'pendiente';

ALTER TABLE chofer_sync_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sync_own" ON chofer_sync_queue FOR ALL USING (chofer_id = auth.uid());
CREATE POLICY "sync_admin" ON chofer_sync_queue FOR SELECT
  USING (public.has_any_role(ARRAY['admin'::public.app_role, 'secretaria'::public.app_role]));
