-- Create table for route loading evidence
CREATE TABLE public.carga_evidencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ruta_id uuid NOT NULL REFERENCES public.rutas(id) ON DELETE CASCADE,
  tipo_evidencia text NOT NULL,
  ruta_storage text NOT NULL,
  nombre_archivo text,
  capturado_por uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.carga_evidencias ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins y almacen pueden gestionar evidencias de carga"
ON public.carga_evidencias FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'almacen'::app_role));

CREATE POLICY "Usuarios autenticados pueden ver evidencias de carga"
ON public.carga_evidencias FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Create storage bucket for loading evidence
INSERT INTO storage.buckets (id, name, public) 
VALUES ('cargas-evidencias', 'cargas-evidencias', false);

-- Storage policies
CREATE POLICY "Admins y almacen pueden subir evidencias de carga"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'cargas-evidencias' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'almacen'::app_role)));

CREATE POLICY "Usuarios autenticados pueden ver evidencias de carga"
ON storage.objects FOR SELECT
USING (bucket_id = 'cargas-evidencias' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins y almacen pueden eliminar evidencias de carga"
ON storage.objects FOR DELETE
USING (bucket_id = 'cargas-evidencias' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'almacen'::app_role)));