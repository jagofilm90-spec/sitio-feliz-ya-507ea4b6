-- Drop tables related to supplier confirmation system (deprecated)
DROP TABLE IF EXISTS ordenes_compra_confirmaciones;
DROP TABLE IF EXISTS ordenes_compra_respuestas_proveedor;

-- Remove email tracking column no longer needed
ALTER TABLE ordenes_compra DROP COLUMN IF EXISTS email_leido_en;