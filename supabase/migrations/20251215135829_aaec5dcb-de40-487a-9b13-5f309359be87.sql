-- Fix: Recreate empleados_vista_segura view with security_invoker to inherit RLS from empleados table
-- The empleados table already has proper RLS (only admin/secretaria can access)

-- First drop the existing view
DROP VIEW IF EXISTS public.empleados_vista_segura;

-- Recreate with security_invoker = true so it respects RLS from underlying empleados table
CREATE VIEW public.empleados_vista_segura 
WITH (security_invoker = true)
AS
SELECT 
  id,
  fecha_ingreso,
  activo,
  user_id,
  created_at,
  updated_at,
  sueldo_bruto,
  fecha_nacimiento,
  fecha_baja,
  numero_dependientes,
  nombre,
  primer_apellido,
  segundo_apellido,
  puesto,
  email,
  telefono,
  rfc,
  curp,
  numero_seguro_social,
  cuenta_bancaria,
  clabe_interbancaria,
  direccion,
  motivo_baja,
  periodo_pago,
  notas,
  contacto_emergencia_nombre,
  contacto_emergencia_telefono,
  tipo_sangre,
  estado_civil,
  nivel_estudios,
  nombre_completo
FROM public.empleados;

-- Add comment explaining security model
COMMENT ON VIEW public.empleados_vista_segura IS 'Secure employee view with security_invoker=true. Inherits RLS from empleados table - only admin and secretaria roles can access.';