-- Tabla para solicitudes de venta desde almacén
CREATE TABLE public.solicitudes_venta_mostrador (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio VARCHAR(20) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'procesando', 'lista', 'pagada', 'entregada', 'cancelada')),
  
  -- Productos solicitados (JSON simple)
  productos_solicitados JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Datos calculados por oficina
  factura_id UUID REFERENCES public.facturas(id),
  total DECIMAL(12,2),
  forma_pago VARCHAR(20) CHECK (forma_pago IN ('efectivo', 'transferencia')),
  referencia_pago VARCHAR(100),
  
  -- Tracking
  solicitante_id UUID REFERENCES public.empleados(id),
  procesado_por UUID REFERENCES public.empleados(id),
  fecha_solicitud TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_procesado TIMESTAMP WITH TIME ZONE,
  fecha_pagado TIMESTAMP WITH TIME ZONE,
  fecha_entregado TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas frecuentes
CREATE INDEX idx_solicitudes_venta_status ON public.solicitudes_venta_mostrador(status);
CREATE INDEX idx_solicitudes_venta_fecha ON public.solicitudes_venta_mostrador(fecha_solicitud DESC);
CREATE INDEX idx_solicitudes_venta_solicitante ON public.solicitudes_venta_mostrador(solicitante_id);

-- Trigger para updated_at
CREATE TRIGGER update_solicitudes_venta_mostrador_updated_at
  BEFORE UPDATE ON public.solicitudes_venta_mostrador
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Habilitar realtime para notificaciones instantáneas
ALTER PUBLICATION supabase_realtime ADD TABLE public.solicitudes_venta_mostrador;

-- RLS
ALTER TABLE public.solicitudes_venta_mostrador ENABLE ROW LEVEL SECURITY;

-- Política: empleados autenticados pueden ver todas las solicitudes
CREATE POLICY "Usuarios autenticados pueden ver solicitudes" 
  ON public.solicitudes_venta_mostrador
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- Política: empleados autenticados pueden crear solicitudes
CREATE POLICY "Usuarios autenticados pueden crear solicitudes" 
  ON public.solicitudes_venta_mostrador
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Política: empleados autenticados pueden actualizar solicitudes
CREATE POLICY "Usuarios autenticados pueden actualizar solicitudes" 
  ON public.solicitudes_venta_mostrador
  FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

-- Función para generar folio de solicitud de venta
CREATE OR REPLACE FUNCTION public.generar_folio_venta_mostrador()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year_month TEXT;
  last_folio TEXT;
  last_number INTEGER;
  new_number INTEGER;
  new_folio TEXT;
BEGIN
  current_year_month := TO_CHAR(NOW(), 'YYYYMM');
  
  SELECT folio INTO last_folio
  FROM solicitudes_venta_mostrador
  WHERE folio LIKE 'VM-' || current_year_month || '-%'
  ORDER BY folio DESC
  LIMIT 1;
  
  IF last_folio IS NULL THEN
    new_number := 1;
  ELSE
    last_number := CAST(SUBSTRING(last_folio FROM 11 FOR 4) AS INTEGER);
    new_number := last_number + 1;
  END IF;
  
  new_folio := 'VM-' || current_year_month || '-' || LPAD(new_number::TEXT, 4, '0');
  
  RETURN new_folio;
END;
$$;