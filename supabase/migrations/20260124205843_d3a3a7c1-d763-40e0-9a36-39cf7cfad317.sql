-- Agregar permisos faltantes para las nuevas rutas del menú

-- /configuracion - Configuración centralizada (admin, contadora, gerente_almacen)
INSERT INTO module_permissions (module_name, module_path, role, tiene_acceso)
VALUES 
  ('Configuración', '/configuracion', 'admin', true),
  ('Configuración', '/configuracion', 'contadora', true),
  ('Configuración', '/configuracion', 'gerente_almacen', true);

-- /precios - Lista de Precios (admin, secretaria, vendedor)
INSERT INTO module_permissions (module_name, module_path, role, tiene_acceso)
VALUES 
  ('Lista de Precios', '/precios', 'admin', true),
  ('Lista de Precios', '/precios', 'secretaria', true),
  ('Lista de Precios', '/precios', 'vendedor', true);

-- /generate-assets - App Móvil (solo admin)
INSERT INTO module_permissions (module_name, module_path, role, tiene_acceso)
VALUES 
  ('App Móvil', '/generate-assets', 'admin', true);

-- /secretaria - Panel Secretaria (admin, secretaria)
INSERT INTO module_permissions (module_name, module_path, role, tiene_acceso)
VALUES 
  ('Panel Secretaria', '/secretaria', 'admin', true),
  ('Panel Secretaria', '/secretaria', 'secretaria', true);

-- /vendedor - Panel Vendedor (admin, vendedor)
INSERT INTO module_permissions (module_name, module_path, role, tiene_acceso)
VALUES 
  ('Panel Vendedor', '/vendedor', 'admin', true),
  ('Panel Vendedor', '/vendedor', 'vendedor', true);