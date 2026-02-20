
# Corrección: Formulario Nuevo Cliente + Sidebar Visual

## Problemas identificados

### Problema 1 — Formulario "Nuevo Cliente" no muestra la sección de CSF correctamente en móvil

**Causa raíz**: El `SheetContent` tiene `h-[90vh]` con `overflow-hidden`, y el área scrollable interna usa `h-[calc(100%-140px)]`. En móvil esto falla porque:
- El header del Sheet ocupa más espacio del calculado (el título + padding)
- El botón fijo inferior (`absolute bottom-0`) se encima sobre el contenido scrollable
- En la pantalla inicial (las 2 opciones de entrada), el `input[type=file]` es invisible y está superpuesto sobre el div, lo cual funciona en desktop pero en iOS/Android touch puede no activar el file picker correctamente

**Solución**:
- Convertir el Sheet a un layout **flex column** con altura fija: header (fijo) + contenido (flex-1, overflow-y-auto) + footer (fijo)
- Reemplazar el `input[type=file]` invisible con un `<label htmlFor>` + `<input id>` que es más confiable en móvil
- Asegurarse de que el botón "Crear Cliente" siempre sea visible al fondo sin cortar el contenido

**Antes:**
```
SheetContent h-[90vh] overflow-hidden
  SheetHeader (altura variable)
  div overflow-y-auto h-[calc(100%-140px)]   ← cálculo frágil
  div absolute bottom-0                       ← se encima
```

**Después:**
```
SheetContent h-[90vh] flex flex-col
  SheetHeader shrink-0                        ← altura real
  div flex-1 overflow-y-auto                  ← scroll correcto
  div shrink-0                                ← botón siempre visible
```

---

### Problema 2 — Sidebar se ve mal visualmente

**Causa raíz**: El `VendedorSidebar` envuelve todo en un `<div className="dark">` que fuerza el tema oscuro permanentemente. Esto puede generar conflictos visuales cuando el usuario usa modo claro, y causa que los dropdown/tooltips se vean con colores incorrectos.

**Además**: El sidebar usa `expandOnHover` (Gmail-style) que en mobile no funciona porque no hay hover — el trigger del sidebar mobile abre un Sheet lateral que **no está visualmente integrado** con el header del panel vendedor.

**Solución**:
1. Eliminar el `<div className="dark">` que fuerza el tema — dejar que el tema del usuario controle los colores
2. Mantener el sidebar con sus colores propios usando variables CSS del sidebar (`sidebar-background`, `sidebar-foreground`) que ya están definidas en el tema
3. En mobile, el `SidebarTrigger` del header móvil debe ser visible — agregar uno en el header móvil del VendedorPanel

---

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/vendedor/VendedorNuevoClienteSheet.tsx` | Layout flex column en SheetContent; input[type=file] con label/id explícito para mejor soporte móvil |
| `src/components/vendedor/VendedorSidebar.tsx` | Eliminar `<div className="dark">` wrapper; usar variables CSS correctas |
| `src/pages/VendedorPanel.tsx` | Agregar `SidebarTrigger` en header móvil para abrir el sidebar en drawer mode |

---

## Cambios técnicos detallados

### VendedorNuevoClienteSheet.tsx — Layout fix

**Línea 611** — SheetContent:
```tsx
// ANTES:
<SheetContent side="bottom" className="h-[90vh] sm:h-[85vh] overflow-hidden">

// DESPUÉS:
<SheetContent side="bottom" className="h-[92vh] flex flex-col p-0 gap-0">
```

**Línea 612-614** — SheetHeader con shrink-0:
```tsx
<SheetHeader className="px-4 pt-4 pb-3 border-b shrink-0">
  <SheetTitle className="text-xl">Nuevo Cliente</SheetTitle>
</SheetHeader>
```

**Línea 616** — Área scrollable:
```tsx
// ANTES:
<div className="overflow-y-auto h-[calc(100%-140px)] pb-8">

// DESPUÉS:
<div className="flex-1 overflow-y-auto px-4 py-4">
```

**Líneas 1067-1082** — Footer fijo:
```tsx
// ANTES: absolute bottom-0 left-0 right-0
// DESPUÉS: shrink-0 (en el flujo normal del flex column)
<div className="shrink-0 p-4 border-t bg-background">
```

**Líneas 623-648** — Input de archivo más confiable en móvil:
```tsx
// ANTES: input invisible superpuesto sobre div
<div className="relative">
  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" ... />
  <div className="border-2 border-dashed ...">...</div>
</div>

// DESPUÉS: label explícito con htmlFor — estándar de accesibilidad y más confiable en iOS
<label htmlFor="csf-upload" className="cursor-pointer block">
  <div className="border-2 border-dashed ...">...</div>
</label>
<input 
  id="csf-upload"
  type="file" 
  accept="image/*,application/pdf" 
  className="sr-only"  ← oculto pero accesible
  onChange={handleCsfUpload}
/>
```

### VendedorSidebar.tsx — Eliminar dark wrapper

**Línea 81** — Eliminar `<div className="dark">`:
```tsx
// ANTES:
return (
  <div className="dark">
    <Sidebar collapsible="icon" expandOnHover ...>

// DESPUÉS:
return (
  <Sidebar collapsible="icon" expandOnHover ...>
```

Y ajustar el cierre correspondiente (línea 228).

### VendedorPanel.tsx — SidebarTrigger en móvil

En el header móvil (línea ~248), agregar `SidebarTrigger` al inicio de los botones de acción:
```tsx
<div className="flex items-center gap-1">
  <SidebarTrigger className="text-primary-foreground hover:bg-primary-foreground/20" />
  {/* botones existentes */}
</div>
```

---

## Resultado visual esperado

**Nuevo Cliente en móvil:**
- Se abre un panel deslizable desde abajo que ocupa 92% de la pantalla
- Header con título fijo arriba
- Contenido scrollable en el medio (las 2 opciones o el formulario)
- Botón "Crear Cliente" siempre visible en la parte inferior sin cortar el contenido
- Tocar el área de CSF abre el selector de archivo de forma confiable en iOS y Android

**Sidebar:**
- Respeta el tema del usuario (claro/oscuro) sin forzar modo oscuro
- En desktop: se expande al hover (Gmail-style)
- En móvil: el botón en el header abre el sidebar como drawer lateral
