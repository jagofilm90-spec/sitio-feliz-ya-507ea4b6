-- Cambiar pedido PED-V-215153 a por_autorizar para probar flujo de autorización
UPDATE pedidos
SET status = 'por_autorizar',
    updated_at = now()
WHERE folio = 'PED-V-215153';
