# AUDITORÍA — Alta de Proveedor
**Fecha**: 28 abril 2026
**Propósito**: Validar que el flujo está listo para uso real (Día 1, semana adopción)

---

## 1. Archivos del flujo

| Archivo | Rol |
|---------|-----|
| `src/components/compras/ProveedoresTab.tsx` (~1900 líneas) | **Componente principal**. Contiene lista, dialog de crear, dialog de editar, desactivar/reactivar, filtros, búsqueda. Todo inline en un solo archivo. |
| `src/components/compras/ProveedorCardMobile.tsx` | Card mobile para la lista de proveedores |
| `src/components/compras/ProveedorProductosSelector.tsx` | Asociar productos al proveedor (dialog separado) |
| `src/components/compras/CuentaCorrienteProveedorDialog.tsx` | Estado de cuenta del proveedor |
| `src/components/compras/ProveedorFacturasDialog.tsx` | Facturas del proveedor |
| `src/components/compras/EnviarEvidenciasProveedorDialog.tsx` | Enviar fotos de evidencia al proveedor |
| `src/components/compras/AdeudosProveedoresTab.tsx` | Vista de adeudos a proveedores |
| `src/lib/proveedorUtils.ts` | Helpers para formatear dirección fiscal en PDFs (MAYÚSCULAS) |
| `src/constants/catalogoSAT.ts` | Catálogo de regímenes fiscales SAT |

**No hay ruta `/proveedores` independiente.** El alta vive dentro de `/compras` → tab "Proveedores".
**No hay hook `useProveedores`.** La query está inline con React Query en ProveedoresTab.

---

## 2. Campos del formulario actual

### Acción especial: Subir CSF (Constancia de Situación Fiscal)

Zona de drag/upload de PDF al inicio del dialog. Llama Edge Function `parse-csf` que extrae con IA: razón social, RFC, dirección estructurada (calle, colonia, municipio, estado, CP). Auto-llena los campos del formulario.

### Sección 1 — Información básica

| Campo | Tipo | Requerido | Placeholder | Validación |
|-------|------|-----------|-------------|------------|
| Nombre del proveedor | text | **Sí** (único campo obligatorio para guardar) | "Ej: Ingenio El Mante, Nestlé" | Solo `!nombre` bloquea el botón guardar |
| Nombre comercial | text | No | "Ej: El Mante, Nestlé" | Ninguna |
| Categoría | select | No | "Seleccionar categoría" | 10 opciones fijas: Azúcares, Granos y semillas, Abarrotes secos, Lácteos, Aceites, Botanas, Bebidas, Limpieza, Mascotas, Otros |
| País | text | No (default: "México") | "México" | Ninguna |

### Sección 2 — Datos fiscales (colapsable, cerrada por default)

| Campo | Tipo | Requerido | Placeholder | Validación |
|-------|------|-----------|-------------|------------|
| RFC | text | No | "ABC123456XYZ" | Auto-uppercase. **Sin validación de formato RFC** (12 o 13 caracteres, estructura SAT) |
| Régimen fiscal | text (libre) | No | "601 - General de Ley" | **Input libre, no es Select con catálogo SAT** |
| Calle | text | No | "Av. Principal" | Ninguna |
| Num. Exterior | text | No | "#123" | Ninguna |
| Num. Interior | text | No | "4A" | Ninguna |
| Colonia | text | No | "Col. Centro" | Ninguna |
| Municipio | text | No | "Monterrey" | Ninguna |
| Estado | text | No | "Nuevo León" | Ninguna |
| Código postal | text | No | "64000" | Ninguna |
| Dirección completa (legacy) | text | No | "Av. Principal #123, Col. Centro" | Campo legacy, fallback para proveedores migrados sin dirección estructurada |

### Sección 3 — Condiciones comerciales

| Campo | Tipo | Requerido | Placeholder | Validación |
|-------|------|-----------|-------------|------------|
| Término de pago | select | No (default: "contado") | "Seleccionar" | 7 opciones: Contado, 8 días, 15 días, 30 días, 45 días, 60 días, Anticipado |
| Frecuencia de compra | select | No | "Seleccionar" | 4 opciones: Semanal, Quincenal, Mensual, Según necesidad |
| Días de visita | checkboxes | No | — | 6 opciones: Lun, Mar, Mié, Jue, Vie, Sáb |

### Sección 4 — Datos bancarios (colapsable, cerrada por default)

| Campo | Tipo | Requerido | Placeholder | Validación |
|-------|------|-----------|-------------|------------|
| Banco | text | No | "Ej: BBVA, Banamex, Santander" | Ninguna |
| Beneficiario | text | No | "Nombre del titular" | Ninguna |
| Número de cuenta | text | No | "10 dígitos" | Solo dígitos, máx 10 chars |
| CLABE interbancaria | text | No | "18 dígitos" | Solo dígitos, máx 18 chars. **Valida longitud: error si > 0 y ≠ 18** |

### Sección 5 — Contactos (siempre abierta)

Sistema multi-contacto completo:
- Agregar N contactos con: nombre*, teléfono, correo
- Por contacto: checkboxes de responsabilidad (Órdenes, Pagos, Devoluciones, Logística)
- Marcar contacto principal (⭐)
- Edición inline, eliminar
- Si hay contacto pendiente en el form al guardar, se agrega automáticamente

### Sección 6 — Notas

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| Notas | textarea | No | Ninguna |

### Botón de guardar

- Texto: "Guardar Proveedor"
- Disabled si: `!nombre` o mutación en progreso
- Clase: default de shadcn Button (no tiene clase explícita `bg-crimson-500`)
- Ancho completo (`w-full`)

---

## 3. Diseño visual vs Design Canon

| Criterio | Estado | Detalle |
|----------|--------|---------|
| Título editorial (font-serif, italic accent, punto final) | 🔴 No canónico | `<DialogTitle>Registrar Nuevo Proveedor</DialogTitle>` — sans-serif, sin italic accent, sin punto |
| Descripción font-serif italic | 🔴 Ausente | No hay DialogDescription |
| Secciones con patrón canónico | 🟡 Parcial | Usa `FormSection` con icono + título bold — funcional pero no usa `text-xs uppercase tracking-[0.15em]` del canon |
| Botón primary crimson | 🔴 No canónico | Botón usa default shadcn (no `bg-crimson-500`) |
| Emojis en título | ✅ Sin emojis | Correcto |
| Dialog de edición | 🔴 No canónico | `<DialogTitle>Editar Proveedor</DialogTitle>` — mismo problema |

**Título correcto según el canon sería:**
```jsx
<DialogTitle className="font-serif text-2xl font-light text-ink-900">
  Nuevo <em className="italic text-crimson-500 font-normal">proveedor</em>.
</DialogTitle>
```

---

## 4. Brechas respecto al negocio

| Necesidad del negocio | ¿Cubierta? | Detalle |
|-----------------------|-----------|---------|
| Datos fiscales (razón social, RFC, régimen) | ✅ Sí | Nombre + RFC + régimen fiscal + CSF auto-parse |
| Dirección fiscal estructurada | ✅ Sí | 7 campos (calle, ext, int, colonia, municipio, estado, CP) + legacy |
| Contacto (nombre, teléfono, email) | ✅ Sí | Multi-contacto con roles de responsabilidad — muy completo |
| Días de crédito del proveedor | ✅ Sí | Select con 7 opciones (contado, 8, 15, 30, 45, 60 días, anticipado) |
| Tipo de pago default | ✅ Sí | Incluido en término de pago (contado vs anticipado) |
| Días de entrega programada | ✅ Sí | Checkboxes Lun-Sáb + frecuencia (semanal/quincenal/mensual/según necesidad) |
| Categoría/giro | ✅ Sí | Select con 10 categorías de abarrotes |
| Notas | ✅ Sí | Textarea libre |
| Datos bancarios para pagos | ✅ Sí | Banco, beneficiario, cuenta, CLABE |
| Upload de CSF para auto-llenado | ✅ Sí | Edge Function `parse-csf` con IA |

**No hay brechas funcionales respecto al negocio.** El formulario cubre todo lo que ALMASA necesita para operar con un proveedor.

---

## 5. Conexión con BD

### Tabla: `proveedores` (21 columnas en DB)

| Columna DB | Campo del form | ¿Mapeado? |
|------------|---------------|-----------|
| `id` | Auto (uuid) | ✅ |
| `nombre` | Nombre del proveedor | ✅ |
| `nombre_comercial` | Nombre comercial | ✅ |
| `nombre_contacto` | Se llena con contacto principal | ✅ |
| `email` | Se llena con email del contacto principal | ✅ |
| `telefono` | Se llena con teléfono del contacto principal | ✅ |
| `direccion` | Dirección completa (legacy) | ✅ |
| `pais` | País | ✅ |
| `rfc` | RFC | ✅ |
| `regimen_fiscal` | Régimen fiscal | ✅ |
| `calle` | Calle | ✅ |
| `numero_exterior` | Num. Exterior | ✅ |
| `numero_interior` | Num. Interior | ✅ |
| `colonia` | Colonia | ✅ |
| `municipio` | Municipio | ✅ |
| `estado` | Estado | ✅ |
| `codigo_postal` | Código postal | ✅ |
| `notas` | Notas | ✅ |
| `activo` | Auto (default true) | ✅ |
| `created_at` | Auto | ✅ |
| `updated_at` | Auto | ✅ |

### Campos del form que NO están en tabla `proveedores` (viven en otras tablas o solo en el form)

| Campo del form | Tabla real | Nota |
|----------------|-----------|------|
| `categoria` | **🔴 No existe en `proveedores` según types.ts** | El form lo envía pero la columna no está en la tabla generada. Posible error silencioso al INSERT. |
| `termino_pago` | **🔴 No existe en `proveedores` según types.ts** | Mismo problema. El form lo envía, la tabla no lo tiene. |
| `dias_visita` | **🔴 No existe en `proveedores` según types.ts** | Mismo problema. |
| `frecuencia_compra` | **🔴 No existe en `proveedores` según types.ts** | Mismo problema. |
| `banco` | **🔴 No existe en `proveedores` según types.ts** | Mismo problema. |
| `beneficiario` | **🔴 No existe en `proveedores` según types.ts** | Mismo problema. |
| `cuenta_bancaria` | **🔴 No existe en `proveedores` según types.ts** | Mismo problema. |
| `clabe_interbancaria` | **🔴 No existe en `proveedores` según types.ts** | Mismo problema. |
| Contactos (N) | `proveedor_contactos` | ✅ Tabla separada, correctamente manejada |

### 🔴 ISSUE CRÍTICO — Mismatch form vs types.ts

El archivo `types.ts` generado por Supabase muestra que la tabla `proveedores` tiene **solo 21 columnas** y **NO incluye**: `categoria`, `termino_pago`, `dias_visita`, `frecuencia_compra`, `banco`, `beneficiario`, `cuenta_bancaria`, `clabe_interbancaria`.

**Dos posibilidades:**
1. **Las columnas existen en la DB pero `types.ts` está desactualizado** — el form funcionaría en producción pero TypeScript no las ve (se pasan como `any` implícito porque el INSERT usa un objeto literal sin tipado estricto).
2. **Las columnas NO existen en la DB** — Supabase PostgREST ignora columnas desconocidas en INSERT (no falla, simplemente las descarta silenciosamente). Los datos se **pierden sin error**.

**La interface `Proveedor` del componente SÍ incluye estos campos** (líneas 133-162), lo que indica que el desarrollador esperaba que existieran. La migración `20260326000000_alinear_bd_con_codigo.sql` probablemente las agregó pero `types.ts` no se regeneró después.

**Acción requerida**: Verificar en Supabase Dashboard si estas columnas existen:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'proveedores' 
ORDER BY ordinal_position;
```

---

## 6. Veredicto

### ¿Está listo para uso real? **SÍ, CON VERIFICACIÓN**

El formulario es **funcionalmente completo** para las necesidades del negocio. Tiene:
- Todos los campos que ALMASA necesita para operar con proveedores
- CSF auto-parse (impresionante para adopción — reduce fricción)
- Multi-contacto con roles de responsabilidad
- Datos bancarios para pagos
- Días de visita y frecuencia de compra

### Issues por prioridad

| # | Severidad | Issue | Impacto |
|---|-----------|-------|---------|
| 1 | 🔴 Verificar | 8 campos del form posiblemente no se guardan en DB | Datos perdidos silenciosamente (categoría, término pago, días visita, bancarios) |
| 2 | 🟡 Mejora | Régimen fiscal es input libre en vez de Select con catálogo SAT | El usuario puede escribir cualquier cosa. `catalogoSAT.ts` existe pero no se usa aquí |
| 3 | 🟡 Mejora | RFC sin validación de formato (12 chars persona moral, 13 persona física) | Se puede guardar un RFC inválido |
| 4 | 🟡 Visual | Título del dialog no sigue Design Canon | "Registrar Nuevo Proveedor" sans-serif, sin punto |
| 5 | 🟢 Cosmético | Botón guardar no es crimson | Usa default shadcn en vez de `bg-crimson-500` |
| 6 | 🟢 Cosmético | Secciones del form no usan tipografía canónica de secciones internas | Funcional pero no alineado al canon |

---

## 7. Acciones recomendadas para el martes

### ANTES de capacitar (lunes tarde / martes mañana)

1. **[CRÍTICO] Verificar columnas en DB** — Ejecutar query en Dashboard. Si faltan columnas, los datos de categoría, término de pago, días de visita y bancarios **se pierden silenciosamente**. Fix: ALTER TABLE ADD COLUMN para cada una faltante.

2. **[OPCIONAL] Regenerar types.ts** — `npx supabase gen types typescript --project-id vrcyjmfpteoccqdmdmqn > src/integrations/supabase/types.ts` para sincronizar tipos con DB real.

### DESPUÉS de la primera semana (no urgente)

3. Migrar título del dialog a canon editorial: `Nuevo proveedor.`
4. Cambiar régimen fiscal de input libre a Select con catálogo SAT
5. Agregar validación de formato RFC (12/13 chars con estructura)
6. Botón guardar a `bg-crimson-500`

### NO TOCAR esta semana

- La estructura del formulario está bien diseñada
- El multi-contacto con responsabilidades es excelente
- El CSF auto-parse es un diferenciador de adopción (reduce fricción enormemente)
- Los datos bancarios son útiles para cuando se procesen pagos

---

*Documento de auditoría. No hacer commit hasta que Jose valide.*
