-- Tabla para rastrear cambios de precio
CREATE TABLE public.productos_historial_precios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID REFERENCES public.productos(id) ON DELETE CASCADE NOT NULL,
  precio_anterior NUMERIC(12,2) NOT NULL,
  precio_nuevo NUMERIC(12,2) NOT NULL,
  usuario_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.productos_historial_precios ENABLE ROW LEVEL SECURITY;

-- Política: todos los usuarios autenticados pueden ver el historial
CREATE POLICY "Usuarios autenticados pueden ver historial de precios"
ON public.productos_historial_precios
FOR SELECT
TO authenticated
USING (true);

-- Política: solo admin/secretaria pueden insertar (via trigger)
CREATE POLICY "Sistema puede insertar historial de precios"
ON public.productos_historial_precios
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Índice para consultas por fecha
CREATE INDEX idx_productos_historial_precios_created_at 
ON public.productos_historial_precios(created_at DESC);

-- Índice para consultas por producto
CREATE INDEX idx_productos_historial_precios_producto_id 
ON public.productos_historial_precios(producto_id);

-- Función para registrar cambios de precio automáticamente
CREATE OR REPLACE FUNCTION public.registrar_cambio_precio()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo registrar si el precio_venta cambió
  IF OLD.precio_venta IS DISTINCT FROM NEW.precio_venta THEN
    INSERT INTO public.productos_historial_precios (
      producto_id, 
      precio_anterior, 
      precio_nuevo, 
      usuario_id
    ) VALUES (
      NEW.id, 
      COALESCE(OLD.precio_venta, 0), 
      COALESCE(NEW.precio_venta, 0), 
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger para ejecutar la función en cada UPDATE de productos
CREATE TRIGGER on_producto_precio_change
  AFTER UPDATE ON public.productos
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_cambio_precio();