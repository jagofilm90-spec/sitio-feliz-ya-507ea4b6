# Análisis Completo del Código - ALMASA ERP

**Fecha:** 2026-03-19
**Proyecto:** ALMASA ERP (Abarrotes la Manita SA de CV)
**Total de archivos:** ~837 | **Líneas de código:** ~34,233+ | **Migraciones SQL:** 268

---

## 1. Resumen del Proyecto

Sistema ERP completo para distribuidora de abarrotes en Ciudad de México. Incluye web, tablet y móvil.

| Tecnología | Versión | Uso |
|---|---|---|
| React | 18.3.1 | Framework UI |
| TypeScript | 5.8.3 | Tipado estático |
| Vite | 5.4.19 | Build tool |
| Supabase | 2.84.0 | Backend/DB/Auth |
| TanStack Query | 5.83.0 | Estado servidor |
| Capacitor | 7.4.4 | Apps nativas |
| Tailwind CSS | 3.4.17 | Estilos |
| shadcn/ui | - | Componentes UI (60+) |
| Playwright | 1.57.0 | Testing E2E |

---

## 2. Arquitectura

### Estructura de Directorios
```
src/
├── components/    # 349 componentes React
│   ├── ui/        # shadcn/ui (60+ componentes base)
│   ├── admin/     # Panel administrador
│   ├── almacen/   # Gestión de almacén (60+ archivos)
│   ├── chofer/    # Panel de choferes
│   ├── clientes/  # Gestión de clientes
│   ├── compras/   # Órdenes de compra (40+ archivos)
│   ├── correos/   # Integración Gmail
│   ├── pedidos/   # Gestión de pedidos (30+ archivos)
│   ├── rutas/     # Gestión de rutas
│   └── ...        # 15+ módulos más
├── pages/         # 36 páginas/rutas
├── hooks/         # 20+ hooks personalizados
├── lib/           # Utilidades de negocio
├── services/      # Servicios (push, geolocation)
├── integrations/  # Cliente Supabase + tipos DB
├── constants/     # Catálogo SAT, datos empresa
└── utils/         # Generadores PDF, exportación
```

### Módulos Principales
1. **Ventas y Pedidos** - Creación, autorización, seguimiento, cobro
2. **Almacén** - QR scanning, recepción, carga, fumigaciones
3. **Inventario** - Lotes, caducidades, movimientos, multi-bodega
4. **Compras** - OC, proveedores, recepciones, devoluciones
5. **Rutas** - GPS en tiempo real, entregas, evidencias
6. **Finanzas** - Facturación, créditos, comisiones, rentabilidad
7. **RRHH** - Expedientes, documentos, disponibilidad
8. **Comunicación** - Chat interno, correos Gmail, notificaciones push
9. **Portal Cliente** - Pedidos, cotizaciones, acceso externo

### Roles del Sistema (8)
`admin` | `secretaria` | `vendedor` | `contadora` | `almacen` | `gerente_almacen` | `chofer` | `cliente`

---

## 3. Base de Datos

- **82 tablas** con Row Level Security (RLS) al 100%
- **348 políticas RLS** para control de acceso granular
- **127 índices** para rendimiento
- **180+ foreign keys** para integridad referencial
- **268 migraciones** (Nov 2025 - Mar 2026)

### Tablas Principales
- `productos`, `clientes`, `pedidos`, `pedidos_detalles`
- `rutas`, `entregas`, `facturas`, `pagos_cliente`
- `proveedores`, `ordenes_compra`, `inventario_movimientos`
- `empleados`, `vehiculos`, `conversaciones`, `mensajes`

---

## 4. Hallazgos de Seguridad

### CRÍTICO

| # | Problema | Archivo | Recomendación |
|---|----------|---------|---------------|
| 1 | API key de Google Maps hardcodeada en código fuente | `src/components/dashboard/MapaRutasWidget.tsx:14` | Usar `import.meta.env.VITE_GOOGLE_MAPS_API_KEY` |
| 2 | Archivo `.env` con credenciales en git | `.env` | Verificar `.gitignore`, rotar keys |

### ALTO

| # | Problema | Archivo | Recomendación |
|---|----------|---------|---------------|
| 3 | `new Function()` para carga dinámica | `src/hooks/useBodegaAutoDetect.ts:65-72` | Usar dynamic import directo |
| 4 | innerHTML sin sanitizar en templates de impresión | `src/components/remisiones/ImprimirRemisionDialog.tsx` y 3 más | Sanitizar con DOMPurify |

### MEDIO

| # | Problema | Archivo | Recomendación |
|---|----------|---------|---------------|
| 5 | Validación de contraseña débil (solo 6 chars) | `src/lib/utils.ts:66-74` | Requerir mayúsculas, números, mín. 8 chars |
| 6 | localStorage para tokens de sesión | `src/integrations/supabase/client.ts:13` | Evaluar sessionStorage |
| 7 | DOMPurify sin configuración restrictiva en emails | `src/components/correos/EmailDetailView.tsx:217` | Configurar ALLOWED_TAGS explícitamente |

---

## 5. Hallazgos de Calidad de Código

### ALTO

| # | Problema | Detalle | Impacto |
|---|----------|---------|---------|
| 1 | 763 console.log/error/warn en producción | Distribuidos en todo `src/` | Fuga de información en consola |
| 2 | Uso extendido del tipo `any` | Layout.tsx:63, cotizacionPdfGenerator.ts, aspelImporter.ts | Pérdida de seguridad de tipos |
| 3 | Componentes monolíticos (>2000 líneas) | OrdenesCompraTab.tsx (2,942), CrearOrdenCompraWizard.tsx (2,918), Empleados.tsx (2,769) | Difícil mantenimiento, re-renders costosos |

### MEDIO

| # | Problema | Detalle | Impacto |
|---|----------|---------|---------|
| 4 | `key={index}` en listas (23 instancias) | Múltiples componentes | Estados incorrectos al reordenar |
| 5 | Solo 4 usos de React.memo vs 482 useEffect | Todo el proyecto | Re-renders innecesarios |
| 6 | 84 setTimeout/setInterval | Posible falta de cleanup | Memory leaks potenciales |
| 7 | Patrones de autenticación inconsistentes | Layout.tsx, ProtectedRoute.tsx, SecretariaPanel.tsx | Estado de auth desincronizado |

---

## 6. Hallazgos de Base de Datos

### Fortalezas
- 100% cobertura RLS (348 políticas)
- Índices bien distribuidos (127)
- Integridad referencial completa (180+ FK)
- Patrones idempotentes (`IF NOT EXISTS`)
- Triggers `updated_at` estandarizados
- Sistema de enums bien definido

### Áreas de Mejora

| # | Problema | Detalle |
|---|----------|---------|
| 1 | Migraciones con DELETE hardcodeados con UUIDs | 8 migraciones con eliminación de datos específicos |
| 2 | Índices compuestos faltantes | (status, created_at) y (cliente_id, status) para reportes |
| 3 | Verificar triggers de historial | Tablas productos_historial_* necesitan validación |

---

## 7. Roadmap de Remediación Priorizado

### Semana 1 - CRÍTICO
- [ ] Remover API key hardcodeada de `MapaRutasWidget.tsx`
- [ ] Rotar Google Maps API key
- [ ] Verificar `.gitignore` incluye `.env`
- [ ] Aplicar restricciones de API key (referer, IP)

### Semana 2 - ALTO
- [ ] Eliminar/condicionar console.log (`if (import.meta.env.DEV)`)
- [ ] Reemplazar tipos `any` con interfaces tipadas
- [ ] Dividir componentes >2000 líneas en sub-componentes
- [ ] Refactorizar `new Function()` en useBodegaAutoDetect

### Semana 3 - MEDIO
- [ ] Mejorar validación de contraseñas
- [ ] Evaluar cambio a sessionStorage para auth
- [ ] Corregir `key={index}` usando IDs únicos
- [ ] Configurar DOMPurify restrictivamente para emails

### Continuo
- [ ] Agregar React.memo a componentes puros
- [ ] Auditar cleanup de setTimeout/setInterval
- [ ] Centralizar estado de autenticación (Context/Zustand)
- [ ] Agregar índices compuestos a DB
- [ ] Configurar `npm audit` en CI/CD

---

## 8. Métricas Generales

| Métrica | Valor |
|---------|-------|
| Componentes React | 349 |
| Páginas/Rutas | 36 |
| Hooks personalizados | 20+ |
| Tablas en DB | 82 |
| Políticas RLS | 348 |
| Migraciones SQL | 268 |
| Dependencias (producción) | 55+ |
| Generadores PDF | 6 |
| Roles de usuario | 8 |

---

*Análisis generado automáticamente - Claude Code*
