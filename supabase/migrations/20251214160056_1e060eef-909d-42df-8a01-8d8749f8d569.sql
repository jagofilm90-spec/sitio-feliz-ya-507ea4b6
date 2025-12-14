-- Tabla para almacenar ubicación actual de cada chofer
CREATE TABLE public.chofer_ubicaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ruta_id UUID REFERENCES public.rutas(id) ON DELETE CASCADE,
  chofer_id UUID NOT NULL,
  latitud DECIMAL(10, 8) NOT NULL,
  longitud DECIMAL(11, 8) NOT NULL,
  precision_metros DECIMAL(6, 2),
  velocidad_kmh DECIMAL(5, 2),
  heading DECIMAL(5, 2),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ruta_id)
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_chofer_ubicaciones_ruta ON chofer_ubicaciones(ruta_id);
CREATE INDEX idx_chofer_ubicaciones_chofer ON chofer_ubicaciones(chofer_id);
CREATE INDEX idx_chofer_ubicaciones_timestamp ON chofer_ubicaciones(timestamp);

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chofer_ubicaciones;

-- RLS
ALTER TABLE public.chofer_ubicaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chofer puede gestionar su ubicación" ON public.chofer_ubicaciones
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM rutas r
      JOIN empleados e ON e.id = r.chofer_id
      WHERE r.id = ruta_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin y Secretaria pueden ver ubicaciones" ON public.chofer_ubicaciones
  FOR SELECT USING (
    public.has_any_role(ARRAY['admin'::app_role, 'secretaria'::app_role])
  );