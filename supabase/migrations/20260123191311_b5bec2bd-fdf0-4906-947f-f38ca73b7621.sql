-- 1. Campo para identificar entregas que vienen de faltantes
ALTER TABLE ordenes_compra_entregas 
ADD COLUMN IF NOT EXISTS origen_faltante boolean DEFAULT false;

-- 2. Campo para registrar productos faltantes con detalle
ALTER TABLE ordenes_compra_entregas 
ADD COLUMN IF NOT EXISTS productos_faltantes jsonb DEFAULT NULL;

-- 3. Campo para registrar cancelaciones de productos faltantes
ALTER TABLE ordenes_compra_detalles 
ADD COLUMN IF NOT EXISTS cantidad_cancelada integer DEFAULT 0;

-- 4. Corregir la orden OC-202601-0002 a status "parcial"
UPDATE ordenes_compra 
SET status = 'parcial'
WHERE folio = 'OC-202601-0002';

-- 5. Crear entrega programada para el faltante de Papel Blanco Revolución
INSERT INTO ordenes_compra_entregas (
  orden_compra_id,
  numero_entrega,
  fecha_programada,
  status,
  cantidad_bultos,
  notas,
  origen_faltante,
  productos_faltantes
) 
SELECT 
  id,
  2,
  '2026-01-26'::date,
  'programada',
  40,
  '[FALTANTE] De entrega #1: 40 Papel Blanco Revolución',
  true,
  '[{"producto_id": null, "nombre": "Papel Blanco Revolución", "cantidad_faltante": 40}]'::jsonb
FROM ordenes_compra 
WHERE folio = 'OC-202601-0002'
AND NOT EXISTS (
  SELECT 1 FROM ordenes_compra_entregas oce 
  WHERE oce.orden_compra_id = ordenes_compra.id 
  AND oce.numero_entrega = 2
);