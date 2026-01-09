-- Tabla para registrar cambios de estado (activo/inactivo) de productos
CREATE TABLE public.productos_historial_estado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID REFERENCES productos(id) ON DELETE CASCADE NOT NULL,
  activo_anterior BOOLEAN NOT NULL,
  activo_nuevo BOOLEAN NOT NULL,
  motivo TEXT,
  usuario_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.productos_historial_estado ENABLE ROW LEVEL SECURITY;

-- Política de lectura para usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden ver historial de estado"
  ON public.productos_historial_estado FOR SELECT
  TO authenticated USING (true);

-- Índices para búsquedas eficientes
CREATE INDEX idx_productos_historial_estado_created ON public.productos_historial_estado(created_at);
CREATE INDEX idx_productos_historial_estado_producto ON public.productos_historial_estado(producto_id);
CREATE INDEX idx_productos_historial_estado_activo_nuevo ON public.productos_historial_estado(activo_nuevo);

-- Función para registrar cambios de estado
CREATE OR REPLACE FUNCTION public.registrar_cambio_estado_producto()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo registrar si activo cambió
  IF OLD.activo IS DISTINCT FROM NEW.activo THEN
    INSERT INTO public.productos_historial_estado (
      producto_id, 
      activo_anterior, 
      activo_nuevo, 
      usuario_id
    ) VALUES (
      NEW.id, 
      COALESCE(OLD.activo, true), 
      COALESCE(NEW.activo, true), 
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para capturar cambios de estado
CREATE TRIGGER on_producto_estado_change
  AFTER UPDATE ON public.productos
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_cambio_estado_producto();