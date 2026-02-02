
# Plan: Corregir 3 Problemas del Módulo Clientes en Móvil

## Problemas Identificados

### Problema 1: Tabs de Vendedores con Textos Superpuestos
Las tabs muestran el nombre y el conteo superpuestos ("6Carlos", "12Venancio") porque:
- Usan `grid-cols-5` fijo sin adaptación móvil
- Los badges con conteos se apilan sobre los nombres

### Problema 2: Botón "Nuevo Cliente" Requiere Scroll
El header tiene 6 botones en una sola fila horizontal, lo que desborda la pantalla en móvil.

### Problema 3: Error "Algo salió mal" al Editar Cliente
El error `A <Select.Item /> must have a value prop that is not an empty string` se produce porque hay dos `<SelectItem value="">` en el código:
- `ClienteFormContent.tsx` línea 385
- `Clientes.tsx` línea 1037

---

## Solución

### 1. Tabs de Vendedores Responsive
Cambiar de `grid-cols-5` a tabs scrollables horizontalmente en móvil:
```
Antes (móvil):
┌───────────────────────────────────────┐
│ [Casa6][Carlos12][Vena1][Sal1][Mart0] │  <- Texto superpuesto
└───────────────────────────────────────┘

Después (móvil):
┌───────────────────────────────────────┐
│ [Casa] [Carlos] [Venancio] [Salvador →│  <- Scroll horizontal
│  (6)     (12)      (1)        (1)     │
└───────────────────────────────────────┘
```

En móvil, los tabs usarán:
- `overflow-x-auto` para scroll horizontal
- `inline-flex w-max` en vez de grid
- Badges en línea separada o más compactos

### 2. Header Responsive con Botones Prioritarios
Reorganizar el header para móvil:
```
Antes (móvil):
┌───────────────────────────────────────┐
│ Clientes                              │
│ [DetectarGrupos][Agrupar][Importar][→]│  <- Scroll requerido
└───────────────────────────────────────┘

Después (móvil):
┌───────────────────────────────────────┐
│ Clientes          [+ Nuevo Cliente]   │  <- Botón visible
│ [🔍 Detectar] [Auditoría 283]         │  <- Botones secundarios
└───────────────────────────────────────┘
```

En móvil:
- El botón "Nuevo Cliente" se mueve al header principal (siempre visible)
- Botones secundarios (Detectar Grupos, Agrupar, Importar) se ocultan o pasan a un menú desplegable
- El botón de Auditoría Fiscal se mantiene visible por su importancia

### 3. Corregir SelectItem con Valor Vacío
Cambiar `value=""` a `value="__none__"` (o similar) y manejar la lógica:

**Archivo: ClienteFormContent.tsx (línea 385)**
```tsx
// Antes
<SelectItem value="">Casa (sin vendedor)</SelectItem>

// Después
<SelectItem value="__none__">Casa (sin vendedor)</SelectItem>
```

**Archivo: Clientes.tsx (línea 1037)**
```tsx
// Antes
<SelectItem value="">
  <div className="flex items-center gap-2">
    <Home className="h-4 w-4" />
    Casa (sin comisión)
  </div>
</SelectItem>

// Después  
<SelectItem value="__none__">
  <div className="flex items-center gap-2">
    <Home className="h-4 w-4" />
    Casa (sin comisión)
  </div>
</SelectItem>
```

También hay que actualizar el `onValueChange` para convertir `"__none__"` a `null` o `""`:
```tsx
onValueChange={(value) => setFormData({ 
  ...formData, 
  vendedor_asignado: value === "__none__" ? null : value 
})}
```

Y el `value` del Select para convertir `null`/`""` a `"__none__"`:
```tsx
value={formData.vendedor_asignado || "__none__"}
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/Clientes.tsx` | Header responsive, tabs scrollables, fix SelectItem |
| `src/components/clientes/ClienteFormContent.tsx` | Fix SelectItem value="" |

---

## Detalles Técnicos

### Para las Tabs (Clientes.tsx líneas 1214-1237):
```tsx
// Antes
<TabsList className="grid w-full grid-cols-5">

// Después
{isMobile ? (
  <div className="overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
    <TabsList className="inline-flex w-max gap-1">
      <TabsTrigger value="casa" className="flex items-center gap-1 px-3">
        Casa <span className="text-xs">({getClientCount("casa")})</span>
      </TabsTrigger>
      ...
    </TabsList>
  </div>
) : (
  <TabsList className="grid w-full grid-cols-5">
    // Vista desktop sin cambios
  </TabsList>
)}
```

### Para el Header (Clientes.tsx líneas 960-1013):
```tsx
// En móvil: layout vertical con botón primario arriba
{isMobile ? (
  <div className="space-y-3">
    <div className="flex justify-between items-start">
      <div>
        <h1 className="text-xl font-bold">Clientes</h1>
        <p className="text-xs text-muted-foreground">Gestión de clientes</p>
      </div>
      <Dialog ...>
        <DialogTrigger asChild>
          <Button size="sm" onClick={resetForm}>
            <Plus className="h-4 w-4 mr-1" />
            Nuevo
          </Button>
        </DialogTrigger>
        ...
      </Dialog>
    </div>
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <Button variant="outline" size="sm">Detectar</Button>
      <Button variant="outline" size="sm">Auditoría {count}</Button>
      // Otros botones...
    </div>
  </div>
) : (
  // Vista desktop sin cambios
)}
```

---

## Resultado Esperado

Después de la implementación:

1. **Tabs de vendedores**: Scroll horizontal fluido, nombres legibles
2. **Botón Nuevo Cliente**: Siempre visible en el header
3. **Editar cliente**: Funciona sin errores

---

## Lo que NO cambia

- Lógica de negocio de clientes
- Formularios de creación/edición (solo el fix del Select)
- Vista de escritorio (solo mejoras móviles)
- Queries y mutaciones
- Sistema de permisos
