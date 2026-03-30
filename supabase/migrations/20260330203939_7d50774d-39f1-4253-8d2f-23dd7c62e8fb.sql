-- Tabla de asistencia para registros del ZKTeco
CREATE TABLE public.asistencia (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zk_user_id TEXT NOT NULL,
  dispositivo TEXT NOT NULL,
  fecha_hora TIMESTAMPTZ NOT NULL,
  fecha DATE,
  hora TIME,
  tipo TEXT,
  zk_status INTEGER,
  empleado_id UUID REFERENCES public.empleados(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice único para evitar duplicados
CREATE UNIQUE INDEX idx_asistencia_unique ON public.asistencia (zk_user_id, dispositivo, fecha_hora);

-- Índices para consultas frecuentes
CREATE INDEX idx_asistencia_fecha ON public.asistencia (fecha);
CREATE INDEX idx_asistencia_empleado ON public.asistencia (empleado_id);

-- Habilitar RLS
ALTER TABLE public.asistencia ENABLE ROW LEVEL SECURITY;

-- Políticas: solo admin y secretaria pueden ver
CREATE POLICY "Admin y secretaria pueden ver asistencia"
  ON public.asistencia FOR SELECT TO authenticated
  USING (public.has_any_role(ARRAY['admin'::app_role, 'secretaria'::app_role]));

-- La edge function usa service_role, no necesita política de INSERT para usuarios
CREATE POLICY "Service role puede insertar asistencia"
  ON public.asistencia FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role puede actualizar asistencia"
  ON public.asistencia FOR UPDATE
  USING (true);
