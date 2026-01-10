-- ============================================
-- Sistema de Descuentos Autorizados por Producto
-- ============================================

-- 1. Agregar campo descuento_maximo a productos (si no existe)
ALTER TABLE public.productos 
ADD COLUMN IF NOT EXISTS descuento_maximo DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN public.productos.descuento_maximo IS 
'Descuento máximo en pesos que el vendedor puede aplicar sin autorización adicional';

-- 2. Crear tabla de solicitudes de descuento
CREATE TABLE IF NOT EXISTS public.solicitudes_descuento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES public.pedidos(id) ON DELETE SET NULL,
  producto_id UUID REFERENCES public.productos(id) NOT NULL,
  vendedor_id UUID NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id) NOT NULL,
  sucursal_id UUID REFERENCES public.cliente_sucursales(id),
  precio_lista DECIMAL(10,2) NOT NULL,
  precio_solicitado DECIMAL(10,2) NOT NULL,
  descuento_solicitado DECIMAL(10,2) NOT NULL,
  descuento_maximo DECIMAL(10,2) NOT NULL,
  cantidad_solicitada INTEGER DEFAULT 1,
  motivo TEXT,
  status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'aprobado', 'rechazado', 'expirado')),
  precio_aprobado DECIMAL(10,2),
  respondido_por UUID,
  respondido_at TIMESTAMPTZ,
  respuesta_notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_solicitudes_descuento_status ON public.solicitudes_descuento(status);
CREATE INDEX IF NOT EXISTS idx_solicitudes_descuento_vendedor ON public.solicitudes_descuento(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_descuento_created ON public.solicitudes_descuento(created_at DESC);

-- 4. Enable RLS
ALTER TABLE public.solicitudes_descuento ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS

-- Vendedores pueden ver sus propias solicitudes, admin/secretaria ven todas
CREATE POLICY "Vendedores ven sus solicitudes" 
ON public.solicitudes_descuento 
FOR SELECT 
USING (
  vendedor_id = auth.uid() OR
  has_any_role(ARRAY['admin', 'secretaria']::app_role[])
);

-- Vendedores pueden crear solicitudes
CREATE POLICY "Vendedores crean solicitudes" 
ON public.solicitudes_descuento 
FOR INSERT 
WITH CHECK (vendedor_id = auth.uid());

-- Solo admin/secretaria pueden actualizar (aprobar/rechazar)
CREATE POLICY "Admin actualiza solicitudes" 
ON public.solicitudes_descuento 
FOR UPDATE 
USING (has_any_role(ARRAY['admin', 'secretaria']::app_role[]));

-- 6. Trigger para updated_at
CREATE TRIGGER update_solicitudes_descuento_updated_at
  BEFORE UPDATE ON public.solicitudes_descuento
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 7. Habilitar realtime para notificaciones en vivo
ALTER PUBLICATION supabase_realtime ADD TABLE public.solicitudes_descuento;