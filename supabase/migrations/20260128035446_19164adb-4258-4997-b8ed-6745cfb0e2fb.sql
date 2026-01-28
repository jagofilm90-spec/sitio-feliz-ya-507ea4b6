-- Eliminar constraint actual
ALTER TABLE ordenes_compra 
DROP CONSTRAINT IF EXISTS ordenes_compra_status_check;

-- Crear nuevo constraint con pendiente_pago incluido
ALTER TABLE ordenes_compra 
ADD CONSTRAINT ordenes_compra_status_check 
CHECK (status = ANY (ARRAY[
  'pendiente',
  'pendiente_autorizacion', 
  'pendiente_pago',
  'autorizada',
  'enviada',
  'confirmada',
  'parcial',
  'recibida',
  'completada',
  'rechazada',
  'devuelta',
  'cancelada'
]));