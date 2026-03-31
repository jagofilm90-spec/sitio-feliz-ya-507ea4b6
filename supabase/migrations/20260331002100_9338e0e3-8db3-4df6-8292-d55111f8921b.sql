
-- Add zk_id column to empleados for ZKTeco mapping
ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS zk_id TEXT UNIQUE;

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_empleados_zk_id ON public.empleados (zk_id) WHERE zk_id IS NOT NULL;

-- Auto-link asistencia records when zk_id is set on empleado
CREATE OR REPLACE FUNCTION public.auto_link_asistencia_zk()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.zk_id IS NOT NULL AND (OLD.zk_id IS DISTINCT FROM NEW.zk_id) THEN
    UPDATE public.asistencia
    SET empleado_id = NEW.id
    WHERE zk_user_id = NEW.zk_id AND empleado_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_link_asistencia_zk
AFTER UPDATE OF zk_id ON public.empleados
FOR EACH ROW
EXECUTE FUNCTION public.auto_link_asistencia_zk();

-- Also auto-link on new asistencia inserts
CREATE OR REPLACE FUNCTION public.auto_link_asistencia_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  SELECT id INTO NEW.empleado_id
  FROM public.empleados
  WHERE zk_id = NEW.zk_user_id
  LIMIT 1;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_link_asistencia_on_insert
BEFORE INSERT ON public.asistencia
FOR EACH ROW
EXECUTE FUNCTION public.auto_link_asistencia_on_insert();
