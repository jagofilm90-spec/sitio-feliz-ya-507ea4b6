
-- Add es_cortesia field to pedidos_detalles for courtesy/complimentary items
ALTER TABLE public.pedidos_detalles 
ADD COLUMN es_cortesia boolean DEFAULT false;

COMMENT ON COLUMN public.pedidos_detalles.es_cortesia IS 'Indica si el producto es una cortesía sin cargo (playo, cubrebocas, cofia, etc.)';

-- Create table for default courtesies per client
CREATE TABLE public.cliente_cortesias_default (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  producto_id uuid NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  cantidad numeric NOT NULL DEFAULT 1,
  notas text,
  activo boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(cliente_id, producto_id)
);

-- Enable RLS
ALTER TABLE public.cliente_cortesias_default ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins y secretarias pueden gestionar cortesías" 
ON public.cliente_cortesias_default 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretaria'::app_role));

CREATE POLICY "Usuarios autenticados pueden ver cortesías" 
ON public.cliente_cortesias_default 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_cliente_cortesias_default_updated_at
BEFORE UPDATE ON public.cliente_cortesias_default
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
