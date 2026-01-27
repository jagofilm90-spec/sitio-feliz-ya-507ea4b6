

# Plan: Agregar Resumen Visual de Recibido vs Pendiente

## Objetivo

Agregar un panel visual tipo "dashboard" en el `RecepcionDetalleDialog` que muestre de forma clara y compacta:
- Cuantos productos se han recibido completamente
- Cuantos productos estan pendientes
- Progreso general de la OC

## Diseño Propuesto

```text
┌─────────────────────────────────────────────────────────────┐
│              Resumen de la Orden de Compra                  │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │     2/3      │  │   1 prod     │  │    83%       │       │
│  │  Completados │  │   Pendiente  │  │   ━━━━━━░░   │       │
│  │   [verde]    │  │   [naranja]  │  │   Avance     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
├─────────────────────────────────────────────────────────────┤
│  Productos Pendientes:                                      │
│  • 50 uds - Papel Blanco Revolucion (faltan 50 de 100)     │
└─────────────────────────────────────────────────────────────┘
```

## Cambios Tecnicos

### Archivo: `src/components/compras/RecepcionDetalleDialog.tsx`

**Cambio 1: Agregar calculo de resumen**

Despues de cargar los productos (linea 219), calcular el resumen:

```tsx
// Calcular resumen de productos
const productosCompletados = productos.filter(p => p.cantidad_recibida >= p.cantidad_ordenada);
const productosPendientes = productos.filter(p => p.cantidad_recibida < p.cantidad_ordenada);
const totalOrdenado = productos.reduce((sum, p) => sum + p.cantidad_ordenada, 0);
const totalRecibido = productos.reduce((sum, p) => sum + p.cantidad_recibida, 0);
const porcentajeAvance = totalOrdenado > 0 ? Math.round((totalRecibido / totalOrdenado) * 100) : 0;
```

**Cambio 2: Agregar nuevo estado para el resumen**

```tsx
const [resumenOC, setResumenOC] = useState<{
  completados: number;
  pendientes: number;
  totalProductos: number;
  porcentajeAvance: number;
  productosPendientesDetalle: Array<{
    nombre: string;
    codigo: string;
    ordenado: number;
    recibido: number;
    faltante: number;
  }>;
} | null>(null);
```

**Cambio 3: Agregar componente visual del resumen**

Ubicacion: Despues del alert de faltante (linea 596) y antes del primer `<Separator />`:

```tsx
{/* Resumen Visual de la OC */}
{resumenOC && (
  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
    <h3 className="font-medium mb-3 flex items-center gap-2 text-blue-800 dark:text-blue-300">
      <BarChart3 className="w-4 h-4" />
      Resumen de la Orden de Compra
    </h3>
    
    <div className="grid grid-cols-3 gap-4 mb-4">
      {/* Productos Completados */}
      <div className="text-center p-3 bg-white/50 dark:bg-white/5 rounded-lg">
        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
          {resumenOC.completados}/{resumenOC.totalProductos}
        </div>
        <div className="text-xs text-muted-foreground">
          Productos Completos
        </div>
      </div>
      
      {/* Productos Pendientes */}
      <div className="text-center p-3 bg-white/50 dark:bg-white/5 rounded-lg">
        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
          {resumenOC.pendientes}
        </div>
        <div className="text-xs text-muted-foreground">
          Pendientes
        </div>
      </div>
      
      {/* Porcentaje de Avance */}
      <div className="text-center p-3 bg-white/50 dark:bg-white/5 rounded-lg">
        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
          {resumenOC.porcentajeAvance}%
        </div>
        <div className="text-xs text-muted-foreground">
          Avance Total
        </div>
      </div>
    </div>
    
    {/* Barra de progreso */}
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
      <div 
        className={`h-2 rounded-full transition-all ${
          resumenOC.porcentajeAvance === 100 
            ? 'bg-green-500' 
            : resumenOC.porcentajeAvance >= 50 
              ? 'bg-blue-500' 
              : 'bg-orange-500'
        }`}
        style={{ width: `${resumenOC.porcentajeAvance}%` }}
      />
    </div>
    
    {/* Lista de pendientes si hay */}
    {resumenOC.productosPendientesDetalle.length > 0 && (
      <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
        <p className="text-sm font-medium text-orange-700 dark:text-orange-400 mb-2 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Productos Pendientes:
        </p>
        <ul className="space-y-1">
          {resumenOC.productosPendientesDetalle.map((p, idx) => (
            <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              <span className="font-mono text-xs">{p.codigo}</span>
              <span>{p.nombre}</span>
              <span className="ml-auto text-orange-600 dark:text-orange-400 font-medium">
                {p.recibido}/{p.ordenado}
              </span>
            </li>
          ))}
        </ul>
      </div>
    )}
    
    {/* Mensaje de completado */}
    {resumenOC.pendientes === 0 && (
      <div className="mt-3 flex items-center gap-2 text-green-700 dark:text-green-400 text-sm">
        <CheckCircle2 className="w-4 h-4" />
        <span className="font-medium">Todos los productos han sido recibidos completamente</span>
      </div>
    )}
  </div>
)}
```

**Cambio 4: Importar iconos adicionales**

Agregar a los imports (linea 33):

```tsx
import { BarChart3, CheckCircle2 } from "lucide-react";
```

---

## Resultado Visual Esperado

### Cuando hay productos pendientes (OC parcial):

```text
┌─────────────────────────────────────────────────────────────┐
│  [chart icon] Resumen de la Orden de Compra                 │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────┐   ┌────────────┐   ┌────────────┐          │
│  │    1/2     │   │     1      │   │    62%     │          │
│  │  Completos │   │ Pendientes │   │   Avance   │          │
│  │   verde    │   │   naranja  │   │    azul    │          │
│  └────────────┘   └────────────┘   └────────────┘          │
│                                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░░░░  62%                │
│                                                             │
│  ⚠ Productos Pendientes:                                   │
│    ● PAP-002 - Papel Blanco Revolucion      40/100         │
└─────────────────────────────────────────────────────────────┘
```

### Cuando todo esta completo:

```text
┌─────────────────────────────────────────────────────────────┐
│  [chart icon] Resumen de la Orden de Compra                 │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────┐   ┌────────────┐   ┌────────────┐          │
│  │    2/2     │   │     0      │   │   100%     │          │
│  │  Completos │   │ Pendientes │   │   Avance   │          │
│  │   verde    │   │   verde    │   │   verde    │          │
│  └────────────┘   └────────────┘   └────────────┘          │
│                                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  100%              │
│                                                             │
│  ✓ Todos los productos han sido recibidos completamente    │
└─────────────────────────────────────────────────────────────┘
```

---

## Archivo a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/components/compras/RecepcionDetalleDialog.tsx` | 1. Agregar imports de iconos (BarChart3, CheckCircle2) 2. Agregar estado resumenOC 3. Calcular resumen despues de cargar productos 4. Agregar componente visual del resumen |

---

## Beneficios

1. **Vision instantanea**: Sin hacer scroll, ves el estado general de la OC
2. **Claridad visual**: Colores y numeros grandes facilitan la comprension
3. **Accionable**: Lista especifica de pendientes para dar seguimiento
4. **Contexto completo**: Combina bien con la seccion de "Productos Recibidos en Esta Entrega"

