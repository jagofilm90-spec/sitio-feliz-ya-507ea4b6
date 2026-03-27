CREATE OR REPLACE FUNCTION update_empleado_extras(
  p_empleado_id uuid,
  p_beneficiario text DEFAULT NULL,
  p_premio_asistencia_semanal numeric DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE empleados
  SET beneficiario = COALESCE(p_beneficiario, beneficiario),
      premio_asistencia_semanal = COALESCE(p_premio_asistencia_semanal, premio_asistencia_semanal)
  WHERE id = p_empleado_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
