-- ═══════════════════════════════════════════════════════════
-- PROVEEDORES V3 — MIGRACIÓN DE SCHEMA
-- Fecha: 29 abril 2026
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ═══ AUDITORÍA PREVIA ═══
-- proveedores: 31 cols (nombre, RFC, banco, CLABE, categoría, término,
--   días_visita, frecuencia, métodos_pago, contacto legacy, notas)
-- Campos legacy: nombre_contacto, email, telefono (se llenan de contacto principal)
--   direccion (legacy, reemplazado por campos estructurados)
-- notas_operativas: NO EXISTE — se agrega
-- eventos_proveedor: NO EXISTE — se crea

-- ═══════════════════════════════════════════════════════════
-- 1. proveedores: campo notas operativas
-- ═══════════════════════════════════════════════════════════

-- Campo libre para "biografía" operativa del proveedor
-- Ej: "Don Roberto, 20 años. Llamar antes 10am. NUNCA pedir lunes..."
ALTER TABLE proveedores
  ADD COLUMN IF NOT EXISTS notas_operativas TEXT;

-- ═══════════════════════════════════════════════════════════
-- 2. NUEVA TABLA: eventos_proveedor
-- Timeline auto-generado + notas manuales
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS eventos_proveedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id UUID NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
  tipo_evento TEXT NOT NULL CHECK (tipo_evento IN (
    'auto_faltante',
    'auto_precio_subio',
    'auto_precio_bajo',
    'auto_lead_time_mejoro',
    'auto_lead_time_empeoro',
    'manual_aviso',
    'manual_cambio_contacto',
    'manual_cambio_precio',
    'manual_observacion'
  )),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  metadata JSONB,
  created_by UUID REFERENCES auth.users(id),
  origen TEXT DEFAULT 'manual' CHECK (origen IN ('auto', 'manual')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_eventos_proveedor_id ON eventos_proveedor(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_eventos_proveedor_fecha ON eventos_proveedor(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eventos_origen ON eventos_proveedor(origen);

-- RLS
ALTER TABLE eventos_proveedor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eventos_select" ON eventos_proveedor
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "eventos_insert" ON eventos_proveedor
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'secretaria', 'almacen', 'gerente_almacen'))
  );

CREATE POLICY "eventos_update" ON eventos_proveedor
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'secretaria'))
  );

-- ═══════════════════════════════════════════════════════════
-- 3. VERIFICACIÓN
-- ═══════════════════════════════════════════════════════════

SELECT column_name FROM information_schema.columns
WHERE table_name = 'proveedores' AND column_name = 'notas_operativas';

SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'eventos_proveedor' ORDER BY ordinal_position;
