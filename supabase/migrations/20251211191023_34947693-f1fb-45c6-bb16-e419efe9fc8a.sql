-- Agregar campos CFDI a la tabla facturas
ALTER TABLE public.facturas
ADD COLUMN IF NOT EXISTS cfdi_uuid TEXT,
ADD COLUMN IF NOT EXISTS cfdi_fecha_timbrado TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cfdi_estado TEXT DEFAULT 'pendiente',
ADD COLUMN IF NOT EXISTS cfdi_xml_url TEXT,
ADD COLUMN IF NOT EXISTS cfdi_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS uso_cfdi TEXT DEFAULT 'G03',
ADD COLUMN IF NOT EXISTS forma_pago TEXT DEFAULT '99',
ADD COLUMN IF NOT EXISTS metodo_pago TEXT DEFAULT 'PUE',
ADD COLUMN IF NOT EXISTS cfdi_error TEXT;

-- Insertar datos fiscales del emisor en configuracion_empresa
INSERT INTO public.configuracion_empresa (clave, valor, descripcion)
VALUES (
  'datos_fiscales_emisor',
  '{"rfc": "AMA700701GI8", "razon_social": "ABARROTES LA MANITA SA DE CV", "regimen_fiscal": "601", "codigo_postal": "15850", "lugar_expedicion": "15850"}'::jsonb,
  'Datos fiscales del emisor para timbrado CFDI 4.0'
)
ON CONFLICT (clave) DO UPDATE SET 
  valor = EXCLUDED.valor,
  updated_at = now();