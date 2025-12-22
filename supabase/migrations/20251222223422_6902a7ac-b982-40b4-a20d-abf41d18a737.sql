-- Agregar campo codigo_proveedor a proveedor_productos
ALTER TABLE public.proveedor_productos
ADD COLUMN codigo_proveedor text;

-- Agregar comentario descriptivo
COMMENT ON COLUMN public.proveedor_productos.codigo_proveedor IS 'Código SKU del producto según el proveedor';