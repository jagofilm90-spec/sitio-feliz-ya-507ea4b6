-- ==============================================
-- FASE 1: Sistema de Gestión de Flotilla
-- ==============================================

-- 1. Tabla de Checkups de Vehículos
CREATE TABLE public.vehiculos_checkups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id UUID REFERENCES public.vehiculos(id) NOT NULL,
  chofer_id UUID REFERENCES public.empleados(id),
  realizado_por UUID REFERENCES public.empleados(id) NOT NULL,
  fecha_checkup TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Checklist de 12 items
  frenos_ok BOOLEAN DEFAULT false,
  luces_ok BOOLEAN DEFAULT false,
  llantas_ok BOOLEAN DEFAULT false,
  aceite_ok BOOLEAN DEFAULT false,
  anticongelante_ok BOOLEAN DEFAULT false,
  espejos_ok BOOLEAN DEFAULT false,
  limpiadores_ok BOOLEAN DEFAULT false,
  bateria_ok BOOLEAN DEFAULT false,
  direccion_ok BOOLEAN DEFAULT false,
  suspension_ok BOOLEAN DEFAULT false,
  escape_ok BOOLEAN DEFAULT false,
  cinturones_ok BOOLEAN DEFAULT false,
  
  -- Observaciones y fallas
  fallas_detectadas TEXT,
  requiere_reparacion BOOLEAN DEFAULT false,
  prioridad TEXT CHECK (prioridad IN ('baja', 'media', 'alta', 'urgente')),
  
  -- Seguimiento
  notificado_mecanico BOOLEAN DEFAULT false,
  notificado_en TIMESTAMP WITH TIME ZONE,
  resuelto BOOLEAN DEFAULT false,
  resuelto_en TIMESTAMP WITH TIME ZONE,
  notas_resolucion TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para checkups
CREATE INDEX idx_vehiculos_checkups_vehiculo ON public.vehiculos_checkups(vehiculo_id);
CREATE INDEX idx_vehiculos_checkups_fecha ON public.vehiculos_checkups(fecha_checkup DESC);
CREATE INDEX idx_vehiculos_checkups_pendientes ON public.vehiculos_checkups(resuelto) WHERE resuelto = false;

-- 2. Tabla de Verificaciones Vehiculares
CREATE TABLE public.vehiculos_verificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id UUID REFERENCES public.vehiculos(id) NOT NULL,
  anio INTEGER NOT NULL,
  semestre INTEGER CHECK (semestre IN (1, 2)),
  fecha_verificacion DATE,
  resultado TEXT CHECK (resultado IN ('aprobado', 'rechazado', 'condicionado', 'pendiente')),
  certificado_url TEXT,
  proximo_periodo_inicio DATE,
  proximo_periodo_fin DATE,
  notificado BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice único para evitar duplicados
CREATE UNIQUE INDEX idx_vehiculos_verificaciones_unico ON public.vehiculos_verificaciones(vehiculo_id, anio, semestre);
CREATE INDEX idx_vehiculos_verificaciones_pendientes ON public.vehiculos_verificaciones(resultado) WHERE resultado = 'pendiente';

-- 3. Tabla de Configuración de Flotilla
CREATE TABLE public.configuracion_flotilla (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave TEXT UNIQUE NOT NULL,
  valor TEXT NOT NULL,
  descripcion TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar configuración inicial
INSERT INTO public.configuracion_flotilla (clave, valor, descripcion) VALUES
  ('email_mecanico', '', 'Correo electrónico del mecánico para reportes de checkups'),
  ('dias_alerta_licencia', '30', 'Días de anticipación para alertar vencimiento de licencias'),
  ('dias_alerta_verificacion', '15', 'Días de anticipación para alertar período de verificación'),
  ('dias_alerta_documentos', '30', 'Días de anticipación para alertar vencimiento de documentos');

-- 4. Agregar columna vehiculo_id a notificaciones (si no existe)
ALTER TABLE public.notificaciones ADD COLUMN IF NOT EXISTS vehiculo_id UUID REFERENCES public.vehiculos(id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_vehiculo ON public.notificaciones(vehiculo_id);

-- ==============================================
-- RLS Policies
-- ==============================================

-- Habilitar RLS en nuevas tablas
ALTER TABLE public.vehiculos_checkups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehiculos_verificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_flotilla ENABLE ROW LEVEL SECURITY;

-- Políticas para vehiculos_checkups
CREATE POLICY "Admins y gerente almacen pueden ver checkups"
  ON public.vehiculos_checkups FOR SELECT
  USING (public.has_any_role(ARRAY['admin'::app_role, 'gerente_almacen'::app_role, 'almacen'::app_role]));

CREATE POLICY "Admins y gerente almacen pueden crear checkups"
  ON public.vehiculos_checkups FOR INSERT
  WITH CHECK (public.has_any_role(ARRAY['admin'::app_role, 'gerente_almacen'::app_role, 'almacen'::app_role]));

CREATE POLICY "Admins y gerente almacen pueden actualizar checkups"
  ON public.vehiculos_checkups FOR UPDATE
  USING (public.has_any_role(ARRAY['admin'::app_role, 'gerente_almacen'::app_role]));

-- Políticas para vehiculos_verificaciones
CREATE POLICY "Admins y gerente almacen pueden ver verificaciones"
  ON public.vehiculos_verificaciones FOR SELECT
  USING (public.has_any_role(ARRAY['admin'::app_role, 'gerente_almacen'::app_role, 'almacen'::app_role]));

CREATE POLICY "Admins y gerente almacen pueden gestionar verificaciones"
  ON public.vehiculos_verificaciones FOR ALL
  USING (public.has_any_role(ARRAY['admin'::app_role, 'gerente_almacen'::app_role]));

-- Políticas para configuracion_flotilla
CREATE POLICY "Admins y gerente almacen pueden ver config flotilla"
  ON public.configuracion_flotilla FOR SELECT
  USING (public.has_any_role(ARRAY['admin'::app_role, 'gerente_almacen'::app_role]));

CREATE POLICY "Solo admins pueden modificar config flotilla"
  ON public.configuracion_flotilla FOR ALL
  USING (public.has_any_role(ARRAY['admin'::app_role, 'gerente_almacen'::app_role]));

-- Trigger para updated_at en verificaciones
CREATE TRIGGER update_vehiculos_verificaciones_updated_at
  BEFORE UPDATE ON public.vehiculos_verificaciones
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para updated_at en configuracion
CREATE TRIGGER update_configuracion_flotilla_updated_at
  BEFORE UPDATE ON public.configuracion_flotilla
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();