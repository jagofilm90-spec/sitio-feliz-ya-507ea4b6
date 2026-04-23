# AUDITORÍA VISUAL POR ROL — SECRETARIA
**Fecha:** 23 abril 2026 | **Panel:** /secretaria | **13 tabs** | **~5,583 líneas totales**

---

## 1. Resumen Ejecutivo

El SecretariaPanel es el panel más completo del sistema (13 tabs, ~5,583 líneas). Funciona como una réplica compacta del sistema admin con acceso restringido — la secretaria puede ver casi todo pero editar solo lo permitido. Los 13 tabs cubren: catálogo (productos, costos, precios), operaciones (pedidos, mostrador, clientes), logística (rutas), finanzas (compras, facturación, pagos), comunicación (correos, chat), e inventario. La madurez visual es alta: todos los tabs usan PageHeader, shadcn components, y paleta ink/crimson. Las principales inconsistencias son: 41 colores hardcoded en CostosTab, responsive incompleto en PedidosTab (tabla sin breakpoints), y el tab Chat es un placeholder de redirección (no embebido).

---

## 2. Mapa de los 13 Tabs

| # | Label | ID | Archivo | Líneas | Ícono | Badge |
|---|-------|----|---------|--------|-------|-------|
| 1 | Productos | productos | SecretariaProductosTab.tsx | 919 | Package | — |
| 2 | Costos | costos | SecretariaCostosTab.tsx | 932 | Coins | — |
| 3 | Lista de Precios | precios | SecretariaListaPreciosTab.tsx | 465 | DollarSign | — |
| 4 | Pedidos | pedidos | SecretariaPedidosTab.tsx | 232 | ClipboardList | ✅ pedidos por autorizar |
| 5 | Mostrador | mostrador | SolicitudesAlmacenTab.tsx | 289 | Store | ✅ ventas pendientes |
| 6 | Compras | compras | Compras.tsx (mode=secretaria) | shared | ShoppingCart | ✅ compras pendientes |
| 7 | Inventario | inventario | SecretariaInventarioTab.tsx | 357 | Warehouse | — |
| 8 | Facturación | facturacion | SecretariaFacturacionTab.tsx | 352 | FileText | ✅ facturas pendientes |
| 9 | Pagos | pagos_validar | SecretariaPagosValidarTab.tsx | 354 | CreditCard | ✅ pagos por validar |
| 10 | Chat | chat | Placeholder (redirect a /chat) | inline | MessageCircle | ✅ mensajes no leídos |
| 11 | Correos | correos | SecretariaCorreosTab.tsx | 83 | Mail | ✅ correos no leídos |
| 12 | Rutas | rutas | SecretariaRutasTab.tsx | 527 | Truck | — |
| 13 | Clientes | clientes | SecretariaClientesTab.tsx | 311 | Users | — |

**Tab por defecto:** Pedidos (id="pedidos")

**Navigation:** Desktop sidebar (SecretariaSidebar.tsx, 155 lín) + Mobile bottom nav (SecretariaMobileNav.tsx, 133 lín)

**Mobile nav:** 2 filas — primera fila: 5 tabs principales (pedidos, facturación, correos, chat, clientes); segunda fila: scrollable horizontal con los 8 restantes.

---

## 3. Ficha Detallada por Tab

### Tab 1: Productos (919 líneas)

**Propósito:** Catálogo completo de productos con edición inline vía dialog.

**Layout:** PageHeader → tabs activos/inactivos → búsqueda → tabla horizontal scrollable → dialog edición con prev/next.

**Data:** `productos` table (todos), sort por código asc.

**Acciones:** Buscar, filtrar activos/inactivos, editar producto (dialog con navegación prev/next), migración de productos (dialogs especiales).

**Componentes:** PageHeader, Tabs, Table, Dialog, Select, Switch, Badge, Card.

**Responsive:** ✅ Columnas ocultas en md/lg/sm (marca, presentación, IVA/IEPS).

**Cross-ref:** Admin usa `/productos` (Productos.tsx) con funcionalidad similar pero más features (modo cobro, historial precios).

**Madurez:** 🟢 Pulida — 21 colores hardcoded pero dentro del sistema de diseño.

---

### Tab 2: Costos (932 líneas)

**Propósito:** Análisis de costos y márgenes de productos con historial de cambios de costo.

**Layout:** PageHeader → búsqueda + categoría → 2 tabs (Análisis Margen + Historial) → tabla categorizada → dialog edición + simulador.

**Data:** `productos` (activo=true) + `productos_historial_costos` (límite 100) con joins a proveedores/profiles.

**Acciones:** Buscar, filtrar categoría, editar costo (dialog), simular precios, ver historial. Columnas condicionadas por `canSeeCosts` (usePermissions).

**Responsive:** ✅ Columnas ocultas en md/lg/sm.

**Cross-ref:** No tiene equivalente directo en admin (admin ve costos en `/productos`).

**Anomalías:** 41 colores hardcoded — el tab con más colores del panel. Mayormente badges de estado de margen (perdida/critico/bajo/saludable).

**Madurez:** 🟡 Funcional — complejidad alta (932 lín), muchos colores inline.

---

### Tab 3: Lista de Precios (465 líneas)

**Propósito:** Edición de precios de venta con calculadora de margen y historial.

**Layout:** Sticky header con PageHeader + búsqueda + categoría → RevisionesPrecioPanel → tabla desktop / cards mobile → dialogs edición/historial/PDF.

**Data:** Via hooks shared: `useListaPrecios`, `usePrecioEditor`, `usePrecioHistorial`.

**Acciones:** Buscar, filtrar categoría, editar precio (dialog con calculadora margen), navegar prev/next, ver historial, exportar PDF.

**Responsive:** ✅ Desktop table `hidden md:block` + mobile cards `md:hidden`. Dialog responsive.

**Cross-ref:** Admin (AdminListaPreciosTab 636 lín) tiene simulador + bulk update + Excel export. Vendedor (VendedorListaPreciosTab 419 lín) es read-only. Badges+PDF ya extraídos a shared (M04.5B.2).

**Madurez:** 🟢 Pulida — hooks shared bien diseñados, responsive completo.

---

### Tab 4: Pedidos (232 líneas)

**Propósito:** Lista de todos los pedidos con filtros por estado y acciones de PDF/edición.

**Layout:** PageHeader → 5 summary cards (por autorizar, pendientes, en ruta, entregados, cancelados) → búsqueda + status filter → tabla horizontal.

**Data:** `pedidos` (neq borrador, límite 200) con joins clientes/sucursales/vendedor. Refetch cada 30s.

**Acciones:** Click cards filtra estado, buscar folio/cliente/zona, ver PDF (PedidoPDFPreviewDialog), editar pendientes (EditarPedidoPendienteDialog con preciosDisabled).

**Columnas:** Folio, Cliente, Dirección, Zona, Vendedor, Fecha, Peso, Crédito, Total, Días, Estado, Acciones (12 columnas).

**Responsive:** ❌ Tabla fija sin breakpoints responsivos — scroll horizontal obligatorio.

**Cross-ref:** Admin (Pedidos.tsx 1,133 lín) tiene 5 tabs + cotizaciones + analytics + calendario. Vendedor (VendedorPedidosTab 735 lín) tiene solo sus pedidos.

**Anomalías:** No tiene responsive breakpoints en columnas (todas visibles siempre → scroll en mobile). Badge "EDITADO EN OFICINA" usa bg-blue-500 hardcoded.

**Madurez:** 🟡 Funcional — tabla no responsiva, scroll horizontal en mobile.

---

### Tab 5: Mostrador (289 líneas)

**Propósito:** Kanban de solicitudes de venta mostrador (monitoreo, no POS).

**Layout:** Alert banner (pendientes) → búsqueda → 4 columnas kanban (pendientes, listas, pagadas, entregadas) con ScrollArea.

**Data:** Via `useSolicitudesVenta` hook. Agrupado por status.

**Acciones:** Buscar por folio/producto, procesar y facturar (ProcesarSolicitudDialog), marcar entregada.

**Responsive:** ✅ Kanban: `grid-cols-1 lg:grid-cols-2 xl:grid-cols-4` — stack en mobile.

**Cross-ref:** Almacén (AlmacenVentasMostradorTab 1,253 lín) es POS completo con carrito, checkout, pago, decremento inventario. Secretaria solo monitorea y factura.

**Madurez:** 🟢 Pulida — kanban bien diseñado, responsive excelente.

---

### Tab 6: Compras (shared, mode=secretaria)

**Propósito:** Gestión de órdenes de compra (vista limitada vs admin).

**Layout:** Shared Compras.tsx con filtro de tabs por rol.

**Tabs visibles secretaria (5 de 8):** Proveedores, Órdenes, Calendario, Historial, Adeudos.
**Tabs ocultos:** Devoluciones/Faltantes, Sugerencias, Analytics (admin only).

**Default tab:** "ordenes" (admin default: "proveedores").

**Badge:** Solo adeudos (admin tiene 4 badges).

**Cross-ref:** Admin ve 8 tabs completos con analytics y sugerencias de reabastecimiento.

**Madurez:** 🟢 Pulida — reutiliza componente admin con filtrado limpio por rol.

---

### Tab 7: Inventario (357 líneas)

**Propósito:** Vista de stock, lotes y movimientos de inventario.

**Layout:** PageHeader → alerta stock bajo (Card amber) → 3 tabs (Stock, Lotes, Movimientos) → tabla por tab.

**Data:** `productos` (activo=true), `inventario_lotes` (qty > 0, límite 100), `inventario_movimientos` (límite 50).

**Acciones:** Buscar productos, ver stock/lotes/movimientos. No edita (view-only).

**Responsive:** ✅ Columnas ocultas en sm/md. Mobile: InventarioItemMobile cards.

**Cross-ref:** Admin (Inventario.tsx) tiene 4 tabs + ajuste de stock. Almacén (AlmacenInventarioTab) tiene ajuste de stock con `canAdjust`.

**Madurez:** 🟢 Pulida — alerta bien diseñada, responsive bueno.

---

### Tab 8: Facturación (352 líneas)

**Propósito:** Gestión de facturas: timbrar CFDI, descargar PDF, enviar por email.

**Layout:** PageHeader → filter tabs (Todas/Pendientes/Timbradas) → alerta pendientes → búsqueda → tabla facturas.

**Data:** `facturas` (límite 100) con joins clientes/pedidos. Refetch cada 30s.

**Acciones:** Filtrar por estado, buscar folio/cliente/pedido, timbrar (Edge Function timbrar-cfdi), descargar PDF, enviar email factura.

**Responsive:** ✅ Columnas ocultas en sm/md (pedido, fecha).

**Cross-ref:** Admin accede via `/facturas` (Facturas.tsx) con funcionalidad similar.

**Madurez:** 🟢 Pulida — flujo CFDI completo, loading states, toasts.

---

### Tab 9: Pagos (354 líneas)

**Propósito:** Validar pagos registrados por vendedores/choferes. Aprobar o rechazar.

**Layout:** PageHeader con count pendiente → ScrollArea con cards de pago → grid metadata → botones validar/rechazar/ver comprobante.

**Data:** `pagos_cliente` (status=pendiente, requiere_validacion=true) con joins clientes/profiles. State manual (no React Query).

**Acciones:** Validar pago (marca facturas como pagadas si cubre), rechazar pago (dialog confirmación), ver comprobante (link externo).

**Responsive:** ✅ Cards responsive, grid metadata `grid-cols-2`.

**Cross-ref:** No existe en admin — función exclusiva de secretaria.

**Anomalías:** Usa state manual en vez de React Query (inconsistente con otros tabs que sí usan useQuery).

**Madurez:** 🟢 Pulida — flujo de validación completo, diseño limpio con paleta ink.

---

### Tab 10: Chat (placeholder, inline en SecretariaPanel)

**Propósito:** Redirigir al chat completo en `/chat`.

**Layout:** Centrado vertical con icono MessageSquare + título serif + texto + botón crimson "Abrir chat".

**Data:** Badge unread count via `useUnreadMessages()`.

**Acciones:** Click botón → navigate("/chat").

**Cross-ref:** `/chat` es página compartida por 6 roles.

**Madurez:** 🟡 Funcional — es un placeholder, no un chat embebido.

---

### Tab 11: Correos (83 líneas)

**Propósito:** Bandeja de entrada de correos corporativos Gmail.

**Layout:** PageHeader con Mail icon → BandejaEntrada component (delegado completo).

**Data:** `gmail_cuentas` via React Query + useGmailPermisos.

**Acciones:** Delegadas a BandejaEntrada (leer, responder, componer).

**Responsive:** Depende de BandejaEntrada.

**Cross-ref:** Admin accede via `/correos` (CorreosV2) con funcionalidad idéntica.

**Madurez:** 🟢 Pulida — componente wrapper minimalista, UI real en BandejaEntrada.

---

### Tab 12: Rutas (527 líneas)

**Propósito:** Tracking en tiempo real de rutas + conciliación de papeles/entregas.

**Layout:** PageHeader → 4 tabs (En camino, Completadas, Por conciliar, Enviar conciliación) → RutaCard con stats grid + EntregaRow por entrega → dialogs conciliación.

**Data:** `rutas` con entregas/chofer/vehiculo. 2 queries: en_camino + completadas. Refetch cada 30s.

**Acciones:** Marcar papeles recibidos (checkbox), registrar devoluciones/faltantes (ConciliacionDetalleDialog), envío masivo (ConciliacionMasivaEnvio).

**Responsive:** ✅ Excelente — grid `grid-cols-2 sm:grid-cols-4`, text responsive.

**Badges:** En camino (rojo), Por conciliar (destructive), estado por entrega (emerald/amber/red).

**Cross-ref:** No tiene equivalente directo en admin — admin usa `/rutas` (Rutas.tsx) para planificación, secretaria para conciliación.

**Madurez:** 🟢 Pulida — el tab más completo operativamente, live tracking con auto-refetch.

---

### Tab 13: Clientes (311 líneas)

**Propósito:** Lista de clientes con filtro por vendedor y acceso rápido a ficha.

**Layout:** PageHeader con "Nuevo Cliente" action → 6 summary cards (Todos, Casa, top 4 vendedores) → búsqueda + vendor filter → tabla.

**Data:** `clientes` (activo=true) con joins profiles/zonas. Sort por nombre.

**Acciones:** Click cards filtra vendedor, buscar código/nombre/RFC, ver cliente (navigate a /clientes?cliente=id), crear nuevo (navigate a /clientes).

**Columnas:** Código, Cliente (con RFC), Vendedor (hidden md), Contacto (hidden lg), Saldo, Acciones.

**Responsive:** ✅ Columnas ocultas en md/lg.

**Cross-ref:** Admin usa `/clientes` (Clientes.tsx) con lista + mapa. Vendedor usa VendedorMisClientesTab (solo sus clientes).

**Madurez:** 🟢 Pulida — summary cards bien diseñadas, responsive correcto.

---

## 4. Resumen y Hallazgos

### Tabla resumen de madurez

| Tab | Líneas | Madurez | Issues principales |
|-----|--------|---------|-------------------|
| Productos | 919 | 🟢 | 21 colores inline |
| Costos | 932 | 🟡 | 41 colores inline, tab más complejo |
| Precios | 465 | 🟢 | — |
| Pedidos | 232 | 🟡 | Tabla sin responsive breakpoints |
| Mostrador | 289 | 🟢 | — |
| Compras | shared | 🟢 | — |
| Inventario | 357 | 🟢 | — |
| Facturación | 352 | 🟢 | — |
| Pagos | 354 | 🟢 | State manual vs React Query |
| Chat | inline | 🟡 | Placeholder, no embebido |
| Correos | 83 | 🟢 | — |
| Rutas | 527 | 🟢 | — |
| Clientes | 311 | 🟢 | — |

**Puntuación:** 10/13 🟢 Pulidas, 3/13 🟡 Funcionales, 0/13 🔴 Rotas.

### Top 5 inconsistencias

1. **PedidosTab sin responsive** — 12 columnas sin breakpoints, scroll horizontal obligatorio en mobile
2. **CostosTab: 41 colores hardcoded** — más del doble que cualquier otro tab
3. **Chat es placeholder** — no embebe Chat.tsx, solo redirige con botón
4. **PagosValidarTab usa state manual** — los demás tabs usan React Query con refetch
5. **Spacing mixto** — PageHeader spacing es consistente, pero dentro de tabs hay variación entre `p-3`, `p-4`, `px-4`, `px-6`

### Divergencias con otros roles

| Función | Secretaria | Admin | Diferencia |
|---------|-----------|-------|------------|
| Pedidos | SecretariaPedidosTab (232 lín) | Pedidos.tsx (1,133 lín, 5 tabs) | Admin: cotizaciones, analytics, calendario. Secretaria: lista simple. |
| Productos | SecretariaProductosTab (919 lín) | Productos.tsx (~1,256 lín) | Similar funcionalidad, ambos con edición. Admin: modo cobro + historial. |
| Mostrador | SolicitudesAlmacenTab (289 lín, kanban read-only) | AlmacenVentasMostradorTab (1,253 lín, POS completo) | Secretaria monitorea; almacén opera. |
| Compras | 5 tabs (sin analytics/sugerencias) | 8 tabs completos | Admin tiene 3 tabs extra de análisis. |
| Precios | Edición con calculadora | Edición + simulador + bulk + Excel | Admin tiene features avanzadas. |

### Recomendaciones priorizadas

**P1 (urgente):**
- Agregar responsive breakpoints a PedidosTab — ocultar columnas Dirección, Zona, Vendedor, Peso, Crédito, Días en mobile

**P2 (medio):**
- Migrar PagosValidarTab de state manual a React Query (consistencia con otros tabs)
- Reducir colores hardcoded en CostosTab (extraer a constantes o CSS vars)

**P3 (bajo):**
- Embeber Chat dentro del panel en vez de placeholder de redirección
- Estandarizar spacing interno de tabs (p-3 vs p-4 vs px-4)
