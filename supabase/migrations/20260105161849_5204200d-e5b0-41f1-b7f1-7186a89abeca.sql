-- Add kilos_totales column to pedidos_detalles table
-- This stores the calculated total kilograms for products sold by kilo
ALTER TABLE pedidos_detalles 
ADD COLUMN IF NOT EXISTS kilos_totales NUMERIC(10,2);

COMMENT ON COLUMN pedidos_detalles.kilos_totales IS 
'Kilos totales calculados: cantidad × presentacion. Solo para productos con precio_por_kilo=true';

-- Add kilos_totales column to cotizaciones_detalles table as well
ALTER TABLE cotizaciones_detalles 
ADD COLUMN IF NOT EXISTS kilos_totales NUMERIC(10,2);

COMMENT ON COLUMN cotizaciones_detalles.kilos_totales IS 
'Kilos totales calculados: cantidad × presentacion. Solo para productos con precio_por_kilo=true';