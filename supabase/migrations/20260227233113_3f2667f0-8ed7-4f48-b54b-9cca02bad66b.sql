-- Cancel RUT-0001: delete carga, entregas, ruta; revert pedido and vehicle
DELETE FROM carga_productos WHERE entrega_id = 'e77bf2ec-00ca-4f0c-b99a-7ce4dabc6a71';
DELETE FROM entregas WHERE ruta_id = 'c8df91e8-0a9c-4a11-b3ed-27674abe6714';
UPDATE pedidos SET status = 'pendiente', updated_at = now() WHERE id = '12a2dffd-8fb7-4acb-864a-8359aab4f887';
UPDATE vehiculos SET status = 'disponible' WHERE id = '283556cf-097a-4e74-a249-927b8f61658f';
DELETE FROM rutas WHERE id = 'c8df91e8-0a9c-4a11-b3ed-27674abe6714';