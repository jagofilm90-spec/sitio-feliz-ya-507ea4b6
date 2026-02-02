

# Plan: Corregir Overflow Horizontal y Scroll en Móvil

## Problemas Identificados (3)

### Problema 1: Diálogo "Editar Cliente" con Scroll Horizontal
**Imagen:** El diálogo muestra contenido cortado a la derecha (título "Editar Cliente", campo "Vendedor asignado", tabs)

**Causa:** El `DialogContent` usa `max-w-3xl` (768px) sin ajuste responsive. En móvil, esto fuerza scroll horizontal porque el contenido excede el ancho de pantalla.

### Problema 2: Diálogo "Sucursales" con Scroll Horizontal
**Imagen:** El diálogo de sucursales tiene scroll horizontal visible (filtros y tarjetas se cortan)

**Causa:** Similar al problema 1 - `DialogContent` con `max-w-3xl` sin responsive.

### Problema 3: Página de Login con Scroll Vertical
**Imagen:** La pantalla de login permite scroll arriba/abajo cuando debería estar fija

**Causa:** El container usa `min-h-screen` pero sin restricción de overflow. En dispositivos móviles con barras dinámicas del navegador, esto causa scroll.

---

## Solución

### Fix 1: DialogContent Responsive para Móvil

Modificar el componente `DialogContent` base para que en móvil ocupe todo el ancho disponible sin overflow.

**Archivo:** `src/components/ui/dialog.tsx`

```tsx
// Antes
className={cn(
  "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg ...",
  className,
)}

// Después - Full width en móvil
className={cn(
  "fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-4 sm:p-6 shadow-lg ...",
  className,
)}
```

Cambios clave:
- `w-full` → `w-[calc(100%-2rem)]`: Deja 1rem de margen a cada lado
- `p-6` → `p-4 sm:p-6`: Menos padding en móvil

### Fix 2: Clientes.tsx - DialogContent Específico

El diálogo de editar cliente usa `max-w-3xl` que es demasiado ancho. Necesita ajuste responsive.

**Archivo:** `src/pages/Clientes.tsx` (línea ~960)

```tsx
// Antes
<DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">

// Después
<DialogContent className="w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
```

Además, el formulario interno necesita `overflow-x-hidden` para prevenir desbordamiento del contenido de las tabs.

### Fix 3: ClienteSucursalesDialog.tsx - Responsive

**Archivo:** `src/components/clientes/ClienteSucursalesDialog.tsx` (línea ~623)

```tsx
// Antes
<DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">

// Después
<DialogContent className="w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
```

### Fix 4: Auth.tsx - Login Fijo Sin Scroll

**Archivo:** `src/pages/Auth.tsx`

```tsx
// Antes
<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">

// Después - Fijo en viewport sin scroll
<div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 overflow-hidden">
```

Cambios:
- `min-h-screen` → `fixed inset-0`: Ocupa exactamente el viewport, sin scroll
- Agregado `overflow-hidden`: Previene cualquier scroll accidental

---

## Resumen de Cambios

| Archivo | Línea | Cambio |
|---------|-------|--------|
| `src/pages/Clientes.tsx` | ~960 | Agregar `w-[calc(100vw-2rem)]` y `overflow-x-hidden` |
| `src/components/clientes/ClienteSucursalesDialog.tsx` | ~623 | Agregar `w-[calc(100vw-2rem)]` y `overflow-x-hidden` |
| `src/pages/Auth.tsx` | ~175 | Cambiar a `fixed inset-0 overflow-hidden` |

---

## Resultado Esperado

1. **Editar Cliente:** Diálogo ocupa ancho completo en móvil, sin scroll horizontal
2. **Sucursales:** Diálogo responsive, todo visible sin cortes
3. **Login:** Pantalla fija, sin scroll vertical/horizontal

---

## Lo que NO cambia

- Funcionalidad de los formularios
- Vista de escritorio (mantiene max-w-3xl)
- Lógica de negocio
- Estilos del componente Dialog base (solo ajustes en uso)

