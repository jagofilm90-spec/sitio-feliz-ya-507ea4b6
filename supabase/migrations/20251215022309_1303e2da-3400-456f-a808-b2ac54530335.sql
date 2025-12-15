-- Agregar campo para vincular carga_productos con su movimiento de inventario
ALTER TABLE carga_productos 
ADD COLUMN IF NOT EXISTS movimiento_inventario_id UUID REFERENCES inventario_movimientos(id);

-- Función para decrementar lote de forma atómica
CREATE OR REPLACE FUNCTION decrementar_lote(p_lote_id UUID, p_cantidad NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE inventario_lotes 
  SET cantidad_disponible = cantidad_disponible - p_cantidad,
      updated_at = now()
  WHERE id = p_lote_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Función para incrementar lote de forma atómica
CREATE OR REPLACE FUNCTION incrementar_lote(p_lote_id UUID, p_cantidad NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE inventario_lotes 
  SET cantidad_disponible = cantidad_disponible + p_cantidad,
      updated_at = now()
  WHERE id = p_lote_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;