-- M05.1 — Auto-release vehicles when a chofer is deactivated or deleted
-- Automatically sets chofer_asignado_id = NULL on vehicles when their assigned
-- driver becomes inactive or is deleted from the empleados table.

CREATE OR REPLACE FUNCTION public.liberar_vehiculos_chofer_inactivo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If employee went from active to inactive, release their vehicles
  IF (TG_OP = 'UPDATE' AND OLD.activo = true AND NEW.activo = false) THEN
    UPDATE public.vehiculos
    SET chofer_asignado_id = NULL,
        updated_at = NOW()
    WHERE chofer_asignado_id = NEW.id;
  END IF;

  -- If employee was deleted, release their vehicles
  IF (TG_OP = 'DELETE') THEN
    UPDATE public.vehiculos
    SET chofer_asignado_id = NULL,
        updated_at = NOW()
    WHERE chofer_asignado_id = OLD.id;
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for UPDATE (active status change)
DROP TRIGGER IF EXISTS trigger_liberar_vehiculos_update ON public.empleados;
CREATE TRIGGER trigger_liberar_vehiculos_update
  AFTER UPDATE ON public.empleados
  FOR EACH ROW
  EXECUTE FUNCTION public.liberar_vehiculos_chofer_inactivo();

-- Trigger for DELETE
DROP TRIGGER IF EXISTS trigger_liberar_vehiculos_delete ON public.empleados;
CREATE TRIGGER trigger_liberar_vehiculos_delete
  BEFORE DELETE ON public.empleados
  FOR EACH ROW
  EXECUTE FUNCTION public.liberar_vehiculos_chofer_inactivo();

COMMENT ON FUNCTION public.liberar_vehiculos_chofer_inactivo() IS
  'Automatically sets chofer_asignado_id = NULL on vehicles when a chofer is deactivated or deleted.';
