-- Tabla para múltiples teléfonos por cliente
CREATE TABLE public.cliente_telefonos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
  telefono TEXT NOT NULL,
  etiqueta TEXT, -- "Principal", "WhatsApp", "Oficina", etc.
  es_principal BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla para múltiples contactos por cliente
CREATE TABLE public.cliente_contactos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
  nombre TEXT NOT NULL,
  puesto TEXT, -- "Comprador", "Gerente", "Encargado", etc.
  es_principal BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cliente_telefonos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_contactos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cliente_telefonos
CREATE POLICY "Admins can manage all client phones"
ON public.cliente_telefonos
FOR ALL
TO authenticated
USING (public.has_any_role(ARRAY['admin'::app_role]));

CREATE POLICY "Vendedores can manage phones of their clients"
ON public.cliente_telefonos
FOR ALL
TO authenticated
USING (
  public.has_any_role(ARRAY['vendedor'::app_role]) AND
  public.es_vendedor_de_cliente(cliente_id)
);

-- RLS Policies for cliente_contactos
CREATE POLICY "Admins can manage all client contacts"
ON public.cliente_contactos
FOR ALL
TO authenticated
USING (public.has_any_role(ARRAY['admin'::app_role]));

CREATE POLICY "Vendedores can manage contacts of their clients"
ON public.cliente_contactos
FOR ALL
TO authenticated
USING (
  public.has_any_role(ARRAY['vendedor'::app_role]) AND
  public.es_vendedor_de_cliente(cliente_id)
);

-- Triggers for updated_at
CREATE TRIGGER update_cliente_telefonos_updated_at
BEFORE UPDATE ON public.cliente_telefonos
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_cliente_contactos_updated_at
BEFORE UPDATE ON public.cliente_contactos
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Indexes for performance
CREATE INDEX idx_cliente_telefonos_cliente_id ON public.cliente_telefonos(cliente_id);
CREATE INDEX idx_cliente_contactos_cliente_id ON public.cliente_contactos(cliente_id);