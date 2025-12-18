
-- Create proveedor_facturas table
CREATE TABLE public.proveedor_facturas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  orden_compra_id UUID NOT NULL REFERENCES public.ordenes_compra(id) ON DELETE CASCADE,
  numero_factura TEXT NOT NULL,
  fecha_factura DATE NOT NULL DEFAULT CURRENT_DATE,
  monto_total NUMERIC NOT NULL DEFAULT 0,
  archivo_url TEXT,
  tipo_pago TEXT NOT NULL DEFAULT 'contra_entrega' CHECK (tipo_pago IN ('anticipado', 'contra_entrega')),
  status_pago TEXT NOT NULL DEFAULT 'pendiente' CHECK (status_pago IN ('pendiente', 'pagado')),
  fecha_pago DATE,
  referencia_pago TEXT,
  comprobante_pago_url TEXT,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  creado_por UUID REFERENCES auth.users(id)
);

-- Create proveedor_factura_entregas table (links invoices to specific deliveries)
CREATE TABLE public.proveedor_factura_entregas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  factura_id UUID NOT NULL REFERENCES public.proveedor_facturas(id) ON DELETE CASCADE,
  entrega_id UUID NOT NULL REFERENCES public.ordenes_compra_entregas(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'recibido')),
  fecha_recepcion TIMESTAMP WITH TIME ZONE,
  recibido_por UUID REFERENCES auth.users(id),
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(factura_id, entrega_id)
);

-- Enable RLS
ALTER TABLE public.proveedor_facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedor_factura_entregas ENABLE ROW LEVEL SECURITY;

-- RLS policies for proveedor_facturas
CREATE POLICY "Admins y secretarias pueden gestionar facturas proveedor"
ON public.proveedor_facturas
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretaria'::app_role));

CREATE POLICY "Almacenistas pueden ver facturas proveedor"
ON public.proveedor_facturas
FOR SELECT
USING (has_role(auth.uid(), 'almacen'::app_role));

CREATE POLICY "Usuarios autenticados pueden ver facturas proveedor"
ON public.proveedor_facturas
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- RLS policies for proveedor_factura_entregas
CREATE POLICY "Admins y secretarias pueden gestionar enlaces factura-entrega"
ON public.proveedor_factura_entregas
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretaria'::app_role));

CREATE POLICY "Almacenistas pueden actualizar enlaces factura-entrega"
ON public.proveedor_factura_entregas
FOR UPDATE
USING (has_role(auth.uid(), 'almacen'::app_role));

CREATE POLICY "Usuarios autenticados pueden ver enlaces factura-entrega"
ON public.proveedor_factura_entregas
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Create storage bucket for supplier invoices
INSERT INTO storage.buckets (id, name, public) VALUES ('proveedor-facturas', 'proveedor-facturas', false);

-- Storage policies for proveedor-facturas bucket
CREATE POLICY "Admins y secretarias pueden subir facturas proveedor"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'proveedor-facturas' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretaria'::app_role)));

CREATE POLICY "Usuarios autenticados pueden ver facturas proveedor"
ON storage.objects
FOR SELECT
USING (bucket_id = 'proveedor-facturas' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins y secretarias pueden eliminar facturas proveedor"
ON storage.objects
FOR DELETE
USING (bucket_id = 'proveedor-facturas' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretaria'::app_role)));

-- Trigger for updated_at
CREATE TRIGGER update_proveedor_facturas_updated_at
BEFORE UPDATE ON public.proveedor_facturas
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add indexes for performance
CREATE INDEX idx_proveedor_facturas_orden_compra ON public.proveedor_facturas(orden_compra_id);
CREATE INDEX idx_proveedor_factura_entregas_factura ON public.proveedor_factura_entregas(factura_id);
CREATE INDEX idx_proveedor_factura_entregas_entrega ON public.proveedor_factura_entregas(entrega_id);
