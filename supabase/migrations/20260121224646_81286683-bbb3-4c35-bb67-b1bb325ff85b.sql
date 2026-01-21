-- Add new columns to vehiculos_checkups for professional checklist format
ALTER TABLE vehiculos_checkups 
ADD COLUMN IF NOT EXISTS kilometraje_inicial INTEGER,
ADD COLUMN IF NOT EXISTS kilometraje_final INTEGER,
ADD COLUMN IF NOT EXISTS hora_inspeccion TIME,
ADD COLUMN IF NOT EXISTS checklist_detalle JSONB,
ADD COLUMN IF NOT EXISTS firma_conductor TEXT,
ADD COLUMN IF NOT EXISTS firma_supervisor TEXT,
ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES empleados(id),
ADD COLUMN IF NOT EXISTS tiene_items_nn_fallados BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS observaciones_golpes TEXT;

-- Add comment explaining the checklist_detalle structure
COMMENT ON COLUMN vehiculos_checkups.checklist_detalle IS 'JSONB containing detailed checklist with categories: sistema_luces, parte_externa, parte_interna, estado_llantas, accesorios_seguridad, tapas_otros. Each item can be B (Bueno), M (Mal), or NA (No Aplica)';

COMMENT ON COLUMN vehiculos_checkups.tiene_items_nn_fallados IS 'True if any No Negociable (NN) item has M status - vehicle cannot depart until resolved';