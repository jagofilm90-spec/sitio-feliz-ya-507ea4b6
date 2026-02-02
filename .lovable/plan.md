
# Plan: Tabs de Edición de Cliente Responsive

## Problema Identificado

En el diálogo "Editar Cliente", las tabs usan `grid-cols-6` fijo (línea 1008):
```tsx
<TabsList className={`grid w-full ${isAdmin ? 'grid-cols-6' : 'grid-cols-5'}`}>
```

Esto causa que en móvil las tabs se compriman y los textos se superpongan:
- "ProductosCortesías" aparecen juntos sin separación
- Los iconos y textos no tienen espacio suficiente

---

## Solución

Hacer las tabs scrollables horizontalmente en móvil, usando el mismo patrón que ya aplicamos a las tabs de vendedores:

```
Antes (móvil):
┌───────────────────────────────────────┐
│ [Datos][ProductosCortesíasPlazos...]  │  <- Superpuestas
└───────────────────────────────────────┘

Después (móvil):
┌───────────────────────────────────────┐
│ [Datos] [Productos] [Cortesías] [Plaz→│  <- Scroll horizontal
└───────────────────────────────────────┘
```

---

## Cambio Requerido

**Archivo:** `src/pages/Clientes.tsx` (líneas ~1007-1035)

```tsx
// Antes
<TabsList className={`grid w-full ${isAdmin ? 'grid-cols-6' : 'grid-cols-5'}`}>

// Después
{isMobile ? (
  <div className="overflow-x-auto -mx-2 px-2 pb-2 scrollbar-hide">
    <TabsList className="inline-flex w-max gap-1">
      <TabsTrigger value="datos" className="px-3">Datos</TabsTrigger>
      <TabsTrigger value="productos" className="flex items-center gap-1 px-3">
        <Package className="h-4 w-4" />
        Productos
      </TabsTrigger>
      <TabsTrigger value="cortesias" className="flex items-center gap-1 px-3">
        <Gift className="h-4 w-4 text-amber-500" />
        Cortesías
      </TabsTrigger>
      <TabsTrigger value="creditos" className="flex items-center gap-1 px-3">
        <CreditCard className="h-4 w-4" />
        Plazos
      </TabsTrigger>
      <TabsTrigger value="programacion" className="flex items-center gap-1 px-3">
        <CalendarDays className="h-4 w-4 text-blue-500" />
        Días
      </TabsTrigger>
      {isAdmin && (
        <TabsTrigger value="usuario" className="flex items-center gap-1 px-3">
          <User className="h-4 w-4" />
          Portal
          {editingClient.user_id && (
            <Badge variant="default" className="ml-1 h-5 bg-green-500">✓</Badge>
          )}
        </TabsTrigger>
      )}
    </TabsList>
  </div>
) : (
  <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-6' : 'grid-cols-5'}`}>
    {/* Vista desktop sin cambios */}
  </TabsList>
)}
```

---

## Detalles Técnicos

| Propiedad | Valor | Propósito |
|-----------|-------|-----------|
| `overflow-x-auto` | Contenedor | Permite scroll horizontal |
| `-mx-2 px-2` | Contenedor | Extiende área de scroll sin afectar contenido |
| `inline-flex w-max` | TabsList | Evita que las tabs se compriman |
| `gap-1` | TabsList | Espacio entre tabs |
| `px-3` | TabsTrigger | Padding horizontal para mejor toque |
| `scrollbar-hide` | Contenedor | Oculta scrollbar en móvil |

---

## Archivo a Modificar

| Archivo | Líneas | Cambio |
|---------|--------|--------|
| `src/pages/Clientes.tsx` | 1007-1035 | Agregar renderizado condicional con `isMobile` para tabs scrollables |

---

## Resultado Esperado

Las tabs del diálogo de edición serán:
- **Móvil**: Scroll horizontal con texto legible
- **Desktop**: Grid de 5-6 columnas (sin cambios)

---

## Lo que NO cambia

- Funcionalidad de cada tab
- Contenido de los TabsContent
- Vista de escritorio
- Lógica de permisos (isAdmin para tab Portal)
