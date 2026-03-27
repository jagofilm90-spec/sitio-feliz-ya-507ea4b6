CREATE OR REPLACE FUNCTION get_empleado_extras(p_empleado_id uuid)
RETURNS TABLE(beneficiario text, premio_asistencia_semanal numeric) AS $$
BEGIN
  RETURN QUERY SELECT e.beneficiario, e.premio_asistencia_semanal FROM empleados e WHERE e.id = p_empleado_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
