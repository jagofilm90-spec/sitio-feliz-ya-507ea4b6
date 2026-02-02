
# Plan: Optimización de Navegación y UI Móvil para ALMASA ERP

## Diagnóstico

He identificado **6 áreas problemáticas** que causan que menús, tabs y botones no se vean bien en móvil:

### 1. Tabs Desbordantes
Las `TabsList` en múltiples páginas tienen demasiadas pestañas sin scroll horizontal:
- **Rutas.tsx**: 9 tabs (Planificar, Asignaciones, Monitoreo, Mapa, Rutas, Vehículos, Zonas, Disponibilidad, Externos)
- **Pedidos.tsx**: 5 tabs
- **Compras.tsx**: 7 tabs  
- **Inventario.tsx**: 4+ tabs
- **Facturas.tsx**: 2 tabs sin padding adecuado

### 2. Headers de Página
Los títulos usan `text-3xl` (~30px) que es demasiado grande en pantallas pequeñas.

### 3. Botones de Acción
Grupos de botones en fila que desbordan (Buscar + Nuevo + Filtros).

### 4. Layout Principal
El header del `Layout.tsx` tiene demasiados elementos visibles en móvil.

### 5. Menú Móvil
El menú hamburguesa existe pero no está optimizado para touch (botones pequeños).

### 6. Filtros y Búsqueda
Los campos de búsqueda + botones en la misma línea se rompen en móvil.

---

## Solución Propuesta

### Patrón de Tabs Responsivos
Crear un componente reutilizable `ResponsiveTabs` que:
- En móvil: Muestra tabs en un `ScrollArea` horizontal deslizable
- Reduce el texto a abreviaciones o solo íconos
- Mantiene badges de notificación visibles

```
┌────────────────────────────────────────┐
│ [📅] [📊] [🚚] [📦] [⚙️] → scroll →    │
└────────────────────────────────────────┘
```

### Patrón de Headers Responsivos
```tsx
<h1 className={`font-bold ${isMobile ? 'text-xl' : 'text-3xl'}`}>
  Título
</h1>
```

### Patrón de Acciones Móvil
En móvil: Botón FAB flotante o menú de acciones colapsado.

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/Rutas.tsx` | TabsList scrollable, header responsive |
| `src/pages/Pedidos.tsx` | TabsList scrollable, botones adaptivos |
| `src/pages/Compras.tsx` | Ya tiene algo, pero mejorar |
| `src/pages/Inventario.tsx` | TabsList scrollable |
| `src/pages/Facturas.tsx` | Header y botones responsive |
| `src/pages/Productos.tsx` | Agregar useIsMobile + layout adaptive |
| `src/pages/Clientes.tsx` | Mejorar header y acciones |
| `src/components/Layout.tsx` | Simplificar header en móvil |

## Archivos a Crear

| Archivo | Propósito |
|---------|-----------|
| `src/components/ui/responsive-tabs.tsx` | Componente reutilizable para tabs móvil |
| `src/components/ui/mobile-action-bar.tsx` | Barra de acciones flotante para móvil |
| `src/components/ui/page-header.tsx` | Header de página responsive |

---

## Detalle de Implementación

### 1. ResponsiveTabs Component
```tsx
// Wrapper que detecta móvil y aplica scroll horizontal
<ResponsiveTabs>
  <TabsTrigger value="rutas" mobileLabel="Rutas" icon={<Truck />}>
    Rutas y Entregas
  </TabsTrigger>
</ResponsiveTabs>
```

### 2. Rutas.tsx - Tabs Scrollables
```tsx
// ANTES: 9 tabs que desbordan
<TabsList className="inline-flex w-max min-w-full lg:w-auto">

// DESPUÉS: Scroll horizontal con overflow visible
<div className="overflow-x-auto -mx-4 px-4 pb-2">
  <TabsList className="inline-flex w-max gap-1">
    <TabsTrigger value="planificar" className="gap-1.5 px-2 sm:px-3">
      <Route className="h-4 w-4" />
      <span className="hidden sm:inline">Planificar</span>
      <span className="sm:hidden">Plan</span>
    </TabsTrigger>
    {/* ... resto de tabs con texto corto en móvil */}
  </TabsList>
</div>
```

### 3. Headers de Página
```tsx
const isMobile = useIsMobile();

// Header adaptivo
<div className={`flex ${isMobile ? 'flex-col gap-3' : 'justify-between items-center'}`}>
  <div>
    <h1 className={`font-bold ${isMobile ? 'text-xl' : 'text-3xl'}`}>Rutas</h1>
    <p className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
      Control de entregas
    </p>
  </div>
  
  {/* Acciones: en móvil como FAB o menú */}
  {isMobile ? (
    <Button size="icon" className="fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full shadow-lg">
      <Plus className="h-6 w-6" />
    </Button>
  ) : (
    <div className="flex gap-2">
      <Button>Nueva Ruta</Button>
    </div>
  )}
</div>
```

### 4. Layout.tsx - Header Simplificado
```tsx
// Móvil: Solo mostrar logo + hamburguesa + notificaciones
<div className="flex items-center gap-2">
  <ThemeToggle className={isMobile ? "hidden" : ""} />
  <CentroNotificaciones />
  {!isMobile && (
    <>
      <Link to="/tarjeta">...</Link>
      <span>{user?.email}</span>
    </>
  )}
  <Button variant="outline" size={isMobile ? "icon" : "sm"} onClick={handleLogout}>
    <LogOut className="h-4 w-4" />
    <span className={isMobile ? "sr-only" : "ml-2"}>Salir</span>
  </Button>
</div>
```

### 5. Búsqueda + Filtros
```tsx
// Stack vertical en móvil, horizontal en desktop
<div className={`flex gap-2 ${isMobile ? 'flex-col' : ''}`}>
  <div className="relative flex-1">
    <Search className="absolute left-3 top-3 h-4 w-4" />
    <Input placeholder="Buscar..." className="pl-10" />
  </div>
  
  {isMobile ? (
    // Filtros en sheet/drawer
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        {/* Filtros aquí */}
      </SheetContent>
    </Sheet>
  ) : (
    <div className="flex gap-2">
      {/* Filtros inline */}
    </div>
  )}
</div>
```

---

## Cambios Visuales Esperados

### Antes (Móvil)
```
┌────────────────────────────────┐
│ [≡] ALMASA [🔔] email@... [Salir]
├────────────────────────────────┤
│ Rutas y Entregas              │
│ Control de rutas...           │
├────────────────────────────────┤
│[Planificar][Asignaciones][Monitoreo][Mapa]...
│                    ← DESBORDA →
```

### Después (Móvil)
```
┌────────────────────────────────┐
│ [←][≡] ALMASA        [🔔][👤] │
├────────────────────────────────┤
│ Rutas                          │
│ Control de entregas            │
├────────────────────────────────┤
│ [📅 Plan][📊 Asig][🚚 Mon] →→  │
│ ← scroll horizontal →          │
├────────────────────────────────┤
│ 🔍 [Buscar...           ][⚙️] │
└────────────────────────────────┘
                          [＋] ← FAB
```

---

## Módulos a Actualizar (Prioridad)

### Alta Prioridad
1. **Layout.tsx** - Header responsive
2. **Rutas.tsx** - 9 tabs que desbordan
3. **Pedidos.tsx** - Header + tabs + acciones

### Media Prioridad
4. **Inventario.tsx** - Tabs + búsqueda
5. **Productos.tsx** - Header + búsqueda
6. **Clientes.tsx** - Ya tiene cards, falta header

### Baja Prioridad
7. **Facturas.tsx** - Pocas tabs, ajustar header
8. **Compras.tsx** - Ya tiene algo de responsive

---

## Beneficios

- **Sin desbordamiento** - Todo cabe en pantalla
- **Touch-friendly** - Tabs grandes, deslizables
- **Consistencia** - Mismo patrón en todos los módulos
- **Acciones accesibles** - FAB flotante siempre visible
- **Desktop intacto** - Cero cambios en experiencia desktop
