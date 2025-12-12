-- Add piezas_por_unidad field for dual-unit system
-- This allows products sold in packages but inventoried by individual units (e.g., playo sold by package of 4 rolls but tracked by roll)

ALTER TABLE public.productos
ADD COLUMN piezas_por_unidad integer DEFAULT 1;

COMMENT ON COLUMN public.productos.piezas_por_unidad IS 'Number of individual pieces per commercial unit. E.g., 4 for a package of 4 rolls. Used for inventory tracking in minimum units while selling in commercial units.';