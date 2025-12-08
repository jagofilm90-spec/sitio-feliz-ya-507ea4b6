-- Crear bucket de storage para evidencias de recepción
INSERT INTO storage.buckets (id, name, public)
VALUES ('recepciones-evidencias', 'recepciones-evidencias', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para el bucket de storage
CREATE POLICY "Admins y almacen pueden subir evidencias"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'recepciones-evidencias' 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'almacen'))
);

CREATE POLICY "Admins y almacen pueden ver evidencias"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'recepciones-evidencias'
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'almacen') OR has_role(auth.uid(), 'secretaria'))
);

CREATE POLICY "Solo admins pueden eliminar evidencias"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'recepciones-evidencias'
  AND has_role(auth.uid(), 'admin')
);

-- Crear tabla para metadatos de evidencias
CREATE TABLE public.recepciones_evidencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_compra_id UUID NOT NULL REFERENCES public.ordenes_compra(id) ON DELETE CASCADE,
  tipo_evidencia TEXT NOT NULL CHECK (tipo_evidencia IN ('sello', 'identificacion', 'documento', 'vehiculo', 'otro')),
  ruta_storage TEXT NOT NULL,
  nombre_archivo TEXT NOT NULL,
  notas TEXT,
  capturado_por UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.recepciones_evidencias ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para la tabla
CREATE POLICY "Admins y almacen pueden insertar evidencias"
ON public.recepciones_evidencias
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'almacen')
);

CREATE POLICY "Usuarios autenticados pueden ver evidencias"
ON public.recepciones_evidencias
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins pueden eliminar evidencias"
ON public.recepciones_evidencias
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Índice para búsqueda rápida por orden de compra
CREATE INDEX idx_recepciones_evidencias_orden ON public.recepciones_evidencias(orden_compra_id);