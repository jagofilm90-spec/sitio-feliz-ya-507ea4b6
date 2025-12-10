-- Agregar campos para sistema de agrupación de clientes
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS grupo_cliente_id uuid REFERENCES public.clientes(id);
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS es_grupo boolean DEFAULT false;

-- Índice para consultas eficientes de grupos
CREATE INDEX IF NOT EXISTS idx_clientes_grupo ON public.clientes(grupo_cliente_id);
CREATE INDEX IF NOT EXISTS idx_clientes_es_grupo ON public.clientes(es_grupo) WHERE es_grupo = true;

-- Comentarios para documentación
COMMENT ON COLUMN public.clientes.grupo_cliente_id IS 'Referencia al cliente padre/grupo al que pertenece este cliente';
COMMENT ON COLUMN public.clientes.es_grupo IS 'Indica si este cliente es cabeza de un grupo de clientes';