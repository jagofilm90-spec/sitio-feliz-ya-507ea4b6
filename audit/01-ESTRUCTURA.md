# AUDITORÍA ALMASA-OS — 01 ESTRUCTURA
**Fecha**: 8 mayo 2026
**Total líneas de código frontend**: 201,779

---

## A) Árbol de directorios (profundidad 4, sin node_modules/dist/.git)

```
almasa-erp/ (24 files)
├── 🟢 src/ (6 files)
│   ├── 🟢 pages/ (50 files) — Todas las rutas principales
│   │   └── 🟢 clientes/ (3 files) — Sub-rutas cliente
│   ├── 🟢 components/ (15 files raíz)
│   │   ├── 🟢 admin/ (4 files) — Admin-specific tabs
│   │   ├── 🟢 almacen/ (41 files) — Tablet almacén completo
│   │   ├── 🟢 asistencia/ (7 files) — Biométricos + reportes
│   │   ├── 🟢 chofer/ (6 files) — Panel chofer mobile
│   │   ├── 🟢 cliente/ (4 files) — Portal cliente
│   │   ├── 🟢 clientes/ (21 files) — Gestión clientes admin
│   │   ├── 🟢 compras/ (41 files) — OC, proveedores, recepciones
│   │   │   └── 🟢 oc-v3/ (6 files) — Wizard OC nuevo
│   │   ├── 🟢 configuracion/ (11 files) — Settings sistema
│   │   ├── 🟢 correos/ (15 files) — Email client completo
│   │   ├── 🟡 correos-v2/ (4 files) — Versión 2 correos
│   │   ├── 🟢 cotizaciones/ (11 files) — Cotizaciones
│   │   ├── 🟢 dashboard/ (23 files) — KPIs + widgets
│   │   ├── 🟢 empleados/ (17 files) — RRHH completo
│   │   ├── 🔴 facturacion/ (0+1 files) — Vacío (shared tiene 1)
│   │   ├── 🟢 facturas/ (3 files) — CFDI
│   │   ├── 🟢 fumigaciones/ (1 file) — Mobile card
│   │   ├── 🟢 inventario/ (4+1 files) — Lotes + movimientos
│   │   ├── 🟢 layout/ (1 file) — PageHeader
│   │   ├── 🟡 lecaroz/ (1 file) — Específico cliente Lecaroz
│   │   ├── 🟢 pedidos/ (15 files) — Pedidos completo
│   │   ├── 🟢 precios/ (1+4 files) — Lista precios shared
│   │   ├── 🟢 productos/ (2 files) — Cards producto
│   │   ├── 🟢 proveedores-v3/ (4+23 files) — Proveedores nuevo
│   │   ├── 🟡 remisiones/ (2 files) — Remisiones (parcial)
│   │   ├── 🟢 rentabilidad/ (1 file) — Análisis rentabilidad
│   │   ├── 🟢 rutas/ (26+1 files) — Logística completa
│   │   ├── 🟢 secretaria/ (19 files) — Panel secretaria
│   │   ├── 🟢 ui/ (54 files) — shadcn/ui components
│   │   └── 🟢 vendedor/ (35+6 files) — Panel vendedor + wizard
│   ├── 🟢 hooks/ (36 files) — Custom hooks
│   ├── 🟢 lib/ (32 files) — Utilities + business logic
│   ├── 🟢 services/ (4 files) — Push + geolocation
│   ├── 🟢 constants/ (3 files) — Company data + SAT catalog
│   ├── 🟢 utils/ (11 files) — Export, PDF generators
│   ├── 🟢 integrations/supabase/ (2 files) — Client + types
│   ├── 🟡 types/ (1 file) — Shared types
│   ├── 🟡 scripts/ (1 file)
│   ├── 🟡 docs/ (2 files) — Inline docs
│   └── 🟢 assets/logos/ (6 files)
├── 🟢 supabase/
│   ├── functions/ (53 edge functions)
│   └── migrations/ (339 files)
├── 🟢 docs/ (25+12 files) — Documentation + SQL scripts
│   ├── sql/ (6 files) — Migration scripts v3
│   ├── auditoria/ (3 files)
│   ├── roadmap/ (2 files)
│   └── lecciones/ (1 file)
├── 🟢 public/ (13+20 files) — Static assets + landing images
├── 🟡 backups/ (1 file) — Manual backup scripts
├── 🟡 outputs/ (3 files) — Generated reports
└── 🟡 audit/ — This audit
```

**Conteo total:**
- 494 archivos .tsx
- 95 archivos .ts (sin .tsx)
- 53 Edge Functions
- 339 migraciones SQL
- 36 hooks custom
- 32 librerías en /lib
- 50 páginas

---

## B) 30 archivos más grandes (líneas de código)

| # | Archivo | Líneas |
|---|---------|--------|
| 1 | src/integrations/supabase/types.ts | 7,504 |
| 2 | src/pages/Empleados.tsx | 3,126 |
| 3 | src/components/compras/CrearOrdenCompraWizard.tsx | 3,021 |
| 4 | src/components/compras/OrdenesCompraTab.tsx | 2,912 |
| 5 | src/components/almacen/AlmacenRecepcionSheet.tsx | 2,619 |
| 6 | src/components/compras/OrdenAccionesDialog.tsx | 2,321 |
| 7 | src/components/compras/ProveedoresTab.tsx | 2,095 |
| 8 | src/components/correos/ProcesarPedidoDialog.tsx | 1,886 |
| 9 | src/components/rutas/VehiculosTab.tsx | 1,460 |
| 10 | src/components/almacen/AlmacenRecepcionTab.tsx | 1,428 |
| 11 | src/components/cotizaciones/CotizacionDetalleDialog.tsx | 1,415 |
| 12 | src/components/correos/BandejaEntrada.tsx | 1,379 |
| 13 | src/pages/AlmacenCargaScan.tsx | 1,362 |
| 14 | src/components/almacen/CargaHojaInteractiva.tsx | 1,325 |
| 15 | src/pages/Inventario.tsx | 1,299 |
| 16 | src/pages/Chat.tsx | 1,295 |
| 17 | src/pages/Productos.tsx | 1,281 |
| 18 | src/components/correos/PedidosAcumulativosManager.tsx | 1,255 |
| 19 | src/components/vendedor/VendedorNuevoPedidoTab.tsx | 1,247 |
| 20 | src/components/cotizaciones/CrearCotizacionDialog.tsx | 1,206 |
| 21 | src/components/clientes/ClienteSucursalesDialog.tsx | 1,160 |
| 22 | src/components/compras/CalendarioEntregasTab.tsx | 1,146 |
| 23 | src/components/compras/ProcesarPagoOCDialog.tsx | 1,143 |
| 24 | src/pages/Pedidos.tsx | 1,134 |
| 25 | src/components/pedidos/PedidosPorAutorizarTab.tsx | 1,133 |
| 26 | src/components/compras/RecepcionDetalleDialog.tsx | 1,114 |
| 27 | src/components/clientes/SucursalFormModal.tsx | 1,066 |
| 28 | src/components/vendedor/EditarClienteSheet.tsx | 1,039 |
| 29 | src/components/configuracion/UsuariosContent.tsx | 1,039 |
| 30 | src/components/rutas/MapaGlobalSucursales.tsx | 1,034 |

**30 archivos > 1,000 líneas.** Complejidad concentrada en: Compras (7 archivos), Almacén (4), Correos (3), Rutas (2).

---

## C) Archivos modificados últimos 30 días (commits recientes)

Los últimos 30 días de actividad (abril 8 — mayo 8, 2026) muestran ~100+ commits concentrados en:

**30 abril 2026 (más reciente):**
- M02.5 Precios Temporal: frontend pre-fill desde `fn_obtener_precio_sugerido`
- Activación de productos
- Normalización textos a mayúsculas

**29 abril 2026 (día más activo):**
- Wizard OC v3 completo (NuevaOCv3, SeccionProveedor, SeccionProductos, etc.)
- Proveedores v3 (modal, comparador precios, tab Memoria)
- Corrección bugs (decimales, modal, termino_pago)
- 3 bugs tabs proveedor

**28 abril 2026:**
- Form Productos v4 (rediseño completo 26→17 campos)
- Alta proveedor (9 cambios + 10 columnas BD)
- 3 fixes UX wizard OC
- Documentos maestros (ESTADO-REAL-ALMASA, PLAN-ADOPCION)

**27 abril 2026:**
- Auditorías de código + plan de adopción
- Design Canon v1.1

---

## D) Resumen de package.json

**Stack principal:**
| Librería | Versión |
|----------|---------|
| React | ^18.3.1 |
| TypeScript | (via Vite) |
| Vite | (build tool) |
| @supabase/supabase-js | ^2.84.0 |
| @tanstack/react-query | ^5.83.0 |
| Tailwind CSS | (via PostCSS) |
| shadcn/ui | (component library, 54 componentes) |
| date-fns | ^3.6.0 |
| lucide-react | ^0.462.0 |
| recharts | ^2.15.4 |
| jsPDF | ^3.0.4 |
| html2canvas | ^1.4.1 |
| @capacitor/core | ^7.4.4 |
| @capacitor/push-notifications | ^7.0.3 |
| @react-google-maps/api | ^2.20.7 |
| zod | ^3.25.76 |

**Dependencias:** 73 de producción + 17 de desarrollo = 90 total

**Scripts:**
- `dev` → vite (dev server)
- `build` → vite build (con NODE_OPTIONS=--max-old-space-size=4096)
- `build:dev` → build modo development
- `lint` → eslint
- `preview` → vite preview

**Nota:** `build` necesita 4GB de RAM por el tamaño del proyecto (201K líneas).
