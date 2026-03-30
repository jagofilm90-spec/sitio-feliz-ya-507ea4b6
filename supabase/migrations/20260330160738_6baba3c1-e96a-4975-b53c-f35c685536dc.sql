
CREATE OR REPLACE FUNCTION public.lookup_employee_by_email(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_result jsonb;
  v_emp record;
  v_profile record;
BEGIN
  -- 1. Try finding employee by personal email
  SELECT id, nombre_completo, puesto, foto_url
  INTO v_emp
  FROM empleados
  WHERE email = p_email
  LIMIT 1;

  IF v_emp IS NOT NULL THEN
    RETURN jsonb_build_object(
      'nombre', v_emp.nombre_completo,
      'puesto', v_emp.puesto,
      'empleado_id', v_emp.id,
      'foto_url', v_emp.foto_url
    );
  END IF;

  -- 2. Try finding profile by email, then employee by user_id
  SELECT id, full_name
  INTO v_profile
  FROM profiles
  WHERE email = p_email
  LIMIT 1;

  IF v_profile IS NOT NULL THEN
    SELECT id, nombre_completo, puesto, foto_url
    INTO v_emp
    FROM empleados
    WHERE user_id = v_profile.id
    LIMIT 1;

    IF v_emp IS NOT NULL THEN
      RETURN jsonb_build_object(
        'nombre', v_emp.nombre_completo,
        'puesto', v_emp.puesto,
        'empleado_id', v_emp.id,
        'foto_url', v_emp.foto_url
      );
    END IF;

    RETURN jsonb_build_object(
      'nombre', v_profile.full_name,
      'puesto', null,
      'empleado_id', null,
      'foto_url', null
    );
  END IF;

  -- 3. Nothing found
  RETURN null;
END;
$$;
