-- ===========================================
-- SISTEMA DE DEVOLUCIONES A PROVEEDOR
-- ===========================================

-- 1. Crear tabla devoluciones_proveedor
CREATE TABLE public.devoluciones_proveedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_compra_id UUID NOT NULL REFERENCES ordenes_compra(id) ON DELETE CASCADE,
  orden_compra_entrega_id UUID REFERENCES ordenes_compra_entregas(id) ON DELETE SET NULL,
  producto_id UUID NOT NULL REFERENCES productos(id),
  lote_id UUID REFERENCES inventario_lotes(id) ON DELETE SET NULL,
  cantidad_devuelta NUMERIC NOT NULL,
  motivo TEXT NOT NULL, -- roto, no_llego, error_cantidad, rechazado_calidad, otro
  notas TEXT,
  registrado_por UUID REFERENCES auth.users(id),
  -- Estado de seguimiento con el proveedor
  status TEXT NOT NULL DEFAULT 'pendiente', -- pendiente, notificado_proveedor, reemplazo_recibido, credito_aplicado, cerrada
  fecha_resolucion DATE,
  resolucion_notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Crear tabla para evidencias de devoluciones
CREATE TABLE public.devoluciones_proveedor_evidencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devolucion_id UUID NOT NULL REFERENCES devoluciones_proveedor(id) ON DELETE CASCADE,
  tipo_evidencia TEXT NOT NULL, -- foto_danio, foto_producto, documento
  ruta_storage TEXT NOT NULL,
  nombre_archivo TEXT,
  capturado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Agregar columnas de razón de diferencia a ordenes_compra_detalles
ALTER TABLE public.ordenes_compra_detalles 
ADD COLUMN IF NOT EXISTS razon_diferencia TEXT,
ADD COLUMN IF NOT EXISTS notas_diferencia TEXT;

-- 4. Habilitar RLS
ALTER TABLE public.devoluciones_proveedor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devoluciones_proveedor_evidencias ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para devoluciones_proveedor
CREATE POLICY "Admins y secretarias gestionan devoluciones proveedor"
ON public.devoluciones_proveedor
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretaria'::app_role));

CREATE POLICY "Almacenistas pueden crear y ver devoluciones proveedor"
ON public.devoluciones_proveedor
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'almacen'::app_role));

CREATE POLICY "Almacenistas pueden insertar devoluciones proveedor"
ON public.devoluciones_proveedor
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'almacen'::app_role));

-- 6. Políticas RLS para evidencias de devoluciones
CREATE POLICY "Usuarios autenticados pueden ver evidencias devoluciones"
ON public.devoluciones_proveedor_evidencias
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Almacenistas pueden insertar evidencias devoluciones"
ON public.devoluciones_proveedor_evidencias
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'almacen'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretaria'::app_role));

-- 7. Trigger para updated_at
CREATE TRIGGER update_devoluciones_proveedor_updated_at
BEFORE UPDATE ON public.devoluciones_proveedor
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 8. Crear bucket para evidencias de devoluciones (si no existe)
INSERT INTO storage.buckets (id, name, public)
VALUES ('devoluciones-evidencias', 'devoluciones-evidencias', false)
ON CONFLICT (id) DO NOTHING;

-- 9. Políticas de storage para evidencias de devoluciones
CREATE POLICY "Almacenistas pueden subir evidencias devoluciones"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'devoluciones-evidencias' AND (
  has_role(auth.uid(), 'almacen'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'secretaria'::app_role)
));

CREATE POLICY "Usuarios autenticados pueden ver evidencias devoluciones"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'devoluciones-evidencias');

-- 10. Índices para rendimiento
CREATE INDEX idx_devoluciones_proveedor_orden ON public.devoluciones_proveedor(orden_compra_id);
CREATE INDEX idx_devoluciones_proveedor_producto ON public.devoluciones_proveedor(producto_id);
CREATE INDEX idx_devoluciones_proveedor_status ON public.devoluciones_proveedor(status);
CREATE INDEX idx_devoluciones_proveedor_evidencias_devolucion ON public.devoluciones_proveedor_evidencias(devolucion_id);