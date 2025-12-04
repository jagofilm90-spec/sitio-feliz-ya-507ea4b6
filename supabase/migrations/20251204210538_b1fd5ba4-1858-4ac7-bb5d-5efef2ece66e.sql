-- Agregar zonas faltantes del área metropolitana
INSERT INTO zonas (nombre, descripcion) VALUES
-- Estado de México - Valle de México
('Ecatepec de Morelos', 'Municipio del Estado de México'),
('Naucalpan de Juárez', 'Municipio del Estado de México'),
('Nezahualcóyotl', 'Municipio del Estado de México'),
('Atizapán de Zaragoza', 'Municipio del Estado de México'),
('Cuautitlán Izcalli', 'Municipio del Estado de México'),
('Cuautitlán', 'Municipio del Estado de México'),
('Tultitlán', 'Municipio del Estado de México'),
('Coacalco de Berriozábal', 'Municipio del Estado de México'),
('Huixquilucan', 'Municipio del Estado de México'),
('Tecámac', 'Municipio del Estado de México'),
('Chimalhuacán', 'Municipio del Estado de México'),
('La Paz', 'Municipio del Estado de México'),
('Ixtapaluca', 'Municipio del Estado de México'),
('Chalco', 'Municipio del Estado de México'),
('Texcoco', 'Municipio del Estado de México'),
('Nicolás Romero', 'Municipio del Estado de México'),
('Zumpango', 'Municipio del Estado de México'),
('Valle de Chalco', 'Municipio del Estado de México'),
('Los Reyes La Paz', 'Municipio del Estado de México'),
-- Toluca y zona
('Toluca', 'Zona Toluca'),
('Metepec', 'Zona Toluca'),
('Lerma', 'Zona Toluca'),
('Zinacantepec', 'Zona Toluca'),
-- Morelos
('Cuernavaca', 'Estado de Morelos'),
('Cuautla', 'Estado de Morelos'),
('Jiutepec', 'Estado de Morelos'),
('Tequesquitengo', 'Estado de Morelos'),
('Yautepec', 'Estado de Morelos'),
-- Otros estados
('Tlaxcala', 'Estado de Tlaxcala'),
('Apizaco', 'Estado de Tlaxcala'),
-- Hidalgo
('Pachuca', 'Estado de Hidalgo'),
('Tizayuca', 'Estado de Hidalgo')
ON CONFLICT DO NOTHING;