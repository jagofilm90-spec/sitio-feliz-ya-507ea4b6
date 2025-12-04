-- Agregar campo booleano para identificar rosticerías
ALTER TABLE cliente_sucursales 
ADD COLUMN es_rosticeria BOOLEAN DEFAULT false;

-- Actualizar todas las sucursales con código entre 301 y 490
UPDATE cliente_sucursales 
SET es_rosticeria = true 
WHERE codigo_sucursal IS NOT NULL 
  AND CAST(codigo_sucursal AS INTEGER) BETWEEN 301 AND 490;