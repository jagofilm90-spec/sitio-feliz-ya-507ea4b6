# AUDITORÍA — Alta de Producto
**Fecha**: 28 abril 2026
**Propósito**: Validar que el flujo está listo para uso real (Día 1, semana adopción)

---

## 1. Archivos del flujo

| Archivo | Rol |
|---------|-----|
| `src/pages/Productos.tsx` (1,255 líneas) | **Página principal**. Contiene lista, dialog de crear/editar, desactivar/reactivar, filtros, búsqueda, navegación entre productos. Todo inline. |
| `src/components/productos/ProductoCardMobile.tsx` | Card mobile para la lista |
| `src/lib/productUtils.ts` | Helpers: `UNIDADES_SAT`, `UNIDADES_PRODUCTO`, `UNIDADES_LEGACY`, `getDisplayName` |
| `src/lib/notificarVendedores.ts` | Push notifications al crear producto nuevo |
| `src/hooks/usePermissions.ts` | Control `canSeeCosts` para mostrar/ocultar costos |
| `src/hooks/useCategorias.ts` | Hook para categorías canónicas |

**Ruta**: `/productos` (admin). Dialog se abre con botón "Nuevo Producto".

---

## 2. Campos del formulario actual

### Sección 1 — Información básica (siempre visible)

| # | Label | Tipo | Placeholder | Requerido | Validación | Default |
|---|-------|------|-------------|-----------|------------|---------|
| 1 | Nombre del producto * | input text | "Ej: Azúcar refinada, Frijol bayo, Arroz" | **Sí** | Detección de duplicados (nombre+marca+specs+unidad). Sugerencia de nombres similares con autocomplete datalist. | vacío |
| 2 | Código * | input text | "Ej: AZU-001" | **Sí** | Auto-sugiere siguiente número al escribir prefijo+guión. Detecta huecos en secuencia. Verifica unicidad. | vacío |
| 3 | Marca | input text | "Ej: Nestlé, Potrero" | No | Autocomplete datalist de marcas existentes | vacío |
| 4 | Categoría | select | "Seleccionar categoría" | No | Usa categorías canónicas (`useCategorias`) | vacío |
| 5 | Presentación / Especificaciones | input text | "Ej: 25kg, 6/2.8kg, 30/40" | No | Participante en detección duplicados | vacío |
| 6 | Vista previa nombre completo | texto | — | — | Auto-genera: "Azúcar refinada Potrero 25kg (bulto)" | — |

### Unidad + Peso + Contenido (3 columnas)

| # | Label | Tipo | Placeholder | Requerido | Default |
|---|-------|------|-------------|-----------|---------|
| 7 | Unidad * | select | — | **Sí** | "bulto" |
| 8 | Peso (kg) | input number | "Ej: 25" | No | vacío |
| 9 | Contenido | input text | "Ej: 24×800g, 6×3kg" | No | vacío |

Opciones de Unidad: bulto, balón, caja, churla, costal, cubeta, paquete, pieza + legacy si edita producto viejo.

### Sección 2 — Precio (siempre visible, con borde y fondo)

| # | Label | Tipo | Placeholder | Requerido | Default |
|---|-------|------|-------------|-----------|---------|
| 10 | Precio por unidad * (o "Precio por kg" si toggle activo) | input number con $ | "0.00" | **Sí** | vacío |
| 11 | Costo de compra | input number con $ | "0.00" | No (solo visible si `canSeeCosts`) | vacío |
| 12 | IVA 16% | switch | — | No | **false** |
| 13 | IEPS 8% | switch | — | No | **false** |
| 14 | Desc. máximo | input number con $ | "0.00" | No | vacío |
| 15 | Se vende por kilo | switch | — | No | false |

**Cálculos en tiempo real:**
- Margen % y ganancia en $ (color-coded: verde ≥10%, amarillo ≥5%, rojo <5%)
- Si precio por kilo activo y peso definido: "= $XXX por [unidad]"
- Warning si margen negativo
- Warning si descuento > precio

### Sección 3 — Inventario y proveedor (colapsable `<details>`)

| # | Label | Tipo | Placeholder | Requerido | Default |
|---|-------|------|-------------|-----------|---------|
| 16 | Stock mínimo de alerta | input number | "0" | No | "0" |
| 17 | Proveedor principal | select | "Seleccionar (opcional)" | No | vacío |
| 18 | Maneja fecha de caducidad | switch | — | No | false |

Texto auxiliar en caducidad: "El almacén registrará la fecha al recibir cada lote"

### Sección 4 — Configuración especial (colapsable `<details>`)

| # | Label | Tipo | Placeholder | Requerido | Default |
|---|-------|------|-------------|-----------|---------|
| 19 | Requiere fumigación | switch | — | No | false |
| 19a | Última fumigación (condicional) | input date | — | No | vacío |
| 20 | Solo uso interno | switch | — | No | false |
| 21 | Ventas bloqueadas | switch | — | No | false |
| 22 | En promoción | switch | — | No | false |
| 22a | Descripción de la promoción (condicional) | input text | "Ej: Compra 3 lleva 4" | No | vacío |

Textos auxiliares: "No aparece en pedidos de clientes" (uso interno), "Nadie puede venderlo temporalmente" (bloqueado), "El sistema alertará cada 6 meses" (fumigación).

### Sección 5 — Datos fiscales CFDI (colapsable `<details>`)

| # | Label | Tipo | Placeholder | Requerido | Default |
|---|-------|------|-------------|-----------|---------|
| 23 | Clave SAT | input text | "Ej: 50201502" | No | vacío |
| 24 | Unidad SAT | select | "Seleccionar" | No | vacío |
| 25 | Piezas por unidad | input number | "Ej: 24" | No | "1" |

### Toggle discreto

| # | Label | Tipo | Default |
|---|-------|------|---------|
| 26 | Producto activo | switch | true |

### Botones

- **Crear** (nuevo) / **Guardar** (editar) — disabled si guardando
- **Cancelar**
- **← Ant / Sig →** (solo editar) — navegación entre productos sin cerrar dialog

---

## 3. Diseño visual vs Design Canon

| Criterio | Estado | Detalle |
|----------|--------|---------|
| PageHeader canónico | ✅ Canónico | `title="Tus" titleAccent="productos."` con eyebrow "Catálogos" |
| Título dialog | 🔴 No canónico | `"Nuevo Producto"` / `"Editar Producto"` — sans-serif, sin italic accent, sin punto |
| DialogDescription | ✅ Presente | `"Completa la información del producto"` (pero sin serif italic) |
| Secciones | 🟡 Funcional | Usa icono + texto bold (Package, Tag, FileText) — no usa patrón canónico `text-xs uppercase tracking` |
| Botones primary | 🟡 Default shadcn | No es explícito `bg-crimson-500` |
| Emojis en título | ✅ Sin emojis | Correcto |

---

## 4. Brechas vs negocio

| Necesidad del negocio | ¿Cubierta? | Detalle |
|-----------------------|-----------|---------|
| Información básica (nombre, marca, categoría) | ✅ Sí | Con autocomplete, detección duplicados, sugerencia nombres |
| Configuración fiscal (aplica_iva, aplica_ieps) | ✅ Sí | Switches IVA 16% + IEPS 8% |
| Código SAT para CFDI | ✅ Sí | Input libre + Select unidad SAT |
| Precios (compra, venta) | ✅ Sí | Con margen en tiempo real y protección contra costos |
| Stock mínimo | ✅ Sí | En sección Inventario |
| Caducidad | ✅ Sí | Switch `maneja_caducidad` |
| Por kilo | ✅ Sí | Switch + cálculos adaptativos |
| Categoría/giro | ✅ Sí | Select con categorías canónicas |
| Proveedor preferido | ✅ Sí | Select en sección Inventario |
| Variantes promocionales | ✅ Sí | Switch + descripción |
| Fumigación | ✅ Sí | Switch + fecha última |
| Contenido empaque | ✅ Sí | Input libre (24×800g, 6×3kg) |
| Descuento máximo | ✅ Sí | Input numérico |
| Uso interno | ✅ Sí | Switch |
| Bloqueo de venta | ✅ Sí | Switch con visual destructive |

**No hay brechas funcionales.** El formulario cubre todo lo que ALMASA necesita.

---

## 5. Conexión con BD

### Mapeo form → productData → INSERT/UPDATE

| Campo form | Columna BD | Mapeado |
|-----------|------------|---------|
| `codigo` | `codigo` | ✅ |
| `codigo_sat` | `codigo_sat` | ✅ |
| `nombre` | `nombre` | ✅ |
| `marca` | `marca` | ✅ |
| `categoria` | `categoria` | ✅ |
| `categoria` → lookup | `categoria_id` | ✅ (resuelve FK con `useCategorias`) |
| `especificaciones` | `especificaciones` | ✅ |
| `contenido_empaque` | `contenido_empaque` | ✅ |
| `unidad_sat` | `unidad_sat` | ✅ |
| `peso_kg` | `peso_kg` | ✅ |
| `unidad` | `unidad` | ✅ |
| `piezas_por_unidad` | `piezas_por_unidad` | ✅ |
| `precio_compra` | `precio_compra` | ✅ |
| `precio_venta` | `precio_venta` | ✅ |
| `precio_por_kilo` | `precio_por_kilo` | ✅ |
| `descuento_maximo` | `descuento_maximo` | ✅ |
| `stock_minimo` | `stock_minimo` | ✅ |
| `maneja_caducidad` | `maneja_caducidad` | ✅ |
| `aplica_iva` | `aplica_iva` | ✅ |
| `aplica_ieps` | `aplica_ieps` | ✅ |
| `activo` | `activo` | ✅ |
| `requiere_fumigacion` | `requiere_fumigacion` | ✅ |
| `fecha_ultima_fumigacion` | `fecha_ultima_fumigacion` | ✅ |
| `solo_uso_interno` | `solo_uso_interno` | ✅ |
| `es_promocion` | `es_promocion` | ✅ |
| `descripcion_promocion` | `descripcion_promocion` | ✅ |
| `bloqueado_venta` | `bloqueado_venta` | ✅ |

### Columnas en BD que el form NO captura (correctamente)

| Columna | Por qué no se captura | Riesgo |
|---------|----------------------|--------|
| `id` | Auto-generado UUID | ✅ |
| `stock_actual` | Se actualiza por triggers al recibir lotes | ✅ |
| `ultimo_costo_compra` | Se actualiza al conciliar OC | ✅ |
| `fecha_ultima_compra` | Se actualiza al conciliar OC | ✅ |
| `costo_promedio_ponderado` | Calculado por RPC | ✅ |
| `puede_tener_promocion` | No en el form pero existe en BD | 🟡 |
| `producto_base_id` | Solo para variantes promo creadas desde wizard OC | ✅ |
| `descripcion` | Campo legacy, no usado | ✅ |
| `created_at` / `updated_at` | Auto | ✅ |

### 🟡 ISSUE — `puede_tener_promocion` no tiene UI

La columna `puede_tener_promocion` (boolean) existe en BD y es leída por `CrearOrdenCompraWizard` para ofrecer crear variantes promo al agregar un producto. Pero **no hay switch ni campo en el formulario de Alta de Producto** para activarla. Solo se puede modificar directamente en BD.

**Impacto**: Los productos nunca tendrán `puede_tener_promocion = true` a menos que se actualicen manualmente en SQL. El wizard de OC nunca ofrecerá crear variantes promo.

### Campos del form que NO están en BD

**Ninguno.** Todo el `productData` mapea 1:1 a columnas reales. (A diferencia de proveedores donde había 8 columnas faltantes — aquí el mapeo es perfecto).

### Lógica adicional al guardar

1. **Stock inicial**: Si se ingresa, crea un `inventario_lotes` con `lote_referencia: "Lote inicial"` y actualiza `stock_actual`
2. **Proveedor**: Si se selecciona, crea relación en `proveedor_productos`
3. **Notificación**: Al crear producto nuevo (no interno, no bloqueado), envía push a admin/secretaria/vendedor

---

## 6. Veredicto

### ¿Listo para uso real? **SÍ**

El formulario de Alta de Producto es **funcionalmente completo y bien construido**:

- 26 campos organizados en 5 secciones lógicas
- Validaciones inteligentes (duplicados, códigos, márgenes)
- Autocomplete de nombres y marcas existentes
- Sugerencia automática de código secuencial
- Cálculo de margen en tiempo real
- Navegación entre productos sin cerrar dialog (para edición masiva)
- Stock inicial + lote automático
- Notificación push al equipo

### Issues por prioridad

| # | Severidad | Issue | Impacto |
|---|-----------|-------|---------|
| 1 | 🟡 | `puede_tener_promocion` sin UI en el formulario | Variantes promo nunca se ofrecen en wizard OC |
| 2 | 🟡 | `aplica_iva` default false — la mayoría de productos gravan IVA | Cada producto nuevo requiere activar manualmente el switch IVA |
| 3 | 🟡 | Título dialog no sigue Design Canon | Cosmético |
| 4 | 🟢 | `codigo_sat` es input libre sin validación de formato | Se puede escribir cualquier cosa |
| 5 | 🟢 | Secciones Inventario y CFDI colapsadas — usuario puede no verlas | Pero la mayoría de campos son opcionales |

---

## 7. Acciones recomendadas

### Antes de capacitar (esta semana)

1. **El default de `aplica_iva` debería ser `true`**, no `false`. La gran mayoría de productos de abarrotes gravan IVA 16%. El usuario debería desmarcar los pocos que no (canasta básica). Actualmente es al revés: hay que marcar uno por uno. **Esto explica por qué solo 99 de 274 productos tienen `aplica_iva = true` (36%)** — el default estaba mal y nadie lo marcó.

2. **Corregir en BD los 274 productos existentes**: hacer `UPDATE productos SET aplica_iva = true WHERE aplica_iva = false` (excepto los que realmente son exentos).

### Después de la primera semana

3. Agregar switch `puede_tener_promocion` al formulario (sección Configuración especial)
4. Migrar título dialog a canon: "Nuevo *producto*."
5. Validación de formato código SAT (8 dígitos numéricos)

### NO TOCAR

- La detección de duplicados es excelente
- El auto-sugeridor de códigos es muy útil
- El cálculo de margen en tiempo real es diferenciador
- La navegación ← Ant / Sig → al editar es productiva para limpieza masiva
- Las secciones colapsables mantienen el form limpio

---

*Documento de auditoría. No hacer commit hasta que Jose valide.*
