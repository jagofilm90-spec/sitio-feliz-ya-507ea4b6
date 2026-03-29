ALTER TABLE public.empleados 
  ADD COLUMN IF NOT EXISTS licencia_numero text,
  ADD COLUMN IF NOT EXISTS licencia_tipo text,
  ADD COLUMN IF NOT EXISTS licencia_vencimiento date;