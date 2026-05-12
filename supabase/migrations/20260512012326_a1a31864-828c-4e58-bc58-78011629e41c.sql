-- Fix 1: Restrict empleados table — sensitive financial/identity data only for admin & secretaria
DROP POLICY IF EXISTS "Almacen y gerente pueden ver empleados" ON public.empleados;

-- Fix 2: Recreate empleados_vista_segura with only NON-sensitive columns,
-- security_invoker so RLS applies, and access for operational roles that need basic info.
DROP VIEW IF EXISTS public.empleados_vista_segura;

CREATE VIEW public.empleados_vista_segura
WITH (security_invoker = true) AS
SELECT
  id,
  nombre_completo,
  nombre,
  primer_apellido,
  segundo_apellido,
  puesto,
  email,
  telefono,
  fecha_ingreso,
  fecha_baja,
  activo,
  user_id,
  created_at,
  updated_at
FROM public.empleados;

-- Allow operational roles to read basic employee info via the view
-- (security_invoker means they need a SELECT policy on empleados; but that would
-- also let them SELECT sensitive columns directly). Instead, switch view to definer
-- and gate access inside the view itself.
DROP VIEW public.empleados_vista_segura;

CREATE VIEW public.empleados_vista_segura AS
SELECT
  id, nombre_completo, nombre, primer_apellido, segundo_apellido,
  puesto, email, telefono, fecha_ingreso, fecha_baja, activo,
  user_id, created_at, updated_at
FROM public.empleados
WHERE
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'secretaria'::app_role)
  OR public.has_role(auth.uid(), 'almacen'::app_role)
  OR public.has_role(auth.uid(), 'gerente_almacen'::app_role)
  OR public.has_role(auth.uid(), 'contadora'::app_role)
  OR public.has_role(auth.uid(), 'chofer'::app_role)
  OR public.has_role(auth.uid(), 'vendedor'::app_role);

REVOKE ALL ON public.empleados_vista_segura FROM PUBLIC, anon;
GRANT SELECT ON public.empleados_vista_segura TO authenticated;

-- Fix 3: Tighten profiles — remove broad "all internal roles see all profiles"
DROP POLICY IF EXISTS "Internal roles can view all profiles" ON public.profiles;

-- Allow admin/secretaria (HR/admin functions) to view all profiles
CREATE POLICY "Admin and secretaria view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'secretaria'::app_role)
);

-- Allow internal staff to view profiles of users they share a conversation with
CREATE POLICY "View profiles in shared conversations"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.conversacion_participantes cp1
    JOIN public.conversacion_participantes cp2
      ON cp1.conversacion_id = cp2.conversacion_id
    WHERE cp1.user_id = auth.uid()
      AND cp2.user_id = profiles.id
  )
);
