-- Agregar campo recibido_por a inventario_lotes
ALTER TABLE public.inventario_lotes 
ADD COLUMN recibido_por UUID REFERENCES auth.users(id);

-- Agregar campo recibido_por a ordenes_compra_entregas
ALTER TABLE public.ordenes_compra_entregas 
ADD COLUMN recibido_por UUID REFERENCES auth.users(id);

-- Crear índices para búsquedas eficientes
CREATE INDEX idx_inventario_lotes_recibido_por ON public.inventario_lotes(recibido_por);
CREATE INDEX idx_ordenes_compra_entregas_recibido_por ON public.ordenes_compra_entregas(recibido_por);