-- Tabla para historial de cambios de costos
CREATE TABLE public.productos_historial_costos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  proveedor_id UUID REFERENCES public.proveedores(id) ON DELETE SET NULL,
  costo_anterior NUMERIC(12,2),
  costo_nuevo NUMERIC(12,2) NOT NULL,
  fuente TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'orden_compra', 'recepcion'
  referencia_id UUID, -- ID de orden de compra o recepción si aplica
  notas TEXT,
  usuario_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para consultas eficientes
CREATE INDEX idx_historial_costos_producto ON public.productos_historial_costos(producto_id);
CREATE INDEX idx_historial_costos_proveedor ON public.productos_historial_costos(proveedor_id);
CREATE INDEX idx_historial_costos_fecha ON public.productos_historial_costos(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.productos_historial_costos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Secretarias y admin pueden ver historial costos" 
ON public.productos_historial_costos
FOR SELECT 
USING (public.has_any_role(ARRAY['admin', 'secretaria']::public.app_role[]));

CREATE POLICY "Secretarias y admin pueden insertar historial costos" 
ON public.productos_historial_costos
FOR INSERT 
WITH CHECK (public.has_any_role(ARRAY['admin', 'secretaria']::public.app_role[]));