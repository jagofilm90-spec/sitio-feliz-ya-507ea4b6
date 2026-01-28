

# Plan: Manejar Llegadas Anticipadas y Deshabilitar Botón Antes de Tiempo

## Problema Identificado

Hay un conflicto entre dos necesidades:
1. **No mostrar ruido** - El almacenista no debe ver OCs del viernes si hoy es miércoles
2. **Poder recibir llegadas anticipadas** - Si una OC del viernes llega el jueves temprano, necesita poder registrarla

## Solución Propuesta: Sección "Llegada Anticipada"

Agregar un panel colapsable al final de la lista que permita buscar y registrar OCs que lleguen antes de su fecha programada.

---

## Cambios a Implementar

### 1. Agregar sección "Buscar Llegada Anticipada"

Al final de la lista de entregas visibles, agregar un panel expandible:

```text
+------------------------------------------+
|  📦  ¿Llegó una entrega antes de tiempo? |
|  [Expandir para buscar]                  |
+------------------------------------------+
```

Al expandir, muestra:
- Campo de búsqueda por **folio de OC** o **nombre de proveedor**
- Lista de OCs programadas para los próximos 7 días
- Botón "Registrar Llegada" solo para OCs del día actual o anteriores

### 2. Lógica del botón "Registrar Llegada"

El botón se deshabilita con tooltip explicativo si:
- La fecha programada es **posterior a hoy**
- Excepto si ya pasó la fecha (llegó tarde)

```typescript
const hoy = new Date();
hoy.setHours(0, 0, 0, 0);
const fechaProgramada = new Date(entrega.fecha_programada);
fechaProgramada.setHours(0, 0, 0, 0);

const puedeRegistrarLlegada = fechaProgramada <= hoy;
```

### 3. Comportamiento del Panel de Búsqueda

```text
Escenario: Miércoles 29, OC programada para Jueves 30

- En lista principal: NO aparece (fuera de ventana de visibilidad)
- En "Buscar Llegada Anticipada": SÍ aparece
- Botón "Registrar Llegada": DESHABILITADO con mensaje
  "Programada para mañana. Llegará mañana."

Escenario: Jueves 30 en la mañana, OC programada para Jueves 30

- En lista principal: SÍ aparece
- Botón "Registrar Llegada": HABILITADO
```

### 4. Si la OC llega un día antes del programado

Si hoy es miércoles 29 y la OC estaba programada para el 30:
- **Opción A**: Mostrar botón deshabilitado + opción "Registrar llegada anticipada" que reprograma automáticamente la fecha a hoy
- **Opción B (más simple)**: Permitir registrar llegada pero mostrar advertencia "Esta entrega estaba programada para mañana"

---

## Archivos a Modificar

### `src/components/almacen/AlmacenRecepcionTab.tsx`

1. **Nuevo estado** para el panel de búsqueda:
```typescript
const [busquedaAnticipadaOpen, setBusquedaAnticipadaOpen] = useState(false);
const [searchQuery, setSearchQuery] = useState("");
const [entregasFuturas, setEntregasFuturas] = useState<EntregaCompra[]>([]);
```

2. **Nueva función** para cargar OCs de los próximos 7 días:
```typescript
const loadEntregasFuturas = async () => {
  const hoy = new Date();
  const en7Dias = new Date();
  en7Dias.setDate(en7Dias.getDate() + 7);
  
  const { data } = await supabase
    .from("ordenes_compra_entregas")
    .select(`...mismo select...`)
    .in("status", ["programada"])
    .gt("fecha_programada", hoy.toISOString().split('T')[0])
    .lte("fecha_programada", en7Dias.toISOString().split('T')[0])
    .order("fecha_programada", { ascending: true });
    
  return data;
};
```

3. **Componente nuevo** `BusquedaLlegadaAnticipada`:
```typescript
const BusquedaLlegadaAnticipada = () => {
  // Campo de búsqueda
  // Lista filtrada de OCs futuras
  // Botón deshabilitado si fecha > hoy, con tooltip
};
```

4. **Modificar EntregaCard** para deshabilitar botón según fecha:
```typescript
// En EntregaCard, calcular si puede registrar llegada
const hoy = new Date();
hoy.setHours(0, 0, 0, 0);

const fechaProg = entrega.fecha_programada 
  ? new Date(entrega.fecha_programada + "T00:00:00")
  : null;

const puedeRegistrar = !fechaProg || fechaProg <= hoy;

// En el botón:
<Button 
  disabled={!puedeRegistrar}
  title={!puedeRegistrar ? `Programada para ${format(fechaProg, "dd/MM")}` : undefined}
>
  Registrar Llegada
</Button>
```

---

## Flujo de Usuario

### Escenario Normal
1. Almacenista abre Recepción a las 10:00 AM
2. Ve solo entregas de hoy
3. Llega camión, presiona "Registrar Llegada"

### Escenario Llegada Anticipada
1. Almacenista abre Recepción a las 10:00 AM
2. Llega camión de OC programada para mañana
3. No ve la OC en la lista principal
4. Expande "Llegada Anticipada"
5. Busca por folio o proveedor
6. Ve la OC con botón deshabilitado: "Programada para mañana"
7. **Opción**: Botón secundario "Forzar registro (llegó antes)" que:
   - Actualiza `fecha_programada` a hoy
   - Permite registrar la llegada
   - Guarda nota automática: "Llegada anticipada - originalmente para DD/MM"

---

## Sección Técnica

### Estructura de la Sección de Búsqueda

```tsx
{/* Al final de la lista de entregas */}
<Collapsible open={busquedaAnticipadaOpen} onOpenChange={setBusquedaAnticipadaOpen}>
  <CollapsibleTrigger className="w-full p-4 border-t">
    <div className="flex items-center gap-2">
      <Calendar className="w-5 h-5 text-muted-foreground" />
      <span>¿Llegó una entrega antes de tiempo?</span>
      <ChevronDown className="ml-auto" />
    </div>
  </CollapsibleTrigger>
  <CollapsibleContent>
    <Input 
      placeholder="Buscar por folio o proveedor..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
    />
    {/* Lista de OCs futuras filtradas */}
    {entregasFuturasFiltradas.map(entrega => (
      <EntregaCardFutura 
        entrega={entrega}
        onForzarLlegada={handleForzarLlegadaAnticipada}
      />
    ))}
  </CollapsibleContent>
</Collapsible>
```

### Función para Forzar Llegada Anticipada

```typescript
const handleForzarLlegadaAnticipada = async (entregaId: string, fechaOriginal: string) => {
  const hoy = new Date().toISOString().split('T')[0];
  
  await supabase
    .from("ordenes_compra_entregas")
    .update({ 
      fecha_programada: hoy,
      notas: `Llegada anticipada - originalmente para ${format(new Date(fechaOriginal), "dd/MM/yyyy")}`
    })
    .eq("id", entregaId);
    
  // Recargar lista, ahora aparecerá en la vista principal
  loadEntregas();
};
```

---

## Resultado Esperado

1. **Vista limpia por defecto** - Solo se ven entregas relevantes (hoy, o hoy+mañana en la tarde)
2. **Botón deshabilitado para OCs futuras** - No se puede registrar llegada antes de la fecha
3. **Escape para llegadas anticipadas** - Panel de búsqueda permite encontrar y "forzar" registro de OCs que llegaron antes
4. **Trazabilidad** - Se guarda nota automática indicando que fue llegada anticipada

