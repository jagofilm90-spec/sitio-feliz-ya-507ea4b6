CREATE OR REPLACE FUNCTION update_empleado_json(p_id uuid, p_data json)
RETURNS void AS $$
BEGIN
  UPDATE empleados SET
    nombre_completo = COALESCE((p_data->>'nombre_completo'), nombre_completo),
    nombre = (p_data->>'nombre'),
    primer_apellido = (p_data->>'primer_apellido'),
    segundo_apellido = (p_data->>'segundo_apellido'),
    rfc = (p_data->>'rfc'),
    curp = (p_data->>'curp'),
    fecha_nacimiento = (p_data->>'fecha_nacimiento')::date,
    telefono = (p_data->>'telefono'),
    email = (p_data->>'email'),
    fecha_ingreso = (p_data->>'fecha_ingreso')::date,
    puesto = (p_data->>'puesto'),
    activo = COALESCE((p_data->>'activo')::boolean, activo),
    notas = (p_data->>'notas'),
    sueldo_bruto = (p_data->>'sueldo_bruto')::numeric,
    periodo_pago = (p_data->>'periodo_pago'),
    fecha_baja = (p_data->>'fecha_baja')::date,
    motivo_baja = (p_data->>'motivo_baja'),
    beneficiario = (p_data->>'beneficiario'),
    premio_asistencia_semanal = (p_data->>'premio_asistencia_semanal')::numeric,
    numero_seguro_social = (p_data->>'numero_seguro_social'),
    contacto_emergencia_nombre = (p_data->>'contacto_emergencia_nombre'),
    contacto_emergencia_telefono = (p_data->>'contacto_emergencia_telefono'),
    tipo_sangre = (p_data->>'tipo_sangre'),
    estado_civil = (p_data->>'estado_civil'),
    numero_dependientes = (p_data->>'numero_dependientes')::integer,
    nivel_estudios = (p_data->>'nivel_estudios'),
    cuenta_bancaria = (p_data->>'cuenta_bancaria'),
    clabe_interbancaria = (p_data->>'clabe_interbancaria')
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
