-- Fase 1: Tabla de disponibilidad de personal
CREATE TABLE public.disponibilidad_personal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha DATE NOT NULL,
  empleado_id UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  disponible BOOLEAN NOT NULL DEFAULT true,
  hora_entrada TIME,
  hora_salida TIME,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(fecha, empleado_id)
);

-- Enable RLS
ALTER TABLE public.disponibilidad_personal ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins y secretarias pueden gestionar disponibilidad"
ON public.disponibilidad_personal
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretaria'::app_role));

CREATE POLICY "Usuarios autenticados pueden ver disponibilidad"
ON public.disponibilidad_personal
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fase 3: Actualizar regiones en zonas existentes
UPDATE public.zonas SET region = 'cdmx_norte' WHERE nombre ILIKE '%Gustavo A. Madero%' OR nombre ILIKE '%GAM%' OR nombre ILIKE '%Azcapotzalco%';
UPDATE public.zonas SET region = 'cdmx_centro' WHERE nombre ILIKE '%Cuauhtémoc%' OR nombre ILIKE '%Benito Juárez%' OR nombre ILIKE '%Miguel Hidalgo%' OR nombre ILIKE '%Centro%';
UPDATE public.zonas SET region = 'cdmx_sur' WHERE nombre ILIKE '%Tlalpan%' OR nombre ILIKE '%Coyoacán%' OR nombre ILIKE '%Milpa Alta%' OR nombre ILIKE '%Tláhuac%' OR nombre ILIKE '%Xochimilco%';
UPDATE public.zonas SET region = 'cdmx_oriente' WHERE nombre ILIKE '%Iztapalapa%' OR nombre ILIKE '%Iztacalco%' OR nombre ILIKE '%Venustiano%';
UPDATE public.zonas SET region = 'cdmx_poniente' WHERE nombre ILIKE '%Álvaro Obregón%' OR nombre ILIKE '%Cuajimalpa%' OR nombre ILIKE '%Magdalena Contreras%';
UPDATE public.zonas SET region = 'edomex_norte' WHERE nombre ILIKE '%Ecatepec%' OR nombre ILIKE '%Tlalnepantla%' OR nombre ILIKE '%Naucalpan%' OR nombre ILIKE '%Cuautitlán%' OR nombre ILIKE '%Tultitlán%' OR nombre ILIKE '%Coacalco%' OR nombre ILIKE '%Atizapán%';
UPDATE public.zonas SET region = 'edomex_oriente' WHERE nombre ILIKE '%Nezahualcóyotl%' OR nombre ILIKE '%Chimalhuacán%' OR nombre ILIKE '%Chalco%' OR nombre ILIKE '%Texcoco%' OR nombre ILIKE '%La Paz%' OR nombre ILIKE '%Ixtapaluca%';
UPDATE public.zonas SET region = 'toluca' WHERE nombre ILIKE '%Toluca%' OR nombre ILIKE '%Lerma%' OR nombre ILIKE '%Metepec%';
UPDATE public.zonas SET region = 'morelos' WHERE nombre ILIKE '%Morelos%' OR nombre ILIKE '%Cuernavaca%' OR nombre ILIKE '%Cuautla%' OR nombre ILIKE '%Jiutepec%' OR nombre ILIKE '%Tequesquitengo%';
UPDATE public.zonas SET region = 'puebla' WHERE nombre ILIKE '%Puebla%';
UPDATE public.zonas SET region = 'hidalgo' WHERE nombre ILIKE '%Hidalgo%' OR nombre ILIKE '%Pachuca%' OR nombre ILIKE '%Tizayuca%';
UPDATE public.zonas SET region = 'queretaro' WHERE nombre ILIKE '%Querétaro%' OR nombre ILIKE '%Queretaro%';
UPDATE public.zonas SET region = 'tlaxcala' WHERE nombre ILIKE '%Tlaxcala%' OR nombre ILIKE '%Apizaco%' OR nombre ILIKE '%Calpulalpan%';

-- Fase 5: Agregar hora de salida sugerida a rutas
ALTER TABLE public.rutas ADD COLUMN IF NOT EXISTS hora_salida_sugerida TIME;
ALTER TABLE public.rutas ADD COLUMN IF NOT EXISTS tiempo_estimado_minutos INTEGER;
ALTER TABLE public.rutas ADD COLUMN IF NOT EXISTS distancia_total_km NUMERIC;