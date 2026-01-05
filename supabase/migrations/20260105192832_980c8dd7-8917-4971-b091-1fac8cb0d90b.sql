-- Agregar configuración de comisión a empleados
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS porcentaje_comision DECIMAL(5,2) DEFAULT 1.00;
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS periodo_comision VARCHAR(20) DEFAULT 'quincenal';

-- Agregar días de visita preferidos a clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS dias_visita_preferidos TEXT[];

-- Crear tabla para registro de comisiones
CREATE TABLE IF NOT EXISTS comisiones_vendedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID REFERENCES empleados(id) NOT NULL,
  periodo_inicio DATE NOT NULL,
  periodo_fin DATE NOT NULL,
  total_ventas DECIMAL(12,2) NOT NULL DEFAULT 0,
  porcentaje_aplicado DECIMAL(5,2) NOT NULL,
  monto_comision DECIMAL(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pendiente',
  fecha_pago DATE,
  forma_pago VARCHAR(20),
  referencia_pago VARCHAR(100),
  notas TEXT,
  calculado_por UUID REFERENCES profiles(id),
  aprobado_por UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(empleado_id, periodo_inicio, periodo_fin)
);

-- Crear tabla para detalle de comisiones
CREATE TABLE IF NOT EXISTS comisiones_detalle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comision_id UUID REFERENCES comisiones_vendedor(id) ON DELETE CASCADE,
  pedido_id UUID REFERENCES pedidos(id),
  factura_id UUID REFERENCES facturas(id),
  monto_venta DECIMAL(12,2) NOT NULL,
  monto_comision DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_comisiones_empleado ON comisiones_vendedor(empleado_id);
CREATE INDEX IF NOT EXISTS idx_comisiones_periodo ON comisiones_vendedor(periodo_inicio, periodo_fin);
CREATE INDEX IF NOT EXISTS idx_comisiones_detalle_comision ON comisiones_detalle(comision_id);

-- RLS para comisiones_vendedor
ALTER TABLE comisiones_vendedor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins y contadoras pueden ver todas las comisiones"
ON comisiones_vendedor FOR SELECT
USING (
  has_any_role(ARRAY['admin', 'contadora']::app_role[])
);

CREATE POLICY "Admins pueden gestionar comisiones"
ON comisiones_vendedor FOR ALL
USING (has_any_role(ARRAY['admin']::app_role[]));

-- RLS para comisiones_detalle
ALTER TABLE comisiones_detalle ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins y contadoras pueden ver detalles de comisiones"
ON comisiones_detalle FOR SELECT
USING (
  has_any_role(ARRAY['admin', 'contadora']::app_role[])
);

CREATE POLICY "Admins pueden gestionar detalles de comisiones"
ON comisiones_detalle FOR ALL
USING (has_any_role(ARRAY['admin']::app_role[]));