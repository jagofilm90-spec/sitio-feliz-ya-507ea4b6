-- Add arrival tracking fields to ordenes_compra_entregas
ALTER TABLE ordenes_compra_entregas
ADD COLUMN IF NOT EXISTS llegada_registrada_en TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS llegada_registrada_por UUID,
ADD COLUMN IF NOT EXISTS numero_sello_llegada TEXT,
ADD COLUMN IF NOT EXISTS placas_vehiculo TEXT,
ADD COLUMN IF NOT EXISTS nombre_chofer_proveedor TEXT;

-- Create table for delivery evidences (organized by phase)
CREATE TABLE IF NOT EXISTS ordenes_compra_entregas_evidencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id UUID NOT NULL REFERENCES ordenes_compra_entregas(id) ON DELETE CASCADE,
  tipo_evidencia TEXT NOT NULL,
  fase TEXT NOT NULL CHECK (fase IN ('llegada', 'recepcion')),
  ruta_storage TEXT NOT NULL,
  nombre_archivo TEXT,
  capturado_por UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE ordenes_compra_entregas_evidencias ENABLE ROW LEVEL SECURITY;

-- RLS policies for evidencias
CREATE POLICY "Admins y secretarias pueden gestionar evidencias entregas"
ON ordenes_compra_entregas_evidencias
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretaria'::app_role));

CREATE POLICY "Almacenistas pueden insertar evidencias entregas"
ON ordenes_compra_entregas_evidencias
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'almacen'::app_role));

CREATE POLICY "Usuarios autenticados pueden ver evidencias entregas"
ON ordenes_compra_entregas_evidencias
FOR SELECT
USING (auth.uid() IS NOT NULL);