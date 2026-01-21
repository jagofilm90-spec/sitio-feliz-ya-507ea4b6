-- Agregar campos para sistema de promociones dinámicas
ALTER TABLE public.productos 
ADD COLUMN IF NOT EXISTS puede_tener_promocion BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS producto_base_id UUID REFERENCES public.productos(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS es_promocion BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS descripcion_promocion TEXT,
ADD COLUMN IF NOT EXISTS bloqueado_venta BOOLEAN DEFAULT false;

-- Índices para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_productos_producto_base ON public.productos(producto_base_id) WHERE producto_base_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_productos_promocion ON public.productos(es_promocion) WHERE es_promocion = true;
CREATE INDEX IF NOT EXISTS idx_productos_puede_promocion ON public.productos(puede_tener_promocion) WHERE puede_tener_promocion = true;

-- Función para desactivar automáticamente productos promocionales cuando stock llega a 0
CREATE OR REPLACE FUNCTION public.auto_desactivar_promocion_sin_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el stock nuevo es 0 y es un producto promocional activo
  IF NEW.stock_actual <= 0 AND NEW.es_promocion = true AND NEW.activo = true THEN
    NEW.activo := false;
    
    -- Crear notificación
    INSERT INTO public.notificaciones (tipo, titulo, descripcion, leida)
    VALUES (
      'promocion_agotada',
      'Promoción agotada: ' || NEW.codigo,
      'El producto promocional "' || NEW.nombre || '" se ha agotado y fue desactivado automáticamente.',
      false
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para ejecutar la función
DROP TRIGGER IF EXISTS trigger_auto_desactivar_promocion ON public.productos;
CREATE TRIGGER trigger_auto_desactivar_promocion
  BEFORE UPDATE OF stock_actual ON public.productos
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_desactivar_promocion_sin_stock();

-- Comentarios para documentación
COMMENT ON COLUMN public.productos.puede_tener_promocion IS 'Indica que este producto base puede venir con promociones del proveedor';
COMMENT ON COLUMN public.productos.producto_base_id IS 'ID del producto base al que pertenece esta variante promocional';
COMMENT ON COLUMN public.productos.es_promocion IS 'Indica si este producto es una variante promocional temporal';
COMMENT ON COLUMN public.productos.descripcion_promocion IS 'Descripción corta de la promoción (ej: +3kg gratis)';
COMMENT ON COLUMN public.productos.bloqueado_venta IS 'Si true, requiere autorización para vender este producto';