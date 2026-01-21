-- Agregar 'completada' como status válido y actualizar OC-202601-0001
ALTER TABLE ordenes_compra DROP CONSTRAINT ordenes_compra_status_check;

ALTER TABLE ordenes_compra ADD CONSTRAINT ordenes_compra_status_check 
CHECK (status = ANY (ARRAY['pendiente'::text, 'pendiente_autorizacion'::text, 'autorizada'::text, 'enviada'::text, 'confirmada'::text, 'parcial'::text, 'recibida'::text, 'completada'::text, 'rechazada'::text, 'devuelta'::text, 'cancelada'::text]));

-- Corregir OC-202601-0001
UPDATE ordenes_compra 
SET status = 'completada'
WHERE folio = 'OC-202601-0001';