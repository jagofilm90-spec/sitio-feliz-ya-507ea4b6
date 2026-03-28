CREATE TABLE IF NOT EXISTS empleados_historial_sueldo (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id uuid REFERENCES empleados(id) ON DELETE CASCADE,
  sueldo_anterior numeric,
  sueldo_nuevo numeric,
  premio_anterior numeric,
  premio_nuevo numeric,
  motivo text,
  fecha_cambio timestamptz DEFAULT now(),
  cambiado_por uuid REFERENCES auth.users(id)
);

ALTER TABLE empleados_historial_sueldo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read salary history"
ON empleados_historial_sueldo FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert salary history"
ON empleados_historial_sueldo FOR INSERT TO authenticated WITH CHECK (true);
