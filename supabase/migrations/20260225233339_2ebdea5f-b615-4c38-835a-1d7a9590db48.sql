
-- Revertir inventario de los 3 productos cargados
SELECT incrementar_lote('fff62b15-c50b-44f5-b830-5e7f45ab7d92'::uuid, 500);
SELECT incrementar_lote('ed2f3665-cc86-420d-b5e7-cde1902829db'::uuid, 50);
SELECT incrementar_lote('54af1756-47cf-409e-8f69-a6b6d9345ae8'::uuid, 150);

-- Borrar carga_productos
DELETE FROM carga_productos WHERE entrega_id = '419811ec-2f43-47a8-ae27-da902c4a3a8c';

-- Borrar evidencias de carga
DELETE FROM carga_evidencias WHERE ruta_id = 'cdac3dd5-5bb9-45e9-90c5-1073c08fe733';

-- Borrar entregas
DELETE FROM entregas WHERE ruta_id = 'cdac3dd5-5bb9-45e9-90c5-1073c08fe733';

-- Regresar pedido a pendiente
UPDATE pedidos SET status = 'pendiente', updated_at = now() WHERE id = '7d3b7c8c-7a92-4656-a4ce-a9c749546fe2';

-- Regresar vehículo a disponible
UPDATE vehiculos SET status = 'disponible' WHERE id = '283556cf-097a-4e74-a249-927b8f61658f';

-- Borrar la ruta
DELETE FROM rutas WHERE id = 'cdac3dd5-5bb9-45e9-90c5-1073c08fe733';
