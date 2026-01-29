-- 1. Nueva tabla para créditos pendientes de proveedores
CREATE TABLE proveedor_creditos_pendientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id UUID REFERENCES proveedores(id),
  proveedor_nombre_manual TEXT,
  
  -- Origen del crédito
  orden_compra_origen_id UUID REFERENCES ordenes_compra(id) NOT NULL,
  devolucion_id UUID REFERENCES devoluciones_proveedor(id),
  entrega_id UUID REFERENCES ordenes_compra_entregas(id),
  
  -- Detalle
  producto_id UUID REFERENCES productos(id),
  producto_nombre TEXT NOT NULL,
  cantidad NUMERIC NOT NULL,
  precio_unitario NUMERIC NOT NULL,
  monto_total NUMERIC NOT NULL,
  motivo TEXT NOT NULL,
  notas TEXT,
  
  -- Estado
  status TEXT NOT NULL DEFAULT 'pendiente',
  
  -- Resolución
  orden_compra_aplicada_id UUID REFERENCES ordenes_compra(id),
  fecha_aplicacion TIMESTAMPTZ,
  tipo_resolucion TEXT,
  resolucion_notas TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Nuevas columnas en ordenes_compra para créditos aplicados
ALTER TABLE ordenes_compra 
ADD COLUMN IF NOT EXISTS creditos_aplicados NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS creditos_aplicados_detalle JSONB;

-- 3. Habilitar RLS
ALTER TABLE proveedor_creditos_pendientes ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS para roles internos
CREATE POLICY "Roles internos pueden ver créditos pendientes"
ON proveedor_creditos_pendientes FOR SELECT
USING (public.has_any_role(ARRAY['admin', 'secretaria', 'almacen', 'gerente_almacen', 'contadora']::app_role[]));

CREATE POLICY "Roles internos pueden insertar créditos"
ON proveedor_creditos_pendientes FOR INSERT
WITH CHECK (public.has_any_role(ARRAY['admin', 'secretaria', 'almacen', 'gerente_almacen']::app_role[]));

CREATE POLICY "Roles internos pueden actualizar créditos"
ON proveedor_creditos_pendientes FOR UPDATE
USING (public.has_any_role(ARRAY['admin', 'secretaria', 'contadora']::app_role[]));

-- 5. Índices para performance
CREATE INDEX idx_creditos_proveedor ON proveedor_creditos_pendientes(proveedor_id);
CREATE INDEX idx_creditos_status ON proveedor_creditos_pendientes(status);
CREATE INDEX idx_creditos_oc_origen ON proveedor_creditos_pendientes(orden_compra_origen_id);

-- 6. Trigger para updated_at
CREATE TRIGGER update_proveedor_creditos_pendientes_updated_at
  BEFORE UPDATE ON proveedor_creditos_pendientes
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();