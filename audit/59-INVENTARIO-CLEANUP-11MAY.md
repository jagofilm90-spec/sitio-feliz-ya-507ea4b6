# Inventario Cleanup ALMASA-OS — 11 Mayo 2026

## Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| Total rutas App.tsx | 68 |
| Total archivos src/pages/ | 66 |
| Páginas huérfanas | **0** |
| Componentes huérfanos | **30** |
| Hooks huérfanos | **1** |
| TypeScript errores | **0** |
| Imports rotos | **0** |
| Total components | 453 |
| Total hooks | 50 |
| Total edge functions | 77 |
| Total migrations | 360 |
| LoC en pages/ | 25,816 |

---

## Rutas Registradas (68)

| Ruta | Componente | Roles | LoC |
|------|-----------|-------|-----|
| / | Navigate → /auth | — | — |
| /landing | LandingAlmasa | público | 389 |
| /auth | Auth | público | 431 |
| /reset-password | ResetPassword | público | — |
| /mi-perfil | MiPerfil | todos | 168 |
| /dashboard | Dashboard | admin,sec,vend,cont | 270 |
| /dashboard-ejecutivo | DashboardEjecutivo | admin,cont | 185 |
| /josan | Josan | admin,sec,cont | 162 |
| /productos | Productos | admin,sec,cont | 1,281 |
| /productos/modo-cobro | ProductosModoCobro | admin | 511 |
| /productos/historial-precios | ProductosHistorialPrecios | admin | 468 |
| /clientes | Clientes | admin,sec,vend | 471 |
| /clientes/nuevo | NuevoCliente | admin,sec,vend | 745 |
| /clientes/:id | DetalleCliente | admin,sec,vend | 482 |
| /clientes/:id/editar | EditarCliente | admin,sec,vend | 596 |
| /pedidos | Pedidos | admin,sec,vend | 1,132 |
| /inventario | Inventario | admin,sec,alm,g_alm | 1,299 |
| /rutas | Rutas | admin,sec | 649 |
| /cartas-porte | CartasPorte | admin,sec | 180 |
| /cartas-porte/:id | CartaPorteDetalle | admin,sec | 339 |
| /la-corona | LaCorona | admin | 307 |
| /conteos-ciegos | ConteosCiegos | admin,alm,g_alm | 146 |
| /conteos-ciegos/:id | RealizarConteo | admin,alm,g_alm | 170 |
| /facturas | Facturas | admin,sec,cont | 496 |
| /notas-credito | NotasCredito | admin,sec,cont | 85 |
| /complementos-pago | ComplementosPago | admin,sec,cont | 84 |
| /cobranza | Cobranza | admin,sec,cont | 167 |
| /portal-cliente | PortalCliente | cliente | 423 |
| /empleados | Empleados | admin,sec,cont | 3,126 |
| /asistencia | Asistencia | admin,sec | 85 |
| /vehiculos | VehiculosPage | admin,sec,g_alm | — |
| /usuarios | Navigate → /configuracion | — | — |
| /chat | Chat | admin,sec,vend,cont,alm,g_alm | 1,295 |
| /compras | Compras | admin,sec,cont | 206 |
| /compras/nueva-oc-v3 | NuevaOCv3 | admin,sec | 236 |
| /compras/proveedores-v3 | ProveedoresV3 | admin,sec,cont | 247 |
| /compras/proveedores-v3/:id | ProveedorDetalle | admin,sec,cont | 156 |
| /rentabilidad | Rentabilidad | admin,cont | 345 |
| /fumigaciones | Fumigaciones | admin,sec,alm,g_alm | 357 |
| /correos | CorreosV2 | admin,sec | 243 |
| /correos/config | CorreosCorporativos | admin,sec | 481 |
| /generate-assets | GenerateAssets | admin | 57 |
| /tarjeta | TarjetaDigital | público | 257 |
| /privacidad | Privacidad | público | 217 |
| /soporte | Soporte | público | 222 |
| /disenos-camioneta | DisenosCamioneta | público | 262 |
| /permisos | Permisos | admin | — |
| /respaldos | Respaldos | admin | 341 |
| /almacen-tablet | AlmacenTablet | admin,alm,g_alm | 412 |
| /almacen-tablet/carga-scan/:id? | AlmacenCargaScan | admin,alm,g_alm | 1,362 |
| /almacen-tablet/surtir/:id | SurtirPedido | admin,alm,g_alm | 273 |
| /chofer | ChoferPanel | admin,chofer | 282 |
| /chofer/mi-ruta | MiRutaHoy | admin,chofer | 82 |
| /chofer/entrega/:id | EntregaDetalle | admin,chofer | 238 |
| /vendedor | VendedorPanel | admin,vend | 509 |
| /vendedor/analisis | VendedorAnalisisVentas | admin,vend | 75 |
| /precios | Precios | admin,sec,vend | — |
| /secretaria | SecretariaPanel | admin,sec | 322 |
| /app-mobile | AppMobileGuide | público | 688 |
| /test-firma | TestFirma | admin | 198 |
| /configuracion | Configuracion | admin,cont,g_alm | 218 |
| /push-diagnostics | PushDiagnosticsPage | admin | 87 |
| /lecaroz/cotizaciones | LecarozCotizaciones | admin,sec,vend,cont | 244 |
| /lecaroz/cotizaciones/:id | LecarozCotizacionEditor | admin,sec,vend,cont | 400 |
| /lecaroz/bandeja | LecarozBandeja | admin,sec,vend | 500 |
| * | NotFound | — | — |

---

## Páginas Huérfanas

**0** — Todas las páginas en src/pages/ están registradas como rutas.

---

## Componentes Huérfanos (30)

### Candidatos a eliminar (no referenciados en ningún import):

**Negocio (14):**
- `NavLink.tsx` — componente navegación no usado
- `QuickActions.tsx` — acciones rápidas abandonadas
- `admin/SolicitudesDescuentoPanel.tsx` — feature descuentos no integrada
- `almacen/BusquedaLlegadaAnticipada.tsx` — búsqueda no usada
- `almacen/CargaProductosChecklist.tsx` — checklist viejo
- `almacen/CargaResumenFinal.tsx` — resumen viejo
- `clientes/ClienteCortesiasTab.tsx` — tab cortesías no integrado
- `clientes/ClienteCreditosExcepcionesTab.tsx` — tab créditos no integrado
- `clientes/ClienteProgramacionTab.tsx` — tab programación no integrado
- `clientes/ClienteSucursalesDialog.tsx` — dialog sucursales
- `clientes/ClienteSucursalesMapDialog.tsx` — mapa sucursales
- `clientes/ClienteUsuarioTab.tsx` — tab usuario no integrado
- `clientes/CrearAccesoPortalDialog.tsx` — acceso portal no integrado
- `compras/EntregasDetallePopover.tsx` — popover detalle

**LA CORONA (2) — pueden ser usados indirectamente:**
- `la-corona/HojaFisicaUpload.tsx` — podría estar referenciado dinámicamente
- `la-corona/TimelineMomentos.tsx` — podría estar referenciado dinámicamente

**Otros (4):**
- `cotizaciones/EnviarCotizacionesMultiplesDialog.tsx`
- `dashboard/DocumentosPendientesAlert.tsx`
- `pedidos/HojaCargaUnificadaTemplate.tsx`
- `rutas/RutaDetalleSheet.tsx`
- `secretaria/PedidoCardMobileSecretaria.tsx`
- `vendedor/VendedorBorradoresTab.tsx`

**UI primitivos shadcn (10) — NO eliminar (pueden usarse en futuro):**
- `ui/aspect-ratio.tsx`
- `ui/carousel.tsx`
- `ui/context-menu.tsx`
- `ui/hover-card.tsx`
- `ui/input-otp.tsx`
- `ui/navigation-menu.tsx`
- `ui/page-header.tsx`
- `ui/resizable.tsx`

---

## Hooks Huérfanos (1)

- `src/hooks/useRemision.ts` — creado en M08 pero no importado en ninguna página aún

---

## Top 5 páginas más grandes (candidatas a refactor)

| Archivo | LoC | Nota |
|---------|-----|------|
| Empleados.tsx | 3,126 | Monolito — candidato #1 split |
| AlmacenCargaScan.tsx | 1,362 | Complejo pero funcional |
| Inventario.tsx | 1,299 | Grande pero organizado |
| Chat.tsx | 1,295 | Mensajería interna completa |
| Productos.tsx | 1,281 | Catálogo completo |

---

## Recomendaciones FASE 1 (KILL obvios)

1. **14 componentes negocio huérfanos** — eliminar (sin impacto)
2. **1 hook huérfano** (useRemision) — integrar o eliminar
3. **UI primitivos** — mantener (shadcn standard)

## Recomendaciones FASE 2 (REFACTOR)

1. **Empleados.tsx** (3,126 LoC) → split en tabs/componentes
2. **AlmacenCargaScan.tsx** (1,362 LoC) → extraer pasos a componentes

---

---

## FASE 1 — Ejecutada 11 mayo 2026

### Eliminados (10 archivos, ~2,258 LoC)

| Archivo | LoC | Categoría |
|---------|-----|-----------|
| almacen/BusquedaLlegadaAnticipada.tsx | 426 | V1 reemplazada por AlmacenCargaScan |
| almacen/CargaProductosChecklist.tsx | 351 | V1 reemplazada por SurtirPedido V2 |
| almacen/CargaResumenFinal.tsx | 145 | Par del anterior |
| compras/EntregasDetallePopover.tsx | 283 | Reemplazado |
| pedidos/HojaCargaUnificadaTemplate.tsx | 257 | Reemplazada por Hoja Salida V4 |
| NavLink.tsx | 28 | Wrapper innecesario |
| QuickActions.tsx | 77 | Nunca montado |
| admin/SolicitudesDescuentoPanel.tsx | 571 | Feature no integrada |
| dashboard/DocumentosPendientesAlert.tsx | 70 | Nunca montado |
| hooks/useRemision.ts | 50 | Sin UI consumidora |

### Verificaciones
- Verificación pre-eliminación: 10/10 con 0 referencias
- TypeScript: 0 errores
- Build producción: pasa (25.64s)
- 0 referencias rotas

### Bitácora
Todos los 10 archivos se eliminaron sin incidentes.

*Cleanup FASE 1 completa: -2,258 LoC código muerto*
