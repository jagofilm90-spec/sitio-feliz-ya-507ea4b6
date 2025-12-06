-- Create view for products with low stock (column-to-column comparison)
CREATE OR REPLACE VIEW public.productos_stock_bajo AS
SELECT id, codigo, nombre, stock_actual, stock_minimo
FROM public.productos
WHERE activo = true AND stock_actual <= stock_minimo;