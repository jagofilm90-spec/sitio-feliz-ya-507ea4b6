-- Limpieza de 26 productos con peso en especificaciones
-- Separar variantes de formatos de empaque

-- =====================================================
-- PATRÓN A: Solo formato empaque → limpiar a NULL
-- =====================================================

-- SEM-013: Arroz Morelos "25/1kg" → null + "25×1 kg"
UPDATE productos SET especificaciones = NULL, contenido_empaque = '25×1 kg' 
WHERE codigo = 'SEM-013';

-- VAR-006: Crema de Cacahuate "20kg Cubeta" → null (cubeta ya está en unidad)
UPDATE productos SET especificaciones = NULL 
WHERE codigo = 'VAR-006';

-- VAR-015: Miel de Abeja "25kg Cubeta" → null
UPDATE productos SET especificaciones = NULL 
WHERE codigo = 'VAR-015';

-- VAR-011: Granola "20/1 kg" → null + "20×1 kg"
UPDATE productos SET especificaciones = NULL, contenido_empaque = '20×1 kg' 
WHERE codigo = 'VAR-011';

-- SAL-003: Sal Molida "20/1kg" → null + "20×1 kg"
UPDATE productos SET especificaciones = NULL, contenido_empaque = '20×1 kg' 
WHERE codigo = 'SAL-003';

-- SAL-005: Sal Refinada "18/1kg" → null + "18×1 kg"
UPDATE productos SET especificaciones = NULL, contenido_empaque = '18×1 kg' 
WHERE codigo = 'SAL-005';

-- COC-GRE-001: Coctel de Frutas "12/820gr" → null + "12×820g"
UPDATE productos SET especificaciones = NULL, contenido_empaque = '12×820g' 
WHERE codigo = 'COC-GRE-001';

-- =====================================================
-- PATRÓN B: Variante + formato empaque → separar
-- =====================================================

-- VAR-004: Cereza "Con Rabo 4/3.500 kg" → "Con Rabo" + "4×3.5 kg"
UPDATE productos SET especificaciones = 'Con Rabo', contenido_empaque = '4×3.5 kg' 
WHERE codigo = 'VAR-004';

-- VAR-003: Cereza "Sin Rabo 4/3.500 kg" → "Sin Rabo" + "4×3.5 kg"
UPDATE productos SET especificaciones = 'Sin Rabo', contenido_empaque = '4×3.5 kg' 
WHERE codigo = 'VAR-003';

-- DUR-GRE-002: Durazno "En Mitades 12/820gr" → "En Mitades" + "12×820g"
UPDATE productos SET especificaciones = 'En Mitades', contenido_empaque = '12×820g' 
WHERE codigo = 'DUR-GRE-002';

-- DUR-GRE-001: Durazno "Mitades 6/2.500kg" → "Mitades" + "6×2.5 kg"
UPDATE productos SET especificaciones = 'Mitades', contenido_empaque = '6×2.5 kg' 
WHERE codigo = 'DUR-GRE-001';

-- MAN-NAC-001: Mango "Rebanadas 24/800gr" → "Rebanadas" + "24×800g"
UPDATE productos SET especificaciones = 'Rebanadas', contenido_empaque = '24×800g' 
WHERE codigo = 'MAN-NAC-001';

-- PIÑ-NAC-001: Piña "Rodajas 6/2.800kg" → "Rodajas" + "6×2.8 kg"
UPDATE productos SET especificaciones = 'Rodajas', contenido_empaque = '6×2.8 kg' 
WHERE codigo = 'PIÑ-NAC-001';

-- PIÑ-TAI-001: Piña "Rodaja 6/3.050kg" → "Rodaja" + "6×3.05 kg"
UPDATE productos SET especificaciones = 'Rodaja', contenido_empaque = '6×3.05 kg' 
WHERE codigo = 'PIÑ-TAI-001';

-- PIÑ-NAC-003: Piña "Rodaja (8) 24/800gr" → "Rodaja (8)" + "24×800g"
UPDATE productos SET especificaciones = 'Rodaja (8)', contenido_empaque = '24×800g' 
WHERE codigo = 'PIÑ-NAC-003';

-- PIÑ-NAC-004: Piña "Rodaja (11) 24/800gr" → "Rodaja (11)" + "24×800g"
UPDATE productos SET especificaciones = 'Rodaja (11)', contenido_empaque = '24×800g' 
WHERE codigo = 'PIÑ-NAC-004';

-- PIÑ-NAC-005: Piña "Trozo 24/800gr" → "Trozo" + "24×800g"
UPDATE productos SET especificaciones = 'Trozo', contenido_empaque = '24×800g' 
WHERE codigo = 'PIÑ-NAC-005';

-- PIÑ-TAI-002: Piña "Trozo 6/3.050kg" → "Trozo" + "6×3.05 kg"
UPDATE productos SET especificaciones = 'Trozo', contenido_empaque = '6×3.05 kg' 
WHERE codigo = 'PIÑ-TAI-002';

-- PIÑ-TAI-003: Piña "Rodaja (14) 12/850gr" → "Rodaja (14)" + "12×850g"
UPDATE productos SET especificaciones = 'Rodaja (14)', contenido_empaque = '12×850g' 
WHERE codigo = 'PIÑ-TAI-003';

-- PIÑ-TAI-004: Piña "Rodaja 12/850gr" → "Rodaja" + "12×850g"
UPDATE productos SET especificaciones = 'Rodaja', contenido_empaque = '12×850g' 
WHERE codigo = 'PIÑ-TAI-004';

-- PIÑ-NAC-002: Piña "Trozo 6/2.800kg" → "Trozo" + "6×2.8 kg"
UPDATE productos SET especificaciones = 'Trozo', contenido_empaque = '6×2.8 kg' 
WHERE codigo = 'PIÑ-NAC-002';

-- VEL-026: Veladora "Extra Envuelta 100/110gr" → "Extra Envuelta" + "100×110g"
UPDATE productos SET especificaciones = 'Extra Envuelta', contenido_empaque = '100×110g' 
WHERE codigo = 'VEL-026';

-- VEL-027: Veladora Santo Cristo "Extra Envuelta 100/130gr" → "Extra Envuelta" + "100×130g"
UPDATE productos SET especificaciones = 'Extra Envuelta', contenido_empaque = '100×130g' 
WHERE codigo = 'VEL-027';

-- VEL-028: Veladora Santo Cristo "Cono Azul 40/210gr" → "Cono Azul" + "40×210g"
UPDATE productos SET especificaciones = 'Cono Azul', contenido_empaque = '40×210g' 
WHERE codigo = 'VEL-028';

-- VEL-029: Veladora Santo Cristo "Cono Rosa 40/210gr" → "Cono Rosa" + "40×210g"
UPDATE productos SET especificaciones = 'Cono Rosa', contenido_empaque = '40×210g' 
WHERE codigo = 'VEL-029';

-- =====================================================
-- PATRÓN C: Casos especiales
-- =====================================================

-- PAP-001: Papel Estraza "Blanco Revolución 25kg Balón" → "Blanco Revolución"
UPDATE productos SET especificaciones = 'Blanco Revolución' 
WHERE codigo = 'PAP-001';