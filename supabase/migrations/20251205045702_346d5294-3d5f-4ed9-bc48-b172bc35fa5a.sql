-- Add latitude and longitude columns to cliente_sucursales for exact geocoding
ALTER TABLE cliente_sucursales 
ADD COLUMN latitud DOUBLE PRECISION,
ADD COLUMN longitud DOUBLE PRECISION;