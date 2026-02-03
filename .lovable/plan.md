
# Plan: Optimizar Estilo Visual de Pestañas Móviles en Compras

## Problema Identificado

Las pestañas de la página `/compras` **ya están usando el código móvil** (muestran las abreviaciones "Prov", "OC", "Cal", etc.), pero **el estilo visual es demasiado grande/pesado** para móvil:

- El `TabsList` usa altura de `h-10` (default de 40px)
- Los `TabsTrigger` usan texto de tamaño `text-sm` (14px)
- El resultado visual es que las pestañas parecen de desktop aunque tengan scroll

## Comparación con Otros Módulos

| Componente | TabsList | TabsTrigger |
|-----------|----------|-------------|
| **Compras (actual)** | `inline-flex w-max gap-1` | `gap-1.5 px-3` |
| BandejaEntrada | `h-9` | `text-xs px-3` |
| VendedorVentasChart | `grid w-full` | `text-xs gap-1` |
| AlmacenFumigaciones | `grid grid-cols-4` | `text-xs px-1` |

## Solución Propuesta

Actualizar las pestañas móviles en `Compras.tsx` para que sean más compactas:

### Cambios en `src/pages/Compras.tsx` (líneas 140-185)

**Antes:**
```tsx
<div className="overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
  <TabsList className="inline-flex w-max gap-1">
    <TabsTrigger value="proveedores" className="flex items-center gap-1.5 px-3">
```

**Después:**
```tsx
<div className="overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
  <TabsList className="inline-flex w-max gap-1 h-9">
    <TabsTrigger value="proveedores" className="flex items-center gap-1 px-2.5 text-xs">
```

### Cambios Específicos:

1. **TabsList**: Agregar `h-9` para reducir altura de 40px a 36px
2. **Cada TabsTrigger**:
   - Cambiar `gap-1.5` a `gap-1` (reducir espacio entre icono y texto)
   - Cambiar `px-3` a `px-2.5` (reducir padding horizontal)
   - Agregar `text-xs` (reducir tamaño de fuente de 14px a 12px)

### Código Final de Pestañas Móviles:

```tsx
{isMobile ? (
  <div className="overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
    <TabsList className="inline-flex w-max gap-1 h-9">
      <TabsTrigger value="proveedores" className="flex items-center gap-1 px-2.5 text-xs">
        <Package className="h-3.5 w-3.5" />
        Prov
      </TabsTrigger>
      <TabsTrigger value="ordenes" className="flex items-center gap-1 px-2.5 text-xs">
        <Truck className="h-3.5 w-3.5" />
        OC
        {pendingCount > 0 && (
          <Badge variant="destructive" className="ml-0.5 h-4 min-w-4 px-1 text-[10px] font-bold animate-pulse">
            {pendingCount}
          </Badge>
        )}
      </TabsTrigger>
      <TabsTrigger value="calendario" className="flex items-center gap-1 px-2.5 text-xs">
        <Calendar className="h-3.5 w-3.5" />
        Cal
      </TabsTrigger>
      <TabsTrigger value="devoluciones-faltantes" className="flex items-center gap-1 px-2.5 text-xs">
        <AlertTriangle className="h-3.5 w-3.5" />
        Dev/Falt
        {devFaltCombinedCount > 0 && (
          <Badge variant="destructive" className="ml-0.5 h-4 min-w-4 px-1 text-[10px] font-bold">
            {devFaltCombinedCount}
          </Badge>
        )}
      </TabsTrigger>
      <TabsTrigger value="historial" className="flex items-center gap-1 px-2.5 text-xs">
        <History className="h-3.5 w-3.5" />
        Hist
      </TabsTrigger>
      <TabsTrigger value="adeudos" className="flex items-center gap-1 px-2.5 text-xs">
        <CreditCard className="h-3.5 w-3.5" />
        Adeudos
        {adeudosCount > 0 && (
          <Badge className="ml-0.5 h-4 min-w-4 px-1 text-[10px] font-bold bg-amber-500 text-white">
            {adeudosCount}
          </Badge>
        )}
      </TabsTrigger>
      <TabsTrigger value="analytics" className="flex items-center gap-1 px-2.5 text-xs">
        <BarChart3 className="h-3.5 w-3.5" />
        Anal
      </TabsTrigger>
    </TabsList>
  </div>
) : (...)}
```

## Resumen de Cambios

| Propiedad | Antes | Después |
|-----------|-------|---------|
| TabsList height | `h-10` (default) | `h-9` |
| Trigger gap | `gap-1.5` | `gap-1` |
| Trigger padding | `px-3` | `px-2.5` |
| Trigger text | `text-sm` (default) | `text-xs` |
| Badge margin | `ml-1` | `ml-0.5` |

## Resultado Esperado

Después de los cambios:
- Pestañas más compactas verticalmente (36px vs 40px)
- Texto más pequeño y ligero (12px vs 14px)
- Mejor apariencia en iPhones y dispositivos móviles
- Mismo comportamiento de scroll horizontal

## Archivo a Modificar

| Archivo | Líneas | Cambios |
|---------|--------|---------|
| `src/pages/Compras.tsx` | 140-185 | Agregar `h-9` al TabsList, `text-xs`, `gap-1`, `px-2.5` a cada TabsTrigger |
