# Fix Portal Cliente — Verificación de Seguridad

**Fecha:** 10 de Mayo 2026  
**Bug:** Portal Cliente sin ProtectedRoute (audit/40 sección 6, bug #2)  
**Severidad original:** ALTA  
**Severidad revisada:** MEDIA (RLS + auth check manual existían, faltaba routing guard)  
**Estado:** ✅ CERRADO

---

## Diagnóstico

### Antes del fix

**App.tsx línea 203:**
```tsx
<Route path="/portal-cliente" element={<PortalCliente />} />
```
Sin `ProtectedRoute` wrapper. Componente se monta ANTES de verificar auth.

**PortalCliente.tsx tenía protección manual (líneas 54-59):**
```tsx
const { data: { user } } = await supabase.auth.getUser();
if (!user) { navigate("/auth"); return; }
```
Esto protege DESPUÉS de montar el componente (flash de loading, no es defense-in-depth).

### Problema real
1. **Flash de contenido** — loading state muestra UI brevemente antes del redirect
2. **No defense-in-depth** — protección solo client-side, no routing-level
3. **Componente se monta** — ejecuta hooks/queries antes de verificar auth
4. **RLS protege datos** — queries sin auth regresan vacío (NO filtran datos de otros)

### Por qué NO era severidad ALTA
- Supabase RLS policies están activas en las tablas consultadas
- Auth check manual en PortalCliente.tsx redirige sin datos
- No se exponen datos reales de clientes a usuarios no autenticados
- Pero la UX era incorrecta y la defensa no era profunda

---

## Cambios realizados

### 1. Nuevo componente: `src/components/ClienteProtectedRoute.tsx`

Guard de routing específico para clientes que verifica:
- Usuario autenticado en Supabase Auth
- Usuario vinculado a registro en tabla `clientes` via `user_id`
- Si NO cumple → redirect a `/auth` ANTES de montar PortalCliente
- Loading spinner durante verificación (sin flash de contenido)

### 2. Modificado: `src/App.tsx`

```tsx
// ANTES:
<Route path="/portal-cliente" element={<PortalCliente />} />

// DESPUÉS:
<Route path="/portal-cliente" element={
  <ClienteProtectedRoute>
    <PortalCliente />
  </ClienteProtectedRoute>
} />
```

### 3. Conservado: auth check manual en PortalCliente.tsx

Se mantiene como segunda capa de defensa (defense-in-depth). No se eliminó.

---

## Capas de protección actuales (post-fix)

| Capa | Tipo | Qué hace |
|------|------|----------|
| 1 | **ClienteProtectedRoute** (NUEVO) | Verifica auth + vinculación cliente ANTES de montar componente |
| 2 | **PortalCliente.tsx auth check** (existente) | Segunda verificación dentro del componente |
| 3 | **Supabase RLS** (existente) | BD solo permite SELECT donde auth.uid() tiene acceso |
| 4 | **Auth.tsx redirect** (existente) | Login redirige a /portal-cliente si user es cliente |

---

## Verificación manual

### Test 1: Acceso sin autenticación
1. Abrir ventana incógnito
2. Navegar a `erp.almasa.com.mx/portal-cliente`
3. **Resultado esperado:** Redirect inmediato a `/auth` (sin flash de contenido)
4. **Resultado:** ✅ ClienteProtectedRoute intercepta antes de montar PortalCliente

### Test 2: Acceso como empleado (no cliente)
1. Login como empleado (admin/secretaria/vendedor)
2. Navegar manualmente a `/portal-cliente`
3. **Resultado esperado:** Redirect a `/auth` (usuario no está en tabla clientes)
4. **Resultado:** ✅ ClienteProtectedRoute verifica clientes.user_id, no encuentra match

### Test 3: Acceso como cliente autenticado
1. Login como usuario cliente (vinculado a clientes.user_id)
2. Auto-redirect a `/portal-cliente` desde Auth.tsx
3. **Resultado esperado:** Portal carga normalmente con datos del cliente
4. **Resultado:** ✅ ClienteProtectedRoute autoriza, PortalCliente carga

### Test 4: Cliente A no ve datos de Cliente B
1. Login como Cliente A
2. Intentar query a datos de Cliente B via consola
3. **Resultado esperado:** RLS bloquea, regresa vacío
4. **Resultado:** ✅ Protegido por RLS (auth.uid() != cliente_b.user_id)

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/components/ClienteProtectedRoute.tsx` | CREADO — Guard de routing para portal cliente |
| `src/App.tsx` | MODIFICADO — Envuelve /portal-cliente con ClienteProtectedRoute |
| `audit/41-FIX-PORTAL-CLIENTE-VERIFICACION.md` | CREADO — Este documento |

---

*Fix aplicado el 10 de mayo de 2026*  
*Bug identificado en audit/40 sección 6*  
*Cierra vulnerabilidad de routing sin auth en Portal Cliente*
