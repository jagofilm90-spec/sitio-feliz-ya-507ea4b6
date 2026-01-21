-- Limpiar datos de prueba de OC José Antonio Gómez (OC-202601-0001)
-- 1. Eliminar el lote de inventario creado por esta recepción
DELETE FROM inventario_lotes 
WHERE orden_compra_id = '0b208bee-1a9f-477b-b514-132e0cb4a496';

-- 2. Revertir el stock del producto (Fécula de Maíz)
UPDATE productos 
SET stock_actual = GREATEST(0, stock_actual - 600)
WHERE id = 'a328d7de-5be5-4a83-ac25-27c2c1dc680b';

-- 3. Eliminar notificaciones asociadas
DELETE FROM notificaciones 
WHERE orden_compra_id = '0b208bee-1a9f-477b-b514-132e0cb4a496';

-- 4. Eliminar entregas asociadas
DELETE FROM ordenes_compra_entregas 
WHERE orden_compra_id = '0b208bee-1a9f-477b-b514-132e0cb4a496';

-- 5. Eliminar detalles de la orden
DELETE FROM ordenes_compra_detalles 
WHERE orden_compra_id = '0b208bee-1a9f-477b-b514-132e0cb4a496';

-- 6. Finalmente eliminar la orden
DELETE FROM ordenes_compra 
WHERE id = '0b208bee-1a9f-477b-b514-132e0cb4a496';