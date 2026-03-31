CREATE TABLE IF NOT EXISTS zk_mapeo (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  zk_user_id text NOT NULL,
  dispositivo text NOT NULL,
  empleado_id uuid REFERENCES empleados(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(zk_user_id, dispositivo)
);
ALTER TABLE zk_mapeo ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "auth_all_zk_mapeo" ON zk_mapeo FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
