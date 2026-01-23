-- =============================================
-- Migración: Agregar rol gerente_almacen a políticas RLS de almacén
-- =============================================

-- 1. inventario_lotes - Política principal
DROP POLICY IF EXISTS "Admins and almacen can manage inventory lots" ON inventario_lotes;
CREATE POLICY "Admins and almacen can manage inventory lots"
ON inventario_lotes FOR ALL
TO public
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'almacen'::app_role) OR
  public.has_role(auth.uid(), 'gerente_almacen'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'almacen'::app_role) OR
  public.has_role(auth.uid(), 'gerente_almacen'::app_role)
);

-- 2. recepciones_participantes - INSERT
DROP POLICY IF EXISTS "Almacenistas pueden registrar participación" ON recepciones_participantes;
CREATE POLICY "Almacenistas pueden registrar participación"
ON recepciones_participantes FOR INSERT
TO public
WITH CHECK (
  public.has_role(auth.uid(), 'almacen'::app_role) OR
  public.has_role(auth.uid(), 'gerente_almacen'::app_role)
);

-- 3. inventario_movimientos - INSERT
DROP POLICY IF EXISTS "Admins and almacen can create inventory movements" ON inventario_movimientos;
CREATE POLICY "Admins and almacen can create inventory movements"
ON inventario_movimientos FOR INSERT
TO public
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'almacen'::app_role) OR
  public.has_role(auth.uid(), 'gerente_almacen'::app_role)
);

-- 4. inventario_movimientos - UPDATE
DROP POLICY IF EXISTS "Admins and almacen can update inventory movements" ON inventario_movimientos;
CREATE POLICY "Admins and almacen can update inventory movements"
ON inventario_movimientos FOR UPDATE
TO public
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'almacen'::app_role) OR
  public.has_role(auth.uid(), 'gerente_almacen'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'almacen'::app_role) OR
  public.has_role(auth.uid(), 'gerente_almacen'::app_role)
);

-- 5. inventario_movimientos - DELETE
DROP POLICY IF EXISTS "Admins and almacen can delete inventory movements" ON inventario_movimientos;
CREATE POLICY "Admins and almacen can delete inventory movements"
ON inventario_movimientos FOR DELETE
TO public
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'almacen'::app_role) OR
  public.has_role(auth.uid(), 'gerente_almacen'::app_role)
);

-- 6. devoluciones_proveedor - SELECT e INSERT
DROP POLICY IF EXISTS "Almacenistas pueden ver devoluciones" ON devoluciones_proveedor;
CREATE POLICY "Almacenistas pueden ver devoluciones"
ON devoluciones_proveedor FOR SELECT
TO public
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'almacen'::app_role) OR
  public.has_role(auth.uid(), 'gerente_almacen'::app_role)
);

DROP POLICY IF EXISTS "Almacenistas pueden crear devoluciones" ON devoluciones_proveedor;
CREATE POLICY "Almacenistas pueden crear devoluciones"
ON devoluciones_proveedor FOR INSERT
TO public
WITH CHECK (
  public.has_role(auth.uid(), 'almacen'::app_role) OR
  public.has_role(auth.uid(), 'gerente_almacen'::app_role)
);

-- 7. devoluciones_proveedor_evidencias - INSERT
DROP POLICY IF EXISTS "Almacenistas pueden insertar evidencias devoluciones" ON devoluciones_proveedor_evidencias;
CREATE POLICY "Almacenistas pueden insertar evidencias devoluciones"
ON devoluciones_proveedor_evidencias FOR INSERT
TO public
WITH CHECK (
  public.has_role(auth.uid(), 'almacen'::app_role) OR
  public.has_role(auth.uid(), 'gerente_almacen'::app_role)
);

-- 8. ordenes_compra_entregas_evidencias - INSERT
DROP POLICY IF EXISTS "Almacenistas pueden insertar evidencias" ON ordenes_compra_entregas_evidencias;
CREATE POLICY "Almacenistas pueden insertar evidencias"
ON ordenes_compra_entregas_evidencias FOR INSERT
TO public
WITH CHECK (
  public.has_role(auth.uid(), 'almacen'::app_role) OR
  public.has_role(auth.uid(), 'gerente_almacen'::app_role)
);

-- 9. carga_productos - ALL
DROP POLICY IF EXISTS "Admins y almacen pueden gestionar carga productos" ON carga_productos;
CREATE POLICY "Admins y almacen pueden gestionar carga productos"
ON carga_productos FOR ALL
TO public
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'almacen'::app_role) OR
  public.has_role(auth.uid(), 'gerente_almacen'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'almacen'::app_role) OR
  public.has_role(auth.uid(), 'gerente_almacen'::app_role)
);

-- 10. carga_evidencias - ALL
DROP POLICY IF EXISTS "Admins y almacen pueden gestionar carga evidencias" ON carga_evidencias;
CREATE POLICY "Admins y almacen pueden gestionar carga evidencias"
ON carga_evidencias FOR ALL
TO public
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'almacen'::app_role) OR
  public.has_role(auth.uid(), 'gerente_almacen'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'almacen'::app_role) OR
  public.has_role(auth.uid(), 'gerente_almacen'::app_role)
);

-- 11. Storage: recepciones-evidencias bucket - INSERT
DROP POLICY IF EXISTS "Admins y almacen pueden subir evidencias recepciones" ON storage.objects;
CREATE POLICY "Admins y almacen pueden subir evidencias recepciones"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'recepciones-evidencias' AND (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'almacen'::app_role) OR
    public.has_role(auth.uid(), 'gerente_almacen'::app_role)
  )
);

-- 12. Storage: devoluciones-evidencias bucket - INSERT
DROP POLICY IF EXISTS "Almacen puede subir evidencias devoluciones" ON storage.objects;
CREATE POLICY "Almacen puede subir evidencias devoluciones"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'devoluciones-evidencias' AND (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'almacen'::app_role) OR
    public.has_role(auth.uid(), 'gerente_almacen'::app_role)
  )
);