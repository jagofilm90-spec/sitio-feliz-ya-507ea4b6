CREATE TABLE public.empleados_historial_sueldo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  sueldo_anterior numeric,
  sueldo_nuevo numeric,
  premio_anterior numeric,
  premio_nuevo numeric,
  cambiado_por uuid,
  fecha_cambio timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.empleados_historial_sueldo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage salary history"
ON public.empleados_historial_sueldo
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);