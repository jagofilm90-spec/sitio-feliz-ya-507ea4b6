-- ============================================
-- CATÁLOGOS SAT — Seed ampliado
-- Idempotente (puede correr múltiples veces)
-- APLICAR MANUALMENTE en Lovable SQL Editor
-- ============================================

-- c_Estado (32 estados MX)
INSERT INTO sat_catalogos (catalogo, clave, descripcion, vigente_desde) VALUES
('c_Estado', 'AGU', 'Aguascalientes', '2020-01-01'),
('c_Estado', 'BCN', 'Baja California', '2020-01-01'),
('c_Estado', 'BCS', 'Baja California Sur', '2020-01-01'),
('c_Estado', 'CAM', 'Campeche', '2020-01-01'),
('c_Estado', 'CHP', 'Chiapas', '2020-01-01'),
('c_Estado', 'CHH', 'Chihuahua', '2020-01-01'),
('c_Estado', 'CMX', 'Ciudad de México', '2020-01-01'),
('c_Estado', 'COA', 'Coahuila', '2020-01-01'),
('c_Estado', 'COL', 'Colima', '2020-01-01'),
('c_Estado', 'DUR', 'Durango', '2020-01-01'),
('c_Estado', 'GUA', 'Guanajuato', '2020-01-01'),
('c_Estado', 'GRO', 'Guerrero', '2020-01-01'),
('c_Estado', 'HID', 'Hidalgo', '2020-01-01'),
('c_Estado', 'JAL', 'Jalisco', '2020-01-01'),
('c_Estado', 'MEX', 'Estado de México', '2020-01-01'),
('c_Estado', 'MIC', 'Michoacán', '2020-01-01'),
('c_Estado', 'MOR', 'Morelos', '2020-01-01'),
('c_Estado', 'NAY', 'Nayarit', '2020-01-01'),
('c_Estado', 'NLE', 'Nuevo León', '2020-01-01'),
('c_Estado', 'OAX', 'Oaxaca', '2020-01-01'),
('c_Estado', 'PUE', 'Puebla', '2020-01-01'),
('c_Estado', 'QUE', 'Querétaro', '2020-01-01'),
('c_Estado', 'ROO', 'Quintana Roo', '2020-01-01'),
('c_Estado', 'SLP', 'San Luis Potosí', '2020-01-01'),
('c_Estado', 'SIN', 'Sinaloa', '2020-01-01'),
('c_Estado', 'SON', 'Sonora', '2020-01-01'),
('c_Estado', 'TAB', 'Tabasco', '2020-01-01'),
('c_Estado', 'TAM', 'Tamaulipas', '2020-01-01'),
('c_Estado', 'TLA', 'Tlaxcala', '2020-01-01'),
('c_Estado', 'VER', 'Veracruz', '2020-01-01'),
('c_Estado', 'YUC', 'Yucatán', '2020-01-01'),
('c_Estado', 'ZAC', 'Zacatecas', '2020-01-01')
ON CONFLICT (catalogo, clave) DO NOTHING;

-- c_ClaveUnidad (20 unidades comunes mayoreo abarrotes)
INSERT INTO sat_catalogos (catalogo, clave, descripcion, vigente_desde) VALUES
('c_ClaveUnidad', 'KGM', 'Kilogramo', '2020-01-01'),
('c_ClaveUnidad', 'GRM', 'Gramo', '2020-01-01'),
('c_ClaveUnidad', 'TNE', 'Tonelada métrica', '2020-01-01'),
('c_ClaveUnidad', 'LTR', 'Litro', '2020-01-01'),
('c_ClaveUnidad', 'MLT', 'Mililitro', '2020-01-01'),
('c_ClaveUnidad', 'H87', 'Pieza', '2020-01-01'),
('c_ClaveUnidad', 'XBX', 'Caja', '2020-01-01'),
('c_ClaveUnidad', 'XPK', 'Paquete', '2020-01-01'),
('c_ClaveUnidad', 'XBG', 'Bolsa', '2020-01-01'),
('c_ClaveUnidad', 'XCS', 'Caja de cartón', '2020-01-01'),
('c_ClaveUnidad', 'XCT', 'Cartón', '2020-01-01'),
('c_ClaveUnidad', 'PR', 'Par', '2020-01-01'),
('c_ClaveUnidad', 'XSA', 'Saco', '2020-01-01'),
('c_ClaveUnidad', 'XBJ', 'Bote', '2020-01-01'),
('c_ClaveUnidad', 'XCJ', 'Cubeta', '2020-01-01'),
('c_ClaveUnidad', 'E48', 'Unidad de servicio', '2020-01-01'),
('c_ClaveUnidad', 'XPF', 'Plataforma', '2020-01-01'),
('c_ClaveUnidad', 'GLL', 'Galón (4.546 dm3)', '2020-01-01'),
('c_ClaveUnidad', 'XUN', 'Unidad', '2020-01-01'),
('c_ClaveUnidad', 'XBA', 'Barril', '2020-01-01')
ON CONFLICT (catalogo, clave) DO NOTHING;

-- c_ClaveProdServ (23 categorías top mayoreo abarrotes)
INSERT INTO sat_catalogos (catalogo, clave, descripcion, vigente_desde) VALUES
('c_ClaveProdServ', '50112000', 'Alimentos preparados y conservas', '2020-01-01'),
('c_ClaveProdServ', '50171500', 'Especias y extractos', '2020-01-01'),
('c_ClaveProdServ', '50181900', 'Productos panaderos', '2020-01-01'),
('c_ClaveProdServ', '50192100', 'Pastas y fideos', '2020-01-01'),
('c_ClaveProdServ', '50192300', 'Productos de granos', '2020-01-01'),
('c_ClaveProdServ', '50201700', 'Bebidas no alcohólicas', '2020-01-01'),
('c_ClaveProdServ', '50202300', 'Bebidas alcohólicas', '2020-01-01'),
('c_ClaveProdServ', '50221200', 'Productos de azúcar', '2020-01-01'),
('c_ClaveProdServ', '50131600', 'Productos lácteos', '2020-01-01'),
('c_ClaveProdServ', '50131800', 'Quesos', '2020-01-01'),
('c_ClaveProdServ', '50131700', 'Mantequilla', '2020-01-01'),
('c_ClaveProdServ', '50111500', 'Carne procesada', '2020-01-01'),
('c_ClaveProdServ', '50111700', 'Embutidos', '2020-01-01'),
('c_ClaveProdServ', '50221100', 'Confitería y chocolates', '2020-01-01'),
('c_ClaveProdServ', '50202306', 'Refrescos', '2020-01-01'),
('c_ClaveProdServ', '50161500', 'Aceites comestibles', '2020-01-01'),
('c_ClaveProdServ', '50171550', 'Sal de mesa', '2020-01-01'),
('c_ClaveProdServ', '50221400', 'Botanas', '2020-01-01'),
('c_ClaveProdServ', '47131800', 'Productos de limpieza', '2020-01-01'),
('c_ClaveProdServ', '53131600', 'Productos de higiene', '2020-01-01'),
('c_ClaveProdServ', '52151500', 'Detergentes', '2020-01-01'),
('c_ClaveProdServ', '47131600', 'Productos para baño', '2020-01-01'),
('c_ClaveProdServ', '78101802', 'Servicio de transporte de carga por carretera', '2020-01-01')
ON CONFLICT (catalogo, clave) DO NOTHING;

-- c_FiguraTransporte completo
INSERT INTO sat_catalogos (catalogo, clave, descripcion, vigente_desde) VALUES
('c_FiguraTransporte', '01', 'Operador', '2020-01-01'),
('c_FiguraTransporte', '02', 'Propietario', '2020-01-01'),
('c_FiguraTransporte', '03', 'Arrendador', '2020-01-01'),
('c_FiguraTransporte', '04', 'Notificado', '2020-01-01')
ON CONFLICT (catalogo, clave) DO NOTHING;

-- c_MotivoCancelacion (4 motivos SAT)
INSERT INTO sat_catalogos (catalogo, clave, descripcion, vigente_desde) VALUES
('c_MotivoCancelacion', '01', 'Comprobante emitido con errores con relación', '2022-01-01'),
('c_MotivoCancelacion', '02', 'Comprobante emitido con errores sin relación', '2022-01-01'),
('c_MotivoCancelacion', '03', 'No se llevó a cabo la operación', '2022-01-01'),
('c_MotivoCancelacion', '04', 'Operación nominativa relacionada en factura global', '2022-01-01')
ON CONFLICT (catalogo, clave) DO NOTHING;
