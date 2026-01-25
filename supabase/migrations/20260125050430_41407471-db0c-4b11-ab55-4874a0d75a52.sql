-- =====================================================
-- LIMPIEZA Y ORGANIZACIÓN DE PERMISOS POR ROL (CORREGIDO)
-- =====================================================

-- 1. Eliminar permisos obsoletos (rutas que ya no existen o están centralizadas)
DELETE FROM module_permissions 
WHERE module_path IN ('/respaldos', '/permisos', '/usuarios');

-- 2. Quitar Dashboard del menú de secretaria (ya tiene panel dedicado /secretaria)
UPDATE module_permissions 
SET tiene_acceso = false 
WHERE module_path = '/dashboard' AND role = 'secretaria';

-- 3. Quitar rutas del chofer en menú principal (solo usa su panel dedicado /chofer)
UPDATE module_permissions 
SET tiene_acceso = false 
WHERE module_path = '/rutas' AND role = 'chofer';

-- 4. Asegurar que vendedores NO tengan acceso al dashboard general (usarán /vendedor)
UPDATE module_permissions 
SET tiene_acceso = false 
WHERE module_path = '/dashboard' AND role = 'vendedor';

-- 5. Quitar acceso a módulos operativos para vendedores (ya los tienen en su panel)
UPDATE module_permissions 
SET tiene_acceso = false 
WHERE module_path IN ('/clientes', '/pedidos', '/compras', '/inventario', '/productos', '/facturas', '/fumigaciones')
AND role = 'vendedor';

-- 6. Almacenistas no deben ver el menú principal (solo usan /almacen-tablet)
UPDATE module_permissions 
SET tiene_acceso = false 
WHERE role = 'almacen' 
AND module_path NOT IN ('/almacen-tablet', '/chat');

-- 7. Gerente almacén solo debe ver su panel y chat en menú principal
UPDATE module_permissions 
SET tiene_acceso = false 
WHERE role = 'gerente_almacen' 
AND module_path NOT IN ('/almacen-tablet', '/chat', '/configuracion');

-- 8. Contadora solo debe ver módulos financieros y HR
UPDATE module_permissions 
SET tiene_acceso = false 
WHERE role = 'contadora' 
AND module_path NOT IN ('/dashboard', '/facturas', '/rentabilidad', '/empleados', '/chat', '/configuracion');

-- 9. Insertar permisos para /vendedor si no existen para vendedor
INSERT INTO module_permissions (module_name, module_path, role, tiene_acceso)
SELECT 'Panel Vendedor', '/vendedor', 'vendedor'::app_role, true
WHERE NOT EXISTS (
  SELECT 1 FROM module_permissions 
  WHERE module_path = '/vendedor' AND role = 'vendedor'
);

-- 10. Asegurar que el chat esté disponible para todos los roles operativos (uno por uno)
INSERT INTO module_permissions (module_name, module_path, role, tiene_acceso)
SELECT 'Chat', '/chat', 'admin'::app_role, true
WHERE NOT EXISTS (SELECT 1 FROM module_permissions WHERE module_path = '/chat' AND role = 'admin');

INSERT INTO module_permissions (module_name, module_path, role, tiene_acceso)
SELECT 'Chat', '/chat', 'secretaria'::app_role, true
WHERE NOT EXISTS (SELECT 1 FROM module_permissions WHERE module_path = '/chat' AND role = 'secretaria');

INSERT INTO module_permissions (module_name, module_path, role, tiene_acceso)
SELECT 'Chat', '/chat', 'vendedor'::app_role, true
WHERE NOT EXISTS (SELECT 1 FROM module_permissions WHERE module_path = '/chat' AND role = 'vendedor');

INSERT INTO module_permissions (module_name, module_path, role, tiene_acceso)
SELECT 'Chat', '/chat', 'chofer'::app_role, true
WHERE NOT EXISTS (SELECT 1 FROM module_permissions WHERE module_path = '/chat' AND role = 'chofer');

INSERT INTO module_permissions (module_name, module_path, role, tiene_acceso)
SELECT 'Chat', '/chat', 'almacen'::app_role, true
WHERE NOT EXISTS (SELECT 1 FROM module_permissions WHERE module_path = '/chat' AND role = 'almacen');

INSERT INTO module_permissions (module_name, module_path, role, tiene_acceso)
SELECT 'Chat', '/chat', 'contadora'::app_role, true
WHERE NOT EXISTS (SELECT 1 FROM module_permissions WHERE module_path = '/chat' AND role = 'contadora');

INSERT INTO module_permissions (module_name, module_path, role, tiene_acceso)
SELECT 'Chat', '/chat', 'gerente_almacen'::app_role, true
WHERE NOT EXISTS (SELECT 1 FROM module_permissions WHERE module_path = '/chat' AND role = 'gerente_almacen');