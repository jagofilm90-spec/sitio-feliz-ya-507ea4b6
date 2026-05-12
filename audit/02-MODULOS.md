# AUDITORÍA ALMASA-OS — 02 MÓDULOS
**Fecha**: 8 mayo 2026
**Método**: Lectura directa de código fuente (NO ejecución)

---

### Módulo 1: Empleados
- Estado: ✅ EXISTE
- Ruta: `/empleados` (admin, secretaria, contadora)
- Completitud: 92%
- Componentes principales: `Empleados.tsx` (3,126 lín), `EmpleadoFicha.tsx`, `EmpleadoWizard.tsx`, `FirmaContratoFlow.tsx`, `ExpedienteDigital.tsx`, `ProcesoBaja.tsx`, `VacacionesEmpleado.tsx`, `ActasAdministrativas.tsx`, `DarAccesoSistemaDialog.tsx` — 18 archivos, ~7,557 líneas
- Tablas Supabase: empleados, empleados_documentos, empleados_documentos_pendientes, empleados_vacaciones, empleados_actas, empleados_historial_sueldo, profiles
- Funciones RPC: ninguna (usa raw fetch para algunas operaciones por bug de cache)
- TODOs encontrados: 1 (`EmpleadoWizard.tsx:248` — upload to storage on save)
- Notas: Bug crítico — `documentos` state sin setter (líneas 185-186) rompe eliminación de archivos storage. Módulo más grande de RRHH. Firma digital de contrato + actas + expediente IA + ZK biométrico.

---

### Módulo 2: Asistencia
- Estado: ✅ EXISTE
- Ruta: `/asistencia` (admin, secretaria)
- Completitud: 88%
- Componentes principales: `Asistencia.tsx` (85 lín), `AsistenciaView.tsx`, `ReporteSemanal.tsx`, `ReporteQuincenal.tsx`, `ReporteAsistenciaMensual.tsx`, `ZkMappingPanel.tsx`, `VacacionesMasivasDialog.tsx` — 8 archivos, ~1,637 líneas
- Tablas Supabase: asistencia, zk_mapeo, empleados, empleados_vacaciones
- Funciones RPC: ninguna
- TODOs encontrados: 0
- Notas: Integración ZKTeco biométrico real. Mapeo device ID → empleado. Sin realtime (no detecta checkins en vivo). Cálculo de nómina (descuentos + premio asistencia). `(supabase as any)` en múltiples queries — types.ts desactualizado.

---

### Módulo 3: Vehículos
- Estado: ✅ EXISTE
- Ruta: `/vehiculos` (admin, secretaria, gerente_almacen) + tab en `/rutas`
- Completitud: 87%
- Componentes principales: `VehiculosPage.tsx` (13 lín), `VehiculosTab.tsx` (1,460 lín), `VehiculoCardMobile.tsx` — 3 archivos
- Tablas Supabase: vehiculos, empleados
- Funciones RPC: ninguna
- Edge functions: extract-tarjeta-circulacion, extract-factura-vehiculo
- TODOs encontrados: 0
- Notas: IA extrae datos de tarjeta circulación y factura automáticamente. Tarjeta estatal vs federal. Sin búsqueda/filtros. Sin mantenimiento tracking.

---

### Módulo 4: Productos
- Estado: ✅ EXISTE
- Ruta: `/productos` (admin, secretaria, contadora)
- Completitud: 85%
- Componentes principales: `Productos.tsx` (1,281 lín), `SecretariaProductosTab.tsx` (919), `MigracionProductosDialog.tsx` (598), `AlmacenProductosTab.tsx` (240) — + `ProductoCardMobile.tsx`, `ProductoBadges.tsx`
- Tablas Supabase: productos, inventario_lotes, proveedor_productos, categorias
- Funciones RPC: ninguna
- TODOs encontrados: 0
- Notas: Form v4 rediseñado (17 campos vs 26 original). Migración IA para normalizar catálogo legacy. aplica_iva default=true. Código SAT required. Análisis markup+margen. IEPS con selector 6 tasas. Anti-duplicados Levenshtein.

---

### Módulo 5: Lista de Precios (incluyendo M02.5 Precios Temporal)
- Estado: ✅ EXISTE
- Ruta: `/precios` (admin, secretaria, vendedor — cada rol ve su vista)
- Completitud: 88%
- Componentes principales: `AdminListaPreciosTab.tsx` (636), `SecretariaListaPreciosTab.tsx` (465), `VendedorListaPreciosTab.tsx` (400), `useListaPrecios.ts` (248), `RevisionesPrecioPanel.tsx`, `PrecioHistorialDialog.tsx`, `PdfExportDialog.tsx`
- Tablas Supabase: productos, productos_historial_precios, productos_revision_precio, precios_proveedor_producto (M02.5)
- Funciones RPC: fn_obtener_precio_sugerido (M02.5)
- TODOs encontrados: 0
- Notas: Admin tiene bulk update, simulador, Excel export. Secretaria edita individual. Vendedor solo lectura + comparador con cliente. M02.5 Precios Temporal implementado: tabla `precios_proveedor_producto`, trigger `trg_registrar_precio_oc`, helper `fn_obtener_precio_sugerido`. Frontend pre-fill en `SeccionProductos.tsx` (OC v3).

---

### Módulo 6: Clientes
- Estado: ✅ EXISTE
- Ruta: `/clientes` + `/clientes/nuevo` + `/clientes/:id` + `/clientes/:id/editar` (admin, secretaria, vendedor)
- Completitud: 90%
- Componentes principales: `Clientes.tsx` (471), `NuevoCliente.tsx` (745), `DetalleCliente.tsx` (482), `EditarCliente.tsx` (596), `ClienteSucursalesDialog.tsx` (1,160), `SucursalFormModal.tsx` (1,066), `ImportarCatalogoAspelDialog.tsx` (913) — 25 archivos, ~10,600 líneas
- Tablas Supabase: clientes, cliente_sucursales, zonas, cliente_creditos_excepciones, cliente_productos_frecuentes, cliente_correos
- Funciones RPC: ninguna
- Edge functions: create-client-user
- TODOs encontrados: 0
- Notas: Import Aspel + Excel. Grupos/jerarquías. Geocodificación sucursales. Mapa. Auditoría fiscal. Portal access provisioning. Créditos con excepciones por producto.

---

### Módulo 7: Pedidos
- Estado: ✅ EXISTE
- Ruta: `/pedidos` (admin, secretaria, vendedor)
- Completitud: 88%
- Componentes principales: `Pedidos.tsx` (1,134), `NuevoPedidoDialog.tsx` (993), `PedidosPorAutorizarTab.tsx` (1,133), `AutorizacionRapidaSheet.tsx` (612), `VendedorNuevoPedidoTab.tsx` (1,247), pedido-wizard/ (6 archivos) — 24+ archivos, ~8,100 líneas
- Tablas Supabase: pedidos, pedidos_detalles, clientes, cliente_sucursales, productos
- Funciones RPC: generar_folio_pedido
- TODOs encontrados: 0
- Notas: Offline IndexedDB queue para vendedores. Autorización con alertas de precio ("error de dedo" >50%, "bajo piso"). Hoja de carga. Bug: folio duplicable al convertir cotización (usa query manual en vez de RPC). `PedidosPorAutorizarTab` posiblemente dead code (1,133 lín no importadas).

---

### Módulo 8: Cotizaciones
- Estado: ✅ EXISTE
- Ruta: Tab dentro de `/pedidos` + `/lecaroz/cotizaciones` (admin, secretaria, vendedor)
- Completitud: 85%
- Componentes principales: `CotizacionesTab.tsx` (757), `CrearCotizacionDialog.tsx` (1,206), `CotizacionDetalleDialog.tsx` (1,415), `EnviarCotizacionDialog.tsx` (476) — 11 archivos, ~5,700 líneas
- Tablas Supabase: cotizaciones, cotizaciones_detalles, cotizaciones_envios, gmail_cuentas
- Funciones RPC: generar_folio_cotizacion
- TODOs encontrados: 0
- Notas: Conversión a pedido implementada. Envío Gmail integrado (individual + masivo). Analytics tab usa datos de pedidos, no de cotizaciones. Company name hardcodeado en email template.

---

### Módulo 9: Facturas
- Estado: ✅ EXISTE
- Ruta: `/facturas` (admin, secretaria, contadora)
- Completitud: 75%
- Componentes principales: `Facturas.tsx` (496), `NuevaFacturaDirectaDialog.tsx` (655), `ProcesarSolicitudDialog.tsx` (524), `GenerarFacturaDialog.tsx` (345) — 5 archivos, ~2,000 líneas
- Tablas Supabase: facturas, pedidos, clientes
- Funciones RPC: ninguna
- Edge functions: timbrar-cfdi, cancelar-cfdi, descargar-cfdi
- TODOs encontrados: 0
- Notas: CFDI completo (timbrar/cancelar/descargar). Factura directa (mostrador). Bug: botón "Ver detalle" sin handler (dead button). Dualidad: `pedidos.facturado=true` puede existir sin registro en `facturas`. Sin UI para marcar pagadas.

---

### Módulo 10: Portal Cliente
- Estado: 🟡 PARCIAL
- Ruta: `/portal-cliente` (rol cliente, sin ProtectedRoute explícito)
- Completitud: 72%
- Componentes principales: `PortalCliente.tsx` (423), `ClienteNuevoPedido.tsx` (922), `ClientePedidos.tsx` (225), `ClienteEstadoCuenta.tsx` (300), `ClienteEntregas.tsx` (287) — 5 archivos, ~2,100 líneas
- Tablas Supabase: clientes, pedidos, pedidos_detalles, facturas, entregas, cliente_productos_frecuentes
- Funciones RPC: generar_folio_pedido
- TODOs encontrados: 0
- Notas: Self-service pedido creation funcional. Bugs: `proximaEntrega` query rota (sub-query no awaited), sin route guard (seguridad), sin optimización mobile.

---

### Módulo 11: Rutas
- Estado: ✅ EXISTE
- Ruta: `/rutas` (admin, secretaria)
- Completitud: 90%
- Componentes principales: `Rutas.tsx` (649), `PlanificadorRutas.tsx` (948), `SugerirRutasAIDialog.tsx` (806), `MapaRutaEnVivo.tsx` (345), `MapaGlobalSucursales.tsx` (1,034), `MonitoreoRutasTab.tsx` (220) — 27 archivos, ~11,533 líneas
- Tablas Supabase: rutas, entregas, carga_productos, carga_evidencias, chofer_ubicaciones, vehiculos, empleados, zonas, ayudantes_externos
- Funciones RPC: incrementar_lote (para reversa al eliminar ruta)
- Edge functions: suggest-routes (IA), get-route-directions
- TODOs encontrados: 0
- Notas: IA route optimization. GPS live tracking con Capacitor. Google Maps integration. 8 tabs. Cascade delete bien implementado. Bug: botón Eye sin handler, dual status schema (`en_curso` admin vs `en_ruta` chofer).

---

### Módulo 12: Choferes
- Estado: ✅ EXISTE
- Ruta: `/chofer` (admin, chofer)
- Completitud: 88%
- Componentes principales: `ChoferPanel.tsx` (282), `RegistrarEntregaSheet.tsx` (487), `EntregaCard.tsx` (300), `QRScannerEntrega.tsx` (139), `ResumenRuta.tsx` (131) — 7 archivos, ~1,524 líneas
- Tablas Supabase: rutas, entregas, pedidos, vehiculos, empleados, chofer_ubicaciones
- Funciones RPC: ninguna
- TODOs encontrados: 0
- Notas: Mobile-first. Firma digital en canvas. GPS background tracking automático. Sin captura de fotos (solo firma). Status mismatch con admin.

---

### Módulo 13: Proveedores
- Estado: ✅ EXISTE (classic + v3)
- Ruta: `/compras` tab "Proveedores" + `/compras/proveedores-v3` + `/compras/proveedores-v3/:id` (admin, secretaria, contadora)
- Completitud: Classic 85%, v3 60%
- Componentes principales: `ProveedoresTab.tsx` (2,095), `ProveedorProductosSelector.tsx`, `ProveedoresV3.tsx`, `ProveedorDetalle.tsx`, proveedores-v3/ (27 archivos)
- Tablas Supabase: proveedores, proveedor_contactos, proveedor_productos, eventos_proveedor
- Funciones RPC: get_proveedor_score, get_proveedor_kpis, get_proveedor_compras_mensuales
- TODOs encontrados: 0
- Notas: Classic: CRUD completo + Eye detail + productos selector. v3: Score confiabilidad, KPIs 360, eventos auto/manual, comparador precios. v3 usa `as any` extensivamente. N+1 query en score per-proveedor.

---

### Módulo 14: Órdenes de Compra
- Estado: ✅ EXISTE (wizard legacy + v3)
- Ruta: `/compras` tab "Órdenes" + `/compras/nueva-oc-v3` (admin, secretaria)
- Completitud: 78%
- Componentes principales: `OrdenesCompraTab.tsx` (2,912), `CrearOrdenCompraWizard.tsx` (3,021), `NuevaOCv3.tsx` (236) + oc-v3/ (6 archivos), `OrdenAccionesDialog.tsx` (2,321), `AutorizacionOCDialog.tsx` (418), `MarcarPagadoDialog.tsx` (859), `ProcesarPagoOCDialog.tsx` (1,143) — 18+ archivos, ~13,500 líneas
- Tablas Supabase: ordenes_compra, ordenes_compra_detalles, ordenes_compra_entregas, proveedor_creditos_pendientes, recepciones_evidencias
- Funciones RPC: generar_folio_orden_compra, crear_orden_compra_v3, ajustar_costos_oc, conciliar_factura_proveedor, agregar_devolucion_a_oc
- TODOs encontrados: 0
- Notas: Legacy wizard (3,021 lín) mucho más completo que v3 (falta proveedor manual, tax config, múltiples entregas). v3 no linkeable desde UI. Draft save en v3 es stub. Ciclo completo: crear → autorizar → enviar PDF → recibir → conciliar → pagar.

---

### Módulo 15: Recepciones
- Estado: ✅ EXISTE (legacy compras + almacén)
- Ruta: Tab en `/almacen-tablet` + dialog en `/compras`
- Completitud: 85%
- Componentes principales: `AlmacenRecepcionSheet.tsx` (2,619), `AlmacenRecepcionTab.tsx` (1,428), `RegistrarRecepcionDialog.tsx` (933), `RecepcionDetalleDialog.tsx` (1,114) — ~6,500 líneas
- Tablas Supabase: ordenes_compra_entregas, ordenes_compra_detalles, inventario_lotes, recepciones_participantes, recepciones_evidencias
- Funciones RPC: registrar_baja_caducidad
- TODOs encontrados: 0
- Notas: **SOLO AlmacenRecepcionSheet crea inventario_lotes.** RegistrarRecepcionDialog (legacy) NO crea lotes — solo actualiza cantidades. Dual path es riesgo de stock inconsistente. Sin tracking de peso real. Firmas digitales + evidencia fotográfica + sellos.

---

### Módulo 16: Devoluciones
- Estado: ✅ EXISTE
- Ruta: Tab en `/compras` → "Dev/Faltantes" → "Devoluciones"
- Completitud: 75%
- Componentes principales: `DevolucionesPendientesTab.tsx` (529), `DevolucionProveedorDialog.tsx` (378), `DevolucionesEvidenciasGallery.tsx` (190), `EnviarEvidenciasProveedorDialog.tsx` (451), `CreditosPendientesPanel.tsx` (616) — ~2,290 líneas
- Tablas Supabase: devoluciones_proveedor, devoluciones_proveedor_evidencias, proveedor_creditos_pendientes
- Funciones RPC: agregar_devolucion_a_oc
- TODOs encontrados: 0
- Notas: Captura devolución con fotos + firma chofer. **Bug crítico: no reversa inventario** — stock queda inflado al devolver.

---

### Módulo 17: Faltantes
- Estado: 🟡 PARCIAL
- Ruta: Tab en `/compras` → "Dev/Faltantes" → "Faltantes"
- Completitud: 65%
- Componentes principales: `FaltantesPendientesTab.tsx` (577), `DevolucionesFaltantesTab.tsx` (125)
- Tablas Supabase: ordenes_compra_entregas (vía `origen_faltante`), faltantes_proveedor (solo v3 hooks)
- Funciones RPC: ninguna
- TODOs encontrados: 0
- Notas: **Dos modelos desincronizados:** UI usa `ordenes_compra_entregas.origen_faltante`, v3 proveedores usa tabla `faltantes_proveedor`. No hay sync → score proveedor v3 siempre 0 faltantes.

---

### Módulo 18: Conciliación
- Estado: ✅ EXISTE
- Ruta: Acciones por OC en `/compras`
- Completitud: 70%
- Componentes principales: `ConciliarFacturaDialog.tsx` (432), `ConciliacionRapidaDialog.tsx` (276), `AjustarCostosOCDialog.tsx` (461), `ProveedorFacturasDialog.tsx` (938) — ~2,107 líneas
- Tablas Supabase: proveedor_facturas, proveedor_factura_detalles, inventario_lotes, productos, productos_historial_costos
- Funciones RPC: conciliar_factura_proveedor, ajustar_costos_oc, calcular_costo_promedio_ponderado (existe pero NUNCA se llama)
- TODOs encontrados: 0
- Notas: **Bug crítico: `costo_promedio_ponderado` nunca se actualiza** — RPC existe en BD pero nadie lo invoca desde frontend. Todos los márgenes usan `ultimo_costo_compra`. ConciliaciónRápida bypasea el RPC. Sin guard para facturas duplicadas.

---

### Módulo 19: Caducidad
- Estado: ✅ EXISTE
- Ruta: Tab en `/almacen-tablet` + banner en `/inventario`
- Completitud: 85%
- Componentes principales: `ReporteCaducidadTab.tsx` (432), `NotificacionesCaducidad.tsx` (124) — 556 líneas
- Tablas Supabase: inventario_lotes, productos
- Funciones RPC: registrar_baja_caducidad
- TODOs encontrados: 0
- Notas: FEFO correcto. Baja individual/masiva vía RPC atómico. CSV export. Bug: `NotificacionesCaducidad` consulta `inventario_movimientos` en vez de `inventario_lotes` — fuente incorrecta. Sin realtime.

---

### Módulo 20: Inventario
- Estado: ✅ EXISTE
- Ruta: `/inventario` (admin, secretaria, gerente_almacen, almacen)
- Completitud: 80%
- Componentes principales: `Inventario.tsx` (1,299), `InventarioPorCategoria.tsx` (271), `LoteCardMobile.tsx`, `MovimientoCardMobile.tsx`, badges compartidos — ~1,900 líneas
- Tablas Supabase: inventario_lotes, inventario_movimientos, productos, bodegas
- Funciones RPC: ninguna (depende de DB triggers para stock_actual)
- TODOs encontrados: 0
- Notas: 4 tabs (Productos, Lotes, Movimientos, Por Categoría). Realtime en 2 canales. CRUD manual de movimientos. Bug: `window.confirm()` nativo. Sin export PDF/Excel.

---

### Módulo 21: Almacén Tablet
- Estado: ✅ EXISTE
- Ruta: `/almacen-tablet` + `/almacen-tablet/carga-scan/:pedidoId?` (admin, almacen, gerente_almacen)
- Completitud: 85%
- Componentes principales: `AlmacenTablet.tsx` (412), `AlmacenRecepcionSheet.tsx` (2,619), `AlmacenCargaScan.tsx` (1,362), `CargaHojaInteractiva.tsx` (1,325), `AlmacenVentasMostradorTab.tsx` (596) — 41 archivos, ~20,185 líneas
- Tablas Supabase: ordenes_compra_entregas, inventario_lotes, carga_productos, vehiculos, bodegas, productos
- Funciones RPC: registrar_baja_caducidad, incrementar_lote, decrementar_lote
- TODOs encontrados: 0
- Notas: **Módulo más grande del sistema** (20K+ líneas, 41 archivos). 14 tabs. QR scanner, POS mostrador, auto-detección bodega WiFi/GPS, firma digital, diagrama daños vehículo. Bug: `renderStats()` definido pero nunca renderizado.

---

### Módulo 22: Dashboard
- Estado: ✅ EXISTE
- Ruta: `/dashboard` (admin, secretaria, vendedor, contadora)
- Completitud: 92%
- Componentes principales: `Dashboard.tsx` (270), `useDashboardData.ts` (351), `KPICards.tsx` (196), `MapaRutasWidget.tsx` (378), `ResumenDiaWidget.tsx` (352) — 24 archivos, ~4,400 líneas
- Tablas Supabase: pedidos, facturas, clientes, productos, inventario_lotes, rutas, empleados, notificaciones + 15 más
- Funciones RPC: ninguna
- TODOs encontrados: 0
- Notas: 27 queries paralelas cada 60 segundos. 3 tabs admin (General/RRHH/Finanzas). Almacén→redirect almacen-tablet, Chofer→redirect chofer. Charts con Recharts.

---

### Módulo 23: Correos Corporativos
- Estado: ✅ EXISTE
- Ruta: `/correos` + `/correos/config` (admin, secretaria)
- Completitud: 85%
- Componentes principales: `BandejaEntrada.tsx` (1,379), `ProcesarPedidoDialog.tsx` (1,886), `PedidosAcumulativosManager.tsx` (1,255), `ComposeEmailDialog.tsx` (511), `EmailDetailView.tsx` (622) — 16 archivos, ~8,800 líneas
- Tablas Supabase: gmail_cuentas, correos_enviados, pedidos
- Funciones RPC: ninguna
- Edge functions: gmail-api, gmail-auth, gmail-callback, parse-order-email
- TODOs encontrados: 0
- Notas: **Cliente email COMPLETO** (no solo envío). OAuth Gmail. Parseo de email→pedido con IA. Multi-cuenta. Permisos por usuario. Firmas. Token refresh no automático.

---

### Módulo 24: Push Notifications
- Estado: ✅ EXISTE
- Ruta: Sin ruta propia (integrado globalmente) + `/push-diagnostics` (admin)
- Completitud: 85%
- Componentes principales: `PushNotificationSetup.tsx` (152), `pushNotifications.ts` (216), `pushDiagnostics.ts` (341), `NotificacionesSistema.tsx` (248) — 9 archivos, ~1,227 líneas
- Tablas Supabase: device_tokens, notificaciones
- Funciones RPC: ninguna
- Edge functions: send-push-notification
- TODOs encontrados: 0
- Notas: Full Capacitor integration (iOS APNs→FCM + Android). 15+ eventos disparan push. Deep links al tap. Sin push para chat ni cumpleaños. `NotificacionesSistema` pollea cada 5min.

---

### Módulo 25: Chat Interno
- Estado: ✅ EXISTE
- Ruta: `/chat` (admin, secretaria, vendedor, contadora, almacen, gerente_almacen — NO chofer)
- Completitud: 80%
- Componentes principales: `Chat.tsx` (1,295) — **TODO en 1 archivo monolítico**
- Tablas Supabase: conversaciones, conversacion_participantes, mensajes, profiles_chat, empleados
- Funciones RPC: ninguna
- TODOs encontrados: 0
- Notas: Real-time completo. 4 tipos: 1:1, grupo custom, grupo por puesto, broadcast. Archivos adjuntos. Presencia online. Read receipts. Sin edición/eliminación mensajes. Sin emoji picker. Choferes excluidos.

---

### Módulo 26: Fumigaciones
- Estado: 🟡 PARCIAL
- Ruta: `/fumigaciones` (admin, secretaria, almacen, gerente_almacen) + tab en almacen-tablet
- Completitud: 50%
- Componentes principales: `Fumigaciones.tsx` (357), `AlmacenFumigacionesTab.tsx` (422), `FumigacionCardMobile.tsx` (143) — 3 archivos, ~779 líneas
- Tablas Supabase: productos (solo campos requiere_fumigacion + fecha_ultima_fumigacion)
- Funciones RPC: ninguna
- TODOs encontrados: 0
- Notas: **Módulo menos completo.** Solo tracking, no scheduling. Sin tabla de historial (sobreescribe fecha — dato perdido). Hardcodeado a 6 meses. Sin notificaciones push al vencer. Dos UIs sin locking.

---

### Módulo 27: Respaldos
- Estado: ✅ EXISTE
- Ruta: `/respaldos` (admin)
- Completitud: 95%
- Componentes principales: `Respaldos.tsx` (341) — 1 archivo
- Tablas Supabase: clientes, cliente_sucursales, productos, pedidos, inventario_lotes, proveedores
- Funciones RPC: ninguna
- TODOs encontrados: 0
- Notas: Export manual a Excel/CSV de 6 entidades. No exporta empleados/facturas/OCs. Sin automatización.

---

### Módulo 28: Productos Auxiliares
- Estado: ❌ NO EXISTE
- Notas: No se encontró ningún archivo, tabla, o referencia a "productos auxiliares" como módulo separado. El concepto puede estar cubierto por el flag `solo_uso_interno` en la tabla productos.

---

### Módulo 29: Compensaciones Internas y Adelantos
- Estado: ❌ NO EXISTE
- Notas: Búsqueda de "compensacion", "adelanto", "prestamo", "nomina" encontró solo references en facturas (método de pago "compensación") y contratos de empleados (template PDF). No hay módulo, tabla, ni UI para gestionar compensaciones internas o adelantos de nómina.

---

### Módulo 30: Control de Combustible
- Estado: ❌ NO EXISTE
- Notas: Búsqueda de "combustible", "gasolina", "diesel", "tanque" encontró solo: campo `tipo_combustible` en tabla `vehiculos` (gasolina/diesel/gas — dato informativo), y referencias en el checklist de vehículos (`checklistConfig.ts` — "Nivel de combustible" como ítem de inspección). No hay módulo, tabla, ni UI para control de cargas de combustible, consumo, ni rendimiento.

---

## RESUMEN RÁPIDO

| # | Módulo | Estado | % |
|---|--------|--------|---|
| 1 | Empleados | ✅ | 92% |
| 2 | Asistencia | ✅ | 88% |
| 3 | Vehículos | ✅ | 87% |
| 4 | Productos | ✅ | 85% |
| 5 | Lista de Precios | ✅ | 88% |
| 6 | Clientes | ✅ | 90% |
| 7 | Pedidos | ✅ | 88% |
| 8 | Cotizaciones | ✅ | 85% |
| 9 | Facturas | ✅ | 75% |
| 10 | Portal Cliente | 🟡 | 72% |
| 11 | Rutas | ✅ | 90% |
| 12 | Choferes | ✅ | 88% |
| 13 | Proveedores | ✅ | 85%/60% |
| 14 | Órdenes de Compra | ✅ | 78% |
| 15 | Recepciones | ✅ | 85% |
| 16 | Devoluciones | ✅ | 75% |
| 17 | Faltantes | 🟡 | 65% |
| 18 | Conciliación | ✅ | 70% |
| 19 | Caducidad | ✅ | 85% |
| 20 | Inventario | ✅ | 80% |
| 21 | Almacén Tablet | ✅ | 85% |
| 22 | Dashboard | ✅ | 92% |
| 23 | Correos | ✅ | 85% |
| 24 | Push Notifications | ✅ | 85% |
| 25 | Chat | ✅ | 80% |
| 26 | Fumigaciones | 🟡 | 50% |
| 27 | Respaldos | ✅ | 95% |
| 28 | Productos Auxiliares | ❌ | 0% |
| 29 | Compensaciones | ❌ | 0% |
| 30 | Control Combustible | ❌ | 0% |

**27 módulos existen. 3 no existen. Promedio completitud: ~82%.**
