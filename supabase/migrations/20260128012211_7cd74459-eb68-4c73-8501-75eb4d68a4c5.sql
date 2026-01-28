-- =====================================================
-- MIGRACIÓN: Separación de Costos OC/Recepción/Conciliación
-- =====================================================

-- 1. Agregar columnas de conciliación a ordenes_compra_entregas
ALTER TABLE public.ordenes_compra_entregas 
ADD COLUMN IF NOT EXISTS status_conciliacion TEXT DEFAULT 'pendiente' CHECK (status_conciliacion IN ('pendiente', 'por_conciliar', 'conciliada')),
ADD COLUMN IF NOT EXISTS conciliado_por UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS conciliado_en TIMESTAMPTZ;

COMMENT ON COLUMN public.ordenes_compra_entregas.status_conciliacion IS 'Estado de conciliación de costos: pendiente (sin recibir), por_conciliar (recibido sin verificar), conciliada (costo confirmado)';

-- 2. Agregar columnas a inventario_lotes
ALTER TABLE public.inventario_lotes
ADD COLUMN IF NOT EXISTS precio_compra_provisional NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS conciliado BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.inventario_lotes.precio_compra_provisional IS 'Costo de la OC usado al momento de recepción (provisional hasta conciliar)';
COMMENT ON COLUMN public.inventario_lotes.conciliado IS 'Indica si el costo del lote ya fue verificado/conciliado con factura';

-- 3. Agregar columna de conciliación a ordenes_compra
ALTER TABLE public.ordenes_compra
ADD COLUMN IF NOT EXISTS status_conciliacion TEXT DEFAULT 'pendiente' CHECK (status_conciliacion IN ('pendiente', 'parcial', 'conciliada'));

COMMENT ON COLUMN public.ordenes_compra.status_conciliacion IS 'Estado global de conciliación de la OC: pendiente, parcial, conciliada';

-- 4. Migrar datos existentes: marcar lotes existentes como conciliados
UPDATE public.inventario_lotes
SET conciliado = true,
    precio_compra_provisional = precio_compra
WHERE precio_compra > 0 
  AND conciliado IS NOT true;

-- 5. Migrar entregas recibidas como conciliadas
UPDATE public.ordenes_compra_entregas
SET status_conciliacion = 'conciliada'
WHERE status = 'recibida'
  AND status_conciliacion IS NULL OR status_conciliacion = 'pendiente';

-- 6. Actualizar OCs completamente recibidas como conciliadas
UPDATE public.ordenes_compra oc
SET status_conciliacion = 'conciliada'
WHERE status IN ('parcial', 'completa', 'pagado')
  AND status_conciliacion IS NULL OR status_conciliacion = 'pendiente';

-- 7. Crear índice para consultas de OCs pendientes de conciliar
CREATE INDEX IF NOT EXISTS idx_oc_entregas_status_conciliacion 
ON public.ordenes_compra_entregas(status_conciliacion) 
WHERE status_conciliacion = 'por_conciliar';

CREATE INDEX IF NOT EXISTS idx_inventario_lotes_conciliado 
ON public.inventario_lotes(conciliado) 
WHERE conciliado = false;

CREATE INDEX IF NOT EXISTS idx_oc_status_conciliacion 
ON public.ordenes_compra(status_conciliacion) 
WHERE status_conciliacion IN ('pendiente', 'parcial');