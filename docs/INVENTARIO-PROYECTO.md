# INVENTARIO COMPLETO ALMASA-OS
**Fecha**: 27 abril 2026
**Propósito**: cartografía cruda del proyecto. Qué existe, dónde, y qué hace en 1 línea.

---

## Resumen numérico

| Categoría | Cantidad |
|-----------|----------|
| Pages | 49 archivos |
| Components | 399 archivos en 28 dominios |
| Hooks | 29 archivos |
| Libs / Utils | 20+ archivos |
| Services | 4 archivos |
| Constants | 2 archivos |
| Edge Functions | 53 directorios |
| Migraciones SQL | 371 archivos |
| Documentos | 15 archivos |
| UI (shadcn) | 53 componentes |

---

## 1. Pages (`src/pages/`)

| Archivo | Qué hace |
|---------|----------|
| Index.tsx | Redirect inicial a /auth |
| Auth.tsx | Login con 2 pasos (email → password) |
| ResetPassword.tsx | Reseteo de contraseña |
| Dashboard.tsx | Home admin con KPIs, gráficas, widgets colapsables |
| Productos.tsx | Lista admin catálogo productos (CRUD + dialog edición) |
| ProductosModoCobro.tsx | Toggle pieza/kilo en productos |
| ProductosHistorialPrecios.tsx | Audit trail de cambios de precio |
| Pedidos.tsx | Lista admin pedidos (5 tabs: alertas, pedidos, cotizaciones, análisis, calendario) |
| Clientes.tsx | Lista admin clientes (vista lista + mapa) |
| clientes/NuevoCliente.tsx | Alta admin cliente (datos fiscales) |
| clientes/DetalleCliente.tsx | Ficha admin cliente (8+ tabs) |
| clientes/EditarCliente.tsx | Edición admin cliente |
| Inventario.tsx | Inventario admin (4 tabs: stock, lotes, movimientos, categoría) |
| Compras.tsx | Compras (8 tabs: proveedores, OC, calendario, devoluciones, historial, adeudos, sugerencias, analytics) |
| Facturas.tsx | Gestión de facturas CFDI |
| Rutas.tsx | Planificación rutas (8 tabs: planificar, asignaciones, monitoreo, mapa, rutas, zonas, disponibilidad, externos) |
| Empleados.tsx | Gestión empleados (7 tabs por puesto, ficha inline) |
| Asistencia.tsx | Asistencia (5 tabs: hoy, semanal, quincenal, mensual, mapeo ZK) |
| VehiculosPage.tsx | Wrapper de VehiculosTab |
| Fumigaciones.tsx | Control de fumigaciones almacén |
| Rentabilidad.tsx | Análisis de márgenes por producto |
| Precios.tsx | Lista precios (renderiza 1 de 3 tabs por rol) |
| Configuracion.tsx | Config sistema (7 secciones: empresa, correos, flotilla, usuarios, créditos, alertas, sistema) |
| Permisos.tsx | Gestión de permisos por módulo |
| Respaldos.tsx | Backups del sistema |
| Chat.tsx | Chat interno multi-conversación |
| CorreosV2.tsx | Bandeja correos Gmail corporativos v2 |
| CorreosCorporativos.tsx | Config de cuentas Gmail |
| VendedorPanel.tsx | Panel vendedor (10 tabs) |
| VendedorAnalisisVentas.tsx | Análisis de ventas del vendedor |
| SecretariaPanel.tsx | Panel secretaria (13 tabs) |
| AlmacenTablet.tsx | Panel almacén tablet (14 tabs, 6 flotilla) |
| AlmacenCargaScan.tsx | Escaneo QR/barcode para carga de ruta |
| ChoferPanel.tsx | Panel chofer (vista única: ruta del día + entregas) |
| PortalCliente.tsx | Portal cliente (4 tabs: pedidos, nuevo, estado cuenta, entregas) |
| MiPerfil.tsx | Perfil del usuario logueado |
| LecarozCotizaciones.tsx | Cotizaciones Lecaroz |
| LecarozCotizacionEditor.tsx | Editor de cotización Lecaroz |
| LecarozBandeja.tsx | Bandeja Lecaroz |
| LandingAlmasa.tsx | Landing page pública |
| TarjetaDigital.tsx | Tarjeta digital pública |
| Privacidad.tsx | Aviso de privacidad |
| Soporte.tsx | Página de soporte |
| DisenosCamioneta.tsx | Diseños para camionetas |
| AppMobileGuide.tsx | Guía de app móvil |
| GenerateAssets.tsx | Generador de screenshots/iconos |
| TestFirma.tsx | Test de firma digital (admin) |
| PushDiagnosticsPage.tsx | Diagnóstico push notifications |
| Usuarios.tsx | Redirect a /configuracion |
| NotFound.tsx | 404 |

---

## 2. Componentes por dominio

### `src/components/admin/` (4 archivos)

| Archivo | Qué hace |
|---------|----------|
| AdminListaPreciosTab.tsx | Tab admin lista precios (636 lín, simulador + bulk + Excel) |
| ProductoPrecioCardMobile.tsx | Card mobile de producto con margen |
| SolicitudesDescuentoPanel.tsx | Panel de solicitudes de descuento |
| UsuariosConectadosPanel.tsx | Panel de usuarios conectados en tiempo real |

### `src/components/secretaria/` (19 archivos)

| Archivo | Qué hace |
|---------|----------|
| SecretariaSidebar.tsx | Sidebar del panel secretaria |
| SecretariaMobileNav.tsx | Nav móvil del panel secretaria |
| SecretariaBienvenidaDialog.tsx | Dialog de bienvenida con resumen diario |
| SecretariaProductosTab.tsx | Tab productos (919 lín, edición con prev/next) |
| SecretariaCostosTab.tsx | Tab costos y márgenes (932 lín) |
| SecretariaListaPreciosTab.tsx | Tab lista precios (465 lín, calculadora) |
| SecretariaPedidosTab.tsx | Tab pedidos (232 lín) |
| SecretariaClientesTab.tsx | Tab clientes con filtro vendedor |
| SecretariaInventarioTab.tsx | Tab inventario read-only |
| SecretariaFacturacionTab.tsx | Tab facturación CFDI |
| SecretariaCorreosTab.tsx | Tab correos (wrapper BandejaEntrada) |
| SecretariaRutasTab.tsx | Tab rutas + conciliación (527 lín) |
| SecretariaPagosValidarTab.tsx | Tab validación de pagos |
| ConciliacionDetalleDialog.tsx | Dialog detalle conciliación entrega |
| ConciliacionMasivaEnvio.tsx | Envío masivo de conciliaciones |
| MigracionLoteDialog.tsx | Dialog migración de lote |
| MigracionProductosDialog.tsx | Dialog migración de productos |
| InventarioItemMobile.tsx | Card mobile de item inventario |
| PedidoCardMobileSecretaria.tsx | Card mobile de pedido |

### `src/components/vendedor/` (35 archivos)

| Archivo | Qué hace |
|---------|----------|
| VendedorSidebar.tsx | Sidebar del panel vendedor |
| VendedorBienvenidaDialog.tsx | Dialog bienvenida con novedades |
| VendedorNuevoPedidoTab.tsx | Wizard 4 pasos nuevo pedido (1,251 lín + offline) |
| VendedorPedidosTab.tsx | Tab pedidos vendedor (735 lín, 6 sub-tabs) |
| VendedorMisClientesTab.tsx | Tab clientes por región |
| VendedorCobranzaTab.tsx | Tab cobranza (dashboard + registro cobros) |
| VendedorMisVentasTab.tsx | Tab ventas del vendedor |
| VendedorNovedadesTab.tsx | Tab novedades (productos nuevos, cambios precio) |
| VendedorListaPreciosTab.tsx | Tab lista precios read-only (419 lín) |
| VendedorSaldosTab.tsx | Tab saldos de clientes |
| VendedorComisionesTab.tsx | Tab comisiones |
| VendedorAnalisisClientesTab.tsx | Tab análisis por cliente |
| VendedorBorradoresTab.tsx | Tab borradores de pedidos |
| VendedorEnCargaTab.tsx | Tab pedidos en carga |
| VendedorEnRutaTab.tsx | Tab pedidos en ruta |
| VendedorVentasChart.tsx | Gráfica de ventas |
| VendedorNuevoClienteSheet.tsx | Sheet alta cliente (1,012 lín, GPS, CP lookup) |
| ClienteDetalleSheet.tsx | Sheet detalle cliente |
| EditarClienteSheet.tsx | Sheet edición cliente |
| GeocodificarSucursalSheet.tsx | Sheet geocodificación de sucursal |
| EditarPedidoPendienteDialog.tsx | Dialog edición pedido pendiente |
| EditarPedidoRechazadoDialog.tsx | Dialog re-envío pedido rechazado |
| PedidoDetalleVendedorDialog.tsx | Dialog detalle pedido (vendedor) |
| PedidoPDFPreviewDialog.tsx | Dialog preview PDF pedido |
| ComprobanteCargaPDFDialog.tsx | Dialog comprobante carga |
| RegistrarCobroPedidoDialog.tsx | Dialog registro cobro |
| RegistrarPagoDialog.tsx | Dialog registro pago |
| CancelarPedidoDialog.tsx | Dialog cancelar pedido |
| EliminarPedidoDialog.tsx | Dialog eliminar pedido |
| SolicitudDescuentoDialog.tsx | Dialog solicitud descuento |
| AgregarProductoEnCargaDialog.tsx | Dialog agregar producto durante carga |
| CargaEvidenciasVendedorSection.tsx | Sección evidencias de carga |
| VendedorTelefonosCliente.tsx | Multi-input teléfonos cliente |
| VendedorCorreosCliente.tsx | Multi-input correos cliente |
| VendedorContactosCliente.tsx | Multi-input contactos cliente |

### `src/components/almacen/` (40 archivos)

| Archivo | Qué hace |
|---------|----------|
| AlmacenSidebar.tsx | Sidebar almacén tablet |
| AlmacenMobileNav.tsx | Nav móvil almacén |
| AlmacenCargaRutasTab.tsx | Tab carga de rutas (1,428 lín) |
| AlmacenRecepcionTab.tsx | Tab recepción mercancía (1,428 lín) |
| AlmacenRecepcionSheet.tsx | Sheet recepción completa (2,619 lín) |
| AlmacenVentasMostradorTab.tsx | Tab POS mostrador (1,253 lín) |
| AlmacenInventarioTab.tsx | Tab inventario (ajuste stock) |
| AlmacenProductosTab.tsx | Tab productos almacén |
| AlmacenFumigacionesTab.tsx | Tab fumigaciones |
| CargaRutaInlineFlow.tsx | Flow inline carga 3 pasos |
| CargaHojaInteractiva.tsx | Hoja interactiva de carga (1,325 lín) |
| CargaProductosChecklist.tsx | Checklist productos en carga |
| CargaResumenFinal.tsx | Resumen final de carga |
| CargaEvidenciasSection.tsx | Sección evidencias |
| RutaCargaInlineView.tsx | Vista inline ruta en carga |
| RutasEnRutaTab.tsx | Tab rutas en ruta |
| RutasEntregadasTab.tsx | Tab rutas entregadas |
| ReporteCaducidadTab.tsx | Tab caducidad de lotes |
| ReporteRecepcionesDiaTab.tsx | Tab recepciones del día |
| PersonalFlotillaTab.tsx | Tab personal de flotilla |
| ProximasEntregasTab.tsx | Tab próximas entregas |
| VehiculoCheckupsTab.tsx | Tab checkups vehículos |
| VehiculoCheckupDialog.tsx | Dialog checkup vehículo |
| RegistrarLlegadaSheet.tsx | Sheet registro llegada |
| ConfiguracionBodegaSheet.tsx | Sheet config bodega |
| ConfiguracionFlotillaDialog.tsx | Dialog config flotilla |
| CancelarDescargaDialog.tsx | Dialog cancelar descarga |
| DevolucionProveedorDialog.tsx | Dialog devolución proveedor |
| FirmaChoferDialog.tsx | Dialog firma chofer |
| FirmaDigitalDialog.tsx | Dialog firma digital canvas |
| ChoferMapDialog.tsx | Dialog mapa chofer |
| DiagramaDanosVehiculo.tsx | Diagrama SVG de daños |
| HistorialDanosVehiculo.tsx | Historial daños vehículo |
| SellosSection.tsx | Sección sellos recepción |
| NotaVentaMostradorPrint.tsx | Template impresión nota mostrador |
| AvatarEmpleadoPopover.tsx | Popover avatar empleado |
| BusquedaLlegadaAnticipada.tsx | Búsqueda llegada anticipada |
| CameraQrScanner.tsx | Scanner QR/barcode con cámara |
| ChecklistItemRow.tsx | Fila de checklist |
| AlertasFlotillaPanel.tsx | Panel alertas flotilla |

### `src/components/chofer/` (6 archivos)

| Archivo | Qué hace |
|---------|----------|
| EntregaCard.tsx | Card de entrega para chofer |
| RegistrarEntregaSheet.tsx | Sheet registro entrega (firma + rechazo) |
| LocationPermissionRequest.tsx | Solicitud permisos GPS |
| QRScannerEntrega.tsx | Scanner QR para entrega |
| NoRutaCard.tsx | Card "sin ruta asignada" |
| ResumenRuta.tsx | Resumen de ruta completada |

### `src/components/cliente/` (4 archivos)

| Archivo | Qué hace |
|---------|----------|
| ClienteNuevoPedido.tsx | Alta pedido portal cliente (943 lín) |
| ClientePedidos.tsx | Lista pedidos del cliente |
| ClienteEstadoCuenta.tsx | Estado de cuenta del cliente |
| ClienteEntregas.tsx | Entregas del cliente |

### `src/components/pedidos/` (15 archivos)

| Archivo | Qué hace |
|---------|----------|
| NuevoPedidoDialog.tsx | Dialog nuevo pedido admin (1,013 lín) |
| PedidoDetalleDialog.tsx | Dialog detalle pedido (canEditPrice) |
| PedidosPorAutorizarTab.tsx | Tab pedidos por autorizar (legacy, reemplazado por AlertasPrecio inline) |
| AutorizacionRapidaSheet.tsx | Sheet autorización rápida |
| CalendarioPedidosTab.tsx | Tab calendario de pedidos |
| GenerarFacturaDialog.tsx | Dialog generar factura desde pedido |
| ImprimirPedidoDialog.tsx | Dialog impresión pedido |
| EditarEmailClienteDialog.tsx | Dialog editar email cliente |
| PedidoPrintTemplate.tsx | Template impresión pedido/remisión |
| HojaCargaUnificadaTemplate.tsx | Template hoja de carga |
| PedidoCardMobile.tsx | Card mobile pedido |
| PedidoHistorialCardMobile.tsx | Card mobile historial pedido |
| PedidoHistorialCambios.tsx | Timeline cambios pedido |
| PedidoDetalleProductCards.tsx | Cards productos en detalle |
| CreditoStatusBadge.tsx | Badge estado crédito |

### `src/components/empleados/` (17 archivos)

| Archivo | Qué hace |
|---------|----------|
| EmpleadoWizard.tsx | Wizard alta 4 pasos |
| EmpleadoFicha.tsx | Ficha integral (658 lín, sidebar + tabs, inline editing) |
| EmpleadoCard.tsx | Card empleado desktop |
| EmpleadoCardMobile.tsx | Card empleado mobile |
| EmpleadosStats.tsx | Stats hero empleados |
| ActasAdministrativas.tsx | Gestión actas con firma + PDF |
| ExpedienteDigital.tsx | Upload documentos a Storage |
| ExpedienteAnalysisDialog.tsx | Análisis AI de expediente |
| DocumentosChecklist.tsx | Checklist documentos requeridos |
| DocumentDetectionCard.tsx | Card detección de documento |
| FirmaContratoFlow.tsx | Flow firma contrato (preview + canvas + PDF + email) |
| FirmaAddendumFlow.tsx | Flow firma addendum |
| ProcesoBaja.tsx | Proceso de baja con finiquito |
| VacacionesEmpleado.tsx | Gestión vacaciones |
| DarAccesoSistemaDialog.tsx | Dialog crear acceso al sistema |
| FotoCropDialog.tsx | Dialog recorte foto |
| PdfPreviewDialog.tsx | Dialog preview PDF |

### `src/components/compras/` (41 archivos)

| Archivo | Qué hace |
|---------|----------|
| CrearOrdenCompraWizard.tsx | Wizard OC 4 pasos (3,015 lín) |
| OrdenesCompraTab.tsx | Tab órdenes compra (2,912 lín) |
| OrdenAccionesDialog.tsx | Dialog acciones OC (2,321 lín) |
| ProveedoresTab.tsx | Tab proveedores (1,921 lín) |
| RegistrarRecepcionDialog.tsx | Dialog recepción mercancía (933 lín) |
| AdeudosProveedoresTab.tsx | Tab adeudos proveedores |
| CalendarioEntregasTab.tsx | Tab calendario entregas |
| ComprasAnalyticsTab.tsx | Tab analytics compras |
| DevolucionesFaltantesTab.tsx | Tab devoluciones y faltantes |
| DevolucionesPendientesTab.tsx | Tab devoluciones pendientes |
| FaltantesPendientesTab.tsx | Tab faltantes pendientes |
| HistorialComprasProductoTab.tsx | Tab historial por producto |
| SugerenciasReabastecimientoTab.tsx | Tab sugerencias reabastecimiento |
| CreditosPendientesPanel.tsx | Panel créditos pendientes |
| ProveedorProductosSelector.tsx | Selector productos proveedor |
| ProveedorFacturasDialog.tsx | Dialog facturas proveedor |
| CalendarioOcupacion.tsx | Calendario ocupación |
| AjustarCostosOCDialog.tsx | Dialog ajustar costos |
| AutorizacionOCDialog.tsx | Dialog autorización OC |
| ConciliacionRapidaDialog.tsx | Dialog conciliación rápida |
| ConciliarFacturaDialog.tsx | Dialog conciliar factura |
| ConvertirEntregasMultiplesDialog.tsx | Dialog dividir entregas |
| DividirEntregaDialog.tsx | Dialog dividir entrega |
| EnviarEvidenciasProveedorDialog.tsx | Dialog enviar evidencias |
| MarcarPagadoDialog.tsx | Dialog marcar pagado |
| ModificarProductosOCDialog.tsx | Dialog modificar productos OC |
| NotificarCambiosOCDialog.tsx | Dialog notificar cambios |
| ProcesarPagoOCDialog.tsx | Dialog procesar pago |
| ProgramarEntregasDialog.tsx | Dialog programar entregas |
| ReenviarOCDialog.tsx | Dialog reenviar OC |
| RecepcionDetalleDialog.tsx | Dialog detalle recepción |
| CuentaCorrienteProveedorDialog.tsx | Dialog cuenta corriente |
| OCAutorizadaAlert.tsx | Alerta OC autorizada |
| EvidenciaCapture.tsx | Captura evidencia fotográfica |
| EvidenciasGallery.tsx | Galería evidencias |
| DevolucionesEvidenciasGallery.tsx | Galería evidencias devolución |
| EntregasPopover.tsx | Popover entregas |
| EntregasDetallePopover.tsx | Popover detalle entrega |
| HistorialCorreosOC.tsx | Historial correos OC |
| OrdenCompraCardMobile.tsx | Card mobile OC |
| ProveedorCardMobile.tsx | Card mobile proveedor |

### `src/components/clientes/` (21 archivos)

| Archivo | Qué hace |
|---------|----------|
| ClientesListaJerarquica.tsx | Lista jerárquica con grupos |
| ClientesStatsBar.tsx | Barra stats clientes |
| ClientesMapaTab.tsx | Vista mapa clientes |
| CSFUploader.tsx | Uploader CSF con auto-parse |
| PuntoEntregaCard.tsx | Card punto de entrega |
| SucursalFormModal.tsx | Modal form sucursal |
| ClienteSucursalesDialog.tsx | Dialog sucursales |
| ClienteSucursalesMapDialog.tsx | Dialog mapa sucursales |
| ClienteProductosDialog.tsx | Dialog productos cliente |
| ClienteProductosTab.tsx | Tab productos frecuentes |
| ClienteProgramacionTab.tsx | Tab programación pedidos |
| ClienteCortesiasTab.tsx | Tab cortesías |
| ClienteCreditosExcepcionesTab.tsx | Tab excepciones crédito |
| ClienteCorreosManager.tsx | Manager correos cliente |
| ClienteUsuarioTab.tsx | Tab usuario portal |
| AuditoriaFiscalSheet.tsx | Sheet auditoría fiscal |
| AgruparClientesDialog.tsx | Dialog agrupar clientes |
| DetectarGruposDialog.tsx | Dialog detectar grupos |
| ImportarCatalogoAspelDialog.tsx | Dialog importar Aspel |
| ImportarSucursalesExcelDialog.tsx | Dialog importar sucursales Excel |
| CrearAccesoPortalDialog.tsx | Dialog crear acceso portal |

### `src/components/rutas/` (26 archivos)

| Archivo | Qué hace |
|---------|----------|
| PlanificadorRutas.tsx | Planificador de rutas |
| SugerirRutasAIDialog.tsx | Dialog sugerencias AI |
| RouteMapVisualization.tsx | Visualización mapa ruta |
| MapaGlobalSucursales.tsx | Mapa global sucursales |
| MapaRutaEnVivo.tsx | Mapa ruta en vivo |
| MonitoreoRutasTab.tsx | Tab monitoreo rutas |
| AsignacionesDelDiaTab.tsx | Tab asignaciones del día |
| DisponibilidadPersonalTab.tsx | Tab disponibilidad personal |
| AyudantesExternosTab.tsx | Tab ayudantes externos |
| ZonasTab.tsx | Tab zonas |
| VehiculosTab.tsx | Tab vehículos (1,460 lín, CRUD + OCR) |
| VehiculoCardMobile.tsx | Card mobile vehículo |
| RutaDetalleSheet.tsx | Sheet detalle ruta |
| RutaDetalleFullScreen.tsx | Vista fullscreen ruta |
| RutaMonitorCard.tsx | Card monitor ruta |
| RutaPrintTemplate.tsx | Template impresión ruta |
| PedidoPreviewPopover.tsx | Popover preview pedido |
| EditarRutaDialog.tsx | Dialog editar ruta |
| PosponerRutaDialog.tsx | Dialog posponer ruta |
| ReasignarPersonalDialog.tsx | Dialog reasignar personal |
| RutaKilometrajeDialog.tsx | Dialog kilometraje |
| EnviarMensajeChoferDialog.tsx | Dialog mensaje a chofer |
| PanelEnRuta.tsx | Panel ruta activa |
| GpsTrackingIndicator.tsx | Indicador GPS tracking |
| AlertasPanel.tsx | Panel alertas |
| AyudantesMultiSelect.tsx | Multi-select ayudantes |

### Otros dominios (resumen)

| Dominio | Archivos | Descripción |
|---------|----------|-------------|
| `correos/` | 15 | Bandeja Gmail, compose, procesar pedido email |
| `correos-v2/` | 4 | Nuevo diseño correos (AccountRail, EmailList, ThreadView, ContextPanel) |
| `cotizaciones/` | 11 | CRUD cotizaciones + envío + impresión |
| `configuracion/` | 11 | 7 tabs config + permisos + usuarios |
| `dashboard/` | 22 | Widgets: KPIs, mapas, gráficas, alertas, resúmenes |
| `facturas/` | 3 | NuevaFacturaDirecta, ProcesarSolicitud, SolicitudesAlmacen |
| `inventario/` | 4 | InventarioPorCategoria, cards mobile (lote, movimiento, categoría) |
| `remisiones/` | 2 | Impresión remisión + template |
| `precios/` | 1 + 3 shared | PrecioHistorialDialog + shared/ (ProductoBadges, PdfExportDialog, RevisionesPrecioPanel, ListaPreciosPdfButton) |
| `brand/` | 3 | AlmasaLoading, AlmasaLogo, AlmasaLogoBoot |
| `layout/` | 1 | PageHeader (componente canónico) |
| `assets/` | 4 | Generadores: AppIcon, Splash, Screenshot, AppStore |
| `analytics/` | 1 | ClienteHistorialAnalytics |
| `fumigaciones/` | 1 | FumigacionCardMobile |
| `lecaroz/` | 1 | LecarozPreviewModal |
| `rentabilidad/` | 1 | RentabilidadCardMobile |
| `productos/` | 2 | LotesDesglose, ProductoCardMobile |
| `ui/` | 53 | Componentes shadcn/ui (button, dialog, table, etc.) |

### Componentes raíz (`src/components/`)

| Archivo | Qué hace |
|---------|----------|
| Layout.tsx | Layout global con sidebar + mobile menu |
| ProtectedRoute.tsx | Guard de ruta por rol |
| GlobalSearch.tsx | Búsqueda global (Cmd+K) |
| QuickActions.tsx | Acciones rápidas admin/secretaria |
| UserPreferencesPopover.tsx | Popover preferencias usuario |
| CumpleanosBanner.tsx | Banner cumpleaños |
| PushNotificationsGate.tsx | Gate de permisos push |
| PushNotificationSetup.tsx | Setup push notifications |
| NotificacionesSistema.tsx | Centro notificaciones |

---

## 3. Hooks (`src/hooks/`)

| Archivo | Qué hace |
|---------|----------|
| usePermissions.ts | Hook centralizado permisos por rol (PERMISSION_MATRIX) |
| useUserRoles.ts | Roles del usuario + MODULE_PERMISSIONS + useModuleAccess |
| useModulePermissions.ts | Permisos por módulo desde DB |
| useCargaOperations.ts | 8 funciones atómicas carga/descarga (567 lín) |
| useListaPrecios.ts | Datos + filtros + stats lista precios (248 lín) |
| usePrecioEditor.ts | Edición precio + calculadora + nav (260 lín) |
| usePrecioHistorial.ts | Historial precios lazy-load (79 lín) |
| useOfflineSync.ts | Sync offline IndexedDB → Supabase |
| useOnlineStatus.ts | Detector online/offline |
| useNotificaciones.ts | Notificaciones por tipo y rol |
| useUnreadEmails.ts | Contador correos no leídos |
| useUnreadMessages.ts | Contador mensajes chat no leídos |
| useChoferGeolocation.ts | GPS tracking chofer (web + nativo) |
| useChoferUbicacionRealtime.ts | Ubicación chofer en tiempo real |
| useMonitoreoRutas.ts | Monitoreo rutas activas |
| useRouteNotifications.ts | Notificaciones de ruta |
| useBodegaAutoDetect.ts | Auto-detección bodega GPS/WiFi |
| useEstadoOperaciones.ts | Estado operaciones dashboard |
| useAlertasFlotilla.ts | Alertas de flotilla |
| useSolicitudesDescuento.ts | Solicitudes de descuento |
| useSolicitudesVenta.ts | Solicitudes venta mostrador |
| useGmailPermisos.ts | Permisos Gmail por cuenta |
| useSystemPresence.ts | Presencia de usuarios en sistema |
| useUserPreferences.ts | Preferencias del usuario |
| useCategorias.ts | Categorías canónicas de productos |
| useNetworkRetry.ts | Retry con backoff para network |
| useEmailKeyboard.ts | Shortcuts teclado correos |
| use-mobile.tsx | Detector mobile/desktop |
| use-toast.ts | Hook para toasts (sonner) |

---

## 4. Libs, Utils, Services, Constants

### `src/lib/`

| Archivo | Qué hace |
|---------|----------|
| utils.ts | cn() de shadcn + formatCurrency |
| calculos.ts | calcularDesgloseImpuestos, validarAntesDeGuardar, redondear |
| pedidoUtils.ts | calcularTotalesPedido (extraído M04.5B.3.1) |
| offlineQueue.ts | IndexedDB: almasa-offline-queue (borradores + pedidos_pendientes) |
| generarContratoPDF.ts | PDF contrato laboral + aviso privacidad + addendum |
| generarNotaPDF.ts | PDF nota interna + confirmación cliente |
| emailBienvenida.ts | Template email bienvenida empleado |
| emailTemplates.ts | Templates email transaccionales |
| emailNotificationsUtils.ts | Utilidades envío email |
| notificarVendedores.ts | Notificar vendedores de cambios |
| gmailApiClient.ts | Cliente Gmail API |
| creditoUtils.ts | Utilidades de crédito (labels, estados) |
| productUtils.ts | getDisplayName, unidades SAT/producto |
| proveedorUtils.ts | Utilidades proveedor (formato MAYÚSCULAS) |
| auditoria-pedidos.ts | captureDeviceInfo, getPublicIP |
| mock-emails.ts | Emails de prueba |

### `src/utils/`

| Archivo | Qué hace |
|---------|----------|
| listaPreciosPdfGenerator.ts | Genera PDF lista precios (cliente + interna) |
| cotizacionPdfGenerator.ts | Genera PDF cotización |
| recepcionPdfGenerator.ts | Genera PDF recepción |
| ordenPagoPdfGenerator.ts | Genera PDF orden de pago |
| cierreOCPdfGenerator.ts | Genera PDF cierre OC |
| exportData.ts | Export a Excel |

### `src/services/`

| Archivo | Qué hace |
|---------|----------|
| pushNotifications.ts | FCM push (registro, listeners, save token) |
| backgroundGeolocation.ts | GPS background (Capacitor nativo) |
| autoCompleteRoute.ts | Autocomplete rutas Google |
| pushDiagnostics.ts | Diagnóstico push notifications |

### `src/constants/`

| Archivo | Qué hace |
|---------|----------|
| catalogoSAT.ts | Catálogo regímenes fiscales SAT |
| companyData.ts | Datos empresa hardcoded (ALMASA) |

### `src/integrations/supabase/`

| Archivo | Qué hace |
|---------|----------|
| client.ts | Cliente Supabase inicializado |
| types.ts | Tipos auto-generados (7,260 lín) |

---

## 5. Supabase

### Migraciones (371 archivos)

Rango: `20251125` (25 nov 2025) → `20260423` (23 abr 2026) — 5 meses de desarrollo.

Migraciones destacadas:

| Archivo | Qué hace |
|---------|----------|
| 20251125201825_...sql | Schema inicial (tablas core, RLS, triggers, funciones) |
| 20260326000000_alinear_bd_con_codigo.sql | Alineación masiva BD ↔ código (13 políticas USING true) |
| 20260422000000_folio_pedido_rpc_rls_detalles.sql | RPC generar_folio_pedido + RLS pedidos_detalles (M04.5A) |
| 20260422190000_blindaje_reducido_m04_6b.sql | Blindaje RLS + role guards RPCs (M04.6b) |
| 20260423100000_rpc_registrar_baja_caducidad.sql | RPC atómica baja caducidad (pendiente aplicar) |

### Edge Functions (53 directorios)

| Función | Qué hace |
|---------|----------|
| create-user | Crear usuario auth + profile + role |
| create-client-user | Crear usuario portal cliente |
| delete-user | Eliminar usuario |
| reset-user-password | Resetear contraseña |
| lookup-login-user | Buscar usuario para login |
| timbrar-cfdi | Timbrar CFDI vía Facturama (legacy) |
| cancelar-cfdi | Cancelar CFDI SAT |
| descargar-cfdi | Descargar XML/PDF CFDI |
| parse-cfdi-xml | Parsear XML CFDI |
| parse-csf | Parsear CSF (OCR) |
| parse-excel-order | Parsear pedido desde Excel |
| parse-order-email | Parsear pedido desde email |
| gmail-api | Operaciones Gmail |
| gmail-auth | Auth Gmail OAuth2 |
| gmail-callback | Callback Gmail OAuth |
| geocode-addresses | Geocodificar direcciones |
| get-place-details | Detalles Google Places |
| get-route-directions | Direcciones Google |
| google-places-autocomplete | Autocomplete Google |
| lookup-postal-code | Lookup código postal |
| send-push-notification | Push notification FCM |
| send-welcome-email | Email bienvenida |
| send-client-notification | Notificación a cliente |
| send-delivery-confirmation | Confirmación entrega |
| send-invoice-email | Email factura |
| send-order-authorized-email | Email pedido autorizado |
| send-secretary-notification | Notificación a secretaria |
| send-checkup-report | Reporte checkup vehículo |
| send-chofer-route-email | Email ruta a chofer |
| enviar-pedido-interno | Pedido interno email |
| suggest-routes | Sugerencias AI rutas |
| generate-truck-design | Diseño camioneta |
| zk-attendance | Integración ZKTeco asistencia |
| resumen-diario | Resumen diario automático |
| normalize-product | Normalizar datos producto |
| migrate-proveedor-addresses | Migrar direcciones proveedor |
| auto-reschedule-deliveries | Re-agendar entregas |
| analyze-employee-file-bundle | Análisis AI expediente |
| extract-tarjeta-circulacion | OCR tarjeta circulación |
| extract-factura-vehiculo | OCR factura vehículo |
| extract-placas-vehiculo | OCR placas |
| extract-license-expiry | Extraer vencimiento licencia |
| check-caducidad-fumigacion | Check caducidad fumigación |
| check-invoice-expiry-reminders | Recordatorios vencimiento factura |
| check-vehicle-documents-expiry | Check vencimiento docs vehículo |
| notificar-cancelacion-descarga | Notificar cancelación |
| notificar-cierre-oc | Notificar cierre OC |
| notificar-entrega-vendedor | Notificar entrega al vendedor |
| notificar-entregas-programadas | Notificar entregas programadas |
| notificar-faltante-anticipado | Notificar faltante anticipado |
| notificar-faltante-oc | Notificar faltante OC |
| notificar-pedidos-programados | Notificar pedidos programados |
| notificar-solicitud-deposito | Notificar solicitud depósito |

---

## 6. Documentos (`docs/`)

| Archivo | Qué hace |
|---------|----------|
| DESIGN-CANON-ALMASA.md | Estándar visual oficial v1.0 |
| REWRITE-PLAN-v1.0.md | Plan rewrite arquitectónico (15 días) |
| MAPA-MAESTRO-ALMASA-OS.html | Mapa visual completo del sistema |
| AUDIT-ESTETICO-PURO.html | Audit estilos visuales (3 estilos detectados) |
| AUDIT-VISUAL-DIVERGENCIAS.html | Audit funciones duplicadas (10 funciones, 27 implementaciones) |
| auditoria-global-20260422.md | Auditoría global roles + arquitectura |
| auditoria/inventario-pantallas.md | Catálogo 42 rutas + 188 componentes UI |
| auditoria/nuevo-cliente-comparativa.md | Comparativa admin vs vendedor nuevo cliente |
| auditoria/secretaria-panel.md | Auditoría 13 tabs secretaria |
| roadmap/orden-madurez-operativa.md | Madurez técnica (87% promedio) |
| roadmap/orden-madurez-REAL.md | Madurez operativa estricta (76.5% promedio) |
| lecciones/lista-precios-consolidacion.md | Por qué no consolidar 3 listas precios |
| contrato_template.txt | Template contrato laboral |
| aviso_privacidad.txt | Texto aviso privacidad |
| descripciones_puesto.txt | Descripciones de puesto ALMASA |

---

## 7. Configuración raíz

| Archivo | Qué hace |
|---------|----------|
| package.json | Dependencias: React 18, Supabase, Capacitor 7, shadcn, TanStack Query, Zod, Recharts, jsPDF |
| tailwind.config.ts | Tema: crimson/ink/warm, serif/sans/mono, sombras soft |
| vite.config.ts | Config Vite + path aliases |
| tsconfig.json | Config TypeScript |
| capacitor.config.ts | Config Capacitor (iOS/Android) |
| playwright.config.ts | Config Playwright (tests, no usados) |
| eslint.config.js | ESLint flat config |
| postcss.config.js | PostCSS + Tailwind |
| components.json | Config shadcn/ui |

---

## 8. Qué NO existe

| Ausencia | Notas |
|----------|-------|
| Tests unitarios | Playwright configurado pero sin tests escritos |
| Storybook | No hay |
| CI/CD | No hay pipeline (deploy manual vía Lovable) |
| Logging centralizado | Solo console.error dispersos |
| Monitoring (Sentry, etc.) | No hay |
| Feature flags | No hay |
| Changelog automatizado | No hay |
| API docs (Swagger) | No hay (Edge Functions sin documentar) |
| Seed data | No hay script de datos de prueba |
| Integración Aspel | Planeada, no iniciada |
