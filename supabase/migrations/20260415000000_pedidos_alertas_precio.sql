-- M04.4D Part 2 — Price alert flags on orders
-- Stores per-line price alerts as JSONB array for admin visibility.
-- Each entry: { producto_id, tipo: 'bajo_piso'|'bajo_costo'|'error_dedo', precio_lista, precio_pactado, piso }

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS alertas_precio JSONB DEFAULT '[]';

COMMENT ON COLUMN public.pedidos.alertas_precio IS
  'Array of price alerts detected at capture time. Each: {producto_id, tipo, precio_lista, precio_pactado, piso}. Empty array = no alerts.';
