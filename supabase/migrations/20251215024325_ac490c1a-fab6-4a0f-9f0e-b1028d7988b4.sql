-- Add ayudantes_ids array to rutas table for multiple assistants
ALTER TABLE public.rutas 
ADD COLUMN IF NOT EXISTS ayudantes_ids UUID[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.rutas.ayudantes_ids IS 'Array of ayudante employee IDs assigned to this route';