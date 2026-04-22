-- ═══════════════════════════════════════════════════════════════
-- M04.5A: Folio atómico + RLS pedidos_detalles
-- ═══════════════════════════════════════════════════════════════

-- ── FASE 1: RPC generar_folio_pedido() ──
-- Formato: PED-YYYYMMDD-NNN (secuencia diaria, 3 dígitos)
-- Usa advisory lock para atomicidad real en concurrencia

CREATE OR REPLACE FUNCTION public.generar_folio_pedido()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_day TEXT;
  last_folio TEXT;
  last_number INTEGER;
  new_number INTEGER;
  new_folio TEXT;
BEGIN
  -- Serializar acceso concurrente
  PERFORM pg_advisory_xact_lock(hashtext('generar_folio_pedido'));

  current_day := TO_CHAR(NOW() AT TIME ZONE 'America/Mexico_City', 'YYYYMMDD');

  SELECT folio INTO last_folio
  FROM pedidos
  WHERE folio LIKE 'PED-' || current_day || '-%'
  ORDER BY folio DESC
  LIMIT 1;

  IF last_folio IS NULL THEN
    new_number := 1;
  ELSE
    last_number := CAST(SUBSTRING(last_folio FROM 14 FOR 3) AS INTEGER);
    new_number := last_number + 1;
  END IF;

  new_folio := 'PED-' || current_day || '-' || LPAD(new_number::TEXT, 3, '0');

  RETURN new_folio;
END;
$$;

-- Asegurar unique constraint (ya existe desde migración inicial, pero por seguridad)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename = 'pedidos' AND indexname = 'pedidos_folio_key'
  ) THEN
    ALTER TABLE pedidos ADD CONSTRAINT pedidos_folio_key UNIQUE (folio);
  END IF;
END $$;


-- ── FASE 2: RLS en pedidos_detalles ──
-- Reemplazar política abierta por políticas vinculadas al pedido padre

-- Eliminar políticas legacy acumuladas de migraciones anteriores
DROP POLICY IF EXISTS "All authenticated users can view order details" ON public.pedidos_detalles;
DROP POLICY IF EXISTS "Users who can manage orders can manage details" ON public.pedidos_detalles;
DROP POLICY IF EXISTS "Clientes can view their order details" ON public.pedidos_detalles;
DROP POLICY IF EXISTS "Clientes can create their order details" ON public.pedidos_detalles;

-- Eliminar política permisiva actual
DROP POLICY IF EXISTS "Authenticated users full access" ON public.pedidos_detalles;

-- SELECT: puede ver detalles si puede ver el pedido padre
CREATE POLICY "Select detalles via pedido access"
ON public.pedidos_detalles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.pedidos
    WHERE pedidos.id = pedidos_detalles.pedido_id
  )
);

-- INSERT: admin, secretaria, vendedor, cliente pueden insertar
CREATE POLICY "Insert detalles for own pedidos"
ON public.pedidos_detalles FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pedidos
    WHERE pedidos.id = pedidos_detalles.pedido_id
  )
);

-- UPDATE: puede actualizar si puede ver el pedido padre
CREATE POLICY "Update detalles via pedido access"
ON public.pedidos_detalles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.pedidos
    WHERE pedidos.id = pedidos_detalles.pedido_id
  )
);

-- DELETE: puede borrar si puede ver el pedido padre
CREATE POLICY "Delete detalles via pedido access"
ON public.pedidos_detalles FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.pedidos
    WHERE pedidos.id = pedidos_detalles.pedido_id
  )
);
