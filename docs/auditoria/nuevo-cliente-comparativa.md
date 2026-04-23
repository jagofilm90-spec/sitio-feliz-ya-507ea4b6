# AUDITORÍA COMPARATIVA — "Nuevo Cliente"
**Fecha:** 22 abril 2026

## 1. Resumen Ejecutivo

Los 2 formularios capturan datos fundamentalmente DISTINTOS. El admin captura datos fiscales (razón social, RFC obligatorio, dirección fiscal, régimen, CFDI) porque crea clientes para facturar. El vendedor captura datos operativos (dirección del negocio desglosada, GPS de entrega, horarios, días sin entrega, teléfonos múltiples, contactos) porque crea clientes para entregarles mercancía. NO son el mismo formulario con distinta UI — son formularios con distinto propósito de negocio.

---

## 2. Campos de cada archivo

### NuevoCliente.tsx (Admin/Secretaria) — 639 líneas

**Sección 1 — Datos del cliente:**
- CSF Uploader (auto-llena razonSocial, rfc, dirección, régimen)
- Razón social* (text, required)
- RFC* (text, required, validación regex moral/física)
- Dirección fiscal* (textarea, required)
- Régimen fiscal (select, catálogo SAT)
- Uso de CFDI por defecto (select, default "G03")

**Sección 2 — Vendedor y crédito:**
- Vendedor asignado (select, lista de vendedores o "Casa")
- Límite de crédito (toggle con/sin + input currency)
- Plazo de crédito (button group: contado/15/30/60 días)

**Sección 3 — Puntos de entrega:**
- Lista dinámica de puntos (N puntos, cada uno con: código, nombre, toggle entregarEnFiscal, dirección, contacto, teléfono, horario)

**Sección 4 — Opciones avanzadas (admin only):**
- Pertenece a grupo empresarial (switch + select grupo)

### VendedorNuevoClienteSheet.tsx (Vendedor) — 1,012 líneas

**Sección 1 — Nombre:**
- Nombre del cliente* (text, required)

**Sección 2 — Teléfonos:**
- Componente VendedorTelefonosCliente (multi-teléfono con etiqueta + principal)

**Sección 3 — Correos:**
- Componente VendedorCorreosCliente (multi-email con propósito + principal)

**Sección 4 — Dirección del negocio:**
- Calle* (text, required)
- No. Exterior* (text, required)
- No. Interior (text, optional)
- Código Postal* (text, 5 dígitos, auto-lookup alcaldía/colonia/zona)
- Alcaldía/Municipio* (text, auto-llenado por CP)
- Colonia (select dinámico o text, auto-sugerido por CP)
- Zona de entrega (select, auto-asignado por municipio)

**Sección 5 — Ubicación de entrega:**
- Toggle "Entrega en misma dirección" (checkbox, default true)
- Google Maps autocomplete (condicional si toggle off)
- GPS lat/lng (auto-capturado de Google Places)

**Sección 6 — Restricciones de entrega:**
- Horario desde (time, default 08:00)
- Horario hasta (time, default 18:00)
- Días sin entrega (multi-toggle lun-sáb)

**Sección 7 — Facturación/CSF (opcional):**
- Subir CSF (file upload, auto-parse vía Edge Function)
- RFC (auto-llenado de CSF, editable)
- CP Fiscal (auto-llenado)
- Razón Social (auto-llenado)
- Domicilio Fiscal (auto-construido)

**Sección 8 — Notas de entrega:**
- Notas (textarea, optional)

**Sección 9 — Contactos adicionales:**
- Componente VendedorContactosCliente (multi-contacto con nombre + puesto)

---

## 3. Tabla Maestra Comparativa

| Campo | Tipo | Page (admin) | Sheet (vendedor) | Requerido en | Diferencia |
|-------|------|-------------|------------------|--------------|------------|
| **Razón social** | text | ✅ required | ✅ auto-CSF (opcional) | Admin required | Admin: campo principal. Vendedor: solo aparece si sube CSF |
| **RFC** | text | ✅ required + regex | ✅ auto-CSF (opcional) | Admin required | ⚠️ DIVERGE: Admin exige RFC válido. Vendedor solo lo tiene si sube CSF |
| **Dirección fiscal** | textarea | ✅ required | ✅ auto-CSF (opcional) | Admin required | Vendedor lo construye automáticamente de partes del CSF |
| **Régimen fiscal** | select | ✅ catálogo SAT | ✅ auto-CSF | Admin opcional | |
| **Uso CFDI** | select | ✅ default G03 | ❌ | Solo admin | Vendedor no captura uso CFDI |
| **Nombre del negocio** | text | ❌ (usa razón social) | ✅ required | Solo vendedor | ⚠️ DIVERGE: Admin usa razón social como nombre. Vendedor tiene campo dedicado |
| **Vendedor asignado** | select | ✅ seleccionable | Auto (auth.uid) | Admin selecciona | Admin elige; vendedor se auto-asigna |
| **Límite de crédito** | currency | ✅ toggle + input | ❌ | Solo admin | Vendedor no puede setear crédito |
| **Plazo de crédito** | button group | ✅ 4 opciones | ❌ (default contado) | Solo admin | Vendedor siempre crea con "contado" |
| **Calle** | text | ❌ (dirección completa) | ✅ required | Solo vendedor | ⚠️ DIVERGE: Admin captura dirección como texto libre. Vendedor la desglosa en componentes |
| **No. Exterior** | text | ❌ | ✅ required | Solo vendedor | |
| **No. Interior** | text | ❌ | ✅ optional | Solo vendedor | |
| **Código Postal** | text | ❌ (en dirección) | ✅ required (5 dígitos) | Solo vendedor | Vendedor auto-lookup de colonia/alcaldía/zona |
| **Alcaldía/Municipio** | text | ❌ | ✅ required (auto-fill) | Solo vendedor | |
| **Colonia** | select/text | ❌ | ✅ optional (auto-sugerido) | Solo vendedor | |
| **Zona de entrega** | select | ❌ | ✅ optional (auto-asignado) | Solo vendedor | ⚠️ Admin NO captura zona directamente |
| **Teléfonos** | multi | ❌ (en puntos de entrega) | ✅ componente dedicado | Solo vendedor (multi) | Admin: teléfono es por punto de entrega. Vendedor: teléfonos del cliente |
| **Correos** | multi | ❌ | ✅ componente dedicado | Solo vendedor | Admin NO captura correos en alta |
| **Contactos** | multi | ❌ | ✅ componente dedicado | Solo vendedor | Admin NO captura contactos en alta |
| **GPS entrega** | map | ❌ | ✅ Google Places API | Solo vendedor | |
| **Horario de entrega** | time×2 | ✅ (por punto) | ✅ (global) | Ambos | Admin: por sucursal. Vendedor: global |
| **Días sin entrega** | toggle array | ❌ | ✅ lun-sáb | Solo vendedor | |
| **Notas de entrega** | textarea | ❌ | ✅ | Solo vendedor | |
| **CSF upload** | file | ✅ (auto-parse) | ✅ (auto-parse) | Ambos (opcional) | ✅ Mismo mecanismo: parse-csf Edge Function |
| **Puntos de entrega** | multi-card | ✅ N puntos | ❌ (1 sucursal "Principal") | Solo admin | ⚠️ Admin: múltiples sucursales. Vendedor: 1 fija "Principal" |
| **Grupo empresarial** | switch+select | ✅ (admin only) | ❌ | Solo admin | |
| **Preferencia facturación** | auto | "variable" | "siempre_factura" si CSF, "siempre_remision" si no | Ambos (auto) | ⚠️ DIVERGE: lógica distinta |
| **Código cliente** | auto | RPC generar_codigo_cliente | CLI + count | Ambos (auto) | ⚠️ DIVERGE: Algoritmo de generación distinto |

---

## 4. Validaciones y Lógica

### Validaciones Admin (NuevoCliente.tsx)

| Validación | Tipo | Bloquea submit? |
|------------|------|-----------------|
| Razón social no vacía | Required | Sí (canSave) |
| RFC no vacío + formato válido | Required + regex | Sí (canSave + rfcError) |
| Dirección fiscal no vacía | Required | Sí (canSave) |
| Cada punto: código o nombre | Business rule | Sí (puntosValid) |
| Cada punto: dirección si no fiscal | Business rule | Sí (puntosNeedAddress) |
| RFC no duplicado | DB query pre-submit | Sí (toast + return) |

### Validaciones Vendedor (VendedorNuevoClienteSheet.tsx)

| Validación | Tipo | Bloquea submit? |
|------------|------|-----------------|
| Nombre no vacío | Required | Sí (puedeEnviar) |
| Calle no vacía | Required | Sí |
| No. Exterior no vacío | Required | Sí |
| Alcaldía no vacía | Required | Sí |
| CP = 5 dígitos | Format | Sí |
| Si entrega distinta: GPS address | Conditional required | Sí |
| **RFC duplicado** | **NO se verifica** | — |

### Lógica post-creación

| Aspecto | Admin | Vendedor |
|---------|-------|----------|
| Tablas insertadas | clientes + cliente_sucursales (N) | clientes + cliente_sucursales (1) + cliente_correos + cliente_telefonos + cliente_contactos |
| CSF upload | ❌ No sube archivo | ✅ Sube a storage clientes-csf |
| Redirect | navigate("/clientes") | Cierra sheet + callback onClienteCreado |
| Toast | "Cliente {nombre} creado" | "Cliente {nombre} creado correctamente" |
| Callback | No | onClienteCreado() |

### Campos ocultos en INSERT

| Campo | Admin | Vendedor |
|-------|-------|----------|
| codigo | RPC generar_codigo_cliente | CLI + count manual |
| vendedor_asignado | Seleccionado o null ("casa") | auth.uid() (auto) |
| activo | true | true |
| es_grupo | false | No se envía (default DB) |
| preferencia_facturacion | "variable" | "siempre_factura" o "siempre_remision" |
| termino_credito | Seleccionado | "contado" (hardcoded) |
| limite_credito | Valor o null | No se envía (default DB) |
| nombre (en clientes) | = razonSocial | = nombre del negocio |
| direccion (en clientes) | = direccionFiscal | = dirección construida |

---

## 5. Divergencias clasificadas

### BUCKET 1 — ERRORES / OMISIONES

| # | Divergencia | Riesgo |
|---|------------|--------|
| 1 | **Código de cliente**: Admin usa RPC `generar_codigo_cliente` (atómico). Vendedor usa `CLI + count` manual — posible duplicado en concurrencia. | Alto — mismo bug que folio de pedido (ya arreglado en M04.5A). |
| 2 | **Vendedor no verifica RFC duplicado**: Admin hace query pre-insert. Vendedor no. Si vendedor captura un cliente con RFC que ya existe, el insert podría fallar silenciosamente o crear duplicado sin RFC. | Medio — depende de constraint UNIQUE en RFC (verificar si existe). |
| 3 | **Vendedor no captura uso_cfdi**: Si después se quiere facturar, falta el uso CFDI default. Se puede corregir en la ficha del cliente, pero es fricción. | Bajo — tiene default "G03" en tabla? Verificar. |

### BUCKET 2 — DECISIÓN DE NEGOCIO CONSCIENTE

| # | Divergencia | Justificación |
|---|------------|---------------|
| 4 | **Admin: dirección como texto libre / Vendedor: desglosada en componentes** | Vendedor necesita CP lookup para auto-asignar zona y colonia. Admin captura dirección fiscal que viene del CSF como texto completo. Ambos enfoques son correctos para su contexto. |
| 5 | **Vendedor tiene GPS + Google Maps / Admin no** | Vendedor está en campo con celular. Admin está en oficina con el CSF en mano. GPS es innecesario para admin. |
| 6 | **Vendedor captura teléfonos/correos/contactos múltiples / Admin no** | Vendedor es el primer contacto con el cliente. Admin completa datos fiscales después. Los datos de contacto se agregan post-creación en admin. |
| 7 | **Admin: múltiples puntos de entrega / Vendedor: 1 "Principal"** | Vendedor da de alta el cliente rápido con 1 punto. Sucursales adicionales se agregan después desde la ficha del cliente. |
| 8 | **Vendedor: horarios y días sin entrega / Admin: solo por punto** | El vendedor conoce las restricciones del cliente en campo. Admin las configura por sucursal después. |
| 9 | **Límite de crédito solo en admin** | Decisión de crédito es del dueño/oficina, no del vendedor. |
| 10 | **Plazo de crédito: admin selecciona, vendedor default "contado"** | Vendedor no negocia crédito; eso se define en oficina. |

### BUCKET 3 — INCONSISTENCIA COSMÉTICA

| # | Divergencia | Impacto |
|---|------------|---------|
| 11 | **Admin label "Razón social" / Vendedor label "Nombre del cliente"** | Son conceptos distintos (razón social es fiscal, nombre es comercial). Pero admin guarda razón social en AMBOS campos `nombre` y `razon_social` de la tabla. El vendedor solo guarda en `nombre`. |
| 12 | **Preferencia facturación: admin "variable" / vendedor condicional** | Lógica distinta pero ambas son razonables. |

### BUCKET 4 — BUG / RIESGO TÉCNICO

| # | Divergencia | Riesgo |
|---|------------|--------|
| 13 | **Código de cliente no atómico en vendedor** | Race condition si 2 vendedores crean cliente simultáneamente. Mismo patrón de bug que el folio de pedido pre-M04.5A. Necesita migrar a RPC. |
| 14 | **Vendedor guarda campos de dirección desglosados (nombre_vialidad, numero_exterior, nombre_colonia, etc.) pero admin guarda solo `direccion` como texto libre** | La tabla clientes tiene AMBOS campos. Clientes creados por admin tendrán `nombre_vialidad = null`, `numero_exterior = null`, etc. Clientes creados por vendedor tendrán `direccion` construida + componentes. Inconsistencia de data. |

---

## 6. Recomendación Preliminar

**¿Debería ser el mismo formulario?** NO. Son formularios con propósito genuinamente distinto:
- Admin crea clientes para FACTURAR (datos fiscales primero, operativos después)
- Vendedor crea clientes para VENDER (datos operativos primero, fiscales opcionales)

**Divergencias legítimas a conservar (Bucket 2):** Las 7 decisiones de negocio son correctas. El vendedor en campo con celular necesita un flujo distinto al admin en oficina con CSF.

**Errores a arreglar (Buckets 1 y 4):**
1. **URGENTE:** Migrar generación de código cliente del vendedor a RPC `generar_codigo_cliente` (ya existe, solo falta usarlo).
2. **MEDIO:** Agregar verificación de RFC duplicado en VendedorNuevoClienteSheet (query pre-insert como hace admin).
3. **BAJO:** Verificar que la tabla clientes tiene defaults correctos para campos que vendedor no envía (uso_cfdi, limite_credito, etc.).
4. **CONSIDERAR:** Unificar cómo se guarda la dirección — o ambos desglosan, o ambos guardan texto libre + desglose. Actualmente la data es inconsistente entre clientes creados por admin vs vendedor.
