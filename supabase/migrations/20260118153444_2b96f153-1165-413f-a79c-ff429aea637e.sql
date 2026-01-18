-- Limpieza completa de datos transaccionales para pruebas desde cero
-- Mantiene: usuarios, empleados, clientes, productos, proveedores, vehículos, configuración

-- Grupo 1: Tablas de evidencias y detalles (hijas)
TRUNCATE TABLE public.carga_evidencias CASCADE;
TRUNCATE TABLE public.carga_productos CASCADE;
TRUNCATE TABLE public.ordenes_compra_entregas_evidencias CASCADE;
TRUNCATE TABLE public.ordenes_compra_confirmaciones CASCADE;
TRUNCATE TABLE public.ordenes_compra_respuestas_proveedor CASCADE;
TRUNCATE TABLE public.devoluciones_proveedor_evidencias CASCADE;

-- Grupo 2: Detalles de transacciones
TRUNCATE TABLE public.pedidos_detalles CASCADE;
TRUNCATE TABLE public.ordenes_compra_detalles CASCADE;
TRUNCATE TABLE public.ordenes_compra_entregas CASCADE;
TRUNCATE TABLE public.cotizaciones_detalles CASCADE;
TRUNCATE TABLE public.cotizaciones_envios CASCADE;
TRUNCATE TABLE public.factura_detalles CASCADE;
TRUNCATE TABLE public.comisiones_detalle CASCADE;
TRUNCATE TABLE public.pagos_cliente_detalle CASCADE;

-- Grupo 3: Tablas de operación
TRUNCATE TABLE public.devoluciones CASCADE;
TRUNCATE TABLE public.devoluciones_proveedor CASCADE;
TRUNCATE TABLE public.entregas CASCADE;
TRUNCATE TABLE public.inventario_movimientos CASCADE;

-- Grupo 4: Tablas principales de transacciones
TRUNCATE TABLE public.pedidos CASCADE;
TRUNCATE TABLE public.ordenes_compra CASCADE;
TRUNCATE TABLE public.rutas CASCADE;
TRUNCATE TABLE public.inventario_lotes CASCADE;
TRUNCATE TABLE public.cotizaciones CASCADE;
TRUNCATE TABLE public.facturas CASCADE;
TRUNCATE TABLE public.solicitudes_venta_mostrador CASCADE;
TRUNCATE TABLE public.pagos_cliente CASCADE;
TRUNCATE TABLE public.comisiones_vendedor CASCADE;
TRUNCATE TABLE public.solicitudes_descuento CASCADE;

-- Grupo 5: Notificaciones y correos (limpiar para empezar fresh)
TRUNCATE TABLE public.notificaciones CASCADE;
TRUNCATE TABLE public.correos_enviados CASCADE;

-- Grupo 6: Chat y mensajes (opcional, para limpiar conversaciones)
TRUNCATE TABLE public.mensajes CASCADE;

-- Grupo 7: Ubicaciones de chofer (limpiar tracking)
TRUNCATE TABLE public.chofer_ubicaciones CASCADE;