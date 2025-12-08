-- =====================================================
-- Sistema de Ayudantes Externos y Planificación Anticipada
-- =====================================================

-- Tabla para ayudantes externos/subcontratados
CREATE TABLE public.ayudantes_externos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_completo TEXT NOT NULL,
  telefono TEXT,
  notas TEXT,
  tarifa_por_viaje NUMERIC DEFAULT 850,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Agregar campos en rutas para ayudantes externos
ALTER TABLE public.rutas 
ADD COLUMN IF NOT EXISTS ayudante_externo_id UUID REFERENCES public.ayudantes_externos(id),
ADD COLUMN IF NOT EXISTS costo_ayudante_externo NUMERIC;

-- RLS para ayudantes_externos
ALTER TABLE public.ayudantes_externos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins y secretarias pueden gestionar ayudantes externos"
ON public.ayudantes_externos FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretaria'::app_role));

CREATE POLICY "Usuarios autenticados pueden ver ayudantes externos"
ON public.ayudantes_externos FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Trigger para updated_at
CREATE TRIGGER update_ayudantes_externos_updated_at
BEFORE UPDATE ON public.ayudantes_externos
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Índice para búsquedas
CREATE INDEX idx_ayudantes_externos_activo ON public.ayudantes_externos(activo);
CREATE INDEX idx_rutas_ayudante_externo ON public.rutas(ayudante_externo_id);