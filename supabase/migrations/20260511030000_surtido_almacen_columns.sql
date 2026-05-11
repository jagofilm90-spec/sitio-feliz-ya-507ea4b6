-- ============================================
-- SURTIDO ALMACÉN — Columnas para flujo tablet
-- APLICAR MANUALMENTE en Lovable SQL Editor
-- ============================================

-- Pedidos: estado de surtido
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS estado_surtido text DEFAULT 'pendiente';
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS surtido_inicio_at timestamptz;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS surtido_fin_at timestamptz;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS surtido_por uuid;

CREATE INDEX IF NOT EXISTS idx_pedidos_estado_surtido ON pedidos(estado_surtido);

-- Pedidos detalles: marca por línea
ALTER TABLE pedidos_detalles ADD COLUMN IF NOT EXISTS estado_surtido text DEFAULT 'pendiente';
ALTER TABLE pedidos_detalles ADD COLUMN IF NOT EXISTS cantidad_surtida_real numeric(15,4);
ALTER TABLE pedidos_detalles ADD COLUMN IF NOT EXISTS producto_sustituto_id uuid;
ALTER TABLE pedidos_detalles ADD COLUMN IF NOT EXISTS surtido_at timestamptz;
ALTER TABLE pedidos_detalles ADD COLUMN IF NOT EXISTS surtido_por uuid;
ALTER TABLE pedidos_detalles ADD COLUMN IF NOT EXISTS foto_evidencia_url text;
ALTER TABLE pedidos_detalles ADD COLUMN IF NOT EXISTS notas_surtido text;

CREATE INDEX IF NOT EXISTS idx_pedidos_detalles_surtido ON pedidos_detalles(estado_surtido);
