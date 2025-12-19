-- Create proveedor_contactos table
CREATE TABLE public.proveedor_contactos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id UUID NOT NULL REFERENCES public.proveedores(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  telefono TEXT NOT NULL,
  puesto TEXT, -- General, Ventas, Cobranza, Logística, Devoluciones
  es_principal BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.proveedor_contactos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins y secretarias pueden gestionar contactos proveedores"
ON public.proveedor_contactos
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretaria'::app_role));

CREATE POLICY "Usuarios autenticados pueden ver contactos proveedores"
ON public.proveedor_contactos
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Index for faster lookups
CREATE INDEX idx_proveedor_contactos_proveedor_id ON public.proveedor_contactos(proveedor_id);

-- Trigger for updated_at
CREATE TRIGGER update_proveedor_contactos_updated_at
BEFORE UPDATE ON public.proveedor_contactos
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();