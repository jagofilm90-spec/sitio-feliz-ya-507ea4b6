
# Plan: Adaptar Módulo de Inventario a Móvil

## Estado Actual

El módulo de Inventario tiene **3 pestañas** con tablas de datos de escritorio que no se adaptan a móvil:

1. **Lotes (Entradas)** - Tabla con 9 columnas: Fecha, Producto, Cantidad, Bodega, Lote, Caducidad, OC, Recibido por, Acciones
2. **Movimientos Manuales** - Tabla con 11 columnas: Fecha, Producto, Tipo, Cantidad, Stock Anterior/Nuevo, Lote, Caducidad, Usuario, Referencia, Acciones
3. **Por Categoría** - Tabla expandible con 8 columnas por producto

Además:
- Filtros en layout horizontal (inputs de fecha + selects + botones) que desbordan
- Diálogo de "Registrar Movimiento" con grids de 2 columnas
- Sin uso de `useIsMobile()` para detectar dispositivo

---

## Solución

### 1. Crear Componentes de Tarjetas Móviles

#### LoteCardMobile (nuevo)
Tarjeta compacta para lotes/entradas:
```
┌─────────────────────────────────────┐
│ 📅 15 Ene 2025       OC-2025-001   │
├─────────────────────────────────────┤
│ POLVO123                            │
│ Polvo para hornear                  │
├─────────────────────────────────────┤
│ 150 uds    📦 Bodega Central        │
│ 🏷️ Lote: L20250115                  │
│ ⏰ Vence: 30 días [Badge amarillo]  │
│ 👤 Juan Pérez                       │
└─────────────────────────────────────┘
```

#### MovimientoCardMobile (nuevo)
Tarjeta para movimientos manuales:
```
┌─────────────────────────────────────┐
│ 15 Ene 10:30    [Entrada] ← Badge  │
├─────────────────────────────────────┤
│ AZUCAR01 - Azúcar estándar         │
├─────────────────────────────────────┤
│ Cantidad: +50          Stock: 150  │
│              (antes: 100) ↗ +50    │
│ Lote: L2025   Ref: Compra #45      │
│ 👤 María García                     │
├─────────────────────────────────────┤
│ [Editar]            [Eliminar]     │
└─────────────────────────────────────┘
```

### 2. Adaptar Filtros a Móvil

**Antes (desktop):**
```
[🔍 Buscar...            ] [Bodega ▼] [Desde: ___] [Hasta: ___] [Limpiar]
```

**Después (móvil):**
```
┌─────────────────────────────────────┐
│ [🔍 Buscar...                    ]  │
├─────────────────────────────────────┤
│ [Bodega ▼      ] [Tipo ▼        ]  │
├─────────────────────────────────────┤
│ [Desde: ____   ] [Hasta: ____   ]  │
├─────────────────────────────────────┤
│ [Limpiar filtros                ]  │
│ Mostrando 45 de 120 lotes          │
└─────────────────────────────────────┘
```

- Búsqueda: ancho completo
- Selects: 2 columnas en móvil
- Fechas: 2 columnas, inputs más pequeños
- Limpiar: botón ancho completo
- Contador: texto centrado debajo

### 3. Adaptar Diálogo "Registrar Movimiento"

**Cambios:**
- `DialogContent`: `w-[calc(100vw-2rem)] sm:max-w-2xl overflow-x-hidden`
- Grids de 2 columnas → 1 columna en móvil
- Botones Cancelar/Registrar → stack vertical en móvil

### 4. Adaptar Pestaña "Por Categoría"

#### Cabecera de categoría (móvil):
```
┌─────────────────────────────────────┐
│ ▼ 📦 HARINAS                        │
│    12 productos                     │
│    Stock: 1,234 • $45,678.00       │
└─────────────────────────────────────┘
```

#### Productos dentro (móvil):
Reutilizar concepto de `InventarioItemMobile` existente pero extendido:
```
┌─────────────────────────────────────┐
│ HARINA01                            │
│ Harina de trigo integral            │
│ Marca: La Fama                      │
├─────────────────────────────────────┤
│ Stock: 150 kg   Costo: $25.00      │
│ Precio: $35.00  Valor: $3,750.00   │
│ [Ver lotes]                         │
└─────────────────────────────────────┘
```

### 5. Totales Globales (móvil)

**Después:**
```
┌─────────────────────────────────────┐
│ Stock Total Global: 12,345         │
│ Valor Inventario: $567,890.00      │
└─────────────────────────────────────┘
```
Stack vertical con texto centrado.

---

## Archivos a Crear

| Archivo | Descripción |
|---------|-------------|
| `src/components/inventario/LoteCardMobile.tsx` | Tarjeta para lotes/entradas |
| `src/components/inventario/MovimientoCardMobile.tsx` | Tarjeta para movimientos |
| `src/components/inventario/CategoriaProductoMobile.tsx` | Producto expandido en categoría |

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/pages/Inventario.tsx` | Agregar `useIsMobile`, condicionar tablas vs tarjetas, adaptar filtros y diálogo |
| `src/components/inventario/InventarioPorCategoria.tsx` | Agregar `useIsMobile`, adaptar header categoría y usar tarjetas móviles |

---

## Código Clave

### Inventario.tsx - Estructura Condicional
```tsx
import { useIsMobile } from "@/hooks/use-mobile";

// En el componente
const isMobile = useIsMobile();

// En el render de lotes
{isMobile ? (
  <div className="space-y-3">
    {filteredLotes.map(lote => (
      <LoteCardMobile key={lote.id} lote={lote} onVerRecepcion={...} />
    ))}
  </div>
) : (
  <Table>...</Table>
)}
```

### Filtros Responsivos
```tsx
<div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-4`}>
  {/* Búsqueda - siempre ancho completo en móvil */}
  <div className="relative flex-1">
    <Search className="absolute left-3 top-3 h-4 w-4" />
    <Input placeholder="Buscar..." className="pl-10" />
  </div>
  
  {/* Selects - 2 columnas en móvil */}
  <div className={`grid ${isMobile ? 'grid-cols-2' : 'flex'} gap-2`}>
    <Select>...</Select>
  </div>
  
  {/* Fechas - 2 columnas */}
  <div className="grid grid-cols-2 gap-2">
    <Input type="date" />
    <Input type="date" />
  </div>
  
  {/* Limpiar - ancho completo en móvil */}
  <Button className={isMobile ? 'w-full' : ''}>Limpiar</Button>
</div>
```

### Diálogo Registrar Movimiento
```tsx
<DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl overflow-x-hidden">
  {/* Grids adaptables */}
  <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
    {/* campos */}
  </div>
  
  {/* Botones */}
  <div className={`flex ${isMobile ? 'flex-col gap-2' : 'justify-end gap-2'}`}>
    {isMobile ? (
      <>
        <Button type="submit" className="w-full">Registrar</Button>
        <Button variant="outline" className="w-full">Cancelar</Button>
      </>
    ) : (
      <>
        <Button variant="outline">Cancelar</Button>
        <Button type="submit">Registrar</Button>
      </>
    )}
  </div>
</DialogContent>
```

---

## Resultado Esperado

### Móvil:
- Lotes y movimientos como tarjetas verticales scrolleables
- Filtros apilados sin overflow horizontal
- Diálogo de movimiento con campos en columna única
- Categorías con headers compactos y productos en tarjetas
- Sin tablas, todo vertical y táctil

### Desktop:
- Sin cambios (mantiene tablas actuales)

---

## Lo que NO cambia

- Lógica de carga de datos
- Queries a Supabase
- Filtros y búsqueda (solo layout, no funcionalidad)
- Suscripciones realtime
- Validaciones de formulario
