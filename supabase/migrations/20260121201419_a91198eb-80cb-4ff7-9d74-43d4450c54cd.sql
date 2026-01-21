-- 1. Actualizar política de proveedores para incluir gerente_almacen
DROP POLICY IF EXISTS "Solo roles de compras ven proveedores" ON proveedores;
CREATE POLICY "Solo roles de compras ven proveedores" ON proveedores
  FOR SELECT
  TO public
  USING (
    has_any_role(ARRAY['admin'::app_role, 'secretaria'::app_role, 'almacen'::app_role, 'gerente_almacen'::app_role])
  );

-- 2. Actualizar política de ordenes_compra para UPDATE
DROP POLICY IF EXISTS "Almacenistas pueden actualizar recepciones" ON ordenes_compra;
CREATE POLICY "Almacenistas pueden actualizar recepciones" ON ordenes_compra
  FOR UPDATE
  TO authenticated
  USING (
    has_any_role(ARRAY['admin'::app_role, 'secretaria'::app_role, 'almacen'::app_role, 'gerente_almacen'::app_role])
  );

-- 3. Actualizar política de ordenes_compra_detalles para UPDATE
DROP POLICY IF EXISTS "Almacenistas pueden actualizar cantidad recibida" ON ordenes_compra_detalles;
CREATE POLICY "Almacenistas pueden actualizar cantidad recibida" ON ordenes_compra_detalles
  FOR UPDATE
  TO authenticated
  USING (
    has_any_role(ARRAY['almacen'::app_role, 'gerente_almacen'::app_role])
  );

-- 4. Actualizar política de ordenes_compra_entregas para UPDATE
DROP POLICY IF EXISTS "Almacenistas pueden actualizar entregas" ON ordenes_compra_entregas;
CREATE POLICY "Almacenistas pueden actualizar entregas" ON ordenes_compra_entregas
  FOR UPDATE
  TO authenticated
  USING (
    has_any_role(ARRAY['almacen'::app_role, 'gerente_almacen'::app_role])
  );