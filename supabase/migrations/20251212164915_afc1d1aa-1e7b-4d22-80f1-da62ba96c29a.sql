-- 1. Hacer pedido_id nullable en facturas
ALTER TABLE public.facturas ALTER COLUMN pedido_id DROP NOT NULL;

-- 2. Crear tabla factura_detalles para productos de facturas directas
CREATE TABLE IF NOT EXISTS public.factura_detalles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id uuid NOT NULL REFERENCES public.facturas(id) ON DELETE CASCADE,
  producto_id uuid NOT NULL REFERENCES public.productos(id),
  cantidad numeric NOT NULL,
  precio_unitario numeric NOT NULL,
  subtotal numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Habilitar RLS
ALTER TABLE public.factura_detalles ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS
CREATE POLICY "Admins y secretarias pueden gestionar detalles de facturas"
ON public.factura_detalles
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretaria'::app_role));

CREATE POLICY "Usuarios autenticados pueden ver detalles de facturas"
ON public.factura_detalles
FOR SELECT
USING (auth.uid() IS NOT NULL);