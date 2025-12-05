-- Crear tabla de configuración de empresa
CREATE TABLE public.configuracion_empresa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clave text UNIQUE NOT NULL,
  valor jsonb NOT NULL,
  descripcion text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.configuracion_empresa ENABLE ROW LEVEL SECURITY;

-- Políticas: todos autenticados pueden leer, solo admin puede modificar
CREATE POLICY "Usuarios autenticados pueden ver configuración"
ON public.configuracion_empresa FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Solo admins pueden gestionar configuración"
ON public.configuracion_empresa FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insertar ubicación de bodega principal
INSERT INTO public.configuracion_empresa (clave, valor, descripcion) VALUES
('bodega_principal', '{
  "nombre": "Bodega 1 - Melchor Campo",
  "direccion": "Melchor Campo #59, Col. Centro, CDMX",
  "latitud": 19.408680132961802,
  "longitud": -99.12108443546356
}'::jsonb, 'Ubicación desde donde salen las rutas de entrega');

-- Trigger para updated_at
CREATE TRIGGER update_configuracion_empresa_updated_at
BEFORE UPDATE ON public.configuracion_empresa
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();