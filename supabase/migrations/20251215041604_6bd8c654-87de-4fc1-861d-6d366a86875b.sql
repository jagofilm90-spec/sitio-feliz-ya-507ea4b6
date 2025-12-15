-- Permitir a almacenistas actualizar cantidad_recibida en ordenes_compra_detalles
CREATE POLICY "Almacenistas pueden actualizar cantidad recibida"
ON ordenes_compra_detalles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'almacen'::app_role))
WITH CHECK (has_role(auth.uid(), 'almacen'::app_role));