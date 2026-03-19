

## Plan: Purge Operational Data (Keep Clients, Products, Providers, Fumigations)

This is a **data deletion** task — no code or schema changes needed. We'll run DELETE statements in the correct foreign-key order using the data operations tool.

---

### What gets DELETED (all rows):

**Order/Delivery chain:**
- `carga_evidencias`, `carga_productos`
- `cobros_pedido`, `pagos_cliente_detalle`, `pagos_cliente`
- `devoluciones`
- `entregas` → `rutas`
- `pedidos_detalles`, `pedidos_historial_cambios`, `pedidos_acumulativos_detalles`, `pedidos_acumulativos` → `pedidos`
- `solicitudes_descuento`, `solicitudes_venta_mostrador`
- `comisiones_detalle`, `comisiones_vendedor`

**Purchase Orders chain:**
- `ordenes_compra_entregas_evidencias` → `ordenes_compra_entregas`
- `ordenes_compra_detalles` → `ordenes_compra`
- `recepciones_evidencias`, `recepciones_participantes`
- `proveedor_factura_detalles`, `proveedor_factura_entregas` → `proveedor_facturas`
- `devoluciones_proveedor_evidencias` → `devoluciones_proveedor`
- `proveedor_creditos_pendientes`

**Inventory:**
- `inventario_lotes`, `inventario_movimientos`

**History/Notifications:**
- `productos_historial_costos`, `productos_historial_precios`, `productos_historial_estado`, `productos_revision_precio`
- `notificaciones`, `correos_enviados`

**After deletion:** Reset `stock_actual` to 0 and `costo_promedio_ponderado` to 0 on all products (since inventory is gone).

---

### What is KEPT (untouched):
- `clientes` (and all client sub-tables: contactos, correos, cortesias, creditos, sucursales, etc.)
- `productos` (structure intact, stock reset to 0)
- `proveedores`, `proveedor_contactos`, `proveedor_correos`, `proveedor_productos`
- Fumigation data (in productos table fields)
- `empleados`, `profiles`, `user_roles`
- `vehiculos` and related
- `bodegas`, `zonas`, `configuracion_empresa`
- `conversaciones`, `mensajes`
- `facturas`, `factura_detalles`
- `cotizaciones`, `cotizaciones_detalles`

---

### Execution
~15 DELETE statements run sequentially via the data tool, respecting FK constraints. Then one UPDATE to reset product stock.

