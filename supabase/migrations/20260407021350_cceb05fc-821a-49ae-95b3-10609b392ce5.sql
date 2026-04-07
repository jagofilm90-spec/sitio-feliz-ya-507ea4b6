
-- Limpiar referencias FK cruzadas que apuntan a sucursales del viejo Lecaroz
UPDATE cliente_sucursales 
SET sucursal_hermana_id = NULL 
WHERE sucursal_hermana_id IN (SELECT id FROM cliente_sucursales WHERE cliente_id = 'c10f9b98-f4a1-441d-a34a-80dc972b448a');

UPDATE cliente_sucursales 
SET sucursal_entrega_id = NULL 
WHERE sucursal_entrega_id IN (SELECT id FROM cliente_sucursales WHERE cliente_id = 'c10f9b98-f4a1-441d-a34a-80dc972b448a');

-- Limpiar auto-referencias dentro de las sucursales del viejo
UPDATE cliente_sucursales 
SET sucursal_hermana_id = NULL, sucursal_entrega_id = NULL
WHERE cliente_id = 'c10f9b98-f4a1-441d-a34a-80dc972b448a';

-- Eliminar sucursales del cliente duplicado
DELETE FROM cliente_sucursales WHERE cliente_id = 'c10f9b98-f4a1-441d-a34a-80dc972b448a';

-- Eliminar datos relacionados
DELETE FROM cliente_correos WHERE cliente_id = 'c10f9b98-f4a1-441d-a34a-80dc972b448a';
DELETE FROM cliente_contactos WHERE cliente_id = 'c10f9b98-f4a1-441d-a34a-80dc972b448a';
DELETE FROM cliente_telefonos WHERE cliente_id = 'c10f9b98-f4a1-441d-a34a-80dc972b448a';
DELETE FROM cliente_productos_frecuentes WHERE cliente_id = 'c10f9b98-f4a1-441d-a34a-80dc972b448a';
DELETE FROM cliente_cortesias_default WHERE cliente_id = 'c10f9b98-f4a1-441d-a34a-80dc972b448a';
DELETE FROM cliente_creditos_excepciones WHERE cliente_id = 'c10f9b98-f4a1-441d-a34a-80dc972b448a';
DELETE FROM cliente_programacion_pedidos WHERE cliente_id = 'c10f9b98-f4a1-441d-a34a-80dc972b448a';

-- Eliminar el cliente duplicado
DELETE FROM clientes WHERE id = 'c10f9b98-f4a1-441d-a34a-80dc972b448a';
