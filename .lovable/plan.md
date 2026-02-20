
# Fix: El Sidebar no se expande con el botón de Toggle

## Diagnóstico exacto

El problema está en `src/components/ui/sidebar.tsx`. La versión actual del componente `<Sidebar>` fue modificada para implementar el modo "Gmail-style hover". Como resultado, en desktop el ancho del sidebar siempre se controla por `isHovering` (hover del mouse), no por el estado `open` del toggle:

```tsx
// Línea 242 — el ancho SIEMPRE usa isHovering, ignorando open/toggleSidebar
isHovering ? "w-[--sidebar-width] shadow-xl" : "w-[--sidebar-width-icon]"
```

Y el `visualState` (usado para `data-state` y para que `VendedorSidebar` sepa si está colapsado):

```tsx
// Línea 153 — isDesktopWithMouse requiere expandOnHover=true
const visualState = isDesktopWithMouse && isHovering ? "expanded" : "collapsed";
```

Cuando se quitó `expandOnHover` del `VendedorSidebar`, `isDesktopWithMouse` quedó en `false`, por lo que `visualState` siempre es `"collapsed"` y el ancho siempre usa `isHovering` (que sin hover activo es `false`). El `SidebarTrigger` cambia `open` correctamente pero eso no tiene ningún efecto visual.

## Solución — Cambio solo en `sidebar.tsx`

Hacer que el ancho y el `visualState` del sidebar respondan a `open` cuando `expandOnHover={false}`:

- Si `expandOnHover={true}` → comportamiento Gmail: ancho controlado por `isHovering`
- Si `expandOnHover={false}` → comportamiento toggle: ancho controlado por `open` (el estado del `SidebarProvider`)

### Cambio 1 — Leer `open` en el componente `Sidebar`

```tsx
// ANTES (línea 145):
const { isMobile, openMobile, setOpenMobile, isHovering, setIsHovering } = useSidebar();

// DESPUÉS:
const { isMobile, open, openMobile, setOpenMobile, isHovering, setIsHovering } = useSidebar();
```

### Cambio 2 — `visualState` correcto según modo

```tsx
// ANTES (línea 153):
const visualState = isDesktopWithMouse && isHovering ? "expanded" : "collapsed";

// DESPUÉS:
const visualState = isDesktopWithMouse
  ? (isHovering ? "expanded" : "collapsed")   // Gmail-style: basado en hover
  : (open ? "expanded" : "collapsed");          // Toggle: basado en open
```

### Cambio 3 — Ancho del sidebar real según modo

```tsx
// ANTES (línea 242):
isHovering ? "w-[--sidebar-width] shadow-xl" : "w-[--sidebar-width-icon]",

// DESPUÉS:
(isDesktopWithMouse ? isHovering : open)
  ? "w-[--sidebar-width] shadow-xl"
  : "w-[--sidebar-width-icon]",
```

### Cambio 4 — Gap placeholder según modo

El `div` placeholder (líneas 226-231) siempre mantiene el ancho del icon para reservar espacio. En modo toggle, cuando el sidebar está expandido debe tener el ancho completo para no superponer el contenido (o mantenerlo en icon para overlay — decisión de diseño: **mantenerlo en icon** para que el sidebar haga overlay encima del contenido, igual que Gmail, y así no mueve el layout).

El placeholder se deja igual (`w-[--sidebar-width-icon]` siempre) para que el sidebar haga overlay cuando se expande con toggle. Esto es consistente con el comportamiento actual de hover y evita que el contenido salte al expandirse.

## Resultado visual esperado

| Acción | Antes | Después |
|--------|-------|---------|
| Click botón [←] | Nada pasa en el ancho | Sidebar se colapsa a iconos |
| Click botón [→] | Nada pasa en el ancho | Sidebar se expande a ancho completo (overlay) |
| Hover sobre sidebar | Se expande | Sin cambio (expandOnHover=false) |
| Tooltips en iconos | ✓ Funcionan | ✓ Siguen funcionando |
| Tab activo resaltado | ✓ Funciona | ✓ Sigue funcionando |

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/ui/sidebar.tsx` | 3 líneas: leer `open` del context, corregir `visualState`, corregir ancho del sidebar |

Solo se modifica `sidebar.tsx`. `VendedorSidebar.tsx` y `VendedorPanel.tsx` ya están correctos.
