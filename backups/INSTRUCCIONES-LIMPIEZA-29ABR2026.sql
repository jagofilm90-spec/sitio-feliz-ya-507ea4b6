-- ═══════════════════════════════════════════════════════════════
-- LIMPIEZA SANDBOX — ALMASA-OS
-- Fecha: 29 abril 2026
-- Razón: Limpiar data de construcción para pruebas piloto con form v4
--
-- EJECUTAR EN: Supabase Dashboard → SQL Editor
-- EJECUTAR EN ORDEN: Fase 1 → 2 → 3 → 4
-- CADA FASE ES INDEPENDIENTE — copiar y pegar una a la vez
-- ═══════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════
-- FASE 1 — RESPALDO COMPLETO
-- Ejecutar ANTES de borrar nada. Copiar el resultado.
-- ═══════════════════════════════════════════════════════════════

-- 1A. Contar registros actuales (para referencia)
SELECT 'productos' as tabla, COUNT(*) as registros FROM productos
UNION ALL SELECT 'proveedores', COUNT(*) FROM proveedores
UNION ALL SELECT 'proveedor_contactos', COUNT(*) FROM proveedor_contactos
UNION ALL SELECT 'proveedor_productos', COUNT(*) FROM proveedor_productos
UNION ALL SELECT 'pedidos', COUNT(*) FROM pedidos
UNION ALL SELECT 'pedidos_detalles', COUNT(*) FROM pedidos_detalles
UNION ALL SELECT 'ordenes_compra', COUNT(*) FROM ordenes_compra
UNION ALL SELECT 'ordenes_compra_detalles', COUNT(*) FROM ordenes_compra_detalles
UNION ALL SELECT 'ordenes_compra_entregas', COUNT(*) FROM ordenes_compra_entregas
UNION ALL SELECT 'inventario_lotes', COUNT(*) FROM inventario_lotes
UNION ALL SELECT 'inventario_movimientos', COUNT(*) FROM inventario_movimientos
UNION ALL SELECT 'historial_precios', COUNT(*) FROM historial_precios
UNION ALL SELECT 'productos_historial_costos', COUNT(*) FROM productos_historial_costos
UNION ALL SELECT 'cobros_pedido', COUNT(*) FROM cobros_pedido
UNION ALL SELECT 'facturas', COUNT(*) FROM facturas
UNION ALL SELECT 'clientes', COUNT(*) FROM clientes
UNION ALL SELECT 'clientes_sucursales', COUNT(*) FROM clientes_sucursales
ORDER BY tabla;

-- 1B. Exportar productos (para backup manual)
-- Ir a Table Editor → productos → Export as CSV
-- Guardar como: backups/productos-274-backup.csv

-- 1C. Exportar proveedores
-- Ir a Table Editor → proveedores → Export as CSV
-- Guardar como: backups/proveedores-backup.csv

-- 1D. Exportar pedidos
-- Ir a Table Editor → pedidos → Export as CSV
-- Guardar como: backups/pedidos-backup.csv


-- ═══════════════════════════════════════════════════════════════
-- FASE 2 — DETECTAR FOREIGN KEYS
-- Ejecutar para saber qué tablas dependen de productos/proveedores/pedidos
-- ═══════════════════════════════════════════════════════════════

SELECT
  tc.table_name AS tabla_dependiente,
  kcu.column_name AS columna_fk,
  ccu.table_name AS tabla_referenciada,
  ccu.column_name AS columna_referenciada,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints rc
  ON rc.constraint_name = tc.constraint_name
  AND rc.constraint_schema = tc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND ccu.table_name IN ('productos', 'proveedores', 'pedidos', 'ordenes_compra')
ORDER BY ccu.table_name, tc.table_name;

-- REVISAR EL RESULTADO ANTES DE CONTINUAR
-- Si aparecen tablas inesperadas, PARAR y evaluar


-- ═══════════════════════════════════════════════════════════════
-- FASE 3 — BORRADO EN ORDEN (de más dependiente a menos)
-- EJECUTAR UNA LÍNEA A LA VEZ y verificar filas afectadas
-- ═══════════════════════════════════════════════════════════════

-- Paso 1: Tablas que dependen de pedidos
DELETE FROM cobros_pedido;
DELETE FROM pedidos_detalles;
DELETE FROM pedidos;

-- Paso 2: Tablas que dependen de ordenes_compra
DELETE FROM proveedor_factura_detalles;
DELETE FROM proveedor_facturas;
DELETE FROM ordenes_compra_entregas;
DELETE FROM ordenes_compra_detalles;
DELETE FROM devoluciones_proveedor_evidencias;
DELETE FROM devoluciones_proveedor;
DELETE FROM ordenes_compra_respuestas_proveedor;
DELETE FROM proveedor_creditos_pendientes;
DELETE FROM recepciones_evidencias;
DELETE FROM ordenes_compra;

-- Paso 3: Tablas que dependen de productos
DELETE FROM inventario_movimientos;
DELETE FROM inventario_lotes;
DELETE FROM historial_precios;
DELETE FROM productos_historial_costos;
DELETE FROM productos_revision_precio;
DELETE FROM proveedor_productos;

-- Paso 4: Tablas que dependen de proveedores
DELETE FROM proveedor_contactos;

-- Paso 5: Tablas principales
DELETE FROM proveedores;
DELETE FROM productos;

-- NOTA: Si algún DELETE falla por FK, la Fase 2 te dirá qué tabla
-- falta agregar. Agrégala ANTES del DELETE que falla.


-- ═══════════════════════════════════════════════════════════════
-- FASE 4 — VERIFICACIÓN POST-LIMPIEZA
-- Ejecutar para confirmar que todo quedó limpio
-- ═══════════════════════════════════════════════════════════════

SELECT 'productos' as tabla, COUNT(*) as registros,
  CASE WHEN COUNT(*) = 0 THEN 'LIMPIO' ELSE 'REVISAR' END as estado
FROM productos
UNION ALL SELECT 'proveedores', COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN 'LIMPIO' ELSE 'REVISAR' END FROM proveedores
UNION ALL SELECT 'pedidos', COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN 'LIMPIO' ELSE 'REVISAR' END FROM pedidos
UNION ALL SELECT 'pedidos_detalles', COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN 'LIMPIO' ELSE 'REVISAR' END FROM pedidos_detalles
UNION ALL SELECT 'ordenes_compra', COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN 'LIMPIO' ELSE 'REVISAR' END FROM ordenes_compra
UNION ALL SELECT 'ordenes_compra_detalles', COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN 'LIMPIO' ELSE 'REVISAR' END FROM ordenes_compra_detalles
UNION ALL SELECT 'inventario_lotes', COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN 'LIMPIO' ELSE 'REVISAR' END FROM inventario_lotes
UNION ALL SELECT 'proveedor_contactos', COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN 'LIMPIO' ELSE 'REVISAR' END FROM proveedor_contactos
UNION ALL SELECT 'proveedor_productos', COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN 'LIMPIO' ELSE 'REVISAR' END FROM proveedor_productos
-- ESTOS DEBEN QUEDAR INTACTOS:
UNION ALL SELECT 'clientes', COUNT(*),
  CASE WHEN COUNT(*) = 93 THEN 'OK (93)' ELSE 'REVISAR: ' || COUNT(*)::text END FROM clientes
UNION ALL SELECT 'clientes_sucursales', COUNT(*),
  CASE WHEN COUNT(*) >= 360 THEN 'OK (' || COUNT(*)::text || ')' ELSE 'REVISAR' END FROM clientes_sucursales
ORDER BY tabla;


-- ═══════════════════════════════════════════════════════════════
-- FIN — Sandbox limpio, listo para pruebas piloto con form v4
-- ═══════════════════════════════════════════════════════════════
