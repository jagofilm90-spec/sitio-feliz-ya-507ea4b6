-- Licencia de choferes
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS licencia_numero text;
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS licencia_tipo text;
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS licencia_vencimiento date;

-- Contacto de emergencia (may already exist with different names)
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS emergencia_nombre text;
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS emergencia_telefono text;
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS emergencia_parentesco text;

-- Proceso de baja
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS notas_baja text;

-- Actas administrativas
CREATE TABLE IF NOT EXISTS empleados_actas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id uuid REFERENCES empleados(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  descripcion text NOT NULL,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  testigo_1 text,
  testigo_2 text,
  firmada boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE empleados_actas ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "auth_all_actas" ON empleados_actas FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Vacaciones
CREATE TABLE IF NOT EXISTS empleados_vacaciones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id uuid REFERENCES empleados(id) ON DELETE CASCADE,
  fecha_inicio date NOT NULL,
  fecha_fin date NOT NULL,
  dias int NOT NULL,
  status text DEFAULT 'pendiente',
  aprobada_por uuid REFERENCES auth.users(id),
  notas text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE empleados_vacaciones ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "auth_all_vac" ON empleados_vacaciones FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
