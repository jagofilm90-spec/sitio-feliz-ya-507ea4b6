CREATE TEMP TABLE _lecaroz_rfcs (rfc TEXT PRIMARY KEY);
INSERT INTO _lecaroz_rfcs (rfc) VALUES
  ('AAFC6808244QA'),('AAHJ8608157Y2'),('AAMI5607055A7'),('AUAA710403BUA'),('BAGL650413S25'),
  ('GAMP581005QZ3'),('GOLJ730927AP9'),('GUFF5407034Y3'),('GUI890725CF9'),('IZP2507282Q7'),
  ('LAGJ930117T91'),('LAII86022362A'),('LAN870616IG1'),('LEC810605I45'),('LOPM741111HH6'),
  ('PAG060125TW6'),('PAM060620381'),('PAM110330GU4'),('PAO030506J18'),('PAP8601105X9'),
  ('PAR040611633'),('PAR890223JE6'),('PAR900202RG8'),('PAT890313LV9'),('PAY920210BB8'),
  ('PBA021119GR0'),('PBA041119DY1'),('PBA830420JT4'),('PBA880601EG1'),('PBA890313MKA'),
  ('PBE8912077R9'),('PCA0406117X8'),('PCA930611T35'),('PCO080617DA8'),('PCO1606035G4'),
  ('PDA111213LB3'),('PEC870923IS3'),('PEGA8802179W0'),('PFR031029DC8'),('PGA080115495'),
  ('PGR-970902-F46'),('PHO9306119K5'),('PIZ960513IDA'),('PJU070521M66'),('PJU980302G92'),
  ('PLA140404AG9'),('PLA740702USA'),('PLC900202KS1'),('PLE8405299S1'),('PLG040611RM8'),
  ('PLG920210CK1'),('PMA920228HC3'),('PMB150708NQ6'),('PNE970306EV3'),('POG980514JL6'),
  ('POT891130AK7'),('PPB150708113'),('PPE960301KRA'),('PPR9202109I4'),('PPR940606L86'),
  ('PPS0305067I3'),('PPU870928FP6'),('PSA7202196F5'),('PSC961003K44'),('PSD750716690'),
  ('PSF951121SR9'),('PSG9706301L2'),('PSJ151014Q62'),('PSM890313MM7'),('PSM901023360'),
  ('PST920921MU0'),('PTE940606SM6'),('PTL040611815'),('PTU990309LE7'),('PVC050405MD0'),
  ('PXO1606225R7'),('PYA920226MC7'),('PZU081020U93'),('REDM680115125'),('REDM691020JU9'),
  ('VEGC890418JZ7'),('VIRA9411119S5');

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

DELETE FROM pagos_cliente_detalle WHERE pago_id IN (
  SELECT id FROM pagos_cliente WHERE cliente_id IN (SELECT id FROM clientes WHERE rfc IN (SELECT rfc FROM _lecaroz_rfcs))
);
DELETE FROM pagos_cliente WHERE cliente_id IN (SELECT id FROM clientes WHERE rfc IN (SELECT rfc FROM _lecaroz_rfcs));

DELETE FROM pedidos WHERE cliente_id IN (SELECT id FROM clientes WHERE rfc IN (SELECT rfc FROM _lecaroz_rfcs));

DELETE FROM cliente_sucursales WHERE cliente_id IN (SELECT id FROM clientes WHERE rfc IN (SELECT rfc FROM _lecaroz_rfcs));

DELETE FROM clientes WHERE rfc IN (SELECT rfc FROM _lecaroz_rfcs);

DELETE FROM clientes WHERE es_grupo = true AND UPPER(nombre) LIKE '%LECAROZ%';

DROP TABLE _lecaroz_rfcs;