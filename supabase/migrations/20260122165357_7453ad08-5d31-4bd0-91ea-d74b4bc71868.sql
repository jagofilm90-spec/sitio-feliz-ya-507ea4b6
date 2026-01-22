-- =============================================
-- Corregir políticas RLS para rol gerente_almacen
-- =============================================

-- 1. TABLA EMPLEADOS - Actualizar políticas para incluir gerente_almacen
-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Almacenistas pueden ver empleados para rutas" ON empleados;
DROP POLICY IF EXISTS "Admins y secretarias pueden gestionar empleados" ON empleados;

-- Política SELECT: Almacen y gerente_almacen pueden ver empleados
CREATE POLICY "Almacen y gerente pueden ver empleados"
ON empleados FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'secretaria'::app_role)
  OR has_role(auth.uid(), 'almacen'::app_role)
  OR has_role(auth.uid(), 'gerente_almacen'::app_role)
);

-- Política de gestión completa para roles administrativos
CREATE POLICY "Roles administrativos gestionan empleados"
ON empleados FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'secretaria'::app_role)
  OR has_role(auth.uid(), 'gerente_almacen'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'secretaria'::app_role)
  OR has_role(auth.uid(), 'gerente_almacen'::app_role)
);

-- 2. TABLA VEHICULOS - Verificar que gerente_almacen pueda ver vehículos
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver vehiculos" ON vehiculos;

CREATE POLICY "Usuarios autenticados pueden ver vehiculos"
ON vehiculos FOR SELECT
TO authenticated
USING (true);

-- Política de gestión de vehículos para gerente_almacen
DROP POLICY IF EXISTS "Gerente almacen gestiona vehiculos" ON vehiculos;

CREATE POLICY "Gerente almacen gestiona vehiculos"
ON vehiculos FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'gerente_almacen'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'gerente_almacen'::app_role)
);

-- 3. TABLA VEHICULOS_CHECKUPS - Políticas para el sistema de checkups
DROP POLICY IF EXISTS "Usuarios pueden ver checkups" ON vehiculos_checkups;
DROP POLICY IF EXISTS "Almacen puede crear checkups" ON vehiculos_checkups;
DROP POLICY IF EXISTS "Gerente puede gestionar checkups" ON vehiculos_checkups;

-- Política SELECT: Roles de almacén pueden ver checkups
CREATE POLICY "Almacen puede ver checkups"
ON vehiculos_checkups FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'almacen'::app_role)
  OR has_role(auth.uid(), 'gerente_almacen'::app_role)
  OR has_role(auth.uid(), 'chofer'::app_role)
);

-- Política INSERT: Almacén y gerente pueden crear checkups
CREATE POLICY "Almacen puede crear checkups"
ON vehiculos_checkups FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'almacen'::app_role)
  OR has_role(auth.uid(), 'gerente_almacen'::app_role)
);

-- Política UPDATE: Gerente puede actualizar checkups
CREATE POLICY "Gerente puede actualizar checkups"
ON vehiculos_checkups FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'gerente_almacen'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'gerente_almacen'::app_role)
);

-- 4. TABLA EMPLEADOS_DOCUMENTOS - Para ver licencias de choferes
DROP POLICY IF EXISTS "Gerente almacen puede ver documentos empleados" ON empleados_documentos;

CREATE POLICY "Gerente almacen puede ver documentos empleados"
ON empleados_documentos FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'secretaria'::app_role)
  OR has_role(auth.uid(), 'gerente_almacen'::app_role)
);