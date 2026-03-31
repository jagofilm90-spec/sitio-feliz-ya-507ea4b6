CREATE TABLE public.zk_mapeo (
  zk_user_id text NOT NULL,
  dispositivo text NOT NULL,
  empleado_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (zk_user_id, dispositivo)
);

ALTER TABLE public.zk_mapeo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read zk_mapeo"
  ON public.zk_mapeo FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can insert zk_mapeo"
  ON public.zk_mapeo FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(ARRAY['admin'::app_role, 'gerente_almacen'::app_role]));

CREATE POLICY "Admin can update zk_mapeo"
  ON public.zk_mapeo FOR UPDATE TO authenticated
  USING (public.has_any_role(ARRAY['admin'::app_role, 'gerente_almacen'::app_role]));

CREATE POLICY "Admin can delete zk_mapeo"
  ON public.zk_mapeo FOR DELETE TO authenticated
  USING (public.has_any_role(ARRAY['admin'::app_role, 'gerente_almacen'::app_role]));