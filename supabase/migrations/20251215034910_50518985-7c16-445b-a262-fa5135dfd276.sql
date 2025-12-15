-- Add column to link evidence to specific delivery (ordenes_compra_entregas)
ALTER TABLE public.recepciones_evidencias 
ADD COLUMN IF NOT EXISTS orden_compra_entrega_id UUID REFERENCES public.ordenes_compra_entregas(id) ON DELETE CASCADE;

-- Make orden_compra_id nullable since we now have entrega-level link
ALTER TABLE public.recepciones_evidencias 
ALTER COLUMN orden_compra_id DROP NOT NULL;

-- Create index for fast lookups by entrega
CREATE INDEX IF NOT EXISTS idx_recepciones_evidencias_entrega_id ON public.recepciones_evidencias(orden_compra_entrega_id);