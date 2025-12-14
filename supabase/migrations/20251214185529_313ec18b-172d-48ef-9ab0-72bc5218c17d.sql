-- Agregar campo almacenista_id a rutas para asignar qué almacenista cargará cada ruta
ALTER TABLE public.rutas ADD COLUMN almacenista_id uuid REFERENCES public.empleados(id);

-- Crear índice para búsquedas eficientes
CREATE INDEX idx_rutas_almacenista_id ON public.rutas(almacenista_id);

-- RLS: Almacenistas solo ven rutas asignadas a ellos
CREATE POLICY "Almacenistas ven sus rutas asignadas"
ON public.rutas
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'almacen'::app_role) 
  AND almacenista_id IN (
    SELECT id FROM empleados WHERE user_id = auth.uid()
  )
);

-- Agregar permisos de módulos para almacén
INSERT INTO public.module_permissions (module_path, module_name, role, tiene_acceso)
VALUES 
  ('/inventario', 'Inventario', 'almacen', true),
  ('/productos', 'Productos', 'almacen', true)
ON CONFLICT (module_path, role) DO UPDATE SET tiene_acceso = true;