-- Agregar campo para costo promedio ponderado en productos
ALTER TABLE productos ADD COLUMN IF NOT EXISTS costo_promedio_ponderado NUMERIC DEFAULT 0;

-- Función para calcular costo promedio ponderado de un producto
CREATE OR REPLACE FUNCTION calcular_costo_promedio_ponderado(p_producto_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_costo_promedio NUMERIC;
BEGIN
  SELECT COALESCE(
    SUM(precio_compra * cantidad_disponible) / NULLIF(SUM(cantidad_disponible), 0),
    0
  ) INTO v_costo_promedio
  FROM inventario_lotes
  WHERE producto_id = p_producto_id AND cantidad_disponible > 0;
  
  RETURN ROUND(COALESCE(v_costo_promedio, 0), 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para actualizar automáticamente el costo promedio cuando cambian los lotes
CREATE OR REPLACE FUNCTION actualizar_costo_promedio_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_producto_id UUID;
BEGIN
  -- Determinar el producto_id según la operación
  IF TG_OP = 'DELETE' THEN
    v_producto_id := OLD.producto_id;
  ELSE
    v_producto_id := NEW.producto_id;
  END IF;
  
  -- Actualizar el costo promedio del producto
  UPDATE productos 
  SET costo_promedio_ponderado = calcular_costo_promedio_ponderado(v_producto_id)
  WHERE id = v_producto_id;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Crear el trigger
DROP TRIGGER IF EXISTS trg_actualizar_costo_promedio ON inventario_lotes;
CREATE TRIGGER trg_actualizar_costo_promedio
AFTER INSERT OR UPDATE OR DELETE ON inventario_lotes
FOR EACH ROW
EXECUTE FUNCTION actualizar_costo_promedio_trigger();

-- Calcular costo promedio inicial para todos los productos con lotes existentes
UPDATE productos p
SET costo_promedio_ponderado = (
  SELECT COALESCE(
    SUM(l.precio_compra * l.cantidad_disponible) / NULLIF(SUM(l.cantidad_disponible), 0),
    0
  )
  FROM inventario_lotes l
  WHERE l.producto_id = p.id AND l.cantidad_disponible > 0
)
WHERE EXISTS (
  SELECT 1 FROM inventario_lotes l 
  WHERE l.producto_id = p.id AND l.cantidad_disponible > 0
);