
-- Fase A: Cobro enlazado a pedidos

-- 1. Agregar campos que no existen en pedidos
ALTER TABLE public.pedidos 
ADD COLUMN IF NOT EXISTS pagado boolean NOT NULL DEFAULT false;

ALTER TABLE public.pedidos 
ADD COLUMN IF NOT EXISTS saldo_pendiente numeric DEFAULT NULL;

-- Inicializar saldo_pendiente = total para todos los pedidos no cancelados
UPDATE public.pedidos 
SET saldo_pendiente = total
WHERE saldo_pendiente IS NULL 
  AND status IN ('entregado', 'en_ruta', 'pendiente', 'por_autorizar');

-- 2. Crear tabla cobros_pedido
CREATE TABLE IF NOT EXISTS public.cobros_pedido (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id),
  monto numeric NOT NULL CHECK (monto > 0),
  forma_pago text NOT NULL DEFAULT 'efectivo',
  referencia text NULL,
  fecha_cheque date NULL,
  notas text NULL,
  registrado_por uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.cobros_pedido ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendedores ven cobros de sus clientes"
ON public.cobros_pedido FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pedidos p
    JOIN public.clientes c ON c.id = p.cliente_id
    WHERE p.id = cobros_pedido.pedido_id
      AND c.vendedor_asignado = auth.uid()
  )
  OR public.has_any_role(ARRAY['admin', 'secretaria']::app_role[])
);

CREATE POLICY "Vendedores insertan cobros de sus clientes"
ON public.cobros_pedido FOR INSERT TO authenticated
WITH CHECK (
  registrado_por = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.pedidos p
    JOIN public.clientes c ON c.id = p.cliente_id
    WHERE p.id = pedido_id
      AND c.vendedor_asignado = auth.uid()
  )
);

CREATE POLICY "Admin y secretaria gestionan cobros"
ON public.cobros_pedido FOR ALL TO authenticated
USING (public.has_any_role(ARRAY['admin', 'secretaria']::app_role[]))
WITH CHECK (public.has_any_role(ARRAY['admin', 'secretaria']::app_role[]));

CREATE TRIGGER update_cobros_pedido_updated_at
  BEFORE UPDATE ON public.cobros_pedido
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Función para registrar cobro y actualizar saldo
CREATE OR REPLACE FUNCTION public.registrar_cobro_pedido(
  p_pedido_id uuid,
  p_cliente_id uuid,
  p_monto numeric,
  p_forma_pago text,
  p_referencia text DEFAULT NULL,
  p_fecha_cheque date DEFAULT NULL,
  p_notas text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cobro_id uuid;
  v_saldo_actual numeric;
  v_nuevo_saldo numeric;
BEGIN
  SELECT COALESCE(saldo_pendiente, total)
  INTO v_saldo_actual
  FROM pedidos WHERE id = p_pedido_id;

  IF v_saldo_actual IS NULL THEN
    RAISE EXCEPTION 'Pedido no encontrado';
  END IF;

  IF p_monto > v_saldo_actual + 0.01 THEN
    RAISE EXCEPTION 'El monto del cobro supera el saldo pendiente';
  END IF;

  INSERT INTO cobros_pedido (pedido_id, cliente_id, monto, forma_pago, referencia, fecha_cheque, notas, registrado_por)
  VALUES (p_pedido_id, p_cliente_id, p_monto, p_forma_pago, p_referencia, p_fecha_cheque, p_notas, auth.uid())
  RETURNING id INTO v_cobro_id;

  v_nuevo_saldo := GREATEST(v_saldo_actual - p_monto, 0);

  UPDATE pedidos
  SET 
    saldo_pendiente = v_nuevo_saldo,
    pagado = (v_nuevo_saldo <= 0),
    updated_at = now()
  WHERE id = p_pedido_id;

  UPDATE clientes
  SET saldo_pendiente = (
    SELECT COALESCE(SUM(COALESCE(saldo_pendiente, 0)), 0)
    FROM pedidos
    WHERE cliente_id = p_cliente_id
      AND status != 'cancelado'
      AND pagado = false
  )
  WHERE id = p_cliente_id;

  RETURN v_cobro_id;
END;
$$;
