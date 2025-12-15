-- Remover foreign keys de rutas que apuntan a profiles para poder usar empleados.id
-- chofer_id y ayudante_id ahora contendrán empleados.id, no profiles.id

ALTER TABLE public.rutas DROP CONSTRAINT IF EXISTS rutas_chofer_id_fkey;
ALTER TABLE public.rutas DROP CONSTRAINT IF EXISTS rutas_ayudante_id_fkey;

-- Agregar comentarios explicativos
COMMENT ON COLUMN public.rutas.chofer_id IS 'ID del empleado (de tabla empleados) asignado como chofer';
COMMENT ON COLUMN public.rutas.ayudante_id IS 'DEPRECADO - usar ayudantes_ids en su lugar. ID del empleado asignado como ayudante';
COMMENT ON COLUMN public.rutas.ayudantes_ids IS 'Array de IDs de empleados asignados como ayudantes';