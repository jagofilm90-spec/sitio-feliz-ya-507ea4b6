CREATE TABLE IF NOT EXISTS asistencia (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  zk_user_id text NOT NULL,
  dispositivo text NOT NULL,
  fecha_hora timestamptz NOT NULL,
  fecha date NOT NULL,
  hora time NOT NULL,
  tipo text NOT NULL DEFAULT 'entrada',
  zk_status int,
  empleado_id uuid REFERENCES empleados(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(zk_user_id, dispositivo, fecha_hora)
);

ALTER TABLE asistencia ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "auth_all_asistencia" ON asistencia FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_asistencia_fecha ON asistencia(fecha);
CREATE INDEX IF NOT EXISTS idx_asistencia_empleado ON asistencia(empleado_id);
CREATE INDEX IF NOT EXISTS idx_asistencia_zk_user ON asistencia(zk_user_id);
