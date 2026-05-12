# PLAN REWRITE ALMASA-OS v1.0
**Fecha**: 24 abril 2026
**Autor de la decisión**: Jose Antonio Gómez Ortega, Director General
**Duración estimada**: 3 semanas (15 días hábiles)
**Status**: APROBADO

---

## 1. Diagnóstico

Auditoría visual (AUDIT-ESTETICO-PURO.html) identificó 18 pantallas con
3 estilos coexistentes (13 Editorial, 4 Funcional, 1 Mobile-First).

Auditoría funcional (AUDIT-VISUAL-DIVERGENCIAS.html) identificó:
- Productos: 2 implementaciones divergentes (admin + secretaria)
- Clientes: 3 implementaciones (admin page + vendedor sheet + secretaria tab)
- Pedidos: 3 implementaciones (admin dialog + vendedor wizard + cliente page)
- Inventario: 3 implementaciones (admin + secretaria + almacén)
- Lista Precios: 3 implementaciones (admin + secretaria + vendedor)

Total: ~14 implementaciones para 5 módulos = 9 implementaciones de exceso.

Costo de la duplicación:
- Inconsistencia visual entre roles (mismo objeto, distinta UI)
- Mantenimiento triple (1 cambio = 3 archivos)
- Bugs específicos por implementación
- Confusión para usuarios que cambian de rol

---

## 2. Decisión de arquitectura

### Principio rector
**"Un componente por dominio. Permisos centralizados. Pantallas idénticas."**

### Patrón objetivo

```tsx
// MAL (estado actual)
src/pages/Productos.tsx                                  // admin
src/components/secretaria/SecretariaProductosTab.tsx      // secretaria

// BIEN (estado objetivo)
src/components/productos/ProductosModule.tsx              // único componente
// Cada panel/página lo usa con sus permisos:
<ProductosModule />
// Internamente consulta usePermissions('productos', 'edit') etc.
```

### Reglas no negociables

1. **Pantallas idénticas**: mismo orden de columnas, mismas secciones,
   mismos campos visibles para todos los roles
2. **Diferencias solo por permisos de edición**: admin puede editar X,
   secretaria puede editar Y, vendedor solo lee
3. **Sin disabled**: si un rol no puede editar un campo, se renderiza
   condicionalmente (no aparece el campo o aparece read-only)
4. **Hook usePermissions centralizado**: una sola fuente de verdad de
   permisos por rol
5. **Diseño canónico Editorial v1.0**: todos los componentes siguen el
   Design Canon (font-serif, italic crimson accent, punto final, etc.)

---

## 3. Pre-requisitos (Fase 0)

Antes de tocar módulos, verificar/crear:

### A. Hook usePermissions

Archivo existente: `src/hooks/usePermissions.ts` (creado en M04.5B.1)

Signature actual:
```ts
usePermissions(module: PermissionModule, action: PermissionAction): boolean
```

Módulos cubiertos: pedidos, clientes, productos, empleados, inventario,
compras, asistencia, rutas, facturas, configuracion.

Acciones cubiertos: view, create, edit, delete, edit_price, authorize,
adjust_stock, manage_roles, see_costs, register_manual, conciliate, manage.

**Validar**: que todas las acciones necesarias para el rewrite existen.
Si faltan, agregar a PERMISSION_MATRIX.

### B. Hook useUserRoles

Archivo existente: `src/hooks/useUserRoles.ts`

Retorna: `{ roles, isAdmin, isSecretaria, isVendedor, isChofer,
isAlmacen, isContadora, isCliente, isGerenteAlmacen, hasRole, hasAnyRole }`

**Status**: completo, no necesita cambios.

### C. Tipos TypeScript estrictos

Archivo existente: `src/integrations/supabase/types.ts` (auto-generado)

**Objetivo durante rewrite**: reemplazar `as any` por tipos correctos
en cada módulo migrado. Meta: cero `as any` en archivos nuevos.

---

## 4. Fases del rewrite

### FASE 0 — Cimientos (Día 0, ~2 horas)

- [ ] Validar usePermissions cubre todas las acciones del rewrite
- [ ] Documentar matriz de permisos por rol/módulo (tabla abajo)
- [ ] Crear directorios si no existen:
  - `src/components/productos/` (ya existe parcialmente)
  - `src/components/clientes/` (ya existe parcialmente)
  - `src/components/pedidos/` (ya existe parcialmente)
  - `src/components/inventario/` (crear)
  - `src/components/precios/` (ya existe: shared/)

#### Matriz de permisos por rol/módulo

| Acción | Admin | Secretaria | Vendedor | Contadora | Almacén | Gerente |
|--------|-------|------------|----------|-----------|---------|---------|
| **PRODUCTOS** | | | | | | |
| Ver catálogo | ✅ | ✅ | ❌ (via precios) | ✅ | ✅ | ✅ |
| Crear producto | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Editar producto | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver costos | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Editar precio venta | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Editar precio compra | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Eliminar producto | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **CLIENTES** | | | | | | |
| Ver lista | ✅ todos | ✅ todos | ✅ sus clientes | ❌ | ❌ | ❌ |
| Crear cliente | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Editar cliente | ✅ | ✅ | ✅ (sus) | ❌ | ❌ | ❌ |
| Editar datos fiscales | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Asignar vendedor | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Configurar crédito | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Eliminar cliente | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **PEDIDOS** | | | | | | |
| Ver lista | ✅ todos | ✅ todos | ✅ sus clientes | ❌ | ❌ | ❌ |
| Crear pedido | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Editar precio | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Autorizar | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Cancelar | ✅ | ❌ | ✅ (sus) | ❌ | ❌ | ❌ |
| Eliminar | ✅ | ❌ | ✅ (sus) | ❌ | ❌ | ❌ |
| **INVENTARIO** | | | | | | |
| Ver stock | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Ajustar stock | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Dar de baja lote | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **PRECIOS** | | | | | | |
| Ver lista | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Editar precio | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Simulador margen | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Bulk update | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Export Excel | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Comparar último precio cliente | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |

---

### FASE 1 — Módulo PRODUCTOS (Días 1-3, ~10 horas)

**Por qué primero**: relativamente simple (CRUD + precios), buen piloto.

**Archivos a crear:**
- `src/components/productos/ProductosModule.tsx` — lista unificada
- `src/components/productos/ProductoForm.tsx` — form/dialog unificado
- `src/components/productos/useProductosPermissions.ts` — permisos

**Archivos a reemplazar:**
- `src/pages/Productos.tsx` → importa `<ProductosModule />`
- `src/components/secretaria/SecretariaProductosTab.tsx` → importa `<ProductosModule />`

**Archivos a eliminar (después de migrar):**
- Código legacy duplicado en SecretariaProductosTab.tsx (919 líneas)

**Definition of Done:**
- [ ] Build verde + tsc limpio
- [ ] Visual idéntico admin/secretaria
- [ ] Permisos respetados (admin edita precio compra, secretaria no)
- [ ] Datos de la DB cargan correctamente
- [ ] Crear, editar, eliminar funcionan en ambos roles
- [ ] Design Canon: título serif con accent + punto final

---

### FASE 2 — Módulo CLIENTES (Días 4-6, ~12 horas)

**Archivos a crear:**
- `src/components/clientes/ClientesModule.tsx` — lista unificada
- `src/components/clientes/ClienteForm.tsx` — form unificado
- `src/components/clientes/useClientesPermissions.ts`

**Archivos a reemplazar:**
- `src/pages/Clientes.tsx` → importa `<ClientesModule />`
- `src/pages/clientes/NuevoCliente.tsx` → usa `<ClienteForm />`
- `src/components/secretaria/SecretariaClientesTab.tsx` → importa `<ClientesModule />`
- `src/components/vendedor/VendedorMisClientesTab.tsx` → importa `<ClientesModule />`

**Excepción móvil:** VendedorNuevoClienteSheet mantiene inputs h-14
y dividers centrados para uso en campo. Solo el título migra al canon.

**Definition of Done:**
- [ ] Build verde + tsc limpio
- [ ] Visual idéntico admin/secretaria/vendedor (lista)
- [ ] Form de creación sigue canon editorial
- [ ] Vendedor solo ve sus clientes (RLS ya existente)
- [ ] Datos fiscales editables solo por admin/secretaria
- [ ] GPS/horarios capturables por vendedor

---

### FASE 3 — Módulo PEDIDOS (Días 7-10, ~16 horas)

**Más complejo**: 3 implementaciones, workflow de estados, validaciones
de precio, offline/draft del vendedor.

**Archivos a crear:**
- `src/components/pedidos/PedidosModule.tsx` — lista unificada
- `src/components/pedidos/PedidoForm.tsx` — wizard 4 pasos canónicos
- `src/components/pedidos/usePedidosPermissions.ts`

**Archivos a reemplazar:**
- `src/pages/Pedidos.tsx` → importa `<PedidosModule />`
- `src/components/secretaria/SecretariaPedidosTab.tsx` → importa `<PedidosModule />`
- `src/components/vendedor/VendedorPedidosTab.tsx` → importa `<PedidosModule />`

**Archivos con excepciones:**
- `VendedorNuevoPedidoTab.tsx` — wizard mobile con offline draft.
  El PedidoForm unificado debe soportar modo wizard + modo dialog.
- `ClienteNuevoPedido.tsx` — portal self-service.
  El PedidoForm debe soportar modo reducido (sin precio editable).

**Lógica compartida existente:**
- `calcularTotalesPedido` (src/lib/pedidoUtils.ts) — ya extraído
- `generar_folio_pedido` (RPC) — ya unificado

**Definition of Done:**
- [ ] Build verde + tsc limpio
- [ ] Lista de pedidos idéntica entre roles
- [ ] Wizard de creación funciona en admin (dialog) y vendedor (fullscreen)
- [ ] Offline draft sigue funcionando en vendedor
- [ ] Portal cliente sigue funcionando con precios fijos
- [ ] Alertas de precio (bajo_piso, error_dedo) funcionan

---

### FASE 4 — Módulo INVENTARIO (Días 11-12, ~8 horas)

**Archivos a crear:**
- `src/components/inventario/InventarioModule.tsx` — vista unificada
- `src/components/inventario/useInventarioPermissions.ts`

**Archivos a reemplazar:**
- `src/pages/Inventario.tsx` → importa `<InventarioModule />`
- `src/components/secretaria/SecretariaInventarioTab.tsx` → importa `<InventarioModule />`
- `src/components/almacen/AlmacenInventarioTab.tsx` → importa `<InventarioModule />`

**Permisos clave:**
- Admin: CRUD completo
- Secretaria: read-only (view stock, lotes, movimientos)
- Almacén: view + adjust stock (canAdjust via usePermissions)
- Gerente: view + adjust + dar de baja (canRemove)

**Definition of Done:**
- [ ] Build verde + tsc limpio
- [ ] Vista idéntica entre roles
- [ ] Ajuste de stock solo visible para almacén/gerente/admin
- [ ] Baja de lotes solo para gerente/admin
- [ ] RPC registrar_baja_caducidad funciona

---

### FASE 5 — Módulo LISTA PRECIOS (Día 13, ~6 horas)

**Archivos a crear:**
- `src/components/precios/ListaPreciosModule.tsx` — vista unificada

**Archivos a reemplazar:**
- `src/components/admin/AdminListaPreciosTab.tsx` (636 lín)
- `src/components/secretaria/SecretariaListaPreciosTab.tsx` (465 lín)
- `src/components/vendedor/VendedorListaPreciosTab.tsx` (419 lín)

**Hooks existentes a reutilizar:**
- `useListaPrecios` — datos + filtros + sort
- `usePrecioEditor` — edición + calculadora + notificaciones
- `usePrecioHistorial` — historial lazy-load

**Componentes shared existentes:**
- `PromocionBadge`, `ImpuestoBadges` (M04.5B.2.1)
- `ListaPreciosPdfButton` (M04.5B.2.2)
- `PrecioHistorialDialog`, `RevisionesPrecioPanel`, `PdfExportDialog`

**Lección aprendida (docs/lecciones/lista-precios-consolidacion.md):**
Se intentó consolidar antes y se concluyó que las columnas son genuinamente
distintas. El rewrite cambia esa decisión: ahora TODAS las columnas son
visibles, con permisos que controlan qué se puede editar.

**Definition of Done:**
- [ ] Build verde + tsc limpio
- [ ] Vista idéntica (11 columnas para todos)
- [ ] Admin: editar + simular + bulk + Excel
- [ ] Secretaria: editar con calculadora
- [ ] Vendedor: read-only + comparar último precio cliente
- [ ] PDF export funciona para todos

---

### FASE 6 — Cierre (Días 14-15, ~6 horas)

- [ ] Limpieza final de imports muertos
- [ ] Eliminación de archivos legacy (SecretariaXTab, VendedorXTab reemplazados)
- [ ] Verificar que SecretariaPanel, VendedorPanel, AlmacenTablet usan los módulos unificados
- [ ] Actualizar MAPA-MAESTRO-ALMASA-OS.html con nueva arquitectura
- [ ] Actualizar orden-madurez-REAL.md con nuevos %
- [ ] Commit final + tag `rewrite-v1.0`
- [ ] Actualizar Design Canon si hubo descubrimientos nuevos

---

## 5. Riesgos y mitigaciones

| Riesgo | Prob. | Impacto | Mitigación |
|--------|-------|---------|------------|
| usePermissions no cubre todas las acciones | Alta | Alto | Fase 0 lo completa antes |
| Cambios rompen integración Supabase | Media | Alto | Tests por módulo + commits frecuentes |
| Vendedor wizard mobile rompe con unificación | Alta | Medio | Sheet específico, solo unificar lógica |
| Jose pierde momentum a mitad del rewrite | Media | Alto | Definition of Done clara por fase |
| Bugs no detectados por falta de data de prueba | Alta | Bajo | Sistema en construcción, bugs se encuentran al usar |
| Scope creep (agregar features durante rewrite) | Alta | Alto | Regla: NO features nuevas durante 3 semanas |
| SecretariaPanel/VendedorPanel se rompen | Media | Alto | Migrar componente por componente, no todo junto |

---

## 6. Definition of Done global

El rewrite se considera 100% terminado cuando:

- [ ] Las 14 implementaciones duplicadas se redujeron a 5 únicas
- [ ] Todos los módulos siguen el Design Canon Editorial
- [ ] usePermissions centraliza todos los permisos
- [ ] Cero `disabled={!permission}` en archivos nuevos
- [ ] Build verde + tsc sin errores
- [ ] Cada módulo se ve idéntico entre roles (verificación visual)
- [ ] No hay archivos *Tab.tsx por rol con lógica de presentación duplicada
- [ ] Documentación actualizada (Canon, Mapa Maestro, Madurez)

---

## 7. Lo que NO está en el rewrite

Para evitar scope creep, este rewrite NO incluye:
- Backend Supabase (RLS, RPCs ya están bien)
- Cambios de DB schema
- Features nuevas (lo que no existe hoy, no se agrega)
- Optimización performance (vendrá después)
- Tests automatizados (vendrá después)
- Migración Aspel (proyecto separado)
- Dark mode, i18n, screen reader
- Responsive para secretaria/contadora (desktop only)

---

## 8. Pausa de features durante rewrite

Durante las 3 semanas:
- ❌ NO se construyen features nuevas
- ❌ NO se atienden bugs cosméticos no relacionados al rewrite
- ✅ SÍ se atienden bugs críticos que rompen operación
- ✅ SÍ se atienden cambios de Supabase necesarios para el rewrite

---

## 9. Avance trackeable

Al final de cada día, actualizar esta sección con:

| Día | Fase | Status | Notas |
|-----|------|--------|-------|
| 0 | Fase 0 Cimientos | ⏸️ Pendiente | |
| 1 | Fase 1 Productos | ⏸️ Pendiente | |
| 2 | Fase 1 Productos | ⏸️ Pendiente | |
| 3 | Fase 1 Productos | ⏸️ Pendiente | |
| 4 | Fase 2 Clientes | ⏸️ Pendiente | |
| 5 | Fase 2 Clientes | ⏸️ Pendiente | |
| 6 | Fase 2 Clientes | ⏸️ Pendiente | |
| 7 | Fase 3 Pedidos | ⏸️ Pendiente | |
| 8 | Fase 3 Pedidos | ⏸️ Pendiente | |
| 9 | Fase 3 Pedidos | ⏸️ Pendiente | |
| 10 | Fase 3 Pedidos | ⏸️ Pendiente | |
| 11 | Fase 4 Inventario | ⏸️ Pendiente | |
| 12 | Fase 4 Inventario | ⏸️ Pendiente | |
| 13 | Fase 5 Precios | ⏸️ Pendiente | |
| 14 | Fase 6 Cierre | ⏸️ Pendiente | |
| 15 | Fase 6 Cierre | ⏸️ Pendiente | |

---

## 10. Referencias

- Design Canon: `docs/DESIGN-CANON-ALMASA.md`
- Mapa Maestro: `docs/MAPA-MAESTRO-ALMASA-OS.html`
- Audit Estético: `docs/AUDIT-ESTETICO-PURO.html`
- Audit Funcional: `docs/AUDIT-VISUAL-DIVERGENCIAS.html`
- Madurez REAL: `docs/roadmap/orden-madurez-REAL.md`
- Lecciones Lista Precios: `docs/lecciones/lista-precios-consolidacion.md`
- Comparativa Nuevo Cliente: `docs/auditoria/nuevo-cliente-comparativa.md`
- Discovery Nuevo Pedido: `/tmp/discovery-nuevo-pedido.md`

---

**Acuerdo de inicio**: 24 abril 2026
**Cierre estimado**: 15 mayo 2026 (15 días hábiles)
**Próxima acción**: Fase 0 — validar usePermissions + matriz de permisos
