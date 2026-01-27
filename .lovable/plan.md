

# Plan: Corrección de Lógica del Calendario de Entregas

## Problemas Identificados

### Problema 1: El calendario muestra TODOS los productos de la OC en cada entrega
**Ubicacion:** `CalendarioEntregasTab.tsx` lineas 645-655

**Causa:** La propiedad `productos` se obtiene de `ordenes_compra_detalles` (linea 187), que contiene los totales acumulados de TODA la OC, no los productos especificos de cada entrega.

**Ejemplo real:**
- Entrega #1 (23 Ene): Muestra "250 Papel Bala Rojo, 40 Papel Blanco Revolucion"
- Deberia mostrar: Solo "250 Papel Bala Rojo" (lo unico que llego ese dia)

### Problema 2: La alerta de "Productos recibidos" solo aparece para entregas de tipo "faltante"
**Ubicacion:** `CalendarioEntregasTab.tsx` lineas 661-675

**Causa:** La condicion `entrega.esFaltante && entrega.productosFaltantes` solo muestra la alerta para entregas de seguimiento, pero las entregas originales tambien necesitan mostrar que llego especificamente.

### Problema 3: No hay distincion visual entre entregas parciales y completas en el popup del dia
**Ubicacion:** Dialog del dia (lineas 592-706)

**Causa:** Se muestra la lista general de productos de la OC sin indicar cuales fueron recibidos en ESA entrega especifica vs cuales estan pendientes.

### Problema 4: La columna de productos en vista lista muestra cantidad_ordenada en vez de cantidad recibida para entregas completadas
**Ubicacion:** `CalendarioEntregasTab.tsx` lineas 516-531

**Causa:** Siempre muestra `d.cantidad_ordenada` incluso para entregas ya recibidas, deberia mostrar lo que realmente llego.

---

## Solucion Propuesta

### Enfoque: Usar `inventario_lotes` para determinar productos por entrega

Los lotes de inventario tienen el patron `lote_referencia = "REC-{FOLIO}-{NUMERO_ENTREGA}"` que permite identificar exactamente que productos llegaron en cada entrega:

**Datos reales verificados:**
```text
REC-OC-202601-0002-1 -> 250 Papel Bala Rojo (Entrega #1, 23 Ene)
REC-OC-202601-0002-2 -> 40 Papel Blanco Revolucion (Entrega #2, 26 Ene - Faltante)
```

---

## Cambios Tecnicos

### Archivo: `src/components/compras/CalendarioEntregasTab.tsx`

**Cambio 1: Agregar campo `productosRecibidosEntrega` a la estructura de datos**

Lineas 170-228 - Modificar el mapeo de `todasLasEntregas` para incluir informacion especifica de cada entrega:

```tsx
// Nuevo: Para entregas recibidas, obtener productos especificos de inventario_lotes
// Agregar un estado para cargar esta informacion bajo demanda

const [productosEntregaMap, setProductosEntregaMap] = useState<Record<string, Array<{
  nombre: string;
  codigo: string;
  cantidad: number;
}>>>({});
```

**Cambio 2: Funcion para cargar productos de una entrega especifica**

Agregar funcion que consulte `inventario_lotes` cuando se selecciona un dia:

```tsx
const cargarProductosEntrega = async (entregaId: string, ocId: string, folio: string, numeroEntrega: number) => {
  // Ya tenemos esto en cache?
  if (productosEntregaMap[entregaId]) return;

  const patronLote = `REC-${folio}-${numeroEntrega}`;
  const { data: lotes } = await supabase
    .from("inventario_lotes")
    .select(`cantidad_disponible, producto:productos(nombre, codigo)`)
    .eq("orden_compra_id", ocId)
    .like("lote_referencia", `${patronLote}%`);

  if (lotes && lotes.length > 0) {
    setProductosEntregaMap(prev => ({
      ...prev,
      [entregaId]: lotes.map((l: any) => ({
        nombre: l.producto?.nombre || 'Producto',
        codigo: l.producto?.codigo || '',
        cantidad: l.cantidad_disponible
      }))
    }));
  }
};
```

**Cambio 3: Cargar productos cuando se abre el dialogo del dia**

Modificar `handleDiaClick` (linea 287-293):

```tsx
const handleDiaClick = async (dia: Date) => {
  const entregas = getEntregasDelDia(dia);
  if (entregas.length > 0) {
    setDiaSeleccionado(dia);
    setDialogDiaOpen(true);
    
    // Cargar productos especificos para entregas recibidas
    for (const entrega of entregas) {
      if (entrega.esCompletada && entrega.orden && entrega.numeroEntrega) {
        await cargarProductosEntrega(
          entrega.id, 
          entrega.orden.id, 
          entrega.folio, 
          entrega.numeroEntrega
        );
      }
    }
  }
};
```

**Cambio 4: Mostrar productos especificos en el dialog del dia**

Reemplazar lineas 645-675 con logica mejorada:

```tsx
{/* Mostrar productos especificos de esta entrega */}
{entrega.esCompletada && productosEntregaMap[entrega.id] ? (
  // Entrega recibida - mostrar lo que realmente llego desde inventario_lotes
  <div className="space-y-1">
    <p className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-1">
      <CheckCircle2 className="w-3 h-3" />
      Productos recibidos en esta entrega:
    </p>
    <ul className="text-sm ml-4 list-disc text-muted-foreground">
      {productosEntregaMap[entrega.id].map((p, idx) => (
        <li key={idx}>
          <span className="font-medium">{p.cantidad}</span> {p.nombre}
        </li>
      ))}
    </ul>
  </div>
) : entrega.esFaltante && entrega.productosFaltantes?.length > 0 ? (
  // Entrega de faltante - mostrar desde productos_faltantes
  <Alert className="mt-3 bg-orange-50 border-orange-200">
    <AlertTriangle className="h-4 w-4 text-orange-600" />
    <AlertDescription className="text-orange-700">
      <span className="font-medium">Productos de esta entrega (faltantes):</span>
      <ul className="mt-1 ml-4 list-disc">
        {entrega.productosFaltantes.map((p: any, idx: number) => (
          <li key={idx}>
            <span className="font-medium">{p.cantidad_faltante}</span> {p.nombre}
          </li>
        ))}
      </ul>
    </AlertDescription>
  </Alert>
) : (
  // Entrega pendiente/programada - mostrar productos de la OC general
  <p className="text-sm text-muted-foreground">
    {entrega.productos?.slice(0, 3).map((d: any, idx: number) => (
      <span key={idx}>
        {idx > 0 && ", "}
        <span className="font-medium">{d.cantidad_ordenada}</span> {d.productos?.nombre}
      </span>
    ))}
    {entrega.productos?.length > 3 && (
      <span> +{entrega.productos.length - 3} mas</span>
    )}
  </p>
)}
```

**Cambio 5: Agregar indicador visual de "entrega parcial" vs "entrega completa"**

Para entregas recibidas que NO completaron todos los productos de la OC, agregar badge:

```tsx
{/* Detectar si fue entrega parcial (no todo lo ordenado llego) */}
{entrega.esCompletada && productosEntregaMap[entrega.id] && (
  (() => {
    const productosRecibidos = productosEntregaMap[entrega.id];
    const productosOC = entrega.productos || [];
    const esEntregaParcial = productosRecibidos.length < productosOC.length;
    
    return esEntregaParcial ? (
      <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-300">
        Parcial ({productosRecibidos.length}/{productosOC.length} productos)
      </Badge>
    ) : null;
  })()
)}
```

**Cambio 6: Actualizar vista lista para mostrar cantidad recibida**

Lineas 516-531 - Mostrar cantidad_recibida para entregas completadas:

```tsx
<TableCell>
  <div className="text-sm">
    {entrega.esCompletada && productosEntregaMap[entrega.id] ? (
      // Mostrar productos reales recibidos
      productosEntregaMap[entrega.id].slice(0, 2).map((p, idx) => (
        <span key={idx}>
          {idx > 0 && ", "}
          <span className="font-medium">{p.cantidad}</span> {p.nombre}
        </span>
      ))
    ) : (
      // Mostrar productos ordenados para pendientes
      entrega.productos?.slice(0, 2).map((d: any, idx: number) => (
        <span key={idx}>
          {idx > 0 && ", "}
          <span className="font-medium">{d.cantidad_ordenada}</span> {d.productos?.nombre}
        </span>
      ))
    )}
    {/* Indicador de mas productos */}
    {(entrega.esCompletada && productosEntregaMap[entrega.id]?.length > 2) && (
      <span className="text-muted-foreground"> +{productosEntregaMap[entrega.id].length - 2} mas</span>
    )}
    {(!entrega.esCompletada && entrega.productos?.length > 2) && (
      <span className="text-muted-foreground"> +{entrega.productos.length - 2} mas</span>
    )}
  </div>
</TableCell>
```

**Cambio 7: Pre-cargar productos para entregas visibles en vista lista**

Para la vista lista, cargar productos de entregas recibidas cuando se monta el componente:

```tsx
// useEffect para pre-cargar productos de entregas recibidas
useEffect(() => {
  const cargarProductosEntregasRecibidas = async () => {
    const entregasRecibidas = todasLasEntregas.filter(e => e.esCompletada && e.numeroEntrega);
    
    for (const entrega of entregasRecibidas.slice(0, 20)) { // Limitar a las primeras 20
      if (!productosEntregaMap[entrega.id] && entrega.orden) {
        await cargarProductosEntrega(
          entrega.id,
          entrega.orden.id,
          entrega.folio,
          entrega.numeroEntrega
        );
      }
    }
  };
  
  if (!vistaCalendario && todasLasEntregas.length > 0) {
    cargarProductosEntregasRecibidas();
  }
}, [vistaCalendario, todasLasEntregas]);
```

---

## Resultado Esperado

### Dia 23 - Entrega #1 (Original):
```text
┌────────────────────────────────────────────────────────────┐
│ OC-202601-0002                [Recibida] [Parcial 1/2]     │
├────────────────────────────────────────────────────────────┤
│ PAPELERIA EJEMPLO S.A.                                     │
│                                                            │
│ ✓ Productos recibidos en esta entrega:                     │
│   • 250 Papel Bala Rojo                                    │
│                                                            │
│ [Ver Recepcion]  [Acciones]                                │
└────────────────────────────────────────────────────────────┘
```

### Dia 26 - Entrega #2 (Faltante):
```text
┌────────────────────────────────────────────────────────────┐
│ OC-202601-0002        [Recibida] [Faltante] [#2]           │
├────────────────────────────────────────────────────────────┤
│ PAPELERIA EJEMPLO S.A.                                     │
│                                                            │
│ ⚠ Productos de esta entrega (faltantes):                   │
│   • 40 Papel Blanco Revolucion                             │
│                                                            │
│ [Ver Recepcion]  [Acciones]                                │
└────────────────────────────────────────────────────────────┘
```

---

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/components/compras/CalendarioEntregasTab.tsx` | 1. Agregar estado productosEntregaMap 2. Agregar funcion cargarProductosEntrega 3. Modificar handleDiaClick para cargar productos 4. Actualizar renderizado de productos en dialog del dia 5. Actualizar vista lista para mostrar productos reales 6. Agregar indicador de entrega parcial 7. Pre-cargar productos en vista lista |

---

## Beneficios

1. **Claridad por entrega**: Cada entrega muestra exactamente que llego ese dia
2. **Sin confusion**: No se mezclan totales de OC con entregas individuales
3. **Trazabilidad completa**: Se puede ver el historico de cada recepcion
4. **Indicadores visuales**: Badges claros para parcial, completa, faltante
5. **Performance**: Carga bajo demanda con cache para evitar re-queries

