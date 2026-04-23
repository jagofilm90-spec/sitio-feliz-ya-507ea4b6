# INVENTARIO COMPLETO DE PANTALLAS ALMASA-OS
**Fecha:** 22 abril 2026 | **Total rutas:** 42 | **Total componentes UI:** 188

---

## 1. MAPA DE RUTAS (A.1)

### Rutas públicas (sin protección)

| Path | Componente | Archivo |
|------|-----------|---------|
| `/landing` | LandingAlmasa | src/pages/LandingAlmasa.tsx |
| `/auth` | Auth | src/pages/Auth.tsx |
| `/reset-password` | ResetPassword | src/pages/ResetPassword.tsx |
| `/portal-cliente` | PortalCliente | src/pages/PortalCliente.tsx |
| `/tarjeta` | TarjetaDigital | src/pages/TarjetaDigital.tsx |
| `/privacidad` | Privacidad | src/pages/Privacidad.tsx |
| `/soporte` | Soporte | src/pages/Soporte.tsx |
| `/disenos-camioneta` | DisenosCamioneta | src/pages/DisenosCamioneta.tsx |
| `/app-mobile` | AppMobileGuide | src/pages/AppMobileGuide.tsx |

### Rutas protegidas — Páginas principales

| Path | Componente | Roles | Tabs |
|------|-----------|-------|------|
| `/dashboard` | Dashboard | admin, secretaria, vendedor, contadora | Collapsible sections (no tabs) |
| `/productos` | Productos | admin, secretaria, contadora | 2 vistas (activos/inactivos toggle) |
| `/productos/modo-cobro` | ProductosModoCobro | admin | — |
| `/productos/historial-precios` | ProductosHistorialPrecios | admin | — |
| `/clientes` | Clientes | admin, secretaria, vendedor | 2 vistas (lista/mapa toggle) |
| `/clientes/nuevo` | NuevoCliente | admin, secretaria, vendedor | — |
| `/clientes/:id` | DetalleCliente | admin, secretaria, vendedor | — |
| `/clientes/:id/editar` | EditarCliente | admin, secretaria, vendedor | — |
| `/pedidos` | Pedidos | admin, secretaria, vendedor | 5 tabs: alertas, pedidos, cotizaciones, análisis, calendario |
| `/inventario` | Inventario | admin, secretaria, almacen, gerente_almacen | 4 tabs: productos, lotes, movimientos, categoría |
| `/rutas` | Rutas | admin, secretaria | — |
| `/facturas` | Facturas | admin, secretaria, contadora | — |
| `/empleados` | Empleados | admin, secretaria, contadora | 7 tabs por puesto |
| `/asistencia` | Asistencia | admin, secretaria | 5 tabs: registros, semanal, quincenal, mensual, mapeo |
| `/vehiculos` | VehiculosPage | admin, secretaria, gerente_almacen | — |
| `/compras` | Compras | admin, secretaria, contadora | 8 tabs: proveedores, órdenes, calendario, devoluciones, historial, adeudos, sugerencias, analytics |
| `/rentabilidad` | Rentabilidad | admin, contadora | — |
| `/fumigaciones` | Fumigaciones | admin, secretaria, almacen, gerente_almacen | — |
| `/correos` | CorreosV2 | admin, secretaria | — |
| `/correos/config` | CorreosCorporativos | admin, secretaria | — |
| `/chat` | Chat | admin, secretaria, vendedor, contadora, almacen, gerente_almacen | — |
| `/precios` | Precios | admin, secretaria, vendedor | Vista condicional por rol |
| `/mi-perfil` | MiPerfil | todos (7 roles) | — |
| `/configuracion` | Configuracion | admin, contadora, gerente_almacen | 7 secciones |
| `/permisos` | Permisos | admin | — |
| `/respaldos` | Respaldos | admin | — |

### Rutas protegidas — Paneles por rol

| Path | Componente | Roles | Tabs |
|------|-----------|-------|------|
| `/vendedor` | VendedorPanel | admin, vendedor | 10 tabs |
| `/vendedor/analisis` | VendedorAnalisisVentas | admin, vendedor | — |
| `/secretaria` | SecretariaPanel | admin, secretaria | 13 tabs |
| `/almacen-tablet` | AlmacenTablet | admin, almacen, gerente_almacen | 14 tabs (8 base + 6 flotilla) |
| `/almacen-tablet/carga-scan/:pedidoId?` | AlmacenCargaScan | admin, almacen, gerente_almacen | — |
| `/chofer` | ChoferPanel | admin, chofer | Vista única modal |

### Rutas protegidas — Lecaroz

| Path | Componente | Roles |
|------|-----------|-------|
| `/lecaroz/cotizaciones` | LecarozCotizaciones | admin, secretaria, vendedor, contadora |
| `/lecaroz/cotizaciones/:id` | LecarozCotizacionEditor | admin, secretaria, vendedor, contadora |
| `/lecaroz/bandeja` | LecarozBandeja | admin, secretaria, vendedor |

### Rutas protegidas — Admin tools

| Path | Componente | Roles |
|------|-----------|-------|
| `/generate-assets` | GenerateAssets | admin |
| `/push-diagnostics` | PushDiagnosticsPage | admin |
| `/test-firma` | TestFirma | admin |

---

## 2. INVENTARIO POR FUNCIÓN DE NEGOCIO (A.2)

### Función: Crear Nuevo Pedido

| Rol | Archivo | Tipo UI | Líneas |
|-----|---------|---------|--------|
| Admin/Secretaria | src/components/pedidos/NuevoPedidoDialog.tsx | Dialog modal | 1,013 |
| Vendedor | src/components/vendedor/VendedorNuevoPedidoTab.tsx + pedido-wizard/*.tsx | Wizard 4 pasos fullscreen | 1,251 + ~1,600 |
| Cliente portal | src/components/cliente/ClienteNuevoPedido.tsx | Page con secciones | 943 |

### Función: Listar Pedidos

| Rol | Archivo | Tipo UI |
|-----|---------|---------|
| Admin | src/pages/Pedidos.tsx (tab "pedidos") | Page con tabs |
| Secretaria | src/components/secretaria/SecretariaPedidosTab.tsx | Tab en panel |
| Vendedor | src/components/vendedor/VendedorPedidosTab.tsx | Tab en panel |
| Cliente | src/components/cliente/ClientePedidos.tsx | Tab en portal |

### Función: Ver Detalle de Pedido

| Rol | Archivo | Tipo UI |
|-----|---------|---------|
| Admin | src/components/pedidos/PedidoDetalleDialog.tsx | Dialog |
| Vendedor | src/components/vendedor/PedidoDetalleVendedorDialog.tsx | Dialog |

### Función: Autorizar Precios / Pedidos

| Rol | Archivo | Tipo UI |
|-----|---------|---------|
| Admin | src/pages/Pedidos.tsx (tab "por-autorizar") + AutorizacionRapidaSheet | Page tab + Sheet |
| Secretaria | Via SecretariaPedidosTab | Tab en panel |

### Función: Crear Nuevo Cliente

| Rol | Archivo | Tipo UI |
|-----|---------|---------|
| Admin/Secretaria | src/pages/clientes/NuevoCliente.tsx | Page completa |
| Vendedor | src/components/vendedor/VendedorNuevoClienteSheet.tsx | Sheet lateral |

### Función: Listar Clientes

| Rol | Archivo | Tipo UI |
|-----|---------|---------|
| Admin/Secretaria | src/pages/Clientes.tsx | Page con lista/mapa |
| Secretaria | src/components/secretaria/SecretariaClientesTab.tsx | Tab en panel |
| Vendedor | src/components/vendedor/VendedorMisClientesTab.tsx | Tab en panel |

### Función: Ver/Editar Cliente

| Rol | Archivo | Tipo UI |
|-----|---------|---------|
| Admin/Secretaria | src/pages/clientes/DetalleCliente.tsx + EditarCliente.tsx | Page dedicada |
| Vendedor | src/components/vendedor/ClienteDetalleSheet.tsx + EditarClienteSheet.tsx | Sheet lateral |

### Función: Ver Lista de Precios

| Rol | Archivo | Tipo UI |
|-----|---------|---------|
| Admin | src/components/admin/AdminListaPreciosTab.tsx | Tab (via /precios) |
| Secretaria | src/components/secretaria/SecretariaListaPreciosTab.tsx | Tab en panel |
| Vendedor | src/components/vendedor/VendedorListaPreciosTab.tsx | Tab en panel |

### Función: Crear/Editar Producto

| Rol | Archivo | Tipo UI |
|-----|---------|---------|
| Admin/Secretaria | src/pages/Productos.tsx (inline dialog) | Dialog dentro de page |

### Función: Gestionar Inventario

| Rol | Archivo | Tipo UI |
|-----|---------|---------|
| Admin | src/pages/Inventario.tsx | Page con 4 tabs |
| Secretaria | src/components/secretaria/SecretariaInventarioTab.tsx | Tab en panel |
| Almacén | src/components/almacen/AlmacenInventarioTab.tsx | Tab en tablet |

### Función: Crear Orden de Compra

| Rol | Archivo | Tipo UI |
|-----|---------|---------|
| Admin/Secretaria | src/components/compras/CrearOrdenCompraWizard.tsx | Wizard |

### Función: Crear Nuevo Empleado

| Rol | Archivo | Tipo UI |
|-----|---------|---------|
| Admin | src/components/empleados/EmpleadoWizard.tsx | Wizard 4 pasos |

### Función: Ver Ficha Empleado

| Rol | Archivo | Tipo UI |
|-----|---------|---------|
| Admin | src/components/empleados/EmpleadoFicha.tsx | Fullscreen sidebar+tabs |

### Función: Registrar Asistencia

| Rol | Archivo | Tipo UI |
|-----|---------|---------|
| Admin/Secretaria | src/pages/Asistencia.tsx → AsistenciaView | Page con tabs |

### Función: Cargar Ruta (Almacén)

| Rol | Archivo | Tipo UI |
|-----|---------|---------|
| Almacén | src/components/almacen/AlmacenCargaRutasTab.tsx + CargaRutaInlineFlow.tsx | Tab + inline flow |
| Almacén | src/pages/AlmacenCargaScan.tsx | Page dedicada (escaneo) |

### Función: Entregar Pedido (Chofer)

| Rol | Archivo | Tipo UI |
|-----|---------|---------|
| Chofer | src/pages/ChoferPanel.tsx + RegistrarEntregaSheet | Panel + Sheet |

### Función: Facturar

| Rol | Archivo | Tipo UI |
|-----|---------|---------|
| Admin/Secretaria | src/components/pedidos/GenerarFacturaDialog.tsx | Dialog |
| Secretaria | src/components/secretaria/SecretariaFacturacionTab.tsx | Tab en panel |
| Admin/Secretaria | src/components/facturas/NuevaFacturaDirectaDialog.tsx | Dialog |

### Función: Cobrar Pedido

| Rol | Archivo | Tipo UI |
|-----|---------|---------|
| Vendedor | src/components/vendedor/RegistrarCobroPedidoDialog.tsx | Dialog |
| Vendedor | src/components/vendedor/VendedorCobranzaTab.tsx | Tab en panel |

### Función: Ver Correos

| Rol | Archivo | Tipo UI |
|-----|---------|---------|
| Admin/Secretaria | src/pages/CorreosV2.tsx | Page dedicada |
| Secretaria | src/components/secretaria/SecretariaCorreosTab.tsx | Tab en panel |

### Función: Cotizaciones Lecaroz

| Rol | Archivo | Tipo UI |
|-----|---------|---------|
| Admin/Secretaria/Vendedor | src/pages/LecarozCotizaciones.tsx | Page |
| Admin/Secretaria/Vendedor | src/pages/LecarozCotizacionEditor.tsx | Page editor |
| Admin/Secretaria/Vendedor | src/pages/LecarozBandeja.tsx | Page bandeja |

---

## 3. CATÁLOGO POR MÓDULO (A.3)

### M01 — Clientes
- **Principal:** `/clientes` (Clientes.tsx) — lista + mapa
- **CRUD:** `/clientes/nuevo`, `/clientes/:id`, `/clientes/:id/editar`
- **Vendedor:** VendedorMisClientesTab, ClienteDetalleSheet, EditarClienteSheet, VendedorNuevoClienteSheet
- **Secretaria:** SecretariaClientesTab
- **Acceso:** admin, secretaria, vendedor

### M02 — Productos y Precios
- **Principal:** `/productos` (Productos.tsx) — lista activos/inactivos
- **Precios:** `/precios` (Precios.tsx) — 3 vistas por rol (Admin/Secretaria/Vendedor)
- **Admin extras:** `/productos/modo-cobro`, `/productos/historial-precios`
- **Secretaria:** SecretariaProductosTab, SecretariaCostosTab, SecretariaListaPreciosTab
- **Vendedor:** VendedorListaPreciosTab
- **Acceso:** admin, secretaria, contadora (productos); + vendedor (precios)

### M04 — Pedidos
- **Principal:** `/pedidos` (Pedidos.tsx) — 5 tabs
- **Creación:** NuevoPedidoDialog (admin), VendedorNuevoPedidoTab (vendedor), ClienteNuevoPedido (portal)
- **Detalle:** PedidoDetalleDialog (admin), PedidoDetalleVendedorDialog (vendedor)
- **Edición:** EditarPedidoPendienteDialog, EditarPedidoRechazadoDialog
- **Autorización:** AutorizacionRapidaSheet
- **Secretaria:** SecretariaPedidosTab
- **Vendedor:** VendedorPedidosTab
- **Acceso:** admin, secretaria, vendedor, cliente (portal)

### M05 — Inventario
- **Principal:** `/inventario` (Inventario.tsx) — 4 tabs
- **Almacén:** AlmacenInventarioTab, AlmacenProductosTab
- **Secretaria:** SecretariaInventarioTab
- **Acceso:** admin, secretaria, almacen, gerente_almacen

### M06 — Empleados / RRHH / Asistencia
- **Empleados:** `/empleados` (Empleados.tsx) — 7 tabs por puesto
- **Ficha:** EmpleadoFicha.tsx — fullscreen con sidebar+tabs
- **Wizard:** EmpleadoWizard.tsx — alta 4 pasos
- **Asistencia:** `/asistencia` (Asistencia.tsx) — 5 tabs
- **Vehículos:** `/vehiculos` (VehiculosPage.tsx)
- **Acceso:** admin, secretaria, contadora (empleados); admin, secretaria (asistencia)

### M07 — Compras
- **Principal:** `/compras` (Compras.tsx) — 8 tabs
- **Wizard:** CrearOrdenCompraWizard.tsx
- **Secretaria:** Compras con mode="secretaria"
- **18 dialogs** de operaciones
- **Acceso:** admin, secretaria, contadora

### M08 — Facturación
- **Principal:** `/facturas` (Facturas.tsx)
- **Generación:** GenerarFacturaDialog, NuevaFacturaDirectaDialog
- **Secretaria:** SecretariaFacturacionTab
- **Acceso:** admin, secretaria, contadora

### M09 — Logística
- **Rutas:** `/rutas` (Rutas.tsx)
- **Almacén:** AlmacenCargaRutasTab, CargaRutaInlineFlow, AlmacenCargaScan
- **Chofer:** ChoferPanel + RegistrarEntregaSheet
- **Secretaria:** SecretariaRutasTab
- **Acceso:** admin, secretaria (rutas); almacen (carga); chofer (entrega)

### M10 — Contaduría / Pagos
- **Rentabilidad:** `/rentabilidad` (Rentabilidad.tsx)
- **Cobranza:** VendedorCobranzaTab, RegistrarCobroPedidoDialog
- **Pagos:** SecretariaPagosValidarTab
- **Acceso:** admin, contadora (rentabilidad); vendedor (cobranza)

### M11 — Portal Cliente
- **Portal:** `/portal-cliente` (PortalCliente.tsx) — 4 tabs
- **Componentes:** ClientePedidos, ClienteNuevoPedido, ClienteEstadoCuenta, ClienteEntregas
- **Acceso:** cliente (auth interna)

---

## 4. TIPOS DE UI (A.4)

| Tipo UI | Cantidad | Ejemplos |
|---------|----------|----------|
| **Dialogs** | 80 | NuevoPedidoDialog, PedidoDetalleDialog, GenerarFacturaDialog |
| **Tabs** | 72 | VendedorPedidosTab, SecretariaClientesTab, AlmacenInventarioTab |
| **Cards** | 23 | PedidoCardMobile, EmpleadoCard, RutaMonitorCard |
| **Sheets** | 11 | AutorizacionRapidaSheet, ClienteDetalleSheet, RegistrarEntregaSheet |
| **Pages** | 47 | Pedidos.tsx, Clientes.tsx, Dashboard.tsx |
| **Wizards** | 2 | EmpleadoWizard, CrearOrdenCompraWizard |
| **Inline Flows** | 2 | CargaRutaInlineFlow, VendedorNuevoPedidoTab (wizard integrado) |
| **Total** | **~188** | |

### Inconsistencias de tipo UI por función

| Función | Admin | Vendedor | Cliente |
|---------|-------|----------|---------|
| Crear pedido | Dialog | Wizard 4 pasos | Page secciones |
| Crear cliente | Page (/clientes/nuevo) | Sheet lateral | — |
| Ver cliente | Page (/clientes/:id) | Sheet lateral | — |
| Editar cliente | Page (/clientes/:id/editar) | Sheet lateral | — |
| Ver detalle pedido | Dialog | Dialog (distinto) | — |
| Lista precios | Tab (AdminListaPrecios) | Tab (VendedorListaPrecios) | — |

---

## 5. LAYOUTS Y WRAPPERS (A.5)

### Layout principal: src/components/Layout.tsx
- **Usado por:** TODAS las rutas protegidas excepto paneles de rol
- **Sidebar:** Categorized menu con 9 secciones, filtrado por checkAccess()
- **Mobile:** Hamburger menu overlay
- **Auto-redirect:** Redirige roles únicos a su panel dedicado

### Sidebars por rol
| Componente | Rol | Archivo |
|------------|-----|---------|
| VendedorSidebar | vendedor | src/components/vendedor/VendedorSidebar.tsx |
| SecretariaSidebar | secretaria | src/components/secretaria/SecretariaSidebar.tsx |
| AlmacenSidebar | almacen/gerente | src/components/almacen/AlmacenSidebar.tsx |

### Mobile navs por rol
| Componente | Rol | Archivo |
|------------|-----|---------|
| SecretariaMobileNav | secretaria | src/components/secretaria/SecretariaMobileNav.tsx |
| AlmacenMobileNav | almacen | src/components/almacen/AlmacenMobileNav.tsx |
| VendedorPanel bottom nav | vendedor | Inline en VendedorPanel.tsx |

### PageHeader compartido
- `src/components/layout/PageHeader.tsx` — usado en múltiples páginas para title + lead + actions

---

## 6. HALLAZGOS PRELIMINARES (A.6)

### A. Funciones duplicadas en 2+ archivos

| Función | Archivos | Duplicación |
|---------|----------|-------------|
| Crear pedido | 3 archivos (1,013 + 1,251 + 943 = 3,207 lín) | Cálculos ya consolidados (pedidoUtils.ts). UI genuinamente distinta. |
| Listar pedidos | 3 archivos (Pedidos.tsx + SecretariaPedidosTab + VendedorPedidosTab) | Queries similares, columnas distintas por rol. |
| Lista precios | 3 archivos (636 + 479 + 419 = 1,534 lín) | Badges+PDF extraídos. Hooks shared existentes. Columnas distintas. |
| Listar clientes | 3 archivos (Clientes.tsx + SecretariaClientesTab + VendedorMisClientesTab) | Queries distintas (todos vs asignados). |
| Ver inventario | 3 archivos (Inventario.tsx + SecretariaInventarioTab + AlmacenInventarioTab) | Cada uno tiene columnas/acciones distintas por rol. |
| Cobrar pedido | 2 archivos (RegistrarCobroPedidoDialog + VendedorCobranzaTab) | Dialog + Tab complementarios (no duplicados). |

### B. Inconsistencias de tipo UI

| Función | Inconsistencia |
|---------|---------------|
| Crear pedido | Dialog (admin) vs Wizard (vendedor) vs Page (cliente) |
| CRUD cliente | Pages (admin) vs Sheets (vendedor) |
| Ver detalle pedido | Dialog genérico (admin) vs Dialog específico (vendedor) |

### C. Rutas sin protección

| Ruta | Riesgo |
|------|--------|
| `/portal-cliente` | Auth manejado internamente, no via ProtectedRoute |
| `/tarjeta` | Público intencionalmente |
| `/privacidad`, `/soporte` | Público intencionalmente |

### D. Componentes con nombres similares

| Patrón | Archivos |
|--------|----------|
| PedidoDetalle* | PedidoDetalleDialog.tsx, PedidoDetalleVendedorDialog.tsx, PedidoDetalleProductCards.tsx |
| ClienteDetalle* | DetalleCliente.tsx (page), ClienteDetalleSheet.tsx (sheet) |
| NuevoCliente* | NuevoCliente.tsx (page), VendedorNuevoClienteSheet.tsx (sheet) |
| EditarCliente* | EditarCliente.tsx (page), EditarClienteSheet.tsx (sheet) |
| *FacturacionTab | SecretariaFacturacionTab.tsx (el único) |
| *CostosTab | SecretariaCostosTab.tsx (el único) |
