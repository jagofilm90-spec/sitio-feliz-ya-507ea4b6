-- Nuevas columnas para proveedores
ALTER TABLE proveedores
  ADD COLUMN IF NOT EXISTS categoria TEXT,
  ADD COLUMN IF NOT EXISTS termino_pago TEXT DEFAULT 'contado',
  ADD COLUMN IF NOT EXISTS dias_visita TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS frecuencia_compra TEXT,
  ADD COLUMN IF NOT EXISTS banco TEXT,
  ADD COLUMN IF NOT EXISTS beneficiario TEXT,
  ADD COLUMN IF NOT EXISTS cuenta_bancaria TEXT,
  ADD COLUMN IF NOT EXISTS clabe_interbancaria TEXT;
