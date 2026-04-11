-- M04.3 — Add fields needed for the complete order capture flow
-- - notas_entrega: instructions for the driver (separate from internal `notas`)
-- - es_directo: marks "house" orders without commission

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS notas_entrega TEXT;

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS es_directo BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.pedidos.notas_entrega IS
  'Instrucciones de entrega para el chofer (ej. "Recibe de 3 a 4 pm"). Separado de notas que es interno.';

COMMENT ON COLUMN public.pedidos.es_directo IS
  'Pedido directo / venta de la casa: vendedor_id apunta al admin/secretaria que capturó, pero no genera comisión.';
