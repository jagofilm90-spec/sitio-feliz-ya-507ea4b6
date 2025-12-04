-- Crear tabla para permisos de módulos dinámicos
CREATE TABLE public.module_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role public.app_role NOT NULL,
    module_path text NOT NULL,
    module_name text NOT NULL,
    tiene_acceso boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(role, module_path)
);

-- Habilitar RLS
ALTER TABLE public.module_permissions ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden gestionar permisos
CREATE POLICY "Solo admins gestionan permisos"
ON public.module_permissions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Todos los usuarios autenticados pueden leer permisos
CREATE POLICY "Usuarios autenticados pueden leer permisos"
ON public.module_permissions FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Trigger para updated_at
CREATE TRIGGER update_module_permissions_updated_at
BEFORE UPDATE ON public.module_permissions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Insertar permisos actuales como datos iniciales
-- Admin
INSERT INTO public.module_permissions (role, module_path, module_name, tiene_acceso) VALUES
('admin', '/dashboard', 'Dashboard', true),
('admin', '/productos', 'Productos', true),
('admin', '/fumigaciones', 'Fumigaciones', true),
('admin', '/clientes', 'Clientes', true),
('admin', '/pedidos', 'Pedidos', true),
('admin', '/compras', 'Compras', true),
('admin', '/inventario', 'Inventario', true),
('admin', '/rentabilidad', 'Rentabilidad', true),
('admin', '/rutas', 'Rutas', true),
('admin', '/facturas', 'Facturas', true),
('admin', '/empleados', 'Empleados', true),
('admin', '/usuarios', 'Usuarios', true),
('admin', '/chat', 'Chat', true),
('admin', '/correos', 'Correos', true),
('admin', '/permisos', 'Permisos', true),
-- Secretaria
('secretaria', '/dashboard', 'Dashboard', true),
('secretaria', '/productos', 'Productos', true),
('secretaria', '/fumigaciones', 'Fumigaciones', true),
('secretaria', '/clientes', 'Clientes', true),
('secretaria', '/pedidos', 'Pedidos', true),
('secretaria', '/compras', 'Compras', true),
('secretaria', '/inventario', 'Inventario', true),
('secretaria', '/rentabilidad', 'Rentabilidad', false),
('secretaria', '/rutas', 'Rutas', true),
('secretaria', '/facturas', 'Facturas', true),
('secretaria', '/empleados', 'Empleados', true),
('secretaria', '/usuarios', 'Usuarios', false),
('secretaria', '/chat', 'Chat', true),
('secretaria', '/correos', 'Correos', true),
('secretaria', '/permisos', 'Permisos', false),
-- Vendedor
('vendedor', '/dashboard', 'Dashboard', true),
('vendedor', '/productos', 'Productos', false),
('vendedor', '/fumigaciones', 'Fumigaciones', false),
('vendedor', '/clientes', 'Clientes', true),
('vendedor', '/pedidos', 'Pedidos', true),
('vendedor', '/compras', 'Compras', false),
('vendedor', '/inventario', 'Inventario', false),
('vendedor', '/rentabilidad', 'Rentabilidad', false),
('vendedor', '/rutas', 'Rutas', false),
('vendedor', '/facturas', 'Facturas', false),
('vendedor', '/empleados', 'Empleados', false),
('vendedor', '/usuarios', 'Usuarios', false),
('vendedor', '/chat', 'Chat', true),
('vendedor', '/correos', 'Correos', false),
('vendedor', '/permisos', 'Permisos', false),
-- Chofer
('chofer', '/dashboard', 'Dashboard', true),
('chofer', '/productos', 'Productos', false),
('chofer', '/fumigaciones', 'Fumigaciones', false),
('chofer', '/clientes', 'Clientes', false),
('chofer', '/pedidos', 'Pedidos', false),
('chofer', '/compras', 'Compras', false),
('chofer', '/inventario', 'Inventario', false),
('chofer', '/rentabilidad', 'Rentabilidad', false),
('chofer', '/rutas', 'Rutas', true),
('chofer', '/facturas', 'Facturas', false),
('chofer', '/empleados', 'Empleados', false),
('chofer', '/usuarios', 'Usuarios', false),
('chofer', '/chat', 'Chat', true),
('chofer', '/correos', 'Correos', false),
('chofer', '/permisos', 'Permisos', false),
-- Almacen
('almacen', '/dashboard', 'Dashboard', true),
('almacen', '/productos', 'Productos', true),
('almacen', '/fumigaciones', 'Fumigaciones', true),
('almacen', '/clientes', 'Clientes', false),
('almacen', '/pedidos', 'Pedidos', false),
('almacen', '/compras', 'Compras', false),
('almacen', '/inventario', 'Inventario', true),
('almacen', '/rentabilidad', 'Rentabilidad', false),
('almacen', '/rutas', 'Rutas', false),
('almacen', '/facturas', 'Facturas', false),
('almacen', '/empleados', 'Empleados', false),
('almacen', '/usuarios', 'Usuarios', false),
('almacen', '/chat', 'Chat', true),
('almacen', '/correos', 'Correos', false),
('almacen', '/permisos', 'Permisos', false),
-- Contadora
('contadora', '/dashboard', 'Dashboard', true),
('contadora', '/productos', 'Productos', false),
('contadora', '/fumigaciones', 'Fumigaciones', false),
('contadora', '/clientes', 'Clientes', false),
('contadora', '/pedidos', 'Pedidos', false),
('contadora', '/compras', 'Compras', false),
('contadora', '/inventario', 'Inventario', false),
('contadora', '/rentabilidad', 'Rentabilidad', true),
('contadora', '/rutas', 'Rutas', false),
('contadora', '/facturas', 'Facturas', true),
('contadora', '/empleados', 'Empleados', true),
('contadora', '/usuarios', 'Usuarios', false),
('contadora', '/chat', 'Chat', true),
('contadora', '/correos', 'Correos', false),
('contadora', '/permisos', 'Permisos', false),
-- Cliente
('cliente', '/dashboard', 'Dashboard', false),
('cliente', '/productos', 'Productos', false),
('cliente', '/fumigaciones', 'Fumigaciones', false),
('cliente', '/clientes', 'Clientes', false),
('cliente', '/pedidos', 'Pedidos', false),
('cliente', '/compras', 'Compras', false),
('cliente', '/inventario', 'Inventario', false),
('cliente', '/rentabilidad', 'Rentabilidad', false),
('cliente', '/rutas', 'Rutas', false),
('cliente', '/facturas', 'Facturas', false),
('cliente', '/empleados', 'Empleados', false),
('cliente', '/usuarios', 'Usuarios', false),
('cliente', '/chat', 'Chat', false),
('cliente', '/correos', 'Correos', false),
('cliente', '/permisos', 'Permisos', false);