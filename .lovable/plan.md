
# Fix del Sidebar: Botón de Toggle en lugar de Hover Automático

## Problema actual

El `VendedorSidebar` tiene `expandOnHover` activado en el componente `<Sidebar>`. Esto hace que:
- El sidebar se expande solo cuando el mouse pasa encima
- Se colapsa solo cuando el mouse sale
- No hay ningún botón visible para el usuario — parece que "hace lo que quiere"
- La lógica `isCollapsed = state === "collapsed" && !isHovering` crea estados intermedios raros

Además, el `SidebarProvider` tiene `defaultOpen={true}` pero el sidebar empieza colapsado visualmente porque hay conflicto entre el estado y el hover.

## Solución

Reemplazar el comportamiento de hover automático por un **botón de toggle explícito** (`SidebarTrigger`) que el usuario puede clickear para abrir/cerrar el sidebar. El sidebar arranca expandido y se puede colapsar a modo "solo iconos" con el botón.

```
Estado expandido:              Estado colapsado (iconos):
┌─────────────────┐            ┌────┐
│ ALMASA   [←]   │            │ /\ │ [→]
│─────────────────│            │────│
│ Carlos Girón   │            │ 👤 │
│ Ejecutivo       │            │────│
│─────────────────│            │ 👥 │
│ 👥 Clientes     │            │ 🛒 │
│ 🛒 Nuevo Pedido │            │ 📋 │
│ 📋 Mis Ventas   │            │ ✨ │
│ ✨ Novedades  3 │            │ 📄 │
│ 📄 Precios      │            │ 💰 │
│ 💰 Saldos       │            │ %  │
│ %  Comisiones   │            │ 📊 │
│ 📊 Análisis     │            │────│
│─────────────────│            │ 🚪 │
│ 🚪 Cerrar sesión│            └────┘
└─────────────────┘
```

## Archivos a modificar

### 1. `src/components/vendedor/VendedorSidebar.tsx`

- **Eliminar** `expandOnHover` del `<Sidebar>`
- **Corregir** `isCollapsed`: cambiar de `state === "collapsed" && !isHovering` a simplemente `state === "collapsed"` (sin el `isHovering` que ya no aplica)
- **Agregar** un `SidebarTrigger` en el `SidebarHeader` — un botón con `ChevronLeft`/`ChevronRight` visible en la esquina del header
- **Eliminar** la importación de `isHovering` del `useSidebar()`

El header del sidebar quedará así:
```tsx
<SidebarHeader className="border-b border-sidebar-border">
  <div className="flex items-center justify-between py-2 px-2">
    <img src={logoAlmasa} alt="ALMASA" className={cn("object-contain", isCollapsed ? "h-6" : "h-8")} />
    {!isCollapsed && (
      <SidebarTrigger className="h-7 w-7 text-sidebar-foreground/70 hover:text-sidebar-foreground" />
    )}
  </div>
  {isCollapsed && (
    <div className="flex justify-center py-1">
      <SidebarTrigger className="h-7 w-7 text-sidebar-foreground/70" />
    </div>
  )}
</SidebarHeader>
```

### 2. `src/pages/VendedorPanel.tsx`

- **Eliminar** el `SidebarTrigger` del header móvil (el header móvil ya tiene su propia navegación por la barra inferior — el sidebar de desktop no aplica en móvil)
- **Agregar** un `SidebarTrigger` en el header desktop (`hidden md:flex`) para que también haya un punto de acceso alternativo en la barra principal si el sidebar está colapsado

El header desktop actualmente es solo texto. Se le agrega el trigger al inicio:
```tsx
<div className="hidden md:flex items-center gap-4 mb-6">
  <SidebarTrigger className="h-8 w-8" />
  <div>
    <h1 className="text-xl font-semibold">Panel de Ventas</h1>
    ...
  </div>
</div>
```

## Comportamiento resultante

- El sidebar arranca **expandido** (se ve el nombre, los labels de los menús)
- El usuario puede clickear el botón `[←]` para colapsarlo a solo iconos
- En modo colapsado, los iconos siguen siendo clickeables con tooltips al hacer hover
- El botón `[→]` (ahora en el sidebar colapsado o en el header) vuelve a expandirlo
- **Sin hover automático** — el estado es 100% controlado por el usuario
- En móvil: la barra inferior de navegación sigue siendo la forma principal de navegar (sin cambios)
