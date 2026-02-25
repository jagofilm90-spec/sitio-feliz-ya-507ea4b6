DELETE FROM carga_productos WHERE entrega_id = '044e088e-7f08-422d-b738-aa2bb1ab278b';
DELETE FROM entregas WHERE id = '044e088e-7f08-422d-b738-aa2bb1ab278b';
DELETE FROM rutas WHERE id = '6153da1b-75ef-4ece-934e-c4e0d5c0070b' 
AND NOT EXISTS (SELECT 1 FROM entregas WHERE ruta_id = '6153da1b-75ef-4ece-934e-c4e0d5c0070b');