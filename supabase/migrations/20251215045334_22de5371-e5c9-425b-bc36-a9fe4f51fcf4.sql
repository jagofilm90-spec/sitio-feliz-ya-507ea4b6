-- Tabla para tracking de participantes en cada recepción
CREATE TABLE public.recepciones_participantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id UUID NOT NULL REFERENCES public.ordenes_compra_entregas(id) ON DELETE CASCADE,
  empleado_id UUID REFERENCES public.empleados(id),
  user_id UUID NOT NULL,
  accion TEXT NOT NULL, -- 'inicio_llegada', 'fin_llegada', 'inicio_recepcion', 'fin_recepcion', 'transferido_a', 'transferido_de'
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para búsquedas eficientes
CREATE INDEX idx_recepciones_participantes_entrega ON public.recepciones_participantes(entrega_id);
CREATE INDEX idx_recepciones_participantes_user ON public.recepciones_participantes(user_id);

-- Agregar campos de tracking a ordenes_compra_entregas
ALTER TABLE public.ordenes_compra_entregas 
ADD COLUMN IF NOT EXISTS trabajando_por UUID,
ADD COLUMN IF NOT EXISTS trabajando_desde TIMESTAMPTZ;

-- RLS para recepciones_participantes
ALTER TABLE public.recepciones_participantes ENABLE ROW LEVEL SECURITY;

-- Admins y secretarias pueden ver y gestionar todo
CREATE POLICY "Admins y secretarias gestionan participantes recepciones"
ON public.recepciones_participantes
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretaria'::app_role));

-- Almacenistas pueden insertar registros
CREATE POLICY "Almacenistas pueden registrar participación"
ON public.recepciones_participantes
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'almacen'::app_role));

-- Usuarios autenticados pueden ver historial
CREATE POLICY "Usuarios autenticados ven historial participantes"
ON public.recepciones_participantes
FOR SELECT
USING (auth.uid() IS NOT NULL);