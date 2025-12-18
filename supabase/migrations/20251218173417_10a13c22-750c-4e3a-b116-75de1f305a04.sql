-- Agregar campos de tipo de pago a ordenes_compra
ALTER TABLE public.ordenes_compra 
ADD COLUMN IF NOT EXISTS tipo_pago TEXT DEFAULT 'contra_entrega' CHECK (tipo_pago IN ('anticipado', 'contra_entrega')),
ADD COLUMN IF NOT EXISTS status_pago TEXT DEFAULT 'pendiente' CHECK (status_pago IN ('pendiente', 'pagado')),
ADD COLUMN IF NOT EXISTS fecha_pago DATE,
ADD COLUMN IF NOT EXISTS referencia_pago TEXT,
ADD COLUMN IF NOT EXISTS comprobante_pago_url TEXT;