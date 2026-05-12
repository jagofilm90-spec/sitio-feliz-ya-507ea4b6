-- ═══════════════════════════════════════════════════════════
-- OC WIZARD V3 — MIGRACIÓN DE SCHEMA
-- Fecha: 29 abril 2026
-- Solo cambios INCREMENTALES sobre schema existente
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ═══ AUDITORÍA PREVIA ═══
-- ordenes_compra: 37 cols existentes (tipo_pago, entregas_multiples, etc.)
-- ordenes_compra_detalles: 13 cols (cantidad_recibida, razon_diferencia)
-- ordenes_compra_entregas: 48 cols (firmas, sellos, evidencias, cancelación)
-- proveedor_productos: 16 cols (transporte, costo, precio_por_kilo)
-- STATUS CHECK: 12 valores (pendiente..cancelada) — falta 'borrador' y 'cerrada'

-- ═══════════════════════════════════════════════════════════
-- 1. ordenes_compra: agregar columnas v3
-- ═══════════════════════════════════════════════════════════

-- Plazo de pago en días (se autocompleta del proveedor, decisión #1)
ALTER TABLE ordenes_compra
  ADD COLUMN IF NOT EXISTS plazo_pago_dias INTEGER DEFAULT 0;

-- Método de pago anticipado (decisión #2)
ALTER TABLE ordenes_compra
  ADD COLUMN IF NOT EXISTS metodo_pago_anticipado TEXT;

-- Notas internas (separadas de notas al proveedor)
ALTER TABLE ordenes_compra
  ADD COLUMN IF NOT EXISTS notas_internas TEXT;

-- Fecha de pago calculada (decisión #16: plazo arranca al recibir)
ALTER TABLE ordenes_compra
  ADD COLUMN IF NOT EXISTS fecha_pago_calculada DATE;

-- Actualizar CHECK constraint: agregar 'borrador' y 'cerrada'
ALTER TABLE ordenes_compra DROP CONSTRAINT IF EXISTS ordenes_compra_status_check;
ALTER TABLE ordenes_compra ADD CONSTRAINT ordenes_compra_status_check
CHECK (status = ANY (ARRAY[
  'borrador',
  'pendiente', 'pendiente_autorizacion', 'pendiente_pago',
  'autorizada', 'enviada', 'confirmada', 'parcial',
  'recibida', 'completada', 'cerrada',
  'rechazada', 'devuelta', 'cancelada'
]));

-- ═══════════════════════════════════════════════════════════
-- 2. ordenes_compra_detalles: agregar cantidad_faltante
-- ═══════════════════════════════════════════════════════════

-- Faltante numérico (decisión #17: recepción parcial)
ALTER TABLE ordenes_compra_detalles
  ADD COLUMN IF NOT EXISTS cantidad_faltante NUMERIC DEFAULT 0;

-- Tipo de carga usado al crear (decisión #7: fija vs libre)
ALTER TABLE ordenes_compra_detalles
  ADD COLUMN IF NOT EXISTS tipo_carga TEXT DEFAULT 'libre';

-- Unidades de carga (ej: 3 tráilers) — solo si tipo_carga = 'fija'
ALTER TABLE ordenes_compra_detalles
  ADD COLUMN IF NOT EXISTS unidades_carga INTEGER;

-- Peso real en recepción (productos por kilo: pago = peso_real × $/kg)
ALTER TABLE ordenes_compra_detalles
  ADD COLUMN IF NOT EXISTS peso_pedido_estimado NUMERIC,
  ADD COLUMN IF NOT EXISTS peso_recibido_real NUMERIC,
  ADD COLUMN IF NOT EXISTS peso_faltante NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS costo_real_recibido NUMERIC;

-- ═══════════════════════════════════════════════════════════
-- 3. inventario_lotes: peso real por lote
-- ═══════════════════════════════════════════════════════════

ALTER TABLE inventario_lotes
  ADD COLUMN IF NOT EXISTS peso_total_real NUMERIC,
  ADD COLUMN IF NOT EXISTS peso_promedio_bulto NUMERIC;

-- ═══════════════════════════════════════════════════════════
-- 4. proveedor_productos: config carga fija (decisión #7)
-- ═══════════════════════════════════════════════════════════

-- Tipo de carga default para este producto-proveedor
-- 'libre' = usuario define cantidad manual
-- 'fija' = capacidad estándar del vehículo (ya existe capacidad_vehiculo_bultos)
ALTER TABLE proveedor_productos
  ADD COLUMN IF NOT EXISTS tipo_carga_default TEXT DEFAULT 'libre'
  CHECK (tipo_carga_default IN ('libre', 'fija'));

-- ═══════════════════════════════════════════════════════════
-- 4. NUEVA TABLA: faltantes_proveedor (decisión #17)
-- Historial de faltantes por proveedor — para evaluar confiabilidad
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS faltantes_proveedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id UUID NOT NULL REFERENCES proveedores(id),
  orden_compra_id UUID NOT NULL REFERENCES ordenes_compra(id),
  producto_id UUID NOT NULL REFERENCES productos(id),
  tipo_faltante TEXT DEFAULT 'cantidad' CHECK (tipo_faltante IN ('cantidad', 'peso', 'ambos')),
  cantidad_pedida NUMERIC NOT NULL,
  cantidad_recibida NUMERIC NOT NULL,
  cantidad_faltante NUMERIC NOT NULL,
  peso_pedido NUMERIC,
  peso_recibido NUMERIC,
  peso_faltante NUMERIC,
  fecha_recepcion DATE NOT NULL,
  status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'reclamado', 'compensado', 'cancelado')),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id)
);

-- RLS
ALTER TABLE faltantes_proveedor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "faltantes_select" ON faltantes_proveedor
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "faltantes_insert" ON faltantes_proveedor
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'secretaria', 'almacen', 'gerente_almacen'))
  );

CREATE POLICY "faltantes_update" ON faltantes_proveedor
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'secretaria'))
  );

-- Índices
CREATE INDEX IF NOT EXISTS idx_faltantes_proveedor_id ON faltantes_proveedor(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_faltantes_oc_id ON faltantes_proveedor(orden_compra_id);
CREATE INDEX IF NOT EXISTS idx_faltantes_status ON faltantes_proveedor(status);

-- ═══════════════════════════════════════════════════════════
-- 5. VERIFICACIÓN (ejecutar después de todo lo anterior)
-- ═══════════════════════════════════════════════════════════

-- Verificar columnas nuevas en ordenes_compra
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'ordenes_compra'
  AND column_name IN ('plazo_pago_dias', 'metodo_pago_anticipado', 'notas_internas', 'fecha_pago_calculada')
ORDER BY column_name;

-- Verificar columnas nuevas en ordenes_compra_detalles
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ordenes_compra_detalles'
  AND column_name IN ('cantidad_faltante', 'tipo_carga', 'unidades_carga', 'peso_pedido_estimado', 'peso_recibido_real', 'peso_faltante', 'costo_real_recibido')
ORDER BY column_name;

-- Verificar tabla faltantes
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'faltantes_proveedor'
ORDER BY ordinal_position;

-- Verificar constraint actualizado
SELECT pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'ordenes_compra_status_check';
