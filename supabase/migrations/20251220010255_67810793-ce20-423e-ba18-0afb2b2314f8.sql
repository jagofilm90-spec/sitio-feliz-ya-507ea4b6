-- Crear tabla para registro de correos enviados
CREATE TABLE public.correos_enviados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL, -- 'orden_compra', 'orden_compra_confirmacion', 'pago_proveedor', 'recordatorio_oc'
  referencia_id UUID, -- ID de la OC, pago, etc.
  destinatario TEXT NOT NULL,
  asunto TEXT NOT NULL,
  gmail_message_id TEXT, -- ID que devuelve Gmail para tracking
  gmail_cuenta_id UUID REFERENCES gmail_cuentas(id),
  enviado_por UUID REFERENCES profiles(id),
  fecha_envio TIMESTAMPTZ DEFAULT now(),
  contenido_preview TEXT, -- Primeros 500 chars del contenido
  error TEXT, -- Si hubo error al enviar
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para búsquedas eficientes
CREATE INDEX idx_correos_enviados_tipo_referencia ON public.correos_enviados(tipo, referencia_id);
CREATE INDEX idx_correos_enviados_destinatario ON public.correos_enviados(destinatario);
CREATE INDEX idx_correos_enviados_fecha ON public.correos_enviados(fecha_envio DESC);

-- Habilitar RLS
ALTER TABLE public.correos_enviados ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins y secretarias pueden ver todos los correos enviados"
ON public.correos_enviados FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretaria'::app_role));

CREATE POLICY "Usuarios autenticados pueden insertar correos"
ON public.correos_enviados FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Comentario descriptivo
COMMENT ON TABLE public.correos_enviados IS 'Registro de todos los correos enviados por el sistema para auditoría y tracking';