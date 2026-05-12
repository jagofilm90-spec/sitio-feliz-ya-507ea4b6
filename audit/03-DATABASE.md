# AUDITORÍA ALMASA-OS — 03 DATABASE
**Fecha**: 8 mayo 2026
**Fuente**: types.ts (7,504 líneas) + 339 migraciones SQL + búsqueda en código
**Acceso SQL directo**: NO (sin service_role JWT). Schema reconstruido desde types.ts y migraciones.

---

## A) ESQUEMA COMPLETO — TABLAS POR DOMINIO

**Total tablas en types.ts: 82** (incluyendo views y funciones que Supabase expone como tablas)
**Tablas reales (sin funciones/views): ~70**

---

### DOMINIO OPERACIONES (Pedidos, Rutas, Entregas)

#### pedidos
- Dominio: Operaciones
- RLS: ✅ (políticas por rol en M04.5A)
- Columnas clave: `id`, `folio`, `cliente_id`, `sucursal_id`, `vendedor_id`, `status` (borrador/por_autorizar/rechazado/pendiente/en_ruta/entregado/cancelado), `termino_credito`, `requiere_factura`, `facturado`, `factura_enviada_al_cliente`, `peso_total_kg`, `alertas_precio` (JSONB), `notas`, `notas_entrega`, `es_directo`, `cotizacion_aplicada_id`, `email_origen_id`, `tanda_id`, `pagado`, `saldo_pendiente`
- FK hacia: clientes, cliente_sucursales, profiles (vendedor), cotizaciones_lecaroz, email_log_lecaroz, tandas_lecaroz
- FK desde: pedidos_detalles, entregas, cobros_pedido, facturas, pedidos_historial_cambios

#### pedidos_detalles
- Columnas clave: `id`, `pedido_id`, `producto_id`, `cantidad`, `precio_unitario`, `subtotal`, `kilos_totales`, `unidades_manual`, `es_cortesia`, `precio_autorizado`, `autorizacion_status`
- FK hacia: pedidos, productos

#### pedidos_historial_cambios
- Audit log de cambios en pedidos
- RLS: ✅

#### pedidos_acumulativos / pedidos_acumulativos_detalles
- Para flujo Lecaroz de pedidos acumulativos por tanda

#### rutas
- Columnas clave: `id`, `folio`, `fecha_ruta`, `status`, `tipo_ruta`, `chofer_id`, `ayudante_id`, `vehiculo_id`, `peso_total_kg`, `kilometraje_inicial`, `kilometraje_final`, `kilometros_recorridos`, `fecha_hora_inicio`, `fecha_hora_fin`, `carga_completada`
- FK hacia: empleados (chofer, ayudante), vehiculos

#### entregas
- Columnas clave: `id`, `ruta_id`, `pedido_id`, `orden_entrega`, `status_entrega`, `firma_recibido`, `hora_entrega_real`, `motivo_rechazo`, `nombre_receptor`
- FK hacia: rutas, pedidos

#### carga_productos
- Productos cargados por entrega: `entrega_id`, `producto_id`, `lote_id`, `cantidad_cargada`, `cargado`
- FK hacia: entregas, productos, inventario_lotes

#### carga_evidencias
- Fotos de evidencia por ruta/carga

#### chofer_ubicaciones
- GPS pings: `ruta_id`, `latitud`, `longitud`, `timestamp`, `accuracy`

#### solicitudes_venta_mostrador
- POS counter sales

#### solicitudes_descuento
- Discount authorization requests

#### devoluciones
- Client-side returns (not supplier returns)

---

### DOMINIO INVENTARIO

#### productos
- **38+ columnas**: `id`, `codigo`, `nombre`, `descripcion`, `unidad`, `precio_venta`, `precio_compra`, `stock_actual`, `stock_minimo`, `maneja_caducidad`, `activo`, `ultimo_costo_compra`, `fecha_ultima_compra`, `marca`, `peso_kg`, `categoria`, `categoria_id`, `proveedor_preferido_id`, `precio_por_kilo`, `aplica_iva`, `aplica_ieps`, `tasa_ieps`, `requiere_fumigacion`, `fecha_ultima_fumigacion`, `codigo_sat`, `solo_uso_interno`, `piezas_por_unidad`, `descuento_maximo`, `especificaciones`, `contenido_empaque`, `unidad_sat`, `costo_promedio_ponderado`, `puede_tener_promocion`, `producto_base_id`, `es_promocion`, `descripcion_promocion`, `bloqueado_venta`
- FK hacia: categorias_productos, proveedores (proveedor_preferido)
- FK desde: pedidos_detalles, ordenes_compra_detalles, inventario_lotes, inventario_movimientos, proveedor_productos, carga_productos, faltantes_proveedor, productos_historial_costos, productos_historial_precios, productos_revision_precio
- RLS: ✅
- Triggers: `update_product_stock` (on inventario_movimientos), `sync_stock_from_lotes` (on inventario_lotes), `cleanup_proveedor_productos_on_inactivar`

#### categorias_productos
- Canonical categories: `id`, `nombre`, `orden`, `activo`
- RLS: ✅

#### inventario_lotes
- Columnas clave: `id`, `producto_id`, `cantidad_disponible`, `precio_compra`, `precio_compra_provisional`, `conciliado`, `fecha_entrada`, `fecha_caducidad`, `fecha_ultima_fumigacion`, `lote_referencia`, `orden_compra_id`, `bodega_id`, `recibido_por`, `notas`, `peso_total_real`, `peso_promedio_bulto`
- FK hacia: productos, ordenes_compra, bodegas, profiles
- Triggers: `sync_stock_from_lotes` → recalcula `productos.stock_actual`

#### inventario_movimientos
- Tipos: entrada, salida, ajuste, consumo_interno, merma, transferencia
- Columnas: `producto_id`, `tipo_movimiento`, `cantidad`, `fecha_caducidad`, `lote`, `referencia`, `notas`, `usuario_id`, `stock_anterior`, `stock_nuevo`
- Trigger: `update_product_stock` → actualiza `productos.stock_actual` + genera notificación stock bajo

#### bodegas
- `nombre`, `direccion`, `latitud`, `longitud`, `radio_deteccion_metros`, `wifi_ssids`, `es_externa`, `activo`

#### productos_stock_bajo (VIEW)
- `SELECT * FROM productos WHERE activo=true AND stock_minimo>0 AND stock_actual<=stock_minimo`

---

### DOMINIO COMERCIAL (Clientes, Ventas, Facturas)

#### clientes
- Columnas clave: `id`, `nombre`, `rfc`, `email`, `telefono`, `zona_id`, `vendedor_asignado`, `termino_credito`, `limite_credito`, `saldo_pendiente`, `activo`, `es_grupo`, `grupo_cliente_id`, `user_id`, `logo_url`, `regimen_fiscal`, `uso_cfdi_default`, fiscal address fields (CFDI 4.0)
- FK hacia: zonas, profiles (vendedor), auth.users (portal)
- FK desde: cliente_sucursales, pedidos, facturas, cotizaciones, cobros_pedido, pagos_cliente

#### cliente_sucursales
- Branch/delivery points: `cliente_id`, `nombre`, `rfc`, `razon_social`, `direccion_fiscal`, `email_facturacion`, `latitud`, `longitud`, `zona_id`, `horario_entrega`, `restricciones_vehiculo`, `dias_sin_entrega`, `no_combinar_pedidos`, `es_rosticeria`, `codigo_sucursal`, `sucursal_hermana_id`, `sucursal_entrega_id`

#### zonas
- `nombre`, `activo`, `es_foranea`

#### cliente_creditos_excepciones
- Per-product credit term overrides per client

#### cliente_productos_frecuentes
- Productos frecuentes for portal

#### cliente_correos / cliente_contactos / cliente_telefonos
- Multi-contact data

#### cotizaciones / cotizaciones_detalles / cotizaciones_envios
- Quote management with send history

#### cotizaciones_lecaroz / cotizacion_lecaroz_lineas / tandas_lecaroz / email_log_lecaroz
- Client-specific (Lecaroz) quoting system

#### facturas / factura_detalles
- CFDI invoicing: `folio`, `cfdi_uuid`, `cfdi_estado` (borrador/timbrada/cancelada/error), `pagada`

#### cobros_pedido
- Payment against orders: `pedido_id`, `cliente_id`, `monto`, `forma_pago`, `referencia`

#### pagos_cliente / pagos_cliente_detalle
- Payment against invoices: `cliente_id`, `monto_total`, `status` (pendiente/validado/rechazado), `requiere_validacion`

#### comisiones_vendedor / comisiones_detalle
- Sales commission tracking

---

### DOMINIO COMPRAS

#### proveedores
- 31+ columnas: fiscal data, bank data, `categoria`, `termino_pago`, `dias_visita`, `frecuencia_compra`, `metodo_contacto_preferido`, `metodos_pago_aceptados`, `notas`, `notas_operativas`
- FK desde: ordenes_compra, proveedor_productos, proveedor_contactos, eventos_proveedor, faltantes_proveedor

#### proveedor_contactos
- Multi-contact per supplier with responsibility flags (recibe_ordenes, recibe_pagos, etc.)

#### proveedor_productos
- Association table: `proveedor_id`, `producto_id`, `costo_proveedor`, `codigo_proveedor`, `precio_por_kilo_compra`, transport config (`tipo_vehiculo_estandar`, `capacidad_vehiculo_bultos`, `capacidad_vehiculo_kg`, `es_capacidad_fija`, `permite_combinacion`, `dividir_en_lotes_recepcion`), `tipo_carga_default`

#### ordenes_compra
- 41+ columnas: `folio`, `proveedor_id`, `status` (14 valores: borrador→cancelada), `tipo_pago`, `plazo_pago_dias`, `entregas_multiples`, `subtotal`, `impuestos`, `total`, authorization fields, payment fields, conciliation fields, `notas`, `notas_internas`, `fecha_pago_calculada`
- CHECK constraint: 14 status values

#### ordenes_compra_detalles
- 20+ columnas: `producto_id`, `cantidad_ordenada`, `cantidad_recibida`, `cantidad_cancelada`, `cantidad_faltante`, `precio_unitario_compra`, `subtotal`, `tipo_carga`, `unidades_carga`, `peso_pedido_estimado`, `peso_recibido_real`, `peso_faltante`, `costo_real_recibido`, `razon_diferencia`, `notas_diferencia`

#### ordenes_compra_entregas
- **47+ columnas**: `orden_compra_id`, `numero_entrega`, `cantidad_bultos`, `fecha_programada`, `status`, `fecha_entrega_real`, `recibido_por`, firmas (chofer conformidad/diferencia/sin sellos, almacenista), control (sellos, placas, remisión, talon), llegada tracking, cancelación fields, `status_conciliacion`, `origen_faltante`, `productos_faltantes` (JSON)

#### ordenes_compra_entregas_evidencias
- Photos per delivery

#### recepciones_evidencias / recepciones_participantes
- Reception evidence and audit trail

#### proveedor_facturas / proveedor_factura_detalles / proveedor_factura_entregas
- Supplier invoice management and reconciliation

#### proveedor_creditos_pendientes
- Credits from returns: `proveedor_id`, `monto`, `status`, `tipo_resolucion`

#### devoluciones_proveedor / devoluciones_proveedor_evidencias
- Supplier returns with photo evidence

#### faltantes_proveedor
- Shortfall tracking: `tipo_faltante` (cantidad/peso/ambos), quantities, weights

#### eventos_proveedor
- Timeline: `tipo_evento` (9 types auto/manual), `titulo`, `descripcion`, `metadata`, `origen`

#### productos_historial_costos
- Cost change audit: `costo_anterior`, `costo_nuevo`, `fuente`, `referencia_id`

#### precios_proveedor_producto (M02.5)
- **Tabla nueva**: historical price tracking per supplier-product pair

---

### DOMINIO RRHH

#### empleados
- Full employee record: personal data, `puesto`, `sueldo_bruto`, `dias_laborales`, `periodo_pago`, `contrato_firmado_fecha`, `licencia_vencimiento`, `zk_id`, `foto_url`, `activo`, `motivo_baja`

#### empleados_documentos / empleados_documentos_pendientes
- Document management with pending checklist

#### empleados_vacaciones
- Vacation tracking with LFT days calculation

#### empleados_actas
- Disciplinary records

#### empleados_historial_sueldo
- Salary change audit

#### asistencia
- Biometric attendance: `zk_user_id`, `empleado_id`, `fecha`, `hora`, `tipo`, `dispositivo`

#### zk_mapeo
- ZKTeco device-to-employee mapping

#### vehiculos / vehiculos_checkups / vehiculos_mantenimientos / vehiculos_verificaciones
- Fleet management with inspections

#### ayudantes_externos
- External helper workers

#### disponibilidad_personal
- Staff availability calendar

---

### DOMINIO SISTEMA

#### profiles / profiles_chat
- Supabase auth user profiles

#### user_roles
- Role assignments per user

#### module_permissions
- Permission matrix

#### configuracion_empresa / configuracion_flotilla
- Key-value system config

#### device_tokens
- Push notification tokens: `user_id`, `token`, `platform`, `device_name`

#### notificaciones
- In-app notifications: `tipo`, `titulo`, `descripcion`, `leida`, reference IDs

#### conversaciones / conversacion_participantes / mensajes
- Chat system

#### gmail_cuentas / gmail_auditoria / gmail_cuenta_permisos / gmail_firmas
- Gmail OAuth integration

#### correos_enviados
- Email send log

#### security_audit_log
- Security audit trail

#### resumenes_diarios
- Daily summary snapshots

#### migracion_productos_sugerencias
- AI migration suggestions

---

## B) FUNCIONES RPC EXISTENTES

### Generación de folios atómicos
| Función | Args | Retorna | Invocada desde |
|---------|------|---------|----------------|
| `generar_folio_pedido()` | ninguno | TEXT | NuevoPedidoDialog, VendedorNuevoPedido, ClienteNuevoPedido, useOfflineSync |
| `generar_folio_orden_compra()` | ninguno | TEXT | CrearOrdenCompraWizard, OrdenesCompraTab |
| `generar_folio_venta_mostrador()` | ninguno | TEXT | AlmacenVentasMostradorTab |
| `generar_codigo_cliente()` | ninguno | TEXT | VendedorNuevoClienteSheet |

### Creación atómica de OC
| Función | Args | Retorna | Security |
|---------|------|---------|----------|
| `crear_orden_compra_v3(p_proveedor_id, p_tipo_pago, p_lineas, ...)` | UUID, TEXT, JSONB + 6 opcionales | JSONB | DEFINER |

### Cálculo de precios y costos
| Función | Args | Retorna | Invocada desde |
|---------|------|---------|----------------|
| `calcular_costo_promedio_ponderado(p_producto_id)` | UUID | NUMERIC | **NADIE** (dead function) |
| `fn_obtener_precio_sugerido(p_proveedor_id, p_producto_id)` | UUID, UUID | JSONB | SeccionProductos (OC v3) |
| `ajustar_costos_oc(p_oc_id, p_productos)` | UUID, JSONB | void | AjustarCostosOCDialog, ProcesarPagoOCDialog |
| `conciliar_factura_proveedor(p_factura_id, p_productos)` | UUID, JSONB | void | ConciliarFacturaDialog |
| `obtener_termino_credito(...)` | varies | varies | creditoUtils |

### Inventario
| Función | Args | Retorna | Invocada desde |
|---------|------|---------|----------------|
| `incrementar_lote(p_lote_id, p_cantidad)` | UUID, NUMERIC | void | AlmacenCargaScan (reversa), Rutas (delete cascade) |
| `decrementar_lote(p_lote_id, p_cantidad)` | UUID, NUMERIC | void | AlmacenCargaScan (carga) |
| `registrar_baja_caducidad(p_lote_id, p_cantidad, p_tipo, p_notas)` | UUID, NUMERIC, TEXT, TEXT | void | ReporteCaducidadTab |

### Cobros y pagos
| Función | Args | Retorna | Security |
|---------|------|---------|----------|
| `registrar_cobro_pedido(p_pedido_id, p_cliente_id, p_monto, ...)` | UUID×2, NUMERIC, TEXT×3, DATE | void | DEFINER |

### Proveedores v3 (KPIs)
| Función | Args | Retorna | Invocada desde |
|---------|------|---------|----------------|
| `get_proveedor_score(p_proveedor_id)` | UUID | JSONB | useProveedoresV3, useComparadorPrecios |
| `get_proveedor_kpis(p_proveedor_id)` | UUID | JSONB | useProveedorDetalle |
| `get_proveedor_compras_mensuales(p_proveedor_id)` | UUID | JSONB | useProveedorDetalle |

### Devoluciones
| Función | Args | Retorna | Invocada desde |
|---------|------|---------|----------------|
| `agregar_devolucion_a_oc(p_oc_id, p_monto)` | UUID, NUMERIC | void | DevolucionProveedorDialog |

### Empleados
| Función | Invocada desde |
|---------|----------------|
| `update_empleado_completo(...)` | Empleados.tsx (raw fetch) |
| `update_empleado_extras(...)` | Empleados.tsx |
| `update_empleado_json(p_id, p_data)` | Empleados.tsx |

### Otros
| Función | Propósito |
|---------|-----------|
| `generar_notificaciones_fumigacion()` | Genera alertas de fumigación próxima |
| `liberar_vehiculos_chofer_inactivo()` | Trigger: libera vehículo al desactivar chofer |
| `has_any_role(roles)` | RLS helper |
| `has_role(user_id, role)` | RLS helper |
| `get_user_roles()` | Returns user's roles |
| `haversine_km(lat1, lon1, lat2, lon2)` | Distance calculation |
| `es_vendedor_de_cliente(...)` | RLS helper for vendedor access |
| `es_participante_conversacion(...)` | Chat RLS helper |
| `check_chofer_client_access(...)` | Chofer RLS helper |
| `check_client_order_access(...)` | Portal RLS helper |

### Triggers automáticos (en BD, no RPCs)
| Trigger | Tabla | Propósito |
|---------|-------|-----------|
| `update_product_stock` | inventario_movimientos | Actualiza stock_actual en productos |
| `sync_stock_from_lotes` | inventario_lotes | Recalcula stock_actual = SUM(lotes) |
| `cleanup_proveedor_productos_on_inactivar` | productos | DELETE asociaciones al inactivar |
| `trigger_liberar_vehiculos_update/delete` | empleados | Libera vehículo al desactivar chofer |
| `trg_registrar_precio_oc` | ordenes_compra_detalles | M02.5: registra precio en historial |
| `trg_evento_faltante` | faltantes_proveedor | Auto-crea evento en timeline proveedor |
| `trg_evento_precio_cambio` | ordenes_compra_detalles | Evento si precio cambia >15% |
| `actualizar_saldo_cliente_pago` | pagos_cliente | Actualiza saldo al validar pago |
| `update_categorias_productos_updated_at` | categorias_productos | Timestamp auto |

---

## C) MIGRACIONES RECIENTES (últimas 30)

| Fecha | Archivo | Resumen |
|-------|---------|---------|
| 2026-04-23 | rpc_registrar_baja_caducidad | RPC atómica para baja por caducidad |
| 2026-04-22 | blindaje_reducido_m04_6b | 8 RPCs + 11 RLS policies (seguridad masiva) |
| 2026-04-22 | folio_pedido_rpc_rls_detalles | generar_folio_pedido + RLS pedidos_detalles |
| 2026-04-15 | vehiculos_auto_liberar_chofer | Trigger liberar vehículo al desactivar chofer |
| 2026-04-15 | pedidos_alertas_precio | Columna alertas_precio JSON |
| 2026-04-11 | pedidos_notas_entrega_es_directo | Columnas notas_entrega + es_directo |
| 2026-04-09 | productos_stock_bajo VIEW + categorias | Canonical categories + RLS + indexes |
| 2026-04-08 | clientes regimen_fiscal + generar_codigo | RLS clientes + generar_codigo_cliente |
| 2026-04-07 | Lecaroz batch (8 migraciones) | Tandas, cotizaciones, email_log, lineas Lecaroz + RLS |
| 2026-04-05 | sucursal_entrega_cruzada | Cross-delivery sucursal support |
| 2026-04-03 | 2 migraciones | (sin nombre descriptivo) |
| 2026-04-01 | 1 migración | (sin nombre descriptivo) |
| 2026-03-31 | 5 migraciones | (sin nombre descriptivo) |

**Patrones:**
- Abril fue el mes más activo (seguridad M04, Lecaroz, productos, alertas)
- Las migraciones más recientes son RPCs de seguridad y triggers
- Muchas migraciones UUID-named (generadas por Lovable) sin descripción

---

## D) EXTENSIONES Y FEATURES DE SUPABASE

### pg_advisory_xact_lock
- Usado en `generar_folio_pedido()` para folios atómicos (confirmado en M04.5A)

### Realtime
- **20+ canales activos** en frontend
- Tablas con suscripción: `ordenes_compra_entregas`, `inventario_lotes`, `inventario_movimientos`, `mensajes`, `conversacion_participantes`, `entregas`, `rutas`, `carga_productos`, `pedidos`, `solicitudes_venta_mostrador`, `solicitudes_descuento`

### Storage Buckets (7 encontrados en código)
| Bucket | Uso |
|--------|-----|
| `empleados-documentos` | Expediente digital empleados |
| `empleados-fotos` | Fotos de perfil empleados |
| `recepciones-evidencias` | Fotos recepción mercancía |
| `devoluciones-evidencias` | Fotos devoluciones proveedor |
| `vehiculos-documentos` | Tarjeta circulación, póliza, factura |
| `ordenes-compra` | Comprobantes de pago OC |
| `chat-archivos` | Adjuntos de chat |
| `checkups-danos-fotos` | Fotos de daños en vehículos |
| `proveedor-facturas` | Facturas de proveedor PDF |

### Edge Functions (53 total)
Agrupadas por dominio:
- **Gmail/Correos (4):** gmail-api, gmail-auth, gmail-callback, parse-order-email
- **Notificaciones (10):** send-push-notification, notificar-cierre-oc, notificar-faltante-oc, notificar-entregas-programadas, notificar-faltante-anticipado, notificar-cancelacion-descarga, notificar-solicitud-deposito, notificar-pedidos-programados, notificar-entrega-vendedor, send-client-notification
- **Email envío (6):** send-invoice-email, send-order-authorized-email, send-delivery-confirmation, send-chofer-route-email, send-checkup-report, send-secretary-notification, send-welcome-email
- **CFDI (4):** timbrar-cfdi, cancelar-cfdi, descargar-cfdi, parse-cfdi-xml
- **IA/Extracción (7):** extract-tarjeta-circulacion, extract-factura-vehiculo, extract-license-expiry, extract-placas-vehiculo, parse-csf, parse-excel-order, normalize-product
- **Usuarios (4):** create-user, create-client-user, delete-user, reset-user-password, lookup-login-user
- **Geo/Maps (4):** geocode-addresses, get-place-details, get-route-directions, google-places-autocomplete
- **Otros (7+):** suggest-routes (IA), generate-truck-design, analyze-employee-file-bundle, check-caducidad-fumigacion, check-invoice-expiry-reminders, check-vehicle-documents-expiry, auto-reschedule-deliveries, resumen-diario, lookup-postal-code, zk-attendance, enviar-pedido-interno, migrate-proveedor-addresses

---

## E) CONEXIÓN BD ↔ CÓDIGO

### Estado de types.ts
- **Archivo:** `src/integrations/supabase/types.ts` — 7,504 líneas
- **Última regeneración:** No tiene timestamp. Basado en contenido, incluye tablas recientes (eventos_proveedor, faltantes_proveedor, precios_proveedor_producto, categorias_productos) pero puede estar 1-2 migraciones atrás.

### Tablas en BD pero posiblemente NO en types.ts (necesitan verificación)
Las siguientes columnas/tablas fueron agregadas vía SQL directo en Supabase Dashboard durante las sesiones de Día 1-3 y pueden no estar reflejadas:
- `productos.tasa_ieps` (ALTER TABLE vía Dashboard)
- `proveedores.notas_operativas` (ALTER TABLE vía Dashboard)
- `proveedores`: 10 columnas agregadas Día 1 (categoria, termino_pago, dias_visita, etc.)
- `ordenes_compra`: 4 columnas v3 (plazo_pago_dias, metodo_pago_anticipado, notas_internas, fecha_pago_calculada)
- `ordenes_compra_detalles`: 7 columnas v3 (cantidad_faltante, tipo_carga, peso_*, costo_real_recibido)
- `inventario_lotes`: 2 columnas (peso_total_real, peso_promedio_bulto)
- `proveedor_productos`: 1 columna (tipo_carga_default)

### Código que usa `as any` para bypassar types
- `ProveedoresTab.tsx` — acceso a campos de proveedor no tipados
- `AlmacenRecepcionSheet.tsx` — `ordenes_compra_entregas_evidencias`
- `AjustarCostosOCDialog.tsx` — `productos_revision_precio`
- `AsistenciaView.tsx`, `AsistenciaStats.tsx` — `(supabase as any)` para asistencia/zk_mapeo
- `useProveedorDetalle.ts`, `useProveedorMemoria.ts` — `eventos_proveedor`

### Recomendación
Regenerar types.ts con:
```bash
npx supabase gen types typescript --project-id vrcyjmfpteoccqdmdmqn > src/integrations/supabase/types.ts
```
Esto eliminaría todos los `as any` workarounds y daría type safety real.

---

## F) FUNCIÓN MUERTA CRÍTICA

`calcular_costo_promedio_ponderado(p_producto_id UUID)`:
- **Existe en BD** (confirmado en types.ts)
- **NUNCA se invoca desde frontend** (0 matches en grep)
- `productos.costo_promedio_ponderado` es LEÍDO por: Lista de Precios, Dashboard, análisis de margen
- Pero NUNCA se ESCRIBE desde ningún flujo de conciliación
- Impacto: todos los cálculos de margen usan `ultimo_costo_compra` como fallback (menos preciso)
