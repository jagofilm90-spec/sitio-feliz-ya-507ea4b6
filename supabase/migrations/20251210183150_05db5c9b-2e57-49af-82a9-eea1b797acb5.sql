-- Agregar campos de factura a la tabla vehiculos
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS factura_url TEXT;
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS factura_fecha DATE;
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS factura_folio TEXT;
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS factura_valor NUMERIC;
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS factura_vendedor TEXT;
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS anio INTEGER;