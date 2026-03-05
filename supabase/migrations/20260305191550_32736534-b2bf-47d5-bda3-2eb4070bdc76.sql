
-- Add daily sequential number column to pedidos
ALTER TABLE public.pedidos ADD COLUMN numero_dia integer;

-- Create function to auto-assign daily sequential number
CREATE OR REPLACE FUNCTION public.asignar_numero_dia()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only assign if status is not borrador
  IF NEW.status IS NOT NULL AND NEW.status != 'borrador' THEN
    SELECT COALESCE(MAX(numero_dia), 0) + 1 INTO NEW.numero_dia
    FROM pedidos
    WHERE fecha_pedido::date = NEW.fecha_pedido::date
      AND status != 'borrador'
      AND numero_dia IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$function$;

-- Create trigger BEFORE INSERT
CREATE TRIGGER trg_asignar_numero_dia
  BEFORE INSERT ON public.pedidos
  FOR EACH ROW
  EXECUTE FUNCTION public.asignar_numero_dia();
