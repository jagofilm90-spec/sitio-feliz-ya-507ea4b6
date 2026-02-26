
-- Add conciliation fields to entregas table for paper tracking
ALTER TABLE public.entregas 
ADD COLUMN IF NOT EXISTS papeles_recibidos boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS papeles_recibidos_en timestamptz,
ADD COLUMN IF NOT EXISTS papeles_recibidos_por uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS notas_conciliacion text;
