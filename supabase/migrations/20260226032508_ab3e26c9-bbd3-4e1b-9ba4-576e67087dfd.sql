ALTER TABLE public.rutas 
  ADD COLUMN IF NOT EXISTS firma_almacenista_carga text,
  ADD COLUMN IF NOT EXISTS cargado_por uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS cargado_por_nombre text;