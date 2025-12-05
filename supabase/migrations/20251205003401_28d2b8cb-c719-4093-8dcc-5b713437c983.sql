-- Add delivery configuration fields to clientes table
ALTER TABLE public.clientes
ADD COLUMN prioridad_entrega_default public.delivery_priority DEFAULT 'flexible',
ADD COLUMN deadline_dias_habiles_default integer DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.clientes.prioridad_entrega_default IS 'Prioridad de entrega por defecto para pedidos nuevos de este cliente';
COMMENT ON COLUMN public.clientes.deadline_dias_habiles_default IS 'Días hábiles de plazo por defecto para entregas (ej: Lecaroz = 15 días)';

-- Update existing known clients with their delivery rules
-- Proveedora San Antonio - VIP mismo día
UPDATE public.clientes 
SET prioridad_entrega_default = 'vip_mismo_dia'
WHERE nombre ILIKE '%proveedora san antonio%';

-- Productos Difo - VIP mismo día
UPDATE public.clientes 
SET prioridad_entrega_default = 'vip_mismo_dia'
WHERE nombre ILIKE '%difo%';

-- Lecaroz - 15 días hábiles
UPDATE public.clientes 
SET prioridad_entrega_default = 'deadline',
    deadline_dias_habiles_default = 15
WHERE nombre ILIKE '%lecaroz%';