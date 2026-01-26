-- Agregar campos para tracking de devoluciones en ordenes_compra
ALTER TABLE public.ordenes_compra 
ADD COLUMN IF NOT EXISTS monto_devoluciones numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_ajustado numeric;

-- Actualizar total_ajustado para OCs existentes (igual al total si no hay devoluciones)
UPDATE public.ordenes_compra 
SET total_ajustado = total 
WHERE total_ajustado IS NULL;

-- Función para agregar monto de devolución a una OC
CREATE OR REPLACE FUNCTION public.agregar_devolucion_a_oc(
  p_oc_id UUID,
  p_monto NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE ordenes_compra
  SET 
    monto_devoluciones = COALESCE(monto_devoluciones, 0) + p_monto,
    total_ajustado = total - (COALESCE(monto_devoluciones, 0) + p_monto)
  WHERE id = p_oc_id;
END;
$$;

-- Trigger para inicializar total_ajustado al crear OC
CREATE OR REPLACE FUNCTION public.inicializar_total_ajustado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.total_ajustado := COALESCE(NEW.total_ajustado, NEW.total);
  NEW.monto_devoluciones := COALESCE(NEW.monto_devoluciones, 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_inicializar_total_ajustado ON ordenes_compra;
CREATE TRIGGER trigger_inicializar_total_ajustado
BEFORE INSERT ON ordenes_compra
FOR EACH ROW
EXECUTE FUNCTION public.inicializar_total_ajustado();