-- Corregir FK de recibido_por en inventario_lotes para apuntar a profiles
ALTER TABLE public.inventario_lotes 
DROP CONSTRAINT IF EXISTS inventario_lotes_recibido_por_fkey;

ALTER TABLE public.inventario_lotes 
ADD CONSTRAINT inventario_lotes_recibido_por_fkey 
FOREIGN KEY (recibido_por) REFERENCES public.profiles(id);

-- Corregir FK de recibido_por en ordenes_compra_entregas para apuntar a profiles
ALTER TABLE public.ordenes_compra_entregas 
DROP CONSTRAINT IF EXISTS ordenes_compra_entregas_recibido_por_fkey;

ALTER TABLE public.ordenes_compra_entregas 
ADD CONSTRAINT ordenes_compra_entregas_recibido_por_fkey 
FOREIGN KEY (recibido_por) REFERENCES public.profiles(id);