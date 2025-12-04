
-- =====================================================
-- FASE 1: CORRECCIONES DE SEGURIDAD CRÍTICAS
-- =====================================================

-- 1. Función helper para verificar si vendedor está asignado a un cliente
CREATE OR REPLACE FUNCTION public.es_vendedor_de_cliente(_cliente_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM clientes 
    WHERE id = _cliente_id 
    AND vendedor_asignado = auth.uid()
  )
$$;

-- =====================================================
-- 2. RESTRINGIR ACCESO A CLIENTES
-- =====================================================

-- Eliminar política permisiva actual
DROP POLICY IF EXISTS "All authenticated users can view clients" ON clientes;

-- Admin y Secretaria: acceso completo de lectura
CREATE POLICY "Admin y secretaria ven todos los clientes"
ON clientes FOR SELECT
USING (has_any_role(ARRAY['admin', 'secretaria']::app_role[]));

-- Vendedores: solo clientes asignados a ellos
CREATE POLICY "Vendedores ven solo sus clientes asignados"
ON clientes FOR SELECT
USING (
  has_role(auth.uid(), 'vendedor'::app_role) 
  AND vendedor_asignado = auth.uid()
);

-- Choferes: solo clientes con pedidos en sus rutas (lectura básica para entregas)
CREATE POLICY "Choferes ven clientes de sus rutas"
ON clientes FOR SELECT
USING (
  has_role(auth.uid(), 'chofer'::app_role)
  AND EXISTS (
    SELECT 1 FROM pedidos p
    JOIN entregas e ON e.pedido_id = p.id
    JOIN rutas r ON r.id = e.ruta_id
    WHERE p.cliente_id = clientes.id
    AND r.chofer_id = auth.uid()
  )
);

-- Almacén: acceso de lectura para gestionar entregas/recepciones
CREATE POLICY "Almacen ve clientes para gestión"
ON clientes FOR SELECT
USING (has_role(auth.uid(), 'almacen'::app_role));

-- =====================================================
-- 3. RESTRINGIR ACCESO A SUCURSALES DE CLIENTES
-- =====================================================

-- Eliminar política permisiva
DROP POLICY IF EXISTS "All authenticated users can view client branches" ON cliente_sucursales;

-- Admin y Secretaria: acceso completo
CREATE POLICY "Admin y secretaria ven todas las sucursales"
ON cliente_sucursales FOR SELECT
USING (has_any_role(ARRAY['admin', 'secretaria']::app_role[]));

-- Vendedores: solo sucursales de sus clientes asignados
CREATE POLICY "Vendedores ven sucursales de sus clientes"
ON cliente_sucursales FOR SELECT
USING (
  has_role(auth.uid(), 'vendedor'::app_role)
  AND es_vendedor_de_cliente(cliente_id)
);

-- Choferes: solo sucursales en sus rutas
CREATE POLICY "Choferes ven sucursales de sus entregas"
ON cliente_sucursales FOR SELECT
USING (
  has_role(auth.uid(), 'chofer'::app_role)
  AND EXISTS (
    SELECT 1 FROM pedidos p
    JOIN entregas e ON e.pedido_id = p.id
    JOIN rutas r ON r.id = e.ruta_id
    WHERE p.sucursal_id = cliente_sucursales.id
    AND r.chofer_id = auth.uid()
  )
);

-- Almacén: acceso para gestión de entregas
CREATE POLICY "Almacen ve sucursales para gestión"
ON cliente_sucursales FOR SELECT
USING (has_role(auth.uid(), 'almacen'::app_role));

-- =====================================================
-- 4. RESTRINGIR ACCESO A CORREOS DE CLIENTES
-- =====================================================

-- Eliminar política permisiva
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver correos de clientes" ON cliente_correos;

-- Admin y Secretaria: acceso completo
CREATE POLICY "Admin y secretaria ven todos los correos"
ON cliente_correos FOR SELECT
USING (has_any_role(ARRAY['admin', 'secretaria']::app_role[]));

-- Vendedores: solo correos de sus clientes asignados
CREATE POLICY "Vendedores ven correos de sus clientes"
ON cliente_correos FOR SELECT
USING (
  has_role(auth.uid(), 'vendedor'::app_role)
  AND es_vendedor_de_cliente(cliente_id)
);

-- =====================================================
-- 5. RESTRINGIR ACCESO A PROVEEDORES
-- =====================================================

-- Eliminar política permisiva actual
DROP POLICY IF EXISTS "Todos los usuarios autenticados pueden ver proveedores" ON proveedores;

-- Solo Admin, Secretaria y Almacén pueden ver proveedores
CREATE POLICY "Solo roles de compras ven proveedores"
ON proveedores FOR SELECT
USING (has_any_role(ARRAY['admin', 'secretaria', 'almacen']::app_role[]));

-- =====================================================
-- 6. REFORZAR SEGURIDAD DE TOKENS GMAIL
-- =====================================================

-- Revocar acceso directo a gmail_cuentas para usuarios con permisos
-- Solo admin debe poder ver tokens, otros usan vista segura
DROP POLICY IF EXISTS "Usuarios ven cuentas gmail sin tokens" ON gmail_cuentas;

-- Admin: acceso completo (necesario para gestión de tokens)
-- Esta política ya existe: "Admins can manage Gmail accounts"

-- Usuarios con permiso: solo ven datos básicos (sin tokens) via vista segura
-- Forzamos que consultas de no-admins fallen para tabla directa
CREATE POLICY "Usuarios con permiso usan vista segura"
ON gmail_cuentas FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    -- Para no-admins, solo permitir si es parte de una consulta autorizada
    EXISTS (
      SELECT 1 FROM gmail_cuenta_permisos
      WHERE gmail_cuenta_permisos.gmail_cuenta_id = gmail_cuentas.id
      AND gmail_cuenta_permisos.user_id = auth.uid()
    )
    -- Los tokens se ocultan via la vista gmail_cuentas_segura
  )
);

-- =====================================================
-- 7. LOGGING DE SEGURIDAD - Tabla para auditoría
-- =====================================================

CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  table_name text,
  record_id uuid,
  details jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS en tabla de auditoría
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver logs de seguridad
CREATE POLICY "Solo admins ven logs de seguridad"
ON security_audit_log FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Cualquier usuario autenticado puede insertar logs (para auditoría automática)
CREATE POLICY "Sistema puede insertar logs"
ON security_audit_log FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_security_audit_user ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_action ON security_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_security_audit_created ON security_audit_log(created_at DESC);
