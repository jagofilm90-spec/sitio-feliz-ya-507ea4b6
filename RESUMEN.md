# RESUMEN DEL PROYECTO — ALMASA ERP

**Última actualización:** 5 de abril de 2026
**Empresa:** Abarrotes la Manita SA de CV (ALMASA)
**URL Producción:** https://erp.almasa.com.mx

---

## Métricas del Proyecto

| Métrica | Cantidad |
|---------|----------|
| Páginas (routes) | 41 |
| Componentes React | 385 |
| Hooks personalizados | 22 |
| Migraciones SQL | 318 |
| Edge Functions (Deno) | 53 |
| Dependencias | 56 |
| Tests automatizados | 0 |

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **UI:** shadcn/ui (51 componentes base)
- **Backend:** Supabase (PostgreSQL 15 + RLS + Realtime)
- **Móvil:** Capacitor (iOS/Android)
- **Integraciones:** Google Maps, Facturama (CFDI 4.0), Gmail API, Firebase FCM
- **IA:** Nano Banana (generación de imágenes), CSF Parser (auto-llenado fiscal)

---

## Módulos — Estado Actual

### TERMINADOS (funcionales)

| Módulo | Descripción | Notas |
|--------|-------------|-------|
| **Empleados** | CRUD completo, contratos digitales, firma electrónica, documentos, vacaciones | Listo para producción |
| **Vehículos** | CRUD, asignación chofer, extracción IA de documentos | Listo |
| **Asistencia** | ZKTeco integrado, reportes diario/semanal/quincenal/mensual | Listo |
| **Productos** | CRUD completo, categorías, marcas, stock, precios por kilo | Listo |
| **Lista de Precios** | 3 vistas por rol (Admin/Secretaria/Vendedor), hooks compartidos, simulador, bulk update, PDF en 2 versiones, historial | **Refactorizado en esta sesión** |
| **Compras (OC)** | Wizard 4 pasos, calendario interactivo, entregas múltiples, analytics, sugerencias de reabastecimiento | Listo |
| **Recepción** | Registro de entrada, evidencia, notificación a proveedor, diferencias | Listo |
| **Inventario** | FEFO/FIFO, lotes con caducidad, movimientos, ajustes, multi-bodega | Listo |
| **Pedidos** | Creación, autorización, email al cliente, hoja de carga con QR, calendario | Listo |
| **Carga (Almacén)** | **Nuevo flujo 4 pasos:** Selección (ZKTeco) → Escaneo masivo → Ordenar (LIFO) → Cargar (multi-bodega) | **Refactorizado en esta sesión** |
| **Rutas** | Planificación, GPS en vivo, sugeridor IA, monitoreo, zonas | Listo |
| **Facturación** | CFDI 4.0 via Facturama, timbrado, cancelación, XML/PDF | Listo |
| **Chat** | Individual, grupal, broadcast, archivos, tiempo real | Listo |
| **Correos** | Gmail OAuth (3 cuentas), templates, tracking | Listo |
| **Descuentos** | Solicitud vendedor → autorización admin, historial | Listo |
| **Notificaciones** | Push (FCM), in-app, centro de notificaciones | Listo |
| **Dashboard** | KPIs, alertas urgentes, **tabs General/RRHH/Finanzas**, Cmd+K búsqueda global | **Mejorado en esta sesión** |
| **Configuración** | Empresa, permisos, respaldos, diagnósticos push | Listo |

### EN PROGRESO

| Módulo | Estado | Qué falta |
|--------|--------|-----------|
| **Clientes** | 70% | Wizard de 4 pasos creado. Falta: formulario de sucursal con entrega cruzada, mejora de vista de lista, integrar `sucursal_entrega_id` y `sucursal_hermana_id` en la UI |
| **Landing Page** | 90% | Estilo Airbnb implementado. Imágenes AI generadas. Falta: optimizar imágenes, SEO meta tags |

### PENDIENTES / NICE TO HAVE

| Item | Prioridad | Descripción |
|------|-----------|-------------|
| Tests automatizados | Alta | 0 tests. Configurar Vitest + tests para funciones críticas (cálculos, inventario) |
| CI/CD | Media | No hay pipeline. GitHub Actions para build + deploy automático |
| Automatizaciones n8n | Media | Docker instalado, n8n corriendo en localhost:5678, Supabase conectado. Falta crear flujos: resumen diario, stock bajo, cobros vencidos |
| Portal Cliente mejorado | Baja | Existe pero básico. Falta: catálogo visual, seguimiento de pedidos en vivo |
| Reportes Excel avanzados | Baja | Exportación básica existe. Falta: reportes personalizados, gráficas |

---

## Bugs Conocidos

| Bug | Severidad | Ubicación | Descripción |
|-----|-----------|-----------|-------------|
| Foto de perfil en login | Media | Auth.tsx / Edge Function | La foto no carga en la pantalla de login si la Edge Function no está desplegada. Fix en frontend (fallback directo al DB) ya aplicado, pero Edge Function necesita deploy manual en Supabase |
| Lovable no tiene acceso a Supabase dashboard | Baja | Infraestructura | No se puede acceder al dashboard de Supabase del proyecto de Lovable (`vrcyjmfpteoccqdmdmqn`). Las Edge Functions solo se pueden actualizar desde Lovable |
| `as any` casts | Baja | Varios archivos | ~37 instancias de `as any` en TypeScript. Funcionan pero no son type-safe |
| Componente huérfano | Trivial | EntregasDetallePopover.tsx | Componente no referenciado en ninguna parte |

---

## Cambios Hechos en Esta Sesión (5 abril 2026)

### Lista de Precios (Refactor completo)
- 3 hooks compartidos: `useListaPrecios`, `usePrecioEditor`, `usePrecioHistorial`
- Componente compartido: `PrecioHistorialDialog`
- Vendedor: columna precio piso, selector cliente con último precio, botón PDF
- Secretaria: panel revisiones pendientes, calculadora margen, botón PDF
- Admin: badge sin precio, botón PDF junto a Excel
- PDF generator en 2 versiones (Cliente / Interno)
- ~1000 líneas de código duplicado eliminadas

### Landing Page (almasa.com.mx)
- Rediseño estilo Airbnb: cálido, fotografía protagonista, cards con sombras
- Logo ALMASA rojo en todas partes
- Imágenes generadas con IA (nano-banana): cacahuate, azúcar, frijol, mascotas, pasas, avena, latas, camión en carretera, bodega
- Ruta: `/landing`

### UX del ERP
- Modo oscuro mejorado (contraste, sidebar profundo, badges saturados)
- Dashboard con tabs (General/RRHH/Finanzas) para admin
- Búsqueda global Cmd+K (páginas, clientes, productos, pedidos)
- Botones de acción rápida en header por rol
- Clase CSS `table-erp` para tablas legibles

### Sidebars (Almacén, Vendedor, Secretaria)
- Sidebars fijos, no colapsables
- Foto real del empleado con popover de tarjeta de trabajador
- Sin opción de cambiar foto (solo RRHH)
- Diseño profesional uniforme en los 3 roles

### Flujo de Carga del Almacén
- Filtro ZKTeco: solo choferes/ayudantes con asistencia hoy
- Escaneo masivo: primero escanear TODOS los QR
- Ordenar entregas con ▲▼ (LIFO para estiba)
- Multi-bodega: lotes de ambas bodegas visibles con etiqueta
- Botón "Nueva Carga" navega al flujo nuevo

### Clientes
- Mapa global con pins por vendedor, geocoding batch, InfoWindow
- Wizard de 4 pasos para nuevo cliente
- Migración SQL para entrega cruzada (`sucursal_entrega_id`, `sucursal_hermana_id`)

### Infraestructura
- Docker + n8n instalado (localhost:5678)
- nano-banana (generación de imágenes IA) instalado
- UI/UX Pro Max skill instalado
- Gemini API configurada con billing

---

## Estructura de Archivos Clave

```
src/
├── pages/              # 41 páginas
├── components/         # 385 componentes
│   ├── admin/          # Panel admin
│   ├── almacen/        # Panel almacén/tablet
│   ├── chofer/         # Panel chofer
│   ├── clientes/       # Módulo clientes + mapa
│   ├── compras/        # Órdenes de compra
│   ├── dashboard/      # Widgets del dashboard
│   ├── empleados/      # RRHH
│   ├── inventario/     # Stock y lotes
│   ├── pedidos/        # Pedidos de venta
│   ├── precios/        # Componentes compartidos de precios
│   ├── rutas/          # Rutas y mapas
│   ├── secretaria/     # Panel secretaria
│   ├── vendedor/       # Panel vendedor
│   └── ui/             # shadcn/ui base
├── hooks/              # 22 hooks personalizados
├── lib/                # Utilidades (cálculos, notificaciones, etc.)
├── utils/              # Generadores PDF, exportación
└── integrations/       # Supabase client + types

supabase/
├── functions/          # 53 Edge Functions
└── migrations/         # 318 migraciones SQL

public/
├── landing/            # Imágenes AI para landing page
└── *.png               # Logos ALMASA
```

---

## Accesos y Configuración

| Servicio | URL/Config |
|----------|------------|
| ERP Producción | https://erp.almasa.com.mx |
| Landing Page | /landing |
| Supabase Project | vrcyjmfpteoccqdmdmqn (via Lovable) |
| n8n | http://localhost:5678 |
| Docker | Instalado, n8n corriendo |
| Gemini API | Configurada con billing (Nivel 1 Pospago) |
| Google Maps | API Key en `.env` |

---

*Generado por Claude Opus 4.6 — Sesión del 5 de abril de 2026*
