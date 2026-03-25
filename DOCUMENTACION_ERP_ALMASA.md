# DOCUMENTACIÓN COMPLETA — ERP ALMASA

> **Empresa:** Abarrotes la Manita SA de CV (ALMASA)
> **Giro:** Distribuidora mayorista de abarrotes, León/Bajío, México
> **Dueño:** Jose Antonio Gomez
> **Última actualización:** 2026-03-24

---

## 1. ARQUITECTURA GENERAL

### Stack Tecnológico
- **Frontend:** React 18.3 + TypeScript + Vite
- **UI:** shadcn/ui (Radix primitives + Tailwind CSS)
- **Backend:** Supabase (PostgreSQL 15 + RLS + Realtime + Storage + Edge Functions)
- **Mobile:** Capacitor (iOS/Android)
- **Auth:** Supabase Auth con JWT + refresh automático
- **Email:** Gmail API OAuth (3 cuentas: compras@, pedidos@, pagos@almasa.com.mx)
- **Push Notifications:** Firebase FCM V1 via Edge Function
- **Facturación:** CFDI 4.0 via Facturama API
- **PDF:** jsPDF + html2canvas
- **Charts:** Recharts
- **Forms:** React Hook Form + Zod
- **Data Fetching:** TanStack React Query
- **Maps:** Google Maps API (geocoding, directions, places)

### Conexión a Supabase
- **Project ID:** `vrcyjmfpteoccqdmdmqn`
- **URL:** `https://vrcyjmfpteoccqdmdmqn.supabase.co`
- **Client:** `src/integrations/supabase/client.ts` — usa `import.meta.env.VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`
- **Interceptor global:** detecta sesión perdida, intenta refresh, redirige a `/auth` si falla
- **Flag anti-loop:** `_refreshAttempted` evita ciclos infinitos de refresh

### Estructura de Carpetas
```
src/
├── assets/              # Logo, imágenes estáticas
├── components/
│   ├── admin/           # Panel admin (descuentos, precios, usuarios conectados)
│   ├── almacen/         # 14+ componentes de almacén tablet
│   ├── analytics/       # Componentes de análisis
│   ├── chofer/          # Panel del chofer (entregas, GPS)
│   ├── cliente/         # Portal del cliente
│   ├── clientes/        # Gestión de clientes (admin)
│   ├── compras/         # 41 componentes de compras (OCs, proveedores)
│   ├── dashboard/       # KPIs, alertas, widgets, resumen diario
│   ├── entregas/        # Componentes de entrega
│   ├── fumigaciones/    # Control de fumigación
│   ├── herramientas/    # Utilidades
│   ├── inventario/      # Lotes, movimientos, categorías
│   ├── pedidos/         # Autorización, detalle, calendario
│   ├── remisiones/      # Remisiones e impresión
│   ├── rutas/           # Planificación, monitoreo, vehículos
│   ├── secretaria/      # Panel secretaria
│   ├── vendedor/        # 24 componentes del panel vendedor
│   └── ui/              # shadcn/ui components
├── constants/           # companyData.ts (RFC, razón social, logos)
├── hooks/               # 20 custom hooks
├── integrations/supabase/ # client.ts + types.ts (schema completo)
├── lib/                 # 18 utilidades (email, PDF, cálculos, crédito)
├── pages/               # 38 páginas/rutas
├── services/            # Push notifications, diagnósticos
└── utils/               # 10 generadores PDF, exportadores
supabase/
├── functions/           # 50 Edge Functions (Deno)
├── migrations/          # 80+ migraciones SQL
└── config.toml
```

---

## 2. TABLAS DE SUPABASE (90+ tablas)

### Tablas principales con columnas clave

#### `pedidos` (Pedidos/Órdenes de venta)
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | |
| cliente_id | UUID FK → clientes | |
| vendedor_id | UUID FK → profiles | |
| folio | TEXT | Auto-generado PED-YYYYMM-XXXX |
| status | order_status ENUM | borrador, por_autorizar, pendiente, en_ruta, entregado, cancelado |
| subtotal, impuestos, total | NUMERIC | |
| saldo_pendiente | NUMERIC | Lo que falta por cobrar |
| pagado | BOOLEAN | |
| facturado | BOOLEAN | |
| prioridad_entrega | delivery_priority ENUM | vip_mismo_dia, deadline, dia_fijo_recurrente, fecha_sugerida, flexible |
| termino_credito | credit_term ENUM | contado, 8_dias, 15_dias, 30_dias, 60_dias |
| peso_total_kg | NUMERIC | |
| sucursal_id | UUID FK → cliente_sucursales | |
| requiere_factura | BOOLEAN | |

#### `pedidos_detalles` (Líneas del pedido)
| Columna | Tipo | Descripción |
|---------|------|-------------|
| pedido_id | UUID FK → pedidos | |
| producto_id | UUID FK → productos | |
| cantidad | NUMERIC | |
| precio_unitario | NUMERIC | |
| subtotal | NUMERIC | |
| descuento_porcentaje | NUMERIC | |
| precio_unitario_original | NUMERIC | Precio antes de descuento |
| requiere_autorizacion | BOOLEAN | Si excede descuento_maximo |
| autorizacion_status | TEXT | pendiente, autorizado, rechazado |

#### `ordenes_compra` (Órdenes de Compra)
| Columna | Tipo | Descripción |
|---------|------|-------------|
| folio | TEXT | OC-YYYYMM-XXXX |
| proveedor_id | UUID FK → proveedores | |
| status | TEXT | borrador, pendiente_autorizacion, autorizada, enviada, confirmada, parcial, recibida, completada, cancelada |
| tipo_pago | TEXT | anticipado, contra_entrega, credito |
| status_pago | TEXT | pendiente, parcial, pagado |
| subtotal, impuestos, total | NUMERIC | |
| monto_pagado | NUMERIC | |
| entregas_multiples | BOOLEAN | |
| email_enviado_en | TIMESTAMPTZ | |
| email_leido_en | TIMESTAMPTZ | Tracking de lectura |

#### `ordenes_compra_entregas` (Entregas de OC)
| Columna | Tipo | Descripción |
|---------|------|-------------|
| orden_compra_id | UUID FK | |
| numero_entrega | INTEGER | |
| cantidad_bultos | INTEGER | |
| fecha_programada | DATE | |
| status | TEXT | pendiente_fecha, programada, en_transito, en_descarga, recibida, rechazada |
| llegada_registrada_en | TIMESTAMPTZ | |
| nombre_chofer_proveedor | TEXT | |
| placas_vehiculo | TEXT | |
| numero_sello_llegada | TEXT | |
| sin_sellos | BOOLEAN | |
| trabajando_por | UUID FK → profiles | Almacenista asignado |
| recepcion_finalizada_en | TIMESTAMPTZ | |
| firma_chofer_conformidad | TEXT | Base64 |
| firma_almacenista | TEXT | Base64 |
| comprobante_recepcion_url | TEXT | URL firmada del PDF |
| datos_llegada_parcial | JSONB | Borrador de datos de llegada |

#### `productos`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| codigo | TEXT | Código interno |
| nombre | TEXT | |
| marca | TEXT | |
| categoria | TEXT | |
| unidad | unit_type ENUM | kg, pieza, caja, bulto, costal, litro, etc. |
| peso_kg | NUMERIC | |
| precio_compra, precio_venta | NUMERIC | |
| precio_por_kilo | BOOLEAN | |
| stock_actual | NUMERIC | Sincronizado via trigger desde inventario_lotes |
| stock_minimo | NUMERIC | |
| costo_promedio_ponderado | NUMERIC | Calculado via trigger PostgreSQL |
| ultimo_costo_compra | NUMERIC | |
| descuento_maximo | NUMERIC | % máximo sin autorización |
| aplica_iva, aplica_ieps | BOOLEAN | |
| maneja_caducidad | BOOLEAN | |
| requiere_fumigacion | BOOLEAN | |
| activo | BOOLEAN | |

#### `clientes`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| codigo, nombre, razon_social | TEXT | |
| rfc | TEXT | Para facturación CFDI |
| termino_credito | credit_term ENUM | |
| limite_credito | NUMERIC | |
| saldo_pendiente | NUMERIC | |
| vendedor_asignado | UUID FK → profiles | |
| zona_id | UUID FK → zonas | |
| dias_visita_preferidos | TEXT[] | Array de días |
| activo | BOOLEAN | |

#### `inventario_lotes` (Lotes FEFO)
| Columna | Tipo | Descripción |
|---------|------|-------------|
| producto_id | UUID FK | |
| bodega_id | UUID FK → bodegas | |
| orden_compra_id | UUID FK | |
| cantidad_disponible | NUMERIC | |
| precio_compra | NUMERIC | |
| fecha_entrada | TIMESTAMPTZ | |
| fecha_caducidad | DATE | Para FEFO |
| lote_referencia | TEXT | |
| conciliado | BOOLEAN | |
| recibido_por | UUID FK → profiles | |

#### `rutas` (Rutas de entrega)
| Columna | Tipo | Descripción |
|---------|------|-------------|
| chofer_id | UUID FK → empleados | |
| vehiculo_id | UUID FK → vehiculos | |
| ayudante_id | UUID FK → empleados | |
| fecha_ruta | DATE | |
| folio | TEXT | |
| status | TEXT | planificada, en_ruta, completada, cancelada |
| fase_carga | TEXT | |
| carga_completada | BOOLEAN | |
| peso_total_kg | NUMERIC | |
| firma_chofer_carga | TEXT | Base64 |
| firma_almacenista_carga | TEXT | Base64 |

#### `entregas` (Entregas de pedidos en ruta)
| Columna | Tipo | Descripción |
|---------|------|-------------|
| pedido_id | UUID FK | |
| ruta_id | UUID FK | |
| orden_entrega | INTEGER | Secuencia en la ruta |
| status_entrega | TEXT | pendiente, entregado, parcial, rechazado |
| nombre_receptor | TEXT | |
| firma_recibido | TEXT | Base64 |

#### `empleados`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| nombre_completo | TEXT | |
| puesto | TEXT | Secretaria, Almacenista, Gerente de Almacén, Chofer, Ayudante de Chofer, Vendedor |
| user_id | UUID FK → auth.users | Vincula con cuenta del sistema |
| curp, rfc | TEXT | |
| numero_seguro_social | TEXT | IMSS |
| sueldo_bruto | NUMERIC | |
| periodo_pago | TEXT | semanal, quincenal |
| fecha_ingreso, fecha_baja | DATE | |
| activo | BOOLEAN | |

#### `vehiculos`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| nombre | TEXT | Ej: "Unidad 1" |
| placa | TEXT | |
| tipo | TEXT | camioneta, torton, rabon, trailer |
| marca, modelo, anio | TEXT | |
| capacidad_toneladas | NUMERIC | |
| chofer_asignado_id | UUID FK → empleados | |
| activo | BOOLEAN | |

### Enums
```sql
app_role: admin, vendedor, chofer, almacen, secretaria, cliente, contadora, gerente_almacen
order_status: borrador, por_autorizar, pendiente, en_ruta, entregado, cancelado, por_cobrar
credit_term: contado, 8_dias, 15_dias, 30_dias, 60_dias
unit_type: kg, pieza, caja, bulto, costal, litro, churla, cubeta, balón, paquete
delivery_priority: vip_mismo_dia, deadline, dia_fijo_recurrente, fecha_sugerida, flexible
preferencia_facturacion: siempre_factura, siempre_remision, variable
conversation_type: individual, grupo_personalizado, grupo_puesto, broadcast
```

### Funciones PostgreSQL clave
- `calcular_costo_promedio_ponderado` — trigger en inventario_lotes que actualiza CPP
- `generar_folio_*` — auto-generación de folios (pedidos, OCs, cotizaciones)
- `registrar_cobro_pedido` — RPC para registrar pago
- `has_role(user_id, role)` — verificación de roles para RLS
- `decrementar_lote` / `incrementar_lote` — gestión FEFO de inventario

---

## 3. ROLES Y PERMISOS

### Tabla `user_roles` (many-to-many)
Un usuario puede tener múltiples roles. Cada fila: `(user_id, role)`.

### Roles y acceso

| Rol | Interfaz | Módulos accesibles | Acciones principales |
|-----|----------|-------------------|---------------------|
| **admin** | Dashboard completo | TODOS | Todo: autorizar, configurar, gestionar |
| **secretaria** | `/secretaria` + menú parcial | Pedidos, Rutas, Facturación, Correos, Clientes | Autorizar pedidos, planificar rutas, facturar |
| **vendedor** | `/vendedor` (panel dedicado) | Solo su panel + `/precios` + `/chat` | Crear pedidos, gestionar SUS clientes, cobrar |
| **chofer** | `/chofer` (panel dedicado) | Solo su panel + `/chat` | Ver rutas asignadas, registrar entregas, GPS |
| **almacen** | `/almacen-tablet` | Solo almacén (tabs 1-8) + `/chat` | Recepción, inventario, ventas mostrador, FEFO |
| **gerente_almacen** | `/almacen-tablet` | Almacén (14 tabs) + `/configuracion` | Todo almacén + flotilla, checkups, personal |
| **contadora** | Dashboard + módulos finanzas | Dashboard, Compras, Facturación, Rentabilidad, Empleados | Consulta financiera, configuración |
| **cliente** | `/portal-cliente` | Solo portal | Ver sus pedidos, hacer pedidos |

### Detección de rol (useUserRoles.ts)
```typescript
// Consulta user_roles WHERE user_id = auth.uid()
// Retorna: roles[], isAdmin, isVendedor, isChofer, isAlmacen, isSecretaria, etc.
// Auto-redirección en Layout.tsx:
//   almacen only → /almacen-tablet
//   vendedor only → /vendedor
//   secretaria only → /secretaria
//   chofer only → /chofer
```

---

## 4. MÓDULOS DEL SISTEMA

### Dashboard (`/dashboard` — Dashboard.tsx)
- **KPIs:** Ventas día/mes, cobros, por cobrar, vencido, pedidos en calle, entregados, por surtir, crédito excedido, stock bajo, sin autorizar, facturas por vencer
- **Alertas urgentes:** pedidos >24h sin autorizar, stock cero, crédito excedido, lotes vencidos, fumigaciones, anticipos, entregas atrasadas
- **Widget descargas en curso:** timer en tiempo real por descarga activa
- **Widget completadas hoy:** recepciones completadas con duración
- **Resumen del día:** reporte ejecutivo con dialog fullscreen
- **Otros:** mapa de rutas, usuarios conectados, ventas mensuales, top productos/clientes, cobranza crítica
- **Tablas:** pedidos, clientes, facturas, ordenes_compra_entregas, rutas, entregas, pagos_cliente, productos, inventario_lotes

### Productos (`/productos` — Productos.tsx)
- **Acciones:** CRUD productos, importar desde Excel (Aspel), gestión de precios
- **Campos:** código, nombre, marca, categoría, unidad, peso, precios compra/venta, stock mínimo, IVA/IEPS, descuento máximo, código SAT
- **Tablas:** productos, productos_historial_costos, productos_historial_precios

### Lista de Precios (`/precios` — Precios.tsx)
- **Funcionalidad:** Gestión de precios por producto, revisión cuando sube costo de compra
- **Tablas:** productos, productos_revision_precio

### Clientes (`/clientes` — Clientes.tsx)
- **Funcionalidad:** CRUD clientes con sucursales, contactos, teléfonos, correos
- **Features:** geocodificación de direcciones, saldos, crédito, términos de pago, vendedor asignado, zona
- **Tablas:** clientes, cliente_sucursales, cliente_contactos, cliente_telefonos, cliente_correos, zonas

### Pedidos (`/pedidos` — Pedidos.tsx)
- **Tabs:**
  - **Por Autorizar:** pedidos con `status = 'por_autorizar'`, admin puede ajustar precios y autorizar/rechazar
  - **Pedidos:** lista de pedidos activos con filtros
  - **Cotizaciones:** cotizaciones enviadas a clientes
  - **Análisis:** métricas de ventas
  - **Calendario:** vista calendario de pedidos
- **Tablas:** pedidos, pedidos_detalles, cotizaciones, cotizaciones_detalles

### Compras (`/compras` — Compras.tsx)
- **Tabs:**
  - **Proveedores:** CRUD proveedores con contactos, cuenta corriente
  - **Órdenes:** lista de OCs con acciones (crear, autorizar, enviar, recibir, pagar)
  - **Calendario:** entregas programadas
  - **Devoluciones/Faltantes:** créditos a favor de proveedores
  - **Historial:** OCs completadas
  - **Adeudos:** pagos pendientes a proveedores
  - **Sugerencias:** reabastecimiento automático por stock mínimo
  - **Analytics:** métricas de compras
- **Componentes clave:** CrearOrdenCompraWizard (wizard de 4 pasos), OrdenAccionesDialog (todas las acciones de una OC), RegistrarRecepcionDialog, ProcesarPagoOCDialog
- **Tablas:** ordenes_compra, ordenes_compra_detalles, ordenes_compra_entregas, proveedores, proveedor_contactos, devoluciones_proveedor

### Inventario (`/inventario` — Inventario.tsx)
- **Tabs:**
  - **Productos:** resumen de stock total por producto con estado (disponible/bajo/sin stock)
  - **Lotes:** entradas desde recepciones con caducidad, bodega, OC
  - **Movimientos:** historial de movimientos manuales (entrada/salida/ajuste/merma)
  - **Por Categoría:** vista agrupada
- **Tablas:** inventario_lotes, inventario_movimientos, productos, bodegas

### Rutas y Entregas (`/rutas` — Rutas.tsx)
- **Tabs:** Planificar, Asignaciones, Monitoreo, Mapa, Rutas, Vehículos, Zonas, Disponibilidad, Externos
- **Features:** planificación con IA (suggest-routes), monitoreo GPS en tiempo real, asignación chofer/vehículo/ayudante
- **Tablas:** rutas, entregas, vehiculos, empleados, zonas, chofer_ubicaciones

### Facturación (`/facturas` — Facturas.tsx)
- **Features:** Generación de CFDI 4.0 via Facturama, timbrado, cancelación, descarga XML/PDF
- **Tablas:** facturas, factura_detalles

### Empleados (`/empleados` — Empleados.tsx, 2769 líneas)
- **Features:** CRUD empleados, documentos/expediente, nómina (sueldo, NSS, período pago), crear usuario del sistema
- **Tabs por puesto:** Secretaria, Vendedor, Chofer, Almacenista, Gerente de Almacén, Ayudante
- **Tablas:** empleados, empleados_documentos, user_roles, profiles

### Almacén Tablet (`/almacen-tablet` — AlmacenTablet.tsx)
- **14 tabs:**
  1. Carga de Rutas — preparar mercancía para rutas
  2. Ventas Mostrador — ventas directas autónomas con FEFO
  3. Recepción de Mercancía — registrar llegada, descargar, completar recepción
  4. Reporte del Día — recepciones completadas
  5. Inventario — lotes con ajuste manual (gerente/admin)
  6. Productos — catálogo con stock
  7. Fumigaciones — control por producto
  8. Caducidad FEFO — lotes vencidos/críticos con acciones de baja
  9. Alertas Flotilla (gerente+) — licencias, verificaciones
  10. Checkups Vehículos (gerente+)
  11. Vehículos (gerente+)
  12. Personal Flotilla (gerente+)
  13. Disponibilidad (gerente+)
  14. Ayudantes Externos (gerente+)

### Panel Vendedor (`/vendedor` — VendedorPanel.tsx)
- **10 tabs:** Clientes, Nuevo Pedido, Pedidos, Cobranza, Mis Ventas, Novedades, Precios, Saldos, Comisiones, Análisis
- **Features:** solo ve SUS clientes, wizard de pedido, registro de cobros, comisiones
- **14,027 líneas** en total (24 componentes)

### Panel Chofer (`/chofer` — ChoferPanel.tsx)
- **Features:** rutas del día, entregas pendientes, registro con foto/firma, GPS automático

### Panel Secretaria (`/secretaria` — SecretariaPanel.tsx)
- **Features:** rutas, pagos por validar, pedidos, facturación rápida

### Chat (`/chat` — Chat.tsx)
- **Features:** conversaciones individuales, grupos por puesto, broadcast, archivos adjuntos
- **Realtime:** Supabase Realtime subscriptions
- **Tablas:** conversaciones, conversacion_participantes, mensajes

### Correos (`/correos` — CorreosCorporativos.tsx)
- **Features:** Gmail API OAuth con 3 cuentas corporativas
- **Tablas:** gmail_cuentas, correos_enviados

---

## 5. FLUJO COMPLETO DE UN PEDIDO

### Paso a paso:

1. **VENDEDOR crea pedido** (`VendedorNuevoPedidoTab.tsx`)
   - Selecciona cliente → selecciona sucursal de entrega
   - Agrega productos con cantidades y precios
   - Si aplica descuento > `producto.descuento_maximo` → marca `requiere_autorizacion = true`
   - Submit: status → `por_autorizar` (si requiere) o `pendiente` (si no)
   - Notificación push a admin/secretaria si requiere autorización

2. **ADMIN autoriza** (`PedidosPorAutorizarTab.tsx`)
   - Filtro: `pedidos WHERE status = 'por_autorizar'` ordenados por antigüedad
   - Puede ver historial de precios (6 meses) por producto
   - Puede **ajustar precios** unitarios antes de autorizar
   - **Autorizar:** status → `pendiente`, recalcula totales, email al cliente
   - **Rechazar:** status → `cancelado`, motivo obligatorio, push al vendedor

3. **SECRETARIA asigna ruta** (`PlanificadorRutas.tsx`)
   - Selecciona pedidos pendientes → asigna a ruta con chofer + vehículo
   - Crea registros en `entregas` vinculando pedido ↔ ruta
   - Status pedido → `en_ruta`

4. **ALMACÉN carga** (`AlmacenCargaRutasTab.tsx`)
   - Ve rutas del día con productos a cargar
   - Confirma carga por producto → firma digital chofer + almacenista
   - Genera PDF de comprobante de carga

5. **CHOFER entrega** (`ChoferPanel.tsx` + `RegistrarEntregaSheet.tsx`)
   - Ve entregas en orden de ruta
   - Registra: nombre receptor, firma digital, fotos evidencia
   - Status entrega → `entregado`
   - Si rechazan: motivo + fotos → `rechazado`
   - GPS tracking automático durante toda la ruta

6. **COBRO** (`RegistrarCobroPedidoDialog.tsx` o `VendedorCobranzaTab.tsx`)
   - Vendedor o admin registra pago del cliente
   - Métodos: efectivo, transferencia, cheque
   - RPC `registrar_cobro_pedido` actualiza saldo_pendiente
   - Status → `pagado` cuando saldo = 0

7. **FACTURACIÓN** (módulo Facturas)
   - Se puede facturar en cualquier momento después de autorizado
   - CFDI 4.0 via Facturama → timbrado → envío por email
   - `facturado = true` en el pedido

---

## 6. FLUJO DE COMPRAS (OC)

1. **Crear OC** (CrearOrdenCompraWizard) → status: `borrador` o `pendiente_autorizacion`
2. **Autorizar** (OrdenAccionesDialog) → status: `autorizada`
3. **Enviar al proveedor** por email con PDF → status: `enviada`
4. **Programar entregas** (ProgramarEntregasDialog) → entregas con fechas
5. **Almacén registra llegada** (RegistrarLlegadaSheet) → entrega status: `en_descarga`
   - Foto placas, INE chofer, sellos de seguridad, firma si sin sellos
   - Borrador automático (datos_llegada_parcial JSONB)
6. **Almacén completa recepción** (AlmacenRecepcionSheet) → entrega status: `recibida`
   - Cantidades por producto, caducidad, lotes, firma chofer + almacenista
   - Crea registros en `inventario_lotes` (FEFO)
   - Actualiza `costo_promedio_ponderado` via trigger
   - Genera PDF de comprobante → guarda en Storage
   - Email al proveedor con PDF adjunto
7. **Procesar pago** (ProcesarPagoOCDialog) → status_pago: `pagado`
8. **Si hay diferencias:** crea entrega de faltantes automática + crédito a favor

---

## 7. FLUJO DE ALMACÉN

### Recepción de mercancía
- Ventana de visibilidad dinámica (antes 14:00 = solo hoy, después = hoy + mañana)
- Badge "ATRASADA Xd" para entregas pasadas
- Registro de llegada: chofer, placas, INE, sellos dinámicos (1-3), firma
- Completar recepción: cantidades, caducidad, bodega, firmas, PDF
- Email profesional al proveedor (inicio descarga + fin descarga)

### Inventario FEFO
- Lotes ordenados por fecha de caducidad (First Expiry First Out)
- Caducidad: badges vencido (rojo), crítico (naranja), próximo (amarillo), vigente (verde)
- Acciones: baja por merma, donación, devolución
- Ajuste manual: corrección, merma, consumo interno (gerente/admin)
- CPP se recalcula automáticamente via trigger PostgreSQL

### Ventas mostrador
- Flujo autónomo: pendiente → pagada → entregada
- FEFO automático al decrementar inventario
- Cálculo IVA/IEPS en tiempo real
- Efectivo con cálculo de cambio

---

## 8. EDGE FUNCTIONS (50)

| Función | Propósito |
|---------|-----------|
| `send-push-notification` | FCM V1 push a usuarios por rol/id |
| `gmail-api` | Enviar emails via Gmail OAuth |
| `gmail-auth` / `gmail-callback` | OAuth flow para Gmail |
| `create-user` / `delete-user` / `reset-user-password` | Gestión de usuarios |
| `timbrar-cfdi` / `cancelar-cfdi` / `descargar-cfdi` / `parse-cfdi-xml` | Facturación CFDI |
| `resumen-diario` | Reporte ejecutivo del día (cron 8pm MX) |
| `suggest-routes` | IA para sugerir rutas óptimas |
| `geocode-addresses` / `get-place-details` / `get-route-directions` | Google Maps |
| `check-caducidad-fumigacion` | Verificar caducidad y fumigaciones |
| `check-invoice-expiry-reminders` | Recordatorios de facturas |
| `check-vehicle-documents-expiry` | Alertas de documentos vehiculares |
| `notificar-entregas-programadas` | Notificar fechas de entrega |
| `extract-license-expiry` / `extract-placas-vehiculo` / `extract-tarjeta-circulacion` | OCR de documentos |
| `normalize-product` | Normalizar nombres de productos |
| `parse-excel-order` / `parse-order-email` / `parse-csf` | Parseo de documentos |
| `send-checkup-report` / `send-chofer-route-email` / `send-delivery-confirmation` | Emails especializados |

---

## 9. ESTADO ACTUAL

### Funcionalidades completas
- Dashboard con KPIs, alertas, widget descargas en curso, resumen diario
- Flujo completo de pedidos (crear → autorizar → ruta → entregar → cobrar)
- Flujo completo de compras (crear OC → autorizar → enviar → recibir → pagar)
- Recepción de mercancía con evidencias, firmas, PDF, emails profesionales
- Inventario FEFO con lotes, caducidad, ajustes, movimientos
- Panel vendedor completo con 10 tabs
- Panel chofer con GPS y entregas
- Panel almacén tablet con 14 tabs
- Facturación CFDI 4.0
- Chat interno con archivos
- Push notifications (FCM)
- Correos corporativos (Gmail API)
- Gestión de empleados con expedientes
- Resumen diario automático (cron 8pm)

### Bugs conocidos / Mejoras pendientes
- 37 instancias de `as any` en TypeScript que necesitan tipos propios
- No hay pruebas automatizadas (ni unit, ni integration, ni E2E)
- Playwright instalado pero sin configurar
- OC deletion logic duplicada entre OrdenAccionesDialog y OrdenesCompraTab
- `EntregasDetallePopover.tsx` es un componente huérfano (no se usa en ningún lado)
- La tabla `vehiculos` puede estar vacía en producción

### Lo que falta por implementar
- Tests automatizados
- Pipeline CI/CD
- Generador de PDF del resumen diario
- Portal del cliente más completo
- Módulo de rentabilidad más detallado
- Reportes exportables (Excel) en más módulos

---

## 10. DATOS EN LA DB

**Nota:** La DB tiene RLS activo, no se puede consultar con anon key desde terminal. Los datos solo son accesibles con sesión autenticada desde la app o con service role key desde Supabase Dashboard.

**Tablas confirmadas con datos:** empleados (recién agregados), pedidos, clientes, productos, ordenes_compra, proveedores, rutas, entregas, inventario_lotes, facturas, user_roles, profiles.

**Tablas potencialmente vacías:** vehiculos (devolvió [] con anon key, puede ser RLS o vacía), resumenes_diarios (recién creada).

Para ver datos reales: Supabase Dashboard → Table Editor → seleccionar tabla.

---

## ARCHIVOS CLAVE PARA REFERENCIA RÁPIDA

| Archivo | Líneas | Función |
|---------|--------|---------|
| `src/integrations/supabase/types.ts` | ~6000 | Schema completo de la DB |
| `src/components/Layout.tsx` | ~500 | Menú, permisos, sidebar, auth |
| `src/pages/Empleados.tsx` | 2769 | CRUD empleados completo |
| `src/components/almacen/AlmacenRecepcionTab.tsx` | ~1400 | Recepción de mercancía |
| `src/components/almacen/AlmacenRecepcionSheet.tsx` | 2663 | Completar recepción (fase 2) |
| `src/components/almacen/RegistrarLlegadaSheet.tsx` | ~700 | Registrar llegada (fase 1) |
| `src/components/compras/OrdenAccionesDialog.tsx` | ~2000 | Todas las acciones de una OC |
| `src/components/compras/CrearOrdenCompraWizard.tsx` | ~1600 | Wizard crear OC |
| `src/components/vendedor/VendedorNuevoPedidoTab.tsx` | 1285 | Crear pedido |
| `src/components/pedidos/PedidosPorAutorizarTab.tsx` | ~400 | Autorización de pedidos |
| `src/pages/VendedorPanel.tsx` | 534 | Panel vendedor principal |
| `src/pages/AlmacenTablet.tsx` | ~600 | 14 tabs de almacén |
| `src/components/dashboard/useDashboardData.ts` | ~340 | Queries del dashboard |
| `src/lib/emailTemplates.ts` | ~50 | Plantillas email compartidas |
| `src/utils/recepcionPdfGenerator.ts` | 850 | Generador PDF recepción |
| `supabase/functions/send-push-notification/index.ts` | 297 | FCM push |
| `supabase/functions/resumen-diario/index.ts` | ~270 | Resumen del día |

---

## 11. FLUJO OPERATIVO COMPLETO — PEDIDOS A ENTREGA

### 11.1 Al autorizar pedido
- Email al cliente: confirmación con precios, total, aviso "puede variar"
- Email a pedidos@: notificación + PDF adjunto de 2 hojas:
  - Hoja 1: Nota de venta (Original) — precios, total, pagaré, firma
  - Hoja 2: Hoja de carga — sin precios, con QR grande para escanear

### 11.2 Armado de rutas (dueño + vendedores)
- Dueño tiene pedidos impresos en folders por vendedor
- Vendedores proponen sus rutas (por zona geográfica)
- Dueño valida, calcula peso, define tipo de unidad (camioneta/tortón/rabón)
- Puede mezclar pedidos de diferentes vendedores + pedidos de la casa si van a la misma zona
- Cuando tiene la primera tanda, llama a almacén para empezar a cargar

### 11.3 Almacén recibe rutas
- Gerente de almacén decide: qué unidad, qué chofer, qué ayudantes
- Reparte las hojas a los almacenistas: "tú cargas esta, tú esta"
- Almacenista escanea QR con tablet → se abre hoja de carga digital
- Primero selecciona: chofer, ayudantes, número de unidad
- Chofer ve los pedidos y decide orden de entrega
- Almacenista carga en orden INVERSO (si entrega 1,2,3 → carga 3,2,1)
- Marca checkbox por cada producto, puede editar peso real de báscula
- Si hay diferencia de peso o cantidad, el sistema registra la modificación
- Inventario se descuenta en tiempo real de la bodega correcta (detectada por WiFi/GPS)

### 11.4 Al confirmar carga
- Sistema identifica pedidos modificados
- Si hubo modificaciones: "Hay 2 pedidos modificados, ¿deseas reimprimir?" → solo se reimprimen los modificados
- Todos los pedidos llevan: fecha del día, almacenista, chofer, ayudantes, unidad, hora de salida
- Email automático a clientes: "Tu pedido va en camino"
  - Si hubo modificaciones: se envía pedido recalculado
  - Si no: solo aviso de que va en camino

### 11.5 Entrega
- Chofer lleva notas impresas (Original + Copia cliente)
- Cliente firma la Original, se queda con la Copia
- Si hay inconformidad (devolución, peso, faltante), cliente lo anota en la nota

### 11.6 Post-entrega (secretarias)
- Sección "Pedidos pendientes" agrupados por ruta
- Si hubo modificaciones en almacén, ya se reflejan
- Al día siguiente: si cliente reportó inconformidad, secretaria ajusta en el sistema
- Si se modifica: se envía nota final recalculada al cliente
- Si no hay cambios: secretaria cierra pedido y envía nota final con plazo de crédito y fecha de vencimiento
- Vendedor recibe ajuste en su sistema para tener el pedido final

### 11.7 Historial de modificaciones
- Cada modificación registra: quién, cuándo, qué cambió, en qué etapa
- Etapas: almacén (carga), entrega (chofer), post-entrega (secretaria)

### 11.8 Bodegas
- 2 bodegas: Bodega 1 y Bodega 2
- Detección automática por WiFi (prioridad) → GPS (fallback) → Manual
- Inventario separado por bodega (lotes con bodega_id)
- Al cargar, se descuenta del stock de la bodega donde está la tablet
- Una misma ruta puede tener productos de ambas bodegas
