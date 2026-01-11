-- Add pedido_id column to notificaciones table for linking notifications to orders
ALTER TABLE public.notificaciones 
ADD COLUMN IF NOT EXISTS pedido_id uuid REFERENCES public.pedidos(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notificaciones_pedido_id ON public.notificaciones(pedido_id);