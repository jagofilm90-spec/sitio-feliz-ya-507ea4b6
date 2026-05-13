-- Añadir FK e índice a pedidos_detalles.producto_sustituto_id.
-- La columna fue agregada en 20260511030000_surtido_almacen_columns.sql sin constraint ni índice.

-- Guard: aborta si hay orphan rows que romperían el FK.
DO $$
DECLARE v_orphans int;
BEGIN
  SELECT COUNT(*) INTO v_orphans
  FROM public.pedidos_detalles pd
  LEFT JOIN public.productos p ON p.id = pd.producto_sustituto_id
  WHERE pd.producto_sustituto_id IS NOT NULL AND p.id IS NULL;

  IF v_orphans > 0 THEN
    RAISE EXCEPTION
      'Hay % filas en pedidos_detalles con producto_sustituto_id huérfano. Limpiar antes de aplicar FK.',
      v_orphans;
  END IF;
END $$;

-- FK con ON DELETE SET NULL: si se elimina el producto sustituto el pedido no se pierde.
ALTER TABLE public.pedidos_detalles
  DROP CONSTRAINT IF EXISTS fk_pedidos_detalles_producto_sustituto;

ALTER TABLE public.pedidos_detalles
  ADD CONSTRAINT fk_pedidos_detalles_producto_sustituto
  FOREIGN KEY (producto_sustituto_id)
  REFERENCES public.productos(id)
  ON DELETE SET NULL;

-- Índice parcial: solo filas donde hay sustituto (la mayoría serán NULL, no ocupa espacio innecesario).
CREATE INDEX IF NOT EXISTS idx_pedidos_detalles_producto_sustituto
  ON public.pedidos_detalles(producto_sustituto_id)
  WHERE producto_sustituto_id IS NOT NULL;
