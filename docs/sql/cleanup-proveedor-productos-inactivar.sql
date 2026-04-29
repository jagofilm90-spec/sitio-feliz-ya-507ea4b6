-- ═══════════════════════════════════════════════════════════
-- TRIGGER: Limpiar asociaciones proveedor-producto al inactivar
-- Fecha: 29 abril 2026
-- Regla: "Producto inactivo = no se vende → no se compra → no se asocia"
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Función que elimina registros de proveedor_productos
-- cuando un producto pasa de activo=true a activo=false
CREATE OR REPLACE FUNCTION cleanup_proveedor_productos_on_inactivar()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.activo = false AND OLD.activo = true THEN
    DELETE FROM proveedor_productos WHERE producto_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger BEFORE UPDATE en productos
DROP TRIGGER IF EXISTS trigger_cleanup_proveedor_productos ON productos;
CREATE TRIGGER trigger_cleanup_proveedor_productos
  BEFORE UPDATE ON productos
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_proveedor_productos_on_inactivar();

-- ═══════════════════════════════════════════════════════════
-- VERIFICACIÓN (ejecutar después del trigger):
--
-- 1. SELECT * FROM proveedor_productos; -- ver estado actual
-- 2. UPDATE productos SET activo = false WHERE codigo = 'TEST';
-- 3. SELECT * FROM proveedor_productos; -- debe haber 1 menos
-- 4. UPDATE productos SET activo = true WHERE codigo = 'TEST';
-- 5. SELECT * FROM proveedor_productos; -- NO reaparece
-- ═══════════════════════════════════════════════════════════
