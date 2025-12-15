-- Recrear vista empleados_vista_segura con security_invoker para heredar RLS
DROP VIEW IF EXISTS public.empleados_vista_segura;

CREATE VIEW public.empleados_vista_segura 
WITH (security_invoker = true) AS
SELECT 
    id, nombre_completo, nombre, primer_apellido, segundo_apellido,
    puesto, email, telefono, rfc, curp, numero_seguro_social,
    cuenta_bancaria, clabe_interbancaria, direccion,
    fecha_ingreso, fecha_baja, motivo_baja, fecha_nacimiento,
    activo, user_id, created_at, updated_at, sueldo_bruto,
    periodo_pago, notas, contacto_emergencia_nombre,
    contacto_emergencia_telefono, tipo_sangre, estado_civil,
    nivel_estudios, numero_dependientes
FROM public.empleados;

COMMENT ON VIEW public.empleados_vista_segura IS 
'Vista de empleados con security_invoker=true. Hereda políticas RLS de tabla empleados - solo Admin y Secretaria pueden ver datos sensibles.';