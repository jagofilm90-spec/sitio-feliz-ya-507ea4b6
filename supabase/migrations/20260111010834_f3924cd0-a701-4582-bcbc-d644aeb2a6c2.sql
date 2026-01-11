-- Agregar columna termino_credito a pedidos para que cada pedido tenga su propio término
ALTER TABLE public.pedidos 
ADD COLUMN termino_credito public.credit_term DEFAULT 'contado';