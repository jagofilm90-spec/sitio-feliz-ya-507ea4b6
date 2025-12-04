-- Fase 1.1: Crear ENUM para prioridad de entrega
CREATE TYPE delivery_priority AS ENUM (
  'vip_mismo_dia',
  'deadline',
  'dia_fijo_recurrente',
  'fecha_sugerida',
  'flexible'
);

-- Agregar columnas de prioridad a pedidos
ALTER TABLE pedidos ADD COLUMN prioridad_entrega delivery_priority DEFAULT 'fecha_sugerida';
ALTER TABLE pedidos ADD COLUMN deadline_dias_habiles INTEGER;
ALTER TABLE pedidos ADD COLUMN dia_fijo_semanal TEXT;

-- Fase 1.2: Crear ENUM para región geográfica
CREATE TYPE zona_region AS ENUM (
  'cdmx_norte',
  'cdmx_centro',
  'cdmx_sur',
  'cdmx_oriente',
  'cdmx_poniente',
  'edomex_norte',
  'edomex_oriente',
  'toluca',
  'morelos',
  'puebla',
  'hidalgo',
  'queretaro',
  'tlaxcala'
);

-- Agregar campos de agrupación geográfica a zonas
ALTER TABLE zonas ADD COLUMN region zona_region;
ALTER TABLE zonas ADD COLUMN es_foranea BOOLEAN DEFAULT false;
ALTER TABLE zonas ADD COLUMN zonas_cercanas UUID[];

-- Fase 1.3: Actualizar zonas existentes con regiones
UPDATE zonas SET region = 'cdmx_norte', es_foranea = false WHERE nombre ILIKE '%Gustavo A. Madero%' OR nombre ILIKE '%Azcapotzalco%' OR nombre ILIKE '%Venustiano Carranza%';
UPDATE zonas SET region = 'cdmx_centro', es_foranea = false WHERE nombre ILIKE '%Cuauhtémoc%' OR nombre ILIKE '%Miguel Hidalgo%' OR nombre ILIKE '%Benito Juárez%';
UPDATE zonas SET region = 'cdmx_sur', es_foranea = false WHERE nombre ILIKE '%Coyoacán%' OR nombre ILIKE '%Tlalpan%' OR nombre ILIKE '%Xochimilco%' OR nombre ILIKE '%Milpa Alta%' OR nombre ILIKE '%Magdalena Contreras%' OR nombre ILIKE '%Tláhuac%';
UPDATE zonas SET region = 'cdmx_oriente', es_foranea = false WHERE nombre ILIKE '%Iztacalco%' OR nombre ILIKE '%Iztapalapa%';
UPDATE zonas SET region = 'cdmx_poniente', es_foranea = false WHERE nombre ILIKE '%Cuajimalpa%' OR nombre ILIKE '%Álvaro Obregón%';
UPDATE zonas SET region = 'edomex_norte', es_foranea = false WHERE nombre ILIKE '%Ecatepec%' OR nombre ILIKE '%Tlalnepantla%' OR nombre ILIKE '%Tultitlán%' OR nombre ILIKE '%Cuautitlán%' OR nombre ILIKE '%Coacalco%' OR nombre ILIKE '%Tecámac%' OR nombre ILIKE '%Atizapán%' OR nombre ILIKE '%Naucalpan%' OR nombre ILIKE '%Nicolás Romero%' OR nombre ILIKE '%Huixquilucan%' OR nombre ILIKE '%Zumpango%';
UPDATE zonas SET region = 'edomex_oriente', es_foranea = false WHERE nombre ILIKE '%Nezahualcóyotl%' OR nombre ILIKE '%Chimalhuacán%' OR nombre ILIKE '%Chalco%' OR nombre ILIKE '%La Paz%' OR nombre ILIKE '%Ixtapaluca%' OR nombre ILIKE '%Los Reyes%' OR nombre ILIKE '%Valle de Chalco%' OR nombre ILIKE '%Texcoco%';
UPDATE zonas SET region = 'toluca', es_foranea = true WHERE nombre ILIKE '%Toluca%' OR nombre ILIKE '%Metepec%' OR nombre ILIKE '%Lerma%' OR nombre ILIKE '%Zinacantepec%';
UPDATE zonas SET region = 'morelos', es_foranea = true WHERE nombre ILIKE '%Morelos%' OR nombre ILIKE '%Cuernavaca%' OR nombre ILIKE '%Cuautla%' OR nombre ILIKE '%Jiutepec%' OR nombre ILIKE '%Tequesquitengo%' OR nombre ILIKE '%Yautepec%';
UPDATE zonas SET region = 'puebla', es_foranea = true WHERE nombre ILIKE '%Puebla%';
UPDATE zonas SET region = 'hidalgo', es_foranea = true WHERE nombre ILIKE '%Hidalgo%' OR nombre ILIKE '%Pachuca%' OR nombre ILIKE '%Tizayuca%';
UPDATE zonas SET region = 'queretaro', es_foranea = true WHERE nombre ILIKE '%Querétaro%';
UPDATE zonas SET region = 'tlaxcala', es_foranea = true WHERE nombre ILIKE '%Tlaxcala%' OR nombre ILIKE '%Apizaco%';
UPDATE zonas SET region = 'edomex_norte', es_foranea = false WHERE nombre ILIKE '%Estado de México%' AND region IS NULL;