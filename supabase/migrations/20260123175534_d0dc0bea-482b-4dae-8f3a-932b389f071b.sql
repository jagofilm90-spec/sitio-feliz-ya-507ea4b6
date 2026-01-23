
-- 1. Agregar campo firma_chofer_sin_sellos a ordenes_compra_entregas
ALTER TABLE ordenes_compra_entregas 
ADD COLUMN IF NOT EXISTS firma_chofer_sin_sellos TEXT;

-- 2. Agregar campo sin_sellos boolean
ALTER TABLE ordenes_compra_entregas 
ADD COLUMN IF NOT EXISTS sin_sellos BOOLEAN DEFAULT FALSE;

-- 3. Crear función para sincronizar stock desde lotes
CREATE OR REPLACE FUNCTION public.sync_stock_from_lotes()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar stock_actual del producto basado en la suma de lotes disponibles
  UPDATE productos 
  SET stock_actual = (
    SELECT COALESCE(SUM(cantidad_disponible), 0)
    FROM inventario_lotes 
    WHERE producto_id = COALESCE(NEW.producto_id, OLD.producto_id)
      AND cantidad_disponible > 0
  )
  WHERE id = COALESCE(NEW.producto_id, OLD.producto_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Crear trigger para INSERT en inventario_lotes
DROP TRIGGER IF EXISTS trg_sync_stock_on_lote_insert ON inventario_lotes;
CREATE TRIGGER trg_sync_stock_on_lote_insert
AFTER INSERT ON inventario_lotes
FOR EACH ROW
EXECUTE FUNCTION sync_stock_from_lotes();

-- 5. Crear trigger para UPDATE en inventario_lotes (cuando cambia cantidad)
DROP TRIGGER IF EXISTS trg_sync_stock_on_lote_update ON inventario_lotes;
CREATE TRIGGER trg_sync_stock_on_lote_update
AFTER UPDATE OF cantidad_disponible ON inventario_lotes
FOR EACH ROW
EXECUTE FUNCTION sync_stock_from_lotes();

-- 6. Crear trigger para DELETE en inventario_lotes
DROP TRIGGER IF EXISTS trg_sync_stock_on_lote_delete ON inventario_lotes;
CREATE TRIGGER trg_sync_stock_on_lote_delete
AFTER DELETE ON inventario_lotes
FOR EACH ROW
EXECUTE FUNCTION sync_stock_from_lotes();
