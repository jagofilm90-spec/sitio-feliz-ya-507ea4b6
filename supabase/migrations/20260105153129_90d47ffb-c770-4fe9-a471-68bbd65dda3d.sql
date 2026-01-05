-- Create table for client order scheduling
CREATE TABLE public.cliente_programacion_pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  sucursal_id uuid REFERENCES cliente_sucursales(id) ON DELETE CASCADE,
  dia_semana text NOT NULL CHECK (dia_semana IN ('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado')),
  hora_preferida time DEFAULT NULL,
  activo boolean DEFAULT true,
  notas text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(cliente_id, sucursal_id, dia_semana)
);

-- Enable RLS
ALTER TABLE public.cliente_programacion_pedidos ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view scheduling"
ON public.cliente_programacion_pedidos FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert scheduling"
ON public.cliente_programacion_pedidos FOR INSERT
TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update scheduling"
ON public.cliente_programacion_pedidos FOR UPDATE
TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete scheduling"
ON public.cliente_programacion_pedidos FOR DELETE
TO authenticated USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_cliente_programacion_pedidos_updated_at
BEFORE UPDATE ON public.cliente_programacion_pedidos
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add comment
COMMENT ON TABLE public.cliente_programacion_pedidos IS 'Programación recurrente de días de pedido por cliente/sucursal';

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.cliente_programacion_pedidos;