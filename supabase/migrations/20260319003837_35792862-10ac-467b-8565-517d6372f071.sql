-- Create productos_revision_precio table
CREATE TABLE public.productos_revision_precio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id uuid REFERENCES public.productos(id) NOT NULL,
  costo_anterior numeric NOT NULL,
  costo_nuevo numeric NOT NULL,
  precio_venta_actual numeric NOT NULL,
  precio_venta_sugerido numeric NOT NULL,
  margen_actual_porcentaje numeric,
  margen_sugerido_porcentaje numeric,
  ajuste_aplicado numeric DEFAULT 0,
  pendiente_ajuste numeric,
  status text DEFAULT 'pendiente',
  notas text,
  creado_por uuid REFERENCES public.profiles(id),
  resuelto_por uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  resuelto_at timestamptz
);

-- Enable RLS
ALTER TABLE public.productos_revision_precio ENABLE ROW LEVEL SECURITY;

-- Admin and secretaria can read
CREATE POLICY "admin_secretaria_select_revision_precio"
ON public.productos_revision_precio FOR SELECT
TO authenticated
USING (
  public.has_any_role(ARRAY['admin'::app_role, 'secretaria'::app_role, 'contadora'::app_role])
);

-- Admin and secretaria can insert
CREATE POLICY "admin_secretaria_insert_revision_precio"
ON public.productos_revision_precio FOR INSERT
TO authenticated
WITH CHECK (
  public.has_any_role(ARRAY['admin'::app_role, 'secretaria'::app_role, 'contadora'::app_role])
);

-- Admin and secretaria can update
CREATE POLICY "admin_secretaria_update_revision_precio"
ON public.productos_revision_precio FOR UPDATE
TO authenticated
USING (
  public.has_any_role(ARRAY['admin'::app_role, 'secretaria'::app_role, 'contadora'::app_role])
);

-- Create index for common queries
CREATE INDEX idx_revision_precio_status ON public.productos_revision_precio(status);
CREATE INDEX idx_revision_precio_producto ON public.productos_revision_precio(producto_id);