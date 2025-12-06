-- Fase 1: Crear tablas para sistema de carga digital

-- 1.1 Tabla de productos cargados por entrega
CREATE TABLE public.carga_productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id UUID REFERENCES entregas(id) ON DELETE CASCADE NOT NULL,
  pedido_detalle_id UUID REFERENCES pedidos_detalles(id) ON DELETE CASCADE NOT NULL,
  lote_id UUID REFERENCES inventario_lotes(id),
  cantidad_solicitada NUMERIC NOT NULL,
  cantidad_cargada NUMERIC DEFAULT 0,
  cargado BOOLEAN DEFAULT false,
  cargado_por UUID REFERENCES profiles(id),
  cargado_en TIMESTAMP WITH TIME ZONE,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 1.2 Tabla de devoluciones
CREATE TABLE public.devoluciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id UUID REFERENCES entregas(id) ON DELETE CASCADE NOT NULL,
  pedido_detalle_id UUID REFERENCES pedidos_detalles(id) ON DELETE CASCADE NOT NULL,
  lote_id UUID REFERENCES inventario_lotes(id),
  cantidad_devuelta NUMERIC NOT NULL,
  motivo TEXT NOT NULL,
  registrado_por UUID REFERENCES profiles(id) NOT NULL,
  reingresado_a_inventario BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 1.3 Agregar columnas a rutas para control de carga
ALTER TABLE public.rutas 
ADD COLUMN IF NOT EXISTS carga_completada BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS carga_completada_por UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS carga_completada_en TIMESTAMP WITH TIME ZONE;

-- 1.4 Habilitar RLS
ALTER TABLE public.carga_productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devoluciones ENABLE ROW LEVEL SECURITY;

-- 1.5 Políticas RLS para carga_productos
CREATE POLICY "Admins y almacen pueden gestionar cargas"
ON public.carga_productos
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'almacen'::app_role));

CREATE POLICY "Usuarios autenticados pueden ver cargas"
ON public.carga_productos
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 1.6 Políticas RLS para devoluciones
CREATE POLICY "Admins y almacen pueden gestionar devoluciones"
ON public.devoluciones
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'almacen'::app_role));

CREATE POLICY "Usuarios autenticados pueden ver devoluciones"
ON public.devoluciones
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 1.7 Triggers para updated_at
CREATE TRIGGER update_carga_productos_updated_at
BEFORE UPDATE ON public.carga_productos
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 1.8 Índices para rendimiento
CREATE INDEX idx_carga_productos_entrega ON public.carga_productos(entrega_id);
CREATE INDEX idx_carga_productos_lote ON public.carga_productos(lote_id);
CREATE INDEX idx_devoluciones_entrega ON public.devoluciones(entrega_id);
CREATE INDEX idx_rutas_carga_completada ON public.rutas(carga_completada) WHERE carga_completada = false;