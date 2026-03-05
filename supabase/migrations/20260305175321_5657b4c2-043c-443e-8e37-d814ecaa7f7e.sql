
CREATE TABLE public.pedidos_historial_cambios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  tipo_cambio TEXT NOT NULL,
  cambios JSONB NOT NULL DEFAULT '{}',
  total_anterior NUMERIC,
  total_nuevo NUMERIC,
  usuario_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pedidos_historial_cambios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert historial"
  ON public.pedidos_historial_cambios
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read historial"
  ON public.pedidos_historial_cambios
  FOR SELECT TO authenticated
  USING (true);

CREATE INDEX idx_pedidos_historial_pedido_id ON public.pedidos_historial_cambios(pedido_id);
