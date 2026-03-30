CREATE TABLE public.empleados_actas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  descripcion text NOT NULL,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  testigo_1 text,
  testigo_2 text,
  firmada boolean DEFAULT false,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.empleados_actas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read actas"
  ON public.empleados_actas FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert actas"
  ON public.empleados_actas FOR INSERT
  TO authenticated WITH CHECK (true);