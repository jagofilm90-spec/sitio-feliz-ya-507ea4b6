-- Migrar contactos existentes de la tabla proveedores a proveedor_contactos
-- Solo insertamos si el proveedor tiene al menos email o teléfono Y no existe ya un contacto principal
INSERT INTO proveedor_contactos (proveedor_id, nombre, telefono, email, es_principal, recibe_ordenes, recibe_pagos, recibe_devoluciones, recibe_logistica)
SELECT 
  p.id,
  COALESCE(NULLIF(p.nombre_contacto, ''), 'Contacto Principal'),
  COALESCE(p.telefono, ''),
  COALESCE(p.email, ''),
  true, -- es_principal
  true, -- recibe_ordenes
  true, -- recibe_pagos  
  true, -- recibe_devoluciones
  true  -- recibe_logistica
FROM proveedores p
WHERE (p.email IS NOT NULL AND p.email != '') 
   OR (p.telefono IS NOT NULL AND p.telefono != '')
   OR (p.nombre_contacto IS NOT NULL AND p.nombre_contacto != '')
-- Evitar duplicados: solo insertar si no existe ya un contacto principal para ese proveedor
AND NOT EXISTS (
  SELECT 1 FROM proveedor_contactos pc 
  WHERE pc.proveedor_id = p.id AND pc.es_principal = true
);