-- Agregar campos de email y checkboxes de responsabilidades a proveedor_contactos
ALTER TABLE public.proveedor_contactos
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS recibe_ordenes BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recibe_pagos BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recibe_devoluciones BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recibe_logistica BOOLEAN DEFAULT false;

-- Migrar datos existentes de proveedor_correos a proveedor_contactos
-- Creamos nuevos registros de contacto para cada correo que no tenga un contacto equivalente
INSERT INTO public.proveedor_contactos (
  proveedor_id,
  nombre,
  telefono,
  email,
  es_principal,
  recibe_ordenes,
  recibe_pagos,
  recibe_devoluciones,
  recibe_logistica,
  activo
)
SELECT 
  pc.proveedor_id,
  COALESCE(pc.nombre_contacto, 'Contacto'),
  '',
  pc.email,
  pc.es_principal,
  pc.proposito = 'ordenes' OR pc.proposito = 'general',
  pc.proposito = 'pagos' OR pc.proposito = 'general',
  pc.proposito = 'devoluciones' OR pc.proposito = 'general',
  FALSE,
  pc.activo
FROM public.proveedor_correos pc
WHERE NOT EXISTS (
  SELECT 1 FROM public.proveedor_contactos pct 
  WHERE pct.proveedor_id = pc.proveedor_id 
  AND pct.email = pc.email
);