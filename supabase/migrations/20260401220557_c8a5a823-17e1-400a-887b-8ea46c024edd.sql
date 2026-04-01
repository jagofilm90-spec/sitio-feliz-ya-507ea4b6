
CREATE TABLE public.empleados_vacaciones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  dias INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'tomada',
  notas TEXT,
  aprobada_por UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.empleados_vacaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view vacaciones"
  ON public.empleados_vacaciones FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert vacaciones"
  ON public.empleados_vacaciones FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update vacaciones"
  ON public.empleados_vacaciones FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete vacaciones"
  ON public.empleados_vacaciones FOR DELETE
  TO authenticated USING (true);

CREATE INDEX idx_empleados_vacaciones_empleado ON public.empleados_vacaciones(empleado_id);
CREATE INDEX idx_empleados_vacaciones_fechas ON public.empleados_vacaciones(fecha_inicio, fecha_fin);
