
CREATE OR REPLACE FUNCTION public.decrementar_lote(p_lote_id uuid, p_cantidad numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_disponible numeric;
BEGIN
  -- Lock the row and get current quantity
  SELECT cantidad_disponible INTO v_disponible
  FROM inventario_lotes
  WHERE id = p_lote_id
  FOR UPDATE;

  IF v_disponible IS NULL THEN
    RAISE EXCEPTION 'Lote no encontrado: %', p_lote_id;
  END IF;

  IF v_disponible < p_cantidad THEN
    RAISE EXCEPTION 'Stock insuficiente en lote. Disponible: %, Solicitado: %', v_disponible, p_cantidad;
  END IF;

  UPDATE inventario_lotes 
  SET cantidad_disponible = cantidad_disponible - p_cantidad,
      updated_at = now()
  WHERE id = p_lote_id;
END;
$function$;
