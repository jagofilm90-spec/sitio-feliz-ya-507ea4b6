-- Tabla para almacenar sugerencias de normalización en lote
CREATE TABLE public.migracion_productos_sugerencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  nombre_actual TEXT NOT NULL,
  especificaciones_actual TEXT,
  marca_actual TEXT,
  peso_kg_actual NUMERIC,
  nombre_sugerido TEXT NOT NULL,
  especificaciones_sugerida TEXT,
  marca_sugerida TEXT,
  contenido_empaque_sugerido TEXT,
  unidad_sat_sugerida TEXT,
  peso_kg_sugerido NUMERIC,
  cambios_detectados BOOLEAN DEFAULT false,
  explicacion TEXT,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado', 'editado')),
  aprobado_por UUID REFERENCES auth.users(id),
  fecha_aprobacion TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index para búsquedas rápidas
CREATE INDEX idx_migracion_sugerencias_producto ON migracion_productos_sugerencias(producto_id);
CREATE INDEX idx_migracion_sugerencias_estado ON migracion_productos_sugerencias(estado);

-- Trigger para updated_at
CREATE TRIGGER update_migracion_sugerencias_updated_at
BEFORE UPDATE ON migracion_productos_sugerencias
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

-- Enable RLS
ALTER TABLE public.migracion_productos_sugerencias ENABLE ROW LEVEL SECURITY;

-- Policies: Solo usuarios con rol admin o secretaria pueden gestionar
CREATE POLICY "Secretarias can view all migration suggestions"
ON public.migracion_productos_sugerencias
FOR SELECT
USING (has_any_role(ARRAY['admin', 'secretaria']::app_role[]));

CREATE POLICY "Secretarias can insert migration suggestions"
ON public.migracion_productos_sugerencias
FOR INSERT
WITH CHECK (has_any_role(ARRAY['admin', 'secretaria']::app_role[]));

CREATE POLICY "Secretarias can update migration suggestions"
ON public.migracion_productos_sugerencias
FOR UPDATE
USING (has_any_role(ARRAY['admin', 'secretaria']::app_role[]));

CREATE POLICY "Secretarias can delete migration suggestions"
ON public.migracion_productos_sugerencias
FOR DELETE
USING (has_any_role(ARRAY['admin', 'secretaria']::app_role[]));