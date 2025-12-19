-- Create table for storing supplier emails
CREATE TABLE public.proveedor_correos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id UUID NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nombre_contacto TEXT,
  proposito TEXT DEFAULT 'pagos', -- 'pagos', 'ordenes', 'general'
  es_principal BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.proveedor_correos ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins y secretarias pueden gestionar correos proveedores"
ON public.proveedor_correos
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretaria'::app_role));

CREATE POLICY "Usuarios autenticados pueden ver correos proveedores"
ON public.proveedor_correos
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_proveedor_correos_updated_at
BEFORE UPDATE ON public.proveedor_correos
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();