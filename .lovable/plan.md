
# Plan: Unificar Estilo de Pestañas Móviles en Compras

## Problema Identificado

Después de revisar el código y las imágenes:

1. **Las imágenes muestran `/compras`**, no `/clientes`
2. La página de **Compras** usa un solo conjunto de pestañas con clases CSS responsivas (`hidden sm:inline`, `sm:hidden`)
3. La página de **Clientes** usa un condicional `isMobile` con estilos diferenciados (iconos más pequeños, padding diferente)

El resultado es que las pestañas de Compras funcionan pero no tienen el mismo "look & feel" optimizado para móvil que Clientes.

---

## Diferencias Actuales

| Aspecto | Clientes (móvil) | Compras (actual) |
|---------|-----------------|------------------|
| Condicional | `isMobile ? ... : ...` | Un solo código con CSS |
| Iconos | `h-3.5 w-3.5` | `h-4 w-4` |
| Padding | `px-3` | `px-2 sm:px-3` |
| Texto | Solo corto | Alternado con CSS |

---

## Solución Propuesta

Actualizar `Compras.tsx` para usar el mismo patrón que Clientes:
- Agregar `useIsMobile()` hook
- Usar condicional para renderizar pestañas diferenciadas
- Iconos más pequeños en móvil (3.5 vs 4)
- Texto siempre abreviado en móvil (sin alternar con CSS)

---

## Cambios en `src/pages/Compras.tsx`

### 1. Agregar import del hook
```tsx
import { useIsMobile } from "@/hooks/use-mobile";
```

### 2. Agregar uso del hook
```tsx
const isMobile = useIsMobile();
```

### 3. Modificar TabsList (líneas 136-198)
```tsx
<Tabs value={activeTab} onValueChange={setActiveTab}>
  {isMobile ? (
    <div className="overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
      <TabsList className="inline-flex w-max gap-1">
        <TabsTrigger value="proveedores" className="flex items-center gap-1.5 px-2">
          <Package className="h-3.5 w-3.5" />
          Prov
        </TabsTrigger>
        <TabsTrigger value="ordenes" className="flex items-center gap-1.5 px-2">
          <Truck className="h-3.5 w-3.5" />
          OC
          {pendingCount > 0 && (
            <Badge variant="destructive" className="h-4 min-w-4 px-1 text-[10px]">
              {pendingCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="calendario" className="flex items-center gap-1.5 px-2">
          <Calendar className="h-3.5 w-3.5" />
          Cal
        </TabsTrigger>
        <TabsTrigger value="devoluciones-faltantes" className="flex items-center gap-1.5 px-2">
          <AlertTriangle className="h-3.5 w-3.5" />
          Dev/Falt
          {devFaltCombinedCount > 0 && (
            <Badge variant="destructive" className="h-4 min-w-4 px-1 text-[10px]">
              {devFaltCombinedCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="historial" className="flex items-center gap-1.5 px-2">
          <History className="h-3.5 w-3.5" />
          Hist
        </TabsTrigger>
        <TabsTrigger value="adeudos" className="flex items-center gap-1.5 px-2">
          <CreditCard className="h-3.5 w-3.5" />
          Adeudos
          {adeudosCount > 0 && (
            <Badge className="h-4 min-w-4 px-1 text-[10px] bg-amber-500">
              {adeudosCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="analytics" className="flex items-center gap-1.5 px-2">
          <BarChart3 className="h-3.5 w-3.5" />
          Anal
        </TabsTrigger>
      </TabsList>
    </div>
  ) : (
    <TabsList className="w-full grid grid-cols-7">
      {/* Pestañas desktop con texto completo */}
    </TabsList>
  )}
```

---

## Resultado Esperado

### Móvil (después):
```
┌─────────────────────────────────────┐
│ ← 📦Prov │ 🚚OC │ 📅Cal │ ⚠Dev/Falt →
└─────────────────────────────────────┘
```

- Iconos más pequeños (3.5 en lugar de 4)
- Badges más compactos
- Pestañas con scroll horizontal suave
- Mismo estilo visual que la página de Clientes

### Desktop (sin cambios):
- Grid de 7 columnas con texto completo
- Iconos tamaño normal (4)
- Badges tamaño normal

---

## Archivo a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/Compras.tsx` | Agregar hook `useIsMobile`, condicional de render para pestañas móvil/desktop |

---

## Beneficios

1. **Consistencia**: Mismo patrón de pestañas que Clientes y otros módulos
2. **Menor footprint**: Iconos y badges más pequeños en móvil
3. **Mejor UX**: Estilo optimizado para touch con áreas táctiles claras
4. **Mantenibilidad**: Patrón uniforme en todo el ERP
