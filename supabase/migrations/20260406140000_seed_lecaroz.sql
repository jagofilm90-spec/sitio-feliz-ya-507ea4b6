-- ============================================================
-- ALMASA ERP — Seed Lecaroz
-- ============================================================
-- Genera el grupo Lecaroz con sus 82 clientes (razones sociales)
-- y 354 sucursales con relaciones hermana + entrega cruzada.
--
-- Estrategia: OPCIÓN C — Borrar solo Lecaroz existente
-- (no toca otros clientes como Productos Difo, San Antonio, etc.)
-- ============================================================

BEGIN;

-- ============================================================
-- PASO 0: Validar que existe la migración de entrega_cruzada
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cliente_sucursales'
        AND column_name = 'sucursal_entrega_id'
    ) THEN
        RAISE EXCEPTION 'Falta aplicar migración 20260405180000_add_sucursal_entrega_cruzada.sql';
    END IF;
END $$;

-- ============================================================
-- PASO 1: Limpiar Lecaroz existente
-- ============================================================
-- Lista de RFCs Lecaroz que vamos a meter (los borramos primero por si existen)

CREATE TEMP TABLE _lecaroz_rfcs (rfc TEXT PRIMARY KEY);
INSERT INTO _lecaroz_rfcs (rfc) VALUES
  ('AAFC6808244QA'),
  ('AAHJ8608157Y2'),
  ('AAMI5607055A7'),
  ('AUAA710403BUA'),
  ('BAGL650413S25'),
  ('GAMP581005QZ3'),
  ('GOLJ730927AP9'),
  ('GUFF5407034Y3'),
  ('GUI890725CF9'),
  ('IZP2507282Q7'),
  ('LAGJ930117T91'),
  ('LAII86022362A'),
  ('LAN870616IG1'),
  ('LEC810605I45'),
  ('LOPM741111HH6'),
  ('PAG060125TW6'),
  ('PAM060620381'),
  ('PAM110330GU4'),
  ('PAO030506J18'),
  ('PAP8601105X9'),
  ('PAR040611633'),
  ('PAR890223JE6'),
  ('PAR900202RG8'),
  ('PAT890313LV9'),
  ('PAY920210BB8'),
  ('PBA021119GR0'),
  ('PBA041119DY1'),
  ('PBA830420JT4'),
  ('PBA880601EG1'),
  ('PBA890313MKA'),
  ('PBE8912077R9'),
  ('PCA0406117X8'),
  ('PCA930611T35'),
  ('PCO080617DA8'),
  ('PCO1606035G4'),
  ('PDA111213LB3'),
  ('PEC870923IS3'),
  ('PEGA8802179W0'),
  ('PFR031029DC8'),
  ('PGA080115495'),
  ('PGR-970902-F46'),
  ('PHO9306119K5'),
  ('PIZ960513IDA'),
  ('PJU070521M66'),
  ('PJU980302G92'),
  ('PLA140404AG9'),
  ('PLA740702USA'),
  ('PLC900202KS1'),
  ('PLE8405299S1'),
  ('PLG040611RM8'),
  ('PLG920210CK1'),
  ('PMA920228HC3'),
  ('PMB150708NQ6'),
  ('PNE970306EV3'),
  ('POG980514JL6'),
  ('POT891130AK7'),
  ('PPB150708113'),
  ('PPE960301KRA'),
  ('PPR9202109I4'),
  ('PPR940606L86'),
  ('PPS0305067I3'),
  ('PPU870928FP6'),
  ('PSA7202196F5'),
  ('PSC961003K44'),
  ('PSD750716690'),
  ('PSF951121SR9'),
  ('PSG9706301L2'),
  ('PSJ151014Q62'),
  ('PSM890313MM7'),
  ('PSM901023360'),
  ('PST920921MU0'),
  ('PTE940606SM6'),
  ('PTL040611815'),
  ('PTU990309LE7'),
  ('PVC050405MD0'),
  ('PXO1606225R7'),
  ('PYA920226MC7'),
  ('PZU081020U93'),
  ('REDM680115125'),
  ('REDM691020JU9'),
  ('VEGC890418JZ7'),
  ('VIRA9411119S5');

-- Borrar dependencias de los clientes Lecaroz (en orden)
DELETE FROM cliente_programacion_pedidos
  WHERE cliente_id IN (SELECT id FROM clientes WHERE rfc IN (SELECT rfc FROM _lecaroz_rfcs))
     OR sucursal_id IN (SELECT id FROM cliente_sucursales WHERE cliente_id IN (SELECT id FROM clientes WHERE rfc IN (SELECT rfc FROM _lecaroz_rfcs)));

DELETE FROM cliente_productos_frecuentes
  WHERE cliente_id IN (SELECT id FROM clientes WHERE rfc IN (SELECT rfc FROM _lecaroz_rfcs));

DELETE FROM cliente_creditos_excepciones
  WHERE cliente_id IN (SELECT id FROM clientes WHERE rfc IN (SELECT rfc FROM _lecaroz_rfcs));

DELETE FROM cliente_cortesias_default
  WHERE cliente_id IN (SELECT id FROM clientes WHERE rfc IN (SELECT rfc FROM _lecaroz_rfcs));

DELETE FROM cliente_contactos
  WHERE cliente_id IN (SELECT id FROM clientes WHERE rfc IN (SELECT rfc FROM _lecaroz_rfcs));

DELETE FROM cliente_telefonos
  WHERE cliente_id IN (SELECT id FROM clientes WHERE rfc IN (SELECT rfc FROM _lecaroz_rfcs));

DELETE FROM cliente_correos
  WHERE cliente_id IN (SELECT id FROM clientes WHERE rfc IN (SELECT rfc FROM _lecaroz_rfcs));

-- Pagos: solo borramos si NO tienen pedidos asociados con otros clientes
-- (asumimos ambiente sin facturación real aún)
DELETE FROM pagos_cliente_detalle WHERE pago_id IN (
  SELECT id FROM pagos_cliente WHERE cliente_id IN (SELECT id FROM clientes WHERE rfc IN (SELECT rfc FROM _lecaroz_rfcs))
);
DELETE FROM pagos_cliente WHERE cliente_id IN (SELECT id FROM clientes WHERE rfc IN (SELECT rfc FROM _lecaroz_rfcs));

-- Pedidos de Lecaroz (si los hay - probablemente datos de prueba)
DELETE FROM pedidos WHERE cliente_id IN (SELECT id FROM clientes WHERE rfc IN (SELECT rfc FROM _lecaroz_rfcs));

-- Sucursales de Lecaroz
DELETE FROM cliente_sucursales WHERE cliente_id IN (SELECT id FROM clientes WHERE rfc IN (SELECT rfc FROM _lecaroz_rfcs));

-- Clientes Lecaroz (razones sociales)
DELETE FROM clientes WHERE rfc IN (SELECT rfc FROM _lecaroz_rfcs);

-- Grupo Lecaroz si existe (es_grupo=true con nombre LECAROZ)
DELETE FROM clientes WHERE es_grupo = true AND UPPER(nombre) LIKE '%LECAROZ%';

DROP TABLE _lecaroz_rfcs;

-- ============================================================
-- PASO 2: Crear el GRUPO Lecaroz
-- ============================================================
-- Usamos un UUID determinista para poder referenciarlo después
DO $$
DECLARE
  v_grupo_id UUID := 'aaaaaaaa-1eca-4047-aaaa-aaaaaaaaaaaa';
BEGIN

INSERT INTO clientes (
  id, codigo, nombre, razon_social, es_grupo, activo
) VALUES (
  v_grupo_id,
  'GRP-LECAROZ',
  'Grupo Lecaroz',
  'Grupo Lecaroz',
  true,
  true
);

-- ============================================================
-- PASO 3: Insertar 82 clientes (razones sociales)
-- ============================================================

INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-AAFC680824', 'MARIA DEL CARMEN ALTAMIRANO FUENTES', 'MARIA DEL CARMEN ALTAMIRANO FUENTES', 'AAFC6808244QA', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-AAHJ860815', 'JOSEBA IÑAKI AMATRIA HERRERA', 'JOSEBA IÑAKI AMATRIA HERRERA', 'AAHJ8608157Y2', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-AAMI560705', 'JOSE IGNACIO AMATRIA MARTINEZ', 'JOSE IGNACIO AMATRIA MARTINEZ', 'AAMI5607055A7', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-AUAA710403', 'ALEJANDRO ABUADILI ABUCHARD', 'ALEJANDRO ABUADILI ABUCHARD', 'AUAA710403BUA', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-BAGL650413', 'LILIA ANGELICA BALCAZAR GONZALEZ', 'LILIA ANGELICA BALCAZAR GONZALEZ', 'BAGL650413S25', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-GAMP581005', 'PEDRO GALICIA MONROY', 'PEDRO GALICIA MONROY', 'GAMP581005QZ3', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-GOLJ730927', 'JUAN MANUEL GOÑI  LARRACHEA', 'JUAN MANUEL GOÑI  LARRACHEA', 'GOLJ730927AP9', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-GUFF540703', 'FELIPE GUZMAN FREGOSO', 'FELIPE GUZMAN FREGOSO', 'GUFF5407034Y3', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-GUI890725C', 'GUIPUZCOA, S. DE R.L. DE C.V.', 'GUIPUZCOA, S. DE R.L. DE C.V.', 'GUI890725CF9', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-IZP2507282', 'IZPEGUI', 'IZPEGUI', 'IZP2507282Q7', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-LAGJ930117', 'JULEN LARRACHEA GOÑI', 'JULEN LARRACHEA GOÑI', 'LAGJ930117T91', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-LAII860223', 'IÑAKI LARRACHEA IBAÑEZ', 'IÑAKI LARRACHEA IBAÑEZ', 'LAII86022362A', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-LAN870616I', 'LANESTO, S.A. DE C.V.', 'LANESTO, S.A. DE C.V.', 'LAN870616IG1', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-LEC810605I', 'LECAROZ, S.A. DE C.V.', 'LECAROZ, S.A. DE C.V.', 'LEC810605I45', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-LOPM741111', 'MIRIAM LORANCA PAZOS', 'MIRIAM LORANCA PAZOS', 'LOPM741111HH6', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PAG060125T', 'PANIFICADORA LAS AGUILAS, S.A. DE C.V.', 'PANIFICADORA LAS AGUILAS, S.A. DE C.V.', 'PAG060125TW6', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PAM0606203', 'PANIFICADORA AV. MEXICO, S.A. DE C.V.', 'PANIFICADORA AV. MEXICO, S.A. DE C.V.', 'PAM060620381', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PAM110330G', 'PAN AMATRIAS, S.A. DE C.V.', 'PAN AMATRIAS, S.A. DE C.V.', 'PAM110330GU4', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PAO030506J', 'PANIFICADORA AGRICOLA ORIENTAL, SA DE CV', 'PANIFICADORA AGRICOLA ORIENTAL, SA DE CV', 'PAO030506J18', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PAP8601105', 'PANADERIA A. PRADEIRA, S.A. DE C.V.', 'PANADERIA A. PRADEIRA, S.A. DE C.V.', 'PAP8601105X9', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PAR0406116', 'PANIFICADORA ARAMBURU, S.A. DE C.V.', 'PANIFICADORA ARAMBURU, S.A. DE C.V.', 'PAR040611633', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PAR890223J', 'PANIFICADORA ARBOLILLO, S. DE R.L. DE C.V.', 'PANIFICADORA ARBOLILLO, S. DE R.L. DE C.V.', 'PAR890223JE6', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PAR900202R', 'PANIFICADORA ARZOAGA, S. DE R.L. DE C.V.', 'PANIFICADORA ARZOAGA, S. DE R.L. DE C.V.', 'PAR900202RG8', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PAT890313L', 'PANIFICADORA ATZACOALCO, S. DE R.L. DE C.V.', 'PANIFICADORA ATZACOALCO, S. DE R.L. DE C.V.', 'PAT890313LV9', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PAY920210B', 'PANIFICADORA AYEGUI, S. DE R.L. DE C.V.', 'PANIFICADORA AYEGUI, S. DE R.L. DE C.V.', 'PAY920210BB8', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PBA021119G', 'PANIFICADORA BARRIO ALTO, S.A. DE C.V.', 'PANIFICADORA BARRIO ALTO, S.A. DE C.V.', 'PBA021119GR0', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PBA041119D', 'PANIFICADORA BALBUENA, S.A. DE C.V.', 'PANIFICADORA BALBUENA, S.A. DE C.V.', 'PBA041119DY1', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PBA830420J', 'PANIFICADORA BAZTAN, S.A. DE C.V.', 'PANIFICADORA BAZTAN, S.A. DE C.V.', 'PBA830420JT4', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PBA880601E', 'PANIFICADORA BARRIENTOS, S. DE R.L. DE C.V.', 'PANIFICADORA BARRIENTOS, S. DE R.L. DE C.V.', 'PBA880601EG1', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PBA890313M', 'PANIFICADORA BOSQUES DE ARAGON, S. DE R.L. DE C.V.', 'PANIFICADORA BOSQUES DE ARAGON, S. DE R.L. DE C.V.', 'PBA890313MKA', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PBE8912077', 'PANADERIA BELATE, S. DE R.L. DE C.V.', 'PANADERIA BELATE, S. DE R.L. DE C.V.', 'PBE8912077R9', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PCA0406117', 'PANIFICADORA CHALMA, S.A. DE C.V.', 'PANIFICADORA CHALMA, S.A. DE C.V.', 'PCA0406117X8', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PCA930611T', 'PANIFICADORA CARRASCO, S.A. DE C.V.', 'PANIFICADORA CARRASCO, S.A. DE C.V.', 'PCA930611T35', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PCO080617D', 'PANIFICADORA COYOACAN, S.A. DE C.V.', 'PANIFICADORA COYOACAN, S.A. DE C.V.', 'PCO080617DA8', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PCO1606035', 'PANIFICADORA CONSTITUYENTES, S.A. DE C.V.', 'PANIFICADORA CONSTITUYENTES, S.A. DE C.V.', 'PCO1606035G4', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PDA111213L', 'PANIFICADORA DANCHARINEA, S.A. DE C.V.', 'PANIFICADORA DANCHARINEA, S.A. DE C.V.', 'PDA111213LB3', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PEC870923I', 'PANIFICADORA ECATEPEC, S.A. DE C.V.', 'PANIFICADORA ECATEPEC, S.A. DE C.V.', 'PEC870923IS3', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PEGA880217', 'ANGELICA VICTORIA PERALTA GUZMAN', 'ANGELICA VICTORIA PERALTA GUZMAN', 'PEGA8802179W0', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PFR031029D', 'PANIFICADORA FLOR DE REYNOSA,S.A. DE C.V.', 'PANIFICADORA FLOR DE REYNOSA,S.A. DE C.V.', 'PFR031029DC8', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PGA0801154', 'PANIFICADORA GARCHITONEA, S.A. DE C.V.', 'PANIFICADORA GARCHITONEA, S.A. DE C.V.', 'PGA080115495', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PGR-970902', 'PANIFICADORA EL GRANERO, S.A. DE C.V.', 'PANIFICADORA EL GRANERO, S.A. DE C.V.', 'PGR-970902-F46', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PHO9306119', 'PANIFICADORA EL HORNO, S.A. DE C.V.', 'PANIFICADORA EL HORNO, S.A. DE C.V.', 'PHO9306119K5', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PIZ960513I', 'PANIFICADORA IZTAPALUCA, S.A. DE C.V.', 'PANIFICADORA IZTAPALUCA, S.A. DE C.V.', 'PIZ960513IDA', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PJU070521M', 'PANIFICADORA JULEN, S.A. DE C.V.', 'PANIFICADORA JULEN, S.A. DE C.V.', 'PJU070521M66', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PJU980302G', 'PANIFICADORA JULILD, S.A. DE C.V.', 'PANIFICADORA JULILD, S.A. DE C.V.', 'PJU980302G92', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PLA140404A', 'PANIFICADORA LAU, S. DE R.L. DE C.V.', 'PANIFICADORA LAU, S. DE R.L. DE C.V.', 'PLA140404AG9', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PLA740702U', 'PANIFICADORA LAFAYETTE, S.A. DE C.V.', 'PANIFICADORA LAFAYETTE, S.A. DE C.V.', 'PLA740702USA', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PLC900202K', 'PANIFICADORA LARRACHEA, S. DE R.L. DE C.V.', 'PANIFICADORA LARRACHEA, S. DE R.L. DE C.V.', 'PLC900202KS1', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PLE8405299', 'PANIFICADORA LEGATE, S.A. DE C.V.', 'PANIFICADORA LEGATE, S.A. DE C.V.', 'PLE8405299S1', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PLG040611R', 'PANIFICADORA LG ANDER, S.A. DE C.V.', 'PANIFICADORA LG ANDER, S.A. DE C.V.', 'PLG040611RM8', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PLG920210C', 'PANIFICADORA LAGO DE GUADALUPE, S. DE R.L. DE C.V.', 'PANIFICADORA LAGO DE GUADALUPE, S. DE R.L. DE C.V.', 'PLG920210CK1', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PMA920228H', 'PANIFICADORA MAITO, S.A. DE C.V.', 'PANIFICADORA MAITO, S.A. DE C.V.', 'PMA920228HC3', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PMB150708N', 'PANIFICADORA MERCED BALBUENA, S.A. DE C.V.', 'PANIFICADORA MERCED BALBUENA, S.A. DE C.V.', 'PMB150708NQ6', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PNE970306E', 'PANIFICADORA NEREA, S.A. DE C.V.', 'PANIFICADORA NEREA, S.A. DE C.V.', 'PNE970306EV3', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-POG980514J', 'PANIFICADORA OGUIA, S.A. DE C.V.', 'PANIFICADORA OGUIA, S.A. DE C.V.', 'POG980514JL6', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-POT891130A', 'PANIFICADORA OTXONDO, S.A. DE C.V.', 'PANIFICADORA OTXONDO, S.A. DE C.V.', 'POT891130AK7', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PPB1507081', 'PANIFICADORA PERLA DEL BAJIO, S.A. DE C.V.', 'PANIFICADORA PERLA DEL BAJIO, S.A. DE C.V.', 'PPB150708113', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PPE960301K', 'PANIFICADORA EL PEÑON, S.A DE C.V.', 'PANIFICADORA EL PEÑON, S.A DE C.V.', 'PPE960301KRA', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PPR9202109', 'PANIFICADORA PRADO, S. DE R.L. DE C.V.', 'PANIFICADORA PRADO, S. DE R.L. DE C.V.', 'PPR9202109I4', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PPR940606L', 'PANIFICADORA PUEBLO DE LOS REYES, S.A. DE C.V.', 'PANIFICADORA PUEBLO DE LOS REYES, S.A. DE C.V.', 'PPR940606L86', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PPS0305067', 'PANIFICADORA PUEBLA DE LOS SANTOS, S.A. DE C.V.', 'PANIFICADORA PUEBLA DE LOS SANTOS, S.A. DE C.V.', 'PPS0305067I3', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PPU870928F', 'PANIFICADORA EL PUERTO, S.A. DE C.V.', 'PANIFICADORA EL PUERTO, S.A. DE C.V.', 'PPU870928FP6', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PSA7202196', 'PANIFICADORA SANTIAGO, S.A. DE C.V.', 'PANIFICADORA SANTIAGO, S.A. DE C.V.', 'PSA7202196F5', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PSC961003K', 'PANIFICADORA DEL SAGRADO CORAZON DE JESUS, S.A. DE C.V.', 'PANIFICADORA DEL SAGRADO CORAZON DE JESUS, S.A. DE C.V.', 'PSC961003K44', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PSD7507166', 'PANIFICADORA SANTO DOMINGO, S.A.', 'PANIFICADORA SANTO DOMINGO, S.A.', 'PSD750716690', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PSF951121S', 'PANIFICADORA SAN FELIPE DE JESUS, S.A. DE C.V.', 'PANIFICADORA SAN FELIPE DE JESUS, S.A. DE C.V.', 'PSF951121SR9', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PSG9706301', 'PANIFICADORA SAN GABRIEL, S.A. DE .C.V.', 'PANIFICADORA SAN GABRIEL, S.A. DE .C.V.', 'PSG9706301L2', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PSJ151014Q', 'PANIFICADORA SAN JUAN IXHUATEPEC, S.A. DE C.V.', 'PANIFICADORA SAN JUAN IXHUATEPEC, S.A. DE C.V.', 'PSJ151014Q62', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PSM890313M', 'PANIFICADORA SANTA MARTHA ACATITLA, S. DE R.L. DE C.V.', 'PANIFICADORA SANTA MARTHA ACATITLA, S. DE R.L. DE C.V.', 'PSM890313MM7', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PSM9010233', 'PANIFICADORA SANTA MARIA CHICONAUTLA, S. DE R.L. DE C.V.', 'PANIFICADORA SANTA MARIA CHICONAUTLA, S. DE R.L. DE C.V.', 'PSM901023360', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PST920921M', 'PANIFICADORA SOL DE TACUBAYA, S.A. DE C.V.', 'PANIFICADORA SOL DE TACUBAYA, S.A. DE C.V.', 'PST920921MU0', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PTE940606S', 'PANIFICADORA TEXCOCO, S.A. DE C.V.', 'PANIFICADORA TEXCOCO, S.A. DE C.V.', 'PTE940606SM6', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PTL0406118', 'PANIFICADORA TLALCOLIGIA, S.A. DE C.V.', 'PANIFICADORA TLALCOLIGIA, S.A. DE C.V.', 'PTL040611815', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PTU990309L', 'PANIFICADORA TULYEHUALCO, S.A. DE C.V.', 'PANIFICADORA TULYEHUALCO, S.A. DE C.V.', 'PTU990309LE7', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PVC050405M', 'PANIFICADORA VIRGEN DE COVADONGA, S.A DE C.V.', 'PANIFICADORA VIRGEN DE COVADONGA, S.A DE C.V.', 'PVC050405MD0', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PXO1606225', 'PANIFICADORA XOCHIMILCO, S.A. DE C.V.', 'PANIFICADORA XOCHIMILCO, S.A. DE C.V.', 'PXO1606225R7', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PYA920226M', 'PANIFICADORA YAUTEPEC, S. DE R.L. DE C.V.', 'PANIFICADORA YAUTEPEC, S. DE R.L. DE C.V.', 'PYA920226MC7', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-PZU081020U', 'PANIFICADORA ZUMPANGO, S.A. DE C.V.', 'PANIFICADORA ZUMPANGO, S.A. DE C.V.', 'PZU081020U93', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-REDM680115', 'MIGUEL ANGEL REBUELTA DIEZ', 'MIGUEL ANGEL REBUELTA DIEZ', 'REDM680115125', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-REDM691020', 'MARIA DE LAS MERCEDES REBUELTA DIEZ', 'MARIA DE LAS MERCEDES REBUELTA DIEZ', 'REDM691020JU9', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-VEGC890418', 'CARLOS VEGA GONZALEZ', 'CARLOS VEGA GONZALEZ', 'VEGC890418JZ7', false, v_grupo_id, true);
INSERT INTO clientes (codigo, nombre, razon_social, rfc, es_grupo, grupo_cliente_id, activo)
VALUES ('LEC-VIRA941111', 'JOSE ANTONIO VILLAMAYOR REBUELTA', 'JOSE ANTONIO VILLAMAYOR REBUELTA', 'VIRA9411119S5', false, v_grupo_id, true);

-- ============================================================
-- PASO 4: Insertar 354 sucursales
-- ============================================================

INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '1', 'LAGO', 'YAQUIS, Nº 84, COL. TLALCOLIGIA, CP 14430, TLALPAN, CIUDAD DE MEXICO', '5555-73-91-76',
  'PTL040611815', 19.2755593, -99.1720392, false, true
FROM clientes c WHERE c.rfc = 'PTL040611815' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '2', 'STO. DOMINGO', 'ESCUINAPA, Nº 44, COL. STO. DOMINGO, CP 04369, COYOACAN, CIUDAD DE MEXICO', '5556-19-50-51',
  'PSD750716690', 19.3330842, -99.1727581, false, true
FROM clientes c WHERE c.rfc = 'PSD750716690' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '3', 'LAFAYETTE', 'CENTRO COMERCIAL PLAZA HOJA DE ARBOL, Nº 2, UNIDAD INFONAVIT IZTACALCO, CP 08900, IZTACALCO, CIUDAD DE MEXICO', '5556-57-75-12',
  'PLA740702USA', 19.3835754445232, -99.1078497411875, false, true
FROM clientes c WHERE c.rfc = 'PLA740702USA' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '4', 'NORTE', 'ESTADO DE YUCATAN, N°3, COL. PROVIDENCIA, CP 07550, GUSTAVO A. MADERO, CIUDAD DE MEXICO', '5557-11-07-41',
  'PAR040611633', 19.4804498, -99.0651637, false, true
FROM clientes c WHERE c.rfc = 'PAR040611633' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '5', 'PROVIDENCIA', 'AV. CONSTITUCION DE LA REPUBLICA, Nº 103, COL. PROVIDENCIA, CP 14430, GUSTAVO A. MADERO, CIUDAD DE MEXICO', '5557-10-21-52',
  'PTL040611815', 19.4819303, -99.0719035, false, true
FROM clientes c WHERE c.rfc = 'PTL040611815' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion,
  latitud, longitud, es_rosticeria, activo
) VALUES (
  v_grupo_id, '6', 'PUENTE', NULL,
  NULL, NULL, false, true
);
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '7', 'BOSQUES', 'CARLOS HANK GONZALEZ, S/N, COL. BOSQUES DE ARAGON, CP 57170, NEZAHUALCOYOTL, ESTADO DE MEXICO', '5557-94-42-60',
  'PBA890313MKA', 19.4784512293377, -99.0516835535914, false, true
FROM clientes c WHERE c.rfc = 'PBA890313MKA' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '8', 'STA. MARTHA', 'CALZADA IGNACIO ZARAGOZA, Nº 3063, COL. SANTA MARTHA ACATITLA, CP 09510, IZTAPALAPA, CIUDAD DE MEXICO', '5557-32-01-81',
  'PSM890313MM7', 19.3615579, -99.00225359999999, false, true
FROM clientes c WHERE c.rfc = 'PSM890313MM7' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '9', 'ECATEPEC', 'AV. JACARANDAS, Nº 26, COL. LA FLORIDA, CP 55240, ECATEPEC, ESTADO DE MEXICO', '5557-83-66-96',
  'PEC870923IS3', 19.5128523820612, -99.0364572961045, false, true
FROM clientes c WHERE c.rfc = 'PEC870923IS3' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '10', 'GRANJAS', 'VALLE DEL DON, MZA. 33 LT 80, COL. GRANJAS INDEPENDENCIA., CP 55240, ECATEPEC DE MORELOS, ESTADO DE MEXICO', '5557-12-56-21',
  'PEC870923IS3', 19.4929879123807, -99.0328609588194, false, true
FROM clientes c WHERE c.rfc = 'PEC870923IS3' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '11', 'MORELOS', 'AVENIDA JARDINES DE MORELOS, Nº 317, COL.JARDINES DE MORELOS. SECC BOSQUES, CP 55070, ECATEPEC DE MORELOS, ESTADO DE MEXICO', '5558-39-19-48',
  'PAM110330GU4', 19.5934729, -98.998283, false, true
FROM clientes c WHERE c.rfc = 'PAM110330GU4' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '12', 'AGRICOLA', 'SUR 16, N° 281, COL. AGRICOLA ORIENTAL, CP 08500, IZTACALCO, CIUDAD DE MEXICO', '5551-15-16-52',
  'PAO030506J18', 19.3945388, -99.0736815, false, true
FROM clientes c WHERE c.rfc = 'PAO030506J18' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '13', 'LANESTO', 'ZARAGOZA, Nº 20, COL. CHIMALHUACAN CENTRO, CP 56330, CHIMALHUACAN, ESTADO DE MEXICO', '5558-52-00-83',
  'LAN870616IG1', 19.4181735526612, -98.944127145942, false, true
FROM clientes c WHERE c.rfc = 'LAN870616IG1' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '14', 'LA ROSA', 'CIRCUITO  CUAUHTEMOC MZ.40, LOTE 4, COL. CIUDAD CUAUHTEMOC, CP 55067, ECATEPEC, ESTADO DE MEXICO', '5559-37-20-81',
  'PSM901023360', 19.6393199386592, -98.9980918692211, false, true
FROM clientes c WHERE c.rfc = 'PSM901023360' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '15', 'LA GUAYABA', 'LAGUNA DE TERMINOS, N° 478, COL. ANAHUAC, CP 11320, MIGUEL HIDALGO, CIUDAD DE MEXICO', '5552-60-24-49',
  'PLE8405299S1', 19.4423995, -99.1736098, false, true
FROM clientes c WHERE c.rfc = 'PLE8405299S1' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '16', 'CANTERA', 'CANTERA, N° 122, COL. CANTERA, CP 14070, TLALPAN, CIUDAD DE MEXICO', '5554-85-61-14',
  'PHO9306119K5', 19.2803691, -99.1840378, false, true
FROM clientes c WHERE c.rfc = 'PHO9306119K5' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '17', 'SOLDADO', 'LAGO GASCASONICA, N° 149, COL.HUICHAPAN, CP 01290, MIGUEL HIDALGO, CIUDAD DE MEXICO', '5555-27-73-05',
  'PST920921MU0', 19.4613334860005, -99.1935016540273, false, true
FROM clientes c WHERE c.rfc = 'PST920921MU0' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '18', 'LAS FLORES', 'AV. AZCAPOTZALCO, Nº 656, COL. AZCAPOTZALCO CENTRO, CP 02000, AZCAPOTZALCO, CIUDAD DE MEXICO', '5555-61-16-96',
  'PBA830420JT4', 19.4822282871651, -99.1862199977541, false, true
FROM clientes c WHERE c.rfc = 'PBA830420JT4' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '19', 'LECAROZ', 'VIA GUSTAVO BAZ, N° 8, COL. TEQUESQUINAHUAC, CP 54020, TLALNEPANTLA DE BAZ, ESTADO DE MEXICO', '5553-10-68-48',
  'LEC810605I45', 19.5588382317152, -99.2033001448065, false, true
FROM clientes c WHERE c.rfc = 'LEC810605I45' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '20', 'BARRIENTOS', 'AV. TLALNEPANTLA, N° 8, COL. EL OLIVO, CP 54110, TLALNEPANTLA, ESTADO DE MEXICO', '5553-10-36-38',
  'PBA880601EG1', 19.5710052830601, -99.1946285449925, false, true
FROM clientes c WHERE c.rfc = 'PBA880601EG1' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '21', 'PUERTO', 'CUAUHTEMOC, N° 2, COL. TENAYO, CP 54140, TLALNEPANTLA, ESTADO DE MEXICO', '5553-09-08-19',
  'PPU870928FP6', 19.5437923689805, -99.1680158669514, false, true
FROM clientes c WHERE c.rfc = 'PPU870928FP6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '22', 'SN JOSE', 'AV. BENITO JUAREZ, N° 74, COL. SAN LUCAS PATONI, CP 54100, TLALNEPANTLA, ESTADO DE MEXICO', '5553-91-53-55',
  'PCA0406117X8', 19.5341433, -99.1584962, false, true
FROM clientes c WHERE c.rfc = 'PCA0406117X8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '23', 'CRUCERO', 'AV. SANTA CECILIA, N° 11, COL SAN MIGUEL CHALMA, CP 54100, TLALNEPANTLA., ESTADO DE MEXICO', '5553-91-01-08',
  'PCA0406117X8', 19.5403542692455, -99.1541456542626, false, true
FROM clientes c WHERE c.rfc = 'PCA0406117X8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '24', 'ARBOLILLO', 'AV. CUAUTEPEC PROLONGACION ANAHUAC, LOTE 1, COL. LA PASTORA, CP 07290, GUSTAVO A. MADERO., CIUDAD DE MEXICO', '5553-89-45-32',
  'PAR890223JE6', 19.5293104987439, -99.1419373503148, false, true
FROM clientes c WHERE c.rfc = 'PAR890223JE6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '25', 'OTXONDO', 'CALZADA ERMITA IZTAPALAPA, N° 4010, COL. CITLALLI, CP 09660, IZTAPALAPA, CIUDAD DE MEXICO', '5554-29-21-98',
  'POT891130AK7', 19.3445214227003, -99.0253144721645, false, true
FROM clientes c WHERE c.rfc = 'POT891130AK7' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '26', 'GUIPUZCOA', 'AV. 5 DE MAYO, N° 3, COL. TEPANQUIAHUAC, CP 54770, TEOLOYUCAN, ESTADO DE MEXICO', '59-39-14-04-78',
  'GUI890725CF9', 19.7441323161687, -99.1777868646887, false, true
FROM clientes c WHERE c.rfc = 'GUI890725CF9' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '27', 'ARZOAGA', 'ANTIGUA CARRETERA A PACHUCA, N° 21, COL.VIVEROS DE XALOSTOC, CP 55340, ECATEPEC, ESTADO DE MEXICO', '55-57-88-81-41',
  'PAR900202RG8', 19.5222827092695, -99.0834996846567, false, true
FROM clientes c WHERE c.rfc = 'PAR900202RG8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '28', 'BELATE', 'JOSE PERDIZ, N° 21, COL. CUAUTLA CENTRO, CP 62740, CUAUTLA, MORELOS', '73-53-52-26-26',
  'PBE8912077R9', 18.8128717958113, -98.9509742612088, false, true
FROM clientes c WHERE c.rfc = 'PBE8912077R9' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '29', 'ATZACOALCO', 'AV. ING. EDUARDO MOLINA, N° 1835, COL NUEVA ATZACOALCO, CP 07420, GUSTAVO A. MADERO, CIUDAD DE MEXICO', '55-57-57-16-03',
  'PAT890313LV9', 19.4934823261953, -99.091226235585, false, true
FROM clientes c WHERE c.rfc = 'PAT890313LV9' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '30', 'PRADEIRA', 'FRANCISCO MORAZAN, N° 34, COL. LA PRADERA, CP 07500, GUSTAVO A. MADERO, CIUDAD DE MEXICO', '55-57-94-14-04',
  'PAP8601105X9', 19.4726359191818, -99.0677348211642, false, true
FROM clientes c WHERE c.rfc = 'PAP8601105X9' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '31', 'AYEGUI', 'AV. LOPEZ MATEOS, Nº55, COL. JACARANDAS, CP 54050, TLALNEPANTLA, ESTADO DE MEXICO', '55-53-97-08-33',
  'PAY920210BB8', 19.5349505089496, -99.2316656120996, false, true
FROM clientes c WHERE c.rfc = 'PAY920210BB8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion,
  latitud, longitud, es_rosticeria, activo
) VALUES (
  v_grupo_id, '32', 'SN. LUCAS', NULL,
  NULL, NULL, false, true
);
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '33', 'PRADO', 'AV. CENTRAL, MZ 3 LT 27, COL. NUEVO PASEO DE SAN AGUSTIN 3 A SECC, CP 55130, ECATEPEC, ESTADO DE MEXICO', '55-57-55-16-33',
  'PPR9202109I4', 19.5309682318761, -99.0294626644163, false, true
FROM clientes c WHERE c.rfc = 'PPR9202109I4' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '34', 'MAITO', 'CARR. ATIZAPAN TLALNEPANTLA, Nº 28, COL. BOULEVARES DE ATIZAPAN, CP 52948, ATIZAPAN DE ZARAGOZA, ESTADO DE MEXICO', '5558-24-84-56',
  'PMA920228HC3', 19.5717937779491, -99.2539745527895, false, true
FROM clientes c WHERE c.rfc = 'PMA920228HC3' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '35', 'YAUTEPEC', 'PLAZUELA DE LEYVA, Nº 6, COL. CENTRO, CP 62730, YAUTEPEC, MORELOS', '73-53-94-02-46',
  'PYA920226MC7', 18.8859124510863, -99.0613901827262, false, true
FROM clientes c WHERE c.rfc = 'PYA920226MC7' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '36', 'SOL DE TACUBAYA', 'FRANCISCO I. MADERO, Nº 32, COL. PRESIDENTES, CP 01290, ALVARO OBREGON, CIUDAD DE MEXICO', '55-56-02-33-01',
  'PST920921MU0', 19.3787925440698, -99.2204398215338, false, true
FROM clientes c WHERE c.rfc = 'PST920921MU0' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '37', 'SANTIAGO', 'CZDA. AHUIZOTLA, Nº 18, COL.AHUIZOTLA, CP 53378, NAUCALPAN, ESTADO DE MEXICO', '55-55-76-00-84',
  'PSA7202196F5', 19.47031105563, -99.2111241742847, false, true
FROM clientes c WHERE c.rfc = 'PSA7202196F5' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '39', 'LAGO', 'CARRETERA LAGO DE GUADALUPE, MZ 190 LT 5, COL. MARGARITA MAZA DE JUAREZ, CP 52926, ATIZAPAN DE ZARAGOZA, ESTADO DE MEXICO', '5558-87-55-71',
  'PLG920210CK1', 19.5900224320017, -99.2274204423283, false, true
FROM clientes c WHERE c.rfc = 'PLG920210CK1' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '40', 'CARRASCO', 'PRIMERA NORTE, LT.4 MZ.23, COL. ISIDRO FABELA, CP 14030, TLALPAN, CIUDAD DE MEXICO', '5556-06-20-24',
  'PCA930611T35', 19.3001509686539, -99.1743400947401, false, true
FROM clientes c WHERE c.rfc = 'PCA930611T35' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '41', 'TLALPAN', 'AVENIDA TLALPAN, Nº4999, COL. LA JOYA, CP 14030, TLALPAN, CIUDAD DE MEXICO', '55-54-85-45-87',
  'PCA930611T35', 19.2821007336388, -99.165312283537, false, true
FROM clientes c WHERE c.rfc = 'PCA930611T35' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '42', 'TEXCOCO', 'CRISTOBAL COLON, Nº 148, COL. TEXCOCO DE MORA CENTRO, CP 56100, TEXCOCO, ESTADO DE MEXICO', '59-59-54-11-20',
  'PTE940606SM6', 19.5157244682945, -98.8837348625595, false, true
FROM clientes c WHERE c.rfc = 'PTE940606SM6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '43', 'LOS REYES', 'PENSADOR MEXICANO, Nº 3, COL LOS REYES LA PAZ, CP 56400, LA PAZ, ESTADO DE MEXICO', '55-58-55-78-01',
  'PPR940606L86', 19.3587024455494, -98.9768858120699, false, true
FROM clientes c WHERE c.rfc = 'PPR940606L86' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '44', 'EL HORNO', 'AV. INSURGENTES SUR, Nº3751, COL SAN PEDRO APOSTOL, CP 14070, TLALPAN, CIUDAD DE MEXICO', '55-55-28-48-81',
  'PHO9306119K5', 19.2926508725049, -99.1783337178705, false, true
FROM clientes c WHERE c.rfc = 'PHO9306119K5' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '45', 'VICK', 'EJERCITO AMERICANO, Nº58, COL. CENTRO, CP 62740, CUAUTLA, MORELOS', '73-53-52-02-23',
  'PBE8912077R9', 18.8121115119275, -98.9514764627197, false, true
FROM clientes c WHERE c.rfc = 'PBE8912077R9' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '46', 'SN FELIPE', 'AV. DOLORES HIDALGO, Nº 1516, COL SAN FELIPE DE JESUS, CP 07510, GUSTAVO A MADERO, CIUDAD DE MEXICO', '55-57-14-86-48',
  'PSF951121SR9', 19.492113878264, -99.0741345572506, false, true
FROM clientes c WHERE c.rfc = 'PSF951121SR9' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '47', 'EL PEÑON', 'AV. 519, Nº 84, COL. SAN JUAN DE ARAGON 1ª Y 2ª SECC., CP 07969, GUSTAVO A. MADERO, CIUDAD DE MEXICO', '55-93-15-26-73',
  'PPE960301KRA', 19.457007974308, -99.0930213846547, false, true
FROM clientes c WHERE c.rfc = 'PPE960301KRA' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '48', 'IZTAPÁLUCA', 'AV. CUAUHTEMOC, Nº 13, COL. IXTAPALUCA CENTRO, CP 56530, IXTAPALUCA, ESTADO DE MEXICO', '55-59-72-37-33',
  'PIZ960513IDA', 19.314637389649, -98.8830359868476, false, true
FROM clientes c WHERE c.rfc = 'PIZ960513IDA' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '49', 'IRACHE', 'AV. TRABAJO, Nº39, COL. LOMAS DE SAN ANDRES ATENCO, CP 54050, TLALNEPANTLA, ESTADO DE MEXICO', '55-53-98-50-91',
  'PAY920210BB8', 19.5418969153121, -99.2323636188328, false, true
FROM clientes c WHERE c.rfc = 'PAY920210BB8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '50', 'OLIMPICA', 'AV. CENTRAL, MZ. 18 LOTE 13, COL. OLIMPICA, CP 55130, ECATEPEC, ESTADO DE MEXICO', '55-57-91-71-57',
  'PSC961003K44', 19.521546140381, -99.0340683716338, false, true
FROM clientes c WHERE c.rfc = 'PSC961003K44' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '51', 'AYOTLA', 'AV. CUAUHTEMOC, Nº 173, COL. CENTRO IXTAPALUCA, CP 56400, IXTAPALUCA, ESTADO DE MEXICO', '55-59-74-67-61',
  'PPR940606L86', 19.3138571, -98.8882751, false, true
FROM clientes c WHERE c.rfc = 'PPR940606L86' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '52', 'PEÑON', 'AV. 510, Nº 11, COL. U.H. SAN JUAN ARAGON 1ª SECCION, CP 07969, GUSTAVO A. MADERO, CIUDAD DE MEXICO', '55-26-03-20-13',
  'PPE960301KRA', 19.4666853754035, -99.0925890077444, false, true
FROM clientes c WHERE c.rfc = 'PPE960301KRA' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '53', 'NEREA', 'AV. ROBERTO ESQUERRA, Nº 385, COL CUAUTEPEC DE MADERO, CP 07200, GUSTAVO A. MADERO, CIUDAD DE MEXICO', '55-53-03-77-70',
  'PNE970306EV3', 19.5490187404772, -99.1351130788273, false, true
FROM clientes c WHERE c.rfc = 'PNE970306EV3' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '54', 'SN GABRIEL', 'CABO DE BUENA ESPERANZA, N° 340, COL AMPLI.GABRIEL HERNANDEZ, CP 07089, GUSTAVO A. MADERO, CIUDAD DE MEXICO', '55-57-15-20-28',
  'PSG9706301L2', 19.5011138331638, -99.0958657806148, false, true
FROM clientes c WHERE c.rfc = 'PSG9706301L2' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '55', 'GRANERO', 'AGUSTIN DE ITURBIDE #86 ESQ. 5 DE MAYO, COL. LOMA BONITA, CP 57940, NEZAHUALCOYOTL,, ESTADO DE MEXICO', '5557-33-75-33',
  'PGR-970902-F46', 19.3715815, -98.99149159999999, false, true
FROM clientes c WHERE c.rfc = 'PGR-970902-F46' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '56', 'SN MARCOS', 'DE GLORIA, MZ. 18 LT.14, COL. JUAN GONZALEZ ROMERO, CP 55340, GUSTAVO A MADERO, CIUDAD DE MEXICO', '55-57-69-17-38',
  'PAR900202RG8', 19.5056089, -99.08959589999999, false, true
FROM clientes c WHERE c.rfc = 'PAR900202RG8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '58', 'PUEBLA SANTOS', '10 PONIENTE, Nº 1103, COL. CENTRO, CP 72000, PUEBLA, PUEBLA', '22-22-32-22-02',
  'PPS0305067I3', 19.0522381977874, -98.2045218757607, false, true
FROM clientes c WHERE c.rfc = 'PPS0305067I3' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '59', 'JULILD', 'AV. CENTRAL, Nº 110, COL. VALLE DE ARAGON, CP 55270, ECATEPEC, ESTADO DE MEXICO', '55-57-80-60-97',
  'PJU980302G92', 19.5006981823428, -99.0418399381464, false, true
FROM clientes c WHERE c.rfc = 'PJU980302G92' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '60', 'STA. CRUZ', 'CZDA. ERMITA IZTAPALAPA, Nº 2341, COL SANTA CRUZ MEYEHUALCO, CP 09700, IZTAPALAPA, CIUDAD DE MEXICO', '55-56-91-11-26',
  'POG980514JL6', 19.3425026470836, -99.0449724693052, false, true
FROM clientes c WHERE c.rfc = 'POG980514JL6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '62', 'ERMITA', 'CALZ. ERMITA IZTAPALAPA, Nº 2771, COL SANTA CRUZ MEYEHUALCO, CP 09700, IZTAPALAPA, CIUDAD DE MEXICO', '55-56-93-94-50',
  'POG980514JL6', 19.3435026586198, -99.0356226613328, false, true
FROM clientes c WHERE c.rfc = 'POG980514JL6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '64', 'TULYEHUALCO', 'AV. TLAHUAC, Nº8615, COL. SAN ISIDRO, CP 16739, XOCHIMILCO, CIUDAD DE MEXICO', '55-21-61-45-09',
  'PTU990309LE7', 19.2559286077543, -99.0113357937386, false, true
FROM clientes c WHERE c.rfc = 'PTU990309LE7' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '65', 'CUAJIMALPA', 'AV. VERACRUZ, N° 29, COL.CUAJIMALPA, CP 57170, CUAJIMALPA DE MORELOS, CIUDAD DE MEXICO', '55-58-12-06-20',
  'PBA890313MKA', 19.3559176081584, -99.2995997761352, false, true
FROM clientes c WHERE c.rfc = 'PBA890313MKA' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '67', 'RYSKAL', 'JUVENTINO ROSAS, N° 3, COL. CUAUTEPEC EL ALTO, CP 07100, GUSTAVO A. MADERO, CIUDAD DE MEXICO', '55-53-03-02-66',
  'PBA021119GR0', 19.5573638121991, -99.1349519333442, false, true
FROM clientes c WHERE c.rfc = 'PBA021119GR0' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '68', 'REYNOSA', 'TEPANTONGO, Nº 100, COL. SAN ANDRES, CP 02240, AZCAPOZALCO, CIUDAD DE MEXICO', '5526-26-25-79',
  'PFR031029DC8', 19.4963125213075, -99.1847146424036, false, true
FROM clientes c WHERE c.rfc = 'PFR031029DC8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '69', 'SAN PEDRO', '20 DE NOVIEMBRE, N°3, COL.VILLA NICOLAS ROMERO CENTRO, CP 54050, NICOLAS ROMERO, ESTADO DE MEXICO', '55-21-68-50-51',
  'PAY920210BB8', 19.6251401105551, -99.3157601719409, false, true
FROM clientes c WHERE c.rfc = 'PAY920210BB8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '70', 'CARACOLES', 'CERRO TEJOCOTE, MZ 76 LOTE 1, COL. DR. JORGE JIMENEZ CANTU, CP 55340, TLANEPANTLA, ESTADO DE MEXICO', '55-58-29-07-39',
  'PAR900202RG8', 19.5361121435507, -99.0905472650516, false, true
FROM clientes c WHERE c.rfc = 'PAR900202RG8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '71', 'BALBUENA', 'AV. FERNANDO IGLESIAS CALDERON, N° 78, COL. JARDIN BALBUENA, CP 15900, VENUSTIANO CARRANZA, CIUDAD DE MEXICO', '55-26-12-33-33',
  'PMB150708NQ6', 19.4148755721277, -99.1042201750959, false, true
FROM clientes c WHERE c.rfc = 'PMB150708NQ6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '72', 'LG ANDER', 'AV. JARDINES DE MORELOS, N° 73 A, COL. JARDINES DE MORELOS, CP 55070, ECATEPEC, ESTADO DE MEXICO', '55-58-54-64-21',
  'PLG040611RM8', 19.5995223518801, -99.0104775988693, false, true
FROM clientes c WHERE c.rfc = 'PLG040611RM8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '73', 'LIMA', 'LIMA, Nº 892, COL. LINDAVISTA., CP 02240, GUSTAVO A.MADERO, CIUDAD DE MEXICO', '55-55-86-83-64',
  'PFR031029DC8', 19.4952096998761, -99.1254534786655, false, true
FROM clientes c WHERE c.rfc = 'PFR031029DC8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '75', 'I. LA CATOLICA', 'ISABEL LA CATOLICA, Nº 442, COL. OBRERA, CP 06800, CUAUHTEMOC, CIUDAD DE MEXICO', '55-55-30-10-91',
  'PVC050405MD0', 19.408143261743, -99.139288753307, false, true
FROM clientes c WHERE c.rfc = 'PVC050405MD0' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '76', 'LAS AGUILAS', 'CALZADA LAS AGUILAS, Nº 995, COL. AMPLIACION LAS AGUILAS, CP 01759, ALVARO OBREGON, CIUDAD DE MEXICO', '55-56-35-03-52',
  'PAG060125TW6', 19.3507388525734, -99.2205390173832, false, true
FROM clientes c WHERE c.rfc = 'PAG060125TW6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '77', 'LA NAVIDAD', 'HECTOR VICTORIA, N° 186, COL. LA NAVIDAD, CP 01759, CUAJIMALPA DE MORELOS, CIUDAD DE MEXICO', '55-58-13-51-59',
  'PAG060125TW6', 19.3729226, -99.2852483, false, true
FROM clientes c WHERE c.rfc = 'PAG060125TW6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '78', 'AV. MEXICO', 'AV. MEXICO, Nº 1179, COL. SANTA TERESA, CP 10710, MAGDALENA CONTRERAS, CIUDAD DE MEXICO', '55-51-35-33-88',
  'PAM060620381', 19.310332144255, -99.2288747580014, false, true
FROM clientes c WHERE c.rfc = 'PAM060620381' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '80', 'FLORESTA', 'AV. TEXCOCO, MZ 33, COL. FLORESTA, CP 56400, LOS REYES LA PAZ, ESTADO DE MEXICO', '55-58-55-37-96',
  'PPR940606L86', 19.3646128160844, -98.9856340612616, false, true
FROM clientes c WHERE c.rfc = 'PPR940606L86' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '81', 'CUMBRES', 'AV. CUMBRES DE MALTRATA, Nº 364, COL. AMERICAS UNIDAS, CP 57170, BENITO JUAREZ, CIUDAD DE MEXICO', '55-56-72-08-76',
  'PBA890313MKA', 19.3797312, -99.1424717, false, true
FROM clientes c WHERE c.rfc = 'PBA890313MKA' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '82', 'TETELPAN', 'AV. DESIERTO DE LOS LEONES, 4891, TELTEPAN, CP 01700, ALVARO OBREGON, CIUDAD DE MEXICO', '5517-39-04-75',
  'PAM060620381', 19.3424572, -99.2259492, false, true
FROM clientes c WHERE c.rfc = 'PAM060620381' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '83', 'IZCALLI ECATEPEC', 'CIRCUITO INTERIOR  LT 44 MZ 3, Nº 38, COL.IZCALLI ECATEPEC, CP 55070, ECATEPEC, ESTADO DE MEXICO', '55-51-16-96-02',
  'PLG040611RM8', 19.5933917, -99.0499305, false, true
FROM clientes c WHERE c.rfc = 'PLG040611RM8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '84', 'LA MONTAÑA', 'CALZADA LUCIO BLANCO, N° 48, COL.PROVIDENCIA, CP 53378, AZCAPOTZALCO, CIUDAD DE MEXICO', '55-17-42-03-46',
  'PSA7202196F5', 19.4921920896803, -99.213806978862, false, true
FROM clientes c WHERE c.rfc = 'PSA7202196F5' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '85', 'JULEN', 'CARRETERA FEDERAL A CUERNAVACA, Nº 5625, COL. SAN PEDRO MARTIR, CP 14650, TLALPAN, CIUDAD DE MEXICO', '55-55-73-42-48',
  'PJU070521M66', 19.2673486794655, -99.1710685205097, false, true
FROM clientes c WHERE c.rfc = 'PJU070521M66' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '86', 'CORUÑA', 'CORUÑA, Nº 255, COL. VIADUCTO PIEDAD, CP 07969, IZTACALCO, CIUDAD DE MEXICO', '55-55-30-71-98',
  'PPE960301KRA', 19.4009205, -99.1336171, false, true
FROM clientes c WHERE c.rfc = 'PPE960301KRA' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '87', 'PUENTE COLORADO', 'CALZADA DE LAS AGUILAS MZ 12 LT 18, Nº 1329, COL. PUENTE COLORADO, CP 01759, VENUSTIANO CARRANZA, CIUDAD DE MEXICO', '55-56-35-60-91',
  'PAG060125TW6', 19.3478975, -99.2315166, false, true
FROM clientes c WHERE c.rfc = 'PAG060125TW6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '88', 'EL OLIVO', 'AV. TECAMACHALCO, MZ 5, COL. EL OLIVO, CP 01759, HUIXQUILUCAN, CIUDAD DE MÉXICO', '55-52-53-21-99',
  'PAG060125TW6', 19.3861701, -99.2776786, false, true
FROM clientes c WHERE c.rfc = 'PAG060125TW6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '89', 'XALPA', 'AV TEJOCOTE CERRA DE DURAZNO, Nº 141 MZ 4 LT1, COL. XALPA, CP 09640, CIUDAD DE MEXICO', '55-12-72-76-78',
  'POT891130AK7', 19.2489865, -99.16236549999999, false, true
FROM clientes c WHERE c.rfc = 'POT891130AK7' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '90', 'SAN MIGUEL', 'PASCUAL OROZCO         COL. BARRIO, Nº 55, COL BARRIO DE SAN MIGUEL, CP 08650, IZTACALCO, CIUDAD DE MEXICO', '55-56-96-15-58',
  'PBA041119DY1', 19.3921455, -99.1173113, false, true
FROM clientes c WHERE c.rfc = 'PBA041119DY1' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '91', 'MEXICANOS', 'MEXICANOS, Nº157, COL MARTIRES DE TACUBAYA, CP 01759, COYOACAN, CIUDAD DE MEXICO', '55-55-16-29-70',
  'PAG060125TW6', 19.3872348578266, -99.2130424294477, false, true
FROM clientes c WHERE c.rfc = 'PAG060125TW6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '94', 'TECAMAC', 'AVENIDA SAN PABLO, MZ 1 LT 1, COL.VILLA REAL, CP 55070, TECAMAC, ESTADO DE MEXICO', '55-59-35-17-95',
  'PLG040611RM8', 19.68324996743, -98.9793763363122, false, true
FROM clientes c WHERE c.rfc = 'PLG040611RM8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '95', 'SAN NICOLAS', 'AV. MORELOS, S/N LT J, COL.VALLE DE ECATEPEC, CP 57170, ECATEPEC, ESTADO DE MEXICO', '55-15-62-16-70',
  'PBA890313MKA', 19.5685263236699, -99.0226577187854, false, true
FROM clientes c WHERE c.rfc = 'PBA890313MKA' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '96', 'SAN LORENZO', 'RAMON TORRES, Nº 1, COL SAN LORENZO TEZONCO, CP 09900, IZTAPALAPA, CIUDAD DE MEXICO', '55-58-45-10-58',
  'PGA080115495', 19.3099311825528, -99.0699633580061, false, true
FROM clientes c WHERE c.rfc = 'PGA080115495' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '98', 'CORPUS', 'AV. TAMAULIPAS, Nº 8 MZ-5 LT-3, COL. CORPUS CHRISTI, CP 01759, ALVARO OBREGON, CIUDAD DE MEXICO', '5556-43-56-11',
  'PAG060125TW6', 19.3630798081535, -99.2485096560796, false, true
FROM clientes c WHERE c.rfc = 'PAG060125TW6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '99', 'COYOACAN', 'ALLENDE, Nº 5, COL. DEL CARMEN, CP 04100, COYOACAN, CIUDAD DE MEXICO', '55-55-54-63-74',
  'PCO080617DA8', 19.3497837861105, -99.161700895432, false, true
FROM clientes c WHERE c.rfc = 'PCO080617DA8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion,
  latitud, longitud, es_rosticeria, activo
) VALUES (
  v_grupo_id, '100', 'SAN FELIPE', NULL,
  19.3441608, -99.0588647, false, true
);
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '101', 'EL ROSAL ERMITA', 'AV. DEL ROSAL, MZ-38 LT-19, COL. LOS ANGELES, CP 09700, IZTAPALAPA, CIUDAD DE MEXICO', '55-56-14-24-59',
  'POG980514JL6', 19.3452759, -99.0691211, false, true
FROM clientes c WHERE c.rfc = 'POG980514JL6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion,
  latitud, longitud, es_rosticeria, activo
) VALUES (
  v_grupo_id, '102', 'TLAXQUEÑA', NULL,
  19.5674272, -99.0351981, false, true
);
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '103', 'ISLAS', 'AV JARDINES . DE MORELOS, Nº472 M955 LT3, COL JARDINES DE MORELOS SEC.ISLAS, CP 55070, ECATEPEC, ESTADO DE MEXICO', '55-58-39-73-51',
  'PLG040611RM8', 19.6019715, -98.99144, false, true
FROM clientes c WHERE c.rfc = 'PLG040611RM8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '105', 'CABARRAL', 'AV. PONIENTE 112, Nº 405, COL.PANAMERICANA, CP 55070, GUSTAVO A. MADERO, CIUDAD DE MEXICO', '55-55-87-21-83',
  'PLG040611RM8', 19.4779337584562, -99.1436069974244, false, true
FROM clientes c WHERE c.rfc = 'PLG040611RM8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '106', 'EL ROSAL SN JERONIMO', 'AV. SAN JERONIMO, Nº 20 A, COL. PUEBLO NUEVO ALTO, CP 10710, MAGDALENA CONTRERAS, CIUDAD DE MEXICO', '55-56-30-10-51',
  'PAM060620381', 19.3062458963262, -99.2483291, false, true
FROM clientes c WHERE c.rfc = 'PAM060620381' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '107', 'TLAHUAC', 'AV. TLAHUAC TULYEHUALCO, Nº 6, COL BARRIO DE SAN MIGUEL, CP 16739, TLAHUAC, CIUDAD DE MEXICO', '55-58-42-04-97',
  'PTU990309LE7', 19.2683950981649, -99.0055299407218, false, true
FROM clientes c WHERE c.rfc = 'PTU990309LE7' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '108', 'SAN VICENTE', 'AV MIGUEL HIDALGO, N°12, COL.SAN VICENTE CHICOLOAPAN, CP 56400, CHICOLOAPAN, ESTADO DE MEXICO', NULL,
  'PPR940606L86', 19.4054174325625, -98.9430241176404, false, true
FROM clientes c WHERE c.rfc = 'PPR940606L86' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '109', 'RADAN ZUMPANGO', 'CALLE CUAUHTEMOC, Nº 3, COL. CENTRO, CP 55600, ZUMPANGO, ESTADO DE MEXICO', '59-19-17-31-21',
  'PZU081020U93', 19.778387346267, -99.112160648668, false, true
FROM clientes c WHERE c.rfc = 'PZU081020U93' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '110', 'NARVARETE', 'DIAGONAL SAN ANTONIO, Nº 1115 LOC. F, COL. NARVARTE, CP 03020, BENITO JUAREZ, CIUDAD DE MEXICO', '55-56-39-90-25',
  'PBA890313MKA', 19.3938268, -99.1592586, false, true
FROM clientes c WHERE c.rfc = 'PBA890313MKA' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '112', 'CHARCO', 'PUERTO MARFIL ESQ MARIA  GREEVER ., Nº 329, COL SAN MIGUEL CUAUHTEPEC EL ALTO, CP 07290, GUSTAVO A MADERO, CIUDAD DE MEXICO', '55-53-03-98-34',
  'PAR890223JE6', 19.56326, -99.13976, false, true
FROM clientes c WHERE c.rfc = 'PAR890223JE6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '113', 'EXP. NEZA', 'AV MEXICO, N°125, COL. RAUL ROMERO, CP 09660, NEZAHUALCOYOTL, ESTADO DE MEXICO', '55 57 97 31  66',
  'POT891130AK7', 19.3991046831706, -99.0413689213599, false, true
FROM clientes c WHERE c.rfc = 'POT891130AK7' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '114', 'PROGRESISTA', 'AV BENITO . JUAREZ ESQ EMILIO PORTES, M 3 L 61, COL. PROGRESISTA, CP 09243, IZTAPALAPA, CIUDAD DE MEXICO', '55-53-56-85-37',
  'POG980514JL6', 19.3710157, -99.1384728, false, true
FROM clientes c WHERE c.rfc = 'POG980514JL6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '115', 'LA RAZA', 'CALLE BRAHMS, Nº 63 B, COL.GUADALUPE VICTORIA, CP 54140, GUSTAVO A. MADERO, CIUDAD DE MEXICO', '5553-56-85-37',
  'PPU870928FP6', 19.4706794, -99.1393889, false, true
FROM clientes c WHERE c.rfc = 'PPU870928FP6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '117', 'ARENAL', 'MOCTEZUMA, Nº 8 LOC C, COL. ARENAL 1ª SECC., CP 07969, VENUSTIANO CARRANZA, CIUDAD DE MEXICO', '5555 58 22 46',
  'PPE960301KRA', 19.4239300544952, -99.0655039607882, false, true
FROM clientes c WHERE c.rfc = 'PPE960301KRA' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '122', 'CALPULALPAN', 'AV. MORELOS, Nº 21, COL. CENTRO CALPULALPAN, CP 56100, TLAXCALA, TLAXCALA', '7499-1831-65',
  'PTE940606SM6', 19.5867166245032, -98.5678159341248, false, true
FROM clientes c WHERE c.rfc = 'PTE940606SM6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion,
  latitud, longitud, es_rosticeria, activo
) VALUES (
  v_grupo_id, '133', 'EL MORAL', NULL,
  19.3436317, -99.0524509, false, true
);
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '134', 'OCOTEPEC', 'AV. GUERRERO, Nº 2730, COL. SAN BERNABE OCOTEPEC, CP 10300, MAGDALENA CONTRERAS, CIUDAD DE MEXICO', '5517-18-44-56',
  'PDA111213LB3', 19.3135798548785, -99.2587691382245, false, true
FROM clientes c WHERE c.rfc = 'PDA111213LB3' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '139', 'HUEHUETOCA', 'AV. JUAREZ, N° 18, COL. CABECERA MUNICIPAL, CP 55600, HUEHUETOCA, ESTADO DE MEXICO', '5939-181-911',
  'PZU081020U93', 19.8320962858543, -99.2046355682635, false, true
FROM clientes c WHERE c.rfc = 'PZU081020U93' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '140', 'XALOSTOC', 'EMILIANO ZAPATA, LOTE 2 Y 4, COL., CP 55340, ECATEPEC DE MORELOS, ESTADO DE MEXICO', '5556-99-92-43',
  'PAR900202RG8', 19.523287, -99.0750788, false, true
FROM clientes c WHERE c.rfc = 'PAR900202RG8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '141', 'TECAMACHALCO', 'FUENTE DE LOS TRITONES, Nº 7-A, COL.LOMAS DE TECAMACHALCO, CP 10710, NAUCALPAN DE JUAREZ, ESTADO DE MEXICO', '5552-93-18-24',
  'PAM060620381', 19.4292823577156, -99.2281365391625, false, true
FROM clientes c WHERE c.rfc = 'PAM060620381' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '143', 'LA BORBOLLA', 'LEYES DE REFORMA ESQ. LAGUNA ENCANTADA, S/N, COL.BENITO JUAREZ, CP 57170, TOLUCA, ESTADO DE MEXICO', '722-2121-823',
  'PBA890313MKA', 19.2679429411351, -99.6389298941603, false, true
FROM clientes c WHERE c.rfc = 'PBA890313MKA' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '146', 'AMECAMECA', 'MARIANO ABASOLO, Nº 10, COL.CENTRO, CP 56530, AMECAMECA, ESTADO DE MEXICO', '5979-789-368',
  'PIZ960513IDA', 19.128850801609, -98.7672113204399, false, true
FROM clientes c WHERE c.rfc = 'PIZ960513IDA' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '148', 'LOMAS VERDES', 'ALAMOS, Nº 3, COL. SANTIAGO OCCIPACO, CP 53250, NAUCALPAN DE JUAREZ, ESTADO DE MEXICO', '5567 18 99 00',
  'PLA140404AG9', 19.4986634272699, -99.2530182644161, false, true
FROM clientes c WHERE c.rfc = 'PLA140404AG9' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '152', 'LAGUNA DE TERMINOS', 'LAGUNA DE TERMINOS NUMERO 439, LOTE 38, COL. ANAHUAC, CP 11320, MIGUEL HIDALGO, CIUDAD DE MEXICO', '5567 24 70 30',
  'PLE8405299S1', 19.4425256819757, -99.1748784742667, false, true
FROM clientes c WHERE c.rfc = 'PLE8405299S1' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '157', 'TAMAULIPAS', 'TAMAULIPAS, N° 112, COL. HIPODROMO, CP 07100, CUAHUTEMOC, CIUDAD DE MEXICO', '5570-95-96-21',
  'PBA021119GR0', 19.4102222, -99.1748184, false, true
FROM clientes c WHERE c.rfc = 'PBA021119GR0' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '161', 'JOROBAS', 'AV. PASEO DE LA MORA, MZA 123, COL. SANTA TERESA III Y III BIS, CP 55600, HUHUETOCA, ESTADO DE MEXICO', '5939-159-037',
  'PZU081020U93', 19.8424410800098, -99.2403482420462, false, true
FROM clientes c WHERE c.rfc = 'PZU081020U93' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '164', 'OBSERVATORIO', 'OBSERVATORIO, N° 308, COL. LAS AMERICAS, CP 53250, MIGUEL HIDALGO, CIUDAD DE MEXICO', '5552-71-76-79',
  'PLA140404AG9', 19.4016242, -99.2026877, false, true
FROM clientes c WHERE c.rfc = 'PLA140404AG9' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '165', 'DESIERTO DE LOS LEONES', 'AV DESIERTO DE LOS LEONES, N° 383, COL. ATLAMAYA, CP 10300, ALVARO OBREGON, CIUDAD DE MEXICO', '5515 20 13 40',
  'PDA111213LB3', 19.3475055, -99.2023445, false, true
FROM clientes c WHERE c.rfc = 'PDA111213LB3' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '166', 'GOLONDRINAS', 'PETIRROJO, N° 27, COL. LA CAÑADA, CP 52987, ATIZAPAN DE ZARAGOZA, ESTADO DE MEXICO', NULL,
  'PAY920210BB8', 19.5402803, -99.238979, false, true
FROM clientes c WHERE c.rfc = 'PAY920210BB8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '167', 'GUANAJUATO', 'MANUEL JOSE CLOUTHIER, N°110, COL. PUNTA CAMPESTRE, CP 37128, LEON, GUANAJUATO', '447-7810-456',
  'PPB150708113', 21.1584413, -101.6914528, false, true
FROM clientes c WHERE c.rfc = 'PPB150708113' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '170', 'BARRANCA', 'BARRANCA DEL MUERTO, N° 497, COL. MERCED GOMEZ, CP 10300, ALVARO OBREGON, CIUDAD DE MEXICO', '5570 94 05 26',
  'PDA111213LB3', 19.36411891531, -99.1926922328548, false, true
FROM clientes c WHERE c.rfc = 'PDA111213LB3' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '171', 'RISCAL', 'RIO DE LOS REMEDIOS, N° 25, COL. SAN JUAN IXHUATEPEC, CP 54180, TLALNEPANTLA DE BAZ, ESTADO DE MEXICO', '5557-15-04-23',
  'PSJ151014Q62', 19.5182644489854, -99.1080943563361, false, true
FROM clientes c WHERE c.rfc = 'PSJ151014Q62' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '172', 'TULTITLAN', 'AV. PRADO SUR, N° 207, COL. UNIDAD MORELOS 3A SECC, CP 55070, TULTITLAN, ESTADO DE MEXICO', '5558-34-10-89',
  'PAM110330GU4', 19.6790754425492, -99.0872050579577, false, true
FROM clientes c WHERE c.rfc = 'PAM110330GU4' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '180', 'CZDA DE GUADALUPE', 'CALZADA DE GUADALUPE, N° 641, COL. ESTRELLA, CP 07420, GUSTAVO A.MADERO, CIUDAD DE MEXICO', '5575-91-40-37',
  'PAT890313LV9', 19.4790748854338, -99.1192160518107, false, true
FROM clientes c WHERE c.rfc = 'PAT890313LV9' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '181', 'QUERETARO', 'AV. CONSTITUYENTES, N° 7-1, COL. SAN FRANCISQUITO, CP 76058, QUERETARO, QUERETARO', '55-22-12-43-54',
  'PCO1606035G4', 20.5874005311621, -100.384989841176, false, true
FROM clientes c WHERE c.rfc = 'PCO1606035G4' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '182', 'XOCHIMILCO', 'CALLE FRANCISCO GOITIA, N°75, BARRIO SAN PEDRO, CP 16090, XOCHIMILCO, CIUDAD DE MEXICO', '5586 62 11 11',
  'PXO1606225R7', 19.2563331, -99.10740779999999, false, true
FROM clientes c WHERE c.rfc = 'PXO1606225R7' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '192', 'LA ESPIGA', 'LA RIOJA, MANZANA 26, COL.SAN PEDRO ZACATENCO, CP 07100, GUSTAVO A. MADERO, CIUDAD DE MEXICO', '5555 86 04 85',
  'PBA021119GR0', 19.5051774534694, -99.1250364, false, true
FROM clientes c WHERE c.rfc = 'PBA021119GR0' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '195', 'CAMPIÑA', 'AV. JUAN ALDAMA, MANZANA 123, COL.MIGUEL HIDALGO, CP 07550, ECATEPEC DE MORELOS, ESTADO DE MEXICO', '5515-41-07-53',
  'PAR040611633', 19.538722, -99.048446, false, true
FROM clientes c WHERE c.rfc = 'PAR040611633' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '199', 'TEZOZOMOC', 'CAMPO ENCANTADO, N°9, COL.SAN ANTONIO, CP 11320, AZCAPOTZALCO, CIUDAD DE MEXICO', '5517-42-18-81',
  'PLE8405299S1', 19.4781448112409, -99.1998444323872, false, true
FROM clientes c WHERE c.rfc = 'PLE8405299S1' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '201', 'LA TROJE', 'CARRETERA CUAUTITLAN-TULTEPEC Nº 21 LOTE 21, FRACCION IV, VILLAS DE CUAUTITLAN, CP 54857, CUAUTITLAN, ESTADO DE MEXICO', '5526-34-50-52',
  'PPB150708113', 19.6734214222339, -99.162345332662, false, true
FROM clientes c WHERE c.rfc = 'PPB150708113' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '205', 'TENAYUCA', 'CUAUHTEMOC, Nº 4, COL SAN BARTOLO TENAYUCA, CP 54150, TLALNEPANTLA DE BAZ, ESTADO DE MEXICO', NULL,
  'PPU870928FP6', 19.530403, -99.1695347, false, true
FROM clientes c WHERE c.rfc = 'PPU870928FP6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '208', 'TULPETLAC', 'PROLONGACION AVENIDA MEXICO, Nº 15, COL.AMPLIACION TULPETLAC, CP 55340, ECATEPEC DE MORELOS, ESTADO DE MEXICO', NULL,
  'PAR900202RG8', 19.5700374177273, -99.0548151, false, true
FROM clientes c WHERE c.rfc = 'PAR900202RG8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion,
  latitud, longitud, es_rosticeria, activo
) VALUES (
  v_grupo_id, '215', 'ZAPOTITLAN', NULL,
  19.3170246, -99.06552310000001, false, true
);
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion,
  latitud, longitud, es_rosticeria, activo
) VALUES (
  v_grupo_id, '218', 'SUBURBANO', NULL,
  19.6676324, -99.17780909999999, false, true
);
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '225', 'PALMITAS', 'AVENIDA SAN MARCOS, SN, COL. MOLINO DE SANTO DOMINGO, CP 53250, ALVARO OBREGON, CIUDAD DE MEXICO', '55-52-71-31-69',
  'PLA140404AG9', 19.3941212699283, -99.20834603713, false, true
FROM clientes c WHERE c.rfc = 'PLA140404AG9' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '234', 'MONTEVIDEO', 'MONTEVIDEO, N°32, NUEVA ATZACOALCO, CP 07420, GUSTAVO A MADERO, CIUDAD DE MEXICO', NULL,
  'PAT890313LV9', 19.4856491064178, -99.1205345968991, false, true
FROM clientes c WHERE c.rfc = 'PAT890313LV9' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '239', 'REVOLUCION', 'AV REVOLUCION, N°1590, SAN  ÁNGEL, CP 01000, ÁlVARO OBREGON, CIUDAD DE MEXICO', NULL,
  'IZP2507282Q7', 19.3498411194938, -99.1903438467735, false, true
FROM clientes c WHERE c.rfc = 'IZP2507282Q7' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '301', 'Crucero', 'AV. SANTA CECILIA, N° 11, COL. SAN MIGUEL CHALMA, CP 54100, TLANEPANTLA DE BAZ, ESTADO DE MEXICO', '5553-91-01-08',
  'PCA0406117X8', 19.5403542692455, -99.1541456542626, true, true
FROM clientes c WHERE c.rfc = 'PCA0406117X8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '302', 'Arbolillo', 'AV. CUAUTEPEC PROLG ANAHUAC, MAZ 2, COL. LA PASTORA, CP 07290, GUSTAVO A. MADERO, CIUDAD DE MEXICO', '5553-89-45-32',
  'PAR890223JE6', 19.5293104987439, -99.1419373503148, true, true
FROM clientes c WHERE c.rfc = 'PAR890223JE6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '303', 'Pan Amatrias', 'AV. JARDINES DE MORELOS, N° 317, COL. JARDINES DE MORELOS, SECC. BOSQUES, CP 55070, ECATEPEC DE MORELOS, ESTADO DE MEXICO', '5558-39-19-48',
  'PAM110330GU4', 19.5934729, -98.998283, true, true
FROM clientes c WHERE c.rfc = 'PAM110330GU4' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '304', 'Sta. Martha', 'CALZ IGNACIO ZARAGOZA, N° 3063, COL. SANTA MARTHA ACATITLA, CP 09510, IZTAPALAPA, CIUDAD DE MEXICO', '5557-32-01-81',
  'PSM890313MM7', 19.3615579, -99.00225359999999, true, true
FROM clientes c WHERE c.rfc = 'PSM890313MM7' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '305', 'Lecaroz', 'GUSTAVO BAZ, N° 8, COL. TEQUESQUINAHUAC, CP 54020, TLALNEPANTLA DE BAZ, ESTADO DE MEXICO', '5553-10-68-48',
  'GOLJ730927AP9', 19.5588382317152, -99.2033001448065, true, true
FROM clientes c WHERE c.rfc = 'GOLJ730927AP9' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '306', 'Ecatepec', 'JACARANDAS, N° 26, COL. LA FLORIDA, CP 55240, ECATEPEC DE MORELOS, ESTADO DE MEXICO', '5557-83-66-96',
  'PEC870923IS3', 19.5128523820612, -99.0364572961045, true, true
FROM clientes c WHERE c.rfc = 'PEC870923IS3' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '307', 'Otxondo', 'CALZADA ERMITA IZTAPALAPA, N° 4010, COL. CITLALI, CP 09660, IZTAPALAPA, CIUDAD DE MEXICO', '554-29-21-98',
  'POT891130AK7', 19.3445214227003, -99.0253144721645, true, true
FROM clientes c WHERE c.rfc = 'POT891130AK7' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '308', 'Caracoles', 'CERRO TEJOCOTE, MZ.76 LT.1, COL. DR. JORGE JIMENEZ CANTU, CP 55340, TLALNEPANTLA, ESTADO DE MEXICO', '5558-29-07-39',
  'PAR900202RG8', 19.5361121435507, -99.0905472650516, true, true
FROM clientes c WHERE c.rfc = 'PAR900202RG8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '309', 'Bosques', 'CARLOS HANK GONZALEZ, SN, COL. BOSQUES DE ARAGON, CP 57170, NEZAHUALCOYOTL, ESTADO DE MEXICO', '5557-94-42-60',
  'PBA890313MKA', 19.4784512293377, -99.0516835535914, true, true
FROM clientes c WHERE c.rfc = 'PBA890313MKA' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '310', 'Arzoaga', 'ANT CARRET PACHUCA, N° 21, COL. VIVEROS DE XALOSTOC, CP 55340, ECATEPEC, ESTADO DE MEXICO', '5557-88-81-41',
  'PAR900202RG8', 19.5222827092695, -99.0834996846567, true, true
FROM clientes c WHERE c.rfc = 'PAR900202RG8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '311', 'Guipuzcoa', 'AVENIDA 5 DE MAYO, N° 3, COL. TEPANQUIHUAC, CP 54770, TEOLOYUCAN, ESTADO DE MEXICO', '59-39-14-04-78',
  'GUI890725CF9', 19.7441323161687, -99.1777868646887, true, true
FROM clientes c WHERE c.rfc = 'GUI890725CF9' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '312', 'Belate', 'JOSE PERDIZ, N° 21, COL. CENTRO, CP 62740, CUAUTLA, MORELOS', '73-53-52-26-26',
  'PBE8912077R9', 18.8128717958113, -98.9509742612088, true, true
FROM clientes c WHERE c.rfc = 'PBE8912077R9' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '313', 'Atzacualco', 'EDUARDO MOLINA, N° 1835, COL. NUEVA ATZACOALCO, CP 07420, GUSTAVO A. MADERO, CIUDAD DE MEXICO', '55-57-57-58-84',
  'PAT890313LV9', 19.4934823261953, -99.091226235585, true, true
FROM clientes c WHERE c.rfc = 'PAT890313LV9' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '314', 'Prado', 'AV. CENTRAL, MZA. 3, COL. NUEVO PASEO DE SAN AGUSTIN 3 A SECC C, CP 55130, ECATEPEC DE MORELOS, ESTADO DE MEXICO', '55-57-55-16-33',
  'PPR9202109I4', 19.5309682318761, -99.0294626644163, true, true
FROM clientes c WHERE c.rfc = 'PPR9202109I4' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '315', 'Pradeira', 'FRANCISCO MORAZAN, N° 34, COL. LA PRADERA, CP 07500, GUSTAVO A. MADERO, CIUDAD DE MEXICO', '55-57-94-14-04',
  'PAP8601105X9', 19.4726359191818, -99.0677348211642, true, true
FROM clientes c WHERE c.rfc = 'PAP8601105X9' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '316', 'San Jose', 'AV. BENITO JUAREZ, N° 74, COL.SAN LUCAS PATONI, CP 54100, TLALNEPANTLA, ESTADO DE MEXICO', '5553-91-53-55',
  'PCA0406117X8', 19.5341433, -99.1584962, true, true
FROM clientes c WHERE c.rfc = 'PCA0406117X8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '317', 'San Pedro', '20 DE NOVIEMBRE, N° 3, VILLA NICOLAS ROMERO CENTRO, CP 54050, NICOLAS ROMERO, ESTADO DE MEXICO', '55-21-68-50-51',
  'PAY920210BB8', 19.6251401105551, -99.3157601719409, true, true
FROM clientes c WHERE c.rfc = 'PAY920210BB8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '318', 'Maito', 'CARRETERA ATIZAPAN TLALNEPANTLA, N° 28, COL. BOULEVARES DE ATIZAPAN, CP 52948, ATIZAPAN DE ZARAGOZA, ESTADO DE MEXICO', '55-58-24-84-56',
  'PMA920228HC3', 19.5717937779491, -99.2539745527895, true, true
FROM clientes c WHERE c.rfc = 'PMA920228HC3' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '319', 'Yautepec', 'PLAZUELA DE LEYVA, N° 6-A, COL. CENTRO, CP 62730, YAUTEPEC, MORELOS', '73-53-94-02-46',
  'PYA920226MC7', 18.8859124510863, -99.0613901827262, true, true
FROM clientes c WHERE c.rfc = 'PYA920226MC7' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '320', 'Granjas', 'VALLE DEL DON, MZA 33, COL.GRANJAS INDEPENDENCIA, CP 55240, ECATEPEC DE MORELOS, ESTADO DE MEXICO', '5557-12-56-21',
  'PEC870923IS3', 19.4929879123807, -99.0328609588194, true, true
FROM clientes c WHERE c.rfc = 'PEC870923IS3' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '322', 'Norte', 'ESTADO DE YUCATAN, N°3, COL. PROVIDENCIA, CP 07550, GUSTAVO A MADERO, CIUDAD DE MEXICO', '55-57-11-07-41',
  'PAR040611633', 19.4804498, -99.0651637, true, true
FROM clientes c WHERE c.rfc = 'PAR040611633' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '323', 'La Rosa', 'CIRCUITO CUAUHTEMOC, MZA 40 LT 4, COL. CIUDAD CUAUHTEMOC, CP 55067, ECATEPEC DE MORELOS, ESTADO DE MEXICO', '5559-37-20-81',
  'PSM901023360', 19.6393199386592, -98.9980918692211, true, true
FROM clientes c WHERE c.rfc = 'PSM901023360' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '324', 'Balbuena', 'FERNANDO IGLESIAS CALDERON, N° 78, COL. JARDIN BALBUENA, CP 15900, VENUSTIANO CARRANZA, CIUDAD DE MEXICO', '55-26-12-33-33',
  'PMB150708NQ6', 19.4148755721277, -99.1042201750959, true, true
FROM clientes c WHERE c.rfc = 'PMB150708NQ6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '325', 'V. de Covadonga', 'ISABEL LA CATOLICA, N° 442, COL.OBRERA, CP 06800, CUAUHTEMOC, CIUDAD DE MEXICO', '55-55-30-10-91',
  'PVC050405MD0', 19.408143261743, -99.139288753307, true, true
FROM clientes c WHERE c.rfc = 'PVC050405MD0' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '326', 'Reynosa', 'TEPATONGO, N° 100, COL.SAN ANDRES, CP 02240, AZCAPOTZALCO, CIUDAD DE MEXICO', '55-26-26-25-79',
  'PFR031029DC8', 19.4963125213075, -99.1847146424036, true, true
FROM clientes c WHERE c.rfc = 'PFR031029DC8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '327', 'Sol de Tacubaya', 'FRANCISCO I MADERO, N° 32, COL. PRESIDENTES, CP 01290, ALVARO OBREGON, CIUDAD DE MEXICO', '55-56-02-33-01',
  'PST920921MU0', 19.3787925440698, -99.2204398215338, true, true
FROM clientes c WHERE c.rfc = 'PST920921MU0' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '329', 'Ayegui', 'AV. ADOLFO  LOPEZ MATEOS, N°55, COL.JACARANDAS, CP 54050, TlALNEPANTLA DE BAZ, ESTADO DE MEXICO', '55-53-97-08-33',
  'PAY920210BB8', 19.5349505089496, -99.2316656120996, true, true
FROM clientes c WHERE c.rfc = 'PAY920210BB8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '330', 'Los Reyes', 'PENSADOR MEXICANO, N° 3-A, COL. LOS REYES LA PAZ, CP 56400, LA PAZ, ESTADO DE MEXICO', '55-58-55-78-01',
  'PPR940606L86', 19.3587024455494, -98.9768858120699, true, true
FROM clientes c WHERE c.rfc = 'PPR940606L86' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '331', 'Carrasco', 'PRIMERA NORTE, LT 4, COL.ISIDRO FABELA, CP 14030, TLALPAN, CIUDAD DE MEXICO', '55-56-06-20-24',
  'PCA930611T35', 19.3001509686539, -99.1743400947401, true, true
FROM clientes c WHERE c.rfc = 'PCA930611T35' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '332', 'Lago', 'YAQUIS, N° 84, COL. TLALCOLIGIA, CP 03800, TLALPAN, CIUDAD DE MEXICO', '5555-73-91-76',
  'AAMI5607055A7', 19.2755593, -99.1720392, true, true
FROM clientes c WHERE c.rfc = 'AAMI5607055A7' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '333', 'Lima', 'LIMA, N° 892, COL. LINDAVISTA, CP 02240, GUSTAVO A. MADERO, CIUDAD DE MEXICO', '55-55-86-83-64',
  'PFR031029DC8', 19.4952096998761, -99.1254534786655, true, true
FROM clientes c WHERE c.rfc = 'PFR031029DC8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '334', 'Puerto', 'CUAUHTEMOC, N° 2, COL. EL TENAYO, CP 54140, TLALNEPANTLA, ESTADO DE MEXICO', '5553-09-08-19',
  'PPU870928FP6', 19.5437923689805, -99.1680158669514, true, true
FROM clientes c WHERE c.rfc = 'PPU870928FP6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '335', 'Lago de Guadalupe', 'CARR. LAGO DE GUADALUPE, MZ 190, COL. MARGARITA MAZA DE JUAREZ, CP 55240, ATIZAPAN DE ZARAGOZA, ESTADO DE MEXICO', '5558-87-55-71',
  'PLC900202KS1', 19.5900224320017, -99.2274204423283, true, true
FROM clientes c WHERE c.rfc = 'PLC900202KS1' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '336', 'Cuautla', 'I. MAYA, S/N, COL. AMPLIACION EMILIANO ZAPATA, CP 62740, CUAUTLA, MORELOS', NULL,
  'PBE8912077R9', 18.8173549, -98.9507963, true, true
FROM clientes c WHERE c.rfc = 'PBE8912077R9' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '337', 'Texcoco', 'CRISTOBAL COLON, N° 148, COL TEXCOCO DE MORA CENTRO, CP 56100, TEXCOCO, ESTADO DE MEXICO', '59-59-54-11-20',
  'PTE940606SM6', 19.5157244682945, -98.8837348625595, true, true
FROM clientes c WHERE c.rfc = 'PTE940606SM6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '338', 'Providencia', 'CONSTITUCION DE LA REPUBLICA, N° 103, COL. PROVIDENCIA, CP 14430, GUSTAVO A.MADERO, CIUDAD DE MEXICO', '5557-10-21-52',
  'PTL040611815', 19.4819303, -99.0719035, true, true
FROM clientes c WHERE c.rfc = 'PTL040611815' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '339', 'Santiago', 'AV SANTIAGO AHUIZOTLA, N°18, COL.AHUIZOTLA, CP 53378, NAUCALPAN DE JUAREZ, ESTADO DE MEXICO', '5555-76-00-84',
  'PSA7202196F5', 19.47031105563, -99.2111241742847, true, true
FROM clientes c WHERE c.rfc = 'PSA7202196F5' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '340', 'Coyoacan', 'ALLENDE, N° 5, COL.EL CARMEN, CP 04100, COYOACAN, CIUDAD DE MEXICO', '55-55-54-62-97',
  'PCO080617DA8', 19.3497837861105, -99.161700895432, true, true
FROM clientes c WHERE c.rfc = 'PCO080617DA8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '341', 'Hiper G', 'ING. EDUARDO MOLINA, N°1623, COL. EL COYOL, CP 07420, GUSTAVO A.MADERO, CIUDAD DE MEXICO', NULL,
  'PAT890313LV9', 19.4846174, -99.09441489999999, true, true
FROM clientes c WHERE c.rfc = 'PAT890313LV9' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '342', 'Lanesto', 'ZARAGOZA, N° 20, COL. CHIMALHUACAN CENTRO, CP 56330, CHIMALHUACAN, ESTADO DE MEXICO', '5558-52-00-83',
  'LAN870616IG1', 19.4181735526612, -98.944127145942, true, true
FROM clientes c WHERE c.rfc = 'LAN870616IG1' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '343', 'Impulsora', 'HACIENDA DE LA NORIA, LOC 52, COL.AMPLIACION IMPULSORA, CP 57170, NEZAHUALCOYOTL, ESTADO DE MEXICO', '5557-12-20-80',
  'PBA890313MKA', 19.4807321, -99.0444875, true, true
FROM clientes c WHERE c.rfc = 'PBA890313MKA' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '344', 'Horno', 'AVENIDA INSURGENTES SUR, N° 3751, COL. SAN PEDRO APOSTOL, CP 14070, TLALPAN, CIUDAD DE MEXICO', '55-55-28-48-81',
  'PHO9306119K5', 19.2926508725049, -99.1783337178705, true, true
FROM clientes c WHERE c.rfc = 'PHO9306119K5' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '345', 'Agricola Oriental', 'AV. SUR 16, N° 281, COL. AGRICOLA ORIENTAL, CP 08500, IZTACALCO, CIUDAD DE MEXICO', '5551-15-16-52',
  'AUAA710403BUA', 19.3945388, -99.0736815, true, true
FROM clientes c WHERE c.rfc = 'AUAA710403BUA' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '346', 'Vicky', 'EJERCITO AMERICANO, N° 58, COL. CENTRO, CP 62740, CUAUTLA, MORELOS', '73-53-52-02-23',
  'PBE8912077R9', 18.8121115119275, -98.9514764627197, true, true
FROM clientes c WHERE c.rfc = 'PBE8912077R9' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '347', 'Jonacatepec', 'BENITO JUAREZ, N° 2, COL. CENTRO, CP 62740, JONACATEPEC', NULL,
  'PBE8912077R9', 18.6948566, -98.80525109999999, true, true
FROM clientes c WHERE c.rfc = 'PBE8912077R9' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '348', 'Peñon', 'AV. 519, N° 84, COL. SAN JUAN DE ARAGON 1a Y 2a SECCION, CP 07969, GUSTAVO A. MADERO, CIUDAD DE MEXICO', '55-57-60-80-48',
  'PPE960301KRA', 19.457007974308, -99.0930213846547, true, true
FROM clientes c WHERE c.rfc = 'PPE960301KRA' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '349', 'Ayotla', 'AVENIDA CUAUHTEMOC, N° 173-A, COL. AYOTLA, CP 56400, IZTAPALUCA, ESTADO DE MEXICO', '55-59-74-67-61',
  'PPR940606L86', 19.3138571, -98.8882751, true, true
FROM clientes c WHERE c.rfc = 'PPR940606L86' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '350', 'Irache', 'AV DEL TRABAJO, N°39, COL.LOMAS SAN ANDRES ATENCO, CP 52926, TLALNEPANTLA, ESTADO DE MEXICO', '55-53-98-50-91',
  'PLG920210CK1', 19.5418969153121, -99.2323636188328, true, true
FROM clientes c WHERE c.rfc = 'PLG920210CK1' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '351', 'Iztapaluca', 'AV. CUAUHTEMOC, N° 13, COL. IXTAPALUCA CENTRO, CP 56530, IXTAPALUCA, ESTADO DE MEXICO', '55-59-72-37-33',
  'PIZ960513IDA', 19.314637389649, -98.8830359868476, true, true
FROM clientes c WHERE c.rfc = 'PIZ960513IDA' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '352', 'Navidad', 'HECTOR VICTORIA, N° 186, COL.NAVIDAD, CP 03800, CUAJIMALPA, CIUDAD DE MEXICO', '55-58-13-51-59',
  'AAFC6808244QA', 19.3729226, -99.2852483, true, true
FROM clientes c WHERE c.rfc = 'AAFC6808244QA' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '353', 'Palomas', 'AVENIDA PALOMAS, S/N, COL. VALLE DE LOS BAEZ, CP 55070, ECATEPEC DE MORELOS, ESTADO DE MEXICO', NULL,
  'PAM110330GU4', 19.52481, -99.0579923, true, true
FROM clientes c WHERE c.rfc = 'PAM110330GU4' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '354', 'Cantera', 'CANTERA, N° 122, COL CANTERA, CP 14070, TLALPAN, CIUDAD DE MEXICO', '5554-85-61-14',
  'PHO9306119K5', 19.2803691, -99.1840378, true, true
FROM clientes c WHERE c.rfc = 'PHO9306119K5' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '355', 'Montes', 'AV. JARDINES DE MORELOS, LT 19, COL JARDINES DE MORELOS, CP 55070, ECATEPEC DE MORELOS, ESTADO DE MEXICO', NULL,
  'PAM110330GU4', 19.5968999, -99.0062545, true, true
FROM clientes c WHERE c.rfc = 'PAM110330GU4' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '356', 'Olimpica', 'AV. CENTRAL, MZ 18, COL LA OLIMPICA, CP 55130, ECATEPEC DE MORELOS, ESTADO DE MEXICO', '55-57-91-71-57',
  'PSC961003K44', 19.521546140381, -99.0340683716338, true, true
FROM clientes c WHERE c.rfc = 'PSC961003K44' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '357', 'Nerea', 'AV. ROBERTO ESQUERRA, N°385, COL CUAUTEPEC DE MADERO, CP 07200, GUSTAVO A. MADERO, CIUDAD DE MEXICO', '55-53-03-77-70',
  'PNE970306EV3', 19.5490187404772, -99.1351130788273, true, true
FROM clientes c WHERE c.rfc = 'PNE970306EV3' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '358', 'Aguilas', 'CALZADA LAS AGUILAS, N° 995, COL.LAS AGUILAS AMPLIACION, CP 01759, ALVARO OBREGON, CIUDAD DE MEXICO', '55-56-35-03-52',
  'PAG060125TW6', 19.3507388525734, -99.2205390173832, true, true
FROM clientes c WHERE c.rfc = 'PAG060125TW6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '359', 'Oaxtepec', 'EMPERADOR, N° 3, COL CENTRO, CP 62740, YAUTEPEC, MORELOS', NULL,
  'PBE8912077R9', 18.9072225, -98.9704302, true, true
FROM clientes c WHERE c.rfc = 'PBE8912077R9' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '360', 'Av. México', 'AVENIDA MEXICO, N° 1179, COL SANTA TERESA, CP 10710, LA MAGDALENA CONTRERAS, CIUDAD DE MEXICO', '55-51-35-33-88',
  'PAM060620381', 19.310332144255, -99.2288747580014, true, true
FROM clientes c WHERE c.rfc = 'PAM060620381' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '361', 'San Gabriel', 'CABO DE BUENA ESPERANZA, N° 340, COL. AMPL GABRIEL HERNANDEZ, CP 07089, GUSTAVO A. MADERO, CIUDAD DE MEXICO', '55-57-15-20-28',
  'PSG9706301L2', 19.5011138331638, -99.0958657806148, true, true
FROM clientes c WHERE c.rfc = 'PSG9706301L2' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '362', 'Moctezuma', 'ORIENTE 170, N°137, COL. MOCTEZUMA 2a SEC, CP 55270, VENUSTIANO CARRANZA, CIUDAD DE MEXICO', NULL,
  'PJU980302G92', 19.4277603, -99.09701609999999, true, true
FROM clientes c WHERE c.rfc = 'PJU980302G92' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '364', 'Cuitlahuac', 'AV. CUITLAHUAC, N° 11, COL..POPOTLA, CP 04100, MIGUEL HIDALGO, CIUDAD DE MEXICO', '5553-42-11-33',
  'PCO080617DA8', 19.456723, -99.1801416, true, true
FROM clientes c WHERE c.rfc = 'PCO080617DA8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '365', 'El Salado', 'CALZADA IGNACIO ZARAGOZA, N° 3254, COL.SANTA MARTHA ACATITLA, CP 07420, IZTAPALAPA, CIUDAD DE MEXICO', '55-57-33-12-39',
  'PAT890313LV9', 19.3672716, -99.0049501, true, true
FROM clientes c WHERE c.rfc = 'PAT890313LV9' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '366', 'Floresta', 'AVENIDA TEXCOCO, MZ 33, COL FLORESTA, CP 56400, LA PAZ, ESTADO DE MEXICO', '55-58-55-37-96',
  'PPR940606L86', 19.3646128160844, -98.9856340612616, true, true
FROM clientes c WHERE c.rfc = 'PPR940606L86' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '368', 'Ermita 1', 'CALZADA ERMITA IZTAPALAPA, N°2771- B, COL. SANTA CRUZ MEYEHUALCO, CP 09700, IZTAPALAPA, CIUDAD DE MEXICO', '55-56-93-94-50',
  'POG980514JL6', 19.3435026586198, -99.0356226613328, true, true
FROM clientes c WHERE c.rfc = 'POG980514JL6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '369', 'Santa Cruz', 'CALZ. ERMITA IZTAPALAPA, N° 2341, COL.SANTA CRUZ MEYEHUALCO, CP 09700, IZTAPALAPA, CIUDAD DE MEXICO', '55-56-91-11-26',
  'REDM680115125', 19.3425026470836, -99.0449724693052, true, true
FROM clientes c WHERE c.rfc = 'REDM680115125' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '370', 'Julild', 'AV. CENTRAL, N° 110, COL. VALLE DE ARAGON, CP 55270, ECATEPEC DE MORELOS, ESTADO DE MEXICO', '55-57-80-60-97',
  'PJU980302G92', 19.5006981823428, -99.0418399381464, true, true
FROM clientes c WHERE c.rfc = 'PJU980302G92' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '371', 'San Felipe', 'CLZ ERMITA IZTAPALAPA, N° 2320 B, COL. CONSTITICION DE 1917, CP 09260, IZTAPALAPA, CIUDAD DE MEXICO', '5556-92-26-35',
  'POG980514JL6', 19.3441608, -99.0588647, true, true
FROM clientes c WHERE c.rfc = 'POG980514JL6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '373', 'La Joya', 'AVENIDA TLALPAN, N° 4999, COL. LA JOYA, CP 14030, TLALPAN, CIUDAD DE MEXICO', '55-54-85-45-87',
  'PCA930611T35', 19.2821007336388, -99.165312283537, true, true
FROM clientes c WHERE c.rfc = 'PCA930611T35' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '374', 'Tulyehualco', 'AVENIDA TLAHUAC, N° 8615, COL. SAN ISIDRO, CP 16739, XOCHIMILCO, CIUDAD DE MEXICO', '55-21-61-45-09',
  'PTU990309LE7', 19.2559286077543, -99.0113357937386, true, true
FROM clientes c WHERE c.rfc = 'PTU990309LE7' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '375', 'El Arbol', 'AV.MANUEL ESPINOZA Y IGLESIA 31 PONIENTE, N°2708, COL.BENITO JUAREZ, CP 72000, PUEBLA, PUEBLA', NULL,
  'PPS0305067I3', 19.0522381977874, -98.2045218757607, true, true
FROM clientes c WHERE c.rfc = 'PPS0305067I3' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '376', 'Barrio Alto', 'JUVENTINO ROSAS, N° 3, COL. CUAUTEPEC EL ALTO, CP 07100, GUSTAVO A. MADERO, CIUDAD DE MEXICO', '5553-03-02-66',
  'PBA021119GR0', 19.5573638121991, -99.1349519333442, true, true
FROM clientes c WHERE c.rfc = 'PBA021119GR0' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '377', 'Cardenas', 'LAZARO CARDENAS, MZ 5, COL. MEXICO INSURGENTE, CP 55270, ECATEPEC DE MORELOS, ESTADO DE MEXICO', '5551-14-18-85',
  'PJU980302G92', 19.5526346, -99.08562959999999, true, true
FROM clientes c WHERE c.rfc = 'PJU980302G92' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '378', 'Axochiapan', '16 DE SEPTIEMBRE, N° 15, COL. CENTRO, CP 62740, AXOCHIAPAN, MORELOS', '735-35-117-46',
  'PBE8912077R9', 18.5029827, -98.7532804, true, true
FROM clientes c WHERE c.rfc = 'PBE8912077R9' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '379', 'Santo Domingo', 'ESCUINAPA, N° 44, COL. SANTO DOMINGO, CP 04369, COYOACAN, CIUDAD DE MEXICO', '5556-19-50-51',
  'PSD750716690', 19.3330842, -99.1727581, true, true
FROM clientes c WHERE c.rfc = 'PSD750716690' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '380', 'Exp. Olimpica (Tecnologico)', 'SOR JUANA INES DE LA CRUZ, N° 43, COL. VALLE DE ANAHUAC SECCION A, CP 55130, ECATEPEC DE MORELOS, ESTADO DE MEXICO', NULL,
  'PSC961003K44', 19.6166404, -99.077299, true, true
FROM clientes c WHERE c.rfc = 'PSC961003K44' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '381', 'Cuajimalpa', 'AV. VERACRUZ, N° 29, COL CUAJIMALPA, CP 57170, CUAJIMALPA MORELOS, CIUDAD DE MEXICO', '55-58-12-06-20',
  'PBA890313MKA', 19.3559176081584, -99.2995997761352, true, true
FROM clientes c WHERE c.rfc = 'PBA890313MKA' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '384', 'Tetelpan', 'AV. DESIERTO DE LOS LEONES, N° 4891, COL. TETELPAN, CP 01759, ALVARO OBREGON, CIUDAD DE MEXICO', '55-17-39-04-75',
  'PAG060125TW6', 19.3424572, -99.2259492, true, true
FROM clientes c WHERE c.rfc = 'PAG060125TW6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '385', 'Cumbres', 'AV.CUMBRES DE MALTRATA, N° 364, COL. AMERICAS UNIDAS, CP 57170, BENITO JUAREZ, CIUDAD DE MEXICO', '55-56-72-08-76',
  'PBA890313MKA', 19.3797312, -99.1424717, true, true
FROM clientes c WHERE c.rfc = 'PBA890313MKA' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '386', 'Xalpa', 'AV. TEJOCOTE CERRADA DE DURAZNO N°141, MZA 4, COL. XALPA, CP 09660, IZTAPALAPA, CIUDAD DE MEXICO', '55-12-72-76-78',
  'POT891130AK7', 19.3410567, -99.0172027, true, true
FROM clientes c WHERE c.rfc = 'POT891130AK7' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '387', 'Puente Colorado', 'CALZ. DE LAS AGUILAS, N° 1329, COL PUENTE COLORADO, CP 01759, ÁLVARO OBREGON, CIUDAD DE MEXICO', '55-56-35-60-91',
  'PAG060125TW6', 19.3480462, -99.2317262, true, true
FROM clientes c WHERE c.rfc = 'PAG060125TW6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '388', 'San Miguel', 'PASCUAL OROZCO, N° 55, COL. SAN MIGUEL, CP 15900, IZTACALCO, CIUDAD DE MEXICO', '55-56-96-15-58',
  'PMB150708NQ6', 19.3911141, -99.11737509999999, true, true
FROM clientes c WHERE c.rfc = 'PMB150708NQ6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '389', 'Izcalli Ecatepec', 'CIRCUITO INTERIOR N°38, LOTE 44, COL IZCALLI ECATEPEC, CP 55070, ECATEPEC DE MORELOS, ESTADO DE MEXICO', '55-51-16-96-02',
  'PLG040611RM8', 19.5957325, -99.04660620000001, true, true
FROM clientes c WHERE c.rfc = 'PLG040611RM8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '390', 'Puebla', 'AV. 10 PONIENTE, N°1103, COL.CENTRO, CP 72000, PUEBLA, PUEBLA', '222 232 22 02',
  'PPS0305067I3', 19.0521781, -98.2045101, true, true
FROM clientes c WHERE c.rfc = 'PPS0305067I3' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '391', 'Montaña', 'CALZADA LUCIO BLANCO, N° 46, COL PROVIDENCIA, CP 53378, AZCAPOTZALCO, CIUDAD DE MEXICO', '55-17-42-03-46',
  'PSA7202196F5', 19.4921920896803, -99.213806978862, true, true
FROM clientes c WHERE c.rfc = 'PSA7202196F5' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '392', 'El Olivo', 'AV. TECAMACHALCO, MZA 5, COL EL OLIVO, CP 01759, HUIXQUILUCAN, CIUDAD DE MÉXICO', '55-52-53-21-99',
  'PAG060125TW6', 19.3861701, -99.2776786, true, true
FROM clientes c WHERE c.rfc = 'PAG060125TW6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '393', 'Julen', 'CARRETERA FEDERAL A CUERNAVACA, N° 5625, COL.SAN PEDRO MARTIR, CP 14650, TLALPAN, CIUDAD DE MEXICO', '55-55-73-42-48',
  'PJU070521M66', 19.2673486794655, -99.1710685205097, true, true
FROM clientes c WHERE c.rfc = 'PJU070521M66' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '394', 'Mexicanos', 'AV. MEXICANOS, N°157, COL MARTIRES DE TACUBAYA, CP 01759, ÁLVARO OBREGON, CIUDAD DE MEXICO', '55-55-16-29-70',
  'PAG060125TW6', 19.3872348578266, -99.2130424294477, true, true
FROM clientes c WHERE c.rfc = 'PAG060125TW6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '395', 'Tecamac', 'AV . SAN PABLO, MZ 1, COL. VILLAS DEL REAL, CP 55070, TECAMAC, ESTADO DE MEXICO', '55-59-35-17-95',
  'PLG040611RM8', 19.68324996743, -98.9793763363122, true, true
FROM clientes c WHERE c.rfc = 'PLG040611RM8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '397', 'San Nicolas', 'AV. MORELOS, S/N, COL. VALLE DE ECATEPEC, CP 57170, ECATEPEC DE MORELOS, ESTADO DE MEXICO', '5515-62-16-70',
  'PBA890313MKA', 19.5685263236699, -99.0226577187854, true, true
FROM clientes c WHERE c.rfc = 'PBA890313MKA' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '398', 'San Lorenzo', 'RAMON TORRE, N°1, COL. SAN LORENZO TEZONCO, CP 09900, IZTAPALAPA, CIUDAD DE MEXICO', '55-58-45-10-58',
  'PGA080115495', 19.3099311825528, -99.0699633580061, true, true
FROM clientes c WHERE c.rfc = 'PGA080115495' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '400', 'El Rosal', 'EL ROSAL, MZ 38, COL. LOS ANGELES, CP 09700, IZTAPALAPA, CIUDAD DE MEXICO', '5556-14-24-59',
  'POG980514JL6', 19.3452759, -99.0691211, true, true
FROM clientes c WHERE c.rfc = 'POG980514JL6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '401', 'Tlaxqueña', 'AV. 1° DE MAYO PORCION II, LOTE A, COL. RESID FUENTES, CP 57170, ECATEPEC DE MORELOS, ESTADO DE MEXICO', '55-58-39-65-93',
  'PBA890313MKA', 19.5674272, -99.0351981, true, true
FROM clientes c WHERE c.rfc = 'PBA890313MKA' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '402', 'Islas', 'AV. JARDINES DE MORELOS, N° 472, COL JARDINES DE MORELOS SEC. ISLAS, CP 55070, ECATEPEC DE MORELOS, ESTADO DE MEXICO', '55-58-39-73-51',
  'PLG040611RM8', 19.6019715, -98.99144, true, true
FROM clientes c WHERE c.rfc = 'PLG040611RM8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '403', 'Tlahuac', 'AV. TLAHUAC TULYEHUALCO, N°6, COL. SAN MIGUEL, CP 16739, TLAHUAC, CIUDAD DE MEXICO', '55-58-42-04-97',
  'PTU990309LE7', 19.2683950981649, -99.0055299407218, true, true
FROM clientes c WHERE c.rfc = 'PTU990309LE7' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '404', 'Corpus', 'AV. TAMAULIPAS N°8, MZ 5, COL. CORPUS CHRISTI, CP 01759, ALVARO OBREGON, CIUDAD DE MEXICO', '5556-43-56-11',
  'PAG060125TW6', 19.3630798081535, -99.2485096560796, true, true
FROM clientes c WHERE c.rfc = 'PAG060125TW6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '406', 'Cabarral', 'AV. PONIENTE 112, N°405, COL PANAMERICANA, CP 55070, GUSTAVO A. MADERO, CIUDAD DE MEXICO', '55-55-87-21-83',
  'PLG040611RM8', 19.4779337584562, -99.1436069974244, true, true
FROM clientes c WHERE c.rfc = 'PLG040611RM8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '407', 'El Rosal San Jeronimo', 'AV. SAN JERONIMO, N° 20 A, COL.PUEBLO NUEVO ALTO, CP 10710, MAGDALENA CONTRERAS, CIUDAD DE MEXICO', '55-56-30-10-51',
  'PAM060620381', 19.3062458963262, -99.2483291, true, true
FROM clientes c WHERE c.rfc = 'PAM060620381' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '408', 'Neza', 'AV. MEXICO, N° 125, COL. RAUL ROMERO, CP 09510, NEZAHUALCOYOTL, ESTADO DE MEXICO', '55-57-97-31-66',
  'PSM890313MM7', 19.3991046831706, -99.0413689213599, true, true
FROM clientes c WHERE c.rfc = 'PSM890313MM7' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '409', 'El Charco', 'CALLE PUERTO MARFIL ESQUINA MARIA GREEVER, N° 329, COL. SAN MIGUEL CUAUTEPEC EL ALTO, CP 07290, GUSTAVO A. MADERO, CIUDAD DE MEXICO', '55-53-03-98-34',
  'PAR890223JE6', 19.5592462, -99.1396941, true, true
FROM clientes c WHERE c.rfc = 'PAR890223JE6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '410', 'Progresista', 'AV. JUAREZ N° 61, COL PROGRESISTA, CP 09700, IZTAPALAPA, CIUDAD DE MEXICO', '55-56-14-42-04',
  'POG980514JL6', 19.3357691, -99.0609904, true, true
FROM clientes c WHERE c.rfc = 'POG980514JL6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '411', 'La Raza', 'BRAHMS, N° 63 B, COL.GUADALUPE VICTORIA, CP 55070, GUSTAVO A MADERO, CIUDAD DE MEXICO', '5553-56-85-37',
  'PLG040611RM8', 19.4721787, -99.1717113, true, true
FROM clientes c WHERE c.rfc = 'PLG040611RM8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '412', 'Narvarte', 'DIAGONAL DE SAN ANTONIO, N° 1115 LOCAL, COL NARVARTE, CP 57170, BENITO JUAREZ, CIUDAD DE MEXICO', '55-56-39-90-25',
  'PBA890313MKA', 19.3938268, -99.1592586, true, true
FROM clientes c WHERE c.rfc = 'PBA890313MKA' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '413', 'Xochitlan', 'CALLE XIULTECO, MZ 11, COL 4° SECC EL ARENAL ESQUINA XOCHITLAN SUR, CP 07969, VENUSTIANO CARRANZA, CIUDAD DE MEXICO', '5515-45-04-24',
  'PPE960301KRA', 19.4293093, -99.0578499, true, true
FROM clientes c WHERE c.rfc = 'PPE960301KRA' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '414', 'Arenal', 'CALLE MOCTEZUMA, N° 8, COL. EL  ARENAL 1° SECC, CP 07969, VENUSTIANO CARRANZA, CIUDAD DE MEXICO', '55-55-58-22-46',
  'PPE960301KRA', 19.4239300544952, -99.0655039607882, true, true
FROM clientes c WHERE c.rfc = 'PPE960301KRA' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '415', 'Peñon 2', 'AV. 510, N°11, COL. SAN JUAN DE ARAGON SECC 1, CP 07969, GUSTAVO A. MADERO, CIUDAD DE MEXICO', '55-26-03-20-13',
  'PPE960301KRA', 19.4666853754035, -99.0925890077444, true, true
FROM clientes c WHERE c.rfc = 'PPE960301KRA' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '416', 'Calpulalpan', 'CALLE MORELOS, N°27, COL CALPULALPAN, CP 56100, TLAXCALA, TLAXCALA', '7499-183-165',
  'PTE940606SM6', 19.5867166245032, -98.5678159341248, true, true
FROM clientes c WHERE c.rfc = 'PTE940606SM6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '418', 'El Moral', 'AV. F.F.C.C. ATLIXCO ESQ. AVENIDA HIDALGO, N°49, COL. GUADALUPE DEL MORAL, CP 09700, IZTAPALAPA, CIUDAD DE MEXICO', '5556-94-22-57',
  'POG980514JL6', 19.3436317, -99.0524509, true, true
FROM clientes c WHERE c.rfc = 'POG980514JL6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '419', 'La Loma', 'ACULCO, N° 41, COL LA LOMA TLANEMEX, CP 54020, TLANEPANTLA, ESTADO DE MEXICO', '5553-90-26-03',
  'LEC810605I45', 19.5294206, -99.205182, true, true
FROM clientes c WHERE c.rfc = 'LEC810605I45' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '420', 'Ocotepec', 'AV. GUERRERO, N°2730, COL SAN BERNABE OCOTEPEC, CP 10300, LA MAGDALENA CONTRERAS, CIUDAD DE MEXICO', '5517-18-44-56',
  'PDA111213LB3', 19.3135798548785, -99.2587691382245, true, true
FROM clientes c WHERE c.rfc = 'PDA111213LB3' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '421', 'Poligono II', 'LOBOS, MZA 9, COL POLIGONOS 3, CP 55240, ECATEPEC DE MORELOS, ESTADO DE MEXICO', '5557-98-13-10',
  'PEC870923IS3', 19.5075439, -99.0363795, true, true
FROM clientes c WHERE c.rfc = 'PEC870923IS3' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '422', 'Rosticeria Iztacalco', 'AV. SANTIAGO, N° 163, COL BARRIO DE SAN PEDRO, CP 07969, IZTACALCO, CIUDAD DE MEXICO', '5555-79-23-09',
  'PPE960301KRA', 19.390992, -99.1271234, true, true
FROM clientes c WHERE c.rfc = 'PPE960301KRA' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '423', 'Rosticeria Fuentes', 'JAZMINES, N°19, COL JARDINES DE ARAGON, CP 55240, ECATEPEC DE MORELOS, ESTADO DE MEXICO', '5557-74-25-93',
  'PEC870923IS3', 19.520803, -99.0291254, true, true
FROM clientes c WHERE c.rfc = 'PEC870923IS3' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '424', 'Rosticeria Puebla', 'PRIVADA 29 A NORTE, N° 822, COL SAN ALEJANDRO, CP 72000, PUEBLA, PUEBLA', '222-226-5908',
  'PPS0305067I3', 19.0588156, -98.21743889999999, true, true
FROM clientes c WHERE c.rfc = 'PPS0305067I3' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '425', 'Rosticeria Bombas', 'AV. DE LAS BOMBAS, MZ C, COL AMPLIACION PLAYA SAN JUAN, CP 55070, ECATEPEC DE MORELOS, ESTADO DE MEXICO', '5559-58-84-56',
  'PAM110330GU4', 19.6037741, -99.0190168, true, true
FROM clientes c WHERE c.rfc = 'PAM110330GU4' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '427', 'Xalostoc 2', 'EMILIANO ZAPATA, LT 2 Y 4, COL. SANTA MARIA XALOSTOC, CP 55340, ECATEPEC DE MORELOS, ESTADO DE MEXICO', '5556-99-92-43',
  'PAR900202RG8', 19.5245452, -99.0647111, true, true
FROM clientes c WHERE c.rfc = 'PAR900202RG8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '428', 'Barrientos', 'AV. TLALNEPANTLA, N° 8, COL EL OLIVO, CP 54110, TLALNEPANTLA DE BAZ, ESTADO DE MEXICO', '5553-10-36-38',
  'PBA880601EG1', 19.5710052830601, -99.1946285449925, true, true
FROM clientes c WHERE c.rfc = 'PBA880601EG1' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '429', 'Tecamachalco', 'CALLE FUENTE DE LOS TRITONES N° 7-A, LOTE 1, COL.LOMAS DE TECAMACHALCO, CP 10710, NAUCALPAN, ESTADO DE MEXICO', '5552-93-18-24',
  'PAM060620381', 19.4292823577156, -99.2281365391625, true, true
FROM clientes c WHERE c.rfc = 'PAM060620381' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '430', 'Olimpica II', 'AV. CENTRAL, MZ 18, COL OLIMPICA, CP 55130, ECATEPEC DE MORELOS, ESTADO DE MEXICO', '5557-91-71-57',
  'PSC961003K44', 19.4943773, -99.03522579999999, true, true
FROM clientes c WHERE c.rfc = 'PSC961003K44' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '431', 'Tenayo', 'AV. ALFREDO DEL MAZO, N° 106, COL. EL PUERTO, CP 54100, TLALNEPANTLA, ESTADO DE MEXICO', '5526-27-25-32',
  'PCA0406117X8', 19.5454699, -99.16130969999999, true, true
FROM clientes c WHERE c.rfc = 'PCA0406117X8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '432', 'Puebla Columpio', 'AV. 16 DE SEPTIEMBRE, N° 6348, COL. VISTA HERMOSA, CP 72320, PUEBLA, PUEBLA', '2222-199-750',
  'PPS0305067I3', 19.0058417, -98.21988809999999, true, true
FROM clientes c WHERE c.rfc = 'PPS0305067I3' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '433', 'Amecameca', 'MARIANO ABASOLO, N° 10, COL.CENTRO, CP 56530, AMECAMECA, ESTADO DE MEXICO', '59797-89368',
  'PIZ960513IDA', 19.128850801609, -98.7672113204399, true, true
FROM clientes c WHERE c.rfc = 'PIZ960513IDA' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '434', 'Zumpango', 'CALLE CUAUHTEMOC, N° 3, COL CENTRO, CP 55600, ZUMPANGO, ESTADO DE MEXICO', '59-19-173-121',
  'PZU081020U93', 19.778387346267, -99.112160648668, true, true
FROM clientes c WHERE c.rfc = 'PZU081020U93' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '435', 'La Presa', 'EXCURSIONISTA TONATHIU, MZA 361, COL.LAZARO CARDENAS 2° SECCION, CP 03800, TLANEPANTLA  D BAZ, ESTADO DE MEXICO', '5553-84-64-56',
  'LAII86022362A', 19.5424318, -99.1925133, true, true
FROM clientes c WHERE c.rfc = 'LAII86022362A' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '436', 'Lomas Verdes', 'ALAMOS, N°3, COL. SANTIAGO OCCIPACO, CP 53250, NAUCALPAN DE JUAREZ, ESTADO DE MEXICO', '5567-18-99-00',
  'PLA140404AG9', 19.4986634272699, -99.2530182644161, true, true
FROM clientes c WHERE c.rfc = 'PLA140404AG9' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '437', 'San Marcos', 'DE GLORIA, MZ 18, COL. JUAN GONZALEZ ROMERO, CP 55340, GUSTAVO A. MADERO, CIUDAD DE MEXICO', '55-57-69-17-38',
  'PAR900202RG8', 19.5056089, -99.08959589999999, true, true
FROM clientes c WHERE c.rfc = 'PAR900202RG8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '438', 'Coruña', 'CORUÑA, N° 255, COL. VIADUCTO PIEDAD, CP 07969, IZTACALCO, CIUDAD DE MEXICO', '55-55-30-71-98',
  'PPE960301KRA', 19.4009205, -99.1336171, true, true
FROM clientes c WHERE c.rfc = 'PPE960301KRA' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '439', 'Borbolla', 'LEYES DE REFORMA ESQ LAGUNA ENCANTADA, S/N, COL. BENITO JUAREZ, CP 57170, TOLUCA, ESTADO DE MEXICO', '722-2121-823',
  'PBA890313MKA', 19.2679429411351, -99.6389298941603, true, true
FROM clientes c WHERE c.rfc = 'PBA890313MKA' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '440', 'Congreso', 'AV. CONGRESO DE LA  UNION, N° 3737, COL. MARTIRES DE RIO BLANCO, CP 07420, GUSTAVO A.MADERO, CIUDAD DE MEXICO', '5511-14-07-33',
  'PAT890313LV9', 19.4607197, -99.1129866, true, true
FROM clientes c WHERE c.rfc = 'PAT890313LV9' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '441', 'Granjas 2', 'VALLE DE GUADIANA, MZ P, COL.GRANJAS INDEPENDENCIA, CP 55240, ECATEPEC DE MORELOS, ESTADO DE MEXICO', NULL,
  'PEC870923IS3', 19.4979334, -99.0323463, true, true
FROM clientes c WHERE c.rfc = 'PEC870923IS3' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '442', 'Laguna De Terminos', 'LAGUNA DE TERMINOS, N°439, COL. ANAHUAC II, CP 11320, MIGUEL HIDALGO, CIUDAD DE MEXICO', '5567-24-70-30',
  'PLE8405299S1', 19.4425256819757, -99.1748784742667, true, true
FROM clientes c WHERE c.rfc = 'PLE8405299S1' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '443', 'Bosque Molino', 'BOSQUES DE EUROPA, N°20, COL. BOSQUES DE ARAGON, CP 57170, NEZAHUALCOYOTL, ESTADO DE MEXICO', '5538-73-03-47',
  'PBA890313MKA', 19.467847, -99.0493649, true, true
FROM clientes c WHERE c.rfc = 'PBA890313MKA' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '444', 'Siglo XXI', 'HACIENDA SAN DIEGO DE LOS PADRES, N° 1, COL.SANTA ELENA, CP 57170, SAN MATEO ATENCO, ESTADO DE MEXICO', '72828-50297',
  'PBA890313MKA', 19.2852656, -99.54309819999999, true, true
FROM clientes c WHERE c.rfc = 'PBA890313MKA' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '445', 'Pino Suarez', 'AV. JOSE MARIA PINO SUAREZ, N°2012, COL.  SANTA MARIA DE LAS ROSAS, CP 50140, TOLUCA, ESTADO DE MEXICO', '722-270-1006',
  'PBA890313MKA', 19.2670146, -99.6378789, true, true
FROM clientes c WHERE c.rfc = 'PBA890313MKA' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '446', 'Division del Norte', 'AV. DIVISION DEL NORTE, N° 2999, COL. EL ROSEDAL, CP 14030, COYOACAN, CIUDAD DE MÉXICO', '5567-25-1919',
  'PCA930611T35', 19.3396841, -99.1482826, true, true
FROM clientes c WHERE c.rfc = 'PCA930611T35' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '447', 'Lomas de Occipaco', 'AV. CIRCUNVALACION PONIENTE, N°111, COL. LOMAS DE OCCIPACO, CP 53250, NAUCALPAN, ESTADO DE MEXICO', '5567-25-50-79',
  'PLA140404AG9', 19.485126, -99.26233239999999, true, true
FROM clientes c WHERE c.rfc = 'PLA140404AG9' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '448', 'Kenedy', 'CECILIO ROBELO, RETORNO  N° 5, EDIFICIO 2, COL. JARDIN BALBUENA, CP 15900, VENUSTIANO CARRANZA, CIUDAD DE MEXICO', '5555-52-76-31',
  'PMB150708NQ6', 19.4248291, -99.1087076, true, true
FROM clientes c WHERE c.rfc = 'PMB150708NQ6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '449', 'Condesa', 'AV. TAMAULIPAS, N° 112, COL.HIPODROMO, CP 07100, CUAUHTEMOC, CIUDAD DE MEXICO', '5570-95-96-21',
  'PBA021119GR0', 19.4102222, -99.1748184, true, true
FROM clientes c WHERE c.rfc = 'PBA021119GR0' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '450', 'Jorobas/Sta. Teresa', 'PASEO DE LA MORA, MZA 123, COL SANTA TERESA III Y III BIS, CP 55600, HUEHUETOCA, ESTADO DE MEXICO', '5939-15-9037',
  'PZU081020U93', 19.8424410800098, -99.2403482420462, true, true
FROM clientes c WHERE c.rfc = 'PZU081020U93' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '451', 'Marti', 'CALLE JOSE MARTI, N° 154, COL ESCANDON, CP 11320, MIGUEL HIDALGO, CIUDAD DE MEXICO', '5568-19-40-69',
  'PLE8405299S1', 19.4024616, -99.1787353, true, true
FROM clientes c WHERE c.rfc = 'PLE8405299S1' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '453', 'Tenayuca', 'CUAUHTEMOC, N° 4, COL SAN BARTOLO TENAYUCA, CP 54140, TLANEPANTLA, ESTADO DE MEXICO', NULL,
  'PPU870928FP6', 19.530403, -99.1695347, true, true
FROM clientes c WHERE c.rfc = 'PPU870928FP6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '454', 'El Carmen', 'CALLE BENITO JUAREZ, N° 26, COL. CUAUTEPEC DE MADERO, CP 07200, GUSTAVO A. MADERO, CIUDAD DE MEXICO', '5568-19-50-34',
  'PNE970306EV3', 19.5436778, -99.1375796, true, true
FROM clientes c WHERE c.rfc = 'PNE970306EV3' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '455', 'Atizapan', 'SANTIAGO TIANGUISTENGO, N° 1 A, COL. CIUDAD ADOLFO LOPEZ MATEOS, CP 52900, ATIZAPAN DE ZARAGOZA, ESTADO DE MEXICO', '5586-28-11-23',
  'BAGL650413S25', 19.5279421, -99.2360248, true, true
FROM clientes c WHERE c.rfc = 'BAGL650413S25' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '456', 'Apatlaco', 'APATLACO, N° 175, COL APATLACO, CP 15900, IZTAPALAPA, CIUDAD DE MEXICO', '5536-26-87-36',
  'PMB150708NQ6', 19.3818697, -99.116436, true, true
FROM clientes c WHERE c.rfc = 'PMB150708NQ6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '457', 'OBSERVATORIO', 'AV. OBSERVATORIO, N° 308, COL. LAS AMERICAS, CP 53250, MIGUEL HIDALGO, CIUDAD DE MEXICO', '555271-7679',
  'PLA140404AG9', 19.4016242, -99.2026877, true, true
FROM clientes c WHERE c.rfc = 'PLA140404AG9' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '458', 'Plazuela Ayotla', 'LONDRES, N° 6, COL AYOTLA, CP 56400, IXTAPALUCA, ESTADO DE MEXICO', NULL,
  'PPR940606L86', 19.3150366, -98.9294453, true, true
FROM clientes c WHERE c.rfc = 'PPR940606L86' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '459', 'Desierto de los Leones', 'AV DESIERTO DE LOS LEONES, N° 383, COL. ATLAMAYA, CP 10300, ALVARO OBREGON, CIUDAD DE MEXICO', '5515-20-13-40',
  'PDA111213LB3', 19.3475055, -99.2023445, true, true
FROM clientes c WHERE c.rfc = 'PDA111213LB3' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '460', 'Golondrinas', 'PETIRROJO, N°27 A, COL. LA CAÑADA, CP 54050, ATIZAPAN DE ZARAGOZA, ESTADO DE MEXICO', '5511-06-34-17',
  'PAY920210BB8', 19.5402803, -99.238979, true, true
FROM clientes c WHERE c.rfc = 'PAY920210BB8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '461', 'San Martin', 'LOMA LUNA, MZA A 65, COL. VISTA HERMOSA, CP 07200, GUSTAVO A. MADERO, CIUDAD DE MEXICO', '5524-67-36-67',
  'PNE970306EV3', 18.7569432, -99.3525681, true, true
FROM clientes c WHERE c.rfc = 'PNE970306EV3' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '462', 'Jamaica', 'AV. CONGRESO DE LA  UNION, N° 409, COL SEVILLA, CP 07969, VENUSTIANO CARRANZA, CIUDAD DE MEXICO', '5526-12-08-53',
  'PPE960301KRA', 19.4098525, -99.12204080000001, true, true
FROM clientes c WHERE c.rfc = 'PPE960301KRA' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '463', 'Tultitlan', 'AV. PRADO DEL SUR N° 207, LT 40, COL. UNIDAD MORELOS 3 A SECC., CP 55070, TULTITLAN, ESTADO DE MEXICO', '5558-34-10-89',
  'PAM110330GU4', 19.6790754425492, -99.0872050579577, true, true
FROM clientes c WHERE c.rfc = 'PAM110330GU4' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '464', 'Riscal', 'RIO DE LOS REMEDIOS, N° 25, COL. SAN JUAN IXHUATEPEC, CP 54180, TLALNEPANTLA DE BAZ, ESTADO DE MEXICO', '5557-15-04-23',
  'PSJ151014Q62', 19.5182644489854, -99.1080943563361, true, true
FROM clientes c WHERE c.rfc = 'PSJ151014Q62' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '465', 'Barranca', 'BARRANCA DEL MUERTO, N° 497, COL. MERCED GOMEZ, CP 10300, ALVARO OBREGON, CIUDAD DE MEXICO', '5570-94-05-26',
  'PDA111213LB3', 19.36411891531, -99.1926922328548, true, true
FROM clientes c WHERE c.rfc = 'PDA111213LB3' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '466', 'León Guanajuato', 'MANUEL JOSE  CLOUTHIER, N°110, COL. PUNTA  CAMPESTRE, CP 37128, LEON, GUANAJUATO', '477-78-104-56',
  'PPB150708113', 21.1584413, -101.6914528, true, true
FROM clientes c WHERE c.rfc = 'PPB150708113' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '467', '11 Sur', 'PROLONGACION 11 SUR, N°10917, COL. SAL FRANCISCO MAYORAZGO, CP 72480, PUEBLA, PUEBLA', NULL,
  'PPS0305067I3', 18.9954422, -98.2449668, true, true
FROM clientes c WHERE c.rfc = 'PPS0305067I3' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '468', 'Lago', 'AV . LAGO DE GUADALUPE, N° 3, COL. BOSQUES DE IXTACALA, CP 03800, ATIZAPAN DE ZARAGOZA, ESTADO DE MEXICO', '5570-89-16-66',
  'VEGC890418JZ7', 19.6105283, -99.24153489999999, true, true
FROM clientes c WHERE c.rfc = 'VEGC890418JZ7' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '469', 'Sta. Ursula', 'SAN GUILLERMO, N° 843, COL. PEDREGAL DE SANTA URSULA, CP 14070, COYOACAN, CIUDAD DE MEXICO', '55-15-17-24-47',
  'PHO9306119K5', 19.311141, -99.1623297, true, true
FROM clientes c WHERE c.rfc = 'PHO9306119K5' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '470', 'El Sol Neza', 'CALLE 13, N° 91, COL EL SOL CIUDAD NEZAHUALCOYOTL, CP 57200, NEZAHUALCOYOTL, ESTADO DE MEXICO', '5557-43-15-82',
  'LOPM741111HH6', 19.4332385, -99.04337849999999, true, true
FROM clientes c WHERE c.rfc = 'LOPM741111HH6' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '471', 'Eje 10', 'AV. PEDRO ENRIQUEZ UREÑA, N° 261, COL.PEDREGAL DEL SANTO DOMINGO, CP 03800, COYOACAN, CIUDAD DE MEXICO', '5575-86-48-30',
  'PEGA8802179W0', 19.3354266, -99.1672165, true, true
FROM clientes c WHERE c.rfc = 'PEGA8802179W0' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '472', 'Valle de Aragon', 'VALLE DEL YANGTSE, N° 245, COL.DEL VALLE DE ARGON PRIMERA SECCION, CP 06170, NEZAHUALCOYOTL, ESTADO DE MEXICO', NULL,
  'GUFF5407034Y3', 19.4918384, -99.05650729999999, true, true
FROM clientes c WHERE c.rfc = 'GUFF5407034Y3' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '473', 'Xalostoc 3', 'JORGE JIMENEZ CANTU, MZ 81 LT2, COL. VILLA DE GUADALUPE XALOSTOC, CP 55340, ECATEPEC DE MORELOS, ESTADO DE MEXICO', '5557-90-58-66',
  'PAR900202RG8', 19.5114699, -99.0690342, true, true
FROM clientes c WHERE c.rfc = 'PAR900202RG8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '474', 'Sta Cruz del Monte', 'AV. SANTA CRUZ DEL MONTE, N°13, COL. SANTA CRUZ DEL MONTE, CP 54857, NAUCALPAN DE JUAREZ, ESTADO DE MEXICO', '55-68-43-21-11',
  'PPB150708113', 19.514695, -99.2465734, true, true
FROM clientes c WHERE c.rfc = 'PPB150708113' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '475', 'Cda Guadalupe', 'CALZADA DE GUADALUPE, N° 641, COL. ESTRELLA, CP 03800, GUSTAVO A MADERO, CIUDAD DE MEXICO', '5575-91-40-37',
  'AAHJ8608157Y2', 19.4790748854338, -99.1192160518107, true, true
FROM clientes c WHERE c.rfc = 'AAHJ8608157Y2' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '478', 'Queretaro', 'CONSTITUYENTES, N° 7-1, COL. SAN FRANCISQUITO, CP 76058, QUERETARO, QUERETARO', '55-22-12-43-54',
  'PCO1606035G4', 20.5874005311621, -100.384989841176, true, true
FROM clientes c WHERE c.rfc = 'PCO1606035G4' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '479', 'Xochimilco', 'FRANCISCO GOITIA, N° 75, COL. BARRIO SAN PEDRO, CP 16090, XOCHIMILCO, CIUDAD DE MEXICO', '55 5586-6211',
  'PXO1606225R7', 19.2563331, -99.10740779999999, true, true
FROM clientes c WHERE c.rfc = 'PXO1606225R7' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '480', 'Santa Clara', 'CERRADA SEGUNDA 5 DE FEBRERO, N° 32, COL. SANTA CLARA, CP 55340, ECATEPEC DE MORELOS, ESTADO DE MEXICO', '5515-41-34-10',
  'PAR900202RG8', 19.5441125, -99.06065869999999, true, true
FROM clientes c WHERE c.rfc = 'PAR900202RG8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '481', 'LG Ander', 'AV. JARDINES DE MORELOS, N° 73 A, COL. JARDINES DE MORELOS, CP 55070, ECATEPEC DE MORELOS, ESTADO DE MEXICO', '55-58-54-64-21',
  'PLG040611RM8', 19.5995223518801, -99.0104775988693, true, true
FROM clientes c WHERE c.rfc = 'PLG040611RM8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '482', 'San Vicente', 'AV. MIGUEL HIDALGO, N°12, COL.SAN VICENTE, CP 56400, CHICOLOAPAN DE JUAREZ CENTRO, ESTADO DE MEXICO', '55-59-21-75-75',
  'PPR940606L86', 19.4054174325625, -98.9430241176404, true, true
FROM clientes c WHERE c.rfc = 'PPR940606L86' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '483', 'La Espiga', 'LA RIOJA, MZ 26, COL. SAN PEDRO ZACATENCO, CP 07100, GUSTAVO A. MADERO, CIUDAD DE MEXICO', '5555-86-04-85',
  'PBA021119GR0', 19.5051774534694, -99.1250364, true, true
FROM clientes c WHERE c.rfc = 'PBA021119GR0' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '484', 'Calacoaya', 'CAMINO REAL DE CALACOAYA, N° 37, COL. CALACOAYA, CP 52990, ATIZAPAN DE ZARAGOZA, ESTADO DE MEXICO', NULL,
  'PLC900202KS1', 19.535406, -99.23857009999999, true, true
FROM clientes c WHERE c.rfc = 'PLC900202KS1' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '485', 'Mexicas', 'PASEO DE LOS MEXICAS, N° 28 MZ 01-04, COL. SANTA CRUZ ACATLAN, CP 53250, NAUCALPAN DE JUAREZ, ESTADO DE MEXICO', '55-7158-7706',
  'PLA140404AG9', 19.4842073, -99.2418063, true, true
FROM clientes c WHERE c.rfc = 'PLA140404AG9' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '486', 'Guillermo Prieto', 'GUILLERMO PRIETO, N° 73, COL. SAN RAFAEL, CP 53250, CUAUHTEMOC, ESTADO DE MEXICO', '55-55-35-18-80',
  'PLA140404AG9', 19.4065851, -99.12361450000002, true, true
FROM clientes c WHERE c.rfc = 'PLA140404AG9' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '487', 'Campiña', 'JUAN ALDAMA ESQUINA PRIVADA, S/N, COL. MIGUEL HIDALGO, CP 07550, ECATEPEC DE MORELOS, ESTADO DE MEXICO', '5515-41-07-53',
  'PAR040611633', 19.5048448, -99.0167332, true, true
FROM clientes c WHERE c.rfc = 'PAR040611633' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '488', 'Popular', 'IGNACIO ZARAGOZA ESQUINA AV. JOSE MARIA MORELOS, MANZANA 13, COL. POPULAR, CP 07550, ECATEPEC DE MORELOS, ESTADO DE MEXICO', '5515-41-28-53',
  'PAR040611633', 19.5220721, -99.0554938, true, true
FROM clientes c WHERE c.rfc = 'PAR040611633' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '489', 'Piramide', 'NORTE 3 PASEO SANTA CLARA Nº 42 ESQU. AV CENTRAL SANTA CLARA, COL. JARDINES DE SANTA CLARA, CP 07550, ECATEPEC DE MORELOS, ESTADO DE MEXICO', '5522-33-04-64',
  'PAR040611633', 19.5477382, -99.0386231, true, true
FROM clientes c WHERE c.rfc = 'PAR040611633' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '490', 'Tezozomoc', 'CAMPO ENCANTADO, Nº 9, COL. SAN ANTONIO, CP 11320, AZCAPOTZALCO, CIUDAD DE MEXICO', '5517-42-18-81',
  'PLE8405299S1', 19.4781448112409, -99.1998444323872, true, true
FROM clientes c WHERE c.rfc = 'PLE8405299S1' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '491', 'La Paz', 'CARRETERA FEDERAL MEXICO PUEBLA KM. 18.5, LOCAL B, COL. LOS REYES ACAQUILPAN, CP 56400, LA PAZ, ESTADO DE MEXICO', NULL,
  'PSM890313MM7', 19.3561084, -98.9849515, true, true
FROM clientes c WHERE c.rfc = 'PSM890313MM7' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '493', 'La Troje', 'CARR. CUAUTITLAN-TULTEPEC Nº 21 LOTE 21, FRACCION IV, COL. VILLA DE CUAUTITLAN, CP 54857, CUAUTITLAN, ESTADO DE MEXICO', '5526-34-50-52',
  'PPB150708113', 19.6734214222339, -99.162345332662, true, true
FROM clientes c WHERE c.rfc = 'PPB150708113' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '494', 'Amsterdan (Queretaro)', 'AV. PASEO AMSTERDAM, N° 145, COL.- RESIDENCIAL AMSTERDAM, CP 76058, DEL.CORREGIDORA, QUERETARO', '55 2228 4862',
  'PCO1606035G4', 20.5459558, -100.4143855, true, true
FROM clientes c WHERE c.rfc = 'PCO1606035G4' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '495', 'Pie de la Custa (Queretaro)', 'AV. PIE DE LA CUESTA, N° 2301, COL. PEÑUELAS, CP 76058, QUERETARO, QUERETARO', NULL,
  'PCO1606035G4', 20.6504958, -100.4043143, true, true
FROM clientes c WHERE c.rfc = 'PCO1606035G4' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '496', 'Los Azteca', 'BOULEVARD LOS AZTECAS, Nº 103, COL. CIUDAD AZTECA, CP 55120, ECATEPEC DE MORELOS, ESTADO DE MEXICO', NULL,
  'GAMP581005QZ3', 19.5331534, -99.01764, true, true
FROM clientes c WHERE c.rfc = 'GAMP581005QZ3' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '497', 'Tlane', 'CALLE AZTECAS, Nº 85, COL. SAN JAVIER, CP 54030, TLALNEPANTLA, ESTADO DE MEXICO', '5586-28-11-23',
  'BAGL650413S25', 19.5401923, -99.19209719999999, true, true
FROM clientes c WHERE c.rfc = 'BAGL650413S25' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '498', 'Tulpetlac', 'PROLONGACION AVENIDA MEXICO, Nº 15, COL. AMPLIACION TULPETLAC, CP 55340, ECATEPEC DE MORELOS, ESTADO DE MEXICO', NULL,
  'PAR900202RG8', 19.5700374177273, -99.0548151, true, true
FROM clientes c WHERE c.rfc = 'PAR900202RG8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '499', 'Chamizal', 'CALLE BOSQUES DE REFORMA, Nº 1310, COL..LOMAS DE CHAMIZAL, CP 10710, CUAJIMALPA DE MORELOS, CIUDAD DE MEXICO', NULL,
  'PAM060620381', 19.3902543, -99.2595252, true, true
FROM clientes c WHERE c.rfc = 'PAM060620381' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '500', 'Chikenpizza', 'BOULEVARD LOS AZTECAS, N°103, COL.CIUDAD AZTECA, CP 14430, ECATEPEC DE MORELOS, ESTADO DE MEXICO', '55 80-85 89 87',
  'PTL040611815', 19.5331534, -99.01764, true, true
FROM clientes c WHERE c.rfc = 'PTL040611815' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '502', 'La Luna', 'CALZADA DE TLALPAN, N° 4350, COL. HUIPULCO, CP 14650, TLALPAN, CIUDAD DE MEXICO', '5586-61-80-59',
  'PJU070521M66', 19.2974187, -99.15206049999999, true, true
FROM clientes c WHERE c.rfc = 'PJU070521M66' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '503', 'Pino', 'BENITO JUAREZ, N°1, COL.EL ROSARIO, CP 16090, XOCHIMILCO, CIUDAD DE MEXICO', '5586-62-22-22',
  'PXO1606225R7', 19.2645778, -99.1039366, true, true
FROM clientes c WHERE c.rfc = 'PXO1606225R7' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '504', 'Piedras Negras', 'AV. NEZAHUALCOYOTL, N° 1, COL.VENUSTIANO CARRANZA, CP 06170, CHICOLOAPAN DE JUAREZ, ESTADO DE MEXICO', NULL,
  'LAGJ930117T91', 19.4085079, -98.925311, true, true
FROM clientes c WHERE c.rfc = 'LAGJ930117T91' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '505', 'La Villa', 'AV. 5 DE FEBRERO, N°68, COL. ARAGON LA VILLA, CP 07420, GUSTAVO A MADERO, CIUDAD DE MEXICO', '5588-17-62-88',
  'PAT890313LV9', 19.48981, -99.0981973, true, true
FROM clientes c WHERE c.rfc = 'PAT890313LV9' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '506', 'Mompani (Queretaro)', 'AV. PASEOS DE SAN MIGUEL, N°6102, COL.PASEOS DE SAN MIGUEL, CP 76058, QUERETAR0, QUERETARO', NULL,
  'PCO1606035G4', 20.6550527, -100.4742802, true, true
FROM clientes c WHERE c.rfc = 'PCO1606035G4' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '507', 'Zapotitlan', 'JUAREZ, N°4, COL.SANTA ANA ZAPOTITLAN, CP 09900, TLAHUAC, CIUDAD DE MEXICO', '5552-76-65-70',
  'PGA080115495', 19.3170246, -99.06552310000001, true, true
FROM clientes c WHERE c.rfc = 'PGA080115495' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '508', 'Gema', 'AV. ESCUINAPA, N°314, COL.PEDREGAL DE SANTO DOMINGO, CP 14070, COYOACAN, CIUDAD DE MEXICO', NULL,
  'PHO9306119K5', 19.3298823, -99.16236119999999, true, true
FROM clientes c WHERE c.rfc = 'PHO9306119K5' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '509', 'Suburbano', 'AMADO NERVO, N° 57, COL. EL HUERTO, CP 54857, CUAUTITLAN, ESTADO DE MEXICO', '5558-70-73-15',
  'PPB150708113', 19.6676324, -99.17780909999999, true, true
FROM clientes c WHERE c.rfc = 'PPB150708113' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '510', 'Las Vias', 'MONTE POPOCATEPETL, MNZ.462, COL.JARDINES DE MORELOS, CP 55070, ECATEPEC DE MORELOS, ESTADO DE MEXICO', NULL,
  'PAM110330GU4', 19.6118463, -98.9866173, true, true
FROM clientes c WHERE c.rfc = 'PAM110330GU4' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '511', 'Candiles (Queretaro)', 'AV.CAMINO REAL, N°494, COL.CAMINO REAL,CORREGIDORA, CP 76058, QUERETARO, QUERETARO', '55-29-01-37-27',
  'PCO1606035G4', 20.5379233, -100.4386457, true, true
FROM clientes c WHERE c.rfc = 'PCO1606035G4' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '512', 'Azcapotzalco', 'AV. AZCAPOTZALCO, N° 568, COL.AZCAPOTZALCO, CP 06170, AZCAPOTZALCO, CIUDAD DE MEXICO', '55 91 55 22 12',
  'VIRA9411119S5', 19.4791399, -99.1869668, true, true
FROM clientes c WHERE c.rfc = 'VIRA9411119S5' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '513', 'Suburbano Tlane', 'MARIO COLIN, N° 2, COL.VALLE CEYLAN, CP 03800, TLALNEPANTLA DE BAZ, ESTADO DE MEXICO', '55-15-52-09-22',
  'REDM691020JU9', 19.5347772, -99.1847985, true, true
FROM clientes c WHERE c.rfc = 'REDM691020JU9' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '514', 'Suburbano Lecheria', 'CARRETERA TLALNEPANTLA CUAUTITLAN, S/N, COL.BUENAVISTA, CP 54857, TULTITLAN, ESTADO DE MEXICO', '55913-37525',
  'PPB150708113', 19.6198359, -99.1855714, true, true
FROM clientes c WHERE c.rfc = 'PPB150708113' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '515', 'Hornito', 'PLAZA HIDALGO, N° 2, COL. HIDALGO, CP 52948, VILLA DE NICOLAS ROMERO, ESTADO DE MEXICO', NULL,
  'PMA920228HC3', 19.6211086, -99.3142439, true, true
FROM clientes c WHERE c.rfc = 'PMA920228HC3' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '516', 'Constitucion', 'AV. PLAZA DE LA CONSTITUCION S/N, LOTE. 43-E, COL. PLAZAS DE ARAGON, CP 57170, NEZAHUALCOYOTL, ESTADO DE MEXICO', NULL,
  'PBA890313MKA', 19.4761388, -99.037365, true, true
FROM clientes c WHERE c.rfc = 'PBA890313MKA' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '517', 'Acaquilpan', 'Av. MORELOS, N° 34, COL. LOS REYES ACAQUILPAN, CP 56400, LA PAZ, ESTADO DE MEXICO', NULL,
  'PPR940606L86', 19.3555514, -98.97751629999999, true, true
FROM clientes c WHERE c.rfc = 'PPR940606L86' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '518', 'Elementos', 'CALLE. BRISA, MZA.334, COL. JARDINES DE MORELOS SECCION ELEMENTOS, CP 55070, ECATEPEC DE MORELOS, ESTADO DE MEXICO', NULL,
  'PAM110330GU4', 19.5943978, -99.0000496, true, true
FROM clientes c WHERE c.rfc = 'PAM110330GU4' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '519', 'Palmitas', 'AV. SAN MARCOS, N° 74, COL. MOLINO DE SANTO DOMINGO, CP 53250, ALVARO OBREGON, CIUDAD DE MEXICO', NULL,
  'PLA140404AG9', 19.3941212699283, -99.20834603713, true, true
FROM clientes c WHERE c.rfc = 'PLA140404AG9' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '520', 'Portos', 'PASEO DE SAN FRANCISCO, N° 78, COL. JARDINES DE ATIZAPAN, CP 54050, ATIZAPAN DE ZARAGOZA, ESTADO DE MEXICO', '55 50 84 08 22',
  'PAY920210BB8', 19.5553817, -99.2394913, true, true
FROM clientes c WHERE c.rfc = 'PAY920210BB8' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '522', 'Sur 8', 'CALLE SUR 8, N° 360, COL. AGRICOLA ORIENTAL, CP 55270, IZTACALCO, CIUDAD DE MEXICO', NULL,
  'PJU980302G92', 19.3991947, -99.06764299999999, true, true
FROM clientes c WHERE c.rfc = 'PJU980302G92' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '523', 'Circunvalación (Queretaro)', 'AVENIDA CIRCUNVALACION 15 NTTE, COL..LA CRUZ, CP 76058, QUERETARO, QUERETARO', NULL,
  'PCO1606035G4', 20.5979802, -100.3811756, true, true
FROM clientes c WHERE c.rfc = 'PCO1606035G4' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '524', 'Tultepec', 'BOULEVAD DE LA JOYA DEL SUR, MZ20, LT.45 FRACC.B, COL.JOYAS DE CUAUTITLAN, CP 54857, CUAUTITLAN, ESTADO DE MEXICO', '55-37-44-55-63',
  'PPB150708113', 19.6582629, -99.1767742, true, true
FROM clientes c WHERE c.rfc = 'PPB150708113' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '525', 'El Caminero', 'INSURGENTES SUR, N°4403, COL.RESIDENCIAL INSURGENTES SUR, CP 14070, TLALPAN, CIUDAD DE MEXICO', NULL,
  'PHO9306119K5', 19.2821894, -99.1743519, true, true
FROM clientes c WHERE c.rfc = 'PHO9306119K5' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '526', 'Acaquilpan', 'CALLE 12, N°95, COL..VALLE DE LOS REYES, CP 56400, LA PAZ, ESTADO DE MEXICO', NULL,
  'PPR940606L86', 19.3698378, -98.97232939999999, true, true
FROM clientes c WHERE c.rfc = 'PPR940606L86' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '528', 'Joyas Insurgentes', 'CONGRESO, N°127, COL.LA JOYA, CP 14030, TLALPAN, CIUDAD DE MEXICO', NULL,
  'PCA930611T35', 19.27975, -99.16794759999999, true, true
FROM clientes c WHERE c.rfc = 'PCA930611T35' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '530', 'Montevideo', 'MONTEVIDEO, N°32, TEPEYAC INSURGENTES, CP 07420, GUSTAVO A. MADERO, CIUDAD DE MEXICO', NULL,
  'PAT890313LV9', 19.4856491064178, -99.1205345968991, true, true
FROM clientes c WHERE c.rfc = 'PAT890313LV9' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '531', 'Coacalco', 'AVENIDA JARDINES DE MORELOS, N°317, JARDINES DE MORELOS SECC BOSQUES, CP 55070, ECATEPEC DE MORELOS, ESTADO DE MEXICO', NULL,
  'PAM110330GU4', 19.5934729, -98.998283, true, true
FROM clientes c WHERE c.rfc = 'PAM110330GU4' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '532', 'Peralvillo', 'AV. CALZADA DE GUADALUPE, N°145, COL.VALLE GOMEZ, CP 07420, CUAUHTEMOC, CIUDAD DE MEXICO', '55 5757-1603',
  'PAT890313LV9', 19.4596702, -99.1267216, true, true
FROM clientes c WHERE c.rfc = 'PAT890313LV9' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '533', 'Lorenzo Boturini', 'LORENZO BOTURINI, N°345, COL.TRANSITO, CP 07100, CUAUTEMOC, CIUDAD DE MEXICO', NULL,
  'PBA021119GR0', 19.4173148, -99.12796759999999, true, true
FROM clientes c WHERE c.rfc = 'PBA021119GR0' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '534', 'Revolución', 'AV REVOLUCION, N°1590, COL. SAN ÁNGEL, CP 01000, ÁLVARO OBREGON, CIUDAD DE MEXICO', NULL,
  'IZP2507282Q7', 19.3498411194938, -99.1903438467735, true, true
FROM clientes c WHERE c.rfc = 'IZP2507282Q7' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '535', 'Rosticeria Huehuetoca', 'AV. BENITO JUAREZ, N°18, COL. CABECERA MUNICIPAL, CP 54857, HUEHUETOCA, ESTADO DE MEXICO', '59 39 18 19 11',
  'PPB150708113', 19.8320962858543, -99.2046355682635, true, true
FROM clientes c WHERE c.rfc = 'PPB150708113' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '702', 'CAFETERIA', 'AV.HANK GONZALEZ, N°50, COL.LA FLORIDA, CP 55270, ECATEPEC DE MORELOS, ESTADO DE MEXICO', '5557-78-69-12',
  'PJU980302G92', 19.5436951, -99.0242225, false, true
FROM clientes c WHERE c.rfc = 'PJU980302G92' LIMIT 1;
INSERT INTO cliente_sucursales (
  cliente_id, codigo_sucursal, nombre, direccion, telefono,
  rfc, latitud, longitud, es_rosticeria, activo
) SELECT
  c.id, '702', 'Center 2', 'AV.HANK GONZALEZ, N°50, COL.LA FLORIDA, CP 55270, ECATEPEC DE MORELOS, ESTADO DE MEXICO', '5557-78-69-12',
  'PJU980302G92', 19.5436951, -99.0242225, true, true
FROM clientes c WHERE c.rfc = 'PJU980302G92' LIMIT 1;

-- ============================================================
-- PASO 5: Vincular hermanas (sucursal_hermana_id)
-- ============================================================

UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '332' LIMIT 1
) WHERE codigo_sucursal = '1';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '379' LIMIT 1
) WHERE codigo_sucursal = '2';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '322' LIMIT 1
) WHERE codigo_sucursal = '4';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '338' LIMIT 1
) WHERE codigo_sucursal = '5';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '309' LIMIT 1
) WHERE codigo_sucursal = '7';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '304' LIMIT 1
) WHERE codigo_sucursal = '8';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '306' LIMIT 1
) WHERE codigo_sucursal = '9';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '320' LIMIT 1
) WHERE codigo_sucursal = '10';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '303' LIMIT 1
) WHERE codigo_sucursal = '11';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '345' LIMIT 1
) WHERE codigo_sucursal = '12';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '342' LIMIT 1
) WHERE codigo_sucursal = '13';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '323' LIMIT 1
) WHERE codigo_sucursal = '14';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '354' LIMIT 1
) WHERE codigo_sucursal = '16';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '305' LIMIT 1
) WHERE codigo_sucursal = '19';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '428' LIMIT 1
) WHERE codigo_sucursal = '20';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '334' LIMIT 1
) WHERE codigo_sucursal = '21';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '316' LIMIT 1
) WHERE codigo_sucursal = '22';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '301' LIMIT 1
) WHERE codigo_sucursal = '23';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '302' LIMIT 1
) WHERE codigo_sucursal = '24';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '307' LIMIT 1
) WHERE codigo_sucursal = '25';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '311' LIMIT 1
) WHERE codigo_sucursal = '26';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '310' LIMIT 1
) WHERE codigo_sucursal = '27';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '312' LIMIT 1
) WHERE codigo_sucursal = '28';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '313' LIMIT 1
) WHERE codigo_sucursal = '29';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '315' LIMIT 1
) WHERE codigo_sucursal = '30';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '329' LIMIT 1
) WHERE codigo_sucursal = '31';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '314' LIMIT 1
) WHERE codigo_sucursal = '33';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '318' LIMIT 1
) WHERE codigo_sucursal = '34';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '319' LIMIT 1
) WHERE codigo_sucursal = '35';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '327' LIMIT 1
) WHERE codigo_sucursal = '36';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '339' LIMIT 1
) WHERE codigo_sucursal = '37';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '335' LIMIT 1
) WHERE codigo_sucursal = '39';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '331' LIMIT 1
) WHERE codigo_sucursal = '40';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '373' LIMIT 1
) WHERE codigo_sucursal = '41';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '337' LIMIT 1
) WHERE codigo_sucursal = '42';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '330' LIMIT 1
) WHERE codigo_sucursal = '43';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '344' LIMIT 1
) WHERE codigo_sucursal = '44';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '346' LIMIT 1
) WHERE codigo_sucursal = '45';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '348' LIMIT 1
) WHERE codigo_sucursal = '47';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '351' LIMIT 1
) WHERE codigo_sucursal = '48';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '350' LIMIT 1
) WHERE codigo_sucursal = '49';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '356' LIMIT 1
) WHERE codigo_sucursal = '50';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '349' LIMIT 1
) WHERE codigo_sucursal = '51';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '415' LIMIT 1
) WHERE codigo_sucursal = '52';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '357' LIMIT 1
) WHERE codigo_sucursal = '53';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '361' LIMIT 1
) WHERE codigo_sucursal = '54';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '437' LIMIT 1
) WHERE codigo_sucursal = '56';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '375' LIMIT 1
) WHERE codigo_sucursal = '58';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '370' LIMIT 1
) WHERE codigo_sucursal = '59';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '369' LIMIT 1
) WHERE codigo_sucursal = '60';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '368' LIMIT 1
) WHERE codigo_sucursal = '62';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '374' LIMIT 1
) WHERE codigo_sucursal = '64';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '381' LIMIT 1
) WHERE codigo_sucursal = '65';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '376' LIMIT 1
) WHERE codigo_sucursal = '67';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '326' LIMIT 1
) WHERE codigo_sucursal = '68';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '317' LIMIT 1
) WHERE codigo_sucursal = '69';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '308' LIMIT 1
) WHERE codigo_sucursal = '70';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '324' LIMIT 1
) WHERE codigo_sucursal = '71';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '481' LIMIT 1
) WHERE codigo_sucursal = '72';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '333' LIMIT 1
) WHERE codigo_sucursal = '73';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '325' LIMIT 1
) WHERE codigo_sucursal = '75';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '358' LIMIT 1
) WHERE codigo_sucursal = '76';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '352' LIMIT 1
) WHERE codigo_sucursal = '77';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '360' LIMIT 1
) WHERE codigo_sucursal = '78';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '366' LIMIT 1
) WHERE codigo_sucursal = '80';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '385' LIMIT 1
) WHERE codigo_sucursal = '81';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '384' LIMIT 1
) WHERE codigo_sucursal = '82';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '389' LIMIT 1
) WHERE codigo_sucursal = '83';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '391' LIMIT 1
) WHERE codigo_sucursal = '84';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '393' LIMIT 1
) WHERE codigo_sucursal = '85';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '438' LIMIT 1
) WHERE codigo_sucursal = '86';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '387' LIMIT 1
) WHERE codigo_sucursal = '87';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '392' LIMIT 1
) WHERE codigo_sucursal = '88';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '386' LIMIT 1
) WHERE codigo_sucursal = '89';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '388' LIMIT 1
) WHERE codigo_sucursal = '90';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '394' LIMIT 1
) WHERE codigo_sucursal = '91';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '395' LIMIT 1
) WHERE codigo_sucursal = '94';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '397' LIMIT 1
) WHERE codigo_sucursal = '95';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '398' LIMIT 1
) WHERE codigo_sucursal = '96';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '404' LIMIT 1
) WHERE codigo_sucursal = '98';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '340' LIMIT 1
) WHERE codigo_sucursal = '99';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '371' LIMIT 1
) WHERE codigo_sucursal = '100';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '400' LIMIT 1
) WHERE codigo_sucursal = '101';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '401' LIMIT 1
) WHERE codigo_sucursal = '102';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '402' LIMIT 1
) WHERE codigo_sucursal = '103';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '406' LIMIT 1
) WHERE codigo_sucursal = '105';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '407' LIMIT 1
) WHERE codigo_sucursal = '106';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '403' LIMIT 1
) WHERE codigo_sucursal = '107';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '482' LIMIT 1
) WHERE codigo_sucursal = '108';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '434' LIMIT 1
) WHERE codigo_sucursal = '109';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '412' LIMIT 1
) WHERE codigo_sucursal = '110';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '409' LIMIT 1
) WHERE codigo_sucursal = '112';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '408' LIMIT 1
) WHERE codigo_sucursal = '113';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '410' LIMIT 1
) WHERE codigo_sucursal = '114';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '411' LIMIT 1
) WHERE codigo_sucursal = '115';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '414' LIMIT 1
) WHERE codigo_sucursal = '117';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '416' LIMIT 1
) WHERE codigo_sucursal = '122';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '418' LIMIT 1
) WHERE codigo_sucursal = '133';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '420' LIMIT 1
) WHERE codigo_sucursal = '134';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '535' LIMIT 1
) WHERE codigo_sucursal = '139';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '427' LIMIT 1
) WHERE codigo_sucursal = '140';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '429' LIMIT 1
) WHERE codigo_sucursal = '141';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '439' LIMIT 1
) WHERE codigo_sucursal = '143';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '433' LIMIT 1
) WHERE codigo_sucursal = '146';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '436' LIMIT 1
) WHERE codigo_sucursal = '148';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '442' LIMIT 1
) WHERE codigo_sucursal = '152';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '449' LIMIT 1
) WHERE codigo_sucursal = '157';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '450' LIMIT 1
) WHERE codigo_sucursal = '161';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '457' LIMIT 1
) WHERE codigo_sucursal = '164';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '459' LIMIT 1
) WHERE codigo_sucursal = '165';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '460' LIMIT 1
) WHERE codigo_sucursal = '166';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '466' LIMIT 1
) WHERE codigo_sucursal = '167';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '465' LIMIT 1
) WHERE codigo_sucursal = '170';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '464' LIMIT 1
) WHERE codigo_sucursal = '171';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '463' LIMIT 1
) WHERE codigo_sucursal = '172';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '475' LIMIT 1
) WHERE codigo_sucursal = '180';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '478' LIMIT 1
) WHERE codigo_sucursal = '181';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '479' LIMIT 1
) WHERE codigo_sucursal = '182';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '483' LIMIT 1
) WHERE codigo_sucursal = '192';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '487' LIMIT 1
) WHERE codigo_sucursal = '195';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '490' LIMIT 1
) WHERE codigo_sucursal = '199';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '493' LIMIT 1
) WHERE codigo_sucursal = '201';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '453' LIMIT 1
) WHERE codigo_sucursal = '205';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '498' LIMIT 1
) WHERE codigo_sucursal = '208';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '507' LIMIT 1
) WHERE codigo_sucursal = '215';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '509' LIMIT 1
) WHERE codigo_sucursal = '218';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '519' LIMIT 1
) WHERE codigo_sucursal = '225';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '530' LIMIT 1
) WHERE codigo_sucursal = '234';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '534' LIMIT 1
) WHERE codigo_sucursal = '239';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '23' LIMIT 1
) WHERE codigo_sucursal = '301';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '24' LIMIT 1
) WHERE codigo_sucursal = '302';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '11' LIMIT 1
) WHERE codigo_sucursal = '303';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '8' LIMIT 1
) WHERE codigo_sucursal = '304';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '19' LIMIT 1
) WHERE codigo_sucursal = '305';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '9' LIMIT 1
) WHERE codigo_sucursal = '306';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '25' LIMIT 1
) WHERE codigo_sucursal = '307';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '70' LIMIT 1
) WHERE codigo_sucursal = '308';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '7' LIMIT 1
) WHERE codigo_sucursal = '309';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '27' LIMIT 1
) WHERE codigo_sucursal = '310';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '26' LIMIT 1
) WHERE codigo_sucursal = '311';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '28' LIMIT 1
) WHERE codigo_sucursal = '312';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '29' LIMIT 1
) WHERE codigo_sucursal = '313';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '33' LIMIT 1
) WHERE codigo_sucursal = '314';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '30' LIMIT 1
) WHERE codigo_sucursal = '315';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '22' LIMIT 1
) WHERE codigo_sucursal = '316';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '69' LIMIT 1
) WHERE codigo_sucursal = '317';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '34' LIMIT 1
) WHERE codigo_sucursal = '318';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '35' LIMIT 1
) WHERE codigo_sucursal = '319';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '10' LIMIT 1
) WHERE codigo_sucursal = '320';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '4' LIMIT 1
) WHERE codigo_sucursal = '322';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '14' LIMIT 1
) WHERE codigo_sucursal = '323';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '71' LIMIT 1
) WHERE codigo_sucursal = '324';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '75' LIMIT 1
) WHERE codigo_sucursal = '325';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '68' LIMIT 1
) WHERE codigo_sucursal = '326';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '36' LIMIT 1
) WHERE codigo_sucursal = '327';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '31' LIMIT 1
) WHERE codigo_sucursal = '329';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '43' LIMIT 1
) WHERE codigo_sucursal = '330';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '40' LIMIT 1
) WHERE codigo_sucursal = '331';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '1' LIMIT 1
) WHERE codigo_sucursal = '332';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '73' LIMIT 1
) WHERE codigo_sucursal = '333';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '21' LIMIT 1
) WHERE codigo_sucursal = '334';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '39' LIMIT 1
) WHERE codigo_sucursal = '335';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '42' LIMIT 1
) WHERE codigo_sucursal = '337';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '5' LIMIT 1
) WHERE codigo_sucursal = '338';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '37' LIMIT 1
) WHERE codigo_sucursal = '339';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '99' LIMIT 1
) WHERE codigo_sucursal = '340';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '13' LIMIT 1
) WHERE codigo_sucursal = '342';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '44' LIMIT 1
) WHERE codigo_sucursal = '344';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '12' LIMIT 1
) WHERE codigo_sucursal = '345';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '45' LIMIT 1
) WHERE codigo_sucursal = '346';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '47' LIMIT 1
) WHERE codigo_sucursal = '348';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '51' LIMIT 1
) WHERE codigo_sucursal = '349';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '49' LIMIT 1
) WHERE codigo_sucursal = '350';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '48' LIMIT 1
) WHERE codigo_sucursal = '351';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '77' LIMIT 1
) WHERE codigo_sucursal = '352';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '16' LIMIT 1
) WHERE codigo_sucursal = '354';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '50' LIMIT 1
) WHERE codigo_sucursal = '356';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '53' LIMIT 1
) WHERE codigo_sucursal = '357';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '76' LIMIT 1
) WHERE codigo_sucursal = '358';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '78' LIMIT 1
) WHERE codigo_sucursal = '360';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '54' LIMIT 1
) WHERE codigo_sucursal = '361';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '80' LIMIT 1
) WHERE codigo_sucursal = '366';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '62' LIMIT 1
) WHERE codigo_sucursal = '368';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '60' LIMIT 1
) WHERE codigo_sucursal = '369';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '59' LIMIT 1
) WHERE codigo_sucursal = '370';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '100' LIMIT 1
) WHERE codigo_sucursal = '371';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '41' LIMIT 1
) WHERE codigo_sucursal = '373';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '64' LIMIT 1
) WHERE codigo_sucursal = '374';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '58' LIMIT 1
) WHERE codigo_sucursal = '375';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '67' LIMIT 1
) WHERE codigo_sucursal = '376';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '2' LIMIT 1
) WHERE codigo_sucursal = '379';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '65' LIMIT 1
) WHERE codigo_sucursal = '381';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '82' LIMIT 1
) WHERE codigo_sucursal = '384';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '81' LIMIT 1
) WHERE codigo_sucursal = '385';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '89' LIMIT 1
) WHERE codigo_sucursal = '386';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '87' LIMIT 1
) WHERE codigo_sucursal = '387';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '90' LIMIT 1
) WHERE codigo_sucursal = '388';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '83' LIMIT 1
) WHERE codigo_sucursal = '389';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '84' LIMIT 1
) WHERE codigo_sucursal = '391';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '88' LIMIT 1
) WHERE codigo_sucursal = '392';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '85' LIMIT 1
) WHERE codigo_sucursal = '393';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '91' LIMIT 1
) WHERE codigo_sucursal = '394';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '94' LIMIT 1
) WHERE codigo_sucursal = '395';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '95' LIMIT 1
) WHERE codigo_sucursal = '397';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '96' LIMIT 1
) WHERE codigo_sucursal = '398';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '101' LIMIT 1
) WHERE codigo_sucursal = '400';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '102' LIMIT 1
) WHERE codigo_sucursal = '401';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '103' LIMIT 1
) WHERE codigo_sucursal = '402';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '107' LIMIT 1
) WHERE codigo_sucursal = '403';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '98' LIMIT 1
) WHERE codigo_sucursal = '404';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '105' LIMIT 1
) WHERE codigo_sucursal = '406';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '106' LIMIT 1
) WHERE codigo_sucursal = '407';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '113' LIMIT 1
) WHERE codigo_sucursal = '408';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '112' LIMIT 1
) WHERE codigo_sucursal = '409';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '114' LIMIT 1
) WHERE codigo_sucursal = '410';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '115' LIMIT 1
) WHERE codigo_sucursal = '411';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '110' LIMIT 1
) WHERE codigo_sucursal = '412';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '117' LIMIT 1
) WHERE codigo_sucursal = '414';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '52' LIMIT 1
) WHERE codigo_sucursal = '415';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '122' LIMIT 1
) WHERE codigo_sucursal = '416';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '133' LIMIT 1
) WHERE codigo_sucursal = '418';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '134' LIMIT 1
) WHERE codigo_sucursal = '420';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '140' LIMIT 1
) WHERE codigo_sucursal = '427';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '20' LIMIT 1
) WHERE codigo_sucursal = '428';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '141' LIMIT 1
) WHERE codigo_sucursal = '429';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '146' LIMIT 1
) WHERE codigo_sucursal = '433';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '109' LIMIT 1
) WHERE codigo_sucursal = '434';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '148' LIMIT 1
) WHERE codigo_sucursal = '436';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '56' LIMIT 1
) WHERE codigo_sucursal = '437';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '86' LIMIT 1
) WHERE codigo_sucursal = '438';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '143' LIMIT 1
) WHERE codigo_sucursal = '439';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '152' LIMIT 1
) WHERE codigo_sucursal = '442';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '157' LIMIT 1
) WHERE codigo_sucursal = '449';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '161' LIMIT 1
) WHERE codigo_sucursal = '450';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '205' LIMIT 1
) WHERE codigo_sucursal = '453';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '164' LIMIT 1
) WHERE codigo_sucursal = '457';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '165' LIMIT 1
) WHERE codigo_sucursal = '459';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '166' LIMIT 1
) WHERE codigo_sucursal = '460';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '172' LIMIT 1
) WHERE codigo_sucursal = '463';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '171' LIMIT 1
) WHERE codigo_sucursal = '464';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '170' LIMIT 1
) WHERE codigo_sucursal = '465';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '167' LIMIT 1
) WHERE codigo_sucursal = '466';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '180' LIMIT 1
) WHERE codigo_sucursal = '475';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '181' LIMIT 1
) WHERE codigo_sucursal = '478';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '182' LIMIT 1
) WHERE codigo_sucursal = '479';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '72' LIMIT 1
) WHERE codigo_sucursal = '481';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '108' LIMIT 1
) WHERE codigo_sucursal = '482';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '192' LIMIT 1
) WHERE codigo_sucursal = '483';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '195' LIMIT 1
) WHERE codigo_sucursal = '487';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '199' LIMIT 1
) WHERE codigo_sucursal = '490';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '201' LIMIT 1
) WHERE codigo_sucursal = '493';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '208' LIMIT 1
) WHERE codigo_sucursal = '498';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '215' LIMIT 1
) WHERE codigo_sucursal = '507';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '218' LIMIT 1
) WHERE codigo_sucursal = '509';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '225' LIMIT 1
) WHERE codigo_sucursal = '519';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '234' LIMIT 1
) WHERE codigo_sucursal = '530';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '239' LIMIT 1
) WHERE codigo_sucursal = '534';
UPDATE cliente_sucursales SET sucursal_hermana_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '139' LIMIT 1
) WHERE codigo_sucursal = '535';

-- ============================================================
-- PASO 6: Vincular entregas cruzadas (sucursal_entrega_id)
-- ============================================================

UPDATE cliente_sucursales SET sucursal_entrega_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '312' LIMIT 1
) WHERE codigo_sucursal = '336';
UPDATE cliente_sucursales SET sucursal_entrega_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '303' LIMIT 1
) WHERE codigo_sucursal = '353';
UPDATE cliente_sucursales SET sucursal_entrega_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '303' LIMIT 1
) WHERE codigo_sucursal = '355';
UPDATE cliente_sucursales SET sucursal_entrega_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '312' LIMIT 1
) WHERE codigo_sucursal = '359';
UPDATE cliente_sucursales SET sucursal_entrega_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '370' LIMIT 1
) WHERE codigo_sucursal = '362';
UPDATE cliente_sucursales SET sucursal_entrega_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '307' LIMIT 1
) WHERE codigo_sucursal = '365';
UPDATE cliente_sucursales SET sucursal_entrega_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '369' LIMIT 1
) WHERE codigo_sucursal = '371';
UPDATE cliente_sucursales SET sucursal_entrega_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '370' LIMIT 1
) WHERE codigo_sucursal = '377';
UPDATE cliente_sucursales SET sucursal_entrega_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '312' LIMIT 1
) WHERE codigo_sucursal = '378';
UPDATE cliente_sucursales SET sucursal_entrega_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '356' LIMIT 1
) WHERE codigo_sucursal = '380';
UPDATE cliente_sucursales SET sucursal_entrega_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '307' LIMIT 1
) WHERE codigo_sucursal = '386';
UPDATE cliente_sucursales SET sucursal_entrega_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '369' LIMIT 1
) WHERE codigo_sucursal = '400';
UPDATE cliente_sucursales SET sucursal_entrega_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '304' LIMIT 1
) WHERE codigo_sucursal = '408';
UPDATE cliente_sucursales SET sucursal_entrega_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '369' LIMIT 1
) WHERE codigo_sucursal = '410';
UPDATE cliente_sucursales SET sucursal_entrega_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '369' LIMIT 1
) WHERE codigo_sucursal = '418';
UPDATE cliente_sucursales SET sucursal_entrega_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '303' LIMIT 1
) WHERE codigo_sucursal = '425';
UPDATE cliente_sucursales SET sucursal_entrega_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '356' LIMIT 1
) WHERE codigo_sucursal = '430';
UPDATE cliente_sucursales SET sucursal_entrega_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '478' LIMIT 1
) WHERE codigo_sucursal = '494';
UPDATE cliente_sucursales SET sucursal_entrega_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '478' LIMIT 1
) WHERE codigo_sucursal = '495';
UPDATE cliente_sucursales SET sucursal_entrega_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '478' LIMIT 1
) WHERE codigo_sucursal = '506';
UPDATE cliente_sucursales SET sucursal_entrega_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '478' LIMIT 1
) WHERE codigo_sucursal = '511';
UPDATE cliente_sucursales SET sucursal_entrega_id = (
  SELECT id FROM cliente_sucursales WHERE codigo_sucursal = '478' LIMIT 1
) WHERE codigo_sucursal = '523';

END $$;

-- ============================================================
-- PASO 7: Verificación
-- ============================================================
DO $$
DECLARE
  v_grupos INT;
  v_clientes INT;
  v_sucursales INT;
  v_hermanas INT;
  v_consolidadas INT;
  v_con_coord INT;
BEGIN
  SELECT COUNT(*) INTO v_grupos FROM clientes WHERE es_grupo = true AND nombre = 'Grupo Lecaroz';
  SELECT COUNT(*) INTO v_clientes FROM clientes WHERE grupo_cliente_id = 'aaaaaaaa-1eca-4047-aaaa-aaaaaaaaaaaa';
  SELECT COUNT(*) INTO v_sucursales FROM cliente_sucursales s
    WHERE s.cliente_id IN (SELECT id FROM clientes WHERE grupo_cliente_id = 'aaaaaaaa-1eca-4047-aaaa-aaaaaaaaaaaa' OR id = 'aaaaaaaa-1eca-4047-aaaa-aaaaaaaaaaaa');
  SELECT COUNT(*) INTO v_hermanas FROM cliente_sucursales WHERE sucursal_hermana_id IS NOT NULL;
  SELECT COUNT(*) INTO v_consolidadas FROM cliente_sucursales WHERE sucursal_entrega_id IS NOT NULL;
  SELECT COUNT(*) INTO v_con_coord FROM cliente_sucursales s
    WHERE s.cliente_id IN (SELECT id FROM clientes WHERE grupo_cliente_id = 'aaaaaaaa-1eca-4047-aaaa-aaaaaaaaaaaa')
    AND latitud IS NOT NULL;

  RAISE NOTICE '====================================';
  RAISE NOTICE 'SEED LECAROZ COMPLETADO';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Grupo Lecaroz creado: %', v_grupos;
  RAISE NOTICE 'Razones sociales: % (esperado: 82)', v_clientes;
  RAISE NOTICE 'Sucursales totales: % (esperado: 354)', v_sucursales;
  RAISE NOTICE 'Sucursales con coordenadas: %', v_con_coord;
  RAISE NOTICE 'Pares hermanas vinculadas: %', v_hermanas;
  RAISE NOTICE 'Consolidaciones (entrega cruzada): %', v_consolidadas;
  RAISE NOTICE '====================================';

  IF v_clientes < 80 OR v_sucursales < 350 THEN
    RAISE EXCEPTION 'Conteos menores a lo esperado, abortando';
  END IF;
END $$;

COMMIT;
