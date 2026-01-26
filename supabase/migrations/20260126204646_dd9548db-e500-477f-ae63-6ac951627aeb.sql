-- Agregar campos para tracking de pago por producto
ALTER TABLE ordenes_compra_detalles 
ADD COLUMN IF NOT EXISTS pagado boolean DEFAULT false;

ALTER TABLE ordenes_compra_detalles 
ADD COLUMN IF NOT EXISTS fecha_pago timestamp with time zone;

-- Comentarios
COMMENT ON COLUMN ordenes_compra_detalles.pagado IS 'Indica si este detalle ya fue pagado';
COMMENT ON COLUMN ordenes_compra_detalles.fecha_pago IS 'Fecha en que se registró el pago';