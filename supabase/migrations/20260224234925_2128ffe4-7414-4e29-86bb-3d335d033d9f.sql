-- Allow almacen and gerente_almacen roles to INSERT and UPDATE rutas (for loading process)
CREATE POLICY "Almacenistas can create and update routes for loading"
ON public.rutas
FOR ALL
USING (
  has_role(auth.uid(), 'almacen'::app_role) OR 
  has_role(auth.uid(), 'gerente_almacen'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'almacen'::app_role) OR 
  has_role(auth.uid(), 'gerente_almacen'::app_role)
);