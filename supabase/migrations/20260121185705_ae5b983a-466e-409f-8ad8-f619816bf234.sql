-- Agregar permisos de módulo para el nuevo rol gerente_almacen
INSERT INTO module_permissions (role, module_path, module_name, tiene_acceso) VALUES
  ('gerente_almacen', '/almacen-tablet', 'Panel Almacén', true),
  ('gerente_almacen', '/chat', 'Chat', true),
  ('gerente_almacen', '/inventario', 'Inventario', true),
  ('gerente_almacen', '/productos', 'Productos', true),
  ('gerente_almacen', '/fumigaciones', 'Fumigaciones', true)
ON CONFLICT (role, module_path) DO NOTHING;