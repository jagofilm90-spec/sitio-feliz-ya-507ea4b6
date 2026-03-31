
-- Update trigger to use zk_mapeo table (supports different IDs per device)
CREATE OR REPLACE FUNCTION public.auto_link_asistencia_on_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- First try zk_mapeo (supports per-device mapping)
  SELECT empleado_id INTO NEW.empleado_id
  FROM public.zk_mapeo
  WHERE zk_user_id = NEW.zk_user_id
    AND dispositivo = NEW.dispositivo
  LIMIT 1;
  
  -- Fallback to empleados.zk_id for backward compatibility
  IF NEW.empleado_id IS NULL THEN
    SELECT id INTO NEW.empleado_id
    FROM public.empleados
    WHERE zk_id = NEW.zk_user_id
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$function$;
