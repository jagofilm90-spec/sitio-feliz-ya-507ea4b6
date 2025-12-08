-- Agregar columna chofer_asignado_id a vehiculos
ALTER TABLE vehiculos 
ADD COLUMN chofer_asignado_id uuid REFERENCES empleados(id);

-- Crear índice para búsquedas eficientes
CREATE INDEX idx_vehiculos_chofer_asignado ON vehiculos(chofer_asignado_id);