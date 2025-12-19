-- Create table for supplier responses (confirmations and date proposals)
CREATE TABLE public.ordenes_compra_respuestas_proveedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_compra_id UUID NOT NULL REFERENCES ordenes_compra(id) ON DELETE CASCADE,
  entrega_id UUID REFERENCES ordenes_compra_entregas(id) ON DELETE SET NULL,
  tipo_respuesta TEXT NOT NULL CHECK (tipo_respuesta IN ('confirmado', 'propuesta_fecha')),
  fecha_original DATE,
  fecha_propuesta DATE,
  motivo TEXT,
  ip_address TEXT,
  user_agent TEXT,
  revisado BOOLEAN DEFAULT false,
  revisado_por UUID,
  revisado_en TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ordenes_compra_respuestas_proveedor ENABLE ROW LEVEL SECURITY;

-- Policies: Admins and secretarias can manage, authenticated users can view
CREATE POLICY "Admins y secretarias pueden gestionar respuestas proveedor"
ON public.ordenes_compra_respuestas_proveedor
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretaria'::app_role));

CREATE POLICY "Usuarios autenticados pueden ver respuestas proveedor"
ON public.ordenes_compra_respuestas_proveedor
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Index for faster lookups
CREATE INDEX idx_respuestas_proveedor_orden ON public.ordenes_compra_respuestas_proveedor(orden_compra_id);
CREATE INDEX idx_respuestas_proveedor_no_revisadas ON public.ordenes_compra_respuestas_proveedor(revisado) WHERE revisado = false;