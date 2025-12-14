-- Permitir que almacenistas vean empleados para mostrar nombres de choferes en rutas
CREATE POLICY "Almacenistas pueden ver empleados para rutas"
ON public.empleados
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'almacen'::app_role));