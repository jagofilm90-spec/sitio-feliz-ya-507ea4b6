-- Tabla principal de pagos de clientes
CREATE TABLE public.pagos_cliente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  
  -- Monto y distribución
  monto_total DECIMAL(12,2) NOT NULL,
  monto_aplicado DECIMAL(12,2) DEFAULT 0,
  
  -- Forma de pago
  forma_pago VARCHAR(30) NOT NULL CHECK (forma_pago IN ('efectivo', 'transferencia', 'deposito', 'cheque')),
  referencia VARCHAR(100),
  comprobante_url TEXT,
  
  -- Status y validación
  status VARCHAR(20) DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'validado', 'rechazado')),
  requiere_validacion BOOLEAN DEFAULT false,
  
  -- Auditoría
  registrado_por UUID REFERENCES auth.users(id),
  validado_por UUID REFERENCES auth.users(id),
  fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT now(),
  fecha_validacion TIMESTAMP WITH TIME ZONE,
  notas TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla de detalle para aplicar pagos a facturas
CREATE TABLE public.pagos_cliente_detalle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pago_id UUID NOT NULL REFERENCES public.pagos_cliente(id) ON DELETE CASCADE,
  factura_id UUID NOT NULL REFERENCES public.facturas(id) ON DELETE RESTRICT,
  monto_aplicado DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para mejor performance
CREATE INDEX idx_pagos_cliente_cliente_id ON public.pagos_cliente(cliente_id);
CREATE INDEX idx_pagos_cliente_status ON public.pagos_cliente(status);
CREATE INDEX idx_pagos_cliente_registrado_por ON public.pagos_cliente(registrado_por);
CREATE INDEX idx_pagos_cliente_fecha ON public.pagos_cliente(fecha_registro);
CREATE INDEX idx_pagos_cliente_detalle_pago_id ON public.pagos_cliente_detalle(pago_id);
CREATE INDEX idx_pagos_cliente_detalle_factura_id ON public.pagos_cliente_detalle(factura_id);

-- Trigger para updated_at
CREATE TRIGGER update_pagos_cliente_updated_at
  BEFORE UPDATE ON public.pagos_cliente
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Habilitar RLS
ALTER TABLE public.pagos_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos_cliente_detalle ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para pagos_cliente
-- Admins y roles autorizados pueden ver todos los pagos
CREATE POLICY "Admins can manage all pagos"
  ON public.pagos_cliente
  FOR ALL
  TO authenticated
  USING (public.has_any_role(ARRAY['admin'::app_role, 'secretaria'::app_role, 'contadora'::app_role]));

-- Vendedores solo ven pagos de sus clientes
CREATE POLICY "Vendedores can view their clients pagos"
  ON public.pagos_cliente
  FOR SELECT
  TO authenticated
  USING (
    public.has_any_role(ARRAY['vendedor'::app_role]) 
    AND public.es_vendedor_de_cliente(cliente_id)
  );

-- Vendedores pueden crear pagos para sus clientes
CREATE POLICY "Vendedores can insert pagos for their clients"
  ON public.pagos_cliente
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_any_role(ARRAY['vendedor'::app_role]) 
    AND public.es_vendedor_de_cliente(cliente_id)
    AND registrado_por = auth.uid()
  );

-- Políticas RLS para pagos_cliente_detalle
CREATE POLICY "Admins can manage all pagos detalle"
  ON public.pagos_cliente_detalle
  FOR ALL
  TO authenticated
  USING (
    public.has_any_role(ARRAY['admin'::app_role, 'secretaria'::app_role, 'contadora'::app_role])
  );

-- Vendedores ven detalles de pagos de sus clientes
CREATE POLICY "Vendedores can view their pagos detalle"
  ON public.pagos_cliente_detalle
  FOR SELECT
  TO authenticated
  USING (
    public.has_any_role(ARRAY['vendedor'::app_role])
    AND EXISTS (
      SELECT 1 FROM public.pagos_cliente p
      WHERE p.id = pago_id
      AND public.es_vendedor_de_cliente(p.cliente_id)
    )
  );

-- Vendedores pueden insertar detalles para sus pagos
CREATE POLICY "Vendedores can insert pagos detalle"
  ON public.pagos_cliente_detalle
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_any_role(ARRAY['vendedor'::app_role])
    AND EXISTS (
      SELECT 1 FROM public.pagos_cliente p
      WHERE p.id = pago_id
      AND public.es_vendedor_de_cliente(p.cliente_id)
      AND p.registrado_por = auth.uid()
    )
  );

-- Función para actualizar saldo del cliente cuando se valida un pago
CREATE OR REPLACE FUNCTION public.actualizar_saldo_cliente_pago()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si el pago se validó, actualizar el saldo del cliente
  IF NEW.status = 'validado' AND OLD.status = 'pendiente' THEN
    UPDATE public.clientes
    SET saldo_pendiente = COALESCE(saldo_pendiente, 0) - NEW.monto_aplicado
    WHERE id = NEW.cliente_id;
  END IF;
  
  -- Si el pago se rechazó después de estar validado, revertir
  IF NEW.status = 'rechazado' AND OLD.status = 'validado' THEN
    UPDATE public.clientes
    SET saldo_pendiente = COALESCE(saldo_pendiente, 0) + OLD.monto_aplicado
    WHERE id = NEW.cliente_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_actualizar_saldo_pago
  AFTER UPDATE ON public.pagos_cliente
  FOR EACH ROW
  EXECUTE FUNCTION public.actualizar_saldo_cliente_pago();