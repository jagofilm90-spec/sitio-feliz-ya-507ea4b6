
# Plan: Corrección Completa de Layouts Móviles

## Problemas Detectados (3)

### Problema 1: Tabs "Editar Cliente" cortadas
**Visible:** Tab "Pla..." (Plazos) cortada en la imagen
**Causa:** Las tabs usan nombres largos + íconos en móvil, excediendo el ancho incluso con scroll-x

### Problema 2: Texto checkbox "Es Grupo Padre" cortado
**Visible:** "Marcar si este cliente agrupa múltiples sucursales con dife..." 
**Causa:** El párrafo no tiene word-break y el contenedor no limita el ancho

### Problema 3: Diálogo Sucursales - botones y textos cortados
**Visible:** "Regulares" cortado, "Auto-detectar Z..." cortado
**Causa:** Aunque hay scroll-x en filtros, los botones internos no se adaptan bien

---

## Solución Detallada

### Cambio 1: Tabs Móviles más Compactas (Clientes.tsx)

Reducir texto de tabs en móvil para que quepan sin iconos o con nombres abreviados:

```
Antes (móvil):
[Datos] [📦 Productos] [🎁 Cortesías] [💳 Plazos] [📅 Días] [👤 Portal]
                                              ↑ CORTADO

Después (móvil):
[Datos] [📦 Prod.] [🎁 Cort.] [📅 Plazos] [📆 Días] [👤 Portal]
                              ↑ TODO VISIBLE
```

**Archivo:** `src/pages/Clientes.tsx` (líneas 1008-1038)

```tsx
// Móvil: Usar nombres más cortos sin iconos o con iconos compactos
<TabsList className="inline-flex w-max gap-1">
  <TabsTrigger value="datos" className="px-2 text-sm">Datos</TabsTrigger>
  <TabsTrigger value="productos" className="px-2 text-sm">Prod.</TabsTrigger>
  <TabsTrigger value="cortesias" className="px-2 text-sm">🎁</TabsTrigger>
  <TabsTrigger value="creditos" className="px-2 text-sm">Plazos</TabsTrigger>
  <TabsTrigger value="programacion" className="px-2 text-sm">Días</TabsTrigger>
  {isAdmin && (
    <TabsTrigger value="usuario" className="px-2 text-sm">
      Portal {editingClient.user_id && <Badge className="ml-1 h-4 bg-green-500 text-[10px]">✓</Badge>}
    </TabsTrigger>
  )}
</TabsList>
```

### Cambio 2: Checkbox con Texto que Envuelve (ClienteFormContent.tsx)

Forzar wrap del texto largo en móvil:

**Archivo:** `src/components/clientes/ClienteFormContent.tsx` (líneas 151-165)

```tsx
// Antes
<div className="flex items-center space-x-2 pt-2">
  <Checkbox id="es_grupo" ... />
  <div className="grid gap-1 leading-none">
    <Label>Es Grupo Padre</Label>
    <p className="text-xs text-muted-foreground">
      Marcar si este cliente agrupa múltiples sucursales con diferentes razones sociales
    </p>
  </div>
</div>

// Después - Agregar clase para wrap en móvil
<div className={`flex ${isMobile ? 'items-start' : 'items-center'} space-x-2 pt-2`}>
  <Checkbox id="es_grupo" className="mt-1" ... />
  <div className="grid gap-1 leading-none min-w-0">
    <Label>Es Grupo Padre</Label>
    <p className="text-xs text-muted-foreground break-words">
      Marcar si este cliente agrupa múltiples sucursales con diferentes razones sociales
    </p>
  </div>
</div>
```

Cambios clave:
- `items-center` → `items-start` en móvil (checkbox arriba)
- Agregar `min-w-0` al contenedor de texto (permite shrink)
- Agregar `break-words` al párrafo (permite wrap)
- `mt-1` al checkbox para alinear con primera línea

### Cambio 3: Filtros Sucursales Compactos (ClienteSucursalesDialog.tsx)

Reducir texto de botones de filtro en móvil:

**Archivo:** `src/components/clientes/ClienteSucursalesDialog.tsx` (líneas 640-663)

```tsx
// Antes
<Button size="sm" variant={...} onClick={...}>
  Todas ({sucursales.length})
</Button>
<Button size="sm" variant={...} onClick={...}>
  🍗 Rosticerías ({countRosticerias})
</Button>
<Button size="sm" variant={...} onClick={...}>
  Regulares ({countRegulares})
</Button>

// Después - Texto más compacto en móvil
<Button size="sm" variant={...} onClick={...}>
  {isMobile ? `Todas (${sucursales.length})` : `Todas (${sucursales.length})`}
</Button>
<Button size="sm" variant={...} onClick={...} className="whitespace-nowrap">
  🍗 {isMobile ? `(${countRosticerias})` : `Rosticerías (${countRosticerias})`}
</Button>
<Button size="sm" variant={...} onClick={...} className="whitespace-nowrap">
  {isMobile ? `Reg. (${countRegulares})` : `Regulares (${countRegulares})`}
</Button>
```

### Cambio 4: Alerta "Sin Zona" Compacta (ClienteSucursalesDialog.tsx)

**Archivo:** `src/components/clientes/ClienteSucursalesDialog.tsx` (líneas 817-835)

```tsx
// Antes
<div className="flex items-center gap-3 p-3 ...">
  <AlertTriangle ... />
  <span>194 sucursales sin zona asignada</span>
  <Button className="ml-auto">Auto-detectar Zonas</Button>
</div>

// Después - Stack vertical en móvil
<div className={`${isMobile ? 'flex flex-col gap-2' : 'flex items-center gap-3'} p-3 ...`}>
  <div className="flex items-center gap-2">
    <AlertTriangle ... />
    <span className="text-sm">
      {sucursales.filter(s => !s.zona_id).length} sin zona
    </span>
  </div>
  <Button size="sm" variant="outline" onClick={...} className={isMobile ? 'w-full' : 'ml-auto'}>
    <Wand2 className="h-4 w-4 mr-1" />
    {isMobile ? 'Auto-detectar' : 'Auto-detectar Zonas'}
  </Button>
</div>
```

---

## Resumen de Archivos a Modificar

| Archivo | Cambio Principal |
|---------|-----------------|
| `src/pages/Clientes.tsx` | Tabs móviles más compactas (sin iconos, nombres cortos) |
| `src/components/clientes/ClienteFormContent.tsx` | Checkbox con texto que envuelve + min-w-0 |
| `src/components/clientes/ClienteSucursalesDialog.tsx` | Filtros con texto abreviado, alerta compacta |

---

## Resultado Visual Esperado

### Editar Cliente (Móvil)
```
┌─────────────────────────────────┐
│ Editar Cliente               ✕ │
├─────────────────────────────────┤
│ [Datos][Prod.][🎁][Plazos][Días]│ ← Todas las tabs visibles
├─────────────────────────────────┤
│ Código *                        │
│ [LECAROZ                     ]  │
│                                 │
│ Nombre Comercial *              │
│ [Grupo Lecaroz               ]  │
│                                 │
│ ☐ Es Grupo Padre                │
│   Marcar si este cliente        │
│   agrupa múltiples sucursales   │
│   con diferentes razones        │
│   sociales                      │ ← Texto completo, envuelve
│                                 │
│ ─── Datos Fiscales ───          │
│ RFC                             │
│ [GLE001231AA1                ]  │
└─────────────────────────────────┘
```

### Sucursales (Móvil)
```
┌─────────────────────────────────┐
│ Sucursales de Grupo Lecaroz  ✕ │
├─────────────────────────────────┤
│ [Todas(309)][🍗(190)][Reg.(119)]│ ← Botones completos
├─────────────────────────────────┤
│ [+ Nueva Sucursal            ]  │
│ [🔍 Buscar por nombre...     ]  │
│                                 │
│ ⚠ 194 sin zona                  │
│ [Auto-detectar              ]   │ ← Stack vertical
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 1. LAGO                     │ │
│ │ [Factura propia]            │ │
│ │ Yaquis N° 84, Col. Tlal...  │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```
