-- Agregar columna cl para almacenar clave de cliente de panaderías Lecaroz
ALTER TABLE cliente_sucursales 
ADD COLUMN cl text;

COMMENT ON COLUMN cliente_sucursales.cl IS 'Clave de cliente (CL) - código interno de panadería para Lecaroz';