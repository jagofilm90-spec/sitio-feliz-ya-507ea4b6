-- Fix profiles_chat view: add security_invoker to inherit RLS from profiles table
DROP VIEW IF EXISTS public.profiles_chat;

CREATE VIEW public.profiles_chat WITH (security_invoker = true) AS
SELECT 
    id,
    full_name,
    email,
    phone,
    created_at,
    updated_at
FROM public.profiles;

COMMENT ON VIEW public.profiles_chat IS 'Vista segura de profiles para chat. Usa security_invoker para heredar RLS de la tabla profiles.';

-- Fix gmail_cuentas_segura view: add security_invoker to inherit RLS from gmail_cuentas table
DROP VIEW IF EXISTS public.gmail_cuentas_segura;

CREATE VIEW public.gmail_cuentas_segura WITH (security_invoker = true) AS
SELECT 
    id,
    email,
    nombre,
    proposito,
    activo,
    created_at,
    updated_at,
    token_expires_at,
    NULL::text AS access_token,
    NULL::text AS refresh_token
FROM public.gmail_cuentas;

COMMENT ON VIEW public.gmail_cuentas_segura IS 'Vista segura de gmail_cuentas que oculta tokens OAuth. Usa security_invoker para heredar RLS de gmail_cuentas.';

-- Fix empleados_vista_segura view: add security_invoker to inherit RLS from empleados table
DROP VIEW IF EXISTS public.empleados_vista_segura;

CREATE VIEW public.empleados_vista_segura WITH (security_invoker = true) AS
SELECT 
    id,
    nombre_completo,
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
    fecha_ingreso,
    fecha_baja,
    motivo_baja,
    fecha_nacimiento,
    activo,
    user_id,
    created_at,
    updated_at,
    sueldo_bruto,
    periodo_pago,
    notas,
    contacto_emergencia_nombre,
    contacto_emergencia_telefono,
    tipo_sangre,
    estado_civil,
    nivel_estudios,
    numero_dependientes
FROM public.empleados;

COMMENT ON VIEW public.empleados_vista_segura IS 'Vista de empleados que hereda RLS de la tabla empleados via security_invoker.';